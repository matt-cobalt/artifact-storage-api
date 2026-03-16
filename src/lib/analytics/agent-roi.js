/**
 * Agent ROI Calculator
 * Calculates ROI for agents with revenue attribution
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Cost constants (per execution/action)
const COSTS = {
  claude_api_call: 0.015, // $0.015 per API call (Claude Sonnet pricing)
  sms_message: 0.0075,    // $0.0075 per SMS (RingCentral)
  compute_hourly: 0.10    // $0.10 per hour compute (simplified)
};

/**
 * AgentROICalculator class
 */
export class AgentROICalculator {
  constructor(shopId = null) {
    this.shopId = shopId;
  }

  /**
   * Calculate ROI for an agent
   * @param {string} agentId - Agent ID
   * @param {Object} dateRange - { start_date, end_date }
   * @returns {Promise<Object>} ROI metrics
   */
  async calculateROI(agentId, dateRange = {}) {
    try {
      const { start_date, end_date } = dateRange;
      const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = end_date || new Date().toISOString().split('T')[0];

      // Get agent executions (from artifacts or agent_decision artifacts)
      const executions = await this.getAgentExecutions(agentId, start, end);

      // Calculate revenue attributed
      const revenueAttributed = await this.calculateRevenueAttributed(agentId, executions);

      // Calculate cost
      const cost = await this.calculateCost(agentId, executions);

      // Calculate metrics
      const netROI = revenueAttributed - cost;
      const roiPercentage = cost > 0 ? (netROI / cost) * 100 : 0;
      const customersInfluenced = await this.getCustomersInfluenced(agentId, executions);
      const conversions = await this.getConversions(agentId, executions);
      const paybackPeriod = revenueAttributed > 0 ? (cost / revenueAttributed) * 30 : null; // days

      // Store/update metrics
      await this.storeROIMetrics(agentId, {
        date: end,
        executions_count: executions.length,
        revenue_attributed: revenueAttributed,
        cost: cost,
        net_roi: netROI,
        roi_percentage: roiPercentage,
        customers_influenced: customersInfluenced,
        conversions: conversions,
        payback_period_days: paybackPeriod
      });

      return {
        agent_id: agentId,
        period: { start, end },
        executions: executions.length,
        revenue_attributed: revenueAttributed,
        cost: cost,
        net_roi: netROI,
        roi_percentage: roiPercentage,
        customers_influenced: customersInfluenced,
        conversions: conversions,
        payback_period_days: paybackPeriod
      };
    } catch (error) {
      console.error('AgentROICalculator.calculateROI error:', error);
      throw error;
    }
  }

  /**
   * Calculate revenue attributed to agent
   * @private
   */
  async calculateRevenueAttributed(agentId, executions) {
    let totalRevenue = 0;

    // Get revenue attribution records for this agent
    const { data: attributions, error } = await supabase
      .from('revenue_attribution')
      .select('*')
      .eq('shop_id', this.shopId)
      .contains('agent_ids', [agentId]);

    if (error) {
      console.error('Failed to get revenue attributions:', error);
      return 0;
    }

    // Calculate weighted revenue for this agent
    for (const attr of attributions || []) {
      const agentIndex = attr.agent_ids.indexOf(agentId);
      if (agentIndex !== -1) {
        const weight = attr.attribution_weights && attr.attribution_weights[agentIndex]
          ? attr.attribution_weights[agentIndex]
          : 1 / attr.agent_ids.length; // Equal split if no weights

        totalRevenue += attr.revenue_amount * weight;
      }
    }

    // Agent-specific attribution logic
    if (agentId === 'sv01-revenue' || agentId.includes('revenue')) {
      // Count upsells accepted
      // Would query ROs with upsells and attribute revenue
      const { data: upsells } = await supabase
        .from('repair_orders')
        .select('total_amount, created_at')
        .eq('shop_id', this.shopId)
        .gte('created_at', executions[0]?.timestamp || new Date().toISOString())
        .not('upsell_amount', 'is', null);

      // Simplified: attribute 20% of upsell revenue to REVENUE agent
      for (const ro of upsells || []) {
        totalRevenue += (ro.total_amount || 0) * 0.20;
      }
    }

    if (agentId === 'sv02-retention' || agentId.includes('retention')) {
      // Count win-back customers and attribute their LTV
      const { data: winbacks } = await supabase
        .from('customers')
        .select('id, lifetime_revenue')
        .eq('shop_id', this.shopId)
        .gte('last_service_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      // Attribute 30% of win-back customer LTV
      for (const customer of winbacks || []) {
        totalRevenue += (customer.lifetime_revenue || 0) * 0.30;
      }
    }

    return Math.round(totalRevenue * 100) / 100;
  }

  /**
   * Calculate cost for agent executions
   * @private
   */
  async calculateCost(agentId, executions) {
    let cost = 0;

    // API call cost (Claude)
    const apiCallCost = executions.length * COSTS.claude_api_call;

    // SMS cost (if COMMS agent)
    let smsCount = 0;
    if (agentId === 'sv04-comms' || agentId.includes('comms')) {
      // Would query SMS logs
      smsCount = executions.length * 0.5; // Estimate: 50% of executions result in SMS
    }

    const smsCost = smsCount * COSTS.sms_message;

    // Compute cost (simplified: $0.10 per hour, ~100 executions per hour)
    const computeHours = executions.length / 100;
    const computeCost = computeHours * COSTS.compute_hourly;

    cost = apiCallCost + smsCost + computeCost;

    return Math.round(cost * 100) / 100;
  }

  /**
   * Get agent executions
   * @private
   */
  async getAgentExecutions(agentId, startDate, endDate) {
    const { data, error } = await supabase
      .from('artifacts')
      .select('*')
      .eq('type', 'agent_decision')
      .eq('shop_id', this.shopId)
      .eq('data->>agent', agentId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      console.error('Failed to get agent executions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get customers influenced
   * @private
   */
  async getCustomersInfluenced(agentId, executions) {
    // Count unique customers from executions
    const customerIds = new Set();
    
    for (const exec of executions) {
      if (exec.data?.customer_id) {
        customerIds.add(exec.data.customer_id);
      }
    }

    return customerIds.size;
  }

  /**
   * Get conversions
   * @private
   */
  async getConversions(executions) {
    // Count successful actions (would check execution results)
    return executions.filter(e => e.data?.success !== false).length;
  }

  /**
   * Store ROI metrics
   * @private
   */
  async storeROIMetrics(agentId, metrics) {
    const { error } = await supabase
      .from('agent_roi_metrics')
      .upsert({
        agent_id: agentId,
        shop_id: this.shopId,
        date: metrics.date,
        executions_count: metrics.executions_count,
        revenue_attributed: metrics.revenue_attributed,
        cost: metrics.cost,
        net_roi: metrics.net_roi,
        roi_percentage: metrics.roi_percentage,
        customers_influenced: metrics.customers_influenced,
        conversions: metrics.conversions,
        payback_period_days: metrics.payback_period_days
      }, {
        onConflict: 'agent_id,shop_id,date'
      });

    if (error) {
      console.error('Failed to store ROI metrics:', error);
    }
  }

  /**
   * Get ROI for all agents
   * @param {Object} dateRange - { start_date, end_date }
   * @returns {Promise<Array>} ROI metrics for all agents
   */
  async getAllAgentsROI(dateRange = {}) {
    try {
      const { AgentRegistry } = await import('../../agents/registry.js');
      const agentIds = Object.keys(AgentRegistry);

      const results = [];
      for (const agentId of agentIds) {
        try {
          const roi = await this.calculateROI(agentId, dateRange);
          results.push(roi);
        } catch (error) {
          console.error(`Failed to calculate ROI for ${agentId}:`, error);
        }
      }

      // Sort by net ROI descending
      results.sort((a, b) => b.net_roi - a.net_roi);

      return results;
    } catch (error) {
      console.error('getAllAgentsROI error:', error);
      throw error;
    }
  }
}

export default AgentROICalculator;



















