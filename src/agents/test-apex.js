import { ApexAgent } from './apex.js';

async function testApex() {
  console.log('Testing APEX Agent...\n');

  const apex = new ApexAgent();

  const result = await apex.execute(
    {
      decision:
        'Should Artifact Storage API adopt per-tenant partitions or stay single-tenant for now?',
      options: ['single_tenant', 'per_tenant_partitions']
    },
    {
      triggered_by: 'technical_decision',
      lint_errors: 0,
      test_coverage: 0.8,
      violations: 1,
      decisions_made: 5
    }
  );

  console.log('APEX Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ APEX test complete');
}

testApex().catch(err => {
  console.error('❌ APEX test failed:', err);
  process.exit(1);
});









