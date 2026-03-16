import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * SCOUT - Research & Intelligence
 * Technology evaluation and integration research.
 */
export class ScoutAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'scout',
      agentName: 'Scout',
      role: 'research_intelligence',
      // Roster formulas: API_COMPATIBILITY, TECH_EVALUATION, INTEGRATION_COMPLEXITY
      formulas: ['API_COMPATIBILITY', 'TECH_EVALUATION', 'INTEGRATION_COMPLEXITY'],
      systemPrompt: `You are Scout, the research and integration intelligence specialist.

Your Role:
- Discover and evaluate external APIs and tools
- Propose integration patterns and compare options
- Assess compatibility with current architecture
- Produce concise research briefs for the team

You MUST respond in JSON format with:
{
  "options": [
    {
      "name": "Tekmetric API",
      "fit_score": 0.86,
      "pros": ["Webhook support", "Good docs"],
      "cons": ["Rate limits"],
      "integration_complexity": "low|medium|high"
    }
  ],
  "recommendation": "adopt|pilot|avoid",
  "next_steps": ["request sandbox keys", "build proof-of-concept"],
  "confidence": 0.8,
  "rationale": "how you compared options and trade-offs"
}`
    });
  }

  // Scout may occasionally pull from Supabase (e.g., to see existing integrations), but default is none.
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
        .contains('metadata', { agent_id: 'scout' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Scout loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Scout loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'API_COMPATIBILITY':
        return {
          required_features: context.required_features || [],
          api_capabilities: context.api_capabilities || []
        };

      case 'TECH_EVALUATION':
        return {
          maturity_score: context.maturity_score || 0.7,
          ecosystem_score: context.ecosystem_score || 0.6
        };

      case 'INTEGRATION_COMPLEXITY':
        return {
          endpoints: context.endpoints || 1,
          auth_type: context.auth_type || 'api_key'
        };

      default:
        return {};
    }
  }
}

export default ScoutAgent;




















