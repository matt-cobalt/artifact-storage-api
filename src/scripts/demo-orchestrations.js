/**
 * Demo Orchestration Scenarios
 * 5 scenarios demonstrating multi-agent orchestration
 */

import 'dotenv/config';
import { OrchestrationEngine } from '../lib/orchestration-engine.js';

const SHOP_ID = process.env.DEMO_SHOP_ID || null;

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scenario 1: Customer Churn Prevention
 * Request: "Identify high-risk churn customers and create retention campaign"
 */
async function scenario1_ChurnPrevention() {
  console.log('\n' + '='.repeat(60));
  console.log('SCENARIO 1: Customer Churn Prevention');
  console.log('='.repeat(60));

  const engine = new OrchestrationEngine(SHOP_ID);
  const request = 'Identify high-risk churn customers and create retention campaign';

  console.log(`\nRequest: "${request}"`);
  console.log('\nAnalyzing request complexity...');

  // Analyze
  const analysis = await engine.analyzeRequest(request);
  console.log(`Complexity Score: ${analysis.complexity_score}`);
  console.log(`Required Agents: ${analysis.required_agents.join(', ')}`);
  console.log(`Execution Strategy: ${analysis.execution_strategy}`);

  // Create plan
  const requestId = `churn-prevention-${Date.now()}`;
  const steps = [
    {
      agent_id: 'sv01-revenue',
      task_description: 'Calculate customer lifetime value for all customers',
      dependencies: [],
      input_data: { analysis_type: 'ltv' }
    },
    {
      agent_id: 'sv02-retention',
      task_description: 'Identify high-risk churn customers',
      dependencies: [],
      input_data: { risk_threshold: 0.7 }
    },
    {
      agent_id: 'sv07-marketing',
      task_description: 'Create retention campaign for high-risk customers',
      dependencies: ['step-1', 'step-2'], // Depends on previous steps
      input_data: { campaign_type: 'retention' }
    }
  ];

  const { plan } = await engine.createOrchestrationPlan(requestId, request, analysis, steps);
  console.log(`\nPlan created: ${plan.id}`);

  // Execute
  console.log('\nExecuting orchestration...');
  const results = await engine.executePlan(plan.id);

  // Synthesize
  console.log('\nSynthesizing results...');
  const synthesis = await engine.synthesizeResults(plan.id, 'analyze');

  console.log('\n✅ Scenario 1 Complete');
  console.log(`Final Result: ${JSON.stringify(synthesis.final_result, null, 2).substring(0, 200)}...`);

  return { plan_id: plan.id, synthesis };
}

/**
 * Scenario 2: Service Upsell Optimization
 * Request: "Which customers should get brake service offers this week?"
 */
async function scenario2_UpsellOptimization() {
  console.log('\n' + '='.repeat(60));
  console.log('SCENARIO 2: Service Upsell Optimization');
  console.log('='.repeat(60));

  const engine = new OrchestrationEngine(SHOP_ID);
  const request = 'Which customers should get brake service offers this week?';

  console.log(`\nRequest: "${request}"`);

  const analysis = await engine.analyzeRequest(request);
  const requestId = `upsell-optimization-${Date.now()}`;

  const steps = [
    {
      agent_id: 'sv06-insights',
      task_description: 'Analyze vehicle service patterns and identify brake service candidates',
      dependencies: [],
      input_data: { service_type: 'brake', timeframe: 'this_week' }
    },
    {
      agent_id: 'tekmetric',
      task_description: 'Query Tekmetric for vehicle brake service history',
      dependencies: [],
      input_data: { query_type: 'brake_service_history' }
    },
    {
      agent_id: 'sv01-revenue',
      task_description: 'Rank customers by value and likelihood to accept',
      dependencies: ['step-1', 'step-2'],
      input_data: { ranking_criteria: ['value', 'acceptance_likelihood'] }
    }
  ];

  const { plan } = await engine.createOrchestrationPlan(requestId, request, analysis, steps);
  const results = await engine.executePlan(plan.id);
  const synthesis = await engine.synthesizeResults(plan.id, 'merge');

  console.log('\n✅ Scenario 2 Complete');
  return { plan_id: plan.id, synthesis };
}

/**
 * Scenario 3: Performance Benchmarking
 * Request: "How does our shop perform vs. industry averages?"
 */
async function scenario3_PerformanceBenchmarking() {
  console.log('\n' + '='.repeat(60));
  console.log('SCENARIO 3: Performance Benchmarking');
  console.log('='.repeat(60));

  const engine = new OrchestrationEngine(SHOP_ID);
  const request = 'How does our shop perform vs. industry averages?';

  console.log(`\nRequest: "${request}"`);

  const analysis = await engine.analyzeRequest(request);
  const requestId = `benchmarking-${Date.now()}`;

  const steps = [
    {
      agent_id: 'sv06-insights',
      task_description: 'Collect shop performance metrics',
      dependencies: [],
      input_data: { metrics: ['revenue', 'customer_count', 'satisfaction'] }
    },
    {
      agent_id: 'sv08-strategy',
      task_description: 'Retrieve industry average data',
      dependencies: [],
      input_data: { comparison_type: 'industry_averages' }
    },
    {
      agent_id: 'f-analytics',
      task_description: 'Compare shop metrics vs. industry averages',
      dependencies: ['step-1', 'step-2'],
      input_data: { comparison_method: 'statistical' }
    }
  ];

  const { plan } = await engine.createOrchestrationPlan(requestId, request, analysis, steps);
  const results = await engine.executePlan(plan.id);
  const synthesis = await engine.synthesizeResults(plan.id, 'analyze');

  console.log('\n✅ Scenario 3 Complete');
  return { plan_id: plan.id, synthesis };
}

/**
 * Scenario 4: Marketing Campaign ROI
 * Request: "Analyze last month's SMS campaign effectiveness"
 */
async function scenario4_CampaignROI() {
  console.log('\n' + '='.repeat(60));
  console.log('SCENARIO 4: Marketing Campaign ROI');
  console.log('='.repeat(60));

  const engine = new OrchestrationEngine(SHOP_ID);
  const request = "Analyze last month's SMS campaign effectiveness";

  console.log(`\nRequest: "${request}"`);

  const analysis = await engine.analyzeRequest(request);
  const requestId = `campaign-roi-${Date.now()}`;

  const steps = [
    {
      agent_id: 'sv04-comms',
      task_description: 'Get SMS campaign send data and delivery rates',
      dependencies: [],
      input_data: { timeframe: 'last_month', campaign_type: 'sms' }
    },
    {
      agent_id: 'sv01-revenue',
      task_description: 'Calculate conversion rates and revenue from campaign',
      dependencies: ['step-1'],
      input_data: { attribution_window: 30 }
    },
    {
      agent_id: 'sv06-insights',
      task_description: 'Identify patterns in campaign performance',
      dependencies: ['step-1', 'step-2'],
      input_data: { analysis_depth: 'pattern_recognition' }
    }
  ];

  const { plan } = await engine.createOrchestrationPlan(requestId, request, analysis, steps);
  const results = await engine.executePlan(plan.id);
  const synthesis = await engine.synthesizeResults(plan.id, 'analyze');

  console.log('\n✅ Scenario 4 Complete');
  return { plan_id: plan.id, synthesis };
}

/**
 * Scenario 5: Autonomous Feature Development
 * Request: "Build new formula for predicting seasonal demand"
 */
async function scenario5_FeatureDevelopment() {
  console.log('\n' + '='.repeat(60));
  console.log('SCENARIO 5: Autonomous Feature Development');
  console.log('='.repeat(60));

  const engine = new OrchestrationEngine(SHOP_ID);
  const request = 'Build new formula for predicting seasonal demand';

  console.log(`\nRequest: "${request}"`);

  const analysis = await engine.analyzeRequest(request);
  const requestId = `feature-dev-${Date.now()}`;

  const steps = [
    {
      agent_id: 'f-research',
      task_description: 'Analyze historical seasonal demand patterns',
      dependencies: [],
      input_data: { research_type: 'seasonal_patterns', data_range: '2_years' }
    },
    {
      agent_id: 'f-backend',
      task_description: 'Build formula for seasonal demand prediction',
      dependencies: ['step-1'],
      input_data: { formula_type: 'seasonal_demand', complexity: 'advanced' }
    },
    {
      agent_id: 'f-testing',
      task_description: 'Validate formula accuracy and performance',
      dependencies: ['step-2'],
      input_data: { validation_method: 'historical_backtest', accuracy_threshold: 0.85 }
    }
  ];

  const { plan } = await engine.createOrchestrationPlan(requestId, request, analysis, steps);
  const results = await engine.executePlan(plan.id);
  const synthesis = await engine.synthesizeResults(plan.id, 'summarize');

  console.log('\n✅ Scenario 5 Complete');
  return { plan_id: plan.id, synthesis };
}

/**
 * Run all demo scenarios
 */
async function runAllScenarios() {
  console.log('='.repeat(60));
  console.log('🤖 MULTI-AGENT ORCHESTRATION DEMO');
  console.log('='.repeat(60));

  try {
    const results = [];

    // Run scenarios sequentially for demo
    results.push(await scenario1_ChurnPrevention());
    await delay(1000);
    
    results.push(await scenario2_UpsellOptimization());
    await delay(1000);
    
    results.push(await scenario3_PerformanceBenchmarking());
    await delay(1000);
    
    results.push(await scenario4_CampaignROI());
    await delay(1000);
    
    results.push(await scenario5_FeatureDevelopment());

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL SCENARIOS COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nTotal orchestrations: ${results.length}`);
    console.log(`Plan IDs: ${results.map(r => r.plan_id).join(', ')}`);

    return results;
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllScenarios().catch(console.error);
}

export {
  scenario1_ChurnPrevention,
  scenario2_UpsellOptimization,
  scenario3_PerformanceBenchmarking,
  scenario4_CampaignROI,
  scenario5_FeatureDevelopment,
  runAllScenarios
};



















