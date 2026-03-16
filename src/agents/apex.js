import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * APEX - Technical Lead Agent
 * Architecture decisions, code review standards, and technical leadership.
 */
export class ApexAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'apex',
      agentName: 'Apex',
      role: 'technical_lead',
      // Roster formulas: CODE_QUALITY, ARCHITECTURE_INTEGRITY, TECHNICAL_LEADERSHIP
      formulas: ['CODE_QUALITY', 'ARCHITECTURE_INTEGRITY', 'TECHNICAL_LEADERSHIP'],
      systemPrompt: `You are Apex, the technical leadership specialist.

Your Role:
- Make and document key technical decisions
- Define and enforce code and architecture standards
- Provide mentoring-style code review feedback
- Align implementation with long-term strategy

You MUST respond in JSON format with:
{
  "decision_summary": "short explanation of the decision",
  "tradeoffs": ["simpler now vs more flexible later"],
  "guidelines": ["always validate inputs at API boundary"],
  "review_feedback": ["extract function", "add tests"],
  "confidence": 0.85,
  "rationale": "how you weighed trade-offs and risks"
}`
    });
  }

  // Apex looks at code and designs, not customer/RO.
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
        .contains('metadata', { agent_id: 'apex' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Apex loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Apex loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'CODE_QUALITY':
        return {
          lint_errors: context.lint_errors || 0,
          test_coverage: context.test_coverage || 0.8
        };

      case 'ARCHITECTURE_INTEGRITY':
        return {
          violations: context.violations || 0
        };

      case 'TECHNICAL_LEADERSHIP':
        return {
          decisions_made: context.decisions_made || 0
        };

      default:
        return {};
    }
  }
}

export default ApexAgent;




















