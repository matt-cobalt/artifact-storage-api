/**
 * Quick DateTime Conversion Test
 * Verifies the DateTime fix works correctly
 */

import { getEntityRelationships } from '../../lib/neo4j-driver.js';

async function quickDateTimeTest() {
  console.log('Quick DateTime Conversion Test');
  console.log('================================\n');
  
  try {
    // Test with Sarah (should have historical relationships)
    console.log('Testing getEntityRelationships with cust_sarah...');
    const relationships = await getEntityRelationships('cust_sarah', true);
    
    console.log(`\nFound ${relationships.length} relationships`);
    
    if (relationships.length > 0) {
      console.log('\nFirst relationship sample:');
      const first = relationships[0];
      console.log(`  Relationship: ${first.relationship}`);
      console.log(`  From: ${first.from_node} → To: ${first.to_node}`);
      console.log(`  valid_from: ${first.valid_from} (type: ${typeof first.valid_from})`);
      console.log(`  valid_to: ${first.valid_to || 'null'} (type: ${typeof first.valid_to})`);
      console.log(`  ingested_at: ${first.ingested_at} (type: ${typeof first.ingested_at})`);
      console.log(`  invalidated_at: ${first.invalidated_at || 'null'} (type: ${typeof first.invalidated_at})`);
      
      // Verify all dates are strings
      const allAreStrings = 
        typeof first.valid_from === 'string' &&
        (first.valid_to === undefined || typeof first.valid_to === 'string') &&
        typeof first.ingested_at === 'string' &&
        (first.invalidated_at === undefined || typeof first.invalidated_at === 'string');
      
      if (allAreStrings) {
        console.log('\n✅ SUCCESS: All DateTime values are ISO strings!');
        console.log('✅ DateTime conversion fix is working correctly!');
        return true;
      } else {
        console.log('\n❌ FAIL: Some DateTime values are not strings');
        return false;
      }
    } else {
      console.log('\n⚠️  No relationships found (may need to populate sample data)');
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    return false;
  }
}

quickDateTimeTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });



