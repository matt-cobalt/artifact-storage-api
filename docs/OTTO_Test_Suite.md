# OTTO Test Suite - Validation Scripts

**Version:** 1.0  
**Date:** December 17, 2024  
**Purpose:** Comprehensive test cases for validating OTTO orchestration system

---

## Test Execution

### Running the Tests

```bash
# Run all tests
node src/scripts/test-otto-orchestration.js

# Run specific test category
node src/scripts/test-otto-orchestration.js --category single-agent
```

### Test Structure

Each test includes:
- **Input:** Message and context
- **Expected Agents:** Which agents should be consulted
- **Expected Intents:** Which intents should be detected
- **Success Criteria:** What to verify in response
- **Timeout:** Maximum execution time (should be < 3s)

---

## Category 1: Single-Agent Routing (5 Tests)

### Test 1: CAL - Pricing Query

```javascript
{
  test_id: "test_01_cal_pricing",
  name: "CAL Pricing - Approval Probability",
  input: {
    message: "What's the approval probability on this $500 estimate?",
    context: {
      customer_id: "cust_test_001",
      ro_number: "RO-TEST-001",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["cal"],
  expected_intents: ["pricing"],
  success_criteria: [
    "Response mentions approval percentage (e.g., '87%')",
    "Response includes pricing context",
    "Only CAL agent consulted",
    "Execution time < 3000ms"
  ],
  expected_response_fields: ["response", "confidence", "execution_time_ms", "agents_consulted"]
}
```

### Test 2: DEX - Diagnostics Query

```javascript
{
  test_id: "test_02_dex_diagnostics",
  name: "DEX Diagnostics - Check Engine Light",
  input: {
    message: "Customer says check engine light is on and car runs rough",
    context: {
      customer_id: "cust_test_002",
      vehicle_id: "vehicle_test_001",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["dex"],
  expected_intents: ["diagnostics"],
  success_criteria: [
    "Response mentions diagnostic procedure",
    "Response suggests scan or diagnostic steps",
    "Only DEX agent consulted",
    "Execution time < 3000ms"
  ]
}
```

### Test 3: FLO - Scheduling Query

```javascript
{
  test_id: "test_03_flo_scheduling",
  name: "FLO Scheduling - Appointment Booking",
  input: {
    message: "Schedule oil change for tomorrow at 10am",
    context: {
      customer_id: "cust_test_003",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["flo"],
  expected_intents: ["scheduling"],
  success_criteria: [
    "Response confirms appointment time",
    "Response mentions scheduling details",
    "Only FLO agent consulted",
    "Execution time < 3000ms"
  ]
}
```

### Test 4: MILES - Retention Query

```javascript
{
  test_id: "test_04_miles_retention",
  name: "MILES Retention - Customer Win-Back",
  input: {
    message: "This customer hasn't been back in 6 months, what should we do?",
    context: {
      customer_id: "cust_test_004",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["miles"],
  expected_intents: ["retention"],
  success_criteria: [
    "Response suggests win-back strategy",
    "Response mentions follow-up actions",
    "Response includes churn risk assessment",
    "Only MILES agent consulted",
    "Execution time < 3000ms"
  ]
}
```

### Test 5: LANCE - Fraud Detection Query

```javascript
{
  test_id: "test_05_lance_fraud",
  name: "LANCE Compliance - Fraud Detection",
  input: {
    message: "Customer requesting third brake replacement this month, seems suspicious",
    context: {
      customer_id: "cust_test_005",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["lance"],
  expected_intents: ["compliance"],
  success_criteria: [
    "Response flags potential fraud",
    "Response suggests verification steps",
    "Response includes compliance recommendations",
    "Only LANCE agent consulted",
    "Execution time < 3000ms"
  ]
}
```

---

## Category 2: Multi-Agent Coordination (5 Tests)

### Test 6: CAL + MILES Coordination

```javascript
{
  test_id: "test_06_cal_miles",
  name: "CAL + MILES - Pricing with Retention Context",
  input: {
    message: "Customer wants brake quote, they haven't visited in a while",
    context: {
      customer_id: "cust_test_006",
      ro_number: "RO-TEST-006",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["cal", "miles"], // May also include "roy" for business context
  expected_intents: ["pricing", "retention"],
  success_criteria: [
    "Response includes pricing/quote information",
    "Response includes retention/win-back strategy",
    "Both agents consulted (verified in agents_consulted array)",
    "Response is synthesized (not just concatenated)",
    "Execution time < 3000ms (parallel execution)"
  ]
}
```

### Test 7: DEX + VIN Coordination

```javascript
{
  test_id: "test_07_dex_vin",
  name: "DEX + VIN - Vehicle-Specific Diagnostics",
  input: {
    message: "2019 Honda Civic check engine light, what could it be?",
    context: {
      customer_id: "cust_test_007",
      vehicle_id: "vehicle_test_007",
      vin: "19XFC2F59KE123456",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["dex", "vin"],
  expected_intents: ["diagnostics", "vehicle"],
  success_criteria: [
    "Response includes diagnostic procedure",
    "Response includes Honda Civic-specific information",
    "Response mentions vehicle history or recalls if relevant",
    "Both DEX and VIN consulted",
    "Execution time < 3000ms"
  ]
}
```

### Test 8: FLO + MAC + KIT Coordination

```javascript
{
  test_id: "test_08_flo_mac_kit",
  name: "FLO + MAC + KIT - Complex Service Coordination",
  input: {
    message: "Schedule transmission service, need parts ordered and bay assigned",
    context: {
      customer_id: "cust_test_008",
      vehicle_id: "vehicle_test_008",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["flo", "mac", "kit"], // May also include "roy"
  expected_intents: ["scheduling", "production", "parts"],
  success_criteria: [
    "Response includes appointment scheduling",
    "Response includes bay/tech assignment",
    "Response includes parts availability/ordering",
    "All three agents consulted",
    "Response coordinates all aspects coherently",
    "Execution time < 3000ms (parallel)"
  ]
}
```

### Test 9: CAL + VIN + KIT Coordination

```javascript
{
  test_id: "test_09_cal_vin_kit",
  name: "CAL + VIN + KIT - Complete Quote with Vehicle & Parts",
  input: {
    message: "New customer, 2019 Toyota Camry, needs brake pads and wants quote",
    context: {
      customer_id: "cust_test_009",
      vehicle_id: "vehicle_test_009",
      vin: "4T1B11HK5KU123456",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["cal", "vin", "kit"], // May also include "miles" and "roy"
  expected_intents: ["pricing", "vehicle", "parts"],
  success_criteria: [
    "Response includes complete quote",
    "Response includes Toyota Camry-specific information",
    "Response includes parts availability",
    "All relevant agents consulted",
    "Response is comprehensive and coherent",
    "Execution time < 3000ms"
  ]
}
```

### Test 10: LANCE + VIN + ROY Coordination

```javascript
{
  test_id: "test_10_lance_vin_roy",
  name: "LANCE + VIN + ROY - Fraud Check with Context",
  input: {
    message: "Customer requesting warranty brake job, third time this year, verify service history",
    context: {
      customer_id: "cust_test_010",
      vehicle_id: "vehicle_test_010",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["lance", "vin", "roy"],
  expected_intents: ["compliance", "vehicle", "business_intel"],
  success_criteria: [
    "Response includes fraud/compliance assessment",
    "Response includes vehicle service history verification",
    "Response includes business context (pattern analysis)",
    "All three agents consulted",
    "Response provides comprehensive risk assessment",
    "Execution time < 3000ms"
  ]
}
```

---

## Category 3: Error Handling Tests (5 Tests)

### Test 11: Agent Timeout Simulation

```javascript
{
  test_id: "test_11_agent_timeout",
  name: "Single Agent Timeout - Graceful Degradation",
  scenario: "CAL takes 5 seconds to respond (exceeds 3s timeout)",
  input: {
    message: "What's the approval probability on this $500 job?",
    context: {
      customer_id: "cust_test_011",
      ro_number: "RO-TEST-011",
      shop_id: "shop_test_001",
      simulate_timeout: true, // Test flag to simulate timeout
      timeout_agent: "cal"
    }
  },
  expected_behavior: [
    "CAL times out after 3 seconds",
    "Other agents (if any) continue normally",
    "Response is still delivered (may be partial or fallback)",
    "CAL timeout logged in agents_timed_out array",
    "No error thrown to user"
  ],
  success_criteria: [
    "Request completes successfully (200 status)",
    "Response includes helpful message (not blank)",
    "CAL in agents_timed_out array",
    "Error logged in otto_errors table",
    "Execution completes (not hanging)"
  ]
}
```

### Test 12: All Agents Timeout

```javascript
{
  test_id: "test_12_all_timeout",
  name: "All Agents Timeout - Fallback Response",
  scenario: "All agents timeout simultaneously",
  input: {
    message: "What should I recommend for this customer?",
    context: {
      customer_id: "cust_test_012",
      shop_id: "shop_test_001",
      simulate_timeout: true,
      timeout_agent: "all"
    }
  },
  expected_behavior: [
    "All agents timeout",
    "Fallback response delivered",
    "No blank screen or error to user"
  ],
  success_criteria: [
    "Request completes (200 status)",
    "Response includes fallback message: 'I'm having trouble processing that right now...'",
    "All agents in agents_timed_out array",
    "fallback_used = true in orchestration record",
    "Errors logged appropriately"
  ]
}
```

### Test 13: Agent Error Handling

```javascript
{
  test_id: "test_13_agent_error",
  name: "Agent Returns Error - Continue with Others",
  scenario: "CAL throws error, MILES succeeds",
  input: {
    message: "Customer wants quote, hasn't visited in months",
    context: {
      customer_id: "cust_test_013",
      shop_id: "shop_test_001",
      simulate_error: true,
      error_agent: "cal"
    }
  },
  expected_behavior: [
    "CAL returns error",
    "MILES continues and succeeds",
    "Synthesis uses MILES response",
    "Error logged but request succeeds"
  ],
  success_criteria: [
    "Request completes (200 status)",
    "Response includes MILES retention insights",
    "CAL in agents_errored array",
    "Error logged in otto_errors table",
    "No error thrown to user"
  ]
}
```

### Test 14: Synthesis Failure Handling

```javascript
{
  test_id: "test_14_synthesis_failure",
  name: "Synthesis Logic Fails - Single Agent Fallback",
  scenario: "Synthesis logic throws error, fall back to single agent response",
  input: {
    message: "What's the approval probability?",
    context: {
      customer_id: "cust_test_014",
      shop_id: "shop_test_001",
      simulate_synthesis_error: true
    }
  },
  expected_behavior: [
    "Synthesis logic catches error",
    "Returns best single-agent response",
    "fallback_used = true",
    "Error logged"
  ],
  success_criteria: [
    "Request completes (200 status)",
    "Response delivered (single agent's response)",
    "fallback_used = true in orchestration record",
    "Synthesis error logged in otto_errors table"
  ]
}
```

### Test 15: Network Error Handling

```javascript
{
  test_id: "test_15_network_error",
  name: "Agent API Unavailable - Network Error",
  scenario: "Agent endpoint returns 500 or network error",
  input: {
    message: "What's the approval probability?",
    context: {
      customer_id: "cust_test_015",
      shop_id: "shop_test_001",
      simulate_network_error: true,
      error_agent: "cal"
    }
  },
  expected_behavior: [
    "CAL API returns error",
    "Request continues (doesn't fail)",
    "Graceful degradation",
    "Error logged"
  ],
  success_criteria: [
    "Request completes (200 status)",
    "Response delivered (may be partial)",
    "CAL in agents_errored array",
    "Network error logged in otto_errors table",
    "User receives helpful response"
  ]
}
```

---

## Category 4: Edge Cases (5 Tests)

### Test 16: Ambiguous Intent

```javascript
{
  test_id: "test_16_ambiguous_intent",
  name: "Ambiguous Query - General Help",
  input: {
    message: "Help",
    context: {
      customer_id: "cust_test_016",
      shop_id: "shop_test_001"
    }
  },
  expected_behavior: [
    "OTTO (service_advisor) routes as fallback",
    "Response provides helpful guidance or requests clarification",
    "No error thrown"
  ],
  expected_agents: ["otto"], // Default fallback
  expected_intents: ["service_advisor"],
  success_criteria: [
    "Request completes successfully",
    "Response is helpful (not error)",
    "OTTO agent consulted",
    "Execution time < 3000ms"
  ]
}
```

### Test 17: Multiple Conflicting Intents

```javascript
{
  test_id: "test_17_conflicting_intents",
  name: "Conflicting Requests - Handle Both",
  input: {
    message: "Cancel my appointment and also give me a quote for brake service",
    context: {
      customer_id: "cust_test_017",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["flo", "cal"], // Scheduling + Pricing
  expected_intents: ["scheduling", "pricing"],
  success_criteria: [
    "Both intents detected",
    "Both FLO and CAL consulted",
    "Response addresses both requests (or requests clarification)",
    "Execution time < 3000ms"
  ]
}
```

### Test 18: Empty Message

```javascript
{
  test_id: "test_18_empty_message",
  name: "Empty Message - Validation",
  input: {
    message: "",
    context: {
      customer_id: "cust_test_018",
      shop_id: "shop_test_001"
    }
  },
  expected_behavior: [
    "Validation error or fallback to OTTO",
    "Helpful error message returned"
  ],
  success_criteria: [
    "Request completes (400 or 200 with helpful message)",
    "No crash or 500 error",
    "User receives guidance"
  ]
}
```

### Test 19: Very Long Message

```javascript
{
  test_id: "test_19_long_message",
  name: "Very Long Message - Processing",
  input: {
    message: "Customer came in today complaining about their 2019 Honda Civic that has been making a strange noise when they brake, especially when it's cold outside, and they mentioned the check engine light came on last week, and they want to know if they should get brake pads replaced or if it's something else, and they're worried about cost, and they haven't been in for service in about 8 months, so we should probably do a full inspection, what do you recommend?",
    context: {
      customer_id: "cust_test_019",
      vehicle_id: "vehicle_test_019",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["dex", "cal", "miles", "otto"], // Multiple intents detected
  expected_intents: ["diagnostics", "pricing", "retention", "service_advisor"],
  success_criteria: [
    "All relevant intents detected",
    "Multiple agents consulted appropriately",
    "Response is comprehensive",
    "Execution time < 3000ms"
  ]
}
```

### Test 20: Special Characters and Edge Cases

```javascript
{
  test_id: "test_20_special_characters",
  name: "Special Characters - Input Sanitization",
  input: {
    message: "What's the approval probability on this $500.99 job? (customer is VIP!)",
    context: {
      customer_id: "cust_test_020",
      ro_number: "RO-TEST-020",
      shop_id: "shop_test_001"
    }
  },
  expected_agents: ["cal"],
  expected_intents: ["pricing"],
  success_criteria: [
    "Special characters handled correctly",
    "Intent classification works (pricing detected)",
    "CAL consulted",
    "Response is valid",
    "No parsing errors"
  ]
}
```

---

## Test Execution Script

### Automated Test Runner

```javascript
// src/scripts/test-otto-orchestration-suite.js
import { orchestrate } from '../orchestration/otto-orchestrator.js';
import tests from '../docs/test-cases.json'; // Import test definitions

async function runTestSuite() {
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  for (const test of tests) {
    try {
      console.log(`\nRunning: ${test.name}`);
      
      const startTime = Date.now();
      const result = await orchestrate(test.input.message, test.input.context);
      const executionTime = Date.now() - startTime;

      // Validate results
      const validation = validateTest(test, result, executionTime);
      
      if (validation.passed) {
        results.passed++;
        console.log(`✅ PASSED: ${test.name}`);
      } else {
        results.failed++;
        console.log(`❌ FAILED: ${test.name}`);
        console.log(`   Reasons: ${validation.failures.join(', ')}`);
      }

      results.details.push({
        test_id: test.test_id,
        name: test.name,
        passed: validation.passed,
        execution_time_ms: executionTime,
        failures: validation.failures
      });

    } catch (error) {
      results.failed++;
      console.log(`❌ ERROR: ${test.name} - ${error.message}`);
      results.details.push({
        test_id: test.test_id,
        name: test.name,
        passed: false,
        error: error.message
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`Success Rate: ${((results.passed / tests.length) * 100).toFixed(1)}%`);

  return results;
}

function validateTest(test, result, executionTime) {
  const failures = [];

  // Check expected agents
  if (test.expected_agents) {
    const agentsConsulted = result.agents_consulted || [];
    const missingAgents = test.expected_agents.filter(agent => 
      !agentsConsulted.includes(agent.toLowerCase())
    );
    if (missingAgents.length > 0) {
      failures.push(`Missing agents: ${missingAgents.join(', ')}`);
    }
  }

  // Check execution time
  if (executionTime > 5000) {
    failures.push(`Execution time too slow: ${executionTime}ms (expected < 5000ms)`);
  }

  // Check response exists
  if (!result.response || result.response.trim().length === 0) {
    failures.push('Empty response');
  }

  // Check success status
  if (!result.success) {
    failures.push(`Request failed: ${result.error || 'Unknown error'}`);
  }

  return {
    passed: failures.length === 0,
    failures
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTestSuite()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test suite error:', err);
      process.exit(1);
    });
}
```

---

## Test Results Format

### Expected Output

```
Running: CAL Pricing - Approval Probability
✅ PASSED: CAL Pricing - Approval Probability

Running: DEX Diagnostics - Check Engine Light
✅ PASSED: DEX Diagnostics - Check Engine Light

...

============================================================
TEST SUITE SUMMARY
============================================================
Total Tests: 20
✅ Passed: 18
❌ Failed: 2
⏭️  Skipped: 0
Success Rate: 90.0%
```

---

## Manual Testing Checklist

For manual testing, verify:

- [ ] Each agent can be triggered independently
- [ ] Multi-agent coordination works correctly
- [ ] Timeouts are handled gracefully
- [ ] Errors don't crash the system
- [ ] Response synthesis is coherent
- [ ] Execution times are acceptable (< 3s)
- [ ] Database logging works correctly
- [ ] All 13 agents are accessible via orchestration

---

**Test Suite Version:** 1.0  
**Last Updated:** December 17, 2024









