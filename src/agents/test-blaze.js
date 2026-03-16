import { BlazeAgent } from './blaze.js';

async function testBlaze() {
  console.log('Testing BLAZE Agent...\n');

  const blaze = new BlazeAgent();

  const result = await blaze.execute(
    {
      campaign_name: 'Fall brake safety campaign',
      goal: 'Bring back lapsed customers for safety inspections.',
      target_segments: ['lapsed_customers', 'high_value'],
      channels: ['sms', 'email']
    },
    {
      triggered_by: 'marketing_campaign_request',
      marketing_spend: 5000,
      new_customers: 40,
      avg_ltv: 3200,
      cac: 500,
      campaign_revenue: 18000,
      campaign_cost: 4500,
      impressions: 120000,
      clicks: 3600,
      conversions: 180
    }
  );

  console.log('BLAZE Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ BLAZE test complete');
}

testBlaze().catch(err => {
  console.error('❌ BLAZE test failed:', err);
  process.exit(1);
});









