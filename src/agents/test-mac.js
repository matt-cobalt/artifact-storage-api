import { MacAgent } from './mac.js';

async function testMac() {
  console.log('Testing MAC Agent...\n');

  const mac = new MacAgent();

  const result = await mac.execute(
    {
      ro_id: 'ro_2001',
      focus:
        'Analyze parts and labor mix on active jobs and flag low-margin or efficiency issues.',
      jobs: [
        {
          ro_id: 'ro_2001',
          labor_hours_estimated: 2.0,
          labor_hours_actual: 2.6,
          parts_total: 320,
          labor_total: 280
        },
        {
          ro_id: 'ro_2002',
          labor_hours_estimated: 1.5,
          labor_hours_actual: 1.4,
          parts_total: 150,
          labor_total: 210
        }
      ]
    },
    {
      triggered_by: 'production_review'
    }
  );

  console.log('MAC Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ MAC test complete');
}

testMac().catch(err => {
  console.error('❌ MAC test failed:', err);
  process.exit(1);
});









