import { ScoutAgent } from './scout.js';

async function testScout() {
  console.log('Testing SCOUT Agent...\n');

  const scout = new ScoutAgent();

  const result = await scout.execute(
    {
      request:
        'Evaluate options for integrating a third-party SMS provider for agent notifications.',
      candidates: ['Twilio', 'MessageBird', 'Vonage'],
      must_have: ['webhooks', 'US + CA coverage', 'reasonable pricing']
    },
    {
      triggered_by: 'research_request',
      required_features: ['webhooks', 'sms', 'short_codes'],
      api_capabilities: ['rest', 'webhooks', 'events'],
      maturity_score: 0.85,
      ecosystem_score: 0.8,
      endpoints: 5,
      auth_type: 'api_key'
    }
  );

  console.log('SCOUT Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ SCOUT test complete');
}

testScout().catch(err => {
  console.error('❌ SCOUT test failed:', err);
  process.exit(1);
});









