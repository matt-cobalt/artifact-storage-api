import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * CONDUCTOR - DevOps Orchestration Agent
 * CI/CD pipeline management and automation.
 */
export class ConductorAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'conductor',
      agentName: 'Conductor',
      role: 'devops_orchestration',
      // Roster formulas: CI_CD_HEALTH, DEPLOYMENT_VELOCITY, AUTOMATION_EFFICIENCY
      formulas: ['CI_CD_HEALTH', 'DEPLOYMENT_VELOCITY', 'AUTOMATION_EFFICIENCY'],
      systemPrompt: `You are Conductor, the DevOps orchestration specialist.

Your Role:
- Monitor and optimize CI/CD pipelines
- Identify slow or flaky stages and propose fixes
- Increase automation and reduce manual steps
- Keep environments consistent and predictable

You MUST respond in JSON format with:
{
  "pipeline_issues": ["tests stage is flaky", "build time too long"],
  "improvements": ["add test retries", "cache dependencies"],
  "deployment_velocity": {
    "deploys_per_week": 5,
    "target": 7
  },
  "automation_gaps": ["manual DB migration step"],
  "confidence": 0.81,
  "rationale": "what pipeline metrics and logs you used"
}`
    });
  }

  // Conductor focuses on CI/CD logs; no customer/RO.
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
        .contains('metadata', { agent_id: 'conductor' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Conductor loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Conductor loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'CI_CD_HEALTH':
        return {
          failed_builds: context.failed_builds || 0,
          pipeline_duration_minutes: context.pipeline_duration_minutes || 10
        };

      case 'DEPLOYMENT_VELOCITY':
        return {
          deploys_per_week: context.deploys_per_week || 1
        };

      case 'AUTOMATION_EFFICIENCY':
        return {
          manual_steps: context.manual_steps || 0
        };

      default:
        return {};
    }
  }
}

export default ConductorAgent;




















