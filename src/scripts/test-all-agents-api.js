import 'dotenv/config';

const agents = [
  'otto', 'dex', 'cal', 'flo', 'mac', 'kit', 'vin', 'miles', 'roy', 'pennyp', 'blaze', 'lance', 'oracle',
  'forge', 'atlas', 'scout', 'sage', 'guardian', 'phoenix', 'spec', 'apex', 'nexus', 'lens', 'conductor', 'mentor'
];

async function testAPI() {
  let successCount = 0;
  for (const agent of agents) {
    try {
      const response = await fetch(`http://localhost:3000/api/agents/${agent}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { test: true, agent } })
      });

      if (response.ok) {
        console.log(`${agent}: ✅ (${response.status})`);
        successCount += 1;
      } else {
        const text = await response.text();
        console.log(`${agent}: ❌ (${response.status}) - ${text}`);
      }
    } catch (err) {
      console.log(`${agent}: ❌ (network error) - ${err.message}`);
    }
  }

  console.log(`\nSuccessful agents: ${successCount} / ${agents.length}`);
}

testAPI().catch(err => {
  console.error('Fatal error in test-all-agents-api:', err);
  process.exit(1);
});




















