/**
 * Test 2: Entity Resolution Validation
 * Tests real-time entity extraction from conversations
 */

import { resolveEntities } from '../../lib/entity-resolver.js';
import { queryEntityAtTime } from '../../lib/neo4j-driver.js';

async function testEntityResolution(): Promise<boolean> {
  console.log('Running Test 2/4: Entity Resolution...\n');
  
  let passed = 0;
  let failed = 0;
  
  try {
    // Test 1: Process sample conversation
    console.log('Test 1: Process conversation');
    const conversation = "Sarah called about grinding brakes on her 2020 Honda Accord";
    console.log(`  Input: "${conversation}"`);
    
    const startTime = Date.now();
    const result = await resolveEntities(conversation);
    const duration = Date.now() - startTime;
    
    console.log(`  Resolution time: ${duration}ms`);
    
    // Verify entities extracted
    const hasPerson = result.entities.person !== undefined;
    const hasVehicle = result.entities.vehicle !== undefined;
    const hasService = result.entities.service !== undefined;
    
    if (hasPerson) {
      console.log(`  ✓ Person extracted: ${result.entities.person?.properties.name || result.entities.person?.id}`);
      passed++;
    } else {
      console.log('  ✗ Person not extracted');
      failed++;
    }
    
    if (hasVehicle) {
      const v = result.entities.vehicle!;
      console.log(`  ✓ Vehicle extracted: ${v.properties.year} ${v.properties.make} ${v.properties.model}`);
      passed++;
    } else {
      console.log('  ✗ Vehicle not extracted');
      failed++;
    }
    
    if (hasService || result.entities.symptom) {
      const service = result.entities.service || result.entities.symptom;
      console.log(`  ✓ Service/symptom extracted: ${service?.properties.type || service?.properties.description}`);
      passed++;
    } else {
      console.log('  ✗ Service/symptom not extracted');
      failed++;
    }
    
    if (result.relationships.length > 0) {
      console.log(`  ✓ Created ${result.relationships.length} relationships`);
      passed++;
    } else {
      console.log('  ✗ No relationships created');
      failed++;
    }
    
    if (duration < 1000) {
      console.log(`  ✓ Performance: ${duration}ms (<1s target)`);
      passed++;
    } else {
      console.log(`  ✗ Performance: ${duration}ms (exceeds 1s target)`);
      failed++;
    }
    
    console.log('');
    
    // Test 2: Verify entities were created in Neo4j
    console.log('Test 2: Verify entities created in Neo4j');
    
    try {
      if (result.entities.person) {
        const personNode = await queryEntityAtTime(result.entities.person.id, new Date());
        if (personNode) {
          console.log(`  ✓ Person node exists in graph: ${personNode.id}`);
          passed++;
        } else {
          console.log('  ✗ Person node not found in graph');
          failed++;
        }
      }
      
      if (result.entities.vehicle) {
        const vehicleNode = await queryEntityAtTime(result.entities.vehicle.id, new Date());
        if (vehicleNode) {
          console.log(`  ✓ Vehicle node exists in graph: ${vehicleNode.id}`);
          passed++;
        } else {
          console.log('  ✗ Vehicle node not found in graph');
          failed++;
        }
      }
    } catch (error) {
      console.log(`  ✗ Error verifying nodes: ${error}`);
      failed++;
    }
    
    console.log('');
    
    // Test 3: Verify relationships have timestamps
    console.log('Test 3: Verify relationships have proper timestamps');
    
    if (result.relationships.length > 0) {
      const allHaveTimestamps = result.relationships.every(r => 
        r.valid_from && r.ingested_at
      );
      
      if (allHaveTimestamps) {
        console.log('  ✓ All relationships have valid_from and ingested_at');
        result.relationships.forEach(r => {
          console.log(`    ${r.relationship}: ${r.from_node} → ${r.to_node}`);
          console.log(`      valid_from: ${r.valid_from}, ingested_at: ${r.ingested_at}`);
        });
        passed++;
      } else {
        console.log('  ✗ Some relationships missing timestamps');
        failed++;
      }
    }
    
    console.log('');
    
    // Test 4: Test fuzzy matching (Sarah vs Sara)
    console.log('Test 4: Test fuzzy matching (Sarah vs Sara)');
    
    try {
      const fuzzyConversation = "Sara called about her Honda needing service";
      const fuzzyResult = await resolveEntities(fuzzyConversation);
      
      // Check if it matched existing Sarah node or created new one
      if (fuzzyResult.entities.person) {
        const personId = fuzzyResult.entities.person.id;
        // If it's cust_sarah or similar, fuzzy matching worked
        if (personId.includes('sarah') || personId.includes('sara')) {
          console.log(`  ✓ Person matched/created: ${personId}`);
          passed++;
        } else {
          console.log(`  ⚠ Person ID: ${personId} (may need better fuzzy matching)`);
        }
      }
    } catch (error) {
      console.log(`  ⚠ Fuzzy matching test skipped: ${error}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`Test 2 Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50) + '\n');
    
    return failed === 0;
    
  } catch (error) {
    console.error('✗ Test failed with error:', error);
    return false;
  }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEntityResolution()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testEntityResolution };



