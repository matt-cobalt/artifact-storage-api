import { FloAgent } from './flo.js';

async function testFlo() {
  console.log('Testing FLO Agent...\n');

  const flo = new FloAgent();

  const result = await flo.execute(
    {
      shop_id: 'shop_001',
      day: '2024-01-15',
      open_jobs: [
        {
          ro_id: 'ro_1001',
          promised_time: '2024-01-15T17:00:00Z',
          duration_estimate_minutes: 120,
          priority: 'high'
        },
        {
          ro_id: 'ro_1002',
          promised_time: '2024-01-15T16:00:00Z',
          duration_estimate_minutes: 60,
          priority: 'medium'
        }
      ],
      technicians: [
        { id: 'tech_001', name: 'Alex', skills: ['brakes', 'diagnostics'] },
        { id: 'tech_002', name: 'Jordan', skills: ['maintenance', 'tires'] }
      ],
      bays: [
        { id: 'bay_1', type: 'lift' },
        { id: 'bay_2', type: 'general' }
      ]
    },
    {
      triggered_by: 'schedule_request'
    }
  );

  console.log('FLO Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ FLO test complete');
}

testFlo().catch(err => {
  console.error('❌ FLO test failed:', err);
  process.exit(1);
});









