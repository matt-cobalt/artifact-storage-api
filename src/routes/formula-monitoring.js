/**
 * Formula Monitoring API Routes
 * Real-time feed, performance stats, pattern detection
 */

import 'dotenv/config';
import FormulaLogger from '../lib/formula-logger.js';

/**
 * Get formula execution feed
 */
export async function getFormulaFeed(shopId, limit = 20) {
  try {
    const logger = new FormulaLogger(shopId);
    return await logger.getRecentExecutions(limit);
  } catch (error) {
    console.error('getFormulaFeed error:', error);
    throw error;
  }
}

/**
 * Get formula performance stats
 */
export async function getFormulaPerformance(shopId, formulaName = null) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    let query = supabase
      .from('formula_performance')
      .select('*')
      .order('total_executions', { ascending: false });

    if (formulaName) {
      query = query.eq('formula_name', formulaName);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get performance: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getFormulaPerformance error:', error);
    throw error;
  }
}

/**
 * Get detected patterns
 */
export async function getPatterns(shopId, status = null) {
  try {
    const logger = new FormulaLogger(shopId);
    return await logger.getPatterns(status);
  } catch (error) {
    console.error('getPatterns error:', error);
    throw error;
  }
}

/**
 * Get formula history (time-series)
 */
export async function getFormulaHistory(shopId, formulaName, days = 30) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('formula_executions')
      .select('*')
      .eq('formula_name', formulaName)
      .eq('shop_id', shopId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get history: ${error.message}`);
    }

    // Aggregate by day for time-series
    const dailyData = {};
    for (const exec of data || []) {
      const date = exec.created_at.split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          executions: 0,
          success_count: 0,
          avg_confidence: 0,
          avg_execution_time: 0,
          confidences: [],
          execution_times: []
        };
      }

      dailyData[date].executions++;
      if (exec.success) {
        dailyData[date].success_count++;
      }
      if (exec.confidence_score) {
        dailyData[date].confidences.push(exec.confidence_score);
      }
      if (exec.execution_time_ms) {
        dailyData[date].execution_times.push(exec.execution_time_ms);
      }
    }

    // Calculate averages
    const timeSeries = Object.values(dailyData).map(day => ({
      date: day.date,
      executions: day.executions,
      success_rate: day.executions > 0 ? day.success_count / day.executions : 0,
      avg_confidence: day.confidences.length > 0
        ? day.confidences.reduce((a, b) => a + b, 0) / day.confidences.length
        : null,
      avg_execution_time_ms: day.execution_times.length > 0
        ? day.execution_times.reduce((a, b) => a + b, 0) / day.execution_times.length
        : null
    }));

    return timeSeries;
  } catch (error) {
    console.error('getFormulaHistory error:', error);
    throw error;
  }
}

export default {
  getFormulaFeed,
  getFormulaPerformance,
  getPatterns,
  getFormulaHistory
};



















