import { config } from 'dotenv';
config();

console.log('🔍 Auto Intel GTP - Setup Diagnostics\n');

// Check environment
console.log('Environment Variables:');
console.log(
  `  ANTHROPIC_API_KEY: ${
    process.env.ANTHROPIC_API_KEY
      ? `${process.env.ANTHROPIC_API_KEY.substring(0, 20)}... (${process.env.ANTHROPIC_API_KEY.length} chars)`
      : '❌ NOT SET'
  }`
);
console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL || '❌ NOT SET'}`);
console.log(
  `  SUPABASE_SERVICE_KEY: ${
    process.env.SUPABASE_SERVICE_KEY
      ? `${process.env.SUPABASE_SERVICE_KEY.substring(0, 20)}... (${process.env.SUPABASE_SERVICE_KEY.length} chars)`
      : '❌ NOT SET'
  }\n`
);

// Check agent registry
console.log('Agent Registry:');
try {
  const { AgentRegistry } = await import('../agents/registry.js');
  const agents = Object.keys(AgentRegistry);
  const squadIds = [
    'otto',
    'dex',
    'cal',
    'flo',
    'mac',
    'kit',
    'vin',
    'miles',
    'roy',
    'pennyp',
    'blaze',
    'lance',
    'oracle'
  ];
  const forgeIds = [
    'forge',
    'atlas',
    'scout',
    'sage',
    'guardian',
    'phoenix',
    'spec',
    'apex',
    'nexus',
    'lens',
    'conductor',
    'mentor'
  ];

  const squadCount = agents.filter(a => squadIds.includes(a)).length;
  const forgeCount = agents.filter(a => forgeIds.includes(a)).length;

  console.log(`  Total agents: ${agents.length}/25`);
  console.log(`  Squad: ${squadCount}/13`);
  console.log(`  Forge: ${forgeCount}/12\n`);
} catch (error) {
  console.log(`  ❌ Error: ${error.message}\n`);
}

// Check if server is running
console.log('API Server:');
try {
  const response = await fetch('http://localhost:3000/health');
  console.log(`  Status: ${response.ok ? '✅ Running' : '❌ Not responding'}`);
} catch (error) {
  console.log(`  Status: ❌ Not running (${error.message})`);
}

console.log('\n✅ Diagnostics complete');




















