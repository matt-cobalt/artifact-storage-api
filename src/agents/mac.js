import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * MAC - Parts & Labor / Production Agent
 * Focuses on parts sourcing, labor time estimation, and efficiency analysis.
 */
export class MacAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'mac',
      agentName: 'Mac',
      role: 'production_manager',
      formulas: ['GROSS_MARGIN', 'LTV_CALCULATION'],
      systemPrompt: `You are Mac, the production and parts/labor efficiency specialist.

Your Role:
- Analyze parts and labor mix on active repair orders
- Ensure target gross margins are met or exceeded
- Identify efficiency issues (excessive labor time, low margin jobs)
- Suggest parts sourcing or labor time adjustments
- Coordinate with FLO for capacity and scheduling

You MUST respond in JSON format with:
{
  "job_analysis": [
    {
      "ro_id": "ro_123",
      "labor_hours_estimated": 2.0,
      "labor_hours_actual": 2.5,
      "parts_margin_pct": 0.35,
      "labor_margin_pct": 0.55,
      "overall_margin_pct": 0.44,
      "issues": ["excessive diagnostic time"],
      "recommendations": ["standardize brake job labor time"]
    }
  ],
  "shop_summary": {
    "avg_margin_pct": 0.46,
    "low_margin_jobs": 2,
    "high_margin_jobs": 5
  },
  "next_actions": ["review low-margin jobs", "coach tech on time standards"],
  "confidence": 0.83,
  "rationale": "how you evaluated margin and efficiency"
}`
    });
  }

  async loadCustomerData(customerId) {
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles (*),
        repair_orders (*, line_items (*))
      `)
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('Mac loadCustomerData error:', error);
      return null;
    }

    const metrics = this.calculateCustomerMetrics(customer);

    return {
      ...customer,
      metrics
    };
  }

  // eslint-disable-next-line class-methods-use-this
  calculateCustomerMetrics(customer) {
    const ros = customer?.repair_orders || [];
    const totalSpent = ros.reduce((sum, ro) => sum + (ro.total || 0), 0);
    const totalVisits = ros.length;

    const lastVisitDays = ros.length > 0
      ? Math.floor((Date.now() - new Date(ros[0].created_at)) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      total_visits: totalVisits,
      total_spent: totalSpent,
      average_ro: totalVisits > 0 ? totalSpent / totalVisits : 0,
      last_visit: lastVisitDays,
      vehicle_count: customer?.vehicles?.length || 0
    };
  }

  async loadROData(roId) {
    const { data: ro, error } = await supabase
      .from('repair_orders')
      .select(`
        *,
        customer (*),
        vehicle (*),
        line_items (*)
      `)
      .eq('id', roId)
      .single();

    if (error) {
      console.error('Mac loadROData error:', error);
      return null;
    }

    return ro;
  }

  async loadAgentHistory(limit = 5) {
    try {
      const { data: artifacts, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('type', 'agent_decision')
        .contains('metadata', { agent_id: 'mac' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Mac loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Mac loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    const customer = context.customer;
    const metrics = customer?.metrics || {};
    const ro = context.ro || {};

    switch (formulaName) {
      case 'GROSS_MARGIN': {
        const revenue = typeof ro.total === 'number' ? ro.total : ro.subtotal || 0;
        const cogs = typeof ro.cogs === 'number' ? ro.cogs : revenue * 0.6;
        const discounts = typeof ro.discounts === 'number' ? ro.discounts : 0;
        const overhead = typeof ro.overhead_allocated === 'number' ? ro.overhead_allocated : 0;

        return {
          revenue,
          cost_of_goods_sold: cogs,
          discounts,
          overhead_allocated: overhead
        };
      }

      case 'LTV_CALCULATION': {
        const avgAnnualRevenue = metrics.total_spent && metrics.total_visits
          ? (metrics.total_spent / Math.max(metrics.total_visits, 1)) * 3
          : 0;

        return {
          avg_annual_revenue: avgAnnualRevenue,
          gross_margin: 0.45,
          retention_rate: 0.8,
          years: 5,
          discount_rate: 0.1
        };
      }

      default:
        return {};
    }
  }
}

export default MacAgent;




















