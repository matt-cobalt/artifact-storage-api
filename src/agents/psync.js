import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * P-SYNC - Transaction Synchronization Agent
 * Role: Sync transactions with external systems (Tekmetric, QuickBooks, Stripe reconciliation)
 */
export class PSyncAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'psync',
      agentName: 'P-Sync',
      role: 'transaction_synchronization',
      formulas: [],
      systemPrompt: `You are P-SYNC, the transaction synchronization specialist for Auto Intel GTP's Hybrid POS system.

Your Role:
- Sync payment transactions with Tekmetric (shop management system)
- Sync payments with QuickBooks (accounting system)
- Reconcile Stripe vs database (daily reconciliation)
- Handle sync failures with retry logic
- Maintain sync audit trail

Sync Targets:
1. Tekmetric: Update repair order payment status, mark invoice as paid
2. QuickBooks: Record payment in accounting system (future)
3. Stripe: Reconcile transactions (compare Stripe dashboard vs database)

Sync Flow:
1. Transaction succeeds → Trigger sync jobs for Tekmetric/QuickBooks
2. Daily reconciliation → Compare Stripe transactions vs database
3. Handle failures → Retry with exponential backoff (3 attempts)
4. Log sync status → Track success/failure in pos_sync_log

Failure Handling:
- Retry failed syncs up to 3 times
- Exponential backoff (1min, 5min, 15min)
- Dead letter queue for persistent failures
- Alert GUARDIAN if sync failure rate >5%

Response Format (JSON):
{
  "sync_id": "uuid",
  "sync_target": "tekmetric|quickbooks|stripe",
  "sync_status": "succeeded|failed",
  "sync_attempts": 1,
  "error_message": null (if failed),
  "confidence": 0.95
}`
    });
  }

  /**
   * Load transaction data for syncing
   */
  async loadContext(input, context) {
    const enriched = { ...context };

    if (input.transaction_id) {
      enriched.transaction = await this.loadTransactionData(input.transaction_id);
    }

    if (enriched.transaction?.invoice_id) {
      enriched.invoice = await this.loadInvoiceData(enriched.transaction.invoice_id);
    }

    if (enriched.transaction?.repair_order_id) {
      enriched.repair_order = await this.loadRepairOrderData(enriched.transaction.repair_order_id);
    }

    return enriched;
  }

  async loadTransactionData(transactionId) {
    const { data: transaction, error } = await supabase
      .from('pos_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) {
      console.error('P-Sync loadTransactionData error:', error);
      return null;
    }

    return transaction;
  }

  async loadInvoiceData(invoiceId) {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error) {
      console.error('P-Sync loadInvoiceData error:', error);
      return null;
    }

    return invoice;
  }

  async loadRepairOrderData(roId) {
    const { data: ro, error } = await supabase
      .from('repair_orders')
      .select('*')
      .eq('id', roId)
      .single();

    if (error) {
      console.error('P-Sync loadRepairOrderData error:', error);
      return null;
    }

    return ro;
  }

  /**
   * Sync payment to Tekmetric
   */
  async syncToTekmetric(transaction, invoice, repairOrder) {
    try {
      // In production, call Tekmetric API to update payment status
      // For now, update local invoice status and log sync attempt

      // Update invoice as paid
      await supabase
        .from('invoices')
        .update({
          paid_amount: transaction.amount,
          balance_due: parseFloat(invoice.total_amount) - parseFloat(transaction.amount),
          status: parseFloat(invoice.total_amount) - parseFloat(transaction.amount) <= 0.01 ? 'paid' : 'partial'
        })
        .eq('id', invoice.id);

      // Log sync success
      await supabase
        .from('pos_sync_log')
        .insert({
          transaction_id: transaction.id,
          shop_id: transaction.shop_id,
          sync_target: 'tekmetric',
          sync_status: 'succeeded',
          sync_attempts: 1,
          last_sync_at: new Date().toISOString(),
          sync_data: {
            repair_order_id: repairOrder?.id,
            invoice_id: invoice.id,
            amount: transaction.amount,
            payment_method: transaction.payment_method
          }
        });

      return { success: true, message: 'Tekmetric sync succeeded' };
    } catch (error) {
      console.error('P-Sync Tekmetric sync error:', error);

      // Log sync failure
      await supabase
        .from('pos_sync_log')
        .insert({
          transaction_id: transaction.id,
          shop_id: transaction.shop_id,
          sync_target: 'tekmetric',
          sync_status: 'failed',
          sync_attempts: 1,
          error_message: error.message,
          error_details: { error: error.toString() },
          next_sync_at: new Date(Date.now() + 60000).toISOString() // Retry in 1 minute
        });

      return { success: false, error: error.message };
    }
  }

  /**
   * Retry failed syncs
   */
  async retryFailedSyncs(shopId, syncTarget = null) {
    const query = supabase
      .from('pos_sync_log')
      .select('*')
      .eq('sync_status', 'failed')
      .eq('shop_id', shopId)
      .lte('next_sync_at', new Date().toISOString())
      .lt('sync_attempts', 3); // Max 3 attempts

    if (syncTarget) {
      query.eq('sync_target', syncTarget);
    }

    const { data: failedSyncs, error } = await query;

    if (error) {
      throw error;
    }

    const results = [];

    for (const sync of failedSyncs || []) {
      // Load transaction
      const { data: transaction } = await supabase
        .from('pos_transactions')
        .select('*')
        .eq('id', sync.transaction_id)
        .single();

      if (!transaction) continue;

      // Retry sync based on target
      let retryResult;
      if (sync.sync_target === 'tekmetric') {
        const invoice = await this.loadInvoiceData(transaction.invoice_id);
        const repairOrder = transaction.repair_order_id 
          ? await this.loadRepairOrderData(transaction.repair_order_id)
          : null;
        retryResult = await this.syncToTekmetric(transaction, invoice, repairOrder);
      }

      // Update sync log
      const nextRetryDelay = Math.pow(5, sync.sync_attempts) * 60000; // Exponential backoff: 5min, 25min, 125min
      const nextRetryAt = sync.sync_attempts >= 2 
        ? null // Max attempts reached
        : new Date(Date.now() + nextRetryDelay).toISOString();

      await supabase
        .from('pos_sync_log')
        .update({
          sync_attempts: sync.sync_attempts + 1,
          next_sync_at: nextRetryAt,
          last_sync_at: new Date().toISOString()
        })
        .eq('id', sync.id);

      results.push({ sync_id: sync.id, success: retryResult?.success || false });
    }

    return results;
  }

  /**
   * Main execution: Sync transaction
   */
  async execute(input = {}, context = {}) {
    const startTime = Date.now();

    try {
      if (!input.transaction_id) {
        throw new Error('transaction_id is required');
      }

      if (!input.sync_target) {
        throw new Error('sync_target is required (tekmetric, quickbooks, stripe)');
      }

      // Load context
      const enrichedContext = await this.loadContext(input, context);

      if (!enrichedContext.transaction) {
        throw new Error('Transaction not found');
      }

      // Only sync succeeded transactions
      if (enrichedContext.transaction.status !== 'succeeded') {
        throw new Error(`Cannot sync transaction with status: ${enrichedContext.transaction.status}`);
      }

      let syncResult;
      if (input.sync_target === 'tekmetric') {
        syncResult = await this.syncToTekmetric(
          enrichedContext.transaction,
          enrichedContext.invoice,
          enrichedContext.repair_order
        );
      } else if (input.sync_target === 'quickbooks') {
        // Future: QuickBooks sync implementation
        syncResult = { success: false, error: 'QuickBooks sync not yet implemented' };
      } else if (input.sync_target === 'stripe') {
        // Future: Stripe reconciliation implementation
        syncResult = { success: false, error: 'Stripe reconciliation not yet implemented' };
      } else {
        throw new Error(`Unknown sync_target: ${input.sync_target}`);
      }

      // Get sync log record
      const { data: syncLog } = await supabase
        .from('pos_sync_log')
        .select('*')
        .eq('transaction_id', input.transaction_id)
        .eq('sync_target', input.sync_target)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const result = {
        sync_id: syncLog?.id,
        sync_target: input.sync_target,
        sync_status: syncResult.success ? 'succeeded' : 'failed',
        sync_attempts: syncLog?.sync_attempts || 1,
        error_message: syncResult.error || null
      };

      // Create artifact
      await this.createArtifact({
        input,
        context: enrichedContext,
        decision: result,
        executionTime: Date.now() - startTime,
        success: syncResult.success
      });

      return {
        success: syncResult.success,
        agent: this.agentId,
        decision: result,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error) {
      console.error('P-Sync execute error:', error);

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

export default PSyncAgent;

















