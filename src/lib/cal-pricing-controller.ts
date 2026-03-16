/**
 * CAL Agent: Dynamic Pricing with PID Control
 * 
 * Adjusts pricing based on:
 * - Current demand vs optimal (Proportional)
 * - Historical pricing errors (Integral)
 * - Market trend changes (Derivative)
 * 
 * Uses PID (Proportional-Integral-Derivative) control theory for
 * optimal price adjustment that responds to current, past, and future trends.
 */

import { pidControl, PIDState, PIDController } from './control-theory.js';

/**
 * Pricing context for dynamic price calculation
 */
export interface PricingContext {
  serviceType: string;
  basePrice: number;
  currentDemand: number;        // 0.0 - 2.0 (1.0 = optimal)
  optimalDemand: number;        // Target = 1.0
  competitorPrices: number[];
  historicalConversions: number[];
  historicalDemand: number[];   // Past demand values for trend analysis
}

/**
 * Dynamic pricing recommendation
 */
export interface DynamicPricing {
  recommendedPrice: number;
  adjustment: number;
  adjustmentPercent: number;
  reasoning: {
    proportional: string;
    integral: string;
    derivative: string;
  };
  confidence: number;            // 0.0 - 1.0
  safetyBounds: {
    minPrice: number;
    maxPrice: number;
    isWithinBounds: boolean;
  };
}

/**
 * CAL Pricing Controller Class
 * 
 * Manages dynamic pricing using PID control theory
 */
export class CALPricingController {
  private pidStates: Map<string, PIDState> = new Map();
  private pricingHistory: Map<string, Array<{ price: number; demand: number; timestamp: Date }>> = new Map();
  
  /**
   * Calculate optimal price using PID control
   * 
   * Goal: Demand = 1.0 (optimal)
   * If demand > 1.0: Prices too low, increase price
   * If demand < 1.0: Prices too high, decrease price
   */
  calculateDynamicPrice(context: PricingContext): DynamicPricing {
    const { basePrice, currentDemand, optimalDemand, serviceType } = context;
    
    // Goal: Demand = 1.0 (optimal)
    // Error: Difference between current and optimal demand
    const demandError = optimalDemand - currentDemand;
    
    // Get or create PID state for this service type
    let pidState = this.pidStates.get(serviceType);
    if (!pidState) {
      pidState = {
        errorHistory: [],
        lastError: 0,
        dt: 1.0
      };
      this.pidStates.set(serviceType, pidState);
    }
    
    // Update error history
    pidState.errorHistory.push(demandError);
    if (pidState.errorHistory.length > 10) {
      pidState.errorHistory.shift();
    }
    
    // PID control on demand
    // Kp = 0.15 (15% price change per 0.1 demand deviation)
    // Ki = 0.05 (slow accumulation of persistent errors)
    // Kd = 0.25 (rapid response to demand trend changes)
    const pidResult = pidControl(
      optimalDemand,
      currentDemand,
      0.15,  // Kp: Respond to current demand gap
      0.05,  // Ki: Respond to persistent under/over-pricing
      0.25,  // Kd: Respond to demand trend
      pidState
    );
    
    // Convert demand correction to price adjustment
    // Inverse relationship: demand ↑ → price ↓ (decrease price to increase demand)
    //                      demand ↓ → price ↑ (increase price when demand too high)
    // However, we want: demand < 1.0 (low) → decrease price to stimulate
    //                   demand > 1.0 (high) → increase price (demand can handle higher price)
    
    // If demand is low (currentDemand < optimalDemand), error is positive
    // We want to decrease price to increase demand, so correction should be negative
    // If demand is high (currentDemand > optimalDemand), error is negative
    // We want to increase price, so correction should be positive
    const priceAdjustment = -pidResult.totalCorrection * basePrice * 0.5; // Scale factor
    
    const recommendedPrice = basePrice + priceAdjustment;
    
    // Safety bounds: ±30% of base price (prevent extreme pricing)
    const minPrice = basePrice * 0.7;
    const maxPrice = basePrice * 1.3;
    const clampedPrice = Math.max(minPrice, Math.min(maxPrice, recommendedPrice));
    const isWithinBounds = clampedPrice === recommendedPrice;
    
    const finalAdjustment = clampedPrice - basePrice;
    const adjustmentPercent = (finalAdjustment / basePrice) * 100;
    
    // Reasoning breakdown
    const reasoning = {
      proportional: this.generateProportionalReason(pidResult.proportional, currentDemand, optimalDemand),
      integral: this.generateIntegralReason(pidResult.integral, pidState.errorHistory),
      derivative: this.generateDerivativeReason(pidResult.derivative, pidState.lastError, demandError)
    };
    
    // Confidence based on data quality
    const confidence = this.calculateConfidence(context);
    
    // Store pricing history
    if (!this.pricingHistory.has(serviceType)) {
      this.pricingHistory.set(serviceType, []);
    }
    const history = this.pricingHistory.get(serviceType)!;
    history.push({
      price: clampedPrice,
      demand: currentDemand,
      timestamp: new Date()
    });
    if (history.length > 100) {
      history.shift();
    }
    
    return {
      recommendedPrice: clampedPrice,
      adjustment: finalAdjustment,
      adjustmentPercent,
      reasoning,
      confidence,
      safetyBounds: {
        minPrice,
        maxPrice,
        isWithinBounds
      }
    };
  }
  
  /**
   * Generate human-readable proportional reasoning
   */
  private generateProportionalReason(
    proportional: number,
    currentDemand: number,
    optimalDemand: number
  ): string {
    const demandDiff = ((currentDemand - optimalDemand) / optimalDemand * 100).toFixed(1);
    const pressure = (proportional * 100).toFixed(1);
    
    if (currentDemand > optimalDemand) {
      return `Demand is ${demandDiff}% above optimal. Proportional pressure: ${pressure}% to increase price.`;
    } else if (currentDemand < optimalDemand) {
      return `Demand is ${Math.abs(parseFloat(demandDiff))}% below optimal. Proportional pressure: ${pressure}% to decrease price.`;
    } else {
      return `Demand at optimal level. Proportional component: neutral.`;
    }
  }
  
  /**
   * Generate human-readable integral reasoning
   */
  private generateIntegralReason(
    integral: number,
    errorHistory: number[]
  ): string {
    const persistentError = errorHistory.length > 0
      ? errorHistory.reduce((sum, err) => sum + err, 0) / errorHistory.length
      : 0;
    
    const adjustment = (integral * 100).toFixed(1);
    
    if (Math.abs(persistentError) < 0.05) {
      return `No persistent pricing errors. Integral component: minimal adjustment (${adjustment}%).`;
    } else if (persistentError > 0) {
      return `Persistent under-pricing detected. Integral component: ${adjustment}% accumulated adjustment to increase price.`;
    } else {
      return `Persistent over-pricing detected. Integral component: ${adjustment}% accumulated adjustment to decrease price.`;
    }
  }
  
  /**
   * Generate human-readable derivative reasoning
   */
  private generateDerivativeReason(
    derivative: number,
    lastError: number,
    currentError: number
  ): string {
    const trend = currentError - lastError;
    const adjustment = (derivative * 100).toFixed(1);
    
    if (Math.abs(trend) < 0.01) {
      return `Demand trend stable. Derivative component: minimal (${adjustment}%).`;
    } else if (trend > 0) {
      return `Demand trend improving (gap closing). Derivative component: ${adjustment}% to moderate adjustment.`;
    } else {
      return `Demand trend worsening (gap widening). Derivative component: ${adjustment}% to accelerate adjustment.`;
    }
  }
  
  /**
   * Calculate confidence based on data quality
   */
  private calculateConfidence(context: PricingContext): number {
    // More historical data = higher confidence
    const dataPoints = context.historicalConversions.length;
    const dataConfidence = Math.min(dataPoints / 20, 1.0);
    
    // More competitor data = higher confidence
    const competitorConfidence = Math.min(context.competitorPrices.length / 5, 1.0);
    
    // More demand history = higher confidence
    const demandHistoryConfidence = Math.min(context.historicalDemand.length / 10, 1.0);
    
    // Average confidence (weighted)
    const confidence = (dataConfidence * 0.4 + competitorConfidence * 0.3 + demandHistoryConfidence * 0.3);
    
    return Math.max(0.5, Math.min(0.95, confidence)); // Clamp to 0.5-0.95
  }
  
  /**
   * Get pricing history for a service type
   */
  getPricingHistory(serviceType: string, limit: number = 50): Array<{ price: number; demand: number; timestamp: Date }> {
    const history = this.pricingHistory.get(serviceType) || [];
    return history.slice(-limit).reverse();
  }
  
  /**
   * Reset controller (when changing service types or resetting state)
   */
  reset(serviceType?: string): void {
    if (serviceType) {
      this.pidStates.delete(serviceType);
      this.pricingHistory.delete(serviceType);
    } else {
      this.pidStates.clear();
      this.pricingHistory.clear();
    }
  }
  
  /**
   * Get PID state for a service type (for debugging/monitoring)
   */
  getPIDState(serviceType: string): PIDState | undefined {
    return this.pidStates.get(serviceType);
  }
}

/**
 * Singleton instance for global use
 */
export const calPricingController = new CALPricingController();

// Example usage:
// const pricing = calPricingController.calculateDynamicPrice({
//   serviceType: 'brake_job',
//   basePrice: 487,
//   currentDemand: 0.75,  // Demand is low
//   optimalDemand: 1.0,   // Want more demand
//   competitorPrices: [450, 525, 480],
//   historicalConversions: [0.65, 0.68, 0.72, 0.75],
//   historicalDemand: [0.60, 0.65, 0.70, 0.75]
// });
// 
// Result: Recommended price = $450 (7.6% decrease to stimulate demand)
// Reasoning: 
//   - Proportional: Demand 25% below optimal, apply proportional pressure
//   - Integral: Persistent under-demand, accumulated adjustment
//   - Derivative: Demand trend improving (rising), moderate adjustment



