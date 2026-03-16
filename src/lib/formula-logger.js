/**
 * Formula Logger
 * Logs every formula execution, detects patterns, triggers optimization
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * FormulaLogger class
 */
export class FormulaLogger {
  constructor(shopId = null) {
    this.shopId = shopId;
  }

  /**
   * Log formula execution
   * @param {Object} params - Execution parameters
   * @returns {Promise<string>} Execution ID
   */
  async logExecution(params) {
    try {
      const {
        agentId,
        formulaName,
        formulaType,
        inputData,
        outputValue,
        confidenceScore,
        executionTimeMs,
        success = true,
        errorMessage = null,
        context = {}
      } = params;

      // Insert execution record
      const { data, error } = await supabase
        .from('formula_executions')
        .insert({
          agent_id: agentId,
          formula_name: formulaName,
          formula_type: formulaType,
          input_data: inputData,
          output_value: outputValue,
          confidence_score: confidenceScore,
          execution_time_ms: executionTimeMs,
          success: success,
          error_message: errorMessage,
          context: { ...context, shop_id: this.shopId },
          shop_id: this.shopId
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to log execution: ${error.message}`);
      }

      // Trigger pattern analysis every 10 executions for this formula
      const executionCount = await this.getExecutionCount(formulaName);
      if (executionCount % 10 === 0) {
        // Run pattern analysis asynchronously (don't block)
        this.analyzePatterns(formulaName).catch(err => {
          console.error(`Pattern analysis failed for ${formulaName}:`, err);
        });
      }

      return data.id;
    } catch (error) {
      console.error('FormulaLogger.logExecution error:', error);
      throw error;
    }
  }

  /**
   * Analyze patterns for a formula
   * @param {string} formulaName - Formula name
   * @returns {Promise<Array>} Detected patterns
   */
  async analyzePatterns(formulaName) {
    try {
      const patterns = [];

      // Get recent executions (last 100)
      const { data: executions, error } = await supabase
        .from('formula_executions')
        .select('*')
        .eq('formula_name', formulaName)
        .eq('shop_id', this.shopId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !executions || executions.length < 10) {
        return [];
      }

      // Detect accuracy drift
      const accuracyDrift = await this.detectAccuracyDrift(formulaName, executions);
      if (accuracyDrift) {
        patterns.push(accuracyDrift);
      }

      // Detect timing anomaly
      const timingAnomaly = await this.detectTimingAnomaly(formulaName, executions);
      if (timingAnomaly) {
        patterns.push(timingAnomaly);
      }

      // Detect reliability issue
      const reliabilityIssue = await this.detectReliabilityIssue(formulaName, executions);
      if (reliabilityIssue) {
        patterns.push(reliabilityIssue);
      }

      // Detect input correlation (simplified)
      const inputCorrelation = await this.detectInputCorrelation(formulaName, executions);
      if (inputCorrelation) {
        patterns.push(inputCorrelation);
      }

      // Store detected patterns
      for (const pattern of patterns) {
        await this.storePattern(pattern);
      }

      return patterns;
    } catch (error) {
      console.error('FormulaLogger.analyzePatterns error:', error);
      throw error;
    }
  }

  /**
   * Detect accuracy drift
   * @private
   */
  async detectAccuracyDrift(formulaName, executions) {
    if (executions.length < 20) return null;

    const recent = executions.slice(0, 10);
    const previous = executions.slice(10, 20);

    const recentAvg = recent.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / recent.length;
    const previousAvg = previous.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / previous.length;

    const drift = previousAvg - recentAvg;
    const threshold = 0.15;

    if (drift > threshold) {
      return {
        formula_name: formulaName,
        pattern_type: 'accuracy_drift',
        confidence: Math.min(1.0, drift / threshold * 0.5 + 0.5),
        description: `Confidence dropped from ${previousAvg.toFixed(2)} to ${recentAvg.toFixed(2)} (drift: ${drift.toFixed(2)})`,
        metrics: {
          recent_avg: recentAvg,
          previous_avg: previousAvg,
          drift: drift
        },
        sample_size: recent.length,
        recommendation: 'Review input data quality or retrain model. Consider A/B testing prompt optimization.',
        shop_id: this.shopId
      };
    }

    return null;
  }

  /**
   * Detect timing anomaly
   * @private
   */
  async detectTimingAnomaly(formulaName, executions) {
    if (executions.length < 50) return null;

    const recent = executions.slice(0, 10);
    const historical = executions.slice(10, 50);

    const recentAvg = recent.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / recent.length;
    const historicalAvg = historical.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / historical.length;

    if (historicalAvg > 0 && recentAvg > historicalAvg * 2) {
      return {
        formula_name: formulaName,
        pattern_type: 'timing_anomaly',
        confidence: 0.85,
        description: `Execution time increased from ${historicalAvg.toFixed(0)}ms to ${recentAvg.toFixed(0)}ms (${((recentAvg / historicalAvg - 1) * 100).toFixed(0)}% increase)`,
        metrics: {
          recent_avg_ms: recentAvg,
          historical_avg_ms: historicalAvg,
          increase_percentage: ((recentAvg / historicalAvg - 1) * 100)
        },
        sample_size: recent.length,
        recommendation: 'Optimize algorithm or check database load. Investigate performance bottlenecks.',
        shop_id: this.shopId
      };
    }

    return null;
  }

  /**
   * Detect reliability issue
   * @private
   */
  async detectReliabilityIssue(formulaName, executions) {
    if (executions.length < 50) return null;

    const recent = executions.slice(0, 50);
    const successCount = recent.filter(e => e.success === true).length;
    const successRate = successCount / recent.length;

    if (successRate < 0.95) {
      return {
        formula_name: formulaName,
        pattern_type: 'reliability_issue',
        confidence: 1.0 - successRate,
        description: `Success rate dropped to ${(successRate * 100).toFixed(1)}% (${recent.length - successCount} failures in last 50 executions)`,
        metrics: {
          success_rate: successRate,
          failure_count: recent.length - successCount,
          total_executions: recent.length
        },
        sample_size: recent.length,
        recommendation: 'Add error handling or validate inputs. Review error messages for common patterns.',
        shop_id: this.shopId
      };
    }

    return null;
  }

  /**
   * Detect input correlation (simplified)
   * @private
   */
  async detectInputCorrelation(formulaName, executions) {
    // Simplified: Just note that input correlation analysis would go here
    // In production, this would analyze which input variables correlate most with output
    return null; // Placeholder for future implementation
  }

  /**
   * Store pattern
   * @private
   */
  async storePattern(pattern) {
    try {
      // Check if similar pattern already exists
      const { data: existing } = await supabase
        .from('formula_patterns')
        .select('id')
        .eq('formula_name', pattern.formula_name)
        .eq('pattern_type', pattern.pattern_type)
        .eq('status', 'detected')
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing pattern
        await supabase
          .from('formula_patterns')
          .update({
            confidence: pattern.confidence,
            description: pattern.description,
            metrics: pattern.metrics,
            sample_size: pattern.sample_size,
            recommendation: pattern.recommendation,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing[0].id);
      } else {
        // Create new pattern
        await supabase
          .from('formula_patterns')
          .insert(pattern);
      }

      // Trigger auto-optimization if confidence > 0.85
      if (pattern.confidence > 0.85) {
        await this.triggerAutoOptimization(pattern);
      }
    } catch (error) {
      console.error('Failed to store pattern:', error);
    }
  }

  /**
   * Trigger auto-optimization
   * @private
   */
  async triggerAutoOptimization(pattern) {
    try {
      // Create improvement_history record (links to Task 1's self-improvement loop)
      const { error } = await supabase
        .from('improvement_history')
        .insert({
          trigger_type: 'formula_pattern',
          trigger_description: `${pattern.formula_name}: ${pattern.pattern_type} detected`,
          confidence_score: pattern.confidence,
          detected_at: new Date().toISOString(),
          status: 'detected',
          context: {
            formula_name: pattern.formula_name,
            pattern_type: pattern.pattern_type,
            recommendation: pattern.recommendation,
            metrics: pattern.metrics
          }
        });

      if (error) {
        console.error('Failed to trigger auto-optimization:', error);
      }
    } catch (error) {
      console.error('triggerAutoOptimization error:', error);
    }
  }

  /**
   * Update performance metrics
   * @param {string} formulaName - Formula name
   * @returns {Promise<Object>} Performance metrics
   */
  async updatePerformanceMetrics(formulaName) {
    try {
      // Use database function to calculate metrics
      const { data, error } = await supabase.rpc('calculate_formula_performance', {
        p_formula_name: formulaName,
        p_window_days: 30
      });

      if (error) {
        throw new Error(`Failed to calculate performance: ${error.message}`);
      }

      // Update formula_performance table
      await supabase
        .from('formula_performance')
        .upsert({
          formula_name: formulaName,
          total_executions: data.total_executions,
          success_rate: data.success_rate,
          avg_execution_time_ms: data.avg_execution_time_ms,
          avg_confidence: data.avg_confidence,
          last_execution: data.last_execution,
          trend: data.trend,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'formula_name'
        });

      return data;
    } catch (error) {
      console.error('updatePerformanceMetrics error:', error);
      throw error;
    }
  }

  /**
   * Get execution count for formula
   * @private
   */
  async getExecutionCount(formulaName) {
    const { count, error } = await supabase
      .from('formula_executions')
      .select('*', { count: 'exact', head: true })
      .eq('formula_name', formulaName)
      .eq('shop_id', this.shopId);

    if (error) {
      console.error('Failed to get execution count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get recent executions
   * @param {number} limit - Number of executions to return
   * @returns {Promise<Array>} Recent executions
   */
  async getRecentExecutions(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('formula_executions')
        .select('*')
        .eq('shop_id', this.shopId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get executions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('getRecentExecutions error:', error);
      throw error;
    }
  }

  /**
   * Get detected patterns
   * @param {string} status - Filter by status
   * @returns {Promise<Array>} Patterns
   */
  async getPatterns(status = null) {
    try {
      let query = supabase
        .from('formula_patterns')
        .select('*')
        .eq('shop_id', this.shopId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get patterns: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('getPatterns error:', error);
      throw error;
    }
  }
}

export default FormulaLogger;



















