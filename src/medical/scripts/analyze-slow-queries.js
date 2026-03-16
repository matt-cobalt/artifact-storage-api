/**
 * Analyze Slow Queries - Medical Vertical Performance Diagnostics
 * Identifies slow queries and suggests optimizations
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SLOW_QUERY_THRESHOLD_MS = 100; // Queries slower than 100ms are flagged

/**
 * Test common query patterns and measure performance
 */
async function analyzeSlowQueries() {
  console.log('═══════════════════════════════════════');
  console.log('Medical Vertical - Query Performance Analysis');
  console.log('═══════════════════════════════════════\n');

  const results = [];

  // Test 1: Appointment queries (most common)
  console.log('Test 1: Appointment queries by clinic and date...');
  const test1Start = Date.now();
  const { data: appointments, error: err1 } = await supabase
    .from('medical_appointments')
    .select('*')
    .eq('clinic_id', '00000000-0000-0000-0000-000000000001') // Test UUID
    .gte('appointment_date', new Date().toISOString().split('T')[0])
    .limit(100);
  const test1Time = Date.now() - test1Start;
  results.push({
    name: 'Appointments by clinic and date',
    time: test1Time,
    slow: test1Time > SLOW_QUERY_THRESHOLD_MS,
    error: err1
  });
  console.log(`  Time: ${test1Time}ms ${test1Time > SLOW_QUERY_THRESHOLD_MS ? '⚠ SLOW' : '✓ OK'}`);

  // Test 2: Patient lookups by phone (M-OTTO intake)
  console.log('\nTest 2: Patient lookup by phone...');
  const test2Start = Date.now();
  const { data: patients, error: err2 } = await supabase
    .from('medical_patients')
    .select('id, name, phone')
    .eq('phone', '555-0100')
    .limit(1);
  const test2Time = Date.now() - test2Start;
  results.push({
    name: 'Patient lookup by phone',
    time: test2Time,
    slow: test2Time > SLOW_QUERY_THRESHOLD_MS,
    error: err2
  });
  console.log(`  Time: ${test2Time}ms ${test2Time > SLOW_QUERY_THRESHOLD_MS ? '⚠ SLOW' : '✓ OK'}`);

  // Test 3: Engagement queries (M-MILES agent)
  console.log('\nTest 3: Patient engagement scheduled queries...');
  const test3Start = Date.now();
  const { data: engagement, error: err3 } = await supabase
    .from('medical_patient_engagement')
    .select('*')
    .eq('clinic_id', '00000000-0000-0000-0000-000000000001')
    .gte('scheduled_for', new Date().toISOString())
    .eq('status', 'pending')
    .limit(50);
  const test3Time = Date.now() - test3Start;
  results.push({
    name: 'Engagement scheduled queries',
    time: test3Time,
    slow: test3Time > SLOW_QUERY_THRESHOLD_MS,
    error: err3
  });
  console.log(`  Time: ${test3Time}ms ${test3Time > SLOW_QUERY_THRESHOLD_MS ? '⚠ SLOW' : '✓ OK'}`);

  // Test 4: Revenue queries (M-CAL agent)
  console.log('\nTest 4: Revenue cycle queries...');
  const test4Start = Date.now();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const { data: revenue, error: err4 } = await supabase
    .from('medical_revenue_cycle')
    .select('billed_amount, status')
    .eq('clinic_id', '00000000-0000-0000-0000-000000000001')
    .gte('created_at', startDate.toISOString())
    .eq('status', 'paid');
  const test4Time = Date.now() - test4Start;
  results.push({
    name: 'Revenue cycle queries',
    time: test4Time,
    slow: test4Time > SLOW_QUERY_THRESHOLD_MS,
    error: err4
  });
  console.log(`  Time: ${test4Time}ms ${test4Time > SLOW_QUERY_THRESHOLD_MS ? '⚠ SLOW' : '✓ OK'}`);

  // Test 5: Churn prediction queries (M-REX agent)
  console.log('\nTest 5: Churn prediction queries...');
  const test5Start = Date.now();
  const { data: churn, error: err5 } = await supabase
    .from('medical_churn_predictions')
    .select('*')
    .eq('clinic_id', '00000000-0000-0000-0000-000000000001')
    .in('risk_level', ['high', 'critical'])
    .order('predicted_at', { ascending: false })
    .limit(50);
  const test5Time = Date.now() - test5Start;
  results.push({
    name: 'Churn prediction queries',
    time: test5Time,
    slow: test5Time > SLOW_QUERY_THRESHOLD_MS,
    error: err5
  });
  console.log(`  Time: ${test5Time}ms ${test5Time > SLOW_QUERY_THRESHOLD_MS ? '⚠ SLOW' : '✓ OK'}`);

  // Test 6: Audit log queries (HIPAA compliance)
  console.log('\nTest 6: Audit log queries...');
  const test6Start = Date.now();
  const { data: audits, error: err6 } = await supabase
    .from('medical_audit_logs')
    .select('*')
    .eq('clinic_id', '00000000-0000-0000-0000-000000000001')
    .gte('timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false })
    .limit(100);
  const test6Time = Date.now() - test6Start;
  results.push({
    name: 'Audit log queries',
    time: test6Time,
    slow: test6Time > SLOW_QUERY_THRESHOLD_MS,
    error: err6
  });
  console.log(`  Time: ${test6Time}ms ${test6Time > SLOW_QUERY_THRESHOLD_MS ? '⚠ SLOW' : '✓ OK'}`);

  // Test 7: Care gaps queries (M-PATIENT agent)
  console.log('\nTest 7: Care gaps queries...');
  const test7Start = Date.now();
  const { data: gaps, error: err7 } = await supabase
    .from('medical_care_gaps')
    .select('*')
    .eq('clinic_id', '00000000-0000-0000-0000-000000000001')
    .is('resolved_at', null)
    .order('priority', { ascending: false })
    .limit(50);
  const test7Time = Date.now() - test7Start;
  results.push({
    name: 'Care gaps queries',
    time: test7Time,
    slow: test7Time > SLOW_QUERY_THRESHOLD_MS,
    error: err7
  });
  console.log(`  Time: ${test7Time}ms ${test7Time > SLOW_QUERY_THRESHOLD_MS ? '⚠ SLOW' : '✓ OK'}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Performance Analysis Summary');
  console.log('='.repeat(50));

  const slowQueries = results.filter(r => r.slow && !r.error);
  const avgTime = results.filter(r => !r.error).reduce((sum, r) => sum + r.time, 0) / results.filter(r => !r.error).length;

  console.log(`\nTotal queries tested: ${results.length}`);
  console.log(`Slow queries (>${SLOW_QUERY_THRESHOLD_MS}ms): ${slowQueries.length}`);
  console.log(`Average query time: ${avgTime.toFixed(0)}ms`);
  console.log(`Target: <${SLOW_QUERY_THRESHOLD_MS}ms per query`);

  if (slowQueries.length > 0) {
    console.log('\n⚠ Slow queries identified:');
    slowQueries.forEach(q => {
      console.log(`  - ${q.name}: ${q.time}ms`);
    });
    console.log('\n💡 Recommendation: Run optimize-performance.sql to add indexes');
  } else {
    console.log('\n✓ All queries are performing well!');
  }

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.log(`\n⚠ ${errors.length} queries had errors (may be expected if tables are empty)`);
  }

  console.log('\n' + '='.repeat(50));
  
  return {
    results,
    slowQueries: slowQueries.length,
    avgTime,
    needsOptimization: slowQueries.length > 0
  };
}

// Run if executed directly
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Check if this script is being run directly (simple check)
if (process.argv[1]?.includes('analyze-slow-queries.js') || import.meta.url.endsWith('analyze-slow-queries.js')) {
  analyzeSlowQueries()
    .then(summary => {
      process.exit(summary.needsOptimization ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { analyzeSlowQueries };












