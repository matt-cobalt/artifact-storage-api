import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * FLO - Operations Orchestration Agent
 * Focuses on workflow coordination, resource allocation, and scheduling optimization.
 */
export class FloAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'flo',
      agentName: 'Flo',
      role: 'operations_orchestrator',
      // Align with existing formula name NCR_FORMULA (Next Contact Recommendation)
      formulas: ['NCR_FORMULA'],
      systemPrompt: `You are Flo, the operations orchestration specialist.

Your Role:
- Coordinate shop workflow and appointment scheduling
- Balance technician capacity, bay availability, and customer needs
- Minimize idle time and bottlenecks
- Sequence jobs based on urgency and customer impact
- Use next-contact signals (NCR) to prioritize follow-ups and scheduling

You MUST respond in JSON format with:
{
  "schedule_plan": [
    {
      "slot_start": "2024-01-15T09:00:00Z",
      "slot_end": "2024-01-15T11:00:00Z",
      "job_id": "ro_123",
      "technician_id": "tech_001",
      "bay_id": "bay_1",
      "reason": "why this job is placed here"
    }
  ],
  "capacity_summary": {
    "bays_available": 4,
    "bays_scheduled": 3,
    "utilization_pct": 0.78
  },
  "priority_notes": ["note1", "note2"],
  "follow_up_recommendations": ["call customer X", "reschedule customer Y"],
  "confidence": 0.84,
  "rationale": "how this schedule was constructed"
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
      console.error('Flo loadCustomerData error:', error);
      return null;
    }

    const metrics = this.calculateCustomerMetrics(customer);

    return {
      ...customer,
      metrics
    };
  }

  // eslint-disable-next-line class-methods-use-this
  calculateCustomerMetrics(customer) {
    const ros = customer?.repair_orders || [];
    const totalSpent = ros.reduce((sum, ro) => sum + (ro.total || 0), 0);
    const totalVisits = ros.length;

    const lastVisitDays = ros.length > 0
      ? Math.floor((Date.now() - new Date(ros[0].created_at)) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      total_visits: totalVisits,
      total_spent: totalSpent,
      average_ro: totalVisits > 0 ? totalSpent / totalVisits : 0,
      last_visit: lastVisitDays,
      vehicle_count: customer?.vehicles?.length || 0
    };
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
      console.error('Flo loadROData error:', error);
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
        .contains('metadata', { agent_id: 'flo' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Flo loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Flo loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    const customer = context.customer;
    const metrics = customer?.metrics || {};

    switch (formulaName) {
      case 'NCR_FORMULA':
        return {
          days_since_last_visit: metrics.last_visit || 999
        };

      default:
        return {};
    }
  }
}

export default FloAgent;




















