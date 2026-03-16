/**
 * Analytics API Routes
 * Business intelligence and ROI tracking
 */

import 'dotenv/config';
import AgentROICalculator from '../lib/analytics/agent-roi.js';
import LTVPredictor from '../lib/analytics/ltv-predictor.js';
import ChurnRiskAnalyzer from '../lib/analytics/churn-risk.js';
import ShopBenchmarking from '../lib/analytics/benchmarking.js';
import RevenueAttribution from '../lib/analytics/revenue-attribution.js';

/**
 * Get agent ROI
 */
export async function getAgentROI(shopId, agentId = null, dateRange = {}) {
  try {
    const calculator = new AgentROICalculator(shopId);

    if (agentId) {
      return await calculator.calculateROI(agentId, dateRange);
    } else {
      return await calculator.getAllAgentsROI(dateRange);
    }
  } catch (error) {
    console.error('getAgentROI error:', error);
    throw error;
  }
}

/**
 * Get customer LTV predictions
 */
export async function getCustomerLTV(shopId, customerId = null) {
  try {
    const predictor = new LTVPredictor(shopId);

    if (customerId) {
      return await predictor.predictLTV(customerId);
    } else {
      return await predictor.predictAllCustomers();
    }
  } catch (error) {
    console.error('getCustomerLTV error:', error);
    throw error;
  }
}

/**
 * Get churn risk scores
 */
export async function getChurnRisk(shopId, limit = 50) {
  try {
    const analyzer = new ChurnRiskAnalyzer(shopId);
    return await analyzer.getHighRiskCustomers(limit);
  } catch (error) {
    console.error('getChurnRisk error:', error);
    throw error;
  }
}

/**
 * Get shop benchmark
 */
export async function getShopBenchmark(shopId, dateRange = {}) {
  try {
    const benchmarking = new ShopBenchmarking(shopId);
    return await benchmarking.compareShop(dateRange);
  } catch (error) {
    console.error('getShopBenchmark error:', error);
    throw error;
  }
}

/**
 * Get marketing campaign metrics
 */
export async function getCampaignMetrics(shopId, campaignId = null) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    let query = supabase
      .from('marketing_campaign_metrics')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (campaignId) {
      query = query.eq('id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get campaign metrics: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getCampaignMetrics error:', error);
    throw error;
  }
}

export default {
  getAgentROI,
  getCustomerLTV,
  getChurnRisk,
  getShopBenchmark,
  getCampaignMetrics
};



















