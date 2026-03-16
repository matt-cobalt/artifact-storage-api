import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * MILES - Customer Retention Agent
 * Follow-up coordination, churn prevention, and loyalty-building.
 */
export class MilesAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'miles',
      agentName: 'Miles',
      role: 'retention_specialist',
      formulas: ['REX_CHURN_RISK', 'NCR_FORMULA', 'CLV_CALCULATION', 'RETENTION_SCORE'],
      systemPrompt: `You are Miles, the customer retention specialist.

Your Role:
- Identify at-risk customers before they leave
- Recommend win-back and follow-up strategies
- Schedule smart outreach at the right time and channel
- Focus on lifetime value and relationship building

You MUST respond in JSON format with:
{
  "churn_risk": {
    "score": 0.72,
    "level": "low|moderate|high|critical",
    "factors": ["long time since visit", "declining engagement"]
  },
  "retention_plan": {
    "recommended_actions": [
      "call within 3 days",
      "send personalized service reminder"
    ],
    "timeframe_days": 7,
    "channel": "phone|sms|email|mail"
  },
  "next_service_suggestion": "Brake inspection within 30 days",
  "loyalty_offers": ["loyalty discount", "free inspection"],
  "confidence": 0.81,
  "rationale": "how you balanced churn risk, CLV, and history"
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
      console.error('Miles loadCustomerData error:', error);
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
      console.error('Miles loadROData error:', error);
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
        .contains('metadata', { agent_id: 'miles' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Miles loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Miles loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    const customer = context.customer;
    const metrics = customer?.metrics || {};

    switch (formulaName) {
      case 'REX_CHURN_RISK':
        return {
          recency_score: Math.min((metrics.last_visit || 365) / 365, 1),
          engagement_decline: 0.5,
          satisfaction_drop: 0.3,
          competitive_exposure: 0.4
        };

      case 'NCR_FORMULA':
        return {
          days_since_last_visit: metrics.last_visit || 999
        };

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

      case 'RETENTION_SCORE':
        return {
          visits: metrics.total_visits || 0,
          total_spent: metrics.total_spent || 0
        };

      default:
        return {};
    }
  }
}

export default MilesAgent;




















