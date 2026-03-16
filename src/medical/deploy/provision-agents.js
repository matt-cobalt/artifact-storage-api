import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Agent Provisioning Module
 * Provisions medical agents for each clinic
 */

/**
 * Provision agents for a clinic
 * @param {string} clinicId - Clinic ID
 * @param {Object} agents - Agent configuration
 */
export async function provisionAgents(clinicId, agents) {
  const provisions = [];

  // M-OTTO: Patient Intake & Scheduling
  if (agents.m_otto) {
    provisions.push(
      supabase.from('agent_instances').insert({
        clinic_id: clinicId,
        agent_type: 'M-OTTO',
        agent_id: 'm-otto',
        status: 'active',
        config: {
          phone_enabled: true,
          sms_enabled: true,
          web_enabled: true,
          '48_hour_confirmation': true,
          after_hours_enabled: true
        },
        created_at: new Date().toISOString()
      })
    );
  }

  // M-CAL: Revenue Cycle Specialist
  if (agents.m_cal) {
    provisions.push(
      supabase.from('agent_instances').insert({
        clinic_id: clinicId,
        agent_type: 'M-CAL',
        agent_id: 'm-cal',
        status: 'active',
        config: {
          fee_schedules: ['medicare', 'commercial', 'self_pay'],
          prior_auth_check: true,
          copay_optimization: true
        },
        created_at: new Date().toISOString()
      })
    );
  }

  // M-REX: Patient Churn Risk
  if (agents.m_rex) {
    provisions.push(
      supabase.from('agent_instances').insert({
        clinic_id: clinicId,
        agent_type: 'M-REX',
        agent_id: 'm-rex',
        status: 'active',
        config: {
          churn_threshold_days: 90,
          engagement_triggers: [60, 80, 90],
          risk_levels: ['low', 'moderate', 'high', 'critical']
        },
        created_at: new Date().toISOString()
      })
    );
  }

  // M-PATIENT: Patient Intelligence
  if (agents.m_patient) {
    provisions.push(
      supabase.from('agent_instances').insert({
        clinic_id: clinicId,
        agent_type: 'M-PATIENT',
        agent_id: 'm-patient',
        status: 'active',
        config: {
          care_gap_detection: true,
          medication_adherence_tracking: true,
          outcome_tracking: true
        },
        created_at: new Date().toISOString()
      })
    );
  }

  // M-MILES: Patient Engagement
  if (agents.m_miles) {
    provisions.push(
      supabase.from('agent_instances').insert({
        clinic_id: clinicId,
        agent_type: 'M-MILES',
        agent_id: 'm-miles',
        status: 'active',
        config: {
          post_appointment_followup: [1, 7, 30], // Days
          educational_content: true,
          satisfaction_surveys: true,
          nps_tracking: true
        },
        created_at: new Date().toISOString()
      })
    );
  }

  // Execute all provisions
  const results = await Promise.allSettled(provisions);

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return {
    clinic_id: clinicId,
    agents_provisioned: successful,
    agents_failed: failed,
    total: provisions.length
  };
}

/**
 * Get agent instances for a clinic
 */
export async function getClinicAgents(clinicId) {
  const { data, error } = await supabase
    .from('medical_agent_instances')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('status', 'active');

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Update agent configuration
 */
export async function updateAgentConfig(clinicId, agentId, config) {
  const { data, error } = await supabase
    .from('medical_agent_instances')
    .update({
      config,
      updated_at: new Date().toISOString()
    })
    .eq('clinic_id', clinicId)
    .eq('agent_id', agentId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Deactivate agent for clinic
 */
export async function deactivateAgent(clinicId, agentId) {
  const { data, error } = await supabase
    .from('medical_agent_instances')
    .update({
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('clinic_id', clinicId)
    .eq('agent_id', agentId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}












