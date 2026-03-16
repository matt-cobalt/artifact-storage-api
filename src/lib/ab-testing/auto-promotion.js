/**
 * Auto-Promotion System
 * Automatically promotes winning variants when statistical significance is reached
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { determineWinner } from './statistics.js';
import * as Alerting from '../alerting.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Process auto-promotion for all running A/B tests
 * Should be run as scheduled job (every 6 hours)
 */
export async function processAutoPromotion() {
  try {
    // Get all running A/B tests
    const { data: runningTests, error: testsError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('status', 'running');

    if (testsError) {
      throw new Error(`Failed to get running tests: ${testsError.message}`);
    }

    if (!runningTests || runningTests.length === 0) {
      return {
        processed: 0,
        promoted: 0,
        message: 'No running tests to process'
      };
    }

    let promotedCount = 0;
    const results = [];

    for (const test of runningTests) {
      try {
        // Determine winner
        const winnerResult = await determineWinner(test.id);

        if (winnerResult.has_winner) {
          // Promote winner
          await promoteWinner(test, winnerResult);

          promotedCount++;

          results.push({
            test_id: test.id,
            test_name: test.test_name,
            winner: winnerResult.winner_label,
            improvement: winnerResult.improvement_percent
          });

          // Alert team
          await Alerting.sendAlert(
            Alerting.ALERT_LEVELS.INFO,
            'A/B Test Winner Promoted',
            `Test "${test.test_name}" completed. Variant ${winnerResult.winner_label} won with ${winnerResult.improvement_percent.toFixed(2)}% improvement.`,
            {
              test_id: test.id,
              winner_variant_id: winnerResult.winner_variant_id,
              p_value: winnerResult.p_value,
              improvement_percent: winnerResult.improvement_percent
            }
          );

          // Log to improvement_history (if table exists)
          await logToImprovementHistory(test, winnerResult);
        }
      } catch (error) {
        console.error(`Error processing test ${test.id}:`, error);
        results.push({
          test_id: test.id,
          test_name: test.test_name,
          error: error.message
        });
      }
    }

    return {
      processed: runningTests.length,
      promoted: promotedCount,
      results
    };
  } catch (error) {
    console.error('processAutoPromotion error:', error);
    throw error;
  }
}

/**
 * Promote winning variant
 * @private
 */
async function promoteWinner(test, winnerResult) {
  try {
    // Mark test as completed
    await supabase
      .from('ab_tests')
      .update({
        status: 'completed',
        winner_variant_id: winnerResult.winner_variant_id,
        end_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', test.id);

    // Update winning variant status
    await supabase
      .from('prompt_versions')
      .update({
        status: 'winning'
      })
      .eq('id', winnerResult.winner_variant_id);

    // Retire losing variant
    const losingVariantId = winnerResult.winner_variant_id === test.variant_b_id
      ? test.variant_a_id
      : test.variant_b_id;

    await supabase
      .from('prompt_versions')
      .update({
        status: 'retired'
      })
      .eq('id', losingVariantId);

    // Update p-value and confidence intervals in statistics
    await supabase
      .from('ab_test_statistics')
      .update({
        p_value: winnerResult.p_value,
        confidence_interval_lower: winnerResult.variant_a.confidence_interval.lower,
        confidence_interval_upper: winnerResult.variant_b.confidence_interval.upper,
        updated_at: new Date().toISOString()
      })
      .eq('test_id', test.id);
  } catch (error) {
    console.error('promoteWinner error:', error);
    throw error;
  }
}

/**
 * Log to improvement_history table
 * @private
 */
async function logToImprovementHistory(test, winnerResult) {
  try {
    // Check if improvement_history table exists (from Task 1)
    // Would use ArtifactStorage if available
    const { error } = await supabase
      .from('improvement_history')
      .insert({
        trigger_type: 'ab_test_winner',
        agent_id: test.agent_id,
        description: `A/B test "${test.test_name}" completed. Variant ${winnerResult.winner_label} won with ${winnerResult.improvement_percent.toFixed(2)}% improvement (p-value: ${winnerResult.p_value.toFixed(4)})`,
        impact_score: winnerResult.improvement_percent,
        status: 'approved',
        metadata: {
          test_id: test.id,
          test_name: test.test_name,
          winner_variant_id: winnerResult.winner_variant_id,
          p_value: winnerResult.p_value,
          improvement_percent: winnerResult.improvement_percent
        }
      })
      .single();

    if (error && !error.message.includes('does not exist')) {
      console.error('Failed to log to improvement_history:', error);
    }
  } catch (error) {
    // Table might not exist, that's okay
    console.log('improvement_history table not available');
  }
}

/**
 * Safety check: Pause test if error rate too high
 */
export async function checkTestSafety(testId) {
  try {
    const { data: test } = await supabase
      .from('ab_tests')
      .select('variant_a_id, variant_b_id')
      .eq('id', testId)
      .single();

    if (!test) return;

    // Check error rate for both variants
    for (const variantId of [test.variant_a_id, test.variant_b_id]) {
      const { data: results } = await supabase
        .from('ab_test_results')
        .select('success')
        .eq('variant_id', variantId)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (results && results.length >= 10) {
        const errorRate = results.filter(r => !r.success).length / results.length;

        if (errorRate > 0.10) { // 10% error rate
          // Pause test
          await supabase
            .from('ab_tests')
            .update({ status: 'paused' })
            .eq('id', testId);

          await Alerting.sendAlert(
            Alerting.ALERT_LEVELS.WARNING,
            'A/B Test Paused - High Error Rate',
            `Test ${testId} paused due to ${(errorRate * 100).toFixed(2)}% error rate on variant ${variantId}`,
            { test_id: testId, variant_id: variantId, error_rate: errorRate }
          );
        }
      }
    }
  } catch (error) {
    console.error('checkTestSafety error:', error);
  }
}

export default {
  processAutoPromotion,
  checkTestSafety
};



















