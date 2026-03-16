import 'dotenv/config';

/**
 * Test The Edge AI API Endpoint
 * Tests the /api/edge-ai/query endpoint end-to-end
 */

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';

async function testEdgeAIAPI() {
  console.log('🧠 Testing The Edge AI API Endpoint\n');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE}`);
  console.log('='.repeat(60) + '\n');

  const testCases = [
    {
      name: 'Simple Pricing Query',
      message: "What's the approval probability on this $500 brake job?",
      context: {
        customer_id: 'test_cust_001',
        ro_number: 'RO-TEST-001'
      },
      expectedStatus: 200,
      expectedFields: ['success', 'response', 'confidence', 'execution_time_ms']
    },
    {
      name: 'Service Recommendation',
      message: "Customer is here for an oil change. What should I recommend?",
      context: {
        customer_id: 'test_cust_002'
      },
      expectedStatus: 200,
      expectedFields: ['success', 'response']
    },
    {
      name: 'Diagnostics Query',
      message: "Check engine light is on, car runs rough. What should I do?",
      context: {
        customer_id: 'test_cust_003',
        vehicle_id: 'test_vehicle_001'
      },
      expectedStatus: 200,
      expectedFields: ['success', 'response']
    },
    {
      name: 'Multi-Intent Query',
      message: "Customer wants brake quote and hasn't visited in 6 months",
      context: {
        customer_id: 'test_cust_004',
        ro_number: 'RO-TEST-004'
      },
      expectedStatus: 200,
      expectedFields: ['success', 'response', '_metadata']
    },
    {
      name: 'Empty Message (Validation Test)',
      message: '',
      context: {},
      expectedStatus: 400, // Should fail validation
      expectedFields: ['error']
    }
  ];

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const testCase of testCases) {
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`   Message: "${testCase.message.substring(0, 60)}${testCase.message.length > 60 ? '...' : ''}"`);
    console.log(`   Expected Status: ${testCase.expectedStatus}`);
    console.log('   Running...\n');

    try {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/edge-ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: testCase.message,
          context: testCase.context
        })
      });

      const executionTime = Date.now() - startTime;
      const data = await response.json();

      // Check status code
      if (response.status === testCase.expectedStatus) {
        console.log(`   ✅ Status Code: ${response.status} (expected ${testCase.expectedStatus})`);
        
        // Check expected fields
        const missingFields = testCase.expectedFields.filter(
          field => !(field in data)
        );

        if (missingFields.length === 0) {
          console.log(`   ✅ All expected fields present`);
          
          // Display response preview
          if (data.success && data.response) {
            const preview = data.response.substring(0, 100);
            console.log(`   📄 Response: "${preview}${data.response.length > 100 ? '...' : ''}"`);
            console.log(`   📊 Confidence: ${data.confidence ? (data.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
            console.log(`   ⏱️  Execution Time: ${data.execution_time_ms || executionTime}ms`);
            
            if (data._metadata && data._metadata.agents_consulted) {
              console.log(`   👥 Agents: ${data._metadata.agents_consulted.join(', ')}`);
            }
          } else if (data.error) {
            console.log(`   ⚠️  Error: ${data.error}`);
          }

          passed++;
          results.push({
            name: testCase.name,
            status: 'PASSED',
            response_time_ms: data.execution_time_ms || executionTime,
            http_status: response.status
          });
        } else {
          console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
          failed++;
          results.push({
            name: testCase.name,
            status: 'FAILED',
            reason: `Missing fields: ${missingFields.join(', ')}`
          });
        }
      } else {
        console.log(`   ❌ Status Code: ${response.status} (expected ${testCase.expectedStatus})`);
        if (data.error) {
          console.log(`   Error: ${data.error}`);
        }
        failed++;
        results.push({
          name: testCase.name,
          status: 'FAILED',
          reason: `Wrong status code: ${response.status}`
        });
      }
    } catch (error) {
      console.log(`   ❌ Request Failed: ${error.message}`);
      failed++;
      results.push({
        name: testCase.name,
        status: 'FAILED',
        reason: error.message
      });
    }

    console.log('   ' + '-'.repeat(56) + '\n');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('API TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

  if (passed > 0) {
    const avgTime = results
      .filter(r => r.response_time_ms)
      .reduce((sum, r) => sum + r.response_time_ms, 0) / results.filter(r => r.response_time_ms).length;
    console.log(`⏱️  Average Response Time: ${avgTime.toFixed(0)}ms`);
  }

  console.log('\n📊 Detailed Results:');
  results.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`   ${icon} ${result.name}: ${result.status}`);
    if (result.response_time_ms) {
      console.log(`      Time: ${result.response_time_ms}ms`);
    }
    if (result.reason) {
      console.log(`      Reason: ${result.reason}`);
    }
  });

  if (failed === 0) {
    console.log('\n🎉 All API tests passed! The Edge AI endpoint is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.');
  }

  return failed === 0;
}

// Check if server is accessible first
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      console.log('✅ API server is running\n');
      return true;
    }
  } catch (error) {
    console.log('⚠️  API server health check failed. Is the server running?');
    console.log('   Start server with: node src/artifact-storage/server.js\n');
    return false;
  }
  return false;
}

// Main execution
async function main() {
  const serverRunning = await checkServerHealth();
  
  if (!serverRunning) {
    console.log('❌ Cannot test API - server is not running.');
    console.log('   Please start the API server first.\n');
    process.exit(1);
  }

  const success = await testEdgeAIAPI();
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
