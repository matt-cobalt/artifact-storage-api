/**
 * Create Neo4j Database
 * Creates AutoIntelKG database if it doesn't exist
 * 
 * Note: In Neo4j Desktop, you can also create the database manually:
 * 1. Open Neo4j Desktop
 * 2. Click "Add Database" → "Create a Local Database"
 * 3. Name it "AutoIntelKG"
 * 4. Set password to "1IntelGTP!"
 * 5. Click "Create"
 */

import neo4j from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '1IntelGTP!';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'AutoIntelKG';

async function createDatabase() {
  console.log('Creating Neo4j database...\n');
  
  // Connect to default database first
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
  );
  
  try {
    const defaultSession = driver.session({ database: 'neo4j' });
    
    console.log(`Attempting to create database: ${NEO4J_DATABASE}`);
    
    // Create database (Neo4j 4.x+ syntax)
    try {
      await defaultSession.run(`CREATE DATABASE ${NEO4J_DATABASE} IF NOT EXISTS`);
      console.log(`✓ Database '${NEO4J_DATABASE}' created successfully!`);
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Statement.SyntaxError') {
        // Neo4j 5.x uses different syntax
        try {
          await defaultSession.run(`CREATE DATABASE ${NEO4J_DATABASE} IF NOT EXISTS WAIT`);
          console.log(`✓ Database '${NEO4J_DATABASE}' created successfully!`);
        } catch (error2: any) {
          console.log('⚠ Database creation command not supported.');
          console.log('Please create the database manually in Neo4j Desktop:');
          console.log(`  1. Open Neo4j Desktop`);
          console.log(`  2. Click "Add Database" → "Create a Local Database"`);
          console.log(`  3. Name it "${NEO4J_DATABASE}"`);
          console.log(`  4. Set password to "${NEO4J_PASSWORD}"`);
          console.log(`  5. Click "Create"`);
          console.log('');
          console.log('Or use the default "neo4j" database by setting:');
          console.log(`  NEO4J_DATABASE=neo4j`);
        }
      } else {
        throw error;
      }
    }
    
    await defaultSession.close();
    
    // Test connection to new database
    console.log(`\nTesting connection to '${NEO4J_DATABASE}'...`);
    const testSession = driver.session({ database: NEO4J_DATABASE });
    const testResult = await testSession.run('RETURN 1 as test');
    await testSession.close();
    
    if (testResult.records.length > 0) {
      console.log(`✓ Successfully connected to '${NEO4J_DATABASE}' database!`);
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
    console.log('\nPlease create the database manually in Neo4j Desktop:');
    console.log(`  1. Open Neo4j Desktop`);
    console.log(`  2. Click "Add Database" → "Create a Local Database"`);
    console.log(`  3. Name it "${NEO4J_DATABASE}"`);
    console.log(`  4. Set password to "${NEO4J_PASSWORD}"`);
    console.log(`  5. Click "Create"`);
    throw error;
  } finally {
    await driver.close();
  }
}

createDatabase().catch(console.error);



