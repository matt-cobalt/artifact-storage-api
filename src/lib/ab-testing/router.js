/**
 * A/B Test Router
 * Selects variants and routes agent executions
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * ABTestRouter class for variant selection and routing
 */
export class ABTestRouter {
  constructor(shopId = null) {
    this.shopId = shopId;
    this.variantCache = new Map(); // Cache user-variant assignments for consistency
  }

  /**
   * Select variant for user (ensures consistency)
   * @param {string} agentId - Agent ID
   * @param {string} userId - User ID (optional, for consistency)
   * @returns {Promise<Object>} Selected variant
   */
  async selectVariant(agentId, userId = null) {
    try {
      // Check if agent has active A/B test
      const { data: activeTest, error: testError } = await supabase.rpc('get_active_ab_test', {
        p_agent_id: agentId,
        p_shop_id: this.shopId
      });

      if (testError || !activeTest || activeTest.length === 0) {
        // No active test, return null (use default prompt)
        return { variant: null, test_id: null };
      }

      const test = activeTest[0];
      const cacheKey = `${agentId}:${userId || 'anonymous'}`;

      // Check cache for consistent assignment
      if (this.variantCache.has(cacheKey)) {
        const cached = this.variantCache.get(cacheKey);
        if (cached.test_id === test.id) {
          return cached;
        }
      }

      // Determine variant based on traffic split and user ID
      let variantId;
      let variantLabel;

      if (userId) {
        // Consistent assignment based on user ID hash
        const hash = crypto.createHash('md5').update(`${test.id}:${userId}`).digest('hex');
        const hashValue = parseInt(hash.substring(0, 8), 16) % 100;
        const threshold = test.traffic_split * 100;

        if (hashValue < threshold) {
          variantId = test.variant_a_id;
          variantLabel = 'A';
        } else {
          variantId = test.variant_b_id;
          variantLabel = 'B';
        }
      } else {
        // Random assignment
        const random = Math.random();
        if (random < test.traffic_split) {
          variantId = test.variant_a_id;
          variantLabel = 'A';
        } else {
          variantId = test.variant_b_id;
          variantLabel = 'B';
        }
      }

      // Get variant details
      const { data: variant, error: variantError } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('id', variantId)
        .single();

      if (variantError || !variant) {
        throw new Error(`Variant not found: ${variantId}`);
      }

      // Cache assignment
      this.variantCache.set(cacheKey, {
        variant: variant,
        variant_label: variantLabel,
        test_id: test.id
      });

      return {
        variant: variant,
        variant_label: variantLabel,
        test_id: test.id
      };
    } catch (error) {
      console.error('ABTestRouter.selectVariant error:', error);
      // On error, return null to use default prompt
      return { variant: null, test_id: null };
    }
  }

  /**
   * Log test result
   * @param {string} testId - Test ID
   * @param {string} variantId - Variant ID
   * @param {Object} result - Execution result
   */
  async logResult(testId, variantId, result) {
    try {
      const { error } = await supabase
        .from('ab_test_results')
        .insert({
          test_id: testId,
          variant_id: variantId,
          execution_id: result.execution_id || null,
          user_id: result.user_id || null,
          success: result.success !== false, // Default to true if not specified
          confidence_score: result.confidence_score || null,
          response_time_ms: result.response_time_ms || null,
          user_satisfaction: result.user_satisfaction || null,
          context: result.context || {},
          shop_id: this.shopId
        });

      if (error) {
        console.error('Failed to log A/B test result:', error);
      }
    } catch (error) {
      console.error('ABTestRouter.logResult error:', error);
    }
  }

  /**
   * Route execution with variant selection
   * @param {string} agentId - Agent ID
   * @param {Function} executeFn - Agent execution function
   * @param {Object} input - Agent input
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result
   */
  async routeExecution(agentId, executeFn, input, context = {}) {
    const startTime = Date.now();

    try {
      // Select variant
      const variantSelection = await this.selectVariant(agentId, context.user_id);

      // Execute with variant (or default if no test)
      let executionResult;
      
      if (variantSelection.variant) {
        // Override system prompt with variant
        const originalSystemPrompt = context.systemPrompt;
        context.systemPrompt = variantSelection.variant.system_prompt;
        context.temperature = variantSelection.variant.temperature;
        context.maxTokens = variantSelection.variant.max_tokens;

        executionResult = await executeFn(input, context);

        // Restore original prompt
        context.systemPrompt = originalSystemPrompt;
      } else {
        // No A/B test, execute normally
        executionResult = await executeFn(input, context);
      }

      const responseTime = Date.now() - startTime;

      // Log result if in A/B test
      if (variantSelection.variant && variantSelection.test_id) {
        await this.logResult(variantSelection.test_id, variantSelection.variant.id, {
          execution_id: executionResult.artifact_id || null,
          user_id: context.user_id || null,
          success: executionResult.success !== false,
          confidence_score: executionResult.confidence_score || null,
          response_time_ms: responseTime,
          user_satisfaction: executionResult.user_satisfaction || null,
          context: {
            agent_id: agentId,
            input_keys: Object.keys(input || {})
          }
        });
      }

      return {
        ...executionResult,
        ab_test: variantSelection.variant ? {
          test_id: variantSelection.test_id,
          variant_label: variantSelection.variant_label
        } : null
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log failure if in A/B test
      if (variantSelection?.variant && variantSelection?.test_id) {
        await this.logResult(variantSelection.test_id, variantSelection.variant.id, {
          success: false,
          response_time_ms: responseTime,
          context: { error: error.message }
        });
      }

      throw error;
    }
  }
}

/**
 * Create A/B test router instance
 */
export function createABTestRouter(shopId = null) {
  return new ABTestRouter(shopId);
}

export default ABTestRouter;



















