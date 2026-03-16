/**
 * Parallel Executor - Execute multiple agent tasks concurrently
 * Handles timeouts, partial success, and error recovery
 */

/**
 * ParallelExecutor class for concurrent agent execution
 */
export class ParallelExecutor {
  constructor(options = {}) {
    this.defaultTimeout = options.defaultTimeout || 30000; // 30 seconds
    this.maxConcurrent = options.maxConcurrent || 10; // Max concurrent executions
  }

  /**
   * Execute multiple steps in parallel
   * @param {Array} steps - Array of step objects to execute
   * @param {Function} executeStep - Function to execute a single step (step) => Promise
   * @returns {Promise<Object>} Results with successful and failed executions
   */
  async executeParallel(steps, executeStep) {
    if (!Array.isArray(steps) || steps.length === 0) {
      return { successful: [], failed: [] };
    }

    // Limit concurrency
    const batches = this.createBatches(steps, this.maxConcurrent);
    const allResults = { successful: [], failed: [] };

    for (const batch of batches) {
      const batchPromises = batch.map(async (step) => {
        try {
          const result = await this.executeWithTimeout(
            () => executeStep(step),
            this.defaultTimeout,
            step
          );
          return { success: true, step, result };
        } catch (error) {
          return { success: false, step, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const value = result.value;
          if (value.success) {
            allResults.successful.push(value);
          } else {
            allResults.failed.push(value);
          }
        } else {
          allResults.failed.push({
            step: null,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
    }

    return allResults;
  }

  /**
   * Execute with timeout
   * @private
   */
  async executeWithTimeout(promiseFn, timeoutMs, step) {
    return Promise.race([
      promiseFn(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Step ${step?.id || 'unknown'} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  /**
   * Create batches for controlled concurrency
   * @private
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Execute with retry logic
   * @param {Function} executeFn - Function to execute
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} retryDelay - Delay between retries (ms)
   * @returns {Promise} Execution result
   */
  async executeWithRetry(executeFn, maxRetries = 2, retryDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await executeFn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Handle partial success (some agents succeed, others fail)
   * @param {Object} results - Results from executeParallel
   * @param {Object} options - Options for handling partial success
   * @returns {Object} Handled results
   */
  handlePartialSuccess(results, options = {}) {
    const {
      failOnAnyFailure = false,
      minSuccessRate = 0.5,
      allowDegradedResult = true
    } = options;

    const totalSteps = results.successful.length + results.failed.length;
    const successRate = totalSteps > 0 ? results.successful.length / totalSteps : 0;

    // Fail if any failure and failOnAnyFailure is true
    if (failOnAnyFailure && results.failed.length > 0) {
      throw new Error(`Execution failed: ${results.failed.length} steps failed`);
    }

    // Fail if success rate below threshold
    if (successRate < minSuccessRate) {
      throw new Error(`Success rate ${successRate} below threshold ${minSuccessRate}`);
    }

    // Return results (degraded if some failed, but above threshold)
    return {
      successful: results.successful,
      failed: results.failed,
      successRate,
      degraded: results.failed.length > 0 && allowDegradedResult
    };
  }
}

export default ParallelExecutor;



















