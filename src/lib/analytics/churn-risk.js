/**
 * Churn Risk Analyzer
 * Calculates churn risk scores for customers
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * ChurnRiskAnalyzer class
 */
export class ChurnRiskAnalyzer {
  constructor(shopId = null) {
    this.shopId = shopId;
  }

  /**
   * Calculate churn risk for a customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Churn risk analysis
   */
  async calculateChurnRisk(customerId) {
    try {
      // Get customer data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*, repair_orders(*)')
        .eq('id', customerId)
        .eq('shop_id', this.shopId)
        .single();

      if (customerError || !customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      const repairOrders = customer.repair_orders || [];

      // Calculate risk factors
      const daysSinceLastService = this.getDaysSinceLastService(repairOrders);
      const frequencyDecline = this.getFrequencyDecline(repairOrders);
      const ticketDecline = this.getTicketDecline(repairOrders);
      const previousComplaints = this.getPreviousComplaints(customer);

      // Calculate weighted risk score
      const daysFactor = this.daysSinceFactor(daysSinceLastService);
      const frequencyFactor = this.frequencyDeclineFactor(frequencyDecline);
      const ticketFactor = this.ticketDeclineFactor(ticketDecline);
      const complaintFactor = previousComplaints > 0 ? 0.3 : 0;

      const riskScore = 
        (daysFactor * 0.4) +
        (frequencyFactor * 0.3) +
        (ticketFactor * 0.15) +
        (complaintFactor * 0.15);

      // Determine risk level
      const riskLevel = this.getRiskLevel(riskScore);

      // Get recommended action
      const recommendedAction = this.getRecommendedAction(riskLevel, daysSinceLastService);
      const suggestedOffer = this.getSuggestedOffer(riskLevel);

      // Get priority
      const priority = this.getPriority(riskLevel, riskScore);

      // Store risk score
      await this.storeRiskScore(customerId, {
        churn_risk_score: riskScore,
        risk_level: riskLevel,
        risk_factors: {
          days_since_service: daysSinceLastService,
          frequency_decline: frequencyDecline,
          ticket_decline: ticketDecline,
          previous_complaints: previousComplaints
        },
        recommended_action: recommendedAction,
        suggested_offer: suggestedOffer,
        priority: priority
      });

      return {
        customer_id: customerId,
        churn_risk_score: riskScore,
        risk_level: riskLevel,
        risk_factors: {
          days_since_service: daysSinceLastService,
          frequency_decline: frequencyDecline,
          ticket_decline: ticketDecline,
          previous_complaints: previousComplaints
        },
        recommended_action: recommendedAction,
        suggested_offer: suggestedOffer,
        priority: priority
      };
    } catch (error) {
      console.error('ChurnRiskAnalyzer.calculateChurnRisk error:', error);
      throw error;
    }
  }

  /**
   * Get days since last service
   * @private
   */
  getDaysSinceLastService(repairOrders) {
    if (!repairOrders || repairOrders.length === 0) {
      return 365; // High risk if no service history
    }

    const sorted = repairOrders.sort((a, b) => 
      new Date(b.created_at || b.service_date) - new Date(a.created_at || a.service_date)
    );

    const lastService = new Date(sorted[0].created_at || sorted[0].service_date);
    const now = new Date();
    return Math.floor((now - lastService) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get frequency decline percentage
   * @private
   */
  getFrequencyDecline(repairOrders) {
    if (!repairOrders || repairOrders.length < 6) return 0;

    const sorted = repairOrders.sort((a, b) => 
      new Date(b.created_at || b.service_date) - new Date(a.created_at || a.service_date)
    );

    const lastYear = sorted.slice(0, Math.min(12, sorted.length));
    const previousYear = sorted.slice(12, 24);

    if (previousYear.length === 0) return 0;

    const lastYearCount = lastYear.length;
    const previousYearCount = previousYear.length;

    const decline = ((previousYearCount - lastYearCount) / previousYearCount) * 100;
    return decline;
  }

  /**
   * Get ticket decline percentage
   * @private
   */
  getTicketDecline(repairOrders) {
    if (!repairOrders || repairOrders.length < 6) return 0;

    const sorted = repairOrders.sort((a, b) => 
      new Date(b.created_at || b.service_date) - new Date(a.created_at || a.service_date)
    );

    const lastYear = sorted.slice(0, Math.min(12, sorted.length));
    const previousYear = sorted.slice(12, 24);

    if (previousYear.length === 0) return 0;

    const lastYearAvg = lastYear.reduce((sum, ro) => sum + (parseFloat(ro.total_amount) || 0), 0) / lastYear.length;
    const previousYearAvg = previousYear.reduce((sum, ro) => sum + (parseFloat(ro.total_amount) || 0), 0) / previousYear.length;

    if (previousYearAvg === 0) return 0;

    const decline = ((previousYearAvg - lastYearAvg) / previousYearAvg) * 100;
    return decline;
  }

  /**
   * Get previous complaints
   * @private
   */
  getPreviousComplaints(customer) {
    // Would check customer notes/complaints
    // For now, simplified
    return customer.metadata?.complaints || 0;
  }

  /**
   * Days since service factor (0-1)
   * @private
   */
  daysSinceFactor(days) {
    if (days < 90) return 0.1;  // Low risk
    if (days < 180) return 0.3; // Medium risk
    if (days < 365) return 0.7; // High risk
    return 1.0;                  // Critical risk
  }

  /**
   * Frequency decline factor (0-1)
   * @private
   */
  frequencyDeclineFactor(decline) {
    if (decline < -20) return 1.0;  // High risk
    if (decline < -10) return 0.6;  // Medium risk
    if (decline < 0) return 0.3;    // Low risk
    return 0.1;                      // No risk (increasing)
  }

  /**
   * Ticket decline factor (0-1)
   * @private
   */
  ticketDeclineFactor(decline) {
    if (decline < -20) return 0.8;
    if (decline < -10) return 0.5;
    if (decline < 0) return 0.2;
    return 0.1;
  }

  /**
   * Get risk level
   * @private
   */
  getRiskLevel(riskScore) {
    if (riskScore >= 0.75) return 'critical';
    if (riskScore >= 0.5) return 'high';
    if (riskScore >= 0.25) return 'medium';
    return 'low';
  }

  /**
   * Get recommended action
   * @private
   */
  getRecommendedAction(riskLevel, daysSinceLastService) {
    if (riskLevel === 'critical') {
      return `Immediate win-back campaign. Customer hasn't been in for ${daysSinceLastService} days.`;
    }
    if (riskLevel === 'high') {
      return 'Proactive retention campaign with personalized offer';
    }
    if (riskLevel === 'medium') {
      return 'Schedule follow-up call to check in';
    }
    return 'Monitor and maintain engagement';
  }

  /**
   * Get suggested offer
   * @private
   */
  getSuggestedOffer(riskLevel) {
    const offers = {
      'critical': '30% off next service',
      'high': '20% off next service',
      'medium': '10% off next service',
      'low': null
    };
    return offers[riskLevel] || null;
  }

  /**
   * Get priority
   * @private
   */
  getPriority(riskLevel, riskScore) {
    if (riskLevel === 'critical') return 'urgent';
    if (riskLevel === 'high') return 'high';
    if (riskLevel === 'medium') return 'medium';
    return 'low';
  }

  /**
   * Store risk score
   * @private
   */
  async storeRiskScore(customerId, riskData) {
    const { error } = await supabase
      .from('churn_risk_scores')
      .upsert({
        customer_id: customerId,
        shop_id: this.shopId,
        churn_risk_score: riskData.churn_risk_score,
        risk_level: riskData.risk_level,
        risk_factors: riskData.risk_factors,
        recommended_action: riskData.recommended_action,
        suggested_offer: riskData.suggested_offer,
        priority: riskData.priority
      }, {
        onConflict: 'customer_id,shop_id'
      });

    if (error) {
      console.error('Failed to store churn risk score:', error);
    }
  }

  /**
   * Get high-risk customers
   * @param {number} limit - Maximum number to return
   * @returns {Promise<Array>} High-risk customers
   */
  async getHighRiskCustomers(limit = 50) {
    try {
      const { data, error } = await supabase.rpc('get_high_risk_customers', {
        p_shop_id: this.shopId,
        p_limit: limit
      });

      if (error) {
        throw new Error(`Failed to get high-risk customers: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('getHighRiskCustomers error:', error);
      throw error;
    }
  }
}

export default ChurnRiskAnalyzer;



















