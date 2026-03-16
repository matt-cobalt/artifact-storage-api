import { DexAgent } from './dex.js';

async function testDex() {
  console.log('Testing DEX Agent...\n');

  const dex = new DexAgent();

  const result = await dex.execute(
    {
      customer_id: 'cust_001',
      symptoms: 'check engine light on, rough idle',
      dtc_codes: ['P0301', 'P0171']
    },
    {
      triggered_by: 'diagnostic_request'
    }
  );

  console.log('DEX Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ DEX test complete');
}

testDex().catch(err => {
  console.error('❌ DEX test failed:', err);
  process.exit(1);
});











