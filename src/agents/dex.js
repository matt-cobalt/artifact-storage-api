import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * DEX - Diagnostics Triage Agent
 * Focuses on diagnostic analysis, DTC codes, and root cause identification.
 */
export class DexAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'dex',
      agentName: 'Dex',
      role: 'diagnostics_triage',
      // Per latest spec: use churn + upsell formulas as signals for triage priority
      formulas: ['REX_CHURN_RISK', 'UPSELL_PROBABILITY'],
      systemPrompt: `You are Dex, the diagnostics triage specialist.

Your Role:
- Analyze customer complaints and vehicle symptoms
- Interpret DTC (diagnostic trouble) codes and live data
- Propose likely root causes and diagnostic hypotheses
- Recommend the most efficient next diagnostic tests
- Prioritize safety-critical issues first

Your Approach:
- Always prioritize drivability and safety issues
- Combine symptom description, codes, and history
- Minimize unnecessary tests while avoiding missed faults
- Use churn/upsell signals only as a secondary input for prioritization

You MUST respond in JSON format with:
{
  "summary": "short summary of the situation",
  "likely_causes": [
    {
      "cause": "possible cause",
      "likelihood": 0.8,
      "evidence": ["symptom", "code", "history item"]
    }
  ],
  "recommended_tests": [
    {
      "test": "test name",
      "reason": "why this test is recommended",
      "priority": "high|medium|low",
      "estimated_time_minutes": 20
    }
  ],
  "safety_risk": "high|medium|low",
  "customer_explanation": "plain-language explanation you would tell the customer",
  "next_steps": ["step1", "step2"],
  "confidence": 0.8,
  "rationale": "how you arrived at these recommendations"
}`
    });
  }

  // Reuse the same Supabase-powered loaders as Otto so Dex has the same context.

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
      console.error('Dex loadCustomerData error:', error);
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
      console.error('Dex loadROData error:', error);
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
        .contains('metadata', { agent_id: 'dex' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Dex loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Dex loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // Map context into formula inputs
  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    const customer = context.customer;
    const metrics = customer?.metrics || {};
    const ro = context.ro || {};

    switch (formulaName) {
      case 'REX_CHURN_RISK':
        return {
          recency_score: Math.min((metrics.last_visit || 365) / 365, 1),
          engagement_decline: 0.4,
          satisfaction_drop: 0.3,
          competitive_exposure: 0.5
        };

      case 'UPSELL_PROBABILITY': {
        const baseApproval = typeof ro.approval_probability === 'number'
          ? ro.approval_probability
          : 0.6;

        const upsellPriceRatio = typeof ro.upsell_price_ratio === 'number'
          ? ro.upsell_price_ratio
          : 0.25;

        const relevance = 0.7; // diagnostics-driven upsell relevance baseline

        return {
          base_approval_probability: baseApproval,
          upsell_relevance: relevance,
          upsell_price_ratio: upsellPriceRatio
        };
      }

      default:
        return {};
    }
  }
}

export default DexAgent;




















