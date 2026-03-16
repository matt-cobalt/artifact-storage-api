import { createClient } from '@supabase/supabase-js';
import { AgentBase } from '../../agents/base.js';
import { encryptPHI, encryptPHIObject } from '../hipaa/encryption.js';
import { logAudit } from '../hipaa/audit-log.js';
import { checkConsent, ConsentType } from '../hipaa/consent.js';
import { Role, filterDataByRole } from '../hipaa/rbac.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * M-OTTO - Patient Intake Specialist (Medical Adaptation of OTTO)
 * 80% code reuse from automotive OTTO, adapted for medical context
 */
export class MOttoAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'm-otto',
      agentName: 'M-OTTO',
      role: 'patient_intake_specialist',
      formulas: ['CLV_CALCULATION', 'NCR_FORMULA', 'REX_CHURN_RISK'], // Same formulas, different context
      systemPrompt: `You are M-OTTO, the patient intake specialist for spine/pain management clinics.

Your Role:
- Schedule appointments 24/7 (same as automotive)
- Triage patient symptoms with appropriate medical disclaimers
- Collect insurance information (insurance provider, member ID, group number)
- Verify insurance eligibility (stub for now, will integrate with Availity/Change Healthcare)
- Coordinate with referring physicians
- Schedule imaging (MRI/X-ray) coordination
- Send 48-hour confirmation SMS (proven 32% no-show reduction in automotive)

MEDICAL DISCLAIMER (include in EVERY response):
"I'm scheduling your appointment. For medical emergencies, call 911. I'm an AI assistant and cannot provide medical advice."

Key Differences from Automotive:
- Collect insurance info (automotive doesn't need)
- Chief complaint instead of "vehicle issue"
- Pain level (1-10) instead of "urgency score"
- Medical disclaimer on every interaction
- HIPAA compliance required (all PHI encrypted)

You MUST respond in JSON format with:
{
  "greeting": "personalized greeting with medical disclaimer",
  "appointment_options": [
    {
      "date": "2025-12-20",
      "time": "10:00 AM",
      "provider": "Dr. Smith",
      "appointment_type": "consultation|follow-up|procedure",
      "available": true
    }
  ],
  "insurance_info_required": {
    "provider": "requested",
    "member_id": "requested",
    "group_number": "optional"
  },
  "patient_intake": {
    "chief_complaint": "back pain",
    "pain_level": 7,
    "duration": "2 weeks",
    "previous_treatment": true,
    "referring_physician": "Dr. Johnson"
  },
  "48_hour_confirmation": {
    "scheduled": true,
    "sms_will_send": "2025-12-18T10:00:00Z"
  },
  "follow_up_needed": false,
  "confidence": 0.88,
  "rationale": "summary of intake process"
}`
    });
  }

  /**
   * Load patient data (HIPAA-compliant)
   */
  async loadPatientData(patientId) {
    // Log audit before accessing PHI
    await logAudit({
      user_id: this.agentId,
      user_role: Role.AI_AGENT,
      action: 'READ',
      resource_type: 'Patient',
      resource_id: patientId,
      phi_accessed: ['name', 'phone', 'email', 'dob'],
      justification: 'treatment',
      clinic_id: null // Will be set from input
    });

    const { data: patient, error } = await supabase
      .from('medical_patients')
      .select(`
        *,
        medical_appointments (*),
        medical_records (*)
      `)
      .eq('id', patientId)
      .single();

    if (error) {
      console.error('M-OTTO loadPatientData error:', error);
      return null;
    }

    // Decrypt PHI fields for processing
    const { decryptPHIObject } = await import('../hipaa/encryption.js');
    const decryptedPatient = decryptPHIObject(patient);

    // Calculate metrics (same as automotive)
    const metrics = this.calculatePatientMetrics(decryptedPatient);

    return {
      ...decryptedPatient,
      metrics
    };
  }

  /**
   * Calculate patient metrics (adapted from automotive customer metrics)
   */
  calculatePatientMetrics(patient) {
    const appointments = patient?.appointments || [];
    const totalVisits = appointments.length;
    const completedVisits = appointments.filter(a => a.status === 'completed').length;

    const lastVisitDays = appointments.length > 0
      ? Math.floor((Date.now() - new Date(appointments[0].created_at)) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      total_visits: totalVisits,
      completed_visits: completedVisits,
      last_visit_days: lastVisitDays,
      no_show_rate: totalVisits > 0 ? (totalVisits - completedVisits) / totalVisits : 0
    };
  }

  /**
   * Process incoming call/SMS for appointment scheduling
   */
  async processCall(input) {
    const { from, message, clinic_id } = input;

    // Extract phone number
    const phoneNumber = from || input.phone;

    // Find patient by phone (HIPAA-compliant lookup)
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name, phone')
      .eq('phone', phoneNumber)
      .limit(1);

    let patient = patients?.[0] || null;

    // If new patient, create record (HIPAA-compliant)
    if (!patient) {
      // Encrypt PHI before storing
      const encryptedData = encryptPHIObject({
        phone: phoneNumber,
        name: 'New Patient', // Will be collected during intake
        created_at: new Date().toISOString()
      });

      const { data: newPatient, error } = await supabase
        .from('medical_patients')
        .insert({
          ...encryptedData,
          clinic_id: clinic_id || null
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      patient = newPatient;
    }

    // Parse message for symptoms/chief complaint
    const chiefComplaint = this.extractChiefComplaint(message);

    // Build response with medical disclaimer
    const response = {
      greeting: this.buildGreeting(patient, chiefComplaint),
      appointment_options: await this.getAvailableAppointments(clinic_id),
      insurance_info_required: {
        provider: 'requested',
        member_id: 'requested',
        group_number: 'optional'
      },
      patient_intake: {
        chief_complaint: chiefComplaint,
        pain_level: this.extractPainLevel(message),
        duration: this.extractDuration(message)
      },
      '48_hour_confirmation': {
        scheduled: true,
        sms_will_send: new Date(Date.now() + (48 - 2) * 60 * 60 * 1000).toISOString() // 48hrs before (assuming appt in 2 days)
      },
      medical_disclaimer: 'I\'m scheduling your appointment. For medical emergencies, call 911. I\'m an AI assistant and cannot provide medical advice.'
    };

    return response;
  }

  /**
   * Extract chief complaint from message
   */
  extractChiefComplaint(message) {
    const lowerMessage = message.toLowerCase();
    
    // Common pain complaints
    if (lowerMessage.includes('back pain') || lowerMessage.includes('back')) {
      return 'back pain';
    }
    if (lowerMessage.includes('neck pain') || lowerMessage.includes('neck')) {
      return 'neck pain';
    }
    if (lowerMessage.includes('headache')) {
      return 'headache';
    }
    if (lowerMessage.includes('joint') || lowerMessage.includes('knee') || lowerMessage.includes('shoulder')) {
      return 'joint pain';
    }

    return 'pain management consultation';
  }

  /**
   * Extract pain level from message (1-10 scale)
   */
  extractPainLevel(message) {
    // Look for pain level mentions
    const match = message.match(/pain[^\d]*(\d{1,2})/i) || message.match(/(\d{1,2})[^\d]*out[^\d]*10/i);
    if (match) {
      const level = parseInt(match[1], 10);
      return Math.min(10, Math.max(1, level));
    }

    // Default if not specified
    return null;
  }

  /**
   * Extract duration from message
   */
  extractDuration(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.match(/\d+\s*(day|days)/)) {
      return message.match(/\d+\s*(day|days)/)[0];
    }
    if (lowerMessage.match(/\d+\s*(week|weeks)/)) {
      return message.match(/\d+\s*(week|weeks)/)[0];
    }
    if (lowerMessage.match(/\d+\s*(month|months)/)) {
      return message.match(/\d+\s*(month|months)/)[0];
    }

    return 'not specified';
  }

  /**
   * Build personalized greeting with medical disclaimer
   */
  buildGreeting(patient, chiefComplaint) {
    const name = patient?.name ? `Hi ${patient.name.split(' ')[0]}, ` : '';
    const complaintText = chiefComplaint ? `I understand you're experiencing ${chiefComplaint}. ` : '';
    
    return `${name}${complaintText}I'm M-OTTO, your AI scheduling assistant. I'm scheduling your appointment. For medical emergencies, call 911. I'm an AI assistant and cannot provide medical advice. How can I help you today?`;
  }

  /**
   * Get available appointments for clinic
   */
  async getAvailableAppointments(clinicId, daysAhead = 14) {
    // Stub for now - will integrate with actual scheduling system
    const dates = [];
    const today = new Date();

    for (let i = 1; i <= daysAhead; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Skip weekends for now
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }

      dates.push({
        date: date.toISOString().split('T')[0],
        time: '10:00 AM',
        provider: 'Dr. Smith',
        appointment_type: 'consultation',
        available: true
      });

      dates.push({
        date: date.toISOString().split('T')[0],
        time: '2:00 PM',
        provider: 'Dr. Smith',
        appointment_type: 'consultation',
        available: true
      });
    }

    return dates.slice(0, 5); // Return first 5 options
  }

  /**
   * Schedule 48-hour confirmation SMS
   */
  async schedule48HourConfirmation(patientId, appointmentId) {
    // Calculate 48 hours before appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .select('appointment_date, appointment_time')
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      return;
    }

    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const confirmationTime = new Date(appointmentDateTime.getTime() - 48 * 60 * 60 * 1000);

    // Schedule SMS (stub - will integrate with RingCentral)
    await supabase
      .from('scheduled_messages')
      .insert({
        patient_id: patientId,
        appointment_id: appointmentId,
        message_type: '48_hour_confirmation',
        scheduled_for: confirmationTime.toISOString(),
        status: 'pending'
      });

    return confirmationTime;
  }

  /**
   * Main execution (adapted from OTTO)
   */
  async execute(input = {}, context = {}) {
    const startTime = Date.now();

    try {
      // Check consent for marketing/engagement communications
      if (input.action === 'send_message' || input.action === 'schedule') {
        if (input.patient_id && !await checkConsent(input.patient_id, ConsentType.MARKETING)) {
          return {
            success: false,
            error: 'Patient has not consented to marketing communications',
            agent: this.agentId
          };
        }
      }

      // Load context (same pattern as OTTO)
      const enrichedContext = await this.loadContext(input, context);

      // Execute formulas (same as OTTO)
      const formulaResults = await this.executeFormulas(enrichedContext);

      // Handle different actions
      let decision;
      if (input.action === 'process_call' || input.action === 'schedule_appointment') {
        decision = await this.processCall(input);
      } else {
        // Default: Build prompt and use Claude (same as OTTO)
        const prompt = await this.buildPrompt(input, enrichedContext, formulaResults);
        const responseText = await this.callClaudeAPI(prompt);
        decision = await this.parseResponse(responseText);
      }

      // Filter response data based on AI_AGENT role permissions
      const filteredDecision = filterDataByRole(Role.AI_AGENT, 'patient', decision);

      // Create artifact
      await this.createArtifact({
        input,
        context: enrichedContext,
        formulaResults,
        decision: filteredDecision,
        executionTime: Date.now() - startTime,
        success: true
      });

      return {
        success: true,
        agent: this.agentId,
        decision: filteredDecision,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error) {
      console.error('M-OTTO execute error:', error);

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

  /**
   * Load context (override from base)
   */
  async loadContext(input, context) {
    const enriched = { ...context };

    if (input.patient_id) {
      enriched.patient = await this.loadPatientData(input.patient_id);
    }

    if (input.appointment_id) {
      enriched.appointment = await this.loadAppointmentData(input.appointment_id);
    }

    enriched.agent_history = await this.loadAgentHistory(5);

    return enriched;
  }

  async loadAppointmentData(appointmentId) {
    const { data: appointment, error } = await supabase
      .from('medical_appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('M-OTTO loadAppointmentData error:', error);
      return null;
    }

    return appointment;
  }
}

export default MOttoAgent;












