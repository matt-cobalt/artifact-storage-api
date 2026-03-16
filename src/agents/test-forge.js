import { ForgeAgent } from './forge.js';

async function testForge() {
  console.log('Testing FORGE Agent...\n');

  const forge = new ForgeAgent();

  const result = await forge.execute(
    {
      request:
        'Plan and sequence the work to add a new /api/agents/squad/execute endpoint to the Artifact Storage API.',
      repo: 'artifact-storage-api',
      area: 'backend',
      constraints: ['minimal downtime', 'compatible with existing agents']
    },
    {
      triggered_by: 'development_request',
      completed_tasks: 12,
      time_window_days: 7,
      impact: 0.8,
      urgency: 0.7,
      effort: 0.6,
      components_touched: 3,
      risk_factors: 2
    }
  );

  console.log('FORGE Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ FORGE test complete');
}

testForge().catch(err => {
  console.error('❌ FORGE test failed:', err);
  process.exit(1);
});









