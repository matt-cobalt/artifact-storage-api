import { OracleAgent } from './oracle.js';

async function testOracle() {
  console.log('Testing ORACLE Agent...\n');

  const oracle = new OracleAgent();

  const result = await oracle.execute(
    {
      request: 'Analyze the last 7 days of operations for patterns, anomalies, and tomorrow\'s forecast.',
      window: {
        start: '2024-01-08',
        end: '2024-01-15'
      },
      metrics_of_interest: ['cycle_time', 'bay_utilization', 'declined_estimates']
    },
    {
      triggered_by: 'analytics_query',
      timeseries: [
        { metric: 'cycle_time', values: [2.1, 2.3, 2.5, 2.7, 2.9] },
        { metric: 'bay_utilization', values: [0.78, 0.81, 0.84, 0.86, 0.9] }
      ],
      metrics: {
        declined_estimates_today: 9,
        avg_declined_estimates: 4
      },
      historical: [
        { date: '2023-12-15', cycle_time: 2.0, bay_utilization: 0.75 },
        { date: '2023-12-22', cycle_time: 2.1, bay_utilization: 0.77 }
      ]
    }
  );

  console.log('ORACLE Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ ORACLE test complete');
}

testOracle().catch(err => {
  console.error('❌ ORACLE test failed:', err);
  process.exit(1);
});









