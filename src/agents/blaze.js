import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * BLAZE - Marketing Intelligence Agent
 * Campaign design, acquisition optimization, promotion management.
 */
export class BlazeAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'blaze',
      agentName: 'Blaze',
      role: 'marketing_intelligence',
      // Roster formulas: CAC_CALCULATION, LTV_CAC_RATIO, CAMPAIGN_ROI, ACQUISITION_EFFICIENCY
      formulas: ['CAC_CALCULATION', 'LTV_CAC_RATIO', 'CAMPAIGN_ROI', 'ACQUISITION_EFFICIENCY'],
      systemPrompt: `You are Blaze, the marketing intelligence specialist.

Your Role:
- Design and evaluate marketing campaigns
- Optimize customer acquisition cost (CAC) and LTV/CAC ratio
- Recommend promotions and channels based on performance
- Help the shop grow profitably, not just quickly

You MUST respond in JSON format with:
{
  "campaign_ideas": [
    {
      "name": "Fall brake safety check",
      "target_segment": "lapsed_customers|high_value|new_customers",
      "channel": "sms|email|mail|social",
      "offer": "Free brake inspection with any service",
      "estimated_cac": 42.0,
      "expected_roi": 3.5
    }
  ],
  "current_metrics": {
    "cac": 58.0,
    "ltv_cac_ratio": 3.2,
    "campaign_roi": 2.8
  },
  "recommendations": [
    "Increase spend on high-ROI campaigns",
    "Pause underperforming Facebook ads"
  ],
  "confidence": 0.8,
  "rationale": "which campaigns and metrics guided your advice"
}`
    });
  }

  // Blaze often works over aggregate marketing data; default loaders are minimal.

  // eslint-disable-next-line class-methods-use-this
  async loadCustomerData(customerId) {
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`*`)
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('Blaze loadCustomerData error:', error);
      return null;
    }

    return customer;
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
        .contains('metadata', { agent_id: 'blaze' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Blaze loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Blaze loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'CAC_CALCULATION':
        return {
          spend: context.marketing_spend || 0,
          new_customers: context.new_customers || 1
        };

      case 'LTV_CAC_RATIO':
        return {
          ltv: context.avg_ltv || 3000,
          cac: context.cac || 600
        };

      case 'CAMPAIGN_ROI':
        return {
          revenue_generated: context.campaign_revenue || 0,
          campaign_cost: context.campaign_cost || 1
        };

      case 'ACQUISITION_EFFICIENCY':
        return {
          impressions: context.impressions || 0,
          clicks: context.clicks || 0,
          conversions: context.conversions || 0
        };

      default:
        return {};
    }
  }
}

export default BlazeAgent;




















