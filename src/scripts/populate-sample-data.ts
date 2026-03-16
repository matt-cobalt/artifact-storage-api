/**
 * Populate Sample Automotive Data
 * Creates test data for validation
 */

import { getSession, upsertEntity, createTemporalEdge } from '../lib/neo4j-driver.js';
import { resolveEntities } from '../lib/entity-resolver.js';
import type { EntityNode, TemporalEdge } from '../types/knowledge-graph.js';

async function populateSampleData() {
  console.log('Populating sample automotive data...\n');
  
  const session = await getSession();
  
  try {
    // Sample customer conversations (Lake Street Auto real scenarios)
    const conversations = [
      "Sarah called about grinding brakes on her 2020 Honda Accord",
      "Mike needs oil change for his 2018 Camry, prefers Tom as mechanic",
      "Lisa's 2019 F-150 check engine light is on, urgent",
      "John wants brake service, last service was 6 months ago",
      "Sarah called back - brake noise is worse, very urgent",
      "Mike scheduled oil change for Tuesday with Tom",
      "New customer Rachel needs diagnostic on 2021 Subaru Outback"
    ];
    
    // Process each conversation through entity resolver
    for (const conv of conversations) {
      console.log(`Processing: "${conv}"`);
      try {
        await resolveEntities(conv);
      } catch (error) {
        console.error(`  Error processing conversation: ${error}`);
      }
    }
    
    // Create mechanics manually (entity resolver doesn't extract these yet)
    const now = new Date().toISOString();
    const tomEntity: EntityNode = {
      id: 'mech_tom',
      type: 'Mechanic',
      properties: { name: 'Tom' },
      created_at: now,
      updated_at: now
    };
    
    const mikeMechEntity: EntityNode = {
      id: 'mech_mike',
      type: 'Mechanic',
      properties: { name: 'Mike' },
      created_at: now,
      updated_at: now
    };
    
    await upsertEntity(tomEntity);
    await upsertEntity(mikeMechEntity);
    
    // Create some historical relationships (bi-temporal testing)
    // Sarah preferred Tom from Jan to Oct 2024, then switched to Mike
    await createTemporalEdge({
      relationship: 'PREFERRED_MECHANIC',
      from_node: 'cust_sarah',
      to_node: 'mech_tom',
      valid_from: '2024-01-15T00:00:00Z',
      valid_to: '2024-10-01T00:00:00Z',
      ingested_at: '2024-01-16T00:00:00Z',
      invalidated_at: '2024-10-02T00:00:00Z',
      metadata: { reason: 'Tom left for different shop' }
    });
    
    await createTemporalEdge({
      relationship: 'PREFERRED_MECHANIC',
      from_node: 'cust_sarah',
      to_node: 'mech_mike',
      valid_from: '2024-10-02T00:00:00Z',
      ingested_at: '2024-10-02T00:00:00Z',
      metadata: { reason: 'Current preferred mechanic' }
    });
    
    // Mike prefers Tom
    await createTemporalEdge({
      relationship: 'PREFERRED_MECHANIC',
      from_node: 'cust_mike',
      to_node: 'mech_tom',
      valid_from: now,
      ingested_at: now
    });
    
    console.log('\n✓ Sample data populated successfully');
    
    // Verify data
    const result = await session.run(`
      MATCH (n)
      WITH labels(n) as type, count(n) as count
      RETURN type, count
      ORDER BY count DESC
    `);
    
    console.log('\nGraph contents:');
    for (const record of result.records) {
      const type = record.get('type')[0] || 'Unknown';
      const count = record.get('count').toNumber();
      console.log(`  ${type}: ${count}`);
    }
    
    // Count relationships
    const relResult = await session.run(`
      MATCH ()-[r]->()
      RETURN count(r) as relCount
    `);
    const relCount = relResult.records[0].get('relCount').toNumber();
    console.log(`  Relationships: ${relCount}`);
    
  } catch (error) {
    console.error('Error populating data:', error);
    throw error;
  } finally {
    await session.close();
  }
}

populateSampleData().catch(console.error);



