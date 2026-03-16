import { KitAgent } from './kit.js';

async function testKit() {
  console.log('Testing KIT Agent...\n');

  const kit = new KitAgent();

  const result = await kit.execute(
    {
      customer_id: 'cust_001',
      ro_id: 'ro_parts_001',
      request:
        'Source front brake pads and rotors for a 2017 Toyota Camry with OEM-equivalent quality.',
      needed_parts: [
        {
          part_number: 'PAD-FT-123',
          description: 'Front brake pads',
          qty: 1,
          urgency: 'high'
        },
        {
          part_number: 'ROTOR-FT-123',
          description: 'Front brake rotors',
          qty: 2,
          urgency: 'high'
        }
      ]
    },
    {
      triggered_by: 'parts_request'
    }
  );

  console.log('KIT Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ KIT test complete');
}

testKit().catch(err => {
  console.error('❌ KIT test failed:', err);
  process.exit(1);
});









