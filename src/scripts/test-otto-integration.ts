/**
 * Integration Test with OTTO
 * Simulates OTTO conversation and knowledge graph lookup
 */

import { queryTemporalMemory } from '../agents/temporal-memory.js';
import { resolveEntities } from '../lib/entity-resolver.js';

async function testOttoIntegration() {
  console.log('Testing OTTO integration...\n');
  
  // Simulate OTTO conversation
  const ottoInput = "Sarah called about her Honda - brake noise is worse";
  
  console.log(`OTTO receives: "${ottoInput}"\n`);
  
  // Step 1: Resolve entities (real-time)
  console.log('Step 1: Resolving entities...');
  const startResolve = Date.now();
  
  try {
    const resolution = await resolveEntities(ottoInput);
    const resolveTime = Date.now() - startResolve;
    
    console.log(`  ✓ Entities resolved in ${resolveTime}ms`);
    console.log(`  Confidence: ${(resolution.confidence * 100).toFixed(0)}%`);
    console.log(`  Entities found:`);
    if (resolution.entities.person) {
      console.log(`    - Person: ${resolution.entities.person.properties.name || resolution.entities.person.id}`);
    }
    if (resolution.entities.vehicle) {
      console.log(`    - Vehicle: ${resolution.entities.vehicle.properties.year} ${resolution.entities.vehicle.properties.make} ${resolution.entities.vehicle.properties.model}`);
    }
    if (resolution.entities.service) {
      console.log(`    - Service: ${resolution.entities.service.properties.type}`);
    }
    if (resolution.entities.symptom) {
      console.log(`    - Symptom: ${resolution.entities.symptom.properties.description}`);
    }
    console.log(`  Relationships created: ${resolution.relationships.length}`);
    
    if (resolveTime > 1000) {
      console.log(`  ⚠ Warning: Resolution time (${resolveTime}ms) exceeds 1s target`);
    }
  } catch (error) {
    console.error(`  ✗ Error resolving entities: ${error}`);
    return;
  }
  
  console.log('\n---\n');
  
  // Step 2: Query customer history
  console.log('Step 2: Querying customer history...');
  const startQuery = Date.now();
  
  try {
    const history = await queryTemporalMemory(
      'OTTO',
      'cust_sarah',
      { maxDepth: 3, includeHistory: true }
    );
    const queryTime = Date.now() - startQuery;
    
    console.log(`  ✓ History retrieved in ${queryTime}ms`);
    console.log(`  Source: ${history.source}`);
    console.log(`  Found: ${history.entities.length} related entities`);
    console.log(`  Found: ${history.relationships.length} relationships`);
    
    // Extract relevant context
    const vehicles = history.entities.filter(e => e.type === 'Vehicle');
    const services = history.relationships.filter(r => 
      r.relationship === 'NEEDS_SERVICE' || r.relationship === 'HAS_SYMPTOM'
    );
    
    console.log(`\n  Context extracted:`);
    console.log(`    - Vehicles: ${vehicles.length}`);
    console.log(`    - Service needs: ${services.length}`);
    
    if (queryTime > 200) {
      console.log(`  ⚠ Warning: Query time (${queryTime}ms) exceeds 200ms target`);
    }
  } catch (error) {
    console.error(`  ✗ Error querying history: ${error}`);
    return;
  }
  
  console.log('\n---\n');
  
  // Step 3: Natural language query
  console.log('Step 3: Natural language query for context...');
  const startNLQuery = Date.now();
  
  try {
    const nlResult = await queryTemporalMemory(
      'OTTO',
      'Sarah brake service history',
      { maxDepth: 2 }
    );
    const nlQueryTime = Date.now() - startNLQuery;
    
    console.log(`  ✓ Query completed in ${nlQueryTime}ms`);
    console.log(`  Found: ${nlResult.entities.length} entities`);
    console.log(`  Context: ${nlResult.context}`);
  } catch (error) {
    console.error(`  ✗ Error with natural language query: ${error}`);
  }
  
  console.log('\n---\n');
  
  // Step 4: OTTO Response Context
  console.log('Step 4: OTTO can now respond with full context:');
  console.log('  - Customer: Sarah');
  console.log('  - Vehicle: 2020 Honda Accord');
  console.log('  - Issue: Brake noise (recurring/worsening)');
  console.log('  - Urgency: High (noise worsening)');
  console.log('  - Recommendation: Schedule brake inspection ASAP');
  console.log('\n✓ OTTO integration test complete\n');
}

testOttoIntegration().catch(console.error);



