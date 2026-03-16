import { SageAgent } from './sage.js';

async function testSage() {
  console.log('Testing SAGE Agent...\n');

  const sage = new SageAgent();

  const result = await sage.execute(
    {
      agent_id: 'otto',
      agent_name: 'Otto',
      goal: 'Improve Otto\'s prompt for clearer safety and pricing guidance.',
      sample_prompt_snippet:
        'Always recommend necessary safety work first, but be aggressive with upsells for high-value customers.',
      sample_response_snippet:
        'Customer should do brakes soon, but you could also suggest new wipers and a cabin filter.'
    },
    {
      triggered_by: 'prompt_optimization',
      changes_made: 3,
      improvements_observed: 2,
      success_rate: 0.78,
      error_rate: 0.04,
      clarity_score: 0.76,
      safety_score: 0.88
    }
  );

  console.log('SAGE Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ SAGE test complete');
}

testSage().catch(err => {
  console.error('❌ SAGE test failed:', err);
  process.exit(1);
});









