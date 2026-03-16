/**
 * Tekmetric Trigger System
 * Triggers Squad agents when Tekmetric data arrives
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Trigger appropriate Squad agents when a new repair order arrives
 * @param {Object} params
 * @param {string} params.shopId - Shop UUID
 * @param {Object} params.repairOrder - Synced repair order data
 * @returns {Promise<Array>} Array of triggered agent artifacts
 */
export async function triggerAgentsOnNewRO({ shopId, repairOrder }) {
  const triggers = [];

  // OTTO: Analyze customer and recommend services
  if (repairOrder.customer_id) {
    try {
      const ottoResponse = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/agents/otto/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            trigger: 'new_repair_order',
            customer_id: repairOrder.customer_id,
            repair_order_id: repairOrder.id
          },
          context: {
            shop_id: shopId,
            repair_order: repairOrder
          }
        })
      });

      if (ottoResponse.ok) {
        triggers.push({ agent: 'otto', status: 'triggered', response: await ottoResponse.json() });
      }
    } catch (error) {
      console.error('Failed to trigger OTTO:', error);
    }
  }

  return triggers;
}

/**
 * Trigger agents when payment is received
 * @param {Object} params
 * @param {string} params.shopId - Shop UUID
 * @param {Object} params.paymentData - Payment data from webhook
 * @param {string} params.repairOrderId - Related repair order ID
 * @returns {Promise<Array>} Array of triggered agent artifacts
 */
export async function triggerAgentsOnPayment({ shopId, paymentData, repairOrderId }) {
  const triggers = [];

  // PENNYP: Process payment and update financial records
  try {
    const pennypResponse = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/agents/pennyp/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          trigger: 'payment_received',
          repair_order_id: repairOrderId,
          payment_amount: paymentData.amount,
          payment_method: paymentData.method
        },
        context: {
          shop_id: shopId,
          payment: paymentData
        }
      })
    });

    if (pennypResponse.ok) {
      triggers.push({ agent: 'pennyp', status: 'triggered', response: await pennypResponse.json() });
    }
  } catch (error) {
    console.error('Failed to trigger PENNYP:', error);
  }

  // MILES: Update customer lifetime value and check retention
  if (paymentData.customer_id) {
    try {
      const milesResponse = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/agents/miles/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            trigger: 'payment_received',
            customer_id: paymentData.customer_id,
            amount: paymentData.amount
          },
          context: {
            shop_id: shopId,
            payment: paymentData
          }
        })
      });

      if (milesResponse.ok) {
        triggers.push({ agent: 'miles', status: 'triggered', response: await milesResponse.json() });
      }
    } catch (error) {
      console.error('Failed to trigger MILES:', error);
    }
  }

  return triggers;
}

/**
 * Trigger agents when customer returns after long absence
 * @param {Object} params
 * @param {string} params.shopId - Shop UUID
 * @param {string} params.customerId - Customer UUID
 * @param {number} params.daysSinceLastVisit - Days since last visit
 * @returns {Promise<Array>} Array of triggered agent artifacts
 */
export async function triggerAgentsOnCustomerReturn({ shopId, customerId, daysSinceLastVisit }) {
  const triggers = [];

  // MILES: Win-back campaign if > 180 days
  if (daysSinceLastVisit > 180) {
    try {
      const milesResponse = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/agents/miles/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            trigger: 'customer_returned_after_absence',
            customer_id: customerId,
            days_since_last_visit: daysSinceLastVisit
          },
          context: {
            shop_id: shopId,
            return_after_days: daysSinceLastVisit
          }
        })
      });

      if (milesResponse.ok) {
        triggers.push({ agent: 'miles', status: 'triggered', response: await milesResponse.json() });
      }
    } catch (error) {
      console.error('Failed to trigger MILES for return:', error);
    }
  }

  return triggers;
}

/**
 * Trigger agents when high-value repair order completes
 * @param {Object} params
 * @param {string} params.shopId - Shop UUID
 * @param {Object} params.repairOrder - Completed repair order
 * @returns {Promise<Array>} Array of triggered agent artifacts
 */
export async function triggerAgentsOnHighValueRO({ shopId, repairOrder }) {
  const triggers = [];

  // High value threshold: $500+
  if (repairOrder.total_amount >= 500 && repairOrder.customer_id) {
    // MILES: Send thank-you and request review
    try {
      const milesResponse = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/agents/miles/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            trigger: 'high_value_ro_completed',
            customer_id: repairOrder.customer_id,
            repair_order_id: repairOrder.id,
            amount: repairOrder.total_amount
          },
          context: {
            shop_id: shopId,
            repair_order: repairOrder
          }
        })
      });

      if (milesResponse.ok) {
        triggers.push({ agent: 'miles', status: 'triggered', response: await milesResponse.json() });
      }
    } catch (error) {
      console.error('Failed to trigger MILES for high-value RO:', error);
    }
  }

  return triggers;
}

export default {
  triggerAgentsOnNewRO,
  triggerAgentsOnPayment,
  triggerAgentsOnCustomerReturn,
  triggerAgentsOnHighValueRO
};



















