import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ArtifactStorage from '../artifact-storage/core.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Import all formulas from Supabase `formulas` table into artifacts.
 * Creates formula_definition artifacts for each formula.
 */
async function importAllFormulasToArtifacts() {
  console.log('📦 Importing all formulas from Supabase formulas table...\n');

  // Get all formulas from formulas table
  const { data: formulas, error } = await supabase
    .from('formulas')
    .select('*')
    .order('formula_code');

  if (error) {
    console.error('❌ Error fetching formulas:', error);
    process.exit(1);
  }

  if (!formulas || formulas.length === 0) {
    console.log('⚠️  No formulas found in formulas table.');
    return;
  }

  console.log(`Found ${formulas.length} formulas in formulas table.\n`);

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const formula of formulas) {
    const formulaCode = formula.formula_code || formula.id;
    
    try {
      // Check if artifact already exists for this formula
      const existing = await ArtifactStorage.queryArtifacts({
        type: 'formula_definition',
        limit: 1,
        dataQuery: { formula_code: formulaCode }
      });

      if (Array.isArray(existing) && existing.length > 0) {
        console.log(`⏭️  Skipping ${formulaCode} (already exists as artifact ${existing[0].artifact_id})`);
        skippedCount += 1;
        continue;
      }

      // Create artifact
      const provenance = {
        agent: 'formula_migration',
        source: 'formulas_table',
        trigger: 'bulk_import',
        timestamp: new Date().toISOString()
      };

      const metadata = {
        formula_code: formulaCode,
        formula_name: formula.formula_name || formulaCode,
        category: formula.category || 'unknown',
        version: formula.version || '1.0',
        table: 'formulas',
        imported_at: new Date().toISOString()
      };

      // Store full formula data
      const artifact = await ArtifactStorage.createArtifact({
        type: 'formula_definition',
        data: {
          ...formula,
          formula_code: formulaCode,
          formula_name: formula.formula_name,
          category: formula.category,
          formula_logic: formula.formula_logic,
          formula_executable: formula.formula_executable,
          usage_context: formula.usage_context,
          input_parameters: formula.input_parameters || {},
          output_parameters: formula.output_parameters || {},
          threshold_config: formula.threshold_config || {}
        },
        provenance,
        metadata
      });

      console.log(`✅ Created artifact for ${formulaCode} (${formula.formula_name || 'unnamed'})`);
      console.log(`   Category: ${formula.category || 'unknown'}`);
      console.log(`   Artifact ID: ${artifact.artifact_id}\n`);
      createdCount += 1;
    } catch (err) {
      console.error(`❌ Failed to create artifact for ${formulaCode}:`, err.message);
      errorCount += 1;
    }
  }

  console.log('='.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total formulas in Supabase: ${formulas.length}`);
  console.log(`✅ Created: ${createdCount}`);
  console.log(`⏭️  Skipped (already exists): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(60));

  // Now check which formulas agents are using vs what we have
  console.log('\n📊 Formula Coverage Analysis:\n');
  
  try {
    const { AgentRegistry } = await import('../agents/registry.js');
    const agentFormulaSet = new Set();
    Object.values(AgentRegistry).forEach(AgentClass => {
      const agent = new AgentClass();
      agent.formulas.forEach(f => agentFormulaSet.add(f));
    });

    const formulasInSupabase = new Set(formulas.map(f => f.formula_code));
    const agentFormulasArray = Array.from(agentFormulaSet).sort();

    console.log(`Formulas used by agents: ${agentFormulasArray.length}`);
    console.log(`Formulas in Supabase: ${formulasInSupabase.size}`);
    
    // Find formulas used by agents but not in Supabase
    const missing = agentFormulasArray.filter(f => !formulasInSupabase.has(f));
    if (missing.length > 0) {
      console.log(`\n⚠️  Formulas used by agents but NOT in Supabase (${missing.length}):`);
      missing.forEach(f => console.log(`   - ${f}`));
    }

    // Find formulas in Supabase but not used by agents
    const unused = Array.from(formulasInSupabase).filter(f => !agentFormulaSet.has(f));
    if (unused.length > 0) {
      console.log(`\n📋 Formulas in Supabase but NOT used by agents (${unused.length}):`);
      unused.slice(0, 10).forEach(f => console.log(`   - ${f}`));
      if (unused.length > 10) {
        console.log(`   ... and ${unused.length - 10} more`);
      }
    }

    // Find formulas in both
    const covered = agentFormulasArray.filter(f => formulasInSupabase.has(f));
    console.log(`\n✅ Formulas covered (in Supabase AND used by agents): ${covered.length}`);
  } catch (error) {
    console.error('Error analyzing formula coverage:', error.message);
  }
}

importAllFormulasToArtifacts()
  .then(() => {
    console.log('\n✅ Import complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });




















