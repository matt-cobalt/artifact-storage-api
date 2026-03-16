import { NexusAgent } from './nexus.js';

async function testNexus() {
  console.log('Testing NEXUS Agent...\n');

  const nexus = new NexusAgent();

  const result = await nexus.execute(
    {
      request:
        'Review and improve integrations between Artifact Storage API, Supabase, and Slack webhooks.',
      integrations: ['supabase', 'slack', 'tekmetric']
    },
    {
      triggered_by: 'integration_request',
      error_rate: 0.02,
      latency_ms: 250,
      endpoints: 9,
      auth_flows: 2,
      missed_events: 3,
      retries: 7
    }
  );

  console.log('NEXUS Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ NEXUS test complete');
}

testNexus().catch(err => {
  console.error('❌ NEXUS test failed:', err);
  process.exit(1);
});









