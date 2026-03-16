import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * HIPAA Consent Management Module
 * Manages patient consent for various purposes (treatment, payment, operations, marketing)
 */

/**
 * Consent types per HIPAA
 */
export const ConsentType = {
  TREATMENT: 'treatment',       // Required for providing care
  PAYMENT: 'payment',           // Required for billing
  OPERATIONS: 'operations',     // Required for internal operations
  MARKETING: 'marketing'        // Optional - requires explicit consent
};

/**
 * Check if patient has given consent for a specific purpose
 * @param {string} patientId - Patient ID
 * @param {ConsentType} purpose - Purpose (treatment, payment, operations, marketing)
 * @returns {Promise<boolean>} True if consent granted
 */
export async function checkConsent(patientId, purpose) {
  if (!patientId || !purpose) {
    return false;
  }

  // Treatment, payment, and operations are implied consent for HIPAA
  // (patient providing info implies consent)
  // But we track explicit consents for marketing
  if (purpose === ConsentType.TREATMENT || 
      purpose === ConsentType.PAYMENT || 
      purpose === ConsentType.OPERATIONS) {
    // For these, check if consent was explicitly revoked
    const { data: revoked } = await supabase
      .from('consents')
      .select('revoked_at')
      .eq('patient_id', patientId)
      .eq('consent_type', purpose)
      .not('revoked_at', 'is', null)
      .single();

    // If not revoked, consent is implied
    return !revoked;
  }

  // For marketing, require explicit consent
  if (purpose === ConsentType.MARKETING) {
  const { data: consent } = await supabase
    .from('medical_consents')
    .select('granted, revoked_at')
    .eq('patient_id', patientId)
    .eq('consent_type', purpose)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false })
    .limit(1)
    .single();

    return consent?.granted === true;
  }

  return false;
}

/**
 * Grant consent for a patient
 * @param {Object} consentData - Consent data
 * @param {string} consentData.patient_id - Patient ID
 * @param {ConsentType} consentData.consent_type - Type of consent
 * @param {boolean} consentData.granted - Whether consent is granted
 * @param {string} consentData.signature - Digital signature (optional)
 * @param {string} consentData.witness - Witness name (optional)
 * @returns {Promise<Object>} Created consent record
 */
export async function grantConsent(consentData) {
  const { patient_id, consent_type, granted = true, signature, witness } = consentData;

  if (!patient_id || !consent_type) {
    throw new Error('patient_id and consent_type are required');
  }

  const { data, error } = await supabase
    .from('consents')
    .insert({
      patient_id,
      consent_type,
      granted,
      granted_at: new Date().toISOString(),
      signature: signature || null,
      witness: witness || null,
      revoked_at: null
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Revoke consent for a patient
 * @param {string} patientId - Patient ID
 * @param {ConsentType} consentType - Type of consent to revoke
 * @returns {Promise<Object>} Updated consent record
 */
export async function revokeConsent(patientId, consentType) {
  if (!patientId || !consentType) {
    throw new Error('patient_id and consent_type are required');
  }

  // Find the most recent consent
  const { data: existing } = await supabase
    .from('medical_consents')
    .select('*')
    .eq('patient_id', patientId)
    .eq('consent_type', consentType)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false })
    .limit(1)
    .single();

  if (!existing) {
    throw new Error('No active consent found to revoke');
  }

  // Update to revoke
  const { data, error } = await supabase
    .from('consents')
    .update({
      revoked_at: new Date().toISOString()
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get all consents for a patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<Array>} List of consent records
 */
export async function getPatientConsents(patientId) {
  const { data, error } = await supabase
    .from('medical_consents')
    .select('*')
    .eq('patient_id', patientId)
    .order('granted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Middleware to check consent before action
 * @param {ConsentType} requiredConsent - Required consent type
 * @returns {Function} Express middleware
 */
export function requireConsentMiddleware(requiredConsent) {
  return async (req, res, next) => {
    const patientId = req.params.patient_id || req.body.patient_id;

    if (!patientId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'patient_id is required for consent check'
      });
    }

    const hasConsent = await checkConsent(patientId, requiredConsent);

    if (!hasConsent) {
      return res.status(403).json({
        error: 'Consent Required',
        message: `Patient consent for ${requiredConsent} is required`,
        consent_type: requiredConsent
      });
    }

    next();
  };
}












