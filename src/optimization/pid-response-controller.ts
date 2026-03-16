/**
 * PID Response Time Controller
 * 
 * Uses PID control to dynamically adjust system parameters to maintain target response times.
 * 
 * Adjusts:
 * - LLM temperature (lower = faster but less creative)
 * - max_tokens limits (trim verbosity)
 * - Concurrent agent calls (parallel vs sequential)
 * - Cache hit thresholds
 * 
 * Goal: Maintain <500ms response time while preserving quality
 * 
 * Control Law: u(t) = Kp×e(t) + Ki×∫e(t)dt + Kd×(de/dt)
 */

import { pidControl, PIDState } from '../lib/control-theory.js';

export interface SystemParameters {
  temperature: number;              // LLM temperature (0.0-1.0)
  maxTokens: number;                // Token limit (100-2000)
  parallelismLevel: number;         // Concurrent agents (1-10)
  cacheThreshold: number;           // Cache similarity threshold (0.0-1.0)
}

export interface ResponseTimeMetrics {
  currentResponseTime: number;      // ms
  targetResponseTime: number;       // ms (500ms target)
  error: number;                    // target - current
  parameters: SystemParameters;
  pidComponents: {
    proportional: number;
    integral: number;
    derivative: number;
  };
}

export class PIDResponseController {
  // PID gains (tuned for response time optimization)
  private Kp: number = 0.001;       // Proportional gain
  private Ki: number = 0.0005;      // Integral gain
  private Kd: number = 0.002;       // Derivative gain
  
  // PID state
  private pidState: PIDState = {
    errorHistory: [],
    lastError: 0,
    dt: 1.0  // 1 second sampling
  };
  
  // Current system parameters
  private parameters: SystemParameters = {
    temperature: 0.7,
    maxTokens: 1000,
    parallelismLevel: 5,
    cacheThreshold: 0.85
  };
  
  // Target response time
  private targetResponseTime: number = 500;  // ms
  private lastMeasurement: number = 0;
  
  /**
   * Update controller with new measurement
   */
  update(currentResponseTime: number): SystemParameters {
    // Calculate error (positive = too slow, negative = too fast)
    const error = this.targetResponseTime - currentResponseTime;
    
    // Use PID control
    const pidResult = pidControl(
      this.targetResponseTime,
      currentResponseTime,
      this.Kp,
      this.Ki,
      this.Kd,
      this.pidState
    );
    
    // Apply control signal to parameters
    this.adjustParameters(pidResult.totalCorrection, error);
    
    // Update state
    this.pidState.lastError = error;
    this.lastMeasurement = currentResponseTime;
    
    // Log metrics (debug level)
    if (process.env.NODE_ENV === 'development') {
      console.debug(`PID Controller: Error=${error.toFixed(0)}ms, P=${pidResult.proportional.toFixed(3)}, I=${pidResult.integral.toFixed(3)}, D=${pidResult.derivative.toFixed(3)}, Control=${pidResult.totalCorrection.toFixed(3)}`);
    }
    
    return { ...this.parameters };
  }
  
  /**
   * Adjust system parameters based on control signal
   */
  private adjustParameters(controlSignal: number, error: number): void {
    
    // If too slow (positive error), make faster
    if (error > 0) {
      // Reduce temperature (faster but less creative)
      this.parameters.temperature = Math.max(0.3, this.parameters.temperature - controlSignal * 0.1);
      
      // Reduce max tokens (less verbose)
      this.parameters.maxTokens = Math.max(200, Math.round(this.parameters.maxTokens - controlSignal * 50));
      
      // Increase parallelism (more concurrent)
      this.parameters.parallelismLevel = Math.min(10, Math.round(this.parameters.parallelismLevel + controlSignal * 0.5));
      
      // Lower cache threshold (more cache hits)
      this.parameters.cacheThreshold = Math.max(0.75, this.parameters.cacheThreshold - controlSignal * 0.02);
    }
    // If too fast (negative error), we can afford more quality
    else {
      // Increase temperature (more creative)
      this.parameters.temperature = Math.min(0.9, this.parameters.temperature + Math.abs(controlSignal) * 0.05);
      
      // Increase max tokens (more detailed)
      this.parameters.maxTokens = Math.min(1500, Math.round(this.parameters.maxTokens + Math.abs(controlSignal) * 30));
      
      // Maintain parallelism (already fast enough)
      // Don't change
      
      // Raise cache threshold (more precision)
      this.parameters.cacheThreshold = Math.min(0.95, this.parameters.cacheThreshold + Math.abs(controlSignal) * 0.01);
    }
  }
  
  /**
   * Get current parameters
   */
  getParameters(): SystemParameters {
    return { ...this.parameters };
  }
  
  /**
   * Set target response time
   */
  setTarget(targetMs: number): void {
    this.targetResponseTime = targetMs;
    console.log(`[PID Controller] Target set to ${targetMs}ms`);
  }
  
  /**
   * Reset controller state
   */
  reset(): void {
    this.pidState = {
      errorHistory: [],
      lastError: 0,
      dt: 1.0
    };
    this.lastMeasurement = 0;
    console.log('[PID Controller] Reset');
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): ResponseTimeMetrics {
    const error = this.targetResponseTime - this.lastMeasurement;
    
    // Calculate PID components (simplified - would use actual PID calculation)
    const proportional = this.Kp * error;
    const errorSum = this.pidState.errorHistory.reduce((a, b) => a + b, 0);
    const integral = this.Ki * errorSum * this.pidState.dt;
    const errorRate = this.pidState.errorHistory.length > 1 
      ? (this.pidState.errorHistory[this.pidState.errorHistory.length - 1] - 
         this.pidState.errorHistory[this.pidState.errorHistory.length - 2]) / this.pidState.dt
      : 0;
    const derivative = this.Kd * errorRate;
    
    return {
      currentResponseTime: this.lastMeasurement,
      targetResponseTime: this.targetResponseTime,
      error,
      parameters: { ...this.parameters },
      pidComponents: {
        proportional,
        integral,
        derivative
      }
    };
  }
}

/**
 * Singleton instance for global use
 */
export const pidResponseController = new PIDResponseController();

/**
 * Integration helper: Handle request with PID-optimized parameters
 */
export async function handleRequestWithPID<T>(
  requestFn: (params: SystemParameters) => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  // Get current optimized parameters
  const params = pidResponseController.getParameters();
  
  // Execute request with optimized parameters
  const response = await requestFn(params);
  
  const responseTime = Date.now() - startTime;
  
  // Update PID controller with measured response time
  pidResponseController.update(responseTime);
  
  return response;
}

/**
 * Example usage:
 * 
 * const response = await handleRequestWithPID(async (params) => {
 *   return await callLLM({
 *     messages: messages,
 *     temperature: params.temperature,
 *     max_tokens: params.maxTokens,
 *     // ... other params
 *   });
 * });
 */



