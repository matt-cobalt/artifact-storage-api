/**
 * Test Historical Queries (Bi-Temporal)
 * Validates point-in-time query capabilities
 */

import { queryTemporalMemory } from '../agents/temporal-memory.js';

async function testHistoricalQueries() {
  console.log('Testing bi-temporal queries...\n');
  
  // Test 1: "Who was Sarah's mechanic in August 2024?"
  console.log('Query 1: Who was Sarah\'s mechanic in August 2024?');
  console.log('Expected: Tom (historical relationship)\n');
  
  try {
    const aug2024 = await queryTemporalMemory(
      'TEST',
      'cust_sarah',
      { 
        timeContext: new Date('2024-08-15'),
        includeHistory: true,
        maxDepth: 2
      }
    );
    
    console.log('Result:');
    console.log(`  Entities found: ${aug2024.entities.length}`);
    console.log(`  Relationships found: ${aug2024.relationships.length}`);
    console.log(`  Query latency: ${aug2024.query_latency_ms}ms`);
    console.log(`  Source: ${aug2024.source}`);
    console.log(`  Context: ${aug2024.context}`);
    
    const preferredMech = aug2024.relationships.find(r => 
      r.relationship === 'PREFERRED_MECHANIC' &&
      r.valid_from <= '2024-08-15T00:00:00Z' &&
      (!r.valid_to || r.valid_to > '2024-08-15T00:00:00Z')
    );
    
    if (preferredMech) {
      const mechanic = aug2024.entities.find(e => e.id === preferredMech.to_node);
      console.log(`  ✓ Found mechanic: ${mechanic?.properties.name || preferredMech.to_node}`);
      console.log(`    Valid from: ${preferredMech.valid_from} to ${preferredMech.valid_to || 'now'}`);
    } else {
      console.log('  ⚠ Could not find preferred mechanic relationship');
    }
    
  } catch (error) {
    console.error('  ✗ Error:', error);
  }
  
  console.log('\n---\n');
  
  // Test 2: "Who is Sarah's mechanic now?"
  console.log('Query 2: Who is Sarah\'s mechanic now?');
  console.log('Expected: Mike (current relationship)\n');
  
  try {
    const now = await queryTemporalMemory(
      'TEST',
      'cust_sarah',
      { 
        timeContext: new Date(),
        maxDepth: 2
      }
    );
    
    console.log('Result:');
    console.log(`  Entities found: ${now.entities.length}`);
    console.log(`  Relationships found: ${now.relationships.length}`);
    console.log(`  Query latency: ${now.query_latency_ms}ms`);
    
    const preferredMech = now.relationships.find(r => 
      r.relationship === 'PREFERRED_MECHANIC' &&
      r.invalidated_at === null
    );
    
    if (preferredMech) {
      const mechanic = now.entities.find(e => e.id === preferredMech.to_node);
      console.log(`  ✓ Found current mechanic: ${mechanic?.properties.name || preferredMech.to_node}`);
    } else {
      console.log('  ⚠ Could not find current preferred mechanic relationship');
      if (now.relationships.length > 0) {
        console.log('  Available relationships:', now.relationships.map(r => r.relationship));
      }
    }
    
  } catch (error) {
    console.error('  ✗ Error:', error);
  }
  
  console.log('\n---\n');
  
  // Test 3: Timeline of Sarah's mechanic preferences
  console.log('Query 3: Timeline of Sarah\'s mechanic preferences');
  console.log('Expected: Show transition from Tom → Mike on 2024-10-01\n');
  
  try {
    const timeline = await queryTemporalMemory(
      'TEST',
      'cust_sarah',
      { 
        includeHistory: true,
        maxDepth: 2
      }
    );
    
    console.log('Result:');
    const mechRelationships = timeline.relationships
      .filter(r => r.relationship === 'PREFERRED_MECHANIC')
      .sort((a, b) => a.valid_from.localeCompare(b.valid_from));
    
    console.log(`  Found ${mechRelationships.length} mechanic preference changes:\n`);
    
    for (const rel of mechRelationships) {
      const mechanic = timeline.entities.find(e => e.id === rel.to_node);
      console.log(`  - ${mechanic?.properties.name || rel.to_node}`);
      console.log(`    Valid: ${rel.valid_from} → ${rel.valid_to || 'current'}`);
      console.log(`    Learned: ${rel.ingested_at}`);
      if (rel.invalidated_at) {
        console.log(`    Invalidated: ${rel.invalidated_at}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('  ✗ Error:', error);
  }
  
  console.log('\n✓ Historical query tests complete\n');
}

testHistoricalQueries().catch(console.error);



