import { GuardianAgent } from './guardian.js';

async function testGuardian() {
  console.log('Testing GUARDIAN Agent...\n');

  const guardian = new GuardianAgent();

  const result = await guardian.execute(
    {
      request:
        'Perform a security and quality audit of the Artifact Storage API routes and environment configuration.',
      repo: 'artifact-storage-api',
      focus_areas: ['auth', 'secrets', 'input_validation', 'logging']
    },
    {
      triggered_by: 'security_audit_request',
      security_issues: 0,
      code_scanned: 120,
      lint_errors: 0,
      test_coverage: 0.75
    }
  );

  console.log('GUARDIAN Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ GUARDIAN test complete');
}

testGuardian().catch(err => {
  console.error('❌ GUARDIAN test failed:', err);
  process.exit(1);
});









