import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ArtifactStorage from '../artifact-storage/core.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Check Supabase for all formulas and compare with:
 * 1. Current formula registry
 * 2. Formulas used by agents
 * 3. Formulas documented in docs/formulas/
 */
async function checkSupabaseFormulas() {
  console.log('🔍 Checking Supabase for formulas...\n');

  // Check agent_formulas table
  console.log('1. Checking agent_formulas table...');
  const { data: agentFormulas, error: agentFormulasError } = await supabase
    .from('agent_formulas')
    .select('*')
    .order('name');

  if (agentFormulasError) {
    console.error('❌ Error querying agent_formulas:', agentFormulasError);
  } else {
    console.log(`   Found ${agentFormulas?.length || 0} formulas in agent_formulas table`);
    if (agentFormulas && agentFormulas.length > 0) {
      console.log('\n   Formula codes:');
      agentFormulas.slice(0, 20).forEach(f => {
        console.log(`   - ${f.name || f.formula_name || f.key || f.slug || f.id} (${f.category || 'unknown'})`);
      });
      if (agentFormulas.length > 20) {
        console.log(`   ... and ${agentFormulas.length - 20} more`);
      }
    }
  }

  // Check formulas table (if it exists)
  console.log('\n2. Checking formulas table...');
  const { data: formulas, error: formulasError } = await supabase
    .from('formulas')
    .select('formula_code, formula_name, category')
    .order('formula_code');

  if (formulasError) {
    console.log(`   ⚠️  formulas table not found or error: ${formulasError.message}`);
  } else {
    console.log(`   Found ${formulas?.length || 0} formulas in formulas table`);
    if (formulas && formulas.length > 0) {
      console.log('\n   Formula codes:');
      formulas.slice(0, 20).forEach(f => {
        console.log(`   - ${f.formula_code} (${f.category || 'unknown'})`);
      });
      if (formulas.length > 20) {
        console.log(`   ... and ${formulas.length - 20} more`);
      }
    }
  }

  // Check artifacts for formula_definition type
  console.log('\n3. Checking artifacts for formula_definition type...');
  const { data: formulaArtifacts, error: artifactsError } = await supabase
    .from('artifacts')
    .select('artifact_id, type, data, metadata, created_at')
    .eq('type', 'formula_definition')
    .order('created_at', { ascending: false });

  if (artifactsError) {
    console.error('❌ Error querying artifacts:', artifactsError);
  } else {
    console.log(`   Found ${formulaArtifacts?.length || 0} formula_definition artifacts`);
    if (formulaArtifacts && formulaArtifacts.length > 0) {
      const formulaNames = formulaArtifacts.map(a => {
        const formulaData = a.data || {};
        return formulaData.name || formulaData.formula_name || formulaData.key || formulaData.formula_code || a.artifact_id;
      });
      console.log('\n   Formula artifacts:');
      formulaNames.slice(0, 20).forEach(name => {
        console.log(`   - ${name}`);
      });
      if (formulaNames.length > 20) {
        console.log(`   ... and ${formulaNames.length - 20} more`);
      }
    }
  }

  // Check what formulas agents are using
  console.log('\n4. Checking formulas used by agents (from registry)...');
  try {
    const { AgentRegistry } = await import('../agents/registry.js');
    const agentFormulaSet = new Set();
    Object.values(AgentRegistry).forEach(AgentClass => {
      const agent = new AgentClass();
      agent.formulas.forEach(f => agentFormulaSet.add(f));
    });
    console.log(`   Agents use ${agentFormulaSet.size} unique formulas:`);
    Array.from(agentFormulaSet).sort().forEach(f => {
      console.log(`   - ${f}`);
    });
  } catch (error) {
    console.error('   ❌ Error loading agent registry:', error.message);
  }

  // Check implemented formulas
  console.log('\n5. Checking implemented formulas (from FormulaRegistry)...');
  try {
    const { FormulaRegistry } = await import('../formulas/registry.js');
    const implemented = Object.keys(FormulaRegistry);
    console.log(`   ${implemented.length} formulas implemented in code:`);
    implemented.forEach(f => {
      console.log(`   - ${f}`);
    });
  } catch (error) {
    console.error('   ❌ Error loading formula registry:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`agent_formulas table: ${agentFormulas?.length || 0} formulas`);
  console.log(`formulas table: ${formulas?.length || 0} formulas`);
  console.log(`formula_definition artifacts: ${formulaArtifacts?.length || 0} artifacts`);
  
  try {
    const { AgentRegistry } = await import('../agents/registry.js');
    const agentFormulaSet = new Set();
    Object.values(AgentRegistry).forEach(AgentClass => {
      const agent = new AgentClass();
      agent.formulas.forEach(f => agentFormulaSet.add(f));
    });
    console.log(`Formulas used by agents: ${agentFormulaSet.size}`);
    
    const { FormulaRegistry } = await import('../formulas/registry.js');
    console.log(`Formulas implemented in code: ${Object.keys(FormulaRegistry).length}`);
  } catch (error) {
    console.error('Error generating summary:', error.message);
  }
}

checkSupabaseFormulas()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });




















