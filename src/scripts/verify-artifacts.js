import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkArtifacts() {
  const { data, error, count } = await supabase
    .from('artifacts')
    .select('type, artifact_id, created_at, data', { count: 'exact' })
    .eq('type', 'agent_decision')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error querying artifacts:', error);
    return;
  }

  console.log('Recent agent_decision artifacts:');
  console.log(JSON.stringify(data, null, 2));
  console.log(`\nTotal agent_decision artifacts (approx): ${count}`);
}

checkArtifacts().catch(err => {
  console.error('Fatal error in verify-artifacts:', err);
  process.exit(1);
});




















