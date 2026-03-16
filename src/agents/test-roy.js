import { RoyAgent } from './roy.js';

async function testRoy() {
  console.log('Testing ROY Agent...\n');

  const roy = new RoyAgent();

  const result = await roy.execute(
    {
      date_range: {
        start: '2024-01-01',
        end: '2024-01-31'
      },
      summary_focus: 'Daily KPIs and coaching tips for the last 30 days.'
    },
    {
      triggered_by: 'business_metrics_request',
      growth_rate: 0.18,
      profit_margin: 0.22,
      starting_mrr: 12000,
      expansion_mrr: 2500,
      churned_mrr: 900,
      starting_revenue: 600000,
      ending_revenue: 780000,
      years: 3,
      aro: 510,
      car_count: 22,
      close_rate: 0.64
    }
  );

  console.log('ROY Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ ROY test complete');
}

testRoy().catch(err => {
  console.error('❌ ROY test failed:', err);
  process.exit(1);
});









