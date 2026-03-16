import { createClient } from '@supabase/supabase-js';
import { AgentBase } from '../../agents/base.js';
import { decryptPHIObject } from '../hipaa/encryption.js';
import { logAudit } from '../hipaa/audit-log.js';
import { checkConsent, ConsentType } from '../hipaa/consent.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * M-MILES - Patient Engagement Agent (Medical Adaptation of MILES)
 * Post-appointment follow-up, educational content, satisfaction tracking
 */
export class MMilesAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'm-miles',
      agentName: 'M-MILES',
      role: 'patient_engagement',
      formulas: ['REX_CHURN_RISK', 'NCR_FORMULA', 'CLV_CALCULATION'],
      systemPrompt: `You are M-MILES, the patient engagement specialist for medical clinics.

Your Role:
- Post-appointment follow-up (Day 1, 7, 30)
- Educational content delivery (spine health, ergonomics, pain management)
- Satisfaction tracking (NPS surveys, provider ratings)
- Health outcome focus (not service satisfaction)

Key Differences from Automotive:
- Health outcome focus (not service satisfaction)
- Educational content (not promotional)
- Longer engagement cycles (chronic pain management)
- HIPAA-compliant communications

Engagement Sequence:
- Day 1: "How's your pain today?"
- Day 7: "Any improvement since treatment?"
- Day 30: "Ready to schedule next visit?"

You MUST respond in JSON format with:
{
  "engagement_plan": {
    "day_1_followup": {
      "scheduled": true,
      "message": "How's your pain today?",
      "channel": "sms"
    },
    "day_7_followup": {
      "scheduled": true,
      "message": "Any improvement since treatment?",
      "channel": "sms"
    },
    "day_30_followup": {
      "scheduled": true,
      "message": "Ready to schedule next visit?",
      "channel": "sms"
    }
  },
  "educational_content": {
    "recommended": ["spine health tips", "ergonomics guide"],
    "delivery_method": "email"
  },
  "satisfaction_survey": {
    "scheduled": true,
    "send_date": "2025-12-18",
    "type": "nps"
  },
  "confidence": 0.88,
  "rationale": "patient engagement strategy"
}`
    });
  }

  /**
   * Load patient data for engagement
   */
  async loadPatientData(patientId, clinicId) {
    // Check consent for marketing/engagement
    const hasConsent = await checkConsent(patientId, ConsentType.MARKETING);
    if (!hasConsent) {
      return null; // Can't engage without consent
    }

    // Log audit
    await logAudit({
      user_id: this.agentId,
      user_role: 'ai_agent',
      action: 'READ',
      resource_type: 'Patient',
      resource_id: patientId,
      phi_accessed: ['name', 'phone', 'email'],
      justification: 'marketing',
      clinic_id: clinicId
    });

    const { data: patient, error } = await supabase
      .from('medical_patients')
      .select(`
        *,
        medical_appointments (*),
        medical_patient_engagement (*)
      `)
      .eq('id', patientId)
      .eq('clinic_id', clinicId)
      .single();

    if (error) {
      console.error('M-MILES loadPatientData error:', error);
      return null;
    }

    return decryptPHIObject(patient);
  }

  /**
   * Create engagement plan after appointment
   */
  createEngagementPlan(appointment) {
    const appointmentDate = new Date(appointment.appointment_date);
    
    return {
      day_1_followup: {
        scheduled: true,
        message: "How's your pain today? We hope the treatment helped. If you have any concerns, please don't hesitate to reach out.",
        channel: 'sms',
        scheduled_for: new Date(appointmentDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
      },
      day_7_followup: {
        scheduled: true,
        message: 'Any improvement since your treatment? We\'d love to hear how you\'re doing.',
        channel: 'sms',
        scheduled_for: new Date(appointmentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      day_30_followup: {
        scheduled: true,
        message: 'Ready to schedule your next visit? Regular follow-ups are important for managing chronic pain.',
        channel: 'sms',
        scheduled_for: new Date(appointmentDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  }

  /**
   * Get recommended educational content
   */
  getEducationalContent(diagnosis) {
    const contentMap = {
      'back pain': ['spine health tips', 'ergonomics guide', 'back strengthening exercises'],
      'neck pain': ['neck posture guide', 'workstation ergonomics', 'neck stretches'],
      'chronic pain': ['pain management strategies', 'relaxation techniques', 'activity pacing']
    };

    return {
      recommended: contentMap[diagnosis?.toLowerCase()] || ['general health tips'],
      delivery_method: 'email'
    };
  }

  /**
   * Schedule satisfaction survey
   */
  scheduleSatisfactionSurvey(patientId, appointmentId) {
    const surveyDate = new Date();
    surveyDate.setDate(surveyDate.getDate() + 1); // Send 1 day after appointment

    return {
      scheduled: true,
      send_date: surveyDate.toISOString().split('T')[0],
      type: 'nps',
      patient_id: patientId,
      appointment_id: appointmentId
    };
  }

  /**
   * Main execution
   */
  async execute(input = {}, context = {}) {
    const startTime = Date.now();

    try {
      const { patient_id, clinic_id, appointment_id } = input;

      if (!patient_id || !clinic_id) {
        throw new Error('patient_id and clinic_id are required');
      }

      // Check consent
      const hasConsent = await checkConsent(patient_id, ConsentType.MARKETING);
      if (!hasConsent) {
        return {
          success: false,
          error: 'Patient has not consented to marketing communications',
          agent: this.agentId
        };
      }

      // Load patient data
      const patient = await this.loadPatientData(patient_id, clinic_id);
      if (!patient) {
        throw new Error('Patient not found or consent not granted');
      }

      // Get latest appointment
      const appointments = patient?.medical_appointments || [];
      const lastAppointment = appointments
        .filter(a => a.status === 'completed')
        .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))[0];

      if (!lastAppointment) {
        throw new Error('No completed appointments found');
      }

      // Create engagement plan
      const engagementPlan = this.createEngagementPlan(lastAppointment);

      // Get educational content
      const educationalContent = this.getEducationalContent(patient.primary_diagnosis);

      // Schedule satisfaction survey
      const satisfactionSurvey = this.scheduleSatisfactionSurvey(patient_id, lastAppointment.id);

      const decision = {
        engagement_plan: engagementPlan,
        educational_content: educationalContent,
        satisfaction_survey: satisfactionSurvey
      };

      // Schedule follow-ups in database
      for (const [key, followup] of Object.entries(engagementPlan)) {
        await supabase
          .from('scheduled_messages')
          .insert({
            patient_id,
            appointment_id: lastAppointment.id,
            message_type: key,
            message_content: followup.message,
            scheduled_for: followup.scheduled_for,
            channel: followup.channel,
            status: 'pending'
          });
      }

      // Create artifact
      await this.createArtifact({
        input,
        context: { patient, appointment: lastAppointment },
        decision,
        executionTime: Date.now() - startTime,
        success: true
      });

      return {
        success: true,
        agent: this.agentId,
        decision,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error) {
      console.error('M-MILES execute error:', error);

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

export default MMilesAgent;












