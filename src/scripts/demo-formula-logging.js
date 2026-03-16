/**
 * Demo: Formula Logging & ML Pipeline
 * Demonstrates complete learning loop: execution → logging → pattern detection → optimization
 */

import 'dotenv/config';
import FormulaLogger from '../lib/formula-logger.js';

const SHOP_ID = process.env.DEMO_SHOP_ID || '00000000-0000-0000-0000-000000000000';

/**
 * Simulate VORP calculations
 */
async function simulateVORPCalculations() {
  console.log('\n🧮 Simulating VORP formula executions...\n');

  const logger = new FormulaLogger(SHOP_ID);

  // Simulate 12 executions with declining confidence (to trigger accuracy drift)
  const baseConfidence = 0.95;
  const executions = [];

  for (let i = 0; i < 12; i++) {
    const confidence = baseConfidence - (i * 0.02); // Declining confidence
    const executionTime = 40 + Math.random() * 10; // 40-50ms

    const executionId = await logger.logExecution({
      agentId: 'sv01-revenue',
      formulaName: 'VORP',
      formulaType: 'prediction',
      inputData: {
        lifetime_revenue: 4200 + Math.random() * 500,
        service_frequency: 2.3,
        avg_ticket: 425
      },
      outputValue: 8750.00 + Math.random() * 200,
      confidenceScore: confidence,
      executionTimeMs: executionTime,
      success: true,
      context: {
        customer_id: `customer-${i + 1}`,
        shop_id: SHOP_ID
      }
    });

    executions.push({ id: executionId, confidence });
    console.log(`  ✅ Execution ${i + 1}/12 logged (confidence: ${confidence.toFixed(2)})`);
  }

  console.log('\n📊 Pattern analysis triggered after 10th execution...\n');

  // Wait a moment for async pattern analysis
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Get detected patterns
  const patterns = await logger.getPatterns('detected');
  console.log(`\n🔍 Detected ${patterns.length} pattern(s):\n`);

  for (const pattern of patterns) {
    console.log(`  Pattern: ${pattern.pattern_type}`);
    console.log(`    Formula: ${pattern.formula_name}`);
    console.log(`    Confidence: ${pattern.confidence.toFixed(2)}`);
    console.log(`    Description: ${pattern.description}`);
    console.log(`    Recommendation: ${pattern.recommendation}\n`);
  }

  return { executions, patterns };
}

/**
 * Simulate optimization trigger
 */
async function simulateOptimizationTrigger(pattern) {
  console.log('\n🚀 Triggering auto-optimization...\n');

  // Check if improvement_history record was created
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data: improvements } = await supabase
    .from('improvement_history')
    .select('*')
    .eq('trigger_type', 'formula_pattern')
    .eq('status', 'detected')
    .order('detected_at', { ascending: false })
    .limit(1);

  if (improvements && improvements.length > 0) {
    const improvement = improvements[0];
    console.log(`  ✅ Improvement record created:`);
    console.log(`    ID: ${improvement.id}`);
    console.log(`    Trigger: ${improvement.trigger_type}`);
    console.log(`    Confidence: ${improvement.confidence_score}`);
    console.log(`    Status: ${improvement.status}`);
    console.log(`\n  📝 This triggers the self-improvement loop:`);
    console.log(`    1. Analysis of the pattern`);
    console.log(`    2. Generate fix (A/B test variant)`);
    console.log(`    3. Test the improvement`);
    console.log(`    4. Deploy if successful`);
  }

  return improvements;
}

/**
 * Show performance metrics
 */
async function showPerformanceMetrics() {
  console.log('\n📈 Formula Performance Metrics:\n');

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data: performance } = await supabase
    .from('formula_performance')
    .select('*')
    .eq('formula_name', 'VORP');

  if (performance && performance.length > 0) {
    const perf = performance[0];
    console.log(`  Formula: ${perf.formula_name}`);
    console.log(`  Total Executions: ${perf.total_executions}`);
    console.log(`  Success Rate: ${(perf.success_rate * 100).toFixed(1)}%`);
    console.log(`  Avg Execution Time: ${perf.avg_execution_time_ms.toFixed(0)}ms`);
    console.log(`  Avg Confidence: ${perf.avg_confidence?.toFixed(2) || 'N/A'}`);
    console.log(`  Trend: ${perf.trend || 'stable'}`);
    console.log(`  Last Execution: ${perf.last_execution || 'N/A'}`);
  }
}

/**
 * Main demo function
 */
async function runDemo() {
  console.log('='.repeat(60));
  console.log('🧠 FORMULA LOGGING & ML PIPELINE DEMO');
  console.log('='.repeat(60));
  console.log('\nDemonstrating complete learning loop:\n');
  console.log('1. Formula executes (VORP calculation)');
  console.log('2. Logged to formula_executions table');
  console.log('3. Pattern analysis runs (every 10 executions)');
  console.log('4. Accuracy drift detected');
  console.log('5. Pattern logged to formula_patterns');
  console.log('6. Triggers improvement_history record');
  console.log('7. Self-improvement loop analyzes issue');
  console.log('8. A/B test created to optimize');
  console.log('9. Winner promoted automatically');
  console.log('10. Formula performance improves\n');

  try {
    // Step 1-3: Simulate executions and pattern detection
    const { executions, patterns } = await simulateVORPCalculations();

    if (patterns.length > 0) {
      // Step 4-6: Show optimization trigger
      await simulateOptimizationTrigger(patterns[0]);

      // Show performance metrics
      await showPerformanceMetrics();

      console.log('\n' + '='.repeat(60));
      console.log('✅ DEMO COMPLETE');
      console.log('='.repeat(60));
      console.log('\nThis demonstrates:');
      console.log('  • System learning from every calculation');
      console.log('  • Autonomous pattern detection');
      console.log('  • Automatic optimization triggers');
      console.log('  • Self-improving AI system\n');
    } else {
      console.log('\n⚠️  No patterns detected (need more executions or different data)\n');
    }
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo();
}

export { runDemo, simulateVORPCalculations, simulateOptimizationTrigger };



















