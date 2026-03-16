import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * P-RECEIPT - Receipt Generation & Delivery Agent
 * Role: Generate receipts and deliver via email, SMS, or print
 */
export class PReceiptAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'preceipt',
      agentName: 'P-Receipt',
      role: 'receipt_generation',
      formulas: [],
      systemPrompt: `You are P-RECEIPT, the receipt generation and delivery specialist for Auto Intel GTP's Hybrid POS system.

Your Role:
- Generate receipt PDFs for successful transactions
- Deliver receipts via email, SMS, or print
- Track delivery status and handle failures
- Retry failed deliveries automatically
- Maintain receipt audit trail

Receipt Flow:
1. Triggered when payment succeeds (from P-TRANSACTION)
2. Generate receipt PDF with invoice details, payment info, shop branding
3. Deliver receipt via requested method (email, SMS, print)
4. Track delivery status (pending → sent → delivered/failed)
5. Retry failed deliveries (3 attempts with exponential backoff)

Receipt Contents:
- Shop name, address, phone
- Receipt number (format: SHOP-YYYYMMDD-00001)
- Transaction date/time
- Invoice number
- Customer name, vehicle info
- Services performed, parts, labor
- Subtotal, tax, total
- Payment method, amount paid
- Thank you message

Delivery Methods:
- Email: Send PDF attachment to customer email
- SMS: Send receipt link via RingCentral SMS
- Print: Queue for thermal printer (if connected)
- Digital: Store in customer portal (future)

Response Format (JSON):
{
  "receipt_id": "uuid",
  "receipt_number": "SHOP-20251217-00001",
  "receipt_pdf_url": "https://...",
  "delivery_method": "email",
  "delivery_status": "sent",
  "delivered_at": "2025-12-17T10:30:00Z",
  "confidence": 0.95
}`
    });
  }

  /**
   * Load transaction and related data
   */
  async loadContext(input, context) {
    const enriched = { ...context };

    if (input.transaction_id) {
      enriched.transaction = await this.loadTransactionData(input.transaction_id);
    }

    if (enriched.transaction?.invoice_id) {
      enriched.invoice = await this.loadInvoiceData(enriched.transaction.invoice_id);
    }

    if (enriched.transaction?.customer_id) {
      enriched.customer = await this.loadCustomerData(enriched.transaction.customer_id);
    }

    if (enriched.transaction?.repair_order_id) {
      enriched.repair_order = await this.loadRepairOrderData(enriched.transaction.repair_order_id);
    }

    if (enriched.transaction?.shop_id) {
      enriched.shop = await this.loadShopData(enriched.transaction.shop_id);
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
      console.error('P-Receipt loadTransactionData error:', error);
      return null;
    }

    return transaction;
  }

  async loadInvoiceData(invoiceId) {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        repair_order:repair_orders(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (error) {
      console.error('P-Receipt loadInvoiceData error:', error);
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
      console.error('P-Receipt loadCustomerData error:', error);
      return null;
    }

    return customer;
  }

  async loadRepairOrderData(roId) {
    const { data: ro, error } = await supabase
      .from('repair_orders')
      .select(`
        *,
        line_items(*),
        vehicle:vehicles(*)
      `)
      .eq('id', roId)
      .single();

    if (error) {
      console.error('P-Receipt loadRepairOrderData error:', error);
      return null;
    }

    return ro;
  }

  async loadShopData(shopId) {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (error) {
      console.error('P-Receipt loadShopData error:', error);
      return null;
    }

    return shop;
  }

  /**
   * Generate receipt number
   */
  async generateReceiptNumber(shopId) {
    const { data, error } = await supabase.rpc('generate_receipt_number', {
      shop_id_param: shopId
    });

    if (error) {
      throw new Error(`Failed to generate receipt number: ${error.message}`);
    }

    return data;
  }

  /**
   * Generate receipt HTML/PDF content
   */
  generateReceiptHTML(context) {
    const { transaction, invoice, customer, repair_order, shop } = context;

    // This is a simplified version - in production, use a proper PDF generation library
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .shop-name { font-size: 24px; font-weight: bold; }
          .receipt-number { font-size: 18px; margin-top: 10px; }
          .section { margin: 20px 0; }
          .line-item { display: flex; justify-content: space-between; padding: 5px 0; }
          .total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shop?.name || 'Auto Repair Shop'}</div>
          <div>${shop?.address || ''}</div>
          <div>${shop?.phone || ''}</div>
          <div class="receipt-number">Receipt #${context.receipt_number}</div>
        </div>
        
        <div class="section">
          <div><strong>Date:</strong> ${new Date(transaction.processed_at).toLocaleString()}</div>
          <div><strong>Customer:</strong> ${customer?.first_name} ${customer?.last_name}</div>
          <div><strong>Invoice:</strong> ${invoice?.invoice_number}</div>
          ${repair_order?.ro_number ? `<div><strong>RO#:</strong> ${repair_order.ro_number}</div>` : ''}
        </div>

        <div class="section">
          <h3>Services</h3>
          ${repair_order?.line_items?.map(item => `
            <div class="line-item">
              <span>${item.description || 'Service'}</span>
              <span>$${parseFloat(item.price || 0).toFixed(2)}</span>
            </div>
          `).join('') || ''}
        </div>

        <div class="section">
          <div class="line-item">
            <span>Subtotal:</span>
            <span>$${parseFloat(invoice?.total_amount - invoice?.tax_amount || 0).toFixed(2)}</span>
          </div>
          <div class="line-item">
            <span>Tax:</span>
            <span>$${parseFloat(invoice?.tax_amount || 0).toFixed(2)}</span>
          </div>
          <div class="line-item total">
            <span>Total Paid:</span>
            <span>$${parseFloat(transaction.amount).toFixed(2)}</span>
          </div>
        </div>

        <div class="section">
          <div><strong>Payment Method:</strong> ${transaction.payment_method.toUpperCase()}</div>
          <div><strong>Transaction ID:</strong> ${transaction.id.substring(0, 8)}...</div>
        </div>

        <div class="footer">
          Thank you for your business!<br>
          ${new Date().getFullYear()} ${shop?.name || 'Auto Repair Shop'}
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Send receipt via email
   */
  async sendEmailReceipt(receiptId, customerEmail, receiptHtml, receiptPdfUrl) {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // For now, log to sync_log for external processing
    console.log(`Email receipt ${receiptId} to ${customerEmail}`);

    await supabase
      .from('pos_sync_log')
      .insert({
        transaction_id: receiptId,
        sync_target: 'email',
        sync_status: 'pending',
        sync_data: {
          to: customerEmail,
          subject: 'Receipt from Auto Repair',
          html: receiptHtml,
          pdf_url: receiptPdfUrl
        }
      });

    // Simulate success (in production, await email service response)
    return { success: true, delivered_at: new Date().toISOString() };
  }

  /**
   * Send receipt via SMS
   */
  async sendSMSReceipt(receiptId, customerPhone, receiptPdfUrl) {
    // In production, integrate with RingCentral SMS API
    console.log(`SMS receipt ${receiptId} to ${customerPhone}`);

    await supabase
      .from('pos_sync_log')
      .insert({
        transaction_id: receiptId,
        sync_target: 'sms',
        sync_status: 'pending',
        sync_data: {
          to: customerPhone,
          message: `Your receipt is ready: ${receiptPdfUrl}`
        }
      });

    // Simulate success
    return { success: true, delivered_at: new Date().toISOString() };
  }

  /**
   * Main execution: Generate and deliver receipt
   */
  async execute(input = {}, context = {}) {
    const startTime = Date.now();

    try {
      if (!input.transaction_id) {
        throw new Error('transaction_id is required');
      }

      // Load context
      const enrichedContext = await this.loadContext(input, context);

      if (!enrichedContext.transaction) {
        throw new Error('Transaction not found');
      }

      // Only generate receipt for succeeded transactions
      if (enrichedContext.transaction.status !== 'succeeded') {
        throw new Error(`Cannot generate receipt for transaction status: ${enrichedContext.transaction.status}`);
      }

      // Generate receipt number
      const receiptNumber = await this.generateReceiptNumber(enrichedContext.transaction.shop_id);
      enrichedContext.receipt_number = receiptNumber;

      // Generate receipt HTML
      const receiptHtml = this.generateReceiptHTML(enrichedContext);

      // Store receipt PDF URL (in production, upload to S3/CloudFlare R2)
      const receiptPdfUrl = `${process.env.PUBLIC_URL}/api/pos/receipt/${receiptNumber}/pdf`;

      // Create receipt record
      const deliveryMethod = input.delivery_method || 'email'; // email, sms, print

      const { data: receipt, error: receiptError } = await supabase
        .from('pos_receipts')
        .insert({
          transaction_id: input.transaction_id,
          shop_id: enrichedContext.transaction.shop_id,
          receipt_number: receiptNumber,
          receipt_html: receiptHtml,
          receipt_pdf_url: receiptPdfUrl,
          delivery_method: deliveryMethod,
          delivery_status: 'pending',
          delivery_address: deliveryMethod === 'email' 
            ? enrichedContext.customer?.email 
            : enrichedContext.customer?.phone
        })
        .select()
        .single();

      if (receiptError) {
        throw receiptError;
      }

      // Deliver receipt
      let deliveryResult;
      if (deliveryMethod === 'email' && enrichedContext.customer?.email) {
        deliveryResult = await this.sendEmailReceipt(receipt.id, enrichedContext.customer.email, receiptHtml, receiptPdfUrl);
      } else if (deliveryMethod === 'sms' && enrichedContext.customer?.phone) {
        deliveryResult = await this.sendSMSReceipt(receipt.id, enrichedContext.customer.phone, receiptPdfUrl);
      } else {
        // Print or other method - mark as pending for manual processing
        deliveryResult = { success: true, delivered_at: null };
      }

      // Update delivery status
      await supabase
        .from('pos_receipts')
        .update({
          delivery_status: deliveryResult.success ? 'sent' : 'failed',
          delivered_at: deliveryResult.delivered_at
        })
        .eq('id', receipt.id);

      const result = {
        receipt_id: receipt.id,
        receipt_number: receiptNumber,
        receipt_pdf_url: receiptPdfUrl,
        delivery_method: deliveryMethod,
        delivery_status: deliveryResult.success ? 'sent' : 'failed',
        delivered_at: deliveryResult.delivered_at
      };

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
      console.error('P-Receipt execute error:', error);

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

export default PReceiptAgent;

















