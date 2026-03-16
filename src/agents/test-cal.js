import { CalAgent } from './cal.js';

async function testCal() {
  console.log('Testing CAL Agent...\n');

  const cal = new CalAgent();

  const result = await cal.execute(
    {
      customer_id: 'cust_001',
      ro_id: 'ro_001',
      request:
        'Build a clear, customer-friendly estimate for front brake pads/rotors and a 30k-mile service.',
      pricing_preferences: {
        target_margin_pct: 0.45,
        willingness_to_wait_for_parts: true,
        budget_cap: 900
      }
    },
    {
      triggered_by: 'pricing_request'
    }
  );

  console.log('CAL Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ CAL test complete');
}

testCal().catch(err => {
  console.error('❌ CAL test failed:', err);
  process.exit(1);
});









