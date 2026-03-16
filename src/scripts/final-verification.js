import 'dotenv/config';

console.log('🚀 Auto Intel GTP - Final System Verification\n');

async function verify() {
  console.log('Step 1: Checking environment variables...');
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
  console.log(`  ANTHROPIC_API_KEY: ${hasAnthropic ? '✅' : '❌'}`);
  console.log(`  SUPABASE configured: ${hasSupabase ? '✅' : '❌'}\n`);
  
  if (!hasAnthropic || !hasSupabase) {
    console.log('❌ Environment not configured. Check .env file.');
    process.exit(1);
  }
  
  console.log('Step 2: Testing agent registry...');
  const { AgentRegistry } = await import('../agents/registry.js');
  const agentCount = Object.keys(AgentRegistry).length;
  console.log(`  Total agents registered: ${agentCount}/25 ${agentCount === 25 ? '✅' : '❌'}\n`);
  
  console.log('Step 3: Testing single agent (Otto)...');
  try {
    const { OttoAgent } = await import('../agents/otto.js');
    const otto = new OttoAgent();
    const result = await otto.execute({ customer_id: 'test', request: 'verification' });
    console.log(`  Otto execution: ${result.success ? '✅' : '❌'}`);
    console.log(`  Artifact created: ${result.artifact_id ? '✅' : '❌'}\n`);
  } catch (error) {
    console.log(`  Otto execution: ❌ ${error.message}\n`);
  }
  
  console.log('Step 4: Checking Supabase artifacts...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from('artifacts')
      .select('type')
      .eq('type', 'agent_decision')
      .limit(1);
    console.log(`  Supabase connection: ${!error ? '✅' : '❌'}`);
    console.log(`  Agent artifacts exist: ${data?.length > 0 ? '✅' : '❌'}\n`);
  } catch (error) {
    console.log(`  Supabase check: ❌ ${error.message}\n`);
  }
  
  console.log('✅ Final Verification Complete!\n');
  console.log('Next steps:');
  console.log('  1. Restart API server: node src/artifact-storage/server.js');
  console.log('  2. Run full test suite: node src/scripts/run-all-tests.js');
  console.log('  3. Check system health: node src/scripts/system-health-check.js');
}

verify();




















