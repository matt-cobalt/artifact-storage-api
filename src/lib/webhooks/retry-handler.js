/**
 * Webhook Retry Handler
 * Dead letter queue for failed webhooks
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * RetryHandler class
 */
export class RetryHandler {
  /**
   * Process pending retries
   */
  async processRetries() {
    try {
      // Get pending retries
      const { data: retries, error } = await supabase.rpc('get_pending_webhook_retries');

      if (error) {
        throw new Error(`Failed to get retries: ${error.message}`);
      }

      for (const retry of retries || []) {
        await this.attemptRetry(retry);
      }
    } catch (error) {
      console.error('processRetries error:', error);
    }
  }

  /**
   * Attempt webhook retry
   */
  async attemptRetry(webhookFailure) {
    try {
      const { id, webhook_type, payload, attempt_count } = webhookFailure;

      // Calculate next retry delay
      const delay = this.getRetryDelay(attempt_count);

      // Update status to retrying
      await supabase
        .from('webhook_failures')
        .update({
          status: 'retrying',
          attempt_count: attempt_count + 1,
          last_attempt_at: new Date().toISOString(),
          next_retry_at: new Date(Date.now() + delay * 60 * 1000).toISOString()
        })
        .eq('id', id);

      // Attempt webhook delivery
      const success = await this.deliverWebhook(webhook_type, payload);

      if (success) {
        // Mark as resolved
        await supabase
          .from('webhook_failures')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString()
          })
          .eq('id', id);
      } else {
        // Check if max attempts reached
        if (attempt_count >= 5) {
          await supabase
            .from('webhook_failures')
            .update({
              status: 'failed'
            })
            .eq('id', id);

          // Alert team
          await this.alertDeadLetter(webhookFailure);
        }
      }
    } catch (error) {
      console.error('attemptRetry error:', error);
    }
  }

  /**
   * Get retry delay in minutes
   */
  getRetryDelay(attemptCount) {
    const delays = {
      1: 5,      // 5 minutes
      2: 30,     // 30 minutes
      3: 120,    // 2 hours
      4: 720,    // 12 hours
      5: 1440    // 24 hours
    };

    return delays[attemptCount] || 1440;
  }

  /**
   * Deliver webhook
   */
  async deliverWebhook(webhookType, payload) {
    try {
      // Route to appropriate handler
      if (webhookType === 'tekmetric') {
        const { processTekmetricWebhook } = await import('../../lib/tekmetric-integration.js');
        await processTekmetricWebhook(payload);
        return true;
      }

      // Add other webhook types as needed
      return false;
    } catch (error) {
      console.error('deliverWebhook error:', error);
      return false;
    }
  }

  /**
   * Alert team about dead letter
   */
  async alertDeadLetter(webhookFailure) {
    try {
      if (process.env.SLACK_WEBHOOK_URL) {
        const { default: fetch } = await import('node-fetch');
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Webhook Dead Letter Queue`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Webhook failed after 5 attempts*\nType: ${webhookFailure.webhook_type}\nAttempts: ${webhookFailure.attempt_count}`
                }
              }
            ]
          })
        });
      }
    } catch (error) {
      console.error('alertDeadLetter error:', error);
    }
  }

  /**
   * Record webhook failure
   */
  async recordFailure(webhookType, payload, errorMessage, shopId = null) {
    try {
      const { data, error } = await supabase
        .from('webhook_failures')
        .insert({
          webhook_type: webhookType,
          payload: payload,
          attempt_count: 0,
          next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Retry in 5 minutes
          error_message: errorMessage,
          status: 'pending',
          shop_id: shopId
        });

      if (error) {
        console.error('Failed to record webhook failure:', error);
      }
    } catch (error) {
      console.error('recordFailure error:', error);
    }
  }
}

export default RetryHandler;



















