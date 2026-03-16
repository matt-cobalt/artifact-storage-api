import { MentorAgent } from './mentor.js';

async function testMentor() {
  console.log('Testing MENTOR Agent...\n');

  const mentor = new MentorAgent();

  const result = await mentor.execute(
    {
      request:
        'Audit and improve documentation for the Trinity Test, Artifact Storage API, and Squad agents.',
      audiences: ['devs', 'ops', 'service_writers']
    },
    {
      triggered_by: 'documentation_request',
      documented_areas: 6,
      total_areas: 10,
      quiz_scores: [0.7, 0.8, 0.9],
      topics_covered: 15,
      topics_total: 22
    }
  );

  console.log('MENTOR Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ MENTOR test complete');
}

testMentor().catch(err => {
  console.error('❌ MENTOR test failed:', err);
  process.exit(1);
});









