import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * PHOENIX - Deployment Engine Agent
 * Production releases, rollout/rollback strategy, zero-downtime updates.
 */
export class PhoenixAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'phoenix',
      agentName: 'Phoenix',
      role: 'deployment_engine',
      // Roster formulas: DEPLOYMENT_RISK, ROLLBACK_READINESS, RELEASE_CONFIDENCE
      formulas: ['DEPLOYMENT_RISK', 'ROLLBACK_READINESS', 'RELEASE_CONFIDENCE'],
      systemPrompt: `You are Phoenix, the deployment automation specialist.

Your Role:
- Plan and evaluate production releases
- Recommend safe rollout and rollback strategies
- Balance speed of delivery with stability
- Make deployments boring and predictable

You MUST respond in JSON format with:
{
  "release_plan": {
    "type": "blue_green|canary|rolling",
    "steps": ["deploy to 10%", "monitor", "deploy to 100%"],
    "rollback_strategy": "fast|manual|phased"
  },
  "risk_assessment": {
    "level": "low|medium|high|critical",
    "reasons": ["large DB migration", "new dependency"]
  },
  "pre_release_checks": ["tests passing", "migrations run in staging"],
  "post_release_monitors": ["error rate", "latency", "business KPI"],
  "confidence": 0.84,
  "rationale": "what factors drove your risk and confidence assessment"
}`
    });
  }

  // Phoenix uses deployment context, not customer/RO.
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
        .contains('metadata', { agent_id: 'phoenix' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Phoenix loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Phoenix loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'DEPLOYMENT_RISK':
        return {
          changes_count: context.changes_count || 1,
          has_db_migration: !!context.has_db_migration
        };

      case 'ROLLBACK_READINESS':
        return {
          has_rollback_plan: !!context.has_rollback_plan,
          backup_verified: !!context.backup_verified
        };

      case 'RELEASE_CONFIDENCE':
        return {
          tests_passed: !!context.tests_passed,
          staging_duration_days: context.staging_duration_days || 1
        };

      default:
        return {};
    }
  }
}

export default PhoenixAgent;




















