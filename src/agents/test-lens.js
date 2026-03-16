import { LensAgent } from './lens.js';

async function testLens() {
  console.log('Testing LENS Agent...\n');

  const lens = new LensAgent();

  const result = await lens.execute(
    {
      request:
        'Analyze Artifact Storage usage data to find patterns and data quality issues.',
      dataset_name: 'artifact_operations'
    },
    {
      triggered_by: 'data_analysis',
      dataset: [{ ro_count: 10, artifacts: 42 }],
      predictions: [0.7, 0.8],
      actuals: [0.65, 0.82],
      missing_values: 15,
      duplicate_records: 3
    }
  );

  console.log('LENS Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ LENS test complete');
}

testLens().catch(err => {
  console.error('❌ LENS test failed:', err);
  process.exit(1);
});









