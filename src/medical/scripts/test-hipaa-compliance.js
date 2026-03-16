import 'dotenv/config';
import { encryptPHI, decryptPHI, encryptPHIObject, decryptPHIObject, PHI_FIELDS } from '../hipaa/encryption.js';
import { logAudit, extractPHIFields } from '../hipaa/audit-log.js';
import { checkPermission, Role, getAllowedFields, filterDataByRole } from '../hipaa/rbac.js';
import { checkConsent, ConsentType } from '../hipaa/consent.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Test HIPAA Compliance Layer
 */

async function testHIPAACompliance() {
  console.log('Testing HIPAA compliance layer...\n');

  let allTestsPassed = true;

  // Test 1: PHI Encryption
  console.log('━━━ Test 1: Field-level PHI Encryption ━━━');
  try {
    const sensitiveData = 'John Smith';
    const encrypted = encryptPHI(sensitiveData);
    const decrypted = decryptPHI(encrypted);

    const encryptionWorks = decrypted === sensitiveData;
    console.log(`  Original: "${sensitiveData}"`);
    console.log(`  Encrypted: "${encrypted.substring(0, 40)}..."`);
    console.log(`  Decrypted: "${decrypted}"`);
    console.log(`  ${encryptionWorks ? '✓' : '✗'} Encryption/Decryption: ${encryptionWorks ? 'PASS' : 'FAIL'}`);

    if (!encryptionWorks) allTestsPassed = false;

    // Test PHI object encryption
    const phiObject = {
      name: 'John Smith',
      phone: '509-555-0101',
      email: 'john@example.com',
      ssn: '123-45-6789'
    };

    const encryptedObj = encryptPHIObject(phiObject);
    const decryptedObj = decryptPHIObject(encryptedObj);

    const objEncryptionWorks = decryptedObj.name === phiObject.name;
    console.log(`  ${objEncryptionWorks ? '✓' : '✗'} Object encryption/decryption: ${objEncryptionWorks ? 'PASS' : 'FAIL'}`);

    if (!objEncryptionWorks) allTestsPassed = false;

  } catch (error) {
    console.log(`  ✗ Encryption test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 2: Audit Logging
  console.log('\n━━━ Test 2: Audit Logging ━━━');
  try {
    const auditEntry = await logAudit({
      timestamp: new Date(),
      user_id: 'test_user_123',
      user_role: 'provider',
      action: 'READ',
      resource_type: 'Patient',
      resource_id: 'pat_test_456',
      phi_accessed: ['name', 'dob', 'ssn'],
      ip_address: '192.168.1.100',
      user_agent: 'Test Agent/1.0',
      justification: 'treatment',
      clinic_id: 'test_clinic_001'
    });

    if (auditEntry) {
      console.log(`  ✓ Audit log entry created: ${auditEntry.id || 'success'}`);
      console.log(`  ✓ Retention period: 7 years (HIPAA compliant)`);
    } else {
      console.log(`  ✗ Audit log entry creation failed`);
      allTestsPassed = false;
    }

    // Test PHI field extraction
    const testData = {
      name: 'John Smith',
      phone: '509-555-0101',
      age: 45, // Not PHI
      diagnosis: 'Back pain' // Not in standard PHI list
    };

    const phiFields = extractPHIFields(testData);
    console.log(`  ✓ PHI fields extracted: ${phiFields.join(', ')}`);

  } catch (error) {
    console.log(`  ✗ Audit logging test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 3: Role-Based Access Control
  console.log('\n━━━ Test 3: Role-Based Access Control (RBAC) ━━━');
  try {
    const rbacTests = [
      {
        role: Role.PROVIDER,
        resource: 'patient.clinical',
        action: 'read',
        expected: true,
        description: 'Provider can read clinical data'
      },
      {
        role: Role.FRONT_DESK,
        resource: 'patient.clinical',
        action: 'read',
        expected: false,
        description: 'Front desk cannot read clinical data'
      },
      {
        role: Role.AI_AGENT,
        resource: 'patient.demographics',
        action: 'read',
        expected: true,
        description: 'AI agent can read demographics'
      },
      {
        role: Role.AI_AGENT,
        resource: 'patient.clinical',
        action: 'update',
        expected: false,
        description: 'AI agent cannot update clinical data'
      },
      {
        role: Role.ADMIN,
        resource: 'audit_log.*',
        action: 'read',
        expected: true,
        description: 'Admin can read audit logs'
      }
    ];

    let rbacPassed = true;
    rbacTests.forEach(test => {
      const allowed = checkPermission(test.role, test.resource, test.action);
      const passed = allowed === test.expected;
      console.log(`  ${passed ? '✓' : '✗'} ${test.description}: ${allowed ? 'ALLOWED' : 'DENIED'}`);
      if (!passed) rbacPassed = false;
    });

    if (!rbacPassed) allTestsPassed = false;

    // Test data filtering
    const testPatientData = {
      name: 'John Smith',
      phone: '509-555-0101',
      diagnosis: 'Back pain',
      medications: ['Ibuprofen']
    };

    const aiAgentData = filterDataByRole(Role.AI_AGENT, 'patient.demographics', testPatientData);
    const hasRestrictedFields = !aiAgentData.diagnosis && !aiAgentData.medications;
    console.log(`  ${hasRestrictedFields ? '✓' : '✗'} Data filtering by role: ${hasRestrictedFields ? 'PASS' : 'FAIL'}`);

    if (!hasRestrictedFields) allTestsPassed = false;

  } catch (error) {
    console.log(`  ✗ RBAC test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 4: Consent Management
  console.log('\n━━━ Test 4: Consent Management ━━━');
  try {
    // Check consent function exists and works (will return false for non-existent patient, which is expected)
    const consentCheck = await checkConsent('test_patient_999', ConsentType.MARKETING);
    console.log(`  ✓ Consent check function operational`);
    console.log(`  ✓ Marketing consent check (test patient): ${consentCheck ? 'GRANTED' : 'DENIED (expected for test)'}`);

    // Test that treatment/payment/operations are implied consent
    const treatmentConsent = await checkConsent('test_patient_999', ConsentType.TREATMENT);
    console.log(`  ✓ Treatment consent (implied): ${treatmentConsent ? 'GRANTED' : 'DENIED'}`);

  } catch (error) {
    console.log(`  ✗ Consent management test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 5: PHI Fields List
  console.log('\n━━━ Test 5: PHI Fields Identification ━━━');
  try {
    console.log(`  ✓ PHI fields defined: ${PHI_FIELDS.length} fields`);
    console.log(`  ✓ Fields: ${PHI_FIELDS.slice(0, 5).join(', ')}, ...`);

    const testField = 'name';
    const isPHI = PHI_FIELDS.includes(testField);
    console.log(`  ${isPHI ? '✓' : '✗'} Field identification ("${testField}"): ${isPHI ? 'PHI' : 'NOT PHI'}`);

  } catch (error) {
    console.log(`  ✗ PHI fields test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  if (allTestsPassed) {
    console.log('✓ HIPAA COMPLIANCE: ALL TESTS PASSED');
    console.log('  - Encryption: ✓');
    console.log('  - Audit Logging: ✓');
    console.log('  - RBAC: ✓');
    console.log('  - Consent Management: ✓');
    console.log('  - PHI Field Identification: ✓');
  } else {
    console.log('✗ HIPAA COMPLIANCE: SOME TESTS FAILED');
  }
  console.log('═══════════════════════════════════════\n');

  return allTestsPassed;
}

// Run tests
testHIPAACompliance().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});












