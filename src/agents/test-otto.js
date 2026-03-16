import { OttoAgent } from './otto.js';

async function testOtto() {
  console.log('Testing Otto Agent...');

  const otto = new OttoAgent();

  try {
    const result = await otto.execute(
      {
        customer_id: 'cust_001',
        ro_id: 'ro_001',
        request: 'Customer is here for an oil change. What should I recommend?'
      },
      {
        triggered_by: 'service_advisor_request'
      }
    );

    console.log('\nOtto Response:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\nArtifact Created:', result.artifact_id);
    console.log('Execution Time (ms):', result.execution_time_ms);
    console.log('\n✅ Otto test complete');
  } catch (error) {
    console.error('\n❌ Otto test failed:', error);
  }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testOtto().then(() => {
    process.exit(0);
  });
}




















