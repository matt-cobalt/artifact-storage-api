import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * CAL - Pricing & Estimates Agent
 * Focuses on pricing strategy, competitive positioning, and profit optimization.
 */
export class CalAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'cal',
      agentName: 'Cal',
      role: 'pricing_specialist',
      formulas: ['CLV_CALCULATION', 'GROSS_MARGIN', 'LTV_CALCULATION'],
      systemPrompt: `You are Cal, the pricing and estimation specialist.

Your Role:
- Build accurate, easy-to-understand repair estimates
- Optimize pricing for profitability and competitiveness
- Recommend bundles and packages when appropriate
- Use CLV and LTV to tailor pricing strategy
- Balance margin targets with customer trust and conversion

You MUST respond in JSON format with:
{
  "estimate_summary": "short description of the quote",
  "line_items": [
    {
      "description": "Brake pads front",
      "category": "parts|labor|fees",
      "price": 120.0,
      "cost_estimate": 70.0,
      "margin_pct": 0.42,
      "is_optional": false
    }
  ],
  "totals": {
    "subtotal": 420.0,
    "tax": 35.0,
    "total": 455.0,
    "effective_margin_pct": 0.44
  },
  "pricing_position": "below_market|at_market|above_market",
  "talking_points": ["point1", "point2"],
  "discount_recommendations": ["early bird", "bundle"],
  "confidence": 0.86,
  "rationale": "why this structure and pricing were chosen"
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
      console.error('Cal loadCustomerData error:', error);
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
      console.error('Cal loadROData error:', error);
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
        .contains('metadata', { agent_id: 'cal' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Cal loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Cal loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    const customer = context.customer;
    const metrics = customer?.metrics || {};
    const ro = context.ro || {};

    switch (formulaName) {
      case 'CLV_CALCULATION':
        return {
          average_transaction_value: metrics.average_ro || 0,
          purchase_frequency:
            metrics.total_visits && metrics.last_visit
              ? 12 / Math.max(metrics.last_visit / 30, 1)
              : 1,
          customer_lifespan: 5,
          acquisition_cost: 50
        };

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

export default CalAgent;




















