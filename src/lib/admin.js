/**
 * Admin Functions
 * Shop management, user management, usage tracking, benchmarking
 * NOTE: These are backend-only functions (not UI components)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Create a new shop
 * @param {Object} params
 * @param {string} params.name - Shop name
 * @param {string} params.ownerEmail - Owner email (must match auth.users email)
 * @param {string} params.plan - Plan tier (trial, basic, pro, enterprise)
 * @returns {Promise<Object>} Created shop
 */
export async function createShop({ name, ownerEmail, plan = 'trial' }) {
  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const { data: shop, error } = await supabase
    .from('shops')
    .insert({
      shop_name: name,
      slug,
      owner_email: ownerEmail,
      plan,
      billing_status: 'active',
      activated_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create shop: ${error.message}`);
  }

  // Find user by email and associate
  const { data: user } = await supabase.auth.admin.getUserByEmail(ownerEmail);
  if (user?.user?.id) {
    await supabase
      .from('shop_users')
      .insert({
        shop_id: shop.id,
        user_id: user.user.id,
        role: 'owner'
      });
  }

  return shop;
}

/**
 * List all shops with filters
 * @param {Object} filters
 * @param {string} filters.plan - Filter by plan
 * @param {string} filters.billing_status - Filter by billing status
 * @param {number} filters.limit - Limit results
 * @param {number} filters.offset - Offset for pagination
 * @returns {Promise<Array>} Array of shops
 */
export async function listShops(filters = {}) {
  let query = supabase
    .from('shops')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.plan) {
    query = query.eq('plan', filters.plan);
  }

  if (filters.billing_status) {
    query = query.eq('billing_status', filters.billing_status);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list shops: ${error.message}`);
  }

  return data || [];
}

/**
 * Get shop details with usage stats
 * @param {string} shopId - Shop UUID
 * @returns {Promise<Object>} Shop details with usage
 */
export async function getShopDetails(shopId) {
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single();

  if (shopError) {
    throw new Error(`Failed to get shop: ${shopError.message}`);
  }

  // Get today's usage
  const { data: todayUsage } = await supabase
    .from('shop_usage')
    .select('*')
    .eq('shop_id', shopId)
    .eq('date', new Date().toISOString().split('T')[0])
    .single();

  // Get this month's usage (sum)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const { data: monthlyUsage } = await supabase
    .from('shop_usage')
    .select('agent_executions, api_calls, sms_sent, storage_mb, compute_minutes, webhook_events')
    .eq('shop_id', shopId)
    .gte('date', startOfMonth.toISOString().split('T')[0]);

  const monthlyTotal = monthlyUsage?.reduce((acc, day) => ({
    agent_executions: acc.agent_executions + day.agent_executions,
    api_calls: acc.api_calls + day.api_calls,
    sms_sent: acc.sms_sent + day.sms_sent,
    storage_mb: acc.storage_mb + day.storage_mb,
    compute_minutes: acc.compute_minutes + day.compute_minutes,
    webhook_events: acc.webhook_events + day.webhook_events
  }), {
    agent_executions: 0,
    api_calls: 0,
    sms_sent: 0,
    storage_mb: 0,
    compute_minutes: 0,
    webhook_events: 0
  }) || {};

  // Get shop users
  const { data: users } = await supabase
    .from('shop_users')
    .select('user_id, role, permissions')
    .eq('shop_id', shopId);

  return {
    ...shop,
    usage: {
      today: todayUsage || {},
      monthly: monthlyTotal
    },
    users: users || []
  };
}

/**
 * Update shop settings
 * @param {string} shopId - Shop UUID
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Updated shop
 */
export async function updateShopSettings(shopId, settings) {
  const { data: shop, error } = await supabase
    .from('shops')
    .update({
      ...settings,
      updated_at: new Date().toISOString()
    })
    .eq('id', shopId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update shop settings: ${error.message}`);
  }

  return shop;
}

/**
 * Deactivate shop (suspend access)
 * @param {string} shopId - Shop UUID
 * @param {string} reason - Reason for deactivation
 * @returns {Promise<Object>} Updated shop
 */
export async function deactivateShop(shopId, reason = 'Admin deactivation') {
  const { data: shop, error } = await supabase
    .from('shops')
    .update({
      billing_status: 'suspended',
      updated_at: new Date().toISOString(),
      settings: { deactivation_reason: reason }
    })
    .eq('id', shopId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to deactivate shop: ${error.message}`);
  }

  return shop;
}

/**
 * Get shop usage for billing
 * @param {string} shopId - Shop UUID
 * @param {Object} dateRange - { start_date, end_date }
 * @returns {Promise<Array>} Usage records
 */
export async function getShopUsage(shopId, dateRange = {}) {
  let query = supabase
    .from('shop_usage')
    .select('*')
    .eq('shop_id', shopId)
    .order('date', { ascending: false });

  if (dateRange.start_date) {
    query = query.gte('date', dateRange.start_date);
  }

  if (dateRange.end_date) {
    query = query.lte('date', dateRange.end_date);
  }

  // Default to last 30 days
  if (!dateRange.start_date && !dateRange.end_date) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query.gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get shop usage: ${error.message}`);
  }

  return data || [];
}

/**
 * Compare shops for benchmarking
 * @param {Array<string>} shopIds - Array of shop UUIDs
 * @param {string} metric - Metric to compare (revenue, retention_rate, avg_ticket, etc.)
 * @param {string} dateRange - Date range for comparison
 * @returns {Promise<Array>} Comparison data
 */
export async function compareShops(shopIds, metric = 'total_revenue', dateRange = {}) {
  let query = supabase
    .from('shop_metrics')
    .select('shop_id, date, ' + metric)
    .in('shop_id', shopIds)
    .order('date', { ascending: false });

  if (dateRange.start_date) {
    query = query.gte('date', dateRange.start_date);
  }

  if (dateRange.end_date) {
    query = query.lte('date', dateRange.end_date);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to compare shops: ${error.message}`);
  }

  // Aggregate by shop
  const comparison = shopIds.map(shopId => {
    const shopMetrics = data?.filter(m => m.shop_id === shopId) || [];
    const avgValue = shopMetrics.length > 0
      ? shopMetrics.reduce((sum, m) => sum + (m[metric] || 0), 0) / shopMetrics.length
      : 0;
    const maxValue = shopMetrics.length > 0
      ? Math.max(...shopMetrics.map(m => m[metric] || 0))
      : 0;
    const minValue = shopMetrics.length > 0
      ? Math.min(...shopMetrics.map(m => m[metric] || 0))
      : 0;

    return {
      shop_id: shopId,
      metric,
      average: avgValue,
      max: maxValue,
      min: minValue,
      data_points: shopMetrics.length
    };
  });

  return comparison;
}

/**
 * Get industry average for benchmarking
 * @param {string} metric - Metric name
 * @param {string} plan - Plan tier to compare (optional)
 * @returns {Promise<Object>} Industry average statistics
 */
export async function getIndustryAverage(metric = 'total_revenue', plan = null) {
  let query = supabase
    .from('shop_metrics')
    .select('date, ' + metric);

  if (plan) {
    query = query
      .select('date, ' + metric + ', shops!inner(plan)')
      .eq('shops.plan', plan);
  }

  // Get last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  query = query.gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get industry average: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return {
      average: 0,
      median: 0,
      p25: 0,
      p75: 0,
      sample_size: 0
    };
  }

  const values = data.map(d => d[metric] || 0).sort((a, b) => a - b);
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const median = values[Math.floor(values.length / 2)];
  const p25 = values[Math.floor(values.length * 0.25)];
  const p75 = values[Math.floor(values.length * 0.75)];

  return {
    average,
    median,
    p25,
    p75,
    sample_size: values.length
  };
}

export default {
  createShop,
  listShops,
  getShopDetails,
  updateShopSettings,
  deactivateShop,
  getShopUsage,
  compareShops,
  getIndustryAverage
};



















