import { createClient } from '@supabase/supabase-js';
import { AgentBase } from '../../agents/base.js';
import { decryptPHIObject } from '../hipaa/encryption.js';
import { logAudit } from '../hipaa/audit-log.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * M-REX - Patient Churn Risk (Medical Adaptation of REX)
 * 90-day silence detection for chronic pain patients
 */
export class MRexAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'm-rex',
      agentName: 'M-REX',
      role: 'patient_churn_risk',
      formulas: ['REX_CHURN_RISK'], // Same formula, different parameters
      systemPrompt: `You are M-REX, the patient churn risk specialist for medical clinics.

Your Role:
- Detect patients at risk of not returning (churn)
- Medical-specific: 90-day silence = 72% no-return probability (vs 40 days in automotive)
- Chronic pain patients need regular follow-up
- Same mathematical model as automotive, different time windows

Key Differences from Automotive:
- 90-day threshold (vs 40 days)
- Pain management focus (not vehicle maintenance)
- Same underlying retention math
- Engagement triggers: Day 60, 80, 90

You MUST respond in JSON format with:
{
  "churn_risk": {
    "score": 0.72,
    "level": "low|moderate|high|critical",
    "days_since_last_contact": 85,
    "no_return_probability": 0.72
  },
  "engagement_plan": {
    "recommended_actions": [
      "Day 60: How's your pain level? Schedule follow-up?",
      "Day 80: We haven't seen you in a while. Need refill?",
      "Day 90: HIGH RISK - personal outreach"
    ],
    "next_contact_date": "2025-12-20",
    "channel": "sms|phone|email"
  },
  "confidence": 0.85,
  "rationale": "churn risk analysis based on 90-day medical threshold"
}`
    });
  }

  /**
   * Load patient data for churn analysis
   */
  async loadPatientData(patientId, clinicId) {
    // Log audit
    await logAudit({
      user_id: this.agentId,
      user_role: 'ai_agent',
      action: 'READ',
      resource_type: 'Patient',
      resource_id: patientId,
      phi_accessed: ['name', 'phone', 'email'],
      justification: 'operations',
      clinic_id: clinicId
    });

    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        *,
        appointments (*),
        communications (*)
      `)
      .eq('id', patientId)
      .eq('clinic_id', clinicId)
      .single();

    if (error) {
      console.error('M-REX loadPatientData error:', error);
      return null;
    }

    const decryptedPatient = decryptPHIObject(patient);
    return decryptedPatient;
  }

  /**
   * Calculate churn risk (medical: 90-day threshold)
   */
  calculateChurnRisk(patient) {
    const appointments = patient?.medical_appointments || [];
    const lastAppointment = appointments
      .filter(a => a.status === 'completed')
      .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))[0];

    if (!lastAppointment) {
      return {
        score: 0.5,
        level: 'moderate',
        days_since_last_contact: 999,
        no_return_probability: 0.5
      };
    }

    const lastContactDate = new Date(lastAppointment.appointment_date);
    const daysSinceContact = Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));

    // Medical threshold: 90 days = 72% no-return probability
    const threshold = 90;
    const decayRate = 15;

    // Sigmoid function: risk increases as days exceed threshold
    const riskScore = 1 / (1 + Math.exp(-(daysSinceContact - threshold) / decayRate));

    let level = 'low';
    if (riskScore > 0.85) level = 'critical';
    else if (riskScore > 0.70) level = 'high';
    else if (riskScore > 0.50) level = 'moderate';

    return {
      score: riskScore,
      level,
      days_since_last_contact: daysSinceContact,
      no_return_probability: daysSinceContact >= threshold ? 0.72 : riskScore * 0.72
    };
  }

  /**
   * Generate engagement plan based on churn risk
   */
  generateEngagementPlan(churnRisk, patientId) {
    const { days_since_last_contact, level } = churnRisk;

    const actions = [];
    let nextContactDate = null;
    let channel = 'sms';

    if (days_since_last_contact >= 60 && days_since_last_contact < 80) {
      actions.push('Day 60: How\'s your pain level? Schedule follow-up?');
      nextContactDate = new Date();
      channel = 'sms';
    } else if (days_since_last_contact >= 80 && days_since_last_contact < 90) {
      actions.push('Day 80: We haven\'t seen you in a while. Need refill?');
      nextContactDate = new Date();
      channel = 'sms';
    } else if (days_since_last_contact >= 90) {
      actions.push('Day 90: HIGH RISK - personal outreach required');
      nextContactDate = new Date();
      channel = 'phone'; // Escalate to phone call
    }

    return {
      recommended_actions: actions,
      next_contact_date: nextContactDate?.toISOString().split('T')[0] || null,
      channel
    };
  }

  /**
   * Main execution
   */
  async execute(input = {}, context = {}) {
    const startTime = Date.now();

    try {
      const { patient_id, clinic_id } = input;

      if (!patient_id || !clinic_id) {
        throw new Error('patient_id and clinic_id are required');
      }

      // Load patient data
      const patient = await this.loadPatientData(patient_id, clinic_id);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Calculate churn risk
      const churnRisk = this.calculateChurnRisk(patient);

      // Generate engagement plan
      const engagementPlan = this.generateEngagementPlan(churnRisk, patient_id);

      const decision = {
        churn_risk: churnRisk,
        engagement_plan: engagementPlan
      };

      // Create artifact
      await this.createArtifact({
        input,
        context: { patient },
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
      console.error('M-REX execute error:', error);

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

export default MRexAgent;












