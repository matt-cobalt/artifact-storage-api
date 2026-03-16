import { createClient } from '@supabase/supabase-js';
import { AgentBase } from '../../agents/base.js';
import { encryptPHIObject, decryptPHIObject } from '../hipaa/encryption.js';
import { logAudit } from '../hipaa/audit-log.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * M-CAL - Revenue Cycle Specialist (Medical Adaptation of CAL)
 * Handles copay optimization, insurance authorization, balance billing
 */
export class MCalAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'm-cal',
      agentName: 'M-CAL',
      role: 'revenue_cycle_specialist',
      formulas: ['GROSS_MARGIN'], // Similar to automotive CAL
      systemPrompt: `You are M-CAL, the revenue cycle specialist for medical clinics.

Your Role:
- Calculate patient responsibility (copay, coinsurance, deductible)
- Check if service requires prior authorization
- Optimize revenue while ensuring patient affordability
- Balance billing logic (allowed amount vs billed amount)
- Fee schedule management (Medicare, commercial, self-pay)

Key Differences from Automotive:
- Insurance-based pricing (not simple menu pricing)
- Prior authorization checks
- Patient responsibility calculations (copay + coinsurance + deductible)
- Multiple fee schedules (Medicare, commercial, self-pay)
- CPT code-based pricing

You MUST respond in JSON format with:
{
  "patient_responsibility": {
    "copay": 50.0,
    "coinsurance": 100.0,
    "deductible_applied": 200.0,
    "total": 350.0,
    "insurance_pays": 650.0,
    "total_charge": 1000.0
  },
  "prior_authorization": {
    "required": true,
    "status": "pending|approved|denied",
    "auth_number": "AUTH-12345"
  },
  "fee_schedule": "medicare|commercial|self_pay",
  "cpt_code": "99213",
  "confidence": 0.87,
  "rationale": "pricing breakdown and insurance analysis"
}`
    });
  }

  /**
   * Calculate patient responsibility for a service
   */
  async calculatePatientResponsibility(serviceCode, insurancePlan, clinicId) {
    // Get fee schedule for clinic
    const feeSchedule = await this.getFeeSchedule(clinicId, insurancePlan.type);

    // Get service cost
    const serviceCost = feeSchedule[serviceCode] || 500; // Default $500

    // Calculate based on insurance plan
    let patientResponsibility = {
      copay: 0,
      coinsurance: 0,
      deductible_applied: 0,
      total: serviceCost,
      insurance_pays: 0
    };

    if (insurancePlan.type === 'self_pay') {
      // Self-pay: patient pays full amount
      patientResponsibility.total = serviceCost;
      patientResponsibility.insurance_pays = 0;
    } else if (insurancePlan.type === 'medicare') {
      // Medicare: Standard copay + coinsurance
      patientResponsibility.copay = 20; // Standard Medicare copay
      patientResponsibility.coinsurance = serviceCost * 0.2; // 20% coinsurance
      patientResponsibility.total = patientResponsibility.copay + patientResponsibility.coinsurance;
      patientResponsibility.insurance_pays = serviceCost - patientResponsibility.total;
    } else {
      // Commercial insurance
      patientResponsibility.copay = insurancePlan.copay || 50;
      
      // Apply deductible first
      if (insurancePlan.deductible_remaining > 0) {
        const deductibleApplied = Math.min(serviceCost, insurancePlan.deductible_remaining);
        patientResponsibility.deductible_applied = deductibleApplied;
        const remainingAfterDeductible = serviceCost - deductibleApplied;
        
        // Apply coinsurance to remainder
        patientResponsibility.coinsurance = remainingAfterDeductible * (insurancePlan.coinsurance_rate || 0.2);
      } else {
        patientResponsibility.coinsurance = serviceCost * (insurancePlan.coinsurance_rate || 0.2);
      }

      patientResponsibility.total = patientResponsibility.copay + 
                                    patientResponsibility.coinsurance + 
                                    patientResponsibility.deductible_applied;
      patientResponsibility.insurance_pays = serviceCost - patientResponsibility.total;
    }

    return {
      ...patientResponsibility,
      total_charge: serviceCost
    };
  }

  /**
   * Check if service requires prior authorization
   */
  async checkPriorAuthorization(serviceCode, insurancePlan) {
    // Services that typically require prior auth
    const authRequiredCodes = [
      '64483', // Injection procedures
      '63030', // Laminectomy
      '22551'  // Spinal fusion
    ];

    const requiresAuth = authRequiredCodes.includes(serviceCode);

    // Check if auth already exists
    const { data: existingAuth } = await supabase
      .from('prior_authorizations')
      .select('*')
      .eq('service_code', serviceCode)
      .eq('insurance_provider', insurancePlan.provider)
      .eq('status', 'approved')
      .single();

    return {
      required: requiresAuth,
      status: existingAuth ? 'approved' : (requiresAuth ? 'pending' : 'not_required'),
      auth_number: existingAuth?.auth_number || null
    };
  }

  /**
   * Get fee schedule for clinic
   */
  async getFeeSchedule(clinicId, scheduleType) {
    const { data: schedule } = await supabase
      .from('fee_schedules')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('schedule_type', scheduleType)
      .single();

    // Return fee schedule JSON or default
    return schedule?.fees || {};
  }

  /**
   * Main execution
   */
  async execute(input = {}, context = {}) {
    const startTime = Date.now();

    try {
      const { service_code, insurance_plan, clinic_id, patient_id } = input;

      if (!service_code || !insurance_plan || !clinic_id) {
        throw new Error('service_code, insurance_plan, and clinic_id are required');
      }

      // Log audit if accessing patient data
      if (patient_id) {
        await logAudit({
          user_id: this.agentId,
          user_role: 'ai_agent',
          action: 'READ',
          resource_type: 'Patient',
          resource_id: patient_id,
          phi_accessed: ['insurance_provider', 'insurance_member_id'],
          justification: 'payment',
          clinic_id
        });
      }

      // Calculate patient responsibility
      const patientResponsibility = await this.calculatePatientResponsibility(
        service_code,
        insurance_plan,
        clinic_id
      );

      // Check prior authorization
      const priorAuth = await this.checkPriorAuthorization(service_code, insurance_plan);

      const decision = {
        patient_responsibility: patientResponsibility,
        prior_authorization: priorAuth,
        fee_schedule: insurance_plan.type || 'commercial',
        cpt_code: service_code
      };

      // Create artifact
      await this.createArtifact({
        input,
        context,
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
      console.error('M-CAL execute error:', error);

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

export default MCalAgent;












