import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ArtifactStorage from '../artifact-storage/core.js';

// This script reads all rows from the Supabase `agent_formulas` table
// and creates a corresponding `formula_definition` artifact for each one.
//
// Usage (from artifact-storage-api directory):
//   node src/scripts/import-formulas-to-artifacts.js
//
// NOTE: This is intended as a one-time (or rare) migration. If re-run,
// it will skip formulas that already have a matching artifact based on
// the formula row `id` field.

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function importFormulasToArtifacts() {
  console.log('[Formula Import] Starting import from agent_formulas ...');

  const { data: formulas, error } = await supabase
    .from('agent_formulas')
    .select('*');

  if (error) {
    console.error('[Formula Import] Failed to fetch agent_formulas:', error);
    process.exit(1);
  }

  if (!formulas || formulas.length === 0) {
    console.log('[Formula Import] No formulas found in agent_formulas table.');
    return;
  }

  console.log(`[Formula Import] Found ${formulas.length} formulas.`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const formula of formulas) {
    const formulaId = formula.id ?? formula.formula_id ?? null;

    try {
      // Check if we already have an artifact for this formula (id-based)
      if (formulaId != null) {
        const existing = await ArtifactStorage.queryArtifacts({
          type: 'formula_definition',
          limit: 1,
          dataQuery: { id: formulaId }
        });

        if (Array.isArray(existing) && existing.length > 0) {
          console.log(
            `[Formula Import] Skipping existing formula id=${formulaId} (artifact_id=${existing[0].artifact_id})`
          );
          skippedCount += 1;
          continue;
        }
      }

      const provenance = {
        agent: 'formula_migration',
        source: 'agent_formulas_table',
        trigger: 'bulk_import'
      };

      const metadata = {
        formula_id: formulaId,
        formula_name:
          formula.name || formula.formula_name || formula.key || formula.slug || null,
        category: formula.category || null,
        version: formula.version || null,
        table: 'agent_formulas'
      };

      const artifact = await ArtifactStorage.createArtifact({
        type: 'formula_definition',
        data: formula,
        provenance,
        metadata
      });

      console.log(
        `[Formula Import] Created artifact ${artifact.artifact_id} for formula id=${formulaId}`
      );
      createdCount += 1;
    } catch (err) {
      console.error(
        `[Formula Import] Failed to create artifact for formula id=${formulaId}:`,
        err
      );
    }
  }

  console.log(
    `[Formula Import] Complete. Created ${createdCount} artifacts, skipped ${skippedCount}.`
  );
}

importFormulasToArtifacts()
  .then(() => {
    console.log('[Formula Import] Done.');
    process.exit(0);
  })
  .catch(err => {
    console.error('[Formula Import] Fatal error:', err);
    process.exit(1);
  });
