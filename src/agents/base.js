import 'dotenv/config';
import ArtifactStorage from '../artifact-storage/core.js';
import { executeFormula } from '../formulas/registry.js';

/**
 * Base Agent Executor
 * All concrete agents extend this class.
 */
export class AgentBase {
  constructor(config) {
    this.agentId = config.agentId; // e.g., 'otto'
    this.agentName = config.agentName; // e.g., 'Otto'
    this.role = config.role; // e.g., 'service_advisor'
    this.systemPrompt = config.systemPrompt; // Agent's core instructions
    this.formulas = config.formulas || []; // Formula codes this agent uses
    this.model = config.model || 'claude-sonnet-4-20250514';
  }

  /**
   * Main execution entrypoint used by all agents.
   *
   * @param {Object} input - Raw input payload (customer_id, ro_id, request, etc.)
   * @param {Object} context - Execution context / provenance
   */
  async execute(input = {}, context = {}) {
    const startTime = Date.now();

    try {
      // 1) Load execution context (customer, RO, history, related artifacts)
      const enrichedContext = await this.loadContext(input, context);

      // 2) Execute formulas declared for this agent
      const formulaResults = await this.executeFormulas(enrichedContext);

      // 3) Build prompt for Claude including all context + formulas
      const prompt = await this.buildPrompt(input, enrichedContext, formulaResults);

      // 4) Call Claude API
      const responseText = await this.callClaudeAPI(prompt);

      // 5) Parse response into a structured decision object
      const decision = await this.parseResponse(responseText);

      // 6) Create artifact capturing this decision
      const artifact = await this.createArtifact({
        input,
        context: enrichedContext,
        formulaResults,
        decision,
        executionTime: Date.now() - startTime,
        success: true
      });

      // 7) Optionally update fast agent-specific memory
      await this.updateMemory(artifact);

      return {
        success: true,
        agent: this.agentId,
        decision,
        artifact_id: artifact.artifact_id,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error) {
      // Log failure as an artifact for observability
      await this.createArtifact({
        input,
        context,
        formulaResults: null,
        decision: null,
        executionTime: Date.now() - startTime,
        error: error.message,
        success: false
      });

      throw error;
    }
  }

  /**
   * Enrich context using Supabase / artifacts.
   * Subclasses can override any of the helper methods.
   */
  async loadContext(input, context) {
    const enriched = { ...context };

    if (input.customer_id) {
      enriched.customer = await this.loadCustomerData(input.customer_id);
    }

    if (input.ro_id) {
      enriched.ro = await this.loadROData(input.ro_id);
    }

    enriched.agent_history = await this.loadAgentHistory(5);
    enriched.related_artifacts = await this.loadRelatedArtifacts(input);

    return enriched;
  }

  /**
   * Execute formulas configured for this agent.
   * Each formula is executed independently; failures are captured in-place.
   */
  async executeFormulas(context) {
    const results = {};

    for (const formulaName of this.formulas) {
      try {
        const inputs = this.extractFormulaInputs(formulaName, context) || {};
        const execResult = await executeFormula(formulaName, inputs, {
          agent: this.agentId,
          triggered_by: 'agent_execution',
          relatedArtifacts: context.related_artifacts || []
        });
        results[formulaName] = execResult.result;
      } catch (error) {
        console.error(`Formula ${formulaName} failed for agent ${this.agentId}:`, error);
        results[formulaName] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Build Claude prompt combining system instructions, input, context and formulas.
   * Subclasses can override for more specialized formatting.
   */
  // eslint-disable-next-line class-methods-use-this
  async buildPrompt(input, context, formulaResults) {
    return `${this.systemPrompt}

# Current Request
${JSON.stringify(input, null, 2)}

# Context
Customer: ${JSON.stringify(context.customer || {}, null, 2)}
RO: ${JSON.stringify(context.ro || {}, null, 2)}

# Formula Results
${JSON.stringify(formulaResults || {}, null, 2)}

# Recent Agent History
${JSON.stringify(context.agent_history || [], null, 2)}

# Your Task
Analyze the situation and provide your recommendation.
Respond in JSON format:
{
  "decision": "your_decision_here",
  "rationale": "why you made this decision",
  "confidence": 0.85,
  "actions": ["action1", "action2"],
  "next_steps": ["step1", "step2"]
}`;
  }

  /**
   * Call Anthropic Claude Messages API.
   */
  // eslint-disable-next-line class-methods-use-this
  async callClaudeAPI(prompt) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Claude API error: ${response.status} ${text}`);
    }

    const data = await response.json();
    const contentBlock = Array.isArray(data.content) ? data.content[0] : null;
    return contentBlock?.text || JSON.stringify(data);
  }

  /**
   * Parse Claude response into JSON. Falls back to a simple wrapper if needed.
   */
  // eslint-disable-next-line class-methods-use-this
  async parseResponse(responseText) {
    try {
      const cleaned = responseText
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (error) {
      return {
        decision: responseText,
        rationale: 'Agent provided non-JSON response; wrapped as text.',
        confidence: 0.5,
        actions: [],
        next_steps: []
      };
    }
  }

  /**
   * Create an agent_decision artifact for this execution.
   */
  async createArtifact(data) {
    return ArtifactStorage.createArtifact({
      type: 'agent_decision',
      data: {
        agent: this.agentId,
        agent_name: this.agentName,
        role: this.role,
        input: data.input,
        context: data.context,
        formula_results: data.formulaResults,
        decision: data.decision,
        success: data.success !== false,
        execution_time_ms: data.executionTime,
        error: data.error || null
      },
      provenance: {
        agent: this.agentId,
        source: 'agent_execution',
        trigger: data.context?.triggered_by || 'manual'
      },
      relatedArtifacts: this.buildRelatedArtifacts(data),
      metadata: {
        agent_id: this.agentId,
        agent_role: this.role,
        formulas_used: this.formulas,
        confidence: data.decision?.confidence
      }
    });
  }

  /**
   * Build list of related artifacts for linking decision back to source entities.
   */
  // eslint-disable-next-line class-methods-use-this
  buildRelatedArtifacts(data) {
    const related = [];

    if (data.context?.customer?.id) {
      related.push({
        artifactId: `customer:${data.context.customer.id}`,
        type: 'analyzed_customer'
      });
    }

    if (data.context?.ro?.id) {
      related.push({
        artifactId: `ro:${data.context.ro.id}`,
        type: 'analyzed_ro'
      });
    }

    return related;
  }

  /**
   * Hook for fast "agent memory" (e.g., dedicated table or cache).
   * Default is no-op; concrete agents can override.
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  async updateMemory(artifact) {
    // Intentionally left blank; implement per-agent if needed.
  }

  // ---------------------------------------------------------------------------
  // Helper methods that concrete agents may override
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  async loadCustomerData(customerId) {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  async loadROData(roId) {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  async loadAgentHistory(limit) {
    return [];
  }

  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  async loadRelatedArtifacts(input) {
    return [];
  }

  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  extractFormulaInputs(formulaName, context) {
    return {};
  }
}

export default AgentBase;



















