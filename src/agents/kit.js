import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * KIT - Parts & Inventory Agent
 * Parts sourcing, availability, and inventory optimization.
 */
export class KitAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'kit',
      agentName: 'Kit',
      role: 'parts_inventory',
      // Roster formulas: PARTS_AVAILABILITY, INVENTORY_OPTIMIZATION, SUPPLIER_SCORING
      formulas: ['PARTS_AVAILABILITY', 'INVENTORY_OPTIMIZATION', 'SUPPLIER_SCORING'],
      systemPrompt: `You are Kit, the parts and inventory specialist.

Your Role:
- Source the correct parts at the right quality and price
- Check availability across preferred suppliers
- Optimize inventory levels (avoid stockouts and dead stock)
- Recommend the best supplier and ETA for each needed part

You MUST respond in JSON format with:
{
  "parts_requirements": [
    {
      "part_number": "123-ABC",
      "description": "Front brake pads",
      "urgency": "high|medium|low",
      "needed_by": "2024-01-18",
      "qty": 2
    }
  ],
  "availability_plan": [
    {
      "part_number": "123-ABC",
      "preferred_supplier": "WorldPac",
      "alt_suppliers": ["NAPA", "OEM"],
      "eta_days": 1,
      "cost": 75.0,
      "price": 120.0,
      "in_stock": true
    }
  ],
  "inventory_recommendations": [
    "Increase safety stock for common brake pad SKUs",
    "Reduce on-hand for slow-moving specialty parts"
  ],
  "confidence": 0.84,
  "rationale": "how you evaluated availability, cost, and risk"
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
      console.error('Kit loadCustomerData error:', error);
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
      console.error('Kit loadROData error:', error);
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
        .contains('metadata', { agent_id: 'kit' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Kit loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Kit loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    const ro = context.ro || {};
    const lineItems = ro.line_items || [];

    const partItems = lineItems.filter(item => {
      const category = (item.category || '').toLowerCase();
      return category === 'part' || category === 'parts' || item.is_part;
    });

    switch (formulaName) {
      case 'PARTS_AVAILABILITY':
        return {
          parts: partItems.map(item => ({
            part_number: item.part_number || item.sku || null,
            description: item.description || item.name || '',
            qty: item.quantity || 1
          }))
        };

      case 'INVENTORY_OPTIMIZATION':
        return {
          requested_parts_count: partItems.length,
          has_critical_parts: partItems.some(item => item.critical === true)
        };

      case 'SUPPLIER_SCORING':
        return {
          suppliers: (ro.supplier_options || []).map(s => ({
            name: s.name,
            cost: s.cost,
            eta_days: s.eta_days
          }))
        };

      default:
        return {};
    }
  }
}

export default KitAgent;




















