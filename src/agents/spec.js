import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * SPEC - Requirements Analyst Agent
 * Translates requests into clear technical specifications and scope.
 */
export class SpecAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'spec',
      agentName: 'Spec',
      role: 'requirements_analyst',
      // Roster formulas: REQUIREMENT_CLARITY, SCOPE_ESTIMATION, COMPLEXITY_ASSESSMENT
      formulas: ['REQUIREMENT_CLARITY', 'SCOPE_ESTIMATION', 'COMPLEXITY_ASSESSMENT'],
      systemPrompt: `You are Spec, the requirements analysis specialist.

Your Role:
- Turn high-level requests into precise, buildable specs
- Identify missing details and ambiguities
- Estimate scope and complexity at a high level
- Define clear acceptance criteria

You MUST respond in JSON format with:
{
  "summary": "short restatement of the request in your own words",
  "requirements": [
    {
      "id": "REQ-1",
      "description": "System must allow users to...",
      "acceptance_criteria": ["criterion A", "criterion B"]
    }
  ],
  "open_questions": ["What are the performance targets?"],
  "scope_estimate": "XS|S|M|L|XL",
  "risks": ["integration with legacy system"],
  "confidence": 0.83,
  "rationale": "why you framed the scope and requirements this way"
}`
    });
  }

  // Spec lives mostly in text requirements; no customer/RO.
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
        .contains('metadata', { agent_id: 'spec' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Spec loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Spec loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'REQUIREMENT_CLARITY':
        return {
          missing_details: context.missing_details || 0
        };

      case 'SCOPE_ESTIMATION':
        return {
          modules_touched: context.modules_touched || 1
        };

      case 'COMPLEXITY_ASSESSMENT':
        return {
          unknowns_count: context.unknowns_count || 0
        };

      default:
        return {};
    }
  }
}

export default SpecAgent;




















