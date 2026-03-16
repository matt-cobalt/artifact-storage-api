import { PhoenixAgent } from './phoenix.js';

async function testPhoenix() {
  console.log('Testing PHOENIX Agent...\n');

  const phoenix = new PhoenixAgent();

  const result = await phoenix.execute(
    {
      request:
        'Plan a production deployment of the latest Artifact Storage API changes with minimal downtime.',
      service: 'artifact-storage-api',
      environment: 'production'
    },
    {
      triggered_by: 'deployment_request',
      changes_count: 24,
      has_db_migration: true,
      has_rollback_plan: true,
      backup_verified: false,
      tests_passed: true,
      staging_duration_days: 3
    }
  );

  console.log('PHOENIX Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ PHOENIX test complete');
}

testPhoenix().catch(err => {
  console.error('❌ PHOENIX test failed:', err);
  process.exit(1);
});









