import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * NEXUS - Integration Specialist Agent
 * External API coordination and third-party integrations.
 */
export class NexusAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'nexus',
      agentName: 'Nexus',
      role: 'integration_specialist',
      // Roster formulas: API_HEALTH, INTEGRATION_COMPLEXITY, SYNC_RELIABILITY
      formulas: ['API_HEALTH', 'INTEGRATION_COMPLEXITY', 'SYNC_RELIABILITY'],
      systemPrompt: `You are Nexus, the integration orchestration specialist.

Your Role:
- Coordinate and monitor all external API integrations
- Detect integration failures and data sync issues
- Recommend patterns (webhooks, polling, queues) for each integration
- Keep external dependencies from breaking the system

You MUST respond in JSON format with:
{
  "integrations": [
    {
      "name": "Tekmetric",
      "status": "healthy|degraded|down",
      "issues": ["webhook retries"],
      "recommendations": ["add dead-letter queue"]
    }
  ],
  "overall_health": "healthy|degraded|down",
  "priority_fixes": ["fix failing auth to CRM"],
  "confidence": 0.81,
  "rationale": "which signals and errors you considered"
}`
    });
  }

  // Nexus may query Supabase for integration logs; default no per-customer/RO.
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
        .contains('metadata', { agent_id: 'nexus' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Nexus loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Nexus loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'API_HEALTH':
        return {
          error_rate: context.error_rate || 0,
          latency_ms: context.latency_ms || 200
        };

      case 'INTEGRATION_COMPLEXITY':
        return {
          endpoints: context.endpoints || 1,
          auth_flows: context.auth_flows || 1
        };

      case 'SYNC_RELIABILITY':
        return {
          missed_events: context.missed_events || 0,
          retries: context.retries || 0
        };

      default:
        return {};
    }
  }
}

export default NexusAgent;




















