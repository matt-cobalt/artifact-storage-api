import { AtlasAgent } from './atlas.js';

async function testAtlas() {
  console.log('Testing ATLAS Agent...\n');

  const atlas = new AtlasAgent();

  const result = await atlas.execute(
    {
      question:
        'How should we evolve the Artifact Storage API architecture to handle 10x more agent traffic?',
      current_architecture: 'Single Express API + Supabase + artifact storage tables',
      concerns: ['throughput', 'fault_tolerance', 'observability']
    },
    {
      triggered_by: 'architecture_query',
      current_load: 1,
      projected_load: 10,
      debt_items: 4,
      baseline_latency_ms: 220,
      qps: 60
    }
  );

  console.log('ATLAS Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✅ ATLAS test complete');
}

testAtlas().catch(err => {
  console.error('❌ ATLAS test failed:', err);
  process.exit(1);
});









