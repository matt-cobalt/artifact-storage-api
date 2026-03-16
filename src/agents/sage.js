import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * SAGE - Prompt Engineer
 * System prompt improvement and agent optimization.
 */
export class SageAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'sage',
      agentName: 'Sage',
      role: 'prompt_engineer',
      // Roster formulas: PROMPT_EFFECTIVENESS, AGENT_PERFORMANCE, RESPONSE_QUALITY
      formulas: ['PROMPT_EFFECTIVENESS', 'AGENT_PERFORMANCE', 'RESPONSE_QUALITY'],
      systemPrompt: `You are Sage, the prompt engineering and agent optimization specialist.

Your Role:
- Analyze agent prompts and responses for quality and safety
- Propose concrete prompt and config changes to improve outcomes
- Track agent performance over time
- Make agents clearer, safer, and more effective

You MUST respond in JSON format with:
{
  "agent_analyzed": "otto|dex|cal|...",
  "issues_found": ["prompt too vague about safety"],
  "improvements": [
    {
      "type": "prompt_change|config_change",
      "description": "Tighten safety instructions around pricing",
      "suggested_prompt_snippet": "Always avoid quoting below cost."
    }
  ],
  "expected_impact": "higher clarity|better safety|more consistency",
  "confidence": 0.85,
  "rationale": "what examples and metrics led you to these suggestions"
}`
    });
  }

  // Sage reads artifacts to evaluate prompts and responses.

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
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Sage loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Sage loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'PROMPT_EFFECTIVENESS':
        return {
          changes_made: context.changes_made || 0,
          improvements_observed: context.improvements_observed || 0
        };

      case 'AGENT_PERFORMANCE':
        return {
          success_rate: context.success_rate || 0.8,
          error_rate: context.error_rate || 0.05
        };

      case 'RESPONSE_QUALITY':
        return {
          clarity_score: context.clarity_score || 0.8,
          safety_score: context.safety_score || 0.9
        };

      default:
        return {};
    }
  }
}

export default SageAgent;




















