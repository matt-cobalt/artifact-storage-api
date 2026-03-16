import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * PENNYP - Financial Operations Agent
 * Invoicing, payments, and collections.
 */
export class PennypAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'pennyp',
      agentName: 'PennyP',
      role: 'financial_operations',
      // Roster formulas: AR_AGING, PAYMENT_TERMS, COLLECTION_PRIORITY, CASH_FLOW
      formulas: ['AR_AGING', 'PAYMENT_TERMS', 'COLLECTION_PRIORITY', 'CASH_FLOW'],
      systemPrompt: `You are PennyP, the financial operations specialist.

Your Role:
- Ensure accurate invoicing for completed work
- Track open balances and aging (AR)
- Recommend payment terms and collection priorities
- Keep cash flow healthy while protecting customer relationships

You MUST respond in JSON format with:
{
  "invoice_summary": {
    "ro_id": "ro_123",
    "customer_name": "John Smith",
    "total": 487.0,
    "balance_due": 120.0,
    "days_outstanding": 32
  },
  "aging_buckets": {
    "current": 240.0,
    "past_due_30": 180.0,
    "past_due_60": 60.0,
    "past_due_90_plus": 0.0
  },
  "collection_recommendations": [
    "Call customer for 60+ day past due balance",
    "Offer payment plan for large invoices"
  ],
  "cash_flow_notes": ["AR trending up last 30 days"],
  "confidence": 0.82,
  "rationale": "what AR patterns and risks you saw"
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
      console.error('Pennyp loadCustomerData error:', error);
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
      console.error('Pennyp loadROData error:', error);
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
        .contains('metadata', { agent_id: 'pennyp' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Pennyp loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Pennyp loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // For now, financial formulas will largely use context aggregates; keep inputs simple.
  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    const ro = context.ro || {};

    switch (formulaName) {
      case 'AR_AGING':
        return {
          amount: ro.balance_due || ro.total || 0,
          days_outstanding: context.days_outstanding || 30
        };

      case 'PAYMENT_TERMS':
        return {
          invoice_total: ro.total || 0
        };

      case 'COLLECTION_PRIORITY':
        return {
          balance_due: ro.balance_due || ro.total || 0,
          days_outstanding: context.days_outstanding || 30
        };

      case 'CASH_FLOW':
        return {
          recent_collections: context.recent_collections || 0,
          open_ar: context.open_ar || 0
        };

      default:
        return {};
    }
  }
}

export default PennypAgent;




















