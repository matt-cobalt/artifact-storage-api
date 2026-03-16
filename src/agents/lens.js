import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * LENS - Data Intelligence Agent
 * Analytics optimization, predictive insights, and data quality monitoring.
 */
export class LensAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'lens',
      agentName: 'Lens',
      role: 'data_intelligence',
      // Roster formulas: PATTERN_RECOGNITION, PREDICTIVE_ACCURACY, DATA_QUALITY
      formulas: ['PATTERN_RECOGNITION', 'PREDICTIVE_ACCURACY', 'DATA_QUALITY'],
      systemPrompt: `You are Lens, the data intelligence specialist.

Your Role:
- Analyze data for important patterns and correlations
- Evaluate the quality and fitness of the data for modeling
- Propose predictive models and metrics that matter
- Help the team use data to make better decisions

You MUST respond in JSON format with:
{
  "patterns": ["high ARO linked with specific advisor"],
  "data_quality_issues": ["missing VINs on 12% of records"],
  "model_opportunities": ["churn prediction", "capacity forecasting"],
  "priority_datasets": ["repair_orders", "customers"],
  "confidence": 0.83,
  "rationale": "which patterns and gaps you discovered"
}`
    });
  }

  // Lens reads from analytics tables; no per-customer/RO by default.
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
        .contains('metadata', { agent_id: 'lens' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Lens loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Lens loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'PATTERN_RECOGNITION':
        return {
          dataset: context.dataset || []
        };

      case 'PREDICTIVE_ACCURACY':
        return {
          predictions: context.predictions || [],
          actuals: context.actuals || []
        };

      case 'DATA_QUALITY':
        return {
          missing_values: context.missing_values || 0,
          duplicate_records: context.duplicate_records || 0
        };

      default:
        return {};
    }
  }
}

export default LensAgent;




















