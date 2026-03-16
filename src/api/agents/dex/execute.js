import { executeAgent } from '../../../agents/registry.js';

/**
 * POST /api/agents/dex/execute
 * Execute the Dex diagnostics triage agent and return the artifact_id.
 *
 * This handler is designed to work in an Express-style environment:
 *   export default async function handler(req, res) { ... }
 */
export default async function executeDex(req, res) {
  // Enforce POST semantics when running behind an HTTP server
  if (req.method && req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
    return;
  }

  try {
    const { input, context } = req.body || {};

    const result = await executeAgent(
      'dex',
      input || {},
      {
        ...(context || {}),
        triggered_by: (context && context.triggered_by) || 'api_dex_execute'
      }
    );

    res.status(200).json({
      success: true,
      agent: result.agent,
      decision: result.decision,
      artifact_id: result.artifact_id,
      execution_time_ms: result.execution_time_ms
    });
  } catch (error) {
    console.error('Dex API execute error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}










