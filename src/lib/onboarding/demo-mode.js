/**
 * Demo Mode System
 * Generates synthetic data for shops without Tekmetric integration
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateDemoData } from './data-importer.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Enable demo mode for shop
 * @param {string} shopId - Shop ID
 * @param {string} onboardingId - Onboarding ID
 * @returns {Promise<Object>} Demo mode result
 */
export async function enableDemoMode(shopId, onboardingId) {
  try {
    // Create demo import job
    const { data: importJob, error: jobError } = await supabase
      .from('data_import_jobs')
      .insert({
        shop_id: shopId,
        onboarding_id: onboardingId,
        import_type: 'demo',
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create demo import job: ${jobError.message}`);
    }

    // Generate demo data
    const result = await generateDemoData(shopId, importJob.id);

    // Mark shop as demo mode
    await supabase
      .from('shops')
      .update({ 
        metadata: { demo_mode: true, demo_enabled_at: new Date().toISOString() }
      })
      .eq('id', shopId);

    return {
      success: true,
      import_job_id: importJob.id,
      demo_data_generated: true,
      records_imported: result.imported_records,
      message: 'Demo mode enabled with synthetic data'
    };
  } catch (error) {
    console.error('Enable demo mode error:', error);
    throw error;
  }
}

/**
 * Upgrade from demo mode to real data
 * @param {string} shopId - Shop ID
 * @returns {Promise<Object>} Upgrade result
 */
export async function upgradeFromDemoMode(shopId) {
  try {
    // Mark shop as no longer in demo mode
    await supabase
      .from('shops')
      .update({ 
        metadata: { 
          demo_mode: false,
          upgraded_at: new Date().toISOString()
        }
      })
      .eq('id', shopId);

    return {
      success: true,
      message: 'Upgraded from demo mode. Connect Tekmetric to import real data.'
    };
  } catch (error) {
    console.error('Upgrade from demo mode error:', error);
    throw error;
  }
}

export default {
  enableDemoMode,
  upgradeFromDemoMode
};



















