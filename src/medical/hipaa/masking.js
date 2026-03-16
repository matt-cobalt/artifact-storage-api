/**
 * HIPAA Data Masking Module
 * Masks PHI in non-production environments
 */

/**
 * Mask PHI data for development/testing
 * @param {Object} data - Data containing PHI
 * @returns {Object} Masked data
 */
export function maskPHI(data) {
  // Don't mask in production
  if (process.env.NODE_ENV === 'production') {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return data;
  }

  const masked = { ...data };

  // Mask common PHI fields
  if (masked.name) {
    masked.name = 'John Doe';
  }

  if (masked.ssn) {
    masked.ssn = '***-**-1234';
  }

  if (masked.dob) {
    masked.dob = '1980-01-01';
  }

  if (masked.phone) {
    masked.phone = '555-***-****';
  }

  if (masked.email) {
    masked.email = 'patient@example.com';
  }

  if (masked.address) {
    masked.address = '123 Main St, Anytown, USA';
  }

  if (masked.medical_record_number) {
    masked.medical_record_number = 'MRN-******';
  }

  if (masked.insurance_member_id) {
    masked.insurance_member_id = 'INS-******';
  }

  return masked;
}

/**
 * Generate synthetic patient data for testing
 * Uses Faker.js if available, otherwise returns simple mock data
 */
export function generateSyntheticPatient() {
  // Check if faker is available
  let faker;
  try {
    faker = require('@faker-js/faker').faker;
  } catch (e) {
    // Fallback to simple mock data if faker not available
    const timestamp = Date.now();
    return {
      id: `test_patient_${timestamp}`,
      name: 'Test Patient',
      dob: '1980-01-01',
      phone: '555-0100',
      email: `test${timestamp}@example.com`,
      address: '123 Test St, Test City, TS 12345',
      ssn: '000-00-0000',
      medical_record_number: `MRN-${timestamp}`,
      insurance_provider: 'Test Insurance',
      insurance_member_id: `INS-${timestamp}`,
      created_at: new Date().toISOString()
    };
  }

  // Use faker for realistic synthetic data
  return {
    id: `test_patient_${Date.now()}`,
    name: faker.person.fullName(),
    dob: faker.date.birthdate({ min: 18, max: 85, mode: 'age' }).toISOString().split('T')[0],
    phone: faker.phone.number(),
    email: faker.internet.email(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zip: faker.location.zipCode(),
    ssn: '000-00-0000', // Never generate real SSNs
    medical_record_number: `MRN-${faker.string.alphanumeric(8).toUpperCase()}`,
    insurance_provider: faker.helpers.arrayElement(['Blue Cross', 'Aetna', 'United Healthcare', 'Medicare']),
    insurance_member_id: `INS-${faker.string.alphanumeric(10)}`,
    created_at: new Date().toISOString()
  };
}

/**
 * Generate synthetic appointment data
 */
export function generateSyntheticAppointment(patientId = null) {
  let faker;
  try {
    faker = require('@faker-js/faker').faker;
  } catch (e) {
    const timestamp = Date.now();
    return {
      id: `test_appt_${timestamp}`,
      patient_id: patientId || `test_patient_${timestamp}`,
      provider_id: `test_provider_001`,
      appointment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      appointment_time: '10:00 AM',
      appointment_type: 'Consultation',
      status: 'scheduled',
      created_at: new Date().toISOString()
    };
  }

  return {
    id: `test_appt_${Date.now()}`,
    patient_id: patientId || `test_patient_${Date.now()}`,
    provider_id: `provider_${faker.string.alphanumeric(8)}`,
    appointment_date: faker.date.future().toISOString().split('T')[0],
    appointment_time: faker.date.recent().toTimeString().slice(0, 5),
    appointment_type: faker.helpers.arrayElement(['Consultation', 'Follow-up', 'Procedure', 'Therapy']),
    chief_complaint: faker.helpers.arrayElement(['Back pain', 'Neck pain', 'Headache', 'Joint pain']),
    status: faker.helpers.arrayElement(['scheduled', 'confirmed', 'completed', 'cancelled']),
    created_at: new Date().toISOString()
  };
}

/**
 * Check if we're in a development/test environment
 * @returns {boolean} True if should use synthetic/masked data
 */
export function shouldUseSyntheticData() {
  return process.env.NODE_ENV !== 'production' && process.env.USE_SYNTHETIC_DATA === 'true';
}












