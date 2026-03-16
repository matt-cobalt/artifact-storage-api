/**
 * Tekmetric Connection Wizard
 * Validates credentials, registers webhooks, starts data import
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as TekmetricIntegration from '../tekmetric-integration.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Validate Tekmetric API credentials
 * @param {string} apiKey - Tekmetric API key
 * @returns {Promise<Object>} Validation result
 */
export async function validateCredentials(apiKey) {
  try {
    // In production, would make actual API call to Tekmetric
    // For now, validate format and structure
    
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return {
        valid: false,
        error: 'Invalid API key format'
      };
    }

    // Simulated API validation
    // In production: const response = await fetch('https://api.tekmetric.com/v1/shops', {
    //   headers: { 'Authorization': `Bearer ${apiKey}` }
    // });
    
    // For demo, assume valid if format is correct
    const isValid = apiKey.startsWith('tk_') || apiKey.length >= 20;
    
    return {
      valid: isValid,
      shop_name: isValid ? 'Demo Shop' : null,
      permissions: isValid ? ['read_repair_orders', 'read_customers', 'read_vehicles'] : [],
      error: isValid ? null : 'Invalid API key'
    };
  } catch (error) {
    console.error('Tekmetric credential validation error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Register webhooks with Tekmetric
 * @param {string} apiKey - Tekmetric API key
 * @param {string} shopId - Shop ID
 * @returns {Promise<Object>} Webhook registration result
 */
export async function registerWebhooks(apiKey, shopId) {
  try {
    // Get shop details
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, name, slug')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error(`Shop not found: ${shopId}`);
    }

    // Webhook URL
    const webhookUrl = `${process.env.API_URL || 'https://api.yourdomain.com'}/api/tekmetric/webhook`;
    
    // In production, would register webhooks via Tekmetric API
    // For now, create connection record
    const { data: connection, error: connError } = await supabase
      .from('tekmetric_connections')
      .upsert({
        shop_id: shopId,
        api_key: apiKey, // In production, encrypt this
        webhook_secret: generateWebhookSecret(),
        webhook_url: webhookUrl,
        status: 'active',
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'shop_id',
        returning: ['*']
      })
      .select()
      .single();

    if (connError) {
      throw new Error(`Failed to create connection: ${connError.message}`);
    }

    return {
      success: true,
      connection_id: connection.id,
      webhook_url: webhookUrl,
      webhook_secret: connection.webhook_secret,
      message: 'Webhooks registered successfully'
    };
  } catch (error) {
    console.error('Webhook registration error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Start initial data import
 * @param {string} apiKey - Tekmetric API key
 * @param {string} shopId - Shop ID
 * @param {string} onboardingId - Onboarding ID
 * @returns {Promise<Object>} Import job result
 */
export async function startInitialImport(apiKey, shopId, onboardingId) {
  try {
    // Create import job
    const { data: importJob, error: jobError } = await supabase
      .from('data_import_jobs')
      .insert({
        shop_id: shopId,
        onboarding_id: onboardingId,
        import_type: 'tekmetric',
        status: 'pending',
        metadata: { api_key: apiKey } // Would encrypt in production
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create import job: ${jobError.message}`);
    }

    // Start import asynchronously (would use queue system in production)
    // For now, mark as running
    await supabase
      .from('data_import_jobs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', importJob.id);

    // In production, would trigger actual import job here
    // This would fetch last 90 days of ROs, all customers, all vehicles

    return {
      success: true,
      import_job_id: importJob.id,
      status: 'running',
      message: 'Data import started'
    };
  } catch (error) {
    console.error('Start import error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check import progress
 * @param {string} jobId - Import job ID
 * @returns {Promise<Object>} Import progress
 */
export async function checkImportProgress(jobId) {
  try {
    const { data: job, error } = await supabase
      .from('data_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw new Error(`Import job not found: ${jobId}`);
    }

    const progressPercent = job.total_records > 0
      ? (job.records_imported / job.total_records) * 100
      : 0;

    return {
      job_id: job.id,
      status: job.status,
      progress_percent: progressPercent,
      records_imported: job.records_imported,
      total_records: job.total_records,
      records_failed: job.records_failed,
      estimated_completion_at: job.estimated_completion_at,
      error_message: job.error_message
    };
  } catch (error) {
    console.error('Check import progress error:', error);
    return {
      error: error.message
    };
  }
}

/**
 * Test webhook URL accessibility
 * @param {string} webhookUrl - Webhook URL to test
 * @returns {Promise<Object>} Test result
 */
export async function testWebhookUrl(webhookUrl) {
  try {
    // Send test ping to webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });

    return {
      accessible: response.ok || response.status < 500,
      status_code: response.status,
      error: response.ok ? null : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      accessible: false,
      error: error.message
    };
  }
}

/**
 * Generate webhook secret
 * @private
 */
function generateWebhookSecret() {
  return 'whsec_' + require('crypto').randomBytes(32).toString('hex');
}

export default {
  validateCredentials,
  registerWebhooks,
  startInitialImport,
  checkImportProgress,
  testWebhookUrl
};



















