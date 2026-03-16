/**
 * Shop Performance Benchmarking
 * Compares shop performance vs. industry and other shops
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as Admin from '../admin.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * ShopBenchmarking class
 */
export class ShopBenchmarking {
  constructor(shopId = null) {
    this.shopId = shopId;
  }

  /**
   * Compare shop performance
   * @param {Object} dateRange - { start_date, end_date }
   * @returns {Promise<Object>} Benchmark comparison
   */
  async compareShop(dateRange = {}) {
    try {
      const { start_date, end_date } = dateRange;
      const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = end_date || new Date().toISOString().split('T')[0];

      // Get shop metrics
      const shopMetrics = await this.getShopMetrics(start, end);

      // Get industry averages
      const industryAverages = await Admin.getIndustryAverage('total_revenue');

      // Get percentile rankings
      const percentileRank = await this.calculatePercentileRank(shopMetrics, start, end);

      // Calculate comparisons
      const comparisons = {
        revenue_per_ro: {
          value: shopMetrics.revenue_per_ro,
          percentile: percentileRank.revenue_per_ro,
          vs_average: this.compareToAverage(shopMetrics.revenue_per_ro, industryAverages.avg_revenue_per_ro || 500)
        },
        retention_rate: {
          value: shopMetrics.retention_rate,
          percentile: percentileRank.retention_rate,
          vs_average: this.compareToAverage(shopMetrics.retention_rate, 0.65)
        },
        avg_ticket: {
          value: shopMetrics.avg_ticket,
          percentile: percentileRank.avg_ticket,
          vs_average: this.compareToAverage(shopMetrics.avg_ticket, industryAverages.avg_ticket || 400)
        }
      };

      // Generate recommendations
      const recommendations = this.generateRecommendations(comparisons);

      return {
        shop_id: this.shopId,
        period: { start, end },
        metrics: shopMetrics,
        comparisons,
        agent_adoption: {
          score: shopMetrics.agent_adoption_score,
          rank: this.getAdoptionRank(shopMetrics.agent_adoption_score)
        },
        recommendations
      };
    } catch (error) {
      console.error('ShopBenchmarking.compareShop error:', error);
      throw error;
    }
  }

  /**
   * Get shop metrics
   * @private
   */
  async getShopMetrics(startDate, endDate) {
    // Get ROs
    const { data: ros } = await supabase
      .from('repair_orders')
      .select('total_amount, status')
      .eq('shop_id', this.shopId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const completedROs = ros?.filter(ro => ro.status === 'completed') || [];
    const totalRevenue = completedROs.reduce((sum, ro) => sum + (parseFloat(ro.total_amount) || 0), 0);
    const roCount = completedROs.length;
    const revenuePerRO = roCount > 0 ? totalRevenue / roCount : 0;

    // Get customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('shop_id', this.shopId);

    // Calculate retention rate (simplified)
    const { data: recentCustomers } = await supabase
      .from('customers')
      .select('id')
      .eq('shop_id', this.shopId)
      .gte('last_service_date', startDate);

    const retentionRate = customers && customers.length > 0
      ? (recentCustomers?.length || 0) / customers.length
      : 0;

    // Calculate agent adoption score
    const agentAdoptionScore = await this.calculateAgentAdoptionScore();

    return {
      revenue: totalRevenue,
      ro_count: roCount,
      customer_count: customers?.length || 0,
      revenue_per_ro: revenuePerRO,
      avg_ticket: revenuePerRO,
      retention_rate: retentionRate,
      agent_adoption_score: agentAdoptionScore
    };
  }

  /**
   * Calculate agent adoption score
   * @private
   */
  async calculateAgentAdoptionScore() {
    try {
      // Get agent configs (active agents)
      const { data: configs } = await supabase
        .from('shop_agent_configs')
        .select('agent_id, enabled')
        .eq('shop_id', this.shopId)
        .eq('enabled', true);

      // Get agent executions (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: executions } = await supabase
        .from('artifacts')
        .select('id')
        .eq('type', 'agent_decision')
        .eq('shop_id', this.shopId)
        .gte('created_at', thirtyDaysAgo);

      // Score based on active agents and execution frequency
      const activeAgents = configs?.length || 0;
      const executionCount = executions?.length || 0;
      const executionsPerDay = executionCount / 30;

      // Normalize to 0-1 score
      const agentScore = Math.min(1.0, activeAgents / 13); // 13 Squad agents
      const executionScore = Math.min(1.0, executionsPerDay / 100); // 100 execs/day = max

      return (agentScore * 0.5) + (executionScore * 0.5);
    } catch (error) {
      console.error('calculateAgentAdoptionScore error:', error);
      return 0.5; // Default
    }
  }

  /**
   * Calculate percentile rank
   * @private
   */
  async calculatePercentileRank(shopMetrics, startDate, endDate) {
    // Get all shop benchmarks for comparison
    const { data: allBenchmarks } = await supabase
      .from('shop_performance_benchmarks')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (!allBenchmarks || allBenchmarks.length === 0) {
      return {
        revenue_per_ro: 50,
        retention_rate: 50,
        avg_ticket: 50
      };
    }

    // Calculate percentiles
    const revenuePerROValues = allBenchmarks.map(b => b.metrics?.revenue_per_ro || 0).sort((a, b) => a - b);
    const retentionValues = allBenchmarks.map(b => b.retention_rate || 0).sort((a, b) => a - b);
    const avgTicketValues = allBenchmarks.map(b => b.avg_ticket || 0).sort((a, b) => a - b);

    return {
      revenue_per_ro: this.getPercentile(shopMetrics.revenue_per_ro, revenuePerROValues),
      retention_rate: this.getPercentile(shopMetrics.retention_rate, retentionValues),
      avg_ticket: this.getPercentile(shopMetrics.avg_ticket, avgTicketValues)
    };
  }

  /**
   * Get percentile for a value in sorted array
   * @private
   */
  getPercentile(value, sortedArray) {
    if (sortedArray.length === 0) return 50;

    const below = sortedArray.filter(v => v < value).length;
    return Math.round((below / sortedArray.length) * 100);
  }

  /**
   * Compare to average
   * @private
   */
  compareToAverage(value, average) {
    if (average === 0) return 'N/A';
    const diff = ((value - average) / average) * 100;
    return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
  }

  /**
   * Get adoption rank
   * @private
   */
  getAdoptionRank(score) {
    if (score >= 0.9) return 'Top 10%';
    if (score >= 0.75) return 'Top 25%';
    if (score >= 0.5) return 'Average';
    return 'Below Average';
  }

  /**
   * Generate recommendations
   * @private
   */
  generateRecommendations(comparisons) {
    const recommendations = [];

    if (comparisons.revenue_per_ro.percentile >= 75) {
      recommendations.push(`Your revenue per RO is strong (${comparisons.revenue_per_ro.percentile}th percentile)`);
    } else if (comparisons.revenue_per_ro.percentile < 50) {
      recommendations.push(`Opportunity: Revenue per RO improvement (${comparisons.revenue_per_ro.percentile}th percentile). Consider upselling strategies.`);
    }

    if (comparisons.retention_rate.percentile < 50) {
      recommendations.push(`Opportunity: Retention rate improvement (${comparisons.retention_rate.percentile}th percentile). Focus on customer retention campaigns.`);
    }

    if (comparisons.avg_ticket.percentile >= 75) {
      recommendations.push(`Average ticket size is excellent (${comparisons.avg_ticket.percentile}th percentile)`);
    }

    return recommendations;
  }

  /**
   * Store benchmark
   * @param {Object} metrics - Shop metrics
   * @param {Object} comparisons - Comparison data
   */
  async storeBenchmark(metrics, comparisons) {
    const { error } = await supabase
      .from('shop_performance_benchmarks')
      .upsert({
        shop_id: this.shopId,
        date: new Date().toISOString().split('T')[0],
        revenue: metrics.revenue,
        ro_count: metrics.ro_count,
        customer_count: metrics.customer_count,
        avg_ticket: metrics.avg_ticket,
        retention_rate: metrics.retention_rate,
        agent_adoption_score: metrics.agent_adoption_score,
        percentile_rank: comparisons.revenue_per_ro?.percentile || 50,
        metrics: metrics,
        industry_comparison: comparisons
      }, {
        onConflict: 'shop_id,date'
      });

    if (error) {
      console.error('Failed to store benchmark:', error);
    }
  }
}

export default ShopBenchmarking;



















