import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyArtifacts() {
  console.log('🔍 Verifying OTTO System Artifacts...\n');

  const artifactTypes = [
    'otto_system_architecture',
    'agent_capability_matrix',
    'api_reference',
    'system_status'
  ];

  let foundCount = 0;
  let missingCount = 0;

  for (const type of artifactTypes) {
    try {
      const { data, error, count } = await supabase
        .from('artifacts')
        .select('artifact_id, type, created_at, data', { count: 'exact' })
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error(`❌ Error querying ${type}:`, error.message);
        missingCount++;
      } else if (data && data.length > 0) {
        const artifact = data[0];
        console.log(`✅ Found: ${type}`);
        console.log(`   Artifact ID: ${artifact.artifact_id}`);
        console.log(`   Created: ${new Date(artifact.created_at).toLocaleString()}`);
        console.log(`   Title: ${artifact.data?.title || 'N/A'}`);
        console.log('');
        foundCount++;
      } else {
        console.log(`⚠️  Not found: ${type}`);
        missingCount++;
      }
    } catch (err) {
      console.error(`❌ Unexpected error checking ${type}:`, err.message);
      missingCount++;
    }
  }

  // Also check for any OTTO-related artifacts
  console.log('🔍 Checking for all OTTO-related artifacts...\n');
  
  const { data: allOttoArtifacts, error: allError } = await supabase
    .from('artifacts')
    .select('artifact_id, type, created_at')
    .or('type.eq.otto_system_architecture,type.eq.agent_capability_matrix,type.eq.api_reference,type.eq.system_status')
    .order('created_at', { ascending: false });

  if (!allError && allOttoArtifacts) {
    console.log(`📊 Total OTTO artifacts in database: ${allOttoArtifacts.length}\n`);
    
    if (allOttoArtifacts.length > 0) {
      console.log('Recent OTTO artifacts:');
      allOttoArtifacts.slice(0, 5).forEach(artifact => {
        console.log(`  - ${artifact.type}: ${artifact.artifact_id}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Found: ${foundCount}/${artifactTypes.length}`);
  console.log(`❌ Missing: ${missingCount}/${artifactTypes.length}`);

  if (foundCount === artifactTypes.length) {
    console.log('\n🎉 All artifacts verified and queryable!');
    return true;
  } else {
    console.log('\n⚠️  Some artifacts missing. Review above.');
    return false;
  }
}

verifyArtifacts()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });









