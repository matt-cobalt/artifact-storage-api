import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Medical Vertical Monitoring Module
 * Tracks clinic health and performance metrics
 */

/**
 * Get appointment statistics for a clinic
 */
async function getAppointmentStats(clinicId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: appointments, error } = await supabase
    .from('medical_appointments')
    .select('*')
    .eq('clinic_id', clinicId)
    .gte('appointment_date', startDate.toISOString().split('T')[0]);

  if (error) {
    throw error;
  }

  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.appointment_date === today);

  const afterHours = appointments.filter(a => {
    const hour = parseInt(a.appointment_time?.split(':')[0] || 0);
    return hour < 8 || hour >= 17; // Before 8am or after 5pm
  });

  return {
    today: todayAppointments.length,
    week: appointments.length,
    after_hours: afterHours.length,
    total: appointments.length
  };
}

/**
 * Get patient capture rate (target: 82-89%)
 */
async function getPatientCaptureRate(clinicId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get total inquiries/contacts (using patient_engagement as proxy)
  const { data: contacts } = await supabase
    .from('medical_patient_engagement')
    .select('id')
    .eq('clinic_id', clinicId)
    .gte('created_at', startDate.toISOString());

  // Get appointments scheduled
  const { data: appointments } = await supabase
    .from('medical_appointments')
    .select('id')
    .eq('clinic_id', clinicId)
    .gte('created_at', startDate.toISOString());

  const totalContacts = contacts?.length || 0;
  const appointmentsScheduled = appointments?.length || 0;

  const captureRate = totalContacts > 0 ? appointmentsScheduled / totalContacts : 0;

  return captureRate;
}

/**
 * Get no-show rate (target: 28-35% reduction)
 */
async function getNoShowRate(clinicId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: appointments } = await supabase
    .from('medical_appointments')
    .select('status')
    .eq('clinic_id', clinicId)
    .gte('appointment_date', startDate.toISOString().split('T')[0]);

  const total = appointments?.length || 0;
  const noShows = appointments?.filter(a => a.status === 'no_show').length || 0;

  const noShowRate = total > 0 ? noShows / total : 0;

  // Calculate reduction (compare to baseline 25% no-show rate)
  const baselineNoShowRate = 0.25;
  const reduction = baselineNoShowRate - noShowRate;
  const reductionPercent = (reduction / baselineNoShowRate) * 100;

  return {
    no_show_rate: noShowRate,
    reduction_percent: reductionPercent,
    target_met: reductionPercent >= 28 && reductionPercent <= 35
  };
}

/**
 * Get revenue metrics
 */
async function getRevenueMetrics(clinicId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Use medical_revenue_cycle for revenue tracking
  const { data: revenueCycle } = await supabase
    .from('medical_revenue_cycle')
    .select('billed_amount, status')
    .eq('clinic_id', clinicId)
    .gte('created_at', startDate.toISOString())
    .eq('status', 'paid');

  const totalRevenue = revenueCycle?.reduce((sum, t) => sum + parseFloat(t.billed_amount || 0), 0) || 0;

  return {
    total: totalRevenue,
    transaction_count: revenueCycle?.length || 0,
    average_transaction: revenueCycle?.length > 0 ? totalRevenue / revenueCycle.length : 0
  };
}

/**
 * Calculate ROI for a clinic
 */
function calculateROI(revenueMetrics, clinicId) {
  // Stub: Would calculate actual ROI based on clinic subscription cost vs revenue generated
  // For now, return placeholder
  const monthlyCost = 299; // Clinic subscription
  const revenue = revenueMetrics.total;
  
  // ROI = (Revenue - Cost) / Cost * 100
  const roi = monthlyCost > 0 ? ((revenue - monthlyCost) / monthlyCost) * 100 : 0;
  
  return roi;
}

/**
 * Get comprehensive clinic health metrics
 */
export async function getClinicHealth(clinicId) {
  try {
    const [
      appointments,
      patientCapture,
      noShowRate,
      revenueMetrics
    ] = await Promise.all([
      getAppointmentStats(clinicId),
      getPatientCaptureRate(clinicId),
      getNoShowRate(clinicId),
      getRevenueMetrics(clinicId)
    ]);

    const roi = calculateROI(revenueMetrics, clinicId);

    return {
      clinic_id: clinicId,
      appointments_today: appointments.today,
      appointments_week: appointments.week,
      patient_capture_rate: patientCapture, // Target: 82-89%
      no_show_reduction: noShowRate.reduction_percent, // Target: 28-35%
      after_hours_bookings: appointments.after_hours, // Target: +340%
      revenue_captured: revenueMetrics.total,
      roi: roi, // Target: 8,000-12,000%
      metrics_status: {
        patient_capture_target_met: patientCapture >= 0.82 && patientCapture <= 0.89,
        no_show_reduction_target_met: noShowRate.target_met,
        after_hours_target_met: appointments.after_hours > appointments.today * 0.3, // 30% of daily appointments
        roi_target_met: roi >= 8000 && roi <= 12000
      }
    };
  } catch (error) {
    console.error('getClinicHealth error:', error);
    throw error;
  }
}

/**
 * Get health for all clinics
 */
export async function getAllClinicsHealth() {
  const { data: clinics, error } = await supabase
    .from('medical_clinics')
    .select('id, name, status')
    .eq('status', 'active');

  if (error) {
    throw error;
  }

  const healthData = await Promise.all(
    clinics.map(clinic => getClinicHealth(clinic.id).catch(err => ({
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      error: err.message
    })))
  );

  return healthData;
}












