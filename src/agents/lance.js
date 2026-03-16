import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * LANCE - Compliance & Fraud Prevention Agent (The Shield)
 * Fraud detection, warranty abuse, liability risk, compliance.
 */
export class LanceAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'lance',
      agentName: 'Lance',
      role: 'compliance_shield',
      // Roster formulas: FRAUD_DETECTION, WARRANTY_ABUSE_SCORE, LIABILITY_RISK, COMPLIANCE_CHECK
      formulas: ['FRAUD_DETECTION', 'WARRANTY_ABUSE_SCORE', 'LIABILITY_RISK', 'COMPLIANCE_CHECK'],
      systemPrompt: `You are Lance, the compliance and fraud prevention specialist (The Shield).

Your Role:
- Detect potentially fraudulent behavior or warranty abuse
- Flag legal liability risks before they become problems
- Recommend protective documentation and processes
- Keep the shop legally safe without blocking good customers

You MUST respond in JSON format with:
{
  "risk_summary": {
    "level": "low|moderate|high|critical",
    "reasons": ["suspicious warranty pattern", "unusual payment behavior"]
  },
  "fraud_signals": ["multiple card declines", "mismatched contact info"],
  "warranty_flags": ["repeat claim outside OEM guidelines"],
  "liability_warnings": ["safety-related decline requires signed waiver"],
  "recommended_actions": ["require ID verification", "obtain signed acknowledgment"],
  "confidence": 0.79,
  "rationale": "what patterns, history, and context triggered your assessment"
}`
    });
  }

  async loadCustomerData(customerId) {
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles (*),
        repair_orders (*, line_items (*))
      `)
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('Lance loadCustomerData error:', error);
      return null;
    }

    return customer;
  }

  async loadROData(roId) {
    const { data: ro, error } = await supabase
      .from('repair_orders')
      .select(`
        *,
        customer (*),
        vehicle (*),
        line_items (*)
      `)
      .eq('id', roId)
      .single();

    if (error) {
      console.error('Lance loadROData error:', error);
      return null;
    }

    return ro;
  }

  async loadAgentHistory(limit = 5) {
    try {
      const { data: artifacts, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('type', 'agent_decision')
        .contains('metadata', { agent_id: 'lance' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Lance loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Lance loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    const customer = context.customer || {};
    const ro = context.ro || {};

    switch (formulaName) {
      case 'FRAUD_DETECTION':
        return {
          total: ro.total || 0,
          payment_method: ro.payment_method || null
        };

      case 'WARRANTY_ABUSE_SCORE':
        return {
          warranty_claims: customer.warranty_claims || 0
        };

      case 'LIABILITY_RISK':
        return {
          declined_safety_work: ro.declined_safety_items || 0
        };

      case 'COMPLIANCE_CHECK':
        return {
          has_signed_authorization: !!ro.signed_authorization
        };

      default:
        return {};
    }
  }
}

export default LanceAgent;




















