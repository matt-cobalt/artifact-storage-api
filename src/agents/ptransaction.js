import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * P-TRANSACTION - Payment Processing Orchestrator
 * Role: Orchestrate payment processing workflow (online and offline routing)
 */
export class PTransactionAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'ptransaction',
      agentName: 'P-Transaction',
      role: 'payment_processing',
      formulas: ['GROSS_MARGIN'], // May use margin formulas for validation
      systemPrompt: `You are P-TRANSACTION, the payment processing orchestrator for Auto Intel GTP's Hybrid POS system.

Your Role:
- Validate payment requests (amount, invoice, customer authorization)
- Route payments to Stripe API (online) or offline queue (offline mode)
- Handle payment method selection (card, cash, check, ACH, mobile wallet)
- Process payment splits (insurance + customer pay)
- Ensure idempotency (prevent duplicate charges)
- Log all transactions for audit trail

Payment Flow:
1. Validate payment request (invoice exists, amount matches, customer authorized)
2. Check connectivity status (online vs offline)
3. If online: Process via Stripe Payment Intent API
4. If offline: Queue transaction for sync when connectivity restored
5. Log transaction status (pending → processing → succeeded/failed)
6. Trigger receipt generation on success

Key Requirements:
- Idempotency: Every payment must have unique idempotency_key
- Validation: Amount must match invoice balance_due (within $0.01 tolerance)
- Security: Never log full card numbers (use Stripe tokens only)
- Reliability: Handle Stripe API failures gracefully (retry 3x with exponential backoff)

Response Format (JSON):
{
  "transaction_id": "uuid",
  "status": "succeeded|failed|queued",
  "stripe_payment_intent_id": "pi_xxx" (if online),
  "offline_queue_id": "uuid" (if offline),
  "amount": 744.88,
  "payment_method": "card",
  "error_message": null (if failed),
  "confidence": 0.95
}`
    });
  }

  /**
   * Load invoice and customer data for payment validation
   */
  async loadContext(input, context) {
    const enriched = { ...context };

    if (input.invoice_id) {
      enriched.invoice = await this.loadInvoiceData(input.invoice_id);
    }

    if (input.customer_id || enriched.invoice?.customer_id) {
      const customerId = input.customer_id || enriched.invoice.customer_id;
      enriched.customer = await this.loadCustomerData(customerId);
    }

    if (input.shop_id) {
      enriched.shop = await this.loadShopData(input.shop_id);
    }

    // Load payment method if provided (stored card)
    if (input.payment_method_id) {
      enriched.payment_method = await this.loadPaymentMethod(input.payment_method_id);
    }

    return enriched;
  }

  async loadInvoiceData(invoiceId) {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        repair_order:repair_orders(*),
        customer:customers(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (error) {
      console.error('P-Transaction loadInvoiceData error:', error);
      return null;
    }

    return invoice;
  }

  async loadCustomerData(customerId) {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('P-Transaction loadCustomerData error:', error);
      return null;
    }

    return customer;
  }

  async loadShopData(shopId) {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (error) {
      console.error('P-Transaction loadShopData error:', error);
      return null;
    }

    return shop;
  }

  async loadPaymentMethod(paymentMethodId) {
    const { data: method, error } = await supabase
      .from('pos_payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .single();

    if (error) {
      console.error('P-Transaction loadPaymentMethod error:', error);
      return null;
    }

    return method;
  }

  /**
   * Check if shop has connectivity (online vs offline)
   */
  async checkConnectivity(shopId) {
    const { data, error } = await supabase.rpc('check_connectivity_status', {
      shop_id_param: shopId
    });

    if (error) {
      console.error('P-Transaction checkConnectivity error:', error);
      // Default to online (will fail gracefully if actually offline)
      return true;
    }

    return data === true;
  }

  /**
   * Generate idempotency key for payment
   */
  generateIdempotencyKey(shopId, invoiceId, amount) {
    return `${shopId}-${invoiceId}-${amount}-${Date.now()}`;
  }

  /**
   * Process payment online via Stripe
   */
  async processStripePayment(input, context) {
    const { invoice, customer, shop, payment_method } = context;
    const { amount, payment_method_type, payment_token } = input;

    try {
      // Create Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_method: payment_token || payment_method?.stripe_payment_method_id,
        confirmation_method: 'manual',
        confirm: false,
        metadata: {
          shop_id: shop.id,
          invoice_id: invoice.id,
          customer_id: customer.id,
          repair_order_id: invoice.repair_order_id
        }
      });

      // Create transaction record (pending status)
      const idempotencyKey = this.generateIdempotencyKey(shop.id, invoice.id, amount);

      const { data: transaction, error: txError } = await supabase
        .from('pos_transactions')
        .insert({
          shop_id: shop.id,
          invoice_id: invoice.id,
          customer_id: customer.id,
          repair_order_id: invoice.repair_order_id,
          amount: amount,
          payment_method: payment_method_type || 'card',
          status: 'processing',
          stripe_payment_intent_id: paymentIntent.id,
          idempotency_key: idempotencyKey,
          customer_amount: amount - (input.insurance_amount || 0),
          insurance_amount: input.insurance_amount || 0
        })
        .select()
        .single();

      if (txError) {
        // Check if it's a duplicate (idempotency key conflict)
        if (txError.code === '23505') { // Unique violation
          const { data: existing } = await supabase
            .from('pos_transactions')
            .select('*')
            .eq('idempotency_key', idempotencyKey)
            .single();

          return {
            transaction_id: existing.id,
            status: existing.status,
            stripe_payment_intent_id: existing.stripe_payment_intent_id,
            amount: existing.amount,
            payment_method: existing.payment_method,
            message: 'Duplicate payment prevented (idempotency)'
          };
        }

        throw txError;
      }

      // Confirm payment intent
      const confirmedPaymentIntent = await stripe.paymentIntents.confirm(paymentIntent.id);

      // Update transaction status
      const finalStatus = confirmedPaymentIntent.status === 'succeeded' ? 'succeeded' : 'failed';

      await supabase
        .from('pos_transactions')
        .update({
          status: finalStatus,
          stripe_charge_id: confirmedPaymentIntent.latest_charge,
          processed_at: new Date().toISOString(),
          error_details: finalStatus === 'failed' ? {
            code: confirmedPaymentIntent.last_payment_error?.code,
            message: confirmedPaymentIntent.last_payment_error?.message
          } : null
        })
        .eq('id', transaction.id);

      return {
        transaction_id: transaction.id,
        status: finalStatus,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: confirmedPaymentIntent.latest_charge,
        amount: amount,
        payment_method: payment_method_type || 'card',
        error_message: finalStatus === 'failed' ? confirmedPaymentIntent.last_payment_error?.message : null
      };
    } catch (error) {
      console.error('P-Transaction Stripe payment error:', error);
      throw error;
    }
  }

  /**
   * Queue payment for offline processing
   */
  async queueOfflinePayment(input, context) {
    const { invoice, customer, shop } = context;
    const { amount, payment_method_type } = input;

    const transactionData = {
      invoice_id: invoice.id,
      customer_id: customer.id,
      repair_order_id: invoice.repair_order_id,
      amount: amount,
      payment_method: payment_method_type || 'card',
      customer_amount: amount - (input.insurance_amount || 0),
      insurance_amount: input.insurance_amount || 0,
      payment_token: input.payment_token, // Store token for later processing
      created_at: new Date().toISOString()
    };

    const { data: queueItem, error } = await supabase
      .from('pos_offline_queue')
      .insert({
        shop_id: shop.id,
        transaction_data: transactionData,
        status: 'queued',
        next_retry_at: new Date().toISOString() // Retry immediately when online
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      transaction_id: null,
      status: 'queued',
      offline_queue_id: queueItem.id,
      amount: amount,
      payment_method: payment_method_type || 'card',
      message: 'Payment queued for processing when connectivity restored'
    };
  }

  /**
   * Main execution: Process payment request
   */
  async execute(input = {}, context = {}) {
    const startTime = Date.now();

    try {
      // Validate required inputs
      if (!input.invoice_id) {
        throw new Error('invoice_id is required');
      }
      if (!input.amount || input.amount <= 0) {
        throw new Error('amount must be positive');
      }
      if (!input.shop_id) {
        throw new Error('shop_id is required');
      }

      // Load context
      const enrichedContext = await this.loadContext(input, context);

      // Validate invoice exists and amount matches
      const invoice = enrichedContext.invoice;
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const balanceDue = parseFloat(invoice.balance_due || invoice.total_amount);
      const amount = parseFloat(input.amount);

      // Allow $0.01 tolerance for rounding
      if (Math.abs(balanceDue - amount) > 0.01) {
        throw new Error(`Amount mismatch: invoice balance_due=${balanceDue}, payment amount=${amount}`);
      }

      // Check connectivity
      const isOnline = await this.checkConnectivity(input.shop_id);

      let result;
      if (isOnline) {
        // Process online via Stripe
        result = await this.processStripePayment(input, enrichedContext);
      } else {
        // Queue for offline processing
        result = await this.queueOfflinePayment(input, enrichedContext);
      }

      // Create artifact
      await this.createArtifact({
        input,
        context: enrichedContext,
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
      console.error('P-Transaction execute error:', error);

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

export default PTransactionAgent;

















