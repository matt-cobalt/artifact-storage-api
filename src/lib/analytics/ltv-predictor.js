/**
 * Customer Lifetime Value Predictor
 * Predicts future customer value based on historical data
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * LTVPredictor class
 */
export class LTVPredictor {
  constructor(shopId = null) {
    this.shopId = shopId;
  }

  /**
   * Predict LTV for a customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} LTV prediction
   */
  async predictLTV(customerId) {
    try {
      // Get customer data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*, vehicles(*), repair_orders(*)')
        .eq('id', customerId)
        .eq('shop_id', this.shopId)
        .single();

      if (customerError || !customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      // Calculate historical metrics
      const historicalRevenue = customer.lifetime_revenue || 0;
      const tenureYears = this.calculateTenure(customer.created_at || customer.first_visit_date);
      const serviceFrequency = this.calculateServiceFrequency(customer.repair_orders || []);
      const avgTicket = this.calculateAverageTicket(customer.repair_orders || []);

      // Get vehicle age (oldest vehicle)
      const vehicleAge = this.getVehicleAge(customer.vehicles || []);

      // Calculate trend
      const trend = this.calculateTrend(customer.repair_orders || []);

      // Predict future value
      const projectedFutureValue = this.projectFutureValue({
        historicalRevenue,
        tenureYears,
        serviceFrequency,
        avgTicket,
        vehicleAge,
        trend
      });

      const predictedLTV = historicalRevenue + projectedFutureValue;
      const confidenceScore = this.calculateConfidence({
        tenureYears,
        serviceFrequency,
        dataQuality: customer.repair_orders?.length || 0
      });

      // Predict next service date
      const nextServiceDate = this.predictNextServiceDate(
        customer.repair_orders || [],
        serviceFrequency
      );

      // Store prediction
      await this.storePrediction(customerId, {
        predicted_ltv: predictedLTV,
        current_ltv: historicalRevenue,
        projected_future_value: projectedFutureValue,
        confidence_score: confidenceScore,
        factors: {
          service_frequency: `${serviceFrequency.toFixed(1)} visits/year`,
          avg_ticket: avgTicket,
          tenure_years: tenureYears.toFixed(1),
          vehicle_age: vehicleAge,
          trend: trend
        },
        next_service_prediction: nextServiceDate
      });

      return {
        customer_id: customerId,
        predicted_ltv: predictedLTV,
        confidence_score: confidenceScore,
        current_ltv: historicalRevenue,
        projected_future_value: projectedFutureValue,
        factors: {
          service_frequency: serviceFrequency,
          avg_ticket: avgTicket,
          tenure_years: tenureYears,
          vehicle_age: vehicleAge,
          trend: trend
        },
        next_service_date: nextServiceDate
      };
    } catch (error) {
      console.error('LTVPredictor.predictLTV error:', error);
      throw error;
    }
  }

  /**
   * Calculate customer tenure in years
   * @private
   */
  calculateTenure(firstDate) {
    if (!firstDate) return 0;
    const first = new Date(firstDate);
    const now = new Date();
    return (now - first) / (1000 * 60 * 60 * 24 * 365);
  }

  /**
   * Calculate service frequency (visits per year)
   * @private
   */
  calculateServiceFrequency(repairOrders) {
    if (!repairOrders || repairOrders.length === 0) return 0;

    const sorted = repairOrders.sort((a, b) => 
      new Date(a.created_at || a.service_date) - new Date(b.created_at || b.service_date)
    );

    const firstDate = new Date(sorted[0].created_at || sorted[0].service_date);
    const lastDate = new Date(sorted[sorted.length - 1].created_at || sorted[sorted.length - 1].service_date);
    const days = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    const years = days / 365;

    return years > 0 ? repairOrders.length / years : 0;
  }

  /**
   * Calculate average ticket size
   * @private
   */
  calculateAverageTicket(repairOrders) {
    if (!repairOrders || repairOrders.length === 0) return 0;

    const total = repairOrders.reduce((sum, ro) => sum + (parseFloat(ro.total_amount) || 0), 0);
    return total / repairOrders.length;
  }

  /**
   * Get vehicle age (oldest vehicle)
   * @private
   */
  getVehicleAge(vehicles) {
    if (!vehicles || vehicles.length === 0) return 5; // Default 5 years

    const now = new Date().getFullYear();
    const ages = vehicles.map(v => now - (v.year || now - 5));
    return Math.max(...ages);
  }

  /**
   * Calculate spending trend
   * @private
   */
  calculateTrend(repairOrders) {
    if (!repairOrders || repairOrders.length < 3) return 'stable';

    // Compare last 3 vs previous 3
    const sorted = repairOrders.sort((a, b) => 
      new Date(b.created_at || b.service_date) - new Date(a.created_at || a.service_date)
    );

    const recent = sorted.slice(0, 3);
    const previous = sorted.slice(3, 6);

    if (previous.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, ro) => sum + (parseFloat(ro.total_amount) || 0), 0) / recent.length;
    const previousAvg = previous.reduce((sum, ro) => sum + (parseFloat(ro.total_amount) || 0), 0) / previous.length;

    const change = ((recentAvg - previousAvg) / previousAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'declining';
    return 'stable';
  }

  /**
   * Project future value
   * @private
   */
  projectFutureValue({ historicalRevenue, tenureYears, serviceFrequency, avgTicket, vehicleAge, trend }) {
    // Remaining vehicle lifespan
    const vehicleLifespan = 15; // Typical vehicle lifespan
    const remainingYears = Math.max(0, vehicleLifespan - vehicleAge);

    // Trend multiplier
    const trendMultiplier = {
      'increasing': 1.1,
      'stable': 1.0,
      'declining': 0.9
    }[trend] || 1.0;

    // Annual revenue projection
    const annualRevenue = serviceFrequency * avgTicket * trendMultiplier;

    // Projected future value
    return annualRevenue * remainingYears;
  }

  /**
   * Calculate confidence score
   * @private
   */
  calculateConfidence({ tenureYears, serviceFrequency, dataQuality }) {
    let confidence = 0.5; // Base confidence

    // More tenure = higher confidence
    if (tenureYears > 3) confidence += 0.2;
    else if (tenureYears > 1) confidence += 0.1;

    // More data points = higher confidence
    if (dataQuality > 10) confidence += 0.2;
    else if (dataQuality > 5) confidence += 0.1;

    // Consistent service frequency = higher confidence
    if (serviceFrequency > 1) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Predict next service date
   * @private
   */
  predictNextServiceDate(repairOrders, serviceFrequency) {
    if (!repairOrders || repairOrders.length === 0) {
      return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const sorted = repairOrders.sort((a, b) => 
      new Date(b.created_at || b.service_date) - new Date(a.created_at || a.service_date)
    );

    const lastService = new Date(sorted[0].created_at || sorted[0].service_date);
    const daysBetweenServices = serviceFrequency > 0 ? 365 / serviceFrequency : 90;

    const nextService = new Date(lastService.getTime() + daysBetweenServices * 24 * 60 * 60 * 1000);
    return nextService.toISOString().split('T')[0];
  }

  /**
   * Store prediction
   * @private
   */
  async storePrediction(customerId, prediction) {
    const { error } = await supabase
      .from('customer_ltv_predictions')
      .upsert({
        customer_id: customerId,
        shop_id: this.shopId,
        predicted_ltv: prediction.predicted_ltv,
        current_ltv: prediction.current_ltv,
        projected_future_value: prediction.projected_future_value,
        confidence_score: prediction.confidence_score,
        factors: prediction.factors,
        next_service_prediction: prediction.next_service_prediction
      }, {
        onConflict: 'customer_id,shop_id'
      });

    if (error) {
      console.error('Failed to store LTV prediction:', error);
    }
  }

  /**
   * Predict LTV for all customers
   * @returns {Promise<Array>} All customer LTV predictions
   */
  async predictAllCustomers() {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id')
        .eq('shop_id', this.shopId);

      if (error) {
        throw new Error(`Failed to get customers: ${error.message}`);
      }

      const predictions = [];
      for (const customer of customers || []) {
        try {
          const prediction = await this.predictLTV(customer.id);
          predictions.push(prediction);
        } catch (error) {
          console.error(`Failed to predict LTV for customer ${customer.id}:`, error);
        }
      }

      // Sort by predicted LTV descending
      predictions.sort((a, b) => b.predicted_ltv - a.predicted_ltv);

      return predictions;
    } catch (error) {
      console.error('predictAllCustomers error:', error);
      throw error;
    }
  }
}

export default LTVPredictor;



















