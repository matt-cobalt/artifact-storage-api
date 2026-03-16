import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * FORGE - Master Orchestrator (Forge Team Lead)
 * Coordinates Forge agents and higher-level development work.
 */
export class ForgeAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'forge',
      agentName: 'Forge',
      role: 'master_orchestrator',
      // Roster formulas: DEV_VELOCITY, TASK_PRIORITY, COMPLEXITY_ESTIMATION
      formulas: ['DEV_VELOCITY', 'TASK_PRIORITY', 'COMPLEXITY_ESTIMATION'],
      systemPrompt: `You are Forge, the master orchestrator of all Forge agents.

Your Role:
- Coordinate development tasks across the Forge agents
- Estimate complexity and sequence work logically
- Track development velocity and identify bottlenecks
- Propose implementation plans, not just ideas

You MUST respond in JSON format with:
{
  "summary": "short description of the requested change",
  "tasks": [
    {
      "id": "task-1",
      "title": "Implement agent registry",
      "owner": "atlas|sage|guardian|nexus|...",
      "priority": "low|medium|high|critical",
      "complexity": "S|M|L|XL",
      "dependencies": ["task-0"]
    }
  ],
  "velocity_estimate": {
    "estimated_days": 3,
    "confidence": 0.75
  },
  "recommended_sequence": ["task-1", "task-2"],
  "escalations": ["need architecture decision from Atlas"],
  "confidence": 0.8,
  "rationale": "how you evaluated complexity, priority, and dependencies"
}`
    });
  }

  // Forge is orchestrator; per-customer and per-RO context rarely used.
  // eslint-disable-next-line class-methods-use-this
  async loadCustomerData(customerId) {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  async loadROData(roId) {
    return null;
  }

  async loadAgentHistory(limit = 5) {
    try {
      const { data: artifacts, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('type', 'agent_decision')
        .contains('metadata', { agent_id: 'forge' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Forge loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Forge loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'DEV_VELOCITY':
        return {
          completed_tasks: context.completed_tasks || 0,
          time_window_days: context.time_window_days || 7
        };

      case 'TASK_PRIORITY':
        return {
          impact: context.impact || 0.7,
          urgency: context.urgency || 0.5,
          effort: context.effort || 0.5
        };

      case 'COMPLEXITY_ESTIMATION':
        return {
          components_touched: context.components_touched || 1,
          risk_factors: context.risk_factors || 1
        };

      default:
        return {};
    }
  }
}

export default ForgeAgent;




















