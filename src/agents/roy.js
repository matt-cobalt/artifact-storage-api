import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * ROY - Business Intelligence Agent
 * Daily KPIs, coaching insights, and strategic recommendations.
 */
export class RoyAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'roy',
      agentName: 'Roy',
      role: 'business_intelligence',
      formulas: ['RULE_OF_40', 'NRR_CALCULATION', 'CAGR_CALCULATION', 'KPI_TRACKING'],
      systemPrompt: `You are Roy, the business intelligence specialist.

Your Role:
- Summarize daily performance for the shop
- Highlight red/yellow/green KPIs that need attention
- Provide simple coaching recommendations
- Focus on revenue, profitability, retention, and throughput

You MUST respond in JSON format with:
{
  "kpi_summary": [
    {
      "name": "ARO",
      "value": 487.0,
      "target": 450.0,
      "status": "good|warning|critical",
      "trend": "up|flat|down"
    }
  ],
  "highlights": ["Best day this week for ARO"],
  "risks": ["Capacity load high tomorrow"],
  "coaching_tips": ["Review declined services with service writers"],
  "confidence": 0.82,
  "rationale": "which metrics you looked at and why"
}`
    });
  }

  // Roy works primarily from aggregates / views rather than per-customer.

  // eslint-disable-next-line class-methods-use-this
  async loadCustomerData(customerId) {
    // Most Roy calls will not be per-customer; return null by default.
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
        .contains('metadata', { agent_id: 'roy' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Roy loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Roy loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  /**
   * For now, KPI-related formulas will operate on simple aggregate inputs.
   */
  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    // In the future we can pull from summary tables / views.
    switch (formulaName) {
      case 'RULE_OF_40':
        return {
          growth_rate: context.growth_rate || 0.25,
          profit_margin: context.profit_margin || 0.18
        };

      case 'NRR_CALCULATION':
        return {
          starting_mrr: context.starting_mrr || 10000,
          expansion_mrr: context.expansion_mrr || 1500,
          churned_mrr: context.churned_mrr || 800
        };

      case 'CAGR_CALCULATION':
        return {
          starting_value: context.starting_revenue || 500000,
          ending_value: context.ending_revenue || 750000,
          years: context.years || 3
        };

      case 'KPI_TRACKING':
        return {
          aro: context.aro || 450,
          car_count: context.car_count || 18,
          close_rate: context.close_rate || 0.62
        };

      default:
        return {};
    }
  }
}

export default RoyAgent;




















