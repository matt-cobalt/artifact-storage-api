/**
 * Revenue Attribution Tracking
 * Tracks which agents contributed to revenue
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * RevenueAttribution class
 */
export class RevenueAttribution {
  constructor(shopId = null) {
    this.shopId = shopId;
  }

  /**
   * Attribute revenue to agents
   * @param {string} revenueEventId - RO ID or transaction ID
   * @param {number} revenueAmount - Revenue amount
   * @param {string} attributionType - Type (upsell, win_back, review, campaign, retention)
   * @param {Array<string>} agentIds - Agent IDs that contributed
   * @param {Array<number>} weights - Attribution weights (must sum to 1.0)
   * @returns {Promise<Object>} Attribution record
   */
  async attributeRevenue(revenueEventId, revenueAmount, attributionType, agentIds, weights = null) {
    try {
      // Default to equal weights if not provided
      if (!weights || weights.length !== agentIds.length) {
        weights = agentIds.map(() => 1 / agentIds.length);
      }

      // Normalize weights to sum to 1.0
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      if (totalWeight !== 1.0) {
        weights = weights.map(w => w / totalWeight);
      }

      // Create attribution record
      const { data, error } = await supabase
        .from('revenue_attribution')
        .insert({
          shop_id: this.shopId,
          revenue_event_id: revenueEventId,
          revenue_amount: revenueAmount,
          attribution_type: attributionType,
          agent_ids: agentIds,
          attribution_weights: weights,
          event_date: new Date().toISOString().split('T')[0],
          metadata: {}
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create attribution: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('RevenueAttribution.attributeRevenue error:', error);
      throw error;
    }
  }

  /**
   * Attribute upsell revenue
   * @param {string} roId - Repair order ID
   * @param {number} upsellAmount - Upsell revenue
   */
  async attributeUpsell(roId, upsellAmount) {
    return await this.attributeRevenue(
      roId,
      upsellAmount,
      'upsell',
      ['sv01-revenue'], // REVENUE agent gets credit
      [1.0]
    );
  }

  /**
   * Attribute win-back revenue
   * @param {string} customerId - Customer ID
   * @param {string} roId - New repair order ID
   * @param {number} revenueAmount - Revenue from win-back
   */
  async attributeWinBack(customerId, roId, revenueAmount) {
    return await this.attributeRevenue(
      roId,
      revenueAmount,
      'win_back',
      ['sv02-retention'], // RETENTION agent gets credit
      [1.0]
    );
  }

  /**
   * Attribute review revenue (new customer from review)
   * @param {string} newCustomerId - New customer ID
   * @param {string} roId - First RO ID
   * @param {number} revenueAmount - Revenue from new customer
   */
  async attributeReview(newCustomerId, roId, revenueAmount) {
    return await this.attributeRevenue(
      roId,
      revenueAmount,
      'review',
      ['sv03-loyalty'], // LOYALTY agent gets credit
      [1.0]
    );
  }

  /**
   * Attribute campaign revenue
   * @param {string} campaignId - Campaign ID
   * @param {string} roId - Conversion RO ID
   * @param {number} revenueAmount - Revenue from campaign
   */
  async attributeCampaign(campaignId, roId, revenueAmount) {
    return await this.attributeRevenue(
      roId,
      revenueAmount,
      'campaign',
      ['sv07-marketing'], // MARKETING agent gets credit
      [1.0]
    );
  }

  /**
   * Attribute multi-touch revenue (multiple agents contributed)
   * @param {string} revenueEventId - Event ID
   * @param {number} revenueAmount - Revenue amount
   * @param {Object} agentContributions - { agentId: weight }
   */
  async attributeMultiTouch(revenueEventId, revenueAmount, agentContributions) {
    const agentIds = Object.keys(agentContributions);
    const weights = Object.values(agentContributions);

    // Determine attribution type based on agents
    let attributionType = 'retention';
    if (agentIds.includes('sv01-revenue')) attributionType = 'upsell';
    if (agentIds.includes('sv07-marketing')) attributionType = 'campaign';

    return await this.attributeRevenue(
      revenueEventId,
      revenueAmount,
      attributionType,
      agentIds,
      weights
    );
  }

  /**
   * Get revenue attributed to agent
   * @param {string} agentId - Agent ID
   * @param {Object} dateRange - { start_date, end_date }
   * @returns {Promise<number>} Total revenue attributed
   */
  async getAgentAttributedRevenue(agentId, dateRange = {}) {
    try {
      const { start_date, end_date } = dateRange;
      const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = end_date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('revenue_attribution')
        .select('*')
        .eq('shop_id', this.shopId)
        .contains('agent_ids', [agentId])
        .gte('event_date', start)
        .lte('event_date', end);

      if (error) {
        throw new Error(`Failed to get attributions: ${error.message}`);
      }

      // Calculate weighted revenue
      let totalRevenue = 0;
      for (const attr of data || []) {
        const agentIndex = attr.agent_ids.indexOf(agentId);
        if (agentIndex !== -1) {
          const weight = attr.attribution_weights && attr.attribution_weights[agentIndex]
            ? attr.attribution_weights[agentIndex]
            : 1 / attr.agent_ids.length;

          totalRevenue += parseFloat(attr.revenue_amount) * weight;
        }
      }

      return totalRevenue;
    } catch (error) {
      console.error('getAgentAttributedRevenue error:', error);
      throw error;
    }
  }
}

export default RevenueAttribution;



















