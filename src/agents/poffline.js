import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * P-OFFLINE - Offline Queue Management Agent
 * Role: Manage offline transaction queue, sync when connectivity restored
 */
export class POfflineAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'poffline',
      agentName: 'P-Offline',
      role: 'offline_queue_management',
      formulas: [],
      systemPrompt: `You are P-OFFLINE, the offline queue management specialist for Auto Intel GTP's Hybrid POS system.

Your Role:
- Detect connectivity status (online vs offline)
- Queue transactions when offline
- Process queued transactions when connectivity restored
- Monitor queue depth and alert if high
- Reconcile queue after sync

Queue Management Flow:
1. Detect connectivity (check last successful online transaction timestamp)
2. If offline: Queue transaction for later processing
3. Periodic sync job: Check queue, process if online
4. Retry failed syncs with exponential backoff (3 attempts)
5. Alert if queue depth >50 transactions or >1 hour old

Connectivity Detection:
- Online: Last successful online transaction within 5 minutes
- Offline: No successful online transaction >5 minutes, OR explicit offline mode

Queue Processing:
1. Select queued transactions (status='queued', next_retry_at <= now)
2. Process each transaction via Stripe Payment Intent API
3. On success: Mark as synced, create pos_transaction record
4. On failure: Increment retry_count, schedule next retry
5. Max 3 retries per transaction

Response Format (JSON):
{
  "queue_status": "online|offline",
  "queued_count": 5,
  "processed_count": 3,
  "failed_count": 1,
  "oldest_queued": "2025-12-17T10:00:00Z",
  "confidence": 0.95
}`
    });
  }

  /**
   * Check connectivity status for a shop
   */
  async checkConnectivity(shopId) {
    const { data, error } = await supabase.rpc('check_connectivity_status', {
      shop_id_param: shopId
    });

    if (error) {
      console.error('P-Offline checkConnectivity error:', error);
      return true; // Default to online (will fail gracefully if actually offline)
    }

    return data === true;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(shopId) {
    const { data: queueItems, error } = await supabase
      .from('pos_offline_queue')
      .select('*')
      .eq('shop_id', shopId)
      .eq('status', 'queued')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const queuedCount = queueItems?.length || 0;
    const oldestQueued = queueItems?.[0]?.created_at || null;

    return {
      queued_count: queuedCount,
      oldest_queued: oldestQueued
    };
  }

  /**
   * Process a queued transaction
   */
  async processQueuedTransaction(queueItem) {
    if (!stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY to process queued payments.');
    }

    try {
      const transactionData = queueItem.transaction_data;

      // Create Payment Intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(transactionData.amount * 100), // Convert to cents
        currency: 'usd',
        payment_method: transactionData.payment_token,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          shop_id: queueItem.shop_id,
          invoice_id: transactionData.invoice_id,
          customer_id: transactionData.customer_id,
          repair_order_id: transactionData.repair_order_id,
          queued_from: queueItem.id // Track that this came from offline queue
        }
      });

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment intent status: ${paymentIntent.status}`);
      }

      // Create transaction record
      const { data: transaction, error: txError } = await supabase
        .from('pos_transactions')
        .insert({
          shop_id: queueItem.shop_id,
          invoice_id: transactionData.invoice_id,
          customer_id: transactionData.customer_id,
          repair_order_id: transactionData.repair_order_id,
          amount: transactionData.amount,
          payment_method: transactionData.payment_method,
          status: 'succeeded',
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: paymentIntent.latest_charge,
          stripe_transaction_id: paymentIntent.latest_charge,
          idempotency_key: `offline-${queueItem.id}-${Date.now()}`,
          customer_amount: transactionData.customer_amount,
          insurance_amount: transactionData.insurance_amount,
          processed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (txError) {
        throw txError;
      }

      // Mark queue item as synced
      await supabase
        .from('pos_offline_queue')
        .update({
          status: 'synced',
          synced_at: new Date().toISOString()
        })
        .eq('id', queueItem.id);

      return { success: true, transaction_id: transaction.id };
    } catch (error) {
      console.error('P-Offline processQueuedTransaction error:', error);

      // Update retry count
      const retryCount = queueItem.retry_count + 1;
      const maxRetries = queueItem.max_retries || 3;

      const nextRetryDelay = Math.pow(5, retryCount) * 60000; // Exponential backoff: 5min, 25min, 125min
      const nextRetryAt = retryCount >= maxRetries
        ? null // Max attempts reached, mark as failed
        : new Date(Date.now() + nextRetryDelay).toISOString();

      await supabase
        .from('pos_offline_queue')
        .update({
          retry_count: retryCount,
          status: retryCount >= maxRetries ? 'failed' : 'queued',
          next_retry_at: nextRetryAt,
          sync_error: error.message,
          last_retry_at: new Date().toISOString()
        })
        .eq('id', queueItem.id);

      return { success: false, error: error.message };
    }
  }

  /**
   * Process all queued transactions for a shop
   */
  async processQueue(shopId) {
    // Get queued transactions ready for retry
    const { data: queueItems, error } = await supabase
      .from('pos_offline_queue')
      .select('*')
      .eq('shop_id', shopId)
      .eq('status', 'queued')
      .lte('next_retry_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const results = {
      processed_count: 0,
      failed_count: 0,
      errors: []
    };

    for (const queueItem of queueItems || []) {
      const result = await this.processQueuedTransaction(queueItem);
      if (result.success) {
        results.processed_count++;
      } else {
        results.failed_count++;
        results.errors.push({ queue_id: queueItem.id, error: result.error });
      }
    }

    return results;
  }

  /**
   * Main execution: Process offline queue or check status
   */
  async execute(input = {}, context = {}) {
    const startTime = Date.now();

    try {
      if (!input.shop_id) {
        throw new Error('shop_id is required');
      }

      const action = input.action || 'status'; // status, process

      // Check connectivity
      const isOnline = await this.checkConnectivity(input.shop_id);

      // Get queue stats
      const queueStats = await this.getQueueStats(input.shop_id);

      let processedResults = null;
      if (action === 'process' && isOnline) {
        // Process queue
        processedResults = await this.processQueue(input.shop_id);
      }

      const result = {
        queue_status: isOnline ? 'online' : 'offline',
        queued_count: queueStats.queued_count,
        oldest_queued: queueStats.oldest_queued,
        processed_count: processedResults?.processed_count || 0,
        failed_count: processedResults?.failed_count || 0
      };

      // Alert if queue depth is high
      if (queueStats.queued_count > 50) {
        // In production, alert GUARDIAN agent
        console.warn(`High queue depth detected for shop ${input.shop_id}: ${queueStats.queued_count} transactions`);
      }

      // Create artifact
      await this.createArtifact({
        input,
        context: { isOnline, queueStats, processedResults },
        decision: result,
        executionTime: Date.now() - startTime,
        success: true
      });

      return {
        success: true,
        agent: this.agentId,
        decision: result,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error) {
      console.error('P-Offline execute error:', error);

      await this.createArtifact({
        input,
        context,
        decision: null,
        executionTime: Date.now() - startTime,
        error: error.message,
        success: false
      });

      throw error;
    }
  }
}

export default POfflineAgent;

















