import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * ORACLE - Operational Analytics Agent
 * Real-time reporting, pattern detection, and predictive analytics.
 */
export class OracleAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'oracle',
      agentName: 'Oracle',
      role: 'operational_analytics',
      // Roster formulas: PATTERN_DETECTION, ANOMALY_IDENTIFICATION, PREDICTIVE_METRICS
      formulas: ['PATTERN_DETECTION', 'ANOMALY_IDENTIFICATION', 'PREDICTIVE_METRICS'],
      systemPrompt: `You are Oracle, the operational analytics specialist.

Your Role:
- Watch live operations data for patterns and anomalies
- Surface issues before they become visible on the floor
- Provide simple, actionable insights for the team
- Focus on throughput, cycle time, capacity load, and forecasted demand

You MUST respond in JSON format with:
{
  "patterns": [
    {
      "metric": "cycle_time",
      "observation": "increasing over last 3 days",
      "impact": "slower job completion"
    }
  ],
  "anomalies": [
    "Unusual spike in declined estimates this afternoon"
  ],
  "predictions": [
    "Tomorrow will exceed bay capacity from 10am-2pm if schedule unchanged"
  ],
  "recommended_actions": [
    "Level-load schedule for tomorrow",
    "Investigate decline reasons on brake jobs"
  ],
  "confidence": 0.8,
  "rationale": "which metrics and trends you analyzed"
}`
    });
  }

  // Oracle operates on aggregate metrics; per-customer/RO data is rarely needed.

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
        .contains('metadata', { agent_id: 'oracle' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Oracle loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Oracle loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'PATTERN_DETECTION':
        return {
          timeseries: context.timeseries || []
        };

      case 'ANOMALY_IDENTIFICATION':
        return {
          metrics: context.metrics || {}
        };

      case 'PREDICTIVE_METRICS':
        return {
          historical: context.historical || []
        };

      default:
        return {};
    }
  }
}

export default OracleAgent;




















