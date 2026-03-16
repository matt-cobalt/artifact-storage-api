import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * OTTO - Service Advisor Agent
 * Specializes in customer interaction, service recommendations, and upselling.
 */
export class OttoAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'otto',
      agentName: 'Otto',
      role: 'service_advisor',
      formulas: ['CLV_CALCULATION', 'NCR_FORMULA', 'REX_CHURN_RISK'],
      systemPrompt: `You are Otto, an expert automotive service advisor AI agent.

Your Role:
- Greet customers warmly and build rapport
- Analyze customer history and vehicle condition
- Recommend appropriate services based on data
- Explain technical issues in simple terms
- Suggest value-added services (upselling)
- Build trust and long-term relationships

Your Approach:
- Always prioritize customer safety first
- Be honest about what's urgent vs. what can wait
- Use CLV and churn data to personalize recommendations
- Reference service history to show you remember them
- Explain WHY a service is needed, not just WHAT
- Balance profitability with customer retention

Decision Framework:
- High CLV customers: Premium service, more time
- Medium CLV: Standard service, good attention  
- Low CLV: Efficient service, build relationship
- High churn risk: Extra care, retention focus
- Low churn risk: Maintenance focus

You MUST respond in JSON format with:
{
  "greeting": "personalized greeting based on customer history",
  "recommended_services": [
    {
      "service": "service name",
      "priority": "urgent|recommended|optional",
      "reason": "why this is needed",
      "estimated_cost": 150.0,
      "safety_impact": "high|medium|low"
    }
  ],
  "talking_points": ["point1", "point2"],
  "upsell_opportunities": [
    {
      "service": "service name",
      "value_proposition": "why customer should consider this",
      "confidence": 0.75
    }
  ],
  "follow_up_needed": true,
  "follow_up_timing": "days until next contact",
  "confidence": 0.85,
  "rationale": "summary of decision-making process"
}`
    });
  }

  /**
   * Load customer data from Supabase including vehicles and ROs.
   */
  async loadCustomerData(customerId) {
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`*,
        vehicles (*),
        repair_orders (*)`)
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('Otto loadCustomerData error:', error);
      return null;
    }

    const metrics = this.calculateCustomerMetrics(customer);

    return {
      ...customer,
      metrics
    };
  }

  /**
   * Derive basic customer metrics used as formula inputs.
   */
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

  /**
   * Load RO data (with customer, vehicle, line_items) from Supabase.
   */
  async loadROData(roId) {
    const { data: ro, error } = await supabase
      .from('repair_orders')
      .select(
        `*,
        customer (*),
        vehicle (*),
        line_items (*)`
      )
      .eq('id', roId)
      .single();

    if (error) {
      console.error('Otto loadROData error:', error);
      return null;
    }

    return ro;
  }

  /**
   * Load recent Otto decisions from artifacts for additional context.
   */
  async loadAgentHistory(limit = 5) {
    try {
      const { data: artifacts, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('type', 'agent_decision')
        .contains('metadata', { agent_id: 'otto' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Otto loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Otto loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  /**
   * Map context into formula input shapes for this agent.
   */
  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    const customer = context.customer;
    const metrics = customer?.metrics || {};

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

      case 'NCR_FORMULA':
        return {
          days_since_last_visit: metrics.last_visit || 999
        };

      case 'REX_CHURN_RISK':
        return {
          recency_score: Math.min((metrics.last_visit || 365) / 365, 1),
          engagement_decline: 0.5,
          satisfaction_drop: 0.2,
          competitive_exposure: 0.5
        };

      default:
        return {};
    }
  }
}

export default OttoAgent;




















