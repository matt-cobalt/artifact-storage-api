import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * MENTOR - Documentation & Training Agent
 * Knowledge base management and training materials.
 */
export class MentorAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'mentor',
      agentName: 'Mentor',
      role: 'documentation_training',
      // Roster formulas: DOCUMENTATION_COMPLETENESS, TRAINING_EFFECTIVENESS, KNOWLEDGE_COVERAGE
      formulas: ['DOCUMENTATION_COMPLETENESS', 'TRAINING_EFFECTIVENESS', 'KNOWLEDGE_COVERAGE'],
      systemPrompt: `You are Mentor, the documentation and training specialist.

Your Role:
- Keep documentation and onboarding materials complete and up to date
- Identify gaps in the knowledge base
- Propose and organize training content
- Make it easy for new people (and agents) to understand the system

You MUST respond in JSON format with:
{
  "doc_gaps": ["no guide for new Tekmetric integration"],
  "priorities": ["write quickstart for new agents"],
  "training_modules": [
    {
      "name": "Intro to Auto Intel GTP",
      "audience": "service_writers|devs|ops",
      "estimated_time_minutes": 30
    }
  ],
  "coverage_summary": "most core flows documented, integrations missing",
  "confidence": 0.82,
  "rationale": "which docs you reviewed and what you found"
}`
    });
  }

  // Mentor might read docs from Supabase or file indexes; default no customer/RO.
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
        .contains('metadata', { agent_id: 'mentor' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Mentor loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Mentor loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'DOCUMENTATION_COMPLETENESS':
        return {
          documented_areas: context.documented_areas || 0,
          total_areas: context.total_areas || 1
        };

      case 'TRAINING_EFFECTIVENESS':
        return {
          quiz_scores: context.quiz_scores || []
        };

      case 'KNOWLEDGE_COVERAGE':
        return {
          topics_covered: context.topics_covered || 0,
          topics_total: context.topics_total || 1
        };

      default:
        return {};
    }
  }
}

export default MentorAgent;




















