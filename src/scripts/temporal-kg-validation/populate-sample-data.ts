/**
 * Populate Sample Data for Temporal Knowledge Graph
 * Creates realistic automotive data for validation testing
 */

import { getSession, upsertEntity, createTemporalEdge } from '../../lib/neo4j-driver.js';
import { resolveEntities } from '../../lib/entity-resolver.js';
import type { EntityNode } from '../../types/knowledge-graph.js';

async function populateSampleData() {
  console.log('===========================================');
  console.log('Populating Sample Automotive Data');
  console.log('===========================================\n');
  
  const session = await getSession();
  const now = new Date().toISOString();
  
  try {
    // Create Customers
    console.log('Creating customers...');
    const customers = [
      { id: 'cust_sarah', name: 'Sarah Martinez', phone: '555-0101', email: 'sarah@example.com' },
      { id: 'cust_mike', name: 'Mike Johnson', phone: '555-0102', email: 'mike@example.com' },
      { id: 'cust_john', name: 'John Smith', phone: '555-0103', email: 'john@example.com' },
      { id: 'cust_lisa', name: 'Lisa Anderson', phone: '555-0104', email: 'lisa@example.com' },
      { id: 'cust_rachel', name: 'Rachel Green', phone: '555-0105', email: 'rachel@example.com' }
    ];
    
    for (const customer of customers) {
      const customerEntity: EntityNode = {
        id: customer.id,
        type: 'Customer',
        properties: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: now
      };
      await upsertEntity(customerEntity);
      console.log(`  ✓ Created customer: ${customer.name}`);
    }
    
    // Create Vehicles
    console.log('\nCreating vehicles...');
    const vehicles = [
      { id: 'veh_honda_2020', year: '2020', make: 'Honda', model: 'Accord', owner: 'cust_sarah' },
      { id: 'veh_camry_2018', year: '2018', make: 'Toyota', model: 'Camry', owner: 'cust_mike' },
      { id: 'veh_f150_2019', year: '2019', make: 'Ford', model: 'F-150', owner: 'cust_lisa' },
      { id: 'veh_civic_2021', year: '2021', make: 'Honda', model: 'Civic', owner: 'cust_john' },
      { id: 'veh_outback_2021', year: '2021', make: 'Subaru', model: 'Outback', owner: 'cust_rachel' }
    ];
    
    for (const vehicle of vehicles) {
      const vehicleEntity: EntityNode = {
        id: vehicle.id,
        type: 'Vehicle',
        properties: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: now
      };
      await upsertEntity(vehicleEntity);
      
      // Create OWNS relationship
      await createTemporalEdge({
        relationship: 'OWNS',
        from_node: vehicle.owner,
        to_node: vehicle.id,
        valid_from: '2024-01-01T00:00:00Z',
        ingested_at: now
      });
      
      console.log(`  ✓ Created vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    }
    
    // Create Mechanics
    console.log('\nCreating mechanics...');
    const mechanics = [
      { id: 'mech_tom', name: 'Tom Wilson' },
      { id: 'mech_mike_mech', name: 'Mike Thompson' }
    ];
    
    for (const mechanic of mechanics) {
      const mechanicEntity: EntityNode = {
        id: mechanic.id,
        type: 'Mechanic',
        properties: { name: mechanic.name },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: now
      };
      await upsertEntity(mechanicEntity);
      console.log(`  ✓ Created mechanic: ${mechanic.name}`);
    }
    
    // Create Services
    console.log('\nCreating services...');
    const services = [
      { id: 'svc_brake_service', type: 'brake_service', description: 'Brake repair and maintenance' },
      { id: 'svc_oil_change', type: 'oil_change', description: 'Oil change service' },
      { id: 'svc_diagnostics', type: 'diagnostics', description: 'Engine diagnostics' },
      { id: 'svc_inspection', type: 'inspection', description: 'Vehicle inspection' },
      { id: 'svc_tire_service', type: 'tire_service', description: 'Tire repair and replacement' }
    ];
    
    for (const service of services) {
      const serviceEntity: EntityNode = {
        id: service.id,
        type: 'Service',
        properties: {
          type: service.type,
          description: service.description
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: now
      };
      await upsertEntity(serviceEntity);
      console.log(`  ✓ Created service: ${service.type}`);
    }
    
    // Process sample conversations to create relationships
    console.log('\nProcessing conversations...');
    const conversations = [
      "Sarah called about grinding brakes on her 2020 Honda Accord",
      "Mike needs oil change for his 2018 Camry, prefers Tom as mechanic",
      "Lisa's 2019 F-150 check engine light is on, urgent",
      "John wants brake service, last service was 6 months ago",
      "Sarah called back - brake noise is worse, very urgent",
      "Mike scheduled oil change for Tuesday with Tom",
      "New customer Rachel needs diagnostic on 2021 Subaru Outback"
    ];
    
    for (const conv of conversations) {
      try {
        await resolveEntities(conv);
        console.log(`  ✓ Processed: "${conv.substring(0, 50)}..."`);
      } catch (error) {
        console.error(`  ✗ Error processing conversation: ${error}`);
      }
    }
    
    // Create historical mechanic preferences (bi-temporal testing)
    console.log('\nCreating historical relationships...');
    
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
      to_node: 'mech_mike_mech',
      valid_from: '2024-10-02T00:00:00Z',
      ingested_at: '2024-10-02T00:00:00Z',
      metadata: { reason: 'Current preferred mechanic' }
    });
    
    // Mike prefers Tom
    await createTemporalEdge({
      relationship: 'PREFERRED_MECHANIC',
      from_node: 'cust_mike',
      to_node: 'mech_tom',
      valid_from: '2024-03-01T00:00:00Z',
      ingested_at: '2024-03-01T00:00:00Z'
    });
    
    console.log('  ✓ Created historical mechanic preferences');
    
    // Verify data
    console.log('\nVerifying graph contents...');
    const result = await session.run(`
      MATCH (n)
      WITH labels(n) as type, count(n) as count
      RETURN type, count
      ORDER BY count DESC
    `);
    
    console.log('\nGraph Statistics:');
    for (const record of result.records) {
      const type = record.get('type')[0] || 'Unknown';
      const count = record.get('count').toNumber();
      console.log(`  ${type}: ${count}`);
    }
    
    const relResult = await session.run(`
      MATCH ()-[r]->()
      RETURN count(r) as relCount
    `);
    const relCount = relResult.records[0].get('relCount').toNumber();
    console.log(`  Relationships: ${relCount}`);
    
    console.log('\n===========================================');
    console.log('✓ Sample data populated successfully!');
    console.log('===========================================\n');
    
  } catch (error) {
    console.error('\n✗ Error populating data:', error);
    process.exit(1);
  } finally {
    await session.close();
  }
}

populateSampleData().catch(console.error);



