import { createClient } from '@supabase/supabase-js';
import { AgentBase } from '../../agents/base.js';
import { decryptPHIObject } from '../hipaa/encryption.js';
import { logAudit } from '../hipaa/audit-log.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * M-PATIENT - Patient Intelligence Agent (Medical Adaptation of VIN)
 * Patient history, care gap identification, medication adherence
 */
export class MPatientAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'm-patient',
      agentName: 'M-PATIENT',
      role: 'patient_intelligence',
      formulas: [], // No specific formulas, uses data analysis
      systemPrompt: `You are M-PATIENT, the patient intelligence specialist for medical clinics.

Your Role:
- Analyze patient history (visits, procedures, medications)
- Identify care gaps (overdue follow-ups, medication refills, pending results)
- Track medication adherence (refill dates, compliance)
- HIPAA-compliant patient intelligence

Key Features:
- Previous visits/procedures tracking
- Medication list and adherence
- Allergies and chronic conditions
- Care gap identification
- Outcome tracking

You MUST respond in JSON format with:
{
  "patient_profile": {
    "total_visits": 5,
    "last_visit": "2025-11-15",
    "primary_diagnosis": "chronic back pain",
    "current_medications": ["ibuprofen", "gabapentin"],
    "allergies": ["penicillin"]
  },
  "care_gaps": [
    {
      "type": "overdue_followup",
      "description": "Follow-up appointment overdue by 30 days",
      "recommended_action": "Schedule follow-up appointment",
      "priority": "high"
    }
  ],
  "medication_adherence": {
    "last_refill": "2025-11-20",
    "refill_due": "2025-12-20",
    "adherence_score": 0.95,
    "non_compliance_risk": "low"
  },
  "confidence": 0.90,
  "rationale": "patient intelligence analysis"
}`
    });
  }

  /**
   * Load patient data with full history
   */
  async loadPatientData(patientId, clinicId) {
    // Log audit
    await logAudit({
      user_id: this.agentId,
      user_role: 'ai_agent',
      action: 'READ',
      resource_type: 'Patient',
      resource_id: patientId,
      phi_accessed: ['name', 'dob', 'medical_record_number', 'diagnosis', 'medications'],
      justification: 'treatment',
      clinic_id: clinicId
    });

    const { data: patient, error } = await supabase
      .from('medical_patients')
      .select(`
        *,
        medical_appointments (*),
        medical_records (*)
      `)
      .eq('id', patientId)
      .eq('clinic_id', clinicId)
      .single();

    if (error) {
      console.error('M-PATIENT loadPatientData error:', error);
      return null;
    }

    return decryptPHIObject(patient);
  }

  /**
   * Identify care gaps
   */
  identifyCareGaps(patient) {
    const gaps = [];
    const appointments = patient?.appointments || [];
    const prescriptions = patient?.prescriptions || [];

    // Check for overdue follow-ups
    const lastVisit = appointments
      .filter(a => a.status === 'completed')
      .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))[0];

    if (lastVisit) {
      const daysSinceVisit = Math.floor(
        (Date.now() - new Date(lastVisit.appointment_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceVisit > 90 && lastVisit.follow_up_required) {
        gaps.push({
          type: 'overdue_followup',
          description: `Follow-up appointment overdue by ${daysSinceVisit - 90} days`,
          recommended_action: 'Schedule follow-up appointment',
          priority: 'high'
        });
      }
    }

    // Check medication refills
    for (const prescription of prescriptions) {
      const refillDate = new Date(prescription.last_refill_date);
      refillDate.setDate(refillDate.getDate() + prescription.days_supply);
      const daysUntilRefill = Math.floor((refillDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysUntilRefill < 7) {
        gaps.push({
          type: 'medication_refill_due',
          description: `${prescription.medication_name} refill due in ${daysUntilRefill} days`,
          recommended_action: 'Contact patient for refill authorization',
          priority: daysUntilRefill < 0 ? 'high' : 'medium'
        });
      }
    }

    return gaps;
  }

  /**
   * Calculate medication adherence
   */
  calculateMedicationAdherence(prescriptions) {
    // Prescriptions table not in medical schema - return placeholder
    // Would need medical_prescriptions table for full implementation
    return {
      last_refill: null,
      refill_due: null,
      adherence_score: null,
      non_compliance_risk: 'unknown'
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

      // Build patient profile
      const appointments = patient?.appointments || [];
      const lastVisit = appointments
        .filter(a => a.status === 'completed')
        .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))[0];

      const patientProfile = {
        total_visits: appointments.length,
        last_visit: lastVisit?.appointment_date || null,
        primary_diagnosis: patient.primary_diagnosis || 'Not specified',
        current_medications: [], // Prescriptions table not in schema
        allergies: [] // Allergies table not in schema
      };

      // Identify care gaps
      const careGaps = this.identifyCareGaps(patient);

      // Calculate medication adherence
      const medicationAdherence = this.calculateMedicationAdherence([]); // Prescriptions not in schema

      const decision = {
        patient_profile: patientProfile,
        care_gaps: careGaps,
        medication_adherence: medicationAdherence
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
      console.error('M-PATIENT execute error:', error);

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

export default MPatientAgent;












