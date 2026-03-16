import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Setup OTTO Database Tables
 * Reads SQL schema files and executes them in Supabase
 */

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  // If we get data or a specific error, table exists
  // If we get a "relation does not exist" error, table doesn't exist
  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01') {
      return false;
    }
    // Other errors might mean table exists but has issues
    return true;
  }
  return true;
}

async function executeSQL(sql) {
  // Supabase JS client doesn't support raw SQL execution
  // We need to use the REST API or provide instructions
  console.log('⚠️  Cannot execute raw SQL via Supabase JS client.');
  console.log('📝 Please run the SQL in Supabase SQL Editor:');
  console.log('\n' + '='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60) + '\n');
  
  return { success: false, requiresManualExecution: true };
}

async function setupDatabase() {
  console.log('🗄️  Setting up OTTO Database Tables...\n');

  // Check existing tables
  console.log('Checking existing tables...');
  const ottoOrchestrationsExists = await checkTableExists('otto_orchestrations');
  const agentMetricsExists = await checkTableExists('agent_performance_metrics');
  const ottoErrorsExists = await checkTableExists('otto_errors');

  console.log(`  otto_orchestrations: ${ottoOrchestrationsExists ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  agent_performance_metrics: ${agentMetricsExists ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  otto_errors: ${ottoErrorsExists ? '✅ EXISTS' : '❌ MISSING'}`);

  if (ottoOrchestrationsExists && agentMetricsExists && ottoErrorsExists) {
    console.log('\n✅ All OTTO tables already exist!');
    return true;
  }

  console.log('\n📋 Tables need to be created. Reading SQL schemas...\n');

  // Read SQL files
  const schemaPath = join(__dirname, '../../database/otto_orchestration_schema.sql');
  const errorsPath = join(__dirname, '../../database/otto_errors_table.sql');

  try {
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    const errorsSQL = readFileSync(errorsPath, 'utf-8');

    console.log('📝 SQL Schema Files Loaded:');
    console.log(`  1. otto_orchestration_schema.sql (${schemaSQL.length} chars)`);
    console.log(`  2. otto_errors_table.sql (${errorsSQL.length} chars)\n`);

    console.log('='.repeat(60));
    console.log('MANUAL SETUP REQUIRED');
    console.log('='.repeat(60));
    console.log('\nThe Supabase JS client cannot execute raw SQL.');
    console.log('Please run the SQL in Supabase SQL Editor:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/[your-project]/sql');
    console.log('2. Copy and paste the SQL from the files below');
    console.log('3. Execute the SQL\n');

    if (!ottoOrchestrationsExists || !agentMetricsExists) {
      console.log('📄 SQL for otto_orchestrations and agent_performance_metrics:');
      console.log('-'.repeat(60));
      console.log(schemaSQL);
      console.log('-'.repeat(60) + '\n');
    }

    if (!ottoErrorsExists) {
      console.log('📄 SQL for otto_errors:');
      console.log('-'.repeat(60));
      console.log(errorsSQL);
      console.log('-'.repeat(60) + '\n');
    }

    console.log('💡 Tip: You can also find these files at:');
    console.log(`  - ${schemaPath}`);
    console.log(`  - ${errorsPath}\n`);

    return { requiresManualExecution: true };
  } catch (err) {
    console.error('❌ Error reading SQL files:', err.message);
    return false;
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying table structure...\n');

  const tables = [
    { name: 'otto_orchestrations', required: true },
    { name: 'agent_performance_metrics', required: true },
    { name: 'otto_errors', required: false } // Optional, but recommended
  ];

  let allExist = true;

  for (const table of tables) {
    const exists = await checkTableExists(table.name);
    const status = exists ? '✅ EXISTS' : (table.required ? '❌ MISSING (REQUIRED)' : '⚠️  MISSING (OPTIONAL)');
    console.log(`  ${table.name}: ${status}`);
    
    if (table.required && !exists) {
      allExist = false;
    }
  }

  return allExist;
}

async function main() {
  console.log('='.repeat(60));
  console.log('OTTO DATABASE SETUP');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}\n`);

  // First verify what exists
  const allExist = await verifyTables();

  if (allExist) {
    console.log('\n✅ All required tables exist!');
    console.log('🎉 Database is ready for OTTO orchestration.\n');
    return true;
  }

  // If not all exist, provide setup instructions
  await setupDatabase();

  console.log('\n⏭️  After running the SQL in Supabase, run this script again to verify.');
  return false;
}

main()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });









