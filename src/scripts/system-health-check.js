import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function healthCheck() {
  // Check artifacts by type
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('type')
    .order('created_at', { ascending: false });
  
  const counts = {};
  artifacts.forEach(a => {
    counts[a.type] = (counts[a.type] || 0) + 1;
  });
  
  console.log('Artifact Counts:');
  console.log(JSON.stringify(counts, null, 2));
  
  // Check formulas table
  const { data: formulas } = await supabase
    .from('formulas')
    .select('formula_code');
  
  console.log(`\nTotal Formulas: ${formulas.length}`);
  
  // Check recent agent decisions
  const { data: decisions } = await supabase
    .from('artifacts')
    .select('data')
    .eq('type', 'agent_decision');
  
  console.log(`\nAgent Decisions Created: ${decisions.length}`);
  
  const agentsUsed = new Set(decisions.map(d => d.data?.agent));
  console.log(`Agents That Created Artifacts: ${[...agentsUsed].join(', ')}`);
}

healthCheck();









