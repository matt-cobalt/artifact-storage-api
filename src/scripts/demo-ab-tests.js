/**
 * Demo A/B Test Scenarios
 * 5 example A/B tests demonstrating different optimization scenarios
 */

import 'dotenv/config';
import * as ABTesting from '../routes/ab-testing.js';

const SHOP_ID = process.env.DEMO_SHOP_ID || null;

/**
 * Test 1: REVENUE Agent Upsell Aggressiveness
 */
async function test1_RevenueUpsellAggressiveness() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: REVENUE Agent Upsell Aggressiveness');
  console.log('='.repeat(60));

  const testData = {
    agent_id: 'sv01-revenue',
    shop_id: SHOP_ID,
    test_name: 'REVENUE Upsell Aggressiveness',
    hypothesis: 'Higher temperature (0.8) leads to more upsells while maintaining quality',
    variant_a: {
      version_name: 'conservative_upsell',
      system_prompt: `You are REVENUE, the revenue optimization agent. You recommend upsells conservatively, only when clearly beneficial to the customer. Maintain high customer satisfaction.`,
      temperature: 0.3,
      created_by: 'system'
    },
    variant_b: {
      version_name: 'aggressive_upsell',
      system_prompt: `You are REVENUE, the revenue optimization agent. You actively identify and recommend upsell opportunities to maximize revenue while maintaining customer trust.`,
      temperature: 0.8,
      created_by: 'system'
    },
    minimum_sample_size: 100,
    minimum_improvement_percent: 5.0,
    minimum_duration_days: 7
  };

  const test = await ABTesting.createTest(testData);
  console.log(`Test created: ${test.id}`);
  console.log(`Hypothesis: ${test.hypothesis}`);
  return test;
}

/**
 * Test 2: RETENTION Agent Timing
 */
async function test2_RetentionTiming() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: RETENTION Agent Timing');
  console.log('='.repeat(60));

  const testData = {
    agent_id: 'sv02-retention',
    shop_id: SHOP_ID,
    test_name: 'RETENTION Contact Timing',
    hypothesis: 'Contacting customers 3 months after service is optimal for win-back vs 6 months',
    variant_a: {
      version_name: '3_month_contact',
      system_prompt: `You are RETENTION, the customer retention agent. You contact customers 3 months after their last service to maintain engagement and encourage return visits.`,
      temperature: 0.6,
      created_by: 'system'
    },
    variant_b: {
      version_name: '6_month_contact',
      system_prompt: `You are RETENTION, the customer retention agent. You contact customers 6 months after their last service to re-engage lapsed customers.`,
      temperature: 0.6,
      created_by: 'system'
    },
    minimum_sample_size: 150,
    minimum_improvement_percent: 5.0,
    minimum_duration_days: 14
  };

  const test = await ABTesting.createTest(testData);
  console.log(`Test created: ${test.id}`);
  return test;
}

/**
 * Test 3: OTTO System Prompt Complexity
 */
async function test3_OttoPromptComplexity() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: OTTO System Prompt Complexity');
  console.log('='.repeat(60));

  const detailedPrompt = `You are OTTO, the intelligent service advisor and gateway agent. Your role is to serve as the primary point of contact for customers, capturing their needs, analyzing context, and routing them to specialized agents when appropriate. You excel at understanding customer intent, providing initial guidance, and ensuring smooth handoffs to domain experts. You maintain a friendly, professional demeanor while efficiently gathering information and determining the best path forward for each customer interaction. Your comprehensive understanding of all agent capabilities allows you to make intelligent routing decisions.`;

  const concisePrompt = `You are OTTO, the service advisor gateway. You greet customers, understand their needs, and route to specialists. Be friendly and efficient.`;

  const testData = {
    agent_id: 'otto',
    shop_id: SHOP_ID,
    test_name: 'OTTO Prompt Complexity',
    hypothesis: 'Concise prompt (150 words) performs as well as detailed (500 words) but with faster response times',
    variant_a: {
      version_name: 'detailed_prompt',
      system_prompt: detailedPrompt,
      temperature: 0.7,
      created_by: 'system'
    },
    variant_b: {
      version_name: 'concise_prompt',
      system_prompt: concisePrompt,
      temperature: 0.7,
      created_by: 'system'
    },
    minimum_sample_size: 100,
    minimum_improvement_percent: 0.0, // Any improvement counts
    minimum_duration_days: 7
  };

  const test = await ABTesting.createTest(testData);
  console.log(`Test created: ${test.id}`);
  return test;
}

/**
 * Test 4: COMMS Agent Tone
 */
async function test4_CommsTone() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: COMMS Agent Tone');
  console.log('='.repeat(60));

  const testData = {
    agent_id: 'sv04-comms',
    shop_id: SHOP_ID,
    test_name: 'COMMS Agent Tone',
    hypothesis: 'Friendly, casual tone increases customer response rate vs professional, formal tone',
    variant_a: {
      version_name: 'professional_tone',
      system_prompt: `You are COMMS, the communications agent. You communicate with customers using a professional, formal tone. Maintain business etiquette and clarity in all communications.`,
      temperature: 0.5,
      created_by: 'system'
    },
    variant_b: {
      version_name: 'friendly_tone',
      system_prompt: `You are COMMS, the communications agent. You communicate with customers using a friendly, casual tone. Be warm, approachable, and conversational while maintaining professionalism.`,
      temperature: 0.7,
      created_by: 'system'
    },
    minimum_sample_size: 200,
    minimum_improvement_percent: 5.0,
    minimum_duration_days: 10
  };

  const test = await ABTesting.createTest(testData);
  console.log(`Test created: ${test.id}`);
  return test;
}

/**
 * Test 5: MARKETING Campaign Triggers
 */
async function test5_MarketingTriggers() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: MARKETING Campaign Triggers');
  console.log('='.repeat(60));

  const testData = {
    agent_id: 'sv07-marketing',
    shop_id: SHOP_ID,
    test_name: 'MARKETING Offer Timing',
    hypothesis: 'Waiting 48 hours after RO close before sending offer increases conversion vs immediate offer',
    variant_a: {
      version_name: 'immediate_offer',
      system_prompt: `You are MARKETING, the marketing intelligence agent. You send promotional offers immediately after repair order completion to capture customer attention while service experience is fresh.`,
      temperature: 0.6,
      created_by: 'system'
    },
    variant_b: {
      version_name: 'delayed_offer',
      system_prompt: `You are MARKETING, the marketing intelligence agent. You wait 48 hours after repair order completion before sending promotional offers, allowing customers to process their experience first.`,
      temperature: 0.6,
      created_by: 'system'
    },
    minimum_sample_size: 150,
    minimum_improvement_percent: 5.0,
    minimum_duration_days: 14
  };

  const test = await ABTesting.createTest(testData);
  console.log(`Test created: ${test.id}`);
  return test;
}

/**
 * Run all demo tests
 */
async function runAllDemoTests() {
  console.log('='.repeat(60));
  console.log('🤖 A/B TEST DEMO SCENARIOS');
  console.log('='.repeat(60));

  try {
    const tests = [];

    tests.push(await test1_RevenueUpsellAggressiveness());
    tests.push(await test2_RetentionTiming());
    tests.push(await test3_OttoPromptComplexity());
    tests.push(await test4_CommsTone());
    tests.push(await test5_MarketingTriggers());

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL DEMO TESTS CREATED');
    console.log('='.repeat(60));
    console.log(`\nTotal tests: ${tests.length}`);
    console.log(`Test IDs: ${tests.map(t => t.id).join(', ')}`);

    return tests;
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDemoTests().catch(console.error);
}

export {
  test1_RevenueUpsellAggressiveness,
  test2_RetentionTiming,
  test3_OttoPromptComplexity,
  test4_CommsTone,
  test5_MarketingTriggers,
  runAllDemoTests
};



















