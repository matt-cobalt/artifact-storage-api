import { ConductorAgent } from './conductor.js';

async function testConductor() {
  console.log('Testing CONDUCTOR Agent...\n');

  const conductor = new ConductorAgent();

  const result = await conductor.execute(
    {
      request:
        'Review the CI/CD pipeline for artifact-storage-api and recommend improvements to speed and reliability.',
      pipeline: 'artifact-storage-api-ci'
    },
    {
      triggered_by: 'devops_task',
      failed_builds: 2,
      pipeline_duration_minutes: 14,
      deploys_per_week: 4,
      manual_steps: 3
    }
  );

  console.log('CONDUCTOR Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ CONDUCTOR test complete');
}

testConductor().catch(err => {
  console.error('❌ CONDUCTOR test failed:', err);
  process.exit(1);
});









