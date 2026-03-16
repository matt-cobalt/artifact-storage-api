/**
 * POS (Point of Sale) API Endpoints
 * Hybrid POS system for payment processing
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import PTransactionAgent from '../agents/ptransaction.js';
import PReceiptAgent from '../agents/preceipt.js';
import PSyncAgent from '../agents/psync.js';
import POfflineAgent from '../agents/poffline.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const router = express.Router();

const pTransaction = new PTransactionAgent();
const pReceipt = new PReceiptAgent();
const pSync = new PSyncAgent();
const pOffline = new POfflineAgent();

/**
 * GET /api/pos/connectivity/:shop_id
 * Check connectivity status for a shop
 */
router.get('/connectivity/:shop_id', async (req, res) => {
  try {
    const { shop_id } = req.params;

    const { data, error } = await supabase.rpc('check_connectivity_status', {
      shop_id_param: shop_id
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      online: data === true,
      last_check: new Date().toISOString()
    });
  } catch (error) {
    console.error('POS connectivity check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pos/process-payment
 * Process a payment (online or offline routing)
 */
router.post('/process-payment', async (req, res) => {
  try {
    const { shop_id, invoice_id, amount, payment_method, payment_token, insurance_amount } = req.body;

    if (!shop_id || !invoice_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields: shop_id, invoice_id, amount, payment_method' });
    }

    // Execute P-TRANSACTION agent
    const result = await pTransaction.execute({
      shop_id,
      invoice_id,
      amount: parseFloat(amount),
      payment_method,
      payment_token,
      insurance_amount: insurance_amount ? parseFloat(insurance_amount) : 0
    });

    if (!result.success) {
      return res.status(500).json({ error: result.decision?.error_message || 'Payment processing failed' });
    }

    const transaction = result.decision;

    // If payment succeeded, trigger receipt generation and sync
    if (transaction.status === 'succeeded') {
      // Generate receipt (async, non-blocking)
      pReceipt.execute({
        transaction_id: transaction.transaction_id,
        delivery_method: 'email'
      }).catch(err => console.error('Receipt generation error:', err));

      // Sync to Tekmetric (async, non-blocking)
      pSync.execute({
        transaction_id: transaction.transaction_id,
        sync_target: 'tekmetric'
      }).catch(err => console.error('Sync error:', err));
    }

    res.json({
      success: true,
      transaction_id: transaction.transaction_id,
      status: transaction.status,
      stripe_payment_intent_id: transaction.stripe_payment_intent_id,
      offline_queue_id: transaction.offline_queue_id
    });
  } catch (error) {
    console.error('POS process-payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pos/transactions
 * Get transactions for a shop
 */
router.get('/transactions', async (req, res) => {
  try {
    const { shop_id, date, status, limit = 100 } = req.query;

    if (!shop_id) {
      return res.status(400).json({ error: 'shop_id is required' });
    }

    let query = supabase
      .from('pos_transactions')
      .select('*')
      .eq('shop_id', shop_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit, 10));

    if (status) {
      query = query.eq('status', status);
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query = query.gte('created_at', startDate.toISOString())
                   .lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('POS get transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pos/transaction/:id
 * Get transaction details
 */
router.get('/transaction/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: transaction, error } = await supabase
      .from('pos_transactions')
      .select(`
        *,
        invoice:invoices(*),
        customer:customers(*),
        receipt:pos_receipts(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('POS get transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pos/receipts/failed
 * Get failed receipts for retry
 */
router.get('/receipts/failed', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from('pos_receipts')
      .select('*')
      .eq('delivery_status', 'failed')
      .lt('print_attempts', 3)
      .order('created_at', { ascending: true })
      .limit(parseInt(limit, 10));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('POS get failed receipts error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pos/receipt/:id/pdf
 * Get receipt PDF (placeholder - implement PDF generation)
 */
router.get('/receipt/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: receipt, error } = await supabase
      .from('pos_receipts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // In production, generate PDF from receipt_html and return file
    // For now, return receipt HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(receipt.receipt_html || '<p>Receipt PDF generation not yet implemented</p>');
  } catch (error) {
    console.error('POS get receipt PDF error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pos/sync-log/failed
 * Get failed syncs for retry
 */
router.get('/sync-log/failed', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from('pos_sync_log')
      .select('*')
      .eq('sync_status', 'failed')
      .lt('sync_attempts', 3)
      .order('created_at', { ascending: true })
      .limit(parseInt(limit, 10));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('POS get failed syncs error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pos/offline-queue/:shop_id
 * Get offline queue for a shop
 */
router.get('/offline-queue/:shop_id', async (req, res) => {
  try {
    const { shop_id } = req.params;

    const { data: queueItems, error } = await supabase
      .from('pos_offline_queue')
      .select('*')
      .eq('shop_id', shop_id)
      .eq('status', 'queued')
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const oldestQueued = queueItems && queueItems.length > 0 ? queueItems[0].created_at : null;

    res.json({
      queued_count: queueItems?.length || 0,
      oldest_queued: oldestQueued,
      queue_items: queueItems || []
    });
  } catch (error) {
    console.error('POS get offline queue error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pos/sync-queue
 * Manually trigger queue sync (for testing/admin)
 */
router.post('/sync-queue', async (req, res) => {
  try {
    const { shop_id } = req.body;

    if (!shop_id) {
      return res.status(400).json({ error: 'shop_id is required' });
    }

    const result = await pOffline.execute({
      shop_id,
      action: 'process'
    });

    res.json(result.decision);
  } catch (error) {
    console.error('POS sync queue error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pos/reconciliation
 * Create reconciliation log entry
 */
router.post('/reconciliation', async (req, res) => {
  try {
    const { shop_id, reconciliation_date, reconciliation_data } = req.body;

    if (!shop_id || !reconciliation_date || !reconciliation_data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('pos_reconciliation_log')
      .insert({
        shop_id,
        reconciliation_date,
        reconciliation_status: reconciliation_data.discrepancies?.length > 0 ? 'discrepancy_found' : 'completed',
        total_transactions_expected: reconciliation_data.expected_count || 0,
        total_transactions_found: reconciliation_data.found_count || 0,
        total_transactions_missing: reconciliation_data.missing_count || 0,
        total_transactions_extra: reconciliation_data.extra_count || 0,
        expected_amount: reconciliation_data.expected_amount || 0,
        found_amount: reconciliation_data.found_amount || 0,
        discrepancy_amount: reconciliation_data.discrepancy_amount || 0,
        discrepancies: reconciliation_data.discrepancies || [],
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('POS reconciliation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

















