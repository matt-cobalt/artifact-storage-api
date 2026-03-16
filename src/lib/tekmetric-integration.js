/**
 * Tekmetric Integration Utilities
 * Handles webhook processing, data sync, and shop connection management
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import ArtifactStorage from '../artifact-storage/core.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Validate Tekmetric webhook HMAC signature
 * @param {string} payload - Raw webhook payload (string)
 * @param {string} signature - Signature from X-Tekmetric-Signature header
 * @param {string} secret - Webhook secret from tekmetric_connections
 * @returns {boolean} True if signature is valid
 */
export function validateTekmetricSignature(payload, signature, secret) {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Log incoming webhook
 * @param {Object} params
 * @param {string} params.shopId - Shop UUID
 * @param {string} params.eventType - Event type (repair_order.created, etc.)
 * @param {Object} params.payload - Webhook payload
 * @param {boolean} params.signatureValid - Whether signature was valid
 * @returns {Promise<Object>} Logged webhook record
 */
export async function logTekmetricWebhook({
  shopId,
  eventType,
  payload,
  signatureValid = false
}) {
  const { data: logEntry, error } = await supabase
    .from('tekmetric_webhook_log')
    .insert({
      shop_id: shopId,
      event_type: eventType,
      raw_payload: payload,
      signature_valid: signatureValid,
      processed: false
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log Tekmetric webhook:', error);
    throw new Error(`Webhook logging failed: ${error.message}`);
  }

  return logEntry;
}

/**
 * Process Tekmetric repair order webhook
 * @param {Object} params
 * @param {string} params.shopId - Shop UUID
 * @param {Object} params.webhookData - Parsed webhook payload
 * @returns {Promise<Object>} Synced repair order
 */
export async function syncTekmetricRepairOrder({ shopId, webhookData }) {
  const ro = webhookData.repair_order || webhookData;
  const externalRoId = ro.id?.toString() || ro.external_id?.toString();
  const roNumber = ro.ro_number || ro.number || ro.id?.toString();

  if (!externalRoId || !roNumber) {
    throw new Error('Missing required fields: external_ro_id or ro_number');
  }

  // Find or create customer
  let customerId = null;
  if (ro.customer_id || ro.customer?.id) {
    const externalCustomerId = (ro.customer_id || ro.customer?.id).toString();
    const tekmetricCustomer = await supabase
      .from('tekmetric_customers')
      .select('internal_customer_id')
      .eq('shop_id', shopId)
      .eq('external_customer_id', externalCustomerId)
      .single();

    if (tekmetricCustomer.data?.internal_customer_id) {
      customerId = tekmetricCustomer.data.internal_customer_id;
    }
  }

  // Find or create vehicle
  let vehicleId = null;
  if (ro.vehicle_id || ro.vehicle?.id) {
    const externalVehicleId = (ro.vehicle_id || ro.vehicle?.id).toString();
    const tekmetricVehicle = await supabase
      .from('tekmetric_vehicles')
      .select('internal_vehicle_id')
      .eq('shop_id', shopId)
      .eq('external_vehicle_id', externalVehicleId)
      .single();

    if (tekmetricVehicle.data?.internal_vehicle_id) {
      vehicleId = tekmetricVehicle.data.internal_vehicle_id;
    }
  }

  // Calculate totals
  const laborTotal = parseFloat(ro.labor_total || ro.labor_amount || 0);
  const partsTotal = parseFloat(ro.parts_total || ro.parts_amount || 0);
  const taxTotal = parseFloat(ro.tax_total || ro.tax_amount || 0);
  const totalAmount = laborTotal + partsTotal + taxTotal;

  // Upsert repair order
  const { data: syncedRO, error } = await supabase
    .from('tekmetric_repair_orders')
    .upsert({
      shop_id: shopId,
      external_ro_id: externalRoId,
      ro_number: roNumber,
      customer_id: customerId,
      vehicle_id: vehicleId,
      status: ro.status || 'quote',
      labor_total: laborTotal,
      parts_total: partsTotal,
      tax_total: taxTotal,
      total_amount: totalAmount,
      technician: ro.technician || ro.assigned_tech,
      services: ro.services || ro.line_items?.filter(li => li.type === 'service') || [],
      line_items: ro.line_items || [],
      closed_at: ro.closed_at || ro.completed_at ? new Date(ro.closed_at || ro.completed_at).toISOString() : null,
      raw_webhook_data: webhookData,
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced'
    }, {
      onConflict: 'shop_id,external_ro_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to sync Tekmetric repair order:', error);
    throw new Error(`Repair order sync failed: ${error.message}`);
  }

  // Create artifact for this sync
  await ArtifactStorage.createArtifact({
    type: 'tekmetric_sync',
    data: {
      entity_type: 'repair_order',
      shop_id: shopId,
      external_id: externalRoId,
      internal_id: syncedRO.id,
      status: syncedRO.status,
      total_amount: syncedRO.total_amount
    },
    provenance: {
      agent: 'tekmetric_integration',
      source: 'tekmetric_webhook',
      trigger: 'repair_order_sync'
    },
    metadata: {
      shop_id: shopId,
      entity_type: 'repair_order'
    }
  });

  // Trigger Squad agents (async, don't wait)
  // triggerSquadAgents uses dynamic imports internally to avoid circular deps
  triggerSquadAgents('repair_order.synced', shopId, syncedRO).catch(error => {
    console.error('Failed to trigger Squad agents after RO sync:', error);
  });

  return syncedRO;
}

/**
 * Process Tekmetric customer webhook
 * @param {Object} params
 * @param {string} params.shopId - Shop UUID
 * @param {Object} params.webhookData - Parsed webhook payload
 * @returns {Promise<Object>} Synced customer
 */
export async function syncTekmetricCustomer({ shopId, webhookData }) {
  const customer = webhookData.customer || webhookData;
  const externalCustomerId = customer.id?.toString();

  if (!externalCustomerId) {
    throw new Error('Missing required field: customer id');
  }

  // Try to find existing internal customer by phone or email
  let internalCustomerId = null;
  if (customer.phone) {
    const existing = await supabase
      .from('customers')
      .select('id')
      .eq('shop_id', shopId)
      .eq('phone', customer.phone)
      .single();

    if (existing.data?.id) {
      internalCustomerId = existing.data.id;
    }
  }

  // If not found by phone, try email
  if (!internalCustomerId && customer.email) {
    const existing = await supabase
      .from('customers')
      .select('id')
      .eq('shop_id', shopId)
      .eq('email', customer.email)
      .single();

    if (existing.data?.id) {
      internalCustomerId = existing.data.id;
    }
  }

  // Upsert Tekmetric customer record
  const { data: syncedCustomer, error } = await supabase
    .from('tekmetric_customers')
    .upsert({
      shop_id: shopId,
      external_customer_id: externalCustomerId,
      internal_customer_id: internalCustomerId,
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || {},
      vehicle_count: customer.vehicle_count || 0,
      lifetime_revenue: parseFloat(customer.lifetime_revenue || customer.total_spent || 0),
      last_service_date: customer.last_service_date ? new Date(customer.last_service_date).toISOString().split('T')[0] : null,
      total_visits: customer.total_visits || 0,
      raw_data: webhookData,
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced'
    }, {
      onConflict: 'shop_id,external_customer_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to sync Tekmetric customer:', error);
    throw new Error(`Customer sync failed: ${error.message}`);
  }

  return syncedCustomer;
}

/**
 * Process Tekmetric vehicle webhook
 * @param {Object} params
 * @param {string} params.shopId - Shop UUID
 * @param {Object} params.webhookData - Parsed webhook payload
 * @returns {Promise<Object>} Synced vehicle
 */
export async function syncTekmetricVehicle({ shopId, webhookData }) {
  const vehicle = webhookData.vehicle || webhookData;
  const externalVehicleId = vehicle.id?.toString();
  const externalCustomerId = (vehicle.customer_id || vehicle.customer?.id)?.toString();

  if (!externalVehicleId || !externalCustomerId) {
    throw new Error('Missing required fields: vehicle id or customer id');
  }

  // Find internal customer ID
  const tekmetricCustomer = await supabase
    .from('tekmetric_customers')
    .select('internal_customer_id')
    .eq('shop_id', shopId)
    .eq('external_customer_id', externalCustomerId)
    .single();

  const internalCustomerId = tekmetricCustomer.data?.internal_customer_id || null;

  // Upsert Tekmetric vehicle record
  const { data: syncedVehicle, error } = await supabase
    .from('tekmetric_vehicles')
    .upsert({
      shop_id: shopId,
      external_vehicle_id: externalVehicleId,
      external_customer_id: externalCustomerId,
      internal_customer_id: internalCustomerId,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      mileage: vehicle.mileage || vehicle.current_mileage,
      vin: vehicle.vin,
      license_plate: vehicle.license_plate || vehicle.plate,
      service_history: vehicle.service_history || [],
      raw_data: webhookData,
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced'
    }, {
      onConflict: 'shop_id,external_vehicle_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to sync Tekmetric vehicle:', error);
    throw new Error(`Vehicle sync failed: ${error.message}`);
  }

  return syncedVehicle;
}

/**
 * Record sync error for retry
 * @param {Object} params
 * @param {string} params.shopId - Shop UUID
 * @param {string} params.entityType - Entity type (repair_order, customer, vehicle)
 * @param {string} params.entityId - External entity ID
 * @param {string} params.errorType - Error type
 * @param {string} params.errorMessage - Error message
 * @param {Object} params.payload - Original payload that failed
 * @returns {Promise<Object>} Error record
 */
export async function recordSyncError({
  shopId,
  entityType,
  entityId,
  errorType,
  errorMessage,
  payload = {}
}) {
  const { data: errorRecord, error } = await supabase
    .from('tekmetric_sync_errors')
    .insert({
      shop_id: shopId,
      entity_type: entityType,
      entity_id: entityId,
      error_type: errorType,
      error_message: errorMessage,
      payload,
      retry_count: 0,
      resolved: false
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to record sync error:', error);
    // Don't throw - error logging shouldn't break the flow
  }

  return errorRecord;
}

/**
 * Get shop's Tekmetric connection
 * @param {string} shopId - Shop UUID
 * @returns {Promise<Object|null>} Connection record
 */
export async function getTekmetricConnection(shopId) {
  const { data, error } = await supabase.rpc('get_tekmetric_connection', {
    p_shop_id: shopId
  });

  if (error) {
    console.error('Failed to get Tekmetric connection:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Trigger Squad agents after successful sync
 * Import triggers here to avoid circular dependency
 */
export async function triggerSquadAgents(eventType, shopId, syncedData) {
  // Dynamic import to avoid circular dependencies
  const { default: triggers } = await import('./tekmetric-triggers.js');

  let agentTriggers = [];

  if (eventType.startsWith('repair_order.')) {
    // Check if new RO (not just update)
    if (eventType === 'repair_order.created' || eventType === 'repair_order.updated') {
      agentTriggers = await triggers.triggerAgentsOnNewRO({
        shopId,
        repairOrder: syncedData
      });
    }

    // Check if high-value completion
    if (syncedData.status === 'complete' && syncedData.total_amount >= 500) {
      const highValueTriggers = await triggers.triggerAgentsOnHighValueRO({
        shopId,
        repairOrder: syncedData
      });
      agentTriggers = [...agentTriggers, ...highValueTriggers];
    }
  } else if (eventType.startsWith('payment.')) {
    agentTriggers = await triggers.triggerAgentsOnPayment({
      shopId,
      paymentData: syncedData,
      repairOrderId: syncedData.repair_order_id
    });
  } else if (eventType.startsWith('customer.')) {
    // Check if customer returning after absence
    if (syncedData.last_service_date) {
      const daysSince = Math.floor((Date.now() - new Date(syncedData.last_service_date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 180) {
        agentTriggers = await triggers.triggerAgentsOnCustomerReturn({
          shopId,
          customerId: syncedData.internal_customer_id,
          daysSinceLastVisit: daysSince
        });
      }
    }
  }

  return agentTriggers;
}

export default {
  validateTekmetricSignature,
  logTekmetricWebhook,
  syncTekmetricRepairOrder,
  syncTekmetricCustomer,
  syncTekmetricVehicle,
  recordSyncError,
  getTekmetricConnection,
  triggerSquadAgents
};



















