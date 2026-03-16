/**
 * A/B Testing API Routes
 * Manage A/B tests, view results, create tests
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { determineWinner } from '../lib/ab-testing/statistics.js';
import * as AutoPromotion from '../lib/ab-testing/auto-promotion.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get all A/B tests
 */
export async function getAllTests(shopId = null, status = null) {
  try {
    let query = supabase
      .from('ab_tests')
      .select(`
        *,
        variant_a:prompt_versions!ab_tests_variant_a_id_fkey(id, version_name, status),
        variant_b:prompt_versions!ab_tests_variant_b_id_fkey(id, version_name, status)
      `)
      .order('created_at', { ascending: false });

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get tests: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getAllTests error:', error);
    throw error;
  }
}

/**
 * Get test details with statistics
 */
export async function getTestDetails(testId) {
  try {
    // Get test
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select(`
        *,
        variant_a:prompt_versions!ab_tests_variant_a_id_fkey(*),
        variant_b:prompt_versions!ab_tests_variant_b_id_fkey(*)
      `)
      .eq('id', testId)
      .single();

    if (testError || !test) {
      throw new Error(`Test not found: ${testError?.message || 'Unknown error'}`);
    }

    // Get statistics
    const { data: stats, error: statsError } = await supabase
      .from('ab_test_statistics')
      .select('*')
      .eq('test_id', testId);

    if (statsError) {
      console.error('Failed to get statistics:', statsError);
    }

    // Determine winner (if applicable)
    const winnerResult = await determineWinner(testId);

    return {
      test,
      statistics: stats || [],
      winner_analysis: winnerResult
    };
  } catch (error) {
    console.error('getTestDetails error:', error);
    throw error;
  }
}

/**
 * Get test results (time-series)
 */
export async function getTestResults(testId, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('ab_test_results')
      .select(`
        *,
        variant:prompt_versions(id, version_name)
      `)
      .eq('test_id', testId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get results: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getTestResults error:', error);
    throw error;
  }
}

/**
 * Create new A/B test
 */
export async function createTest(testData) {
  try {
    const {
      agent_id,
      shop_id,
      test_name,
      hypothesis,
      variant_a,
      variant_b,
      traffic_split = 0.5,
      minimum_sample_size = 100,
      minimum_improvement_percent = 5.0,
      minimum_duration_days = 7
    } = testData;

    if (!agent_id || !test_name || !variant_a || !variant_b) {
      throw new Error('Missing required fields: agent_id, test_name, variant_a, variant_b');
    }

    // Create variant A
    const { data: variantAData, error: variantAError } = await supabase
      .from('prompt_versions')
      .insert({
        agent_id,
        shop_id,
        version_name: variant_a.version_name || 'variant_a',
        system_prompt: variant_a.system_prompt,
        temperature: variant_a.temperature || 0.7,
        max_tokens: variant_a.max_tokens || 4000,
        status: 'testing',
        created_by: variant_a.created_by || 'system'
      })
      .select()
      .single();

    if (variantAError) {
      throw new Error(`Failed to create variant A: ${variantAError.message}`);
    }

    // Create variant B
    const { data: variantBData, error: variantBError } = await supabase
      .from('prompt_versions')
      .insert({
        agent_id,
        shop_id,
        version_name: variant_b.version_name || 'variant_b',
        system_prompt: variant_b.system_prompt,
        temperature: variant_b.temperature || 0.7,
        max_tokens: variant_b.max_tokens || 4000,
        status: 'testing',
        created_by: variant_b.created_by || 'system'
      })
      .select()
      .single();

    if (variantBError) {
      throw new Error(`Failed to create variant B: ${variantBError.message}`);
    }

    // Create test
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .insert({
        agent_id,
        shop_id,
        test_name,
        hypothesis,
        variant_a_id: variantAData.id,
        variant_b_id: variantBData.id,
        traffic_split,
        minimum_sample_size,
        minimum_improvement_percent,
        minimum_duration_days,
        status: 'running'
      })
      .select()
      .single();

    if (testError) {
      throw new Error(`Failed to create test: ${testError.message}`);
    }

    return test;
  } catch (error) {
    console.error('createTest error:', error);
    throw error;
  }
}

/**
 * Stop test and promote winner
 */
export async function stopTest(testId, promoteWinner = true) {
  try {
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      throw new Error(`Test not found: ${testError?.message || 'Unknown error'}`);
    }

    if (promoteWinner) {
      // Determine winner
      const winnerResult = await determineWinner(testId);

      if (winnerResult.has_winner) {
        // Promote winner
        await AutoPromotion.processAutoPromotion();

        return {
          success: true,
          winner: winnerResult.winner_variant_id,
          message: 'Test stopped and winner promoted'
        };
      } else {
        // No clear winner, just stop test
        await supabase
          .from('ab_tests')
          .update({
            status: 'completed',
            end_date: new Date().toISOString()
          })
          .eq('id', testId);

        return {
          success: true,
          winner: null,
          message: 'Test stopped but no clear winner',
          reason: winnerResult.reason
        };
      }
    } else {
      // Just stop without promoting
      await supabase
        .from('ab_tests')
        .update({
          status: 'completed',
          end_date: new Date().toISOString()
        })
        .eq('id', testId);

      return {
        success: true,
        message: 'Test stopped'
      };
    }
  } catch (error) {
    console.error('stopTest error:', error);
    throw error;
  }
}

export default {
  getAllTests,
  getTestDetails,
  getTestResults,
  createTest,
  stopTest
};



















