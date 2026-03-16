import { PennypAgent } from './pennyp.js';

async function testPennyp() {
  console.log('Testing PENNYP Agent...\n');

  const pennyp = new PennypAgent();

  const result = await pennyp.execute(
    {
      customer_id: 'cust_003',
      ro_id: 'ro_invoice_001',
      request:
        'Review this repair order for invoicing, aging, and collection recommendations.'
    },
    {
      triggered_by: 'invoice_review',
      days_outstanding: 45,
      recent_collections: 12500,
      open_ar: 48000
    }
  );

  console.log('PENNYP Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ PENNYP test complete');
}

testPennyp().catch(err => {
  console.error('❌ PENNYP test failed:', err);
  process.exit(1);
});









