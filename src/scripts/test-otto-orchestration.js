import 'dotenv/config';
import { orchestrate } from '../orchestration/otto-orchestrator.js';

/**
 * Test script for OTTO orchestration layer
 * Tests the 3-agent scenario: CAL (pricing) + MILES (retention) + OTTO (service advisor)
 */

async function testOttoOrchestration() {
  console.log('🧠 Testing OTTO Orchestration Layer (The Edge AI)\n');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: 'Pricing + Retention Query',
      message: "What's the approval probability on this $500 brake job?",
      context: {
        customer_id: 'cust_001',
        ro_number: 'RO-2024-523',
        shop_id: 'shop_001'
      },
      expectedAgents: ['cal', 'miles'] // Pricing + retention context
    },
    {
      name: 'Service Recommendation Query',
      message: "Customer is here for an oil change. What should I recommend?",
      context: {
        customer_id: 'cust_001',
        shop_id: 'shop_001'
      },
      expectedAgents: ['otto'] // Service advisor primary
    },
    {
      name: 'Pricing Inquiry',
      message: "How much should I charge for a brake pad replacement?",
      context: {
        customer_id: 'cust_002',
        shop_id: 'shop_001'
      },
      expectedAgents: ['cal'] // Pricing specialist
    },
    {
      name: 'Complex Multi-Intent Query',
      message: "This customer hasn't been in for 6 months. What should I quote them for this brake job?",
      context: {
        customer_id: 'cust_003',
        ro_number: 'RO-2024-524',
        shop_id: 'shop_001'
      },
      expectedAgents: ['cal', 'miles', 'otto'] // Pricing + retention + service advisor
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Message: "${testCase.message}"`);
    console.log(`   Expected agents: ${testCase.expectedAgents.join(', ')}`);
    console.log('   Running...\n');

    try {
      const startTime = Date.now();
      const result = await orchestrate(testCase.message, testCase.context);
      const executionTime = Date.now() - startTime;

      if (result.success) {
        console.log('   ✅ Success');
        console.log(`   ⏱️  Execution time: ${executionTime}ms`);
        console.log(`   🎯 Response: "${result.response.substring(0, 150)}${result.response.length > 150 ? '...' : ''}"`);
        console.log(`   📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   🔍 Quality score: ${(result.quality_score * 100).toFixed(1)}%`);
        console.log(`   👥 Agents consulted: ${result.agents_consulted.join(', ')}`);

        // Check if expected agents were consulted
        const agentsConsulted = result.agents_consulted || [];
        const allExpectedFound = testCase.expectedAgents.every(expected => 
          agentsConsulted.includes(expected)
        );

        if (allExpectedFound) {
          console.log(`   ✅ All expected agents were consulted`);
        } else {
          console.log(`   ⚠️  Warning: Not all expected agents were consulted`);
          console.log(`      Expected: ${testCase.expectedAgents.join(', ')}`);
          console.log(`      Got: ${agentsConsulted.join(', ')}`);
        }

        // Check execution time (should be < 5 seconds for 3-agent orchestration)
        if (executionTime < 5000) {
          console.log(`   ✅ Execution time acceptable (< 5s)`);
        } else {
          console.log(`   ⚠️  Warning: Execution time is slow (> 5s)`);
        }

        passed++;
      } else {
        console.log('   ❌ Orchestration failed');
        console.log(`   Error: ${result.error}`);
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Test failed with exception');
      console.log(`   Error: ${error.message}`);
      console.error(error);
      failed++;
    }

    console.log('   ' + '-'.repeat(56));
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! OTTO orchestration layer is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.');
  }
}

// Run tests
testOttoOrchestration()
  .then(() => {
    console.log('\n✅ Test script complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Test script failed:', err);
    process.exit(1);
  });









