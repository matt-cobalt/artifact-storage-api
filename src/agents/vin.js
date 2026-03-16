import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * VIN - Vehicle Intelligence Agent
 * VIN decode, service history, and vehicle-specific maintenance recommendations.
 */
export class VinAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'vin',
      agentName: 'Vin',
      role: 'vehicle_intelligence',
      formulas: ['SERVICE_INTERVAL_PREDICTION', 'RECALL_DETECTION', 'MAINTENANCE_SCHEDULING'],
      systemPrompt: `You are Vin, the vehicle intelligence specialist.

Your Role:
- Decode VIN and summarize key vehicle characteristics
- Analyze service history for this vehicle
- Identify upcoming or overdue maintenance
- Highlight potential recalls or safety-related issues

You MUST respond in JSON format with:
{
  "vehicle_profile": {
    "vin": "1HGBH41JXMN109186",
    "year": 2015,
    "make": "Honda",
    "model": "Civic",
    "engine": "2.0L"
  },
  "service_history": [
    {
      "date": "2024-01-10",
      "mileage": 84500,
      "services": ["Oil change", "Tire rotation"]
    }
  ],
  "maintenance_recommendations": [
    {
      "service": "Brake fluid flush",
      "reason": "age/mileage-based",
      "priority": "urgent|recommended|optional"
    }
  ],
  "recall_alerts": ["NHTSA campaign 21V-123 for airbag inflator"],
  "confidence": 0.88,
  "rationale": "how you interpreted history, mileage, and OEM schedules"
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
      console.error('Vin loadCustomerData error:', error);
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
      console.error('Vin loadROData error:', error);
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
        .contains('metadata', { agent_id: 'vin' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Vin loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Vin loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    const ro = context.ro || {};
    const vehicle = ro.vehicle || (context.customer?.vehicles?.[0] || {});
    const lastServiceDate = ro.completed_at || ro.closed_at || ro.created_at || null;

    switch (formulaName) {
      case 'SERVICE_INTERVAL_PREDICTION':
        return {
          last_service_date: lastServiceDate,
          average_interval_days: 180,
          std_dev_days: 14
        };

      case 'RECALL_DETECTION':
        return {
          vin: vehicle.vin || null,
          year: vehicle.year || null,
          make: vehicle.make || vehicle.manufacturer || null,
          model: vehicle.model || null
        };

      case 'MAINTENANCE_SCHEDULING':
        return {
          current_mileage: vehicle.mileage || vehicle.odometer || null,
          year: vehicle.year || null
        };

      default:
        return {};
    }
  }
}

export default VinAgent;




















