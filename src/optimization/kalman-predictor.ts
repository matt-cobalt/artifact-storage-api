/**
 * Kalman Filter State Predictor
 * 
 * Predicts system load and pre-allocates resources proactively.
 * 
 * Uses Kalman Filter to:
 * - Estimate current system state (load, latency, throughput)
 * - Predict future state (next hour, next day)
 * - Pre-allocate resources before demand arrives
 * - Reduce response time spikes
 */

import { kalmanFilter, KalmanFilter } from '../lib/control-theory.js';

/**
 * System state (what we're predicting)
 */
export interface SystemState {
  load: number;                  // Requests per second
  avgLatency: number;            // ms
  throughput: number;            // Requests per second (processed)
  errorRate: number;             // 0.0-1.0
}

/**
 * State prediction
 */
export interface StatePrediction {
  timestamp: Date;
  predictedState: SystemState;
  confidence: number;            // 0.0-1.0
  uncertainty: SystemState;      // Uncertainty in each metric
}

/**
 * Measurement (observed values)
 */
export interface Measurement {
  timestamp: Date;
  load: number;
  avgLatency: number;
  throughput: number;
  errorRate: number;
}

/**
 * Kalman Filter State Predictor
 */
export class KalmanStatePredictor {
  // Current state estimate
  private currentState: SystemState = {
    load: 0,
    avgLatency: 0,
    throughput: 0,
    errorRate: 0
  };
  
  // State uncertainty (how confident we are in current state)
  private stateUncertainty: SystemState = {
    load: 100,      // High initial uncertainty
    avgLatency: 200,
    throughput: 100,
    errorRate: 0.1
  };
  
  // Measurement uncertainty (how noisy are measurements)
  private measurementUncertainty: SystemState = {
    load: 10,
    avgLatency: 50,
    throughput: 10,
    errorRate: 0.01
  };
  
  // Process uncertainty (how much state changes per update)
  private processUncertainty: SystemState = {
    load: 5,
    avgLatency: 20,
    throughput: 5,
    errorRate: 0.005
  };
  
  // Measurement history (for trend analysis)
  private measurementHistory: Measurement[] = [];
  private maxHistorySize: number = 100;
  
  /**
   * Update filter with new measurement
   */
  update(measurement: Measurement): SystemState {
    // Update each metric using Kalman Filter
    const metrics: (keyof SystemState)[] = ['load', 'avgLatency', 'throughput', 'errorRate'];
    
    for (const metric of metrics) {
      const predictedValue = this.currentState[metric];
      const observedValue = measurement[metric];
      const predictionUncertainty = this.stateUncertainty[metric] + this.processUncertainty[metric];
      const observationUncertainty = this.measurementUncertainty[metric];
      
      const result = kalmanFilter(
        predictedValue,
        observedValue,
        predictionUncertainty,
        observationUncertainty
      );
      
      // Update state and uncertainty
      this.currentState[metric] = result.estimatedState;
      this.stateUncertainty[metric] = result.uncertainty;
    }
    
    // Store measurement in history
    this.measurementHistory.push(measurement);
    if (this.measurementHistory.length > this.maxHistorySize) {
      this.measurementHistory.shift();
    }
    
    return { ...this.currentState };
  }
  
  /**
   * Predict future state
   */
  predict(hoursAhead: number): StatePrediction {
    // Simple prediction: use historical trend + time-of-day patterns
    // In production: use more sophisticated time series prediction
    
    const timeOfDay = new Date().getHours();
    const targetTime = (timeOfDay + hoursAhead) % 24;
    
    // Time-of-day multipliers (based on typical patterns)
    let loadMultiplier = 1.0;
    let latencyMultiplier = 1.0;
    
    // Peak hours: 9-11 AM, 2-4 PM
    if ((targetTime >= 9 && targetTime <= 11) || (targetTime >= 14 && targetTime <= 16)) {
      loadMultiplier = 1.5;
      latencyMultiplier = 1.2;  // Higher load = higher latency
    }
    // After hours: 6 PM - 8 AM
    else if (targetTime >= 18 || targetTime <= 8) {
      loadMultiplier = 0.3;
      latencyMultiplier = 0.8;  // Lower load = lower latency
    }
    
    // Calculate trend from recent history
    const recentMeasurements = this.measurementHistory.slice(-10);
    let loadTrend = 0;
    let latencyTrend = 0;
    
    if (recentMeasurements.length >= 2) {
      const first = recentMeasurements[0];
      const last = recentMeasurements[recentMeasurements.length - 1];
      const timeDiff = (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 60 * 60);  // hours
      
      if (timeDiff > 0) {
        loadTrend = (last.load - first.load) / timeDiff;  // per hour
        latencyTrend = (last.avgLatency - first.avgLatency) / timeDiff;
      }
    }
    
    // Predict state
    const predictedState: SystemState = {
      load: (this.currentState.load + loadTrend * hoursAhead) * loadMultiplier,
      avgLatency: (this.currentState.avgLatency + latencyTrend * hoursAhead) * latencyMultiplier,
      throughput: (this.currentState.throughput + loadTrend * hoursAhead) * loadMultiplier,  // Throughput follows load
      errorRate: this.currentState.errorRate  // Error rate doesn't trend (assume constant)
    };
    
    // Calculate prediction uncertainty (increases with prediction horizon)
    const uncertainty: SystemState = {
      load: this.stateUncertainty.load * (1 + hoursAhead * 0.1),
      avgLatency: this.stateUncertainty.avgLatency * (1 + hoursAhead * 0.1),
      throughput: this.stateUncertainty.throughput * (1 + hoursAhead * 0.1),
      errorRate: this.stateUncertainty.errorRate * (1 + hoursAhead * 0.1)
    };
    
    // Calculate confidence (inversely related to uncertainty)
    const avgUncertainty = (uncertainty.load + uncertainty.avgLatency + uncertainty.throughput) / 3;
    const confidence = Math.max(0, Math.min(1, 1 - (avgUncertainty / 1000)));  // Normalize to 0-1
    
    return {
      timestamp: new Date(Date.now() + hoursAhead * 60 * 60 * 1000),
      predictedState,
      confidence,
      uncertainty
    };
  }
  
  /**
   * Get current state estimate
   */
  getCurrentState(): SystemState {
    return { ...this.currentState };
  }
  
  /**
   * Get state uncertainty
   */
  getUncertainty(): SystemState {
    return { ...this.stateUncertainty };
  }
  
  /**
   * Reset filter (start fresh)
   */
  reset(): void {
    this.currentState = {
      load: 0,
      avgLatency: 0,
      throughput: 0,
      errorRate: 0
    };
    this.stateUncertainty = {
      load: 100,
      avgLatency: 200,
      throughput: 100,
      errorRate: 0.1
    };
    this.measurementHistory = [];
    console.log('[KalmanPredictor] Reset');
  }
  
  /**
   * Get measurement history
   */
  getHistory(limit?: number): Measurement[] {
    if (limit) {
      return this.measurementHistory.slice(-limit);
    }
    return [...this.measurementHistory];
  }
}

/**
 * Singleton instance for global use
 */
export const kalmanPredictor = new KalmanStatePredictor();

/**
 * Integration: Pre-allocate resources based on prediction
 */
export async function preallocateResources(prediction: StatePrediction): Promise<void> {
  // Pre-warm agent pools
  const optimalAgents = Math.ceil(prediction.predictedState.load / 10);  // Assume 10 req/s per agent
  
  console.log(`[KalmanPredictor] Pre-allocating ${optimalAgents} agents for predicted load of ${prediction.predictedState.load.toFixed(1)} req/s`);
  
  // TODO: Actually pre-allocate agents (warm up pools, reserve resources)
  // await agentPool.preallocate(optimalAgents);
  
  // TODO: Adjust system parameters based on predicted latency
  // if (prediction.predictedState.avgLatency > 500) {
  //   // Pre-optimize (reduce temperature, increase parallelism)
  //   await pidResponseController.setTarget(400);  // More aggressive target
  // }
}

/**
 * Periodic prediction and pre-allocation (every 15 minutes)
 */
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    // Predict next hour
    const prediction = kalmanPredictor.predict(1);
    
    // Pre-allocate if confidence is high
    if (prediction.confidence > 0.7) {
      preallocateResources(prediction).catch(error => {
        console.error('[KalmanPredictor] Pre-allocation error:', error);
      });
    }
  }, 15 * 60 * 1000);  // Every 15 minutes
}

/**
 * Example usage:
 * 
 * // Update with measurement
 * kalmanPredictor.update({
 *   timestamp: new Date(),
 *   load: 5.2,
 *   avgLatency: 450,
 *   throughput: 5.0,
 *   errorRate: 0.01
 * });
 * 
 * // Predict next hour
 * const prediction = kalmanPredictor.predict(1);
 * console.log(`Predicted load: ${prediction.predictedState.load.toFixed(1)} req/s`);
 * console.log(`Confidence: ${(prediction.confidence * 100).toFixed(0)}%`);
 */



