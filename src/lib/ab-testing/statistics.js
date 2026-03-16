/**
 * Statistical Significance Calculator
 * Calculates p-values, confidence intervals, and determines winners
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Calculate success rate for a variant
 * @param {string} variantId - Variant ID
 * @returns {Promise<number>} Success rate (0-1)
 */
export async function calculateSuccessRate(variantId) {
  try {
    const { data, error } = await supabase
      .from('ab_test_results')
      .select('success')
      .eq('variant_id', variantId);

    if (error || !data || data.length === 0) {
      return 0;
    }

    const successCount = data.filter(r => r.success === true).length;
    return successCount / data.length;
  } catch (error) {
    console.error('calculateSuccessRate error:', error);
    return 0;
  }
}

/**
 * Calculate p-value using two-proportion z-test
 * @param {Object} variantA - Variant A statistics { sample_size, success_count }
 * @param {Object} variantB - Variant B statistics { sample_size, success_count }
 * @returns {number} P-value (0-1)
 */
export function calculatePValue(variantA, variantB) {
  const n1 = variantA.sample_size || 0;
  const x1 = variantA.success_count || 0;
  const n2 = variantB.sample_size || 0;
  const x2 = variantB.success_count || 0;

  if (n1 === 0 || n2 === 0) {
    return 1.0; // Cannot calculate if no samples
  }

  const p1 = x1 / n1;
  const p2 = x2 / n2;

  // Pooled proportion
  const pPool = (x1 + x2) / (n1 + n2);
  const qPool = 1 - pPool;

  // Standard error
  const se = Math.sqrt(pPool * qPool * (1 / n1 + 1 / n2));

  if (se === 0) {
    return 1.0; // No variance, cannot determine significance
  }

  // Z-score
  const z = (p1 - p2) / se;

  // Two-tailed p-value using normal approximation
  // Simplified calculation (would use proper statistical library in production)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  return Math.max(0, Math.min(1, pValue));
}

/**
 * Calculate 95% confidence interval for success rate
 * @param {number} successRate - Success rate (0-1)
 * @param {number} sampleSize - Sample size
 * @returns {Object} { lower, upper }
 */
export function calculateConfidenceInterval(successRate, sampleSize) {
  if (sampleSize === 0) {
    return { lower: 0, upper: 1 };
  }

  // Z-score for 95% confidence
  const z = 1.96;

  // Standard error
  const se = Math.sqrt((successRate * (1 - successRate)) / sampleSize);

  // Margin of error
  const margin = z * se;

  return {
    lower: Math.max(0, successRate - margin),
    upper: Math.min(1, successRate + margin)
  };
}

/**
 * Determine winner of A/B test
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} Winner determination result
 */
export async function determineWinner(testId) {
  try {
    // Get test details
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      throw new Error(`Test not found: ${testId}`);
    }

    // Get statistics for both variants
    const { data: stats, error: statsError } = await supabase
      .from('ab_test_statistics')
      .select('*')
      .eq('test_id', testId)
      .in('variant_id', [test.variant_a_id, test.variant_b_id]);

    if (statsError || !stats || stats.length !== 2) {
      return {
        has_winner: false,
        reason: 'Insufficient statistics'
      };
    }

    const variantAStats = stats.find(s => s.variant_id === test.variant_a_id);
    const variantBStats = stats.find(s => s.variant_id === test.variant_b_id);

    // Check minimum sample size
    const minSampleSize = test.minimum_sample_size || 100;
    if (variantAStats.sample_size < minSampleSize || variantBStats.sample_size < minSampleSize) {
      return {
        has_winner: false,
        reason: `Sample size too small (need ${minSampleSize}, have ${variantAStats.sample_size}/${variantBStats.sample_size})`
      };
    }

    // Check minimum duration
    const minDurationDays = test.minimum_duration_days || 7;
    const testDuration = (Date.now() - new Date(test.start_date).getTime()) / (1000 * 60 * 60 * 24);
    if (testDuration < minDurationDays) {
      return {
        has_winner: false,
        reason: `Test duration too short (need ${minDurationDays} days, have ${testDuration.toFixed(1)} days)`
      };
    }

    // Calculate p-value
    const pValue = calculatePValue(variantAStats, variantBStats);

    // Check significance threshold (default 0.05 for 95% confidence)
    const significanceThreshold = 1 - (test.significance_threshold || 0.95);
    if (pValue > significanceThreshold) {
      return {
        has_winner: false,
        reason: `Not statistically significant (p-value: ${pValue.toFixed(4)}, threshold: ${significanceThreshold})`,
        p_value: pValue
      };
    }

    // Determine winner based on success rate
    const improvementPercent = Math.abs(
      ((variantBStats.success_rate - variantAStats.success_rate) / variantAStats.success_rate) * 100
    );

    // Check minimum improvement
    const minImprovement = test.minimum_improvement_percent || 5.0;
    if (improvementPercent < minImprovement) {
      return {
        has_winner: false,
        reason: `Improvement too small (${improvementPercent.toFixed(2)}%, need ${minImprovement}%)`,
        p_value: pValue,
        improvement_percent: improvementPercent
      };
    }

    // Declare winner
    const winnerVariantId = variantBStats.success_rate > variantAStats.success_rate
      ? test.variant_b_id
      : test.variant_a_id;

    // Calculate confidence intervals
    const ciA = calculateConfidenceInterval(variantAStats.success_rate, variantAStats.sample_size);
    const ciB = calculateConfidenceInterval(variantBStats.success_rate, variantBStats.sample_size);

    return {
      has_winner: true,
      winner_variant_id: winnerVariantId,
      winner_label: winnerVariantId === test.variant_b_id ? 'B' : 'A',
      p_value: pValue,
      improvement_percent: improvementPercent,
      variant_a: {
        variant_id: test.variant_a_id,
        success_rate: variantAStats.success_rate,
        sample_size: variantAStats.sample_size,
        confidence_interval: ciA
      },
      variant_b: {
        variant_id: test.variant_b_id,
        success_rate: variantBStats.success_rate,
        sample_size: variantBStats.sample_size,
        confidence_interval: ciB
      }
    };
  } catch (error) {
    console.error('determineWinner error:', error);
    return {
      has_winner: false,
      error: error.message
    };
  }
}

/**
 * Normal CDF approximation (standard normal distribution)
 * @private
 */
function normalCDF(z) {
  // Abramowitz and Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  
  if (z > 0) {
    return 1 - p;
  } else {
    return p;
  }
}

/**
 * Get test statistics
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} Test statistics
 */
export async function getTestStatistics(testId) {
  try {
    const { data: stats, error } = await supabase
      .from('ab_test_statistics')
      .select('*')
      .eq('test_id', testId);

    if (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }

    return stats || [];
  } catch (error) {
    console.error('getTestStatistics error:', error);
    throw error;
  }
}

export default {
  calculateSuccessRate,
  calculatePValue,
  calculateConfidenceInterval,
  determineWinner,
  getTestStatistics
};



















