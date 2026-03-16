import { VinAgent } from './vin.js';

async function testVin() {
  console.log('Testing VIN Agent...\n');

  const vinAgent = new VinAgent();

  const result = await vinAgent.execute(
    {
      customer_id: 'cust_001',
      ro_id: 'ro_vin_001',
      vin: '1HGBH41JXMN109186',
      request:
        'Decode this VIN and summarize the vehicle profile, service history, and upcoming maintenance needs.'
    },
    {
      triggered_by: 'vehicle_lookup'
    }
  );

  console.log('VIN Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ VIN test complete');
}

testVin().catch(err => {
  console.error('❌ VIN test failed:', err);
  process.exit(1);
});









