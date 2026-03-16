/**
 * Test 4: Performance Benchmark
 * Measures query latency and verifies <200ms target
 */

import { hybridQuery } from '../../lib/temporal-query.js';
import { queryTemporalMemory } from '../../agents/temporal-memory.js';

async function testPerformanceBenchmark(): Promise<boolean> {
  console.log('Running Test 4/4: Performance Benchmark...\n');
  
  let passed = 0;
  let failed = 0;
  
  try {
    const queries = [
      'brake problems',
      'oil change',
      'check engine light',
      'grinding noise',
      'customer Sarah service history',
      'Honda Accord',
      'brake service',
      'diagnostics',
      'tire service',
      'Mike Johnson'
    ];
    
    const latencies: number[] = [];
    
    console.log('Running 10 test queries...\n');
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      try {
        const start = Date.now();
        await hybridQuery(query, { maxResults: 5, maxLatency: 200 });
        const latency = Date.now() - start;
        latencies.push(latency);
        
        const status = latency < 200 ? '✓' : '✗';
        console.log(`  ${status} Query ${i + 1}: "${query}" - ${latency}ms`);
      } catch (error) {
        console.log(`  ✗ Query ${i + 1}: "${query}" - ERROR: ${error}`);
        latencies.push(999); // Mark as failed
      }
    }
    
    // Calculate statistics
    const validLatencies = latencies.filter(l => l < 999);
    
    if (validLatencies.length === 0) {
      console.log('\n✗ All queries failed');
      return false;
    }
    
    const avg = validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length;
    const sorted = [...validLatencies].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const max = Math.max(...validLatencies);
    const min = Math.min(...validLatencies);
    
    console.log('\n' + '='.repeat(50));
    console.log('Performance Statistics:');
    console.log('='.repeat(50));
    console.log(`  Queries executed: ${validLatencies.length}/${queries.length}`);
    console.log(`  Average latency: ${avg.toFixed(0)}ms`);
    console.log(`  95th percentile: ${p95}ms`);
    console.log(`  99th percentile: ${p99}ms`);
    console.log(`  Minimum: ${min}ms`);
    console.log(`  Maximum: ${max}ms`);
    console.log(`  Target: <200ms (95th percentile)`);
    console.log('='.repeat(50));
    
    // Verify targets
    if (p95 < 200) {
      console.log('✓ PASSED: 95th percentile <200ms');
      passed++;
    } else {
      console.log(`✗ FAILED: 95th percentile ${p95}ms exceeds 200ms target`);
      failed++;
    }
    
    if (max < 500) {
      console.log('✓ PASSED: Maximum latency <500ms (acceptable for outliers)');
      passed++;
    } else {
      console.log(`⚠ WARNING: Maximum latency ${max}ms is high`);
    }
    
    if (validLatencies.length === queries.length) {
      console.log('✓ PASSED: All queries completed successfully');
      passed++;
    } else {
      console.log(`✗ FAILED: ${queries.length - validLatencies.length} queries failed`);
      failed++;
    }
    
    // Test entity resolution performance
    console.log('\n' + '='.repeat(50));
    console.log('Entity Resolution Performance:');
    console.log('='.repeat(50));
    
    const resolutionQueries = [
      "Sarah called about brakes",
      "Mike needs oil change",
      "John wants service"
    ];
    
    const resolutionLatencies: number[] = [];
    
    for (const query of resolutionQueries) {
      try {
        const start = Date.now();
        await queryTemporalMemory('TEST', query, { maxDepth: 2 });
        const latency = Date.now() - start;
        resolutionLatencies.push(latency);
        console.log(`  Query: "${query}" - ${latency}ms`);
      } catch (error) {
        console.log(`  Query: "${query}" - ERROR`);
      }
    }
    
    if (resolutionLatencies.length > 0) {
      const avgResolution = resolutionLatencies.reduce((a, b) => a + b, 0) / resolutionLatencies.length;
      console.log(`  Average: ${avgResolution.toFixed(0)}ms`);
      console.log(`  Target: <1000ms`);
      
      if (avgResolution < 1000) {
        console.log('  ✓ PASSED: Average entity resolution <1s');
        passed++;
      } else {
        console.log('  ✗ FAILED: Average entity resolution >1s');
        failed++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`Test 4 Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50) + '\n');
    
    return failed === 0;
    
  } catch (error) {
    console.error('✗ Test failed with error:', error);
    return false;
  }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPerformanceBenchmark()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testPerformanceBenchmark };



