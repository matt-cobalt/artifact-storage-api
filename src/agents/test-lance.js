import { LanceAgent } from './lance.js';

async function testLance() {
  console.log('Testing LANCE Agent...\n');

  const lance = new LanceAgent();

  const result = await lance.execute(
    {
      customer_id: 'cust_fraud_001',
      ro_id: 'ro_fraud_001',
      scenario:
        'Customer is attempting to use multiple cards after prior chargebacks and is declining safety work.'
    },
    {
      triggered_by: 'fraud_check'
    }
  );

  console.log('LANCE Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ LANCE test complete');
}

testLance().catch(err => {
  console.error('❌ LANCE test failed:', err);
  process.exit(1);
});









