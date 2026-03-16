/**
 * Orchestration Engine - Multi-agent orchestration system
 * Coordinates complex requests across multiple agents with dependency resolution
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { EventBus } from './event-bus.js';
import { WorkflowCoordinator } from './workflow-coordinator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * OrchestrationEngine class for multi-agent coordination
 */
export class OrchestrationEngine {
  constructor(shopId = null) {
    this.shopId = shopId;
    this.eventBus = new EventBus(shopId);
    this.workflowCoordinator = new WorkflowCoordinator(shopId);
  }

  /**
   * Analyze request complexity and determine required agents
   * @param {string} request - User request
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeRequest(request) {
    try {
      const systemPrompt = `You are an AI orchestration analyst. Analyze the complexity of user requests and determine which agents are needed.

Available Agents:
- SV01-REVENUE: Revenue analysis, customer value, financial metrics
- SV02-RETENTION: Customer retention, churn risk, loyalty
- SV04-COMMS: Communications, SMS, messaging
- SV06-INSIGHTS: Data analysis, patterns, insights
- SV07-MARKETING: Marketing campaigns, promotions
- F-BACKEND: Backend development, APIs
- F-RESEARCH: Research, data analysis
- F-TESTING: Testing, validation

For each request, determine:
1. Complexity score (0.0-1.0): How complex is this request?
2. Required agents: Which agents are needed to fulfill this?
3. Execution strategy: sequential, parallel, or hybrid?
4. Estimated time: Rough estimate in seconds

Respond with valid JSON only.`;

      const userPrompt = `Analyze this request: "${request}"

Provide JSON response:
{
  "complexity_score": 0.0-1.0,
  "required_agents": ["agent1", "agent2"],
  "execution_strategy": "sequential" | "parallel" | "hybrid",
  "estimated_time_seconds": 60,
  "reasoning": "Brief explanation"
}`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const content = message.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse analysis response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize
      analysis.complexity_score = Math.max(0, Math.min(1, analysis.complexity_score || 0.5));
      analysis.required_agents = analysis.required_agents || [];
      analysis.execution_strategy = analysis.execution_strategy || 'sequential';
      analysis.estimated_time_seconds = analysis.estimated_time_seconds || 60;

      return analysis;
    } catch (error) {
      console.error('OrchestrationEngine.analyzeRequest error:', error);
      throw error;
    }
  }

  /**
   * Create orchestration plan from analysis
   * @param {string} requestId - Unique request ID
   * @param {string} originalRequest - Original user request
   * @param {Object} analysis - Analysis result from analyzeRequest
   * @param {Array} steps - Step definitions with dependencies
   * @returns {Promise<Object>} Created plan
   */
  async createOrchestrationPlan(requestId, originalRequest, analysis, steps) {
    try {
      // Create plan
      const { data: plan, error: planError } = await supabase
        .from('orchestration_plans')
        .insert({
          shop_id: this.shopId,
          request_id: requestId,
          original_request: originalRequest,
          complexity_score: analysis.complexity_score,
          agent_count: analysis.required_agents.length,
          execution_strategy: analysis.execution_strategy,
          estimated_time_seconds: analysis.estimated_time_seconds,
          status: 'planning'
        })
        .select()
        .single();

      if (planError) {
        throw new Error(`Plan creation failed: ${planError.message}`);
      }

      // Create steps
      const stepInserts = steps.map((step, index) => ({
        plan_id: plan.id,
        step_number: index + 1,
        agent_id: step.agent_id,
        task_description: step.task_description || step.description,
        dependencies: step.dependencies || [],
        input_data: step.input_data || {},
        status: 'pending'
      }));

      const { data: createdSteps, error: stepsError } = await supabase
        .from('orchestration_steps')
        .insert(stepInserts)
        .select();

      if (stepsError) {
        throw new Error(`Steps creation failed: ${stepsError.message}`);
      }

      // Update plan status to executing
      await supabase.rpc('update_orchestration_status', {
        p_plan_id: plan.id,
        p_status: 'executing'
      });

      // Publish orchestration started event
      await this.eventBus.publish('workflow-events', 'ORCHESTRATION_STARTED', {
        plan_id: plan.id,
        request_id: requestId,
        complexity_score: analysis.complexity_score,
        agent_count: analysis.required_agents.length
      }, 'orchestration-engine');

      return {
        plan,
        steps: createdSteps
      };
    } catch (error) {
      console.error('OrchestrationEngine.createOrchestrationPlan error:', error);
      throw error;
    }
  }

  /**
   * Execute orchestration plan
   * @param {string} planId - Plan ID
   * @returns {Promise<Array>} Results from all steps
   */
  async executePlan(planId) {
    try {
      // Get plan and steps
      const { data: planData } = await supabase.rpc('get_orchestration_plan', {
        p_plan_id: planId
      });

      if (!planData || planData.length === 0) {
        throw new Error(`Plan not found: ${planId}`);
      }

      const { plan, steps } = planData[0];
      const stepsArray = Array.isArray(steps) ? steps : [];

      const results = [];
      const executedSteps = new Set();

      // Execute steps respecting dependencies
      while (executedSteps.size < stepsArray.length) {
        // Get steps ready to execute (dependencies met)
        const { data: readySteps } = await supabase.rpc('get_ready_steps', {
          p_plan_id: planId
        });

        if (!readySteps || readySteps.length === 0) {
          // Check if we're stuck (all remaining steps have unmet dependencies)
          const remainingSteps = stepsArray.filter(s => !executedSteps.has(s.id));
          if (remainingSteps.length > 0) {
            throw new Error(`Circular dependency or missing dependency detected`);
          }
          break;
        }

        // Execute ready steps (can be parallel)
        const stepPromises = readySteps.map(step => this.executeStep(step.id, planId));
        const stepResults = await Promise.allSettled(stepPromises);

        stepResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
            executedSteps.add(readySteps[index].id);
          } else {
            // Mark step as failed
            this.markStepFailed(readySteps[index].id, result.reason.message);
          }
        });
      }

      // Update plan status to synthesizing
      await supabase.rpc('update_orchestration_status', {
        p_plan_id: planId,
        p_status: 'synthesizing'
      });

      return results;
    } catch (error) {
      console.error('OrchestrationEngine.executePlan error:', error);
      
      // Mark plan as failed
      await supabase.rpc('update_orchestration_status', {
        p_plan_id: planId,
        p_status: 'failed',
        p_error_message: error.message
      });

      throw error;
    }
  }

  /**
   * Execute a single orchestration step
   * @param {string} stepId - Step ID
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Step result
   */
  async executeStep(stepId, planId) {
    const startTime = Date.now();

    try {
      // Get step details
      const { data: step, error: stepError } = await supabase
        .from('orchestration_steps')
        .select('*')
        .eq('id', stepId)
        .single();

      if (stepError || !step) {
        throw new Error(`Step not found: ${stepId}`);
      }

      // Update step status to running
      await supabase
        .from('orchestration_steps')
        .update({
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', stepId);

      // Broadcast step started
      await this.eventBus.broadcastStatus(step.agent_id, 'working', {
        current_task: step.task_description,
        orchestration_plan_id: planId,
        step_id: stepId
      });

      // Execute agent (via API endpoint - would call actual agent in production)
      // For now, simulate agent execution
      const agentResult = await this.callAgent(step.agent_id, step.input_data, step.task_description);

      const executionTime = Date.now() - startTime;

      // Update step as completed
      await supabase
        .from('orchestration_steps')
        .update({
          status: 'completed',
          output_data: agentResult,
          execution_time_ms: executionTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', stepId);

      // Broadcast step completed
      await this.eventBus.publish('workflow-events', 'ORCHESTRATION_STEP_COMPLETED', {
        plan_id: planId,
        step_id: stepId,
        agent_id: step.agent_id,
        execution_time_ms: executionTime
      }, 'orchestration-engine');

      await this.eventBus.broadcastStatus(step.agent_id, 'idle', {
        current_task: null
      });

      return {
        step_id: stepId,
        agent_id: step.agent_id,
        result: agentResult,
        execution_time_ms: executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      await supabase
        .from('orchestration_steps')
        .update({
          status: 'failed',
          error_message: error.message,
          execution_time_ms: executionTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', stepId);

      throw error;
    }
  }

  /**
   * Call agent (simulated - would integrate with actual agent API)
   * @private
   */
  async callAgent(agentId, inputData, taskDescription) {
    // In production, this would call the actual agent API endpoint
    // For now, simulate with a simple response
    return {
      agent_id: agentId,
      task: taskDescription,
      result: `Completed: ${taskDescription}`,
      input: inputData
    };
  }

  /**
   * Mark step as failed
   * @private
   */
  async markStepFailed(stepId, errorMessage) {
    await supabase
      .from('orchestration_steps')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', stepId);
  }

  /**
   * Synthesize results from all steps
   * @param {string} planId - Plan ID
   * @param {string} strategy - Synthesis strategy (concat, merge, analyze, summarize)
   * @returns {Promise<Object>} Synthesized result
   */
  async synthesizeResults(planId, strategy = 'analyze') {
    try {
      // Get all completed steps
      const { data: steps, error: stepsError } = await supabase
        .from('orchestration_steps')
        .select('id, agent_id, task_description, output_data')
        .eq('plan_id', planId)
        .eq('status', 'completed')
        .order('step_number');

      if (stepsError || !steps || steps.length === 0) {
        throw new Error('No completed steps found for synthesis');
      }

      // Get plan to access original request
      const { data: plan, error: planError } = await supabase
        .from('orchestration_plans')
        .select('original_request')
        .eq('id', planId)
        .single();

      if (planError) {
        throw new Error(`Plan not found: ${planError.message}`);
      }

      // Collect outputs
      const outputs = steps.map(s => ({
        agent_id: s.agent_id,
        task: s.task_description,
        result: s.output_data
      }));

      // Synthesize using Claude
      const synthesis = await this.performSynthesis(plan.original_request, outputs, strategy);

      // Save synthesis
      const { data: synthesisRecord, error: synthError } = await supabase
        .from('orchestration_synthesis')
        .insert({
          plan_id: planId,
          synthesis_strategy: strategy,
          input_step_ids: steps.map(s => s.id),
          synthesized_result: synthesis,
          confidence_score: 0.9
        })
        .select()
        .single();

      if (synthError) {
        console.error('Failed to save synthesis:', synthError);
      }

      // Update plan status to completed
      await supabase.rpc('update_orchestration_status', {
        p_plan_id: planId,
        p_status: 'completed'
      });

      // Publish orchestration completed event
      await this.eventBus.publish('workflow-events', 'ORCHESTRATION_COMPLETED', {
        plan_id: planId,
        synthesis_strategy: strategy
      }, 'orchestration-engine');

      return {
        synthesis: synthesisRecord || { synthesized_result: synthesis },
        final_result: synthesis
      };
    } catch (error) {
      console.error('OrchestrationEngine.synthesizeResults error:', error);
      throw error;
    }
  }

  /**
   * Perform synthesis using Claude
   * @private
   */
  async performSynthesis(originalRequest, outputs, strategy) {
    const systemPrompt = `You are a synthesis engine. Combine results from multiple AI agents into a coherent response.

Synthesis Strategy: ${strategy}
- concat: Simple concatenation of results
- merge: Combine overlapping data intelligently
- analyze: Deep analysis of combined results
- summarize: Create executive summary

Original Request: "${originalRequest}"

Agent Outputs:
${JSON.stringify(outputs, null, 2)}

Synthesize these outputs into a coherent, actionable response that directly addresses the original request.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Synthesize the agent outputs into a comprehensive response.'
        }
      ]
    });

    return {
      synthesized_text: message.content[0].text,
      strategy,
      agent_outputs: outputs
    };
  }

  /**
   * Get orchestration status
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Plan status with steps
   */
  async getOrchestrationStatus(planId) {
    try {
      const { data, error } = await supabase.rpc('get_orchestration_plan', {
        p_plan_id: planId
      });

      if (error || !data || data.length === 0) {
        throw new Error(`Plan not found: ${error?.message || 'Unknown error'}`);
      }

      const planData = data[0];

      // Get metrics
      const { data: metrics } = await supabase.rpc('get_orchestration_metrics', {
        p_plan_id: planId
      });

      return {
        plan: planData.plan,
        steps: planData.steps,
        metrics: metrics || {}
      };
    } catch (error) {
      console.error('OrchestrationEngine.getOrchestrationStatus error:', error);
      throw error;
    }
  }

  /**
   * Cancel orchestration
   * @param {string} planId - Plan ID
   * @returns {Promise<void>}
   */
  async cancelOrchestration(planId) {
    try {
      await supabase.rpc('update_orchestration_status', {
        p_plan_id: planId,
        p_status: 'cancelled'
      });

      // Mark all running steps as cancelled
      await supabase
        .from('orchestration_steps')
        .update({ status: 'skipped' })
        .eq('plan_id', planId)
        .in('status', ['pending', 'ready', 'running']);

      await this.eventBus.publish('workflow-events', 'ORCHESTRATION_CANCELLED', {
        plan_id: planId
      }, 'orchestration-engine');
    } catch (error) {
      console.error('OrchestrationEngine.cancelOrchestration error:', error);
      throw error;
    }
  }
}

export default OrchestrationEngine;



















