/**
 * Onboarding API Routes
 * Handles shop signup, Tekmetric connection, data import, agent activation
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as Admin from '../lib/admin.js';
import * as TekmetricConnector from '../lib/onboarding/tekmetric-connector.js';
import * as DataImporter from '../lib/onboarding/data-importer.js';
import * as AgentActivator from '../lib/onboarding/agent-activator.js';
import * as OnboardingEmails from '../lib/onboarding/emails.js';
import * as DemoMode from '../lib/onboarding/demo-mode.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Onboarding steps configuration
 */
const ONBOARDING_STEPS = [
  'signup',
  'email_verified',
  'connect_tekmetric',
  'import_data',
  'configure_agents',
  'review_training',
  'test_agent',
  'complete'
];

/**
 * Start onboarding process
 */
export async function startOnboarding(email, shopName, phone) {
  try {
    // Create shop
    const shop = await Admin.createShop({
      name: shopName,
      ownerEmail: email,
      plan: 'trial'
    });

    // Create onboarding progress
    const { data: onboarding, error: onboardingError } = await supabase
      .from('onboarding_progress')
      .insert({
        shop_id: shop.id,
        current_step: 'signup',
        status: 'in_progress',
        steps_completed: ['signup'],
        steps_remaining: ONBOARDING_STEPS.slice(1)
      })
      .select()
      .single();

    if (onboardingError) {
      throw new Error(`Failed to create onboarding: ${onboardingError.message}`);
    }

    // Create checklist items
    const checklistItems = ONBOARDING_STEPS.map((step, index) => ({
      onboarding_id: onboarding.id,
      step_name: step,
      step_order: index + 1,
      status: index === 0 ? 'completed' : 'pending',
      help_text: getStepHelpText(step),
      video_url: getStepVideoUrl(step),
      documentation_url: getStepDocUrl(step)
    }));

    await supabase
      .from('onboarding_checklist')
      .insert(checklistItems);

    // Create metrics record
    await supabase
      .from('onboarding_metrics')
      .insert({
        shop_id: shop.id,
        onboarding_id: onboarding.id,
        conversion_funnel: { signup: new Date().toISOString() }
      });

    // Send welcome email
    const activationLink = `${process.env.APP_URL}/verify-email?token=${generateToken()}`;
    await OnboardingEmails.sendWelcomeEmail(email, shopName, activationLink);

    return {
      onboarding_id: onboarding.id,
      shop_id: shop.id,
      steps_remaining: ONBOARDING_STEPS.slice(1),
      activation_link: activationLink
    };
  } catch (error) {
    console.error('Start onboarding error:', error);
    throw error;
  }
}

/**
 * Connect Tekmetric
 */
export async function connectTekmetric(onboardingId, apiKey, webhookSecret) {
  try {
    // Get onboarding
    const { data: onboarding } = await supabase
      .from('onboarding_progress')
      .select('shop_id')
      .eq('id', onboardingId)
      .single();

    if (!onboarding) {
      throw new Error('Onboarding not found');
    }

    // Validate credentials
    const validation = await TekmetricConnector.validateCredentials(apiKey);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid Tekmetric credentials');
    }

    // Register webhooks
    const webhookResult = await TekmetricConnector.registerWebhooks(apiKey, onboarding.shop_id);
    if (!webhookResult.success) {
      throw new Error(webhookResult.error || 'Failed to register webhooks');
    }

    // Start initial import
    const importResult = await TekmetricConnector.startInitialImport(
      apiKey,
      onboarding.shop_id,
      onboardingId
    );

    // Update progress
    await supabase.rpc('update_onboarding_progress', {
      p_onboarding_id: onboardingId,
      p_step_name: 'connect_tekmetric',
      p_status: 'completed'
    });

    // Update metrics
    await supabase
      .from('onboarding_metrics')
      .update({
        tekmetric_connection_attempts: supabase.raw('tekmetric_connection_attempts + 1'),
        conversion_funnel: { connect_tekmetric: new Date().toISOString() }
      })
      .eq('onboarding_id', onboardingId);

    return {
      success: true,
      connection_status: 'connected',
      import_job_id: importResult.import_job_id
    };
  } catch (error) {
    console.error('Connect Tekmetric error:', error);
    throw error;
  }
}

/**
 * Get onboarding status
 */
export async function getOnboardingStatus(onboardingId) {
  try {
    const { data, error } = await supabase.rpc('get_onboarding_progress', {
      p_onboarding_id: onboardingId
    });

    if (error || !data || data.length === 0) {
      throw new Error('Onboarding not found');
    }

    return data[0];
  } catch (error) {
    console.error('Get onboarding status error:', error);
    throw error;
  }
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(onboardingId) {
  try {
    // Get onboarding
    const { data: onboarding } = await supabase
      .from('onboarding_progress')
      .select('shop_id, user_id')
      .eq('id', onboardingId)
      .single();

    if (!onboarding) {
      throw new Error('Onboarding not found');
    }

    // Activate agents
    const activationResult = await AgentActivator.activateAgents(onboarding.shop_id);

    // Update progress
    await supabase.rpc('update_onboarding_progress', {
      p_onboarding_id: onboardingId,
      p_step_name: 'complete',
      p_status: 'completed'
    });

    // Update metrics
    const { data: metrics } = await supabase
      .from('onboarding_metrics')
      .select('started_at')
      .eq('onboarding_id', onboardingId)
      .single();

    const timeToComplete = metrics?.started_at
      ? Math.floor((Date.now() - new Date(metrics.started_at).getTime()) / 1000)
      : null;

    await supabase
      .from('onboarding_metrics')
      .update({
        time_to_complete_seconds: timeToComplete,
        conversion_funnel: { complete: new Date().toISOString() }
      })
      .eq('onboarding_id', onboardingId);

    // Send completion email
    const { data: shop } = await supabase
      .from('shops')
      .select('name, owner_email')
      .eq('id', onboarding.shop_id)
      .single();

    if (shop?.owner_email) {
      // Would send completion email
      console.log(`[EMAIL] Onboarding complete email to ${shop.owner_email}`);
    }

    return {
      success: true,
      dashboard_url: `${process.env.APP_URL}/dashboard`,
      agents_activated: activationResult.agents_activated,
      next_steps: [
        'Explore your dashboard',
        'Test your first agent interaction',
        'Review training materials'
      ]
    };
  } catch (error) {
    console.error('Complete onboarding error:', error);
    throw error;
  }
}

/**
 * Enable demo mode
 */
export async function enableDemoModeForOnboarding(onboardingId) {
  try {
    const { data: onboarding } = await supabase
      .from('onboarding_progress')
      .select('shop_id')
      .eq('id', onboardingId)
      .single();

    if (!onboarding) {
      throw new Error('Onboarding not found');
    }

    const result = await DemoMode.enableDemoMode(onboarding.shop_id, onboardingId);

    // Update progress
    await supabase.rpc('update_onboarding_progress', {
      p_onboarding_id: onboardingId,
      p_step_name: 'import_data',
      p_status: 'completed'
    });

    return result;
  } catch (error) {
    console.error('Enable demo mode error:', error);
    throw error;
  }
}

/**
 * Get step help text
 */
function getStepHelpText(step) {
  const helpTexts = {
    signup: 'Create your account to get started',
    email_verified: 'Verify your email address',
    connect_tekmetric: 'Connect your Tekmetric account to import shop data',
    import_data: 'Import your historical data (last 90 days)',
    configure_agents: 'Set up your AI agents',
    review_training: 'Learn how to use your AI agents',
    test_agent: 'Test your first agent interaction',
    complete: 'You\'re all set! Start using Auto Intel GTP'
  };
  return helpTexts[step] || '';
}

/**
 * Get step video URL
 */
function getStepVideoUrl(step) {
  // In production, would return actual video URLs
  return step === 'review_training' ? 'https://youtube.com/watch?v=example' : null;
}

/**
 * Get step documentation URL
 */
function getStepDocUrl(step) {
  return `${process.env.APP_URL}/docs/onboarding/${step}`;
}

/**
 * Generate token
 */
function generateToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

export default {
  startOnboarding,
  connectTekmetric,
  getOnboardingStatus,
  completeOnboarding,
  enableDemoModeForOnboarding
};



















