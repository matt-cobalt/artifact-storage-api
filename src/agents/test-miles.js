import { MilesAgent } from './miles.js';

async function testMiles() {
  console.log('Testing MILES Agent...\n');

  const miles = new MilesAgent();

  const result = await miles.execute(
    {
      customer_id: 'cust_002',
      request: 'Check churn risk and recommend a retention plan for this customer.',
      last_visit_date: '2024-05-10',
      total_visits: 6
    },
    {
      triggered_by: 'retention_check'
    }
  );

  console.log('MILES Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ MILES test complete');
}

testMiles().catch(err => {
  console.error('❌ MILES test failed:', err);
  process.exit(1);
});









