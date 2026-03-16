import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * ATLAS - System Architect
 * Infrastructure design, scaling, and performance planning.
 */
export class AtlasAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'atlas',
      agentName: 'Atlas',
      role: 'system_architect',
      // Roster formulas: SCALABILITY_SCORE, TECHNICAL_DEBT, PERFORMANCE_PREDICTION
      formulas: ['SCALABILITY_SCORE', 'TECHNICAL_DEBT', 'PERFORMANCE_PREDICTION'],
      systemPrompt: `You are Atlas, the system architect.

Your Role:
- Design and evolve the system architecture
- Evaluate scalability, resilience, and performance
- Identify and track technical debt
- Produce clear diagrams and specs for implementation

You MUST respond in JSON format with:
{
  "architecture_summary": "short description of current/proposed architecture",
  "risks": ["single point of failure in API"],
  "recommendations": ["introduce read replica", "add circuit breakers"],
  "estimated_scalability_score": 0.78,
  "technical_debt_notes": ["tight coupling between UI and API"],
  "confidence": 0.83,
  "rationale": "how you evaluated scalability, debt, and risk"
}`
    });
  }

  // Atlas operates at system level; per-customer/RO context is not needed.
  // eslint-disable-next-line class-methods-use-this
  async loadCustomerData(customerId) {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  async loadROData(roId) {
    return null;
  }

  async loadAgentHistory(limit = 5) {
    try {
      const { data: artifacts, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('type', 'agent_decision')
        .contains('metadata', { agent_id: 'atlas' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Atlas loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Atlas loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'SCALABILITY_SCORE':
        return {
          current_load: context.current_load || 1,
          projected_load: context.projected_load || 2
        };

      case 'TECHNICAL_DEBT':
        return {
          debt_items: context.debt_items || 0
        };

      case 'PERFORMANCE_PREDICTION':
        return {
          baseline_latency_ms: context.baseline_latency_ms || 200,
          qps: context.qps || 50
        };

      default:
        return {};
    }
  }
}

export default AtlasAgent;




















