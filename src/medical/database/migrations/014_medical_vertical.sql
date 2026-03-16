-- ============================================
-- MEDICAL VERTICAL SCHEMA
-- Migration: 014_medical_vertical.sql
-- Created: 2025-12-17
-- Author: PHOENIX (Architecture Agent)
-- Purpose: HIPAA-compliant medical clinic infrastructure
-- ============================================

-- ============================================
-- TABLE 1: medical_clinics
-- ============================================
CREATE TABLE IF NOT EXISTS medical_clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  locations_count INTEGER DEFAULT 1,
  ehr_system TEXT, -- Epic, Athenahealth, Cerner, etc.
  contact_email TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  status TEXT DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'inactive', 'suspended')),
  phone_number TEXT, -- Provisioned phone for M-OTTO
  baa_id TEXT, -- Business Associate Agreement ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_clinics_status ON medical_clinics(status);
CREATE INDEX IF NOT EXISTS idx_medical_clinics_ehr_system ON medical_clinics(ehr_system);

-- ============================================
-- TABLE 2: medical_patients (HIPAA-compliant with encrypted PHI)
-- ============================================
CREATE TABLE IF NOT EXISTS medical_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  
  -- PHI Fields (stored encrypted)
  name TEXT NOT NULL, -- Encrypted
  dob DATE, -- Encrypted
  ssn TEXT, -- Encrypted (if collected)
  address TEXT, -- Encrypted
  phone TEXT NOT NULL, -- Encrypted
  email TEXT, -- Encrypted
  emergency_contact_name TEXT, -- Encrypted
  emergency_contact_phone TEXT, -- Encrypted
  
  -- Medical Identifiers (encrypted)
  medical_record_number TEXT UNIQUE, -- Encrypted
  
  -- Insurance (encrypted)
  insurance_provider TEXT,
  insurance_member_id TEXT, -- Encrypted
  insurance_group_number TEXT, -- Encrypted
  
  -- Clinical (non-PHI)
  primary_diagnosis TEXT,
  chronic_conditions TEXT[],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_patients_clinic_id ON medical_patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_patients_medical_record_number ON medical_patients(medical_record_number) WHERE medical_record_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_medical_patients_created_at ON medical_patients(created_at DESC);

-- ============================================
-- TABLE 3: medical_appointments
-- ============================================
CREATE TABLE IF NOT EXISTS medical_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES medical_patients(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID, -- References providers table (if exists)
  
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('consultation', 'follow-up', 'procedure', 'therapy', 'injection')),
  
  -- Patient Info
  chief_complaint TEXT,
  pain_level INTEGER CHECK (pain_level >= 1 AND pain_level <= 10),
  duration TEXT, -- "2 weeks", "3 months"
  previous_treatment BOOLEAN DEFAULT false,
  referring_physician TEXT,
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_days INTEGER,
  
  -- Confirmation
  '48_hour_confirmation_sent' BOOLEAN DEFAULT false,
  confirmation_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_appointments_clinic_id ON medical_appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_appointments_patient_id ON medical_appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_appointments_date ON medical_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_medical_appointments_status ON medical_appointments(status);
CREATE INDEX IF NOT EXISTS idx_medical_appointments_clinic_date ON medical_appointments(clinic_id, appointment_date);

-- ============================================
-- TABLE 4: medical_records (SOAP notes, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES medical_patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES medical_appointments(id),
  provider_id UUID,
  
  -- Clinical Data (contains PHI)
  chief_complaint TEXT, -- Encrypted if contains PHI
  subjective TEXT, -- SOAP - Subjective (encrypted)
  objective TEXT, -- SOAP - Objective
  assessment TEXT, -- SOAP - Assessment
  plan TEXT, -- SOAP - Plan
  
  diagnosis TEXT,
  procedures TEXT[],
  
  -- Notes
  clinical_notes TEXT, -- Encrypted if contains PHI
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_id ON medical_records(appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_clinic_id ON medical_records(clinic_id);

-- ============================================
-- TABLE 5: medical_audit_logs (HIPAA 7-year retention)
-- ============================================
CREATE TABLE IF NOT EXISTS medical_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT')),
  resource_type TEXT NOT NULL,
  resource_id UUID,
  phi_accessed_count INTEGER DEFAULT 0,
  phi_fields TEXT[], -- Field names accessed (not values)
  ip_address TEXT,
  user_agent TEXT,
  justification TEXT,
  encrypted_details TEXT, -- Full audit details encrypted
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  retention_until TIMESTAMPTZ NOT NULL -- 7 years from timestamp
);

CREATE INDEX IF NOT EXISTS idx_medical_audit_logs_user_id ON medical_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_audit_logs_clinic_id ON medical_audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_audit_logs_resource_type ON medical_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_medical_audit_logs_timestamp ON medical_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_medical_audit_logs_resource ON medical_audit_logs(resource_type, resource_id);

-- Set default retention to 7 years
ALTER TABLE medical_audit_logs ALTER COLUMN retention_until SET DEFAULT (NOW() + INTERVAL '7 years');

-- ============================================
-- TABLE 6: medical_consents (HIPAA consent management)
-- ============================================
CREATE TABLE IF NOT EXISTS medical_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES medical_patients(id) ON DELETE CASCADE NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('treatment', 'payment', 'operations', 'marketing')),
  granted BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  signature TEXT, -- Digital signature
  witness TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_consents_patient_id ON medical_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_consents_type ON medical_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_medical_consents_active ON medical_consents(patient_id, consent_type) WHERE revoked_at IS NULL;

-- ============================================
-- TABLE 7: medical_ehr_integrations
-- ============================================
CREATE TABLE IF NOT EXISTS medical_ehr_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  ehr_system TEXT NOT NULL, -- Epic, Athenahealth, Cerner, etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
  connection_status TEXT DEFAULT 'not_connected',
  api_endpoint TEXT,
  api_key TEXT, -- Encrypted
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_ehr_integrations_clinic_id ON medical_ehr_integrations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_ehr_integrations_status ON medical_ehr_integrations(status);

-- ============================================
-- TABLE 8: medical_insurance_verifications
-- ============================================
CREATE TABLE IF NOT EXISTS medical_insurance_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES medical_patients(id) ON DELETE CASCADE NOT NULL,
  insurance_provider TEXT NOT NULL,
  member_id TEXT NOT NULL, -- Encrypted
  group_number TEXT, -- Encrypted
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  eligibility_data JSONB, -- Eligibility response from insurance API
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_insurance_verifications_patient_id ON medical_insurance_verifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_insurance_verifications_status ON medical_insurance_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_medical_insurance_verifications_clinic_id ON medical_insurance_verifications(clinic_id);

-- ============================================
-- TABLE 9: medical_agent_instances (Per-clinic agent configs)
-- ============================================
CREATE TABLE IF NOT EXISTS medical_agent_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  agent_type TEXT NOT NULL, -- M-OTTO, M-CAL, M-REX, M-PATIENT, M-MILES
  agent_id TEXT NOT NULL, -- m-otto, m-cal, etc.
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_medical_agent_instances_clinic_id ON medical_agent_instances(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_agent_instances_agent_type ON medical_agent_instances(agent_type);
CREATE INDEX IF NOT EXISTS idx_medical_agent_instances_status ON medical_agent_instances(status);

-- ============================================
-- TABLE 10: medical_cross_vertical_learning
-- ============================================
CREATE TABLE IF NOT EXISTS medical_cross_vertical_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  source_vertical TEXT NOT NULL, -- 'automotive', 'medical'
  insight_type TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  expected_impact JSONB,
  actual_impact JSONB,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_cross_learning_clinic_id ON medical_cross_vertical_learning(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_cross_learning_insight_type ON medical_cross_vertical_learning(insight_type);

-- ============================================
-- TABLE 11: medical_patient_engagement
-- ============================================
CREATE TABLE IF NOT EXISTS medical_patient_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES medical_patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES medical_appointments(id),
  engagement_type TEXT NOT NULL CHECK (engagement_type IN ('day_1_followup', 'day_7_followup', 'day_30_followup', 'educational_content', 'satisfaction_survey')),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'phone')),
  message_content TEXT,
  sent_at TIMESTAMPTZ,
  response_received BOOLEAN DEFAULT false,
  response_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_patient_engagement_patient_id ON medical_patient_engagement(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_patient_engagement_clinic_id ON medical_patient_engagement(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_patient_engagement_type ON medical_patient_engagement(engagement_type);
CREATE INDEX IF NOT EXISTS idx_medical_patient_engagement_sent_at ON medical_patient_engagement(sent_at) WHERE sent_at IS NOT NULL;

-- ============================================
-- TABLE 12: medical_revenue_cycle
-- ============================================
CREATE TABLE IF NOT EXISTS medical_revenue_cycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES medical_patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES medical_appointments(id),
  service_code TEXT NOT NULL, -- CPT code
  service_description TEXT,
  fee_schedule_type TEXT CHECK (fee_schedule_type IN ('medicare', 'commercial', 'self_pay')),
  billed_amount NUMERIC(10, 2),
  allowed_amount NUMERIC(10, 2),
  patient_responsibility NUMERIC(10, 2), -- Copay + coinsurance + deductible
  insurance_payment NUMERIC(10, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'paid', 'denied', 'pending_auth')),
  prior_authorization_required BOOLEAN DEFAULT false,
  prior_authorization_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_revenue_cycle_clinic_id ON medical_revenue_cycle(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_revenue_cycle_patient_id ON medical_revenue_cycle(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_revenue_cycle_status ON medical_revenue_cycle(status);
CREATE INDEX IF NOT EXISTS idx_medical_revenue_cycle_service_code ON medical_revenue_cycle(service_code);

-- ============================================
-- TABLE 13: medical_care_gaps
-- ============================================
CREATE TABLE IF NOT EXISTS medical_care_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES medical_patients(id) ON DELETE CASCADE NOT NULL,
  gap_type TEXT NOT NULL CHECK (gap_type IN ('overdue_followup', 'medication_refill_due', 'preventive_care_due', 'imaging_results_pending', 'lab_results_pending')),
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  identified_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  recommended_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_care_gaps_patient_id ON medical_care_gaps(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_care_gaps_clinic_id ON medical_care_gaps(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_care_gaps_type ON medical_care_gaps(gap_type);
CREATE INDEX IF NOT EXISTS idx_medical_care_gaps_unresolved ON medical_care_gaps(clinic_id, priority) WHERE resolved_at IS NULL;

-- ============================================
-- TABLE 14: medical_churn_predictions
-- ============================================
CREATE TABLE IF NOT EXISTS medical_churn_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES medical_patients(id) ON DELETE CASCADE NOT NULL,
  churn_risk_score NUMERIC(3, 2) NOT NULL CHECK (churn_risk_score >= 0 AND churn_risk_score <= 1),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
  days_since_last_contact INTEGER,
  predicted_no_return_date DATE,
  factors JSONB, -- Array of factors contributing to risk
  intervention_recommended BOOLEAN DEFAULT false,
  intervention_applied BOOLEAN DEFAULT false,
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_churn_predictions_patient_id ON medical_churn_predictions(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_churn_predictions_clinic_id ON medical_churn_predictions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_churn_predictions_risk_level ON medical_churn_predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_medical_churn_predictions_high_risk ON medical_churn_predictions(clinic_id, risk_level) WHERE risk_level IN ('high', 'critical');

-- ============================================
-- TABLE 15: medical_no_show_tracking
-- ============================================
CREATE TABLE IF NOT EXISTS medical_no_show_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES medical_patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES medical_appointments(id) ON DELETE CASCADE NOT NULL,
  appointment_date DATE NOT NULL,
  no_show_occurred BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  confirmation_sent BOOLEAN DEFAULT false,
  confirmation_sent_at TIMESTAMPTZ,
  '48_hour_confirmation_sent' BOOLEAN DEFAULT false,
  '48_hour_confirmation_at' TIMESTAMPTZ,
  pattern_detected BOOLEAN DEFAULT false, -- Pattern of repeated no-shows
  intervention_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_no_show_tracking_patient_id ON medical_no_show_tracking(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_no_show_tracking_clinic_id ON medical_no_show_tracking(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_no_show_tracking_appointment_date ON medical_no_show_tracking(appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_no_show_tracking_pattern ON medical_no_show_tracking(clinic_id, patient_id) WHERE pattern_detected = true;

-- ============================================
-- TABLE 16: medical_staff_assignments
-- ============================================
CREATE TABLE IF NOT EXISTS medical_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID NOT NULL, -- References users/providers table
  staff_type TEXT NOT NULL CHECK (staff_type IN ('provider', 'clinical_staff', 'front_desk', 'billing', 'admin')),
  staff_name TEXT NOT NULL,
  staff_email TEXT,
  role TEXT, -- Specific role within staff_type
  active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_staff_assignments_clinic_id ON medical_staff_assignments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_staff_assignments_staff_id ON medical_staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_medical_staff_assignments_type ON medical_staff_assignments(staff_type);
CREATE INDEX IF NOT EXISTS idx_medical_staff_assignments_active ON medical_staff_assignments(clinic_id) WHERE active = true;

-- ============================================
-- TABLE 17: medical_performance_metrics
-- ============================================
CREATE TABLE IF NOT EXISTS medical_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES medical_clinics(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('patient_capture_rate', 'no_show_rate', 'after_hours_bookings', 'staff_satisfaction', 'roi', 'revenue', 'appointment_count')),
  metric_value NUMERIC(10, 4) NOT NULL,
  target_value NUMERIC(10, 4),
  target_met BOOLEAN,
  metadata JSONB, -- Additional context about the metric
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, metric_date, metric_type)
);

CREATE INDEX IF NOT EXISTS idx_medical_performance_metrics_clinic_id ON medical_performance_metrics(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_performance_metrics_date ON medical_performance_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_performance_metrics_type ON medical_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_medical_performance_metrics_clinic_date ON medical_performance_metrics(clinic_id, metric_date DESC);

-- ============================================
-- TRIGGERS: Updated At
-- ============================================

CREATE OR REPLACE FUNCTION update_medical_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_medical_clinics_updated_at
  BEFORE UPDATE ON medical_clinics
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_updated_at_column();

CREATE TRIGGER update_medical_patients_updated_at
  BEFORE UPDATE ON medical_patients
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_updated_at_column();

CREATE TRIGGER update_medical_appointments_updated_at
  BEFORE UPDATE ON medical_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_updated_at_column();

CREATE TRIGGER update_medical_ehr_integrations_updated_at
  BEFORE UPDATE ON medical_ehr_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_updated_at_column();

CREATE TRIGGER update_medical_insurance_verifications_updated_at
  BEFORE UPDATE ON medical_insurance_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_updated_at_column();

CREATE TRIGGER update_medical_agent_instances_updated_at
  BEFORE UPDATE ON medical_agent_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_updated_at_column();

CREATE TRIGGER update_medical_revenue_cycle_updated_at
  BEFORE UPDATE ON medical_revenue_cycle
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_updated_at_column();

CREATE TRIGGER update_medical_staff_assignments_updated_at
  BEFORE UPDATE ON medical_staff_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE medical_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_ehr_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_insurance_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_agent_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_cross_vertical_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_patient_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_revenue_cycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_care_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_churn_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_no_show_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (bypasses RLS)
-- This is handled automatically by Supabase service_role

-- Authenticated users see only their clinic's data
-- Note: These policies assume a clinic_id is set in the JWT or request context
-- You may need to adjust based on your authentication setup

-- Policy template for clinic-level access (adjust as needed)
CREATE POLICY "Users can only access their clinic's data" ON medical_clinics
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's patients" ON medical_patients
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's appointments" ON medical_appointments
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's medical_records" ON medical_records
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's audit_logs" ON medical_audit_logs
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid OR clinic_id IS NULL);

CREATE POLICY "Users can only access their clinic's consents" ON medical_consents
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR patient_id IN (SELECT id FROM medical_patients WHERE clinic_id = current_setting('app.current_clinic_id', true)::uuid));

CREATE POLICY "Users can only access their clinic's ehr_integrations" ON medical_ehr_integrations
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's insurance_verifications" ON medical_insurance_verifications
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's agent_instances" ON medical_agent_instances
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's cross_vertical_learning" ON medical_cross_vertical_learning
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's patient_engagement" ON medical_patient_engagement
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's revenue_cycle" ON medical_revenue_cycle
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's care_gaps" ON medical_care_gaps
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's churn_predictions" ON medical_churn_predictions
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's no_show_tracking" ON medical_no_show_tracking
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's staff_assignments" ON medical_staff_assignments
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

CREATE POLICY "Users can only access their clinic's performance_metrics" ON medical_performance_metrics
  FOR ALL
  USING (auth.uid()::text = 'service_role' OR clinic_id = current_setting('app.current_clinic_id', true)::uuid);

-- ============================================
-- COMMENTS: Documentation
-- ============================================

COMMENT ON TABLE medical_clinics IS 'Medical clinics using the platform';
COMMENT ON TABLE medical_patients IS 'Patients - PHI fields encrypted at rest';
COMMENT ON TABLE medical_appointments IS 'Patient appointments - supports 48-hour confirmation';
COMMENT ON TABLE medical_records IS 'Clinical records (SOAP notes, diagnoses, procedures)';
COMMENT ON TABLE medical_audit_logs IS 'HIPAA audit trail - 7-year retention required';
COMMENT ON TABLE medical_consents IS 'Patient consent management (treatment, payment, operations, marketing)';
COMMENT ON TABLE medical_ehr_integrations IS 'EHR system integration status (stubs for Week 1)';
COMMENT ON TABLE medical_insurance_verifications IS 'Insurance eligibility verification tracking';
COMMENT ON TABLE medical_agent_instances IS 'Medical agent configurations per clinic';
COMMENT ON TABLE medical_cross_vertical_learning IS 'Cross-vertical learning insights applied to clinics';
COMMENT ON TABLE medical_patient_engagement IS 'Patient engagement tracking (follow-ups, surveys, content)';
COMMENT ON TABLE medical_revenue_cycle IS 'Revenue cycle management (billing, payments, prior auth)';
COMMENT ON TABLE medical_care_gaps IS 'Care gap identification (overdue follow-ups, refills, etc.)';
COMMENT ON TABLE medical_churn_predictions IS 'Patient churn risk predictions (90-day threshold)';
COMMENT ON TABLE medical_no_show_tracking IS 'No-show tracking and pattern detection';
COMMENT ON TABLE medical_staff_assignments IS 'Provider/clinic staff assignments and roles';
COMMENT ON TABLE medical_performance_metrics IS 'Clinic performance KPIs and metrics';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
