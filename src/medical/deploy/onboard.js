import { createClient } from '@supabase/supabase-js';
import { provisionAgents } from './provision-agents.js';
import { setupEHRIntegration } from './ehr-connect.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Clinic Onboarding Module
 * Automates clinic setup for Week 1 deployment
 */

/**
 * Generate BAA (Business Associate Agreement) document
 * Stub for now - in production would generate actual BAA PDF
 */
async function generateBAA(clinicName, contactEmail) {
  // In production: Generate PDF, sign, store
  const baaId = `baa_${Date.now()}`;
  
  await supabase
    .from('baa_documents')
    .insert({
      clinic_name: clinicName,
      contact_email: contactEmail,
      status: 'pending_signature',
      created_at: new Date().toISOString()
    });

  // Send BAA for signature (stub)
  console.log(`BAA generated for ${clinicName}, sending to ${contactEmail} for signature`);
  
  return baaId;
}

/**
 * Provision phone number for M-OTTO
 * Stub - in production would integrate with RingCentral/Twilio
 */
async function provisionPhoneNumber(clinicId) {
  // In production: Request phone number from provider
  const phoneNumber = `+1-555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
  // Phone numbers stored in medical_clinics.phone_number field
  // No separate table needed

  return phoneNumber;
}

/**
 * Send onboarding email to clinic admin
 */
async function sendOnboardingEmail(email, data) {
  // In production: Use SendGrid/AWS SES
  console.log(`Sending onboarding email to ${email}`, data);
  
  // Log email send
  await supabase
    .from('onboarding_emails')
    .insert({
      recipient: email,
      email_type: 'welcome',
      data: data,
      sent_at: new Date().toISOString()
    });

  return true;
}

/**
 * Main onboarding function
 * @param {Object} clinic - Clinic data
 * @returns {Promise<Object>} Created clinic record
 */
export async function onboardClinic(clinic) {
  const { name, locations, ehr_system, contact_email, address, phone } = clinic;

  try {
    // Step 1: Create clinic record
    const { data: clinicRecord, error: clinicError } = await supabase
      .from('clinics')
      .insert({
        name,
        locations_count: locations || 1,
        ehr_system: ehr_system || 'unknown',
        contact_email,
        address: address || null,
        phone: phone || null,
        status: 'onboarding',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (clinicError) {
      throw clinicError;
    }

    // Step 2: Generate BAA
    const baaId = await generateBAA(name, contact_email);

    // Step 3: Configure agents for this clinic
    await provisionAgents(clinicRecord.id, {
      m_otto: true,
      m_cal: true,
      m_rex: true,
      m_patient: true,
      m_miles: true
    });

    // Step 4: Set up EHR integration stub
    await setupEHRIntegration(clinicRecord.id, ehr_system || 'unknown');

    // Step 5: Configure phone number for M-OTTO
    const phoneNumber = await provisionPhoneNumber(clinicRecord.id);

    // Step 6: Update clinic status
    await supabase
      .from('medical_clinics')
      .update({
        status: 'active',
        phone_number: phoneNumber,
        baa_id: baaId
      })
      .eq('id', clinicRecord.id);

    // Step 7: Send welcome email
    await sendOnboardingEmail(contact_email, {
      clinic_id: clinicRecord.id,
      clinic_name: name,
      dashboard_url: `https://app.autointelgtp.com/clinics/${clinicRecord.id}`,
      training_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
      phone_number: phoneNumber
    });

    return {
      ...clinicRecord,
      phone_number: phoneNumber,
      baa_id: baaId,
      status: 'active'
    };
  } catch (error) {
    console.error('Clinic onboarding error:', error);
    throw error;
  }
}

/**
 * Batch onboard multiple clinics
 */
export async function batchOnboardClinics(clinics) {
  const results = [];

  for (const clinic of clinics) {
    try {
      const result = await onboardClinic(clinic);
      results.push({ success: true, clinic: result });
    } catch (error) {
      results.push({ success: false, clinic: clinic.name, error: error.message });
    }
  }

  return results;
}












