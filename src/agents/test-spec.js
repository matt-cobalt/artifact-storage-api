import { SpecAgent } from './spec.js';

async function testSpec() {
  console.log('Testing SPEC Agent...\n');

  const spec = new SpecAgent();

  const result = await spec.execute(
    {
      request:
        'Define requirements for a Squad Agents control panel in the Trinity UI that can start, stop, and monitor agents.',
      stakeholders: ['ops', 'devs', 'service_writers']
    },
    {
      triggered_by: 'requirements_analysis',
      missing_details: 3,
      modules_touched: 4,
      unknowns_count: 2
    }
  );

  console.log('SPEC Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ SPEC test complete');
}

testSpec().catch(err => {
  console.error('❌ SPEC test failed:', err);
  process.exit(1);
});









