/**
 * Benchmark Query Performance
 * Target: <200ms (95th percentile)
 */

import { hybridQuery } from '../lib/temporal-query.js';

async function benchmark() {
  console.log('Benchmarking query performance...\n');
  
  const queries = [
    'brake problems',
    'oil change',
    'check engine light',
    'grinding noise',
    'customer Sarah service history'
  ];
  
  const results: number[] = [];
  
  for (const query of queries) {
    try {
      const start = Date.now();
      await hybridQuery(query, { maxResults: 5, maxLatency: 200 });
      const latency = Date.now() - start;
      
      results.push(latency);
      const status = latency < 200 ? '✓' : '✗';
      console.log(`${status} Query: "${query}" - ${latency}ms`);
    } catch (error) {
      console.error(`✗ Query: "${query}" - ERROR: ${error}`);
      results.push(999); // Mark as failed
    }
  }
  
  if (results.length > 0) {
    const validResults = results.filter(r => r < 999);
    const avg = validResults.reduce((a, b) => a + b, 0) / validResults.length;
    const sorted = validResults.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const max = Math.max(...validResults);
    
    console.log(`\nPerformance Summary:`);
    console.log(`  Average latency: ${avg.toFixed(0)}ms`);
    console.log(`  95th percentile: ${p95}ms`);
    console.log(`  Maximum latency: ${max}ms`);
    console.log(`  Target: <200ms`);
    
    const passed = p95 < 200 && max < 300;
    console.log(`\n${passed ? '✓ PASSED' : '✗ FAILED - Optimization needed'}`);
    
    if (!passed) {
      console.log('\nRecommendations:');
      if (p95 >= 200) {
        console.log('  - Add Neo4j indexes for faster queries');
        console.log('  - Optimize Cypher query patterns');
      }
      if (max >= 300) {
        console.log('  - Check Neo4j connection health');
        console.log('  - Review query complexity');
      }
    }
  }
}

benchmark().catch(console.error);



