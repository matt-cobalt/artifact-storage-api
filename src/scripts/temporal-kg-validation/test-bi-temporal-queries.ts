/**
 * Test 1: Bi-Temporal Query Validation
 * Tests point-in-time queries and historical relationship tracking
 */

import { queryEntityAtTime, getEntityRelationships } from '../../lib/neo4j-driver.js';
import { queryTemporalMemory } from '../../agents/temporal-memory.js';

async function testBiTemporalQueries(): Promise<boolean> {
  console.log('Running Test 1/4: Bi-Temporal Queries...\n');
  
  let passed = 0;
  let failed = 0;
  
  try {
    // Test 1: Historical query - "Who was Sarah's mechanic in August 2024?"
    console.log('Query 1: Who was Sarah\'s mechanic in August 2024?');
    console.log('Expected: Tom (historical relationship)');
    
    try {
      const aug2024 = new Date('2024-08-15T00:00:00Z');
      const memory = await queryTemporalMemory(
        'TEST',
        'cust_sarah',
        { 
          timeContext: aug2024,
          includeHistory: true,
          maxDepth: 2
        }
      );
      
      const preferredMech = memory.relationships.find(r => 
        r.relationship === 'PREFERRED_MECHANIC' &&
        r.valid_from <= aug2024.toISOString() &&
        (!r.valid_to || new Date(r.valid_to) > aug2024)
      );
      
      if (preferredMech && preferredMech.to_node === 'mech_tom') {
        console.log('  ✓ Found historical relationship to Tom (Aug 2024)');
        console.log(`    Valid: ${preferredMech.valid_from} → ${preferredMech.valid_to || 'current'}`);
        passed++;
      } else {
        console.log('  ✗ Did not find Tom as mechanic in August 2024');
        failed++;
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error}`);
      failed++;
    }
    
    console.log('');
    
    // Test 2: Current query - "Who is Sarah's mechanic now?"
    console.log('Query 2: Who is Sarah\'s mechanic now?');
    console.log('Expected: Mike (current relationship)');
    
    try {
      const now = new Date();
      const memory = await queryTemporalMemory(
        'TEST',
        'cust_sarah',
        { 
          timeContext: now,
          maxDepth: 2
        }
      );
      
      const preferredMech = memory.relationships.find(r => 
        r.relationship === 'PREFERRED_MECHANIC' &&
        r.invalidated_at === null
      );
      
      if (preferredMech && preferredMech.to_node === 'mech_mike_mech') {
        console.log('  ✓ Found current relationship to Mike');
        console.log(`    Valid from: ${preferredMech.valid_from}`);
        passed++;
      } else {
        console.log('  ✗ Did not find Mike as current mechanic');
        if (preferredMech) {
          console.log(`    Found: ${preferredMech.to_node}`);
        }
        failed++;
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error}`);
      failed++;
    }
    
    console.log('');
    
    // Test 3: Temporal transition tracking
    console.log('Query 3: Verify temporal transitions are tracked');
    
    try {
      const memory = await queryTemporalMemory(
        'TEST',
        'cust_sarah',
        { 
          includeHistory: true,
          maxDepth: 2
        }
      );
      
      const mechRelationships = memory.relationships
        .filter(r => r.relationship === 'PREFERRED_MECHANIC')
        .sort((a, b) => a.valid_from.localeCompare(b.valid_from));
      
      if (mechRelationships.length >= 2) {
        const tomRel = mechRelationships.find(r => r.to_node === 'mech_tom');
        const mikeRel = mechRelationships.find(r => r.to_node === 'mech_mike_mech');
        
        if (tomRel && mikeRel && tomRel.valid_to && new Date(mikeRel.valid_from) > new Date(tomRel.valid_to)) {
          console.log('  ✓ Temporal transitions tracked correctly');
          console.log(`    Tom: ${tomRel.valid_from} → ${tomRel.valid_to}`);
          console.log(`    Mike: ${mikeRel.valid_from} → current`);
          passed++;
        } else {
          console.log('  ✗ Temporal transitions not correctly tracked');
          failed++;
        }
      } else {
        console.log(`  ✗ Expected 2+ relationships, found ${mechRelationships.length}`);
        failed++;
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error}`);
      failed++;
    }
    
    console.log('');
    
    // Test 4: Verify ingested_at and invalidated_at
    console.log('Query 4: Verify ingested_at/invalidated_at timestamps');
    
    try {
      const relationships = await getEntityRelationships('cust_sarah', true);
      const historicalRel = relationships.find(r => r.invalidated_at !== null);
      
      if (historicalRel) {
        if (historicalRel.ingested_at && historicalRel.invalidated_at) {
          console.log('  ✓ Both ingested_at and invalidated_at present');
          console.log(`    Ingested: ${historicalRel.ingested_at}`);
          console.log(`    Invalidated: ${historicalRel.invalidated_at}`);
          passed++;
        } else {
          console.log('  ✗ Missing ingested_at or invalidated_at');
          failed++;
        }
      } else {
        console.log('  ⚠ No historical relationships found to verify');
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error}`);
      failed++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`Test 1 Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50) + '\n');
    
    return failed === 0;
    
  } catch (error) {
    console.error('✗ Test failed with error:', error);
    return false;
  }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBiTemporalQueries()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testBiTemporalQueries };



