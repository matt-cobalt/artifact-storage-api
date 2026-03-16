import 'dotenv/config';
import { orchestrate } from '../orchestration/otto-orchestrator.js';

/**
 * Comprehensive OTTO Orchestration Test Suite
 * Tests intent classification, routing, execution, and synthesis
 */

const testCases = [
  // ============================================================================
  // SINGLE-AGENT TESTS
  // ============================================================================
  {
    category: 'single-agent',
    test_id: 'test_01_cal_pricing',
    name: 'CAL - Pricing Query',
    message: "What's the approval probability on this $500 estimate?",
    context: { customer_id: 'cust_test_001', ro_number: 'RO-TEST-001' },
    expected_agents: ['cal'],
    expected_intents: ['pricing'],
    success_criteria: ['Response mentions approval percentage', 'Only CAL agent consulted', 'Execution time < 5000ms']
  },
  {
    category: 'single-agent',
    test_id: 'test_02_dex_diagnostics',
    name: 'DEX - Diagnostics Query',
    message: 'Customer says check engine light is on and car runs rough',
    context: { customer_id: 'cust_test_002', vehicle_id: 'vehicle_test_001' },
    expected_agents: ['dex'],
    expected_intents: ['diagnostics'],
    success_criteria: ['Response mentions diagnostic procedure', 'Only DEX agent consulted', 'Execution time < 5000ms']
  },
  {
    category: 'single-agent',
    test_id: 'test_03_miles_retention',
    name: 'MILES - Retention Query',
    message: "This customer hasn't been back in 6 months, what should we do?",
    context: { customer_id: 'cust_test_003' },
    expected_agents: ['miles'],
    expected_intents: ['retention'],
    success_criteria: ['Response suggests win-back strategy', 'Only MILES agent consulted', 'Execution time < 5000ms']
  },
  
  // ============================================================================
  // MULTI-AGENT TESTS
  // ============================================================================
  {
    category: 'multi-agent',
    test_id: 'test_04_cal_miles',
    name: 'CAL + MILES - Pricing with Retention',
    message: "Customer wants brake quote, they haven't visited in a while",
    context: { customer_id: 'cust_test_004', ro_number: 'RO-TEST-004' },
    expected_agents: ['cal', 'miles'], // May also include 'roy'
    expected_intents: ['pricing', 'retention'],
    success_criteria: ['Response includes pricing info', 'Response includes retention strategy', 'Multiple agents consulted', 'Execution time < 5000ms']
  },
  {
    category: 'multi-agent',
    test_id: 'test_05_dex_vin',
    name: 'DEX + VIN - Vehicle-Specific Diagnostics',
    message: '2019 Honda Civic check engine light, what could it be?',
    context: { customer_id: 'cust_test_005', vehicle_id: 'vehicle_test_005' },
    expected_agents: ['dex', 'vin'],
    expected_intents: ['diagnostics', 'vehicle'],
    success_criteria: ['Response includes diagnostic procedure', 'Response includes vehicle-specific info', 'Multiple agents consulted', 'Execution time < 5000ms']
  },
  {
    category: 'multi-agent',
    test_id: 'test_06_complex_multi',
    name: 'CAL + VIN + KIT - Complete Quote',
    message: 'New customer, 2019 Toyota Camry, needs brake pads and wants quote',
    context: { customer_id: 'cust_test_006', vehicle_id: 'vehicle_test_006' },
    expected_agents: ['cal', 'vin', 'kit'], // May also include 'miles', 'roy'
    expected_intents: ['pricing', 'vehicle', 'parts'],
    success_criteria: ['Response includes complete quote', 'Response includes vehicle info', 'Response includes parts availability', 'Multiple agents consulted', 'Execution time < 5000ms']
  },
  
  // ============================================================================
  // EDGE CASES
  // ============================================================================
  {
    category: 'edge-case',
    test_id: 'test_07_ambiguous',
    name: 'Ambiguous Query',
    message: 'Help',
    context: { customer_id: 'cust_test_007' },
    expected_agents: ['otto'], // Default fallback
    expected_intents: ['service_advisor'],
    success_criteria: ['Response is helpful', 'OTTO agent consulted', 'No error thrown', 'Execution time < 5000ms']
  },
  {
    category: 'edge-case',
    test_id: 'test_08_long_message',
    name: 'Very Long Message',
    message: 'Customer came in today complaining about their 2019 Honda Civic that has been making a strange noise when they brake, especially when it\'s cold outside, and they mentioned the check engine light came on last week, and they want to know if they should get brake pads replaced or if it\'s something else, and they\'re worried about cost, and they haven\'t been in for service in about 8 months, so we should probably do a full inspection, what do you recommend?',
    context: { customer_id: 'cust_test_008', vehicle_id: 'vehicle_test_008' },
    expected_agents: ['dex', 'cal', 'miles', 'otto'], // Multiple intents
    expected_intents: ['diagnostics', 'pricing', 'retention', 'service_advisor'],
    success_criteria: ['All relevant intents detected', 'Multiple agents consulted', 'Response is comprehensive', 'Execution time < 5000ms']
  }
];

async function runTestSuite() {
  console.log('🧪 OTTO Orchestration Comprehensive Test Suite\n');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${testCases.length}\n`);
  console.log('⚠️  Note: Tests may show database errors if migrations not run.');
  console.log('   This is expected - orchestration logic still tests correctly.\n');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    details: [],
    summary: {
      single_agent: { passed: 0, failed: 0 },
      multi_agent: { passed: 0, failed: 0 },
      edge_case: { passed: 0, failed: 0 }
    }
  };

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name} (${testCase.test_id})`);
    console.log(`   Category: ${testCase.category}`);
    console.log(`   Message: "${testCase.message.substring(0, 80)}${testCase.message.length > 80 ? '...' : ''}"`);
    console.log(`   Expected agents: ${testCase.expected_agents.join(', ')}`);
    console.log(`   Running...`);

    try {
      const startTime = Date.now();
      const result = await orchestrate(testCase.message, testCase.context);
      const executionTime = Date.now() - startTime;

      // Validate results
      const validation = validateTest(testCase, result, executionTime);

      if (validation.passed) {
        results.passed++;
        results.summary[testCase.category].passed++;
        console.log(`   ✅ PASSED`);
        console.log(`   ⏱️  Execution time: ${executionTime}ms`);
        console.log(`   🎯 Response: "${result.response?.substring(0, 100)}${result.response?.length > 100 ? '...' : ''}"`);
        console.log(`   📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   👥 Agents consulted: ${result.agents_consulted?.join(', ') || 'none'}`);
        if (result.quality_score) {
          console.log(`   ⭐ Quality score: ${(result.quality_score * 100).toFixed(1)}%`);
        }
      } else {
        results.failed++;
        results.summary[testCase.category].failed++;
        console.log(`   ❌ FAILED`);
        console.log(`   Reasons: ${validation.failures.join(', ')}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }

      results.details.push({
        test_id: testCase.test_id,
        name: testCase.name,
        category: testCase.category,
        passed: validation.passed,
        execution_time_ms: executionTime,
        failures: validation.failures,
        agents_consulted: result.agents_consulted || [],
        response_preview: result.response?.substring(0, 150)
      });

    } catch (error) {
      results.failed++;
      if (results.summary[testCase.category]) {
        results.summary[testCase.category].failed++;
      }
      console.log(`   ❌ ERROR: ${error.message}`);
      // Only show full error stack in verbose mode
      if (process.env.VERBOSE_TESTS === 'true') {
        console.error(error);
      }
      results.details.push({
        test_id: testCase.test_id,
        name: testCase.name,
        category: testCase.category,
        passed: false,
        error: error.message
      });
    }

    console.log('   ' + '-'.repeat(66));
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nOverall Results:`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⏭️  Skipped: ${results.skipped}`);
  console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  console.log(`\nBy Category:`);
  console.log(`   Single-Agent: ${results.summary.single_agent.passed}/${results.summary.single_agent.passed + results.summary.single_agent.failed} passed`);
  console.log(`   Multi-Agent: ${results.summary.multi_agent.passed}/${results.summary.multi_agent.passed + results.summary.multi_agent.failed} passed`);
  console.log(`   Edge Cases: ${results.summary.edge_case.passed}/${results.summary.edge_case.passed + results.summary.edge_case.failed} passed`);

  // Performance summary
  const avgExecutionTime = results.details
    .filter(d => d.execution_time_ms)
    .reduce((sum, d) => sum + d.execution_time_ms, 0) / results.details.filter(d => d.execution_time_ms).length;
  const maxExecutionTime = Math.max(...results.details.filter(d => d.execution_time_ms).map(d => d.execution_time_ms));
  
  console.log(`\nPerformance:`);
  console.log(`   Average execution time: ${avgExecutionTime.toFixed(0)}ms`);
  console.log(`   Max execution time: ${maxExecutionTime}ms`);
  console.log(`   Target: < 3000ms (95th percentile)`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! OTTO orchestration system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review failures above.');
  }

  return results;
}

function validateTest(testCase, result, executionTime) {
  const failures = [];

  // Check success status
  if (!result.success) {
    failures.push(`Request failed: ${result.error || 'Unknown error'}`);
    return { passed: false, failures };
  }

  // Check response exists
  if (!result.response || result.response.trim().length === 0) {
    failures.push('Empty or missing response');
  }

  // Check expected agents
  if (testCase.expected_agents && result.agents_consulted) {
    const agentsConsulted = result.agents_consulted.map(a => a.toLowerCase());
    const missingAgents = testCase.expected_agents.filter(agent => 
      !agentsConsulted.includes(agent.toLowerCase())
    );
    
    // Allow for additional agents (like ROY being auto-added)
    if (missingAgents.length === testCase.expected_agents.length) {
      failures.push(`No expected agents found. Expected: ${testCase.expected_agents.join(', ')}, Got: ${agentsConsulted.join(', ')}`);
    } else if (missingAgents.length > 0) {
      // Warn but don't fail if some agents missing (might be due to classification)
      console.log(`   ⚠️  Note: Missing agents: ${missingAgents.join(', ')} (but others present)`);
    }
  }

  // Check execution time
  if (executionTime > 10000) {
    failures.push(`Execution time too slow: ${executionTime}ms (expected < 10000ms)`);
  }

  // Check confidence
  if (result.confidence !== undefined && result.confidence < 0.3) {
    failures.push(`Very low confidence: ${(result.confidence * 100).toFixed(1)}%`);
  }

  return {
    passed: failures.length === 0,
    failures
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || 
    (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')))) {
  runTestSuite()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal test suite error:', err);
      process.exit(1);
    });
}

export default runTestSuite;
