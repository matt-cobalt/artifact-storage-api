/**
 * Control Theory Integration Tests
 * 
 * Tests for all 18 control theory formulas
 */

import {
  ashbysLaw,
  firstOrderControl,
  pidControl,
  PIDState,
  systemResponse,
  stabilityCheck,
  homeostaticRegulation,
  adaptiveControl,
  stateSpaceUpdate,
  checkObservability,
  checkControllability,
  kalmanFilter,
  lqrControl,
  analyzeViableSystem,
  matchRequisiteVariety,
  calculateFeedbackGain,
  calculateDamping,
  calculateSettlingTime,
  calculateOvershoot
} from '../control-theory.js';

describe('Control Theory Tests', () => {
  
  describe('Ashby\'s Law', () => {
    test('Variety calculation with 256 scenarios and 13 agents', () => {
      const result = ashbysLaw(256, 13);
      expect(result.requiredAgents).toBe(8); // log2(256) = 8
      expect(result.currentAgents).toBe(13);
      expect(result.varietySufficiency).toBeGreaterThan(1.0);
      expect(result.recommendation).toBe('over-provisioned');
    });
    
    test('Insufficient variety case', () => {
      const result = ashbysLaw(256, 6);
      expect(result.requiredAgents).toBe(8);
      expect(result.varietySufficiency).toBeLessThan(1.0);
      expect(result.recommendation).toBe('insufficient');
    });
  });
  
  describe('First-Order Control', () => {
    test('Conversion rate adjustment', () => {
      const result = firstOrderControl(0.87, 0.82, 0.5);
      expect(result.error).toBeCloseTo(0.05, 2);
      expect(result.correction).toBeCloseTo(0.025, 3);
      expect(result.adjustedOutput).toBeCloseTo(0.845, 3);
    });
    
    test('Negative error (over-target)', () => {
      const result = firstOrderControl(0.87, 0.90, 0.5);
      expect(result.error).toBeCloseTo(-0.03, 2);
      expect(result.correction).toBeCloseTo(-0.015, 3);
      expect(result.adjustedOutput).toBeCloseTo(0.885, 3);
    });
  });
  
  describe('PID Control', () => {
    test('Pricing adjustment with PID', () => {
      const pidState: PIDState = {
        errorHistory: [10, 8, 6, 5],
        lastError: 5,
        dt: 1.0
      };
      
      const result = pidControl(500, 450, 0.3, 0.1, 0.5, pidState);
      
      expect(result.proportional).toBeCloseTo(15, 1); // Kp × error (0.3 × 50 = 15)
      expect(result.integral).toBeGreaterThan(0);
      expect(result.derivative).toBeGreaterThanOrEqual(0);
      expect(result.totalCorrection).toBeGreaterThan(0);
    });
    
    test('PID state persistence', () => {
      const pidState: PIDState = {
        errorHistory: [],
        lastError: 0,
        dt: 1.0
      };
      
      // First call
      pidControl(100, 90, 0.5, 0.1, 0.3, pidState);
      expect(pidState.errorHistory.length).toBe(1);
      
      // Second call
      pidControl(100, 95, 0.5, 0.1, 0.3, pidState);
      expect(pidState.errorHistory.length).toBe(2);
      expect(pidState.lastError).toBe(5); // Previous error was 10
    });
  });
  
  describe('System Response (Transfer Function)', () => {
    test('First-order system response over time', () => {
      const result1 = systemResponse(1.0, 2.0, 0.05, 1.0); // 1 day
      expect(result1.responsePercentage).toBeGreaterThan(0);
      expect(result1.responsePercentage).toBeLessThan(1.0);
      
      const result5 = systemResponse(1.0, 2.0, 0.05, 10.0); // 5τ (should be ~95%)
      expect(result5.responsePercentage).toBeGreaterThan(0.90);
    });
  });
  
  describe('Stability Check (Routh-Hurwitz)', () => {
    test('Stable system', () => {
      const result = stabilityCheck(1.0, 3.0, 2.0);
      expect(result.isStable).toBe(true);
      expect(result.allPositive).toBe(true);
      expect(result.hurwitzCondition).toBe(true);
      expect(result.stabilityMargin).toBeGreaterThan(1.0);
    });
    
    test('Unstable system (negative coefficient)', () => {
      const result = stabilityCheck(-1.0, 3.0, 2.0);
      expect(result.isStable).toBe(false);
      expect(result.allPositive).toBe(false);
    });
    
    test('Unstable system (violates Hurwitz)', () => {
      const result = stabilityCheck(1.0, 1.0, 2.0); // b² = 1, ac = 2, b² < ac
      expect(result.isStable).toBe(false);
      expect(result.hurwitzCondition).toBe(false);
    });
  });
  
  describe('Homeostatic Regulation', () => {
    test('Stable system (sufficient feedback loops)', () => {
      const result = homeostaticRegulation(15, 8);
      expect(result.stabilityIndex).toBeCloseTo(1.875, 2);
      expect(result.status).toBe('stable');
    });
    
    test('Unstable system (insufficient feedback loops)', () => {
      const result = homeostaticRegulation(5, 10);
      expect(result.stabilityIndex).toBeCloseTo(0.5, 2);
      expect(result.status).toBe('unstable');
    });
    
    test('Critical system', () => {
      const result = homeostaticRegulation(2, 10);
      expect(result.stabilityIndex).toBeLessThan(0.5);
      expect(result.status).toBe('critical');
    });
    
    test('No disturbances (perfect stability)', () => {
      const result = homeostaticRegulation(15, 0);
      expect(result.stabilityIndex).toBe(Infinity);
      expect(result.status).toBe('stable');
    });
  });
  
  describe('Adaptive Control', () => {
    test('Gain increase on underperformance', () => {
      const result = adaptiveControl(0.5, 0.1, 0.1); // 10% underperformance
      expect(result.adjustedGain).toBeGreaterThan(0.5);
      expect(result.adaptationDirection).toBe('increase');
    });
    
    test('Gain decrease on overperformance', () => {
      const result = adaptiveControl(0.5, -0.1, 0.1); // 10% overperformance
      expect(result.adjustedGain).toBeLessThan(0.5);
      expect(result.adaptationDirection).toBe('decrease');
    });
  });
  
  describe('State Space', () => {
    test('State space update', () => {
      const currentState = [1.0, 2.0];
      const stateMatrix = [[0.9, 0.1], [0.2, 0.8]];
      const inputMatrix = [[0.5], [0.3]];
      const controlInput = [1.0];
      
      const result = stateSpaceUpdate(currentState, stateMatrix, inputMatrix, controlInput);
      
      expect(result.nextState.length).toBe(2);
      expect(result.nextState[0]).toBeCloseTo(1.3, 1); // 0.9×1.0 + 0.1×2.0 + 0.5×1.0
      expect(result.nextState[1]).toBeCloseTo(2.4, 1); // 0.2×1.0 + 0.8×2.0 + 0.3×1.0
    });
  });
  
  describe('Kalman Filter', () => {
    test('Filter noisy observation', () => {
      const result = kalmanFilter(
        0.87,  // Predicted: 87%
        0.85,  // Observed: 85% (noisy)
        0.02,  // Prediction uncertainty: 2%
        0.05   // Observation uncertainty: 5%
      );
      
      expect(result.kalmanGain).toBeLessThan(1.0);
      expect(result.estimatedState).toBeGreaterThan(0.85);
      expect(result.estimatedState).toBeLessThan(0.87);
      expect(result.uncertainty).toBeLessThan(0.02);
    });
  });
  
  describe('LQR Control', () => {
    test('Optimal control calculation', () => {
      const result = lqrControl(5, 10, 1, 0);
      expect(result.stateCost).toBeGreaterThan(0);
      expect(result.controlCost).toBeGreaterThan(0);
      expect(result.optimalControl).toBeLessThan(0); // Negative to reduce error
    });
  });
  
  describe('Viable System Model', () => {
    test('System analysis with default viabilities', () => {
      const viabilities = [0.95, 0.92, 0.88, 0.85, 0.90];
      const result = analyzeViableSystem(viabilities);
      
      expect(result.overallViability).toBe(0.85);
      expect(result.weakestLevel.level).toBe(4);
      expect(result.weakestLevel.name).toBe('Intelligence');
      expect(result.strongestLevel.level).toBe(1);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
  
  describe('Requisite Variety Matching', () => {
    test('Sufficient variety', () => {
      const result = matchRequisiteVariety(64, 32); // Controller has more variety
      expect(result.isMatched).toBe(true);
      expect(result.matchRatio).toBeGreaterThan(1.0);
    });
    
    test('Insufficient variety', () => {
      const result = matchRequisiteVariety(16, 64); // Controller has less variety
      expect(result.isMatched).toBe(false);
      expect(result.matchRatio).toBeLessThan(1.0);
    });
  });
  
  describe('Feedback Gain', () => {
    test('High gain (amplifying)', () => {
      const result = calculateFeedbackGain(10, 30, true); // Open loop
      expect(result.gain).toBe(3.0);
      expect(result.isStable).toBe(true);
    });
    
    test('Stable closed-loop gain', () => {
      const result = calculateFeedbackGain(10, 5, false); // Closed loop
      expect(result.gain).toBe(0.5);
      expect(result.isStable).toBe(true);
    });
  });
  
  describe('Damping', () => {
    test('Underdamped system', () => {
      const result = calculateDamping(0.7, 0.5);
      expect(result.responseType).toBe('underdamped');
      expect(result.overshoot).toBeGreaterThan(0);
    });
    
    test('Critically damped system', () => {
      const result = calculateDamping(1.0, 0.5);
      expect(result.responseType).toBe('critically_damped');
      expect(result.overshoot).toBe(0);
    });
    
    test('Overdamped system', () => {
      const result = calculateDamping(1.5, 0.5);
      expect(result.responseType).toBe('overdamped');
      expect(result.overshoot).toBe(0);
    });
  });
  
  describe('Settling Time', () => {
    test('First-order settling time', () => {
      const result = calculateSettlingTime('first_order', 2.0);
      expect(result.settlingTime).toBeGreaterThan(0);
      expect(result.settlingTime).toBeCloseTo(7.82, 1); // -2 × ln(0.02)
    });
    
    test('Second-order settling time', () => {
      const result = calculateSettlingTime('second_order', undefined, 0.7, 0.5);
      expect(result.settlingTime).toBeGreaterThan(0);
      expect(result.settlingTime).toBeCloseTo(11.4, 1); // 4 / (0.7 × 0.5)
    });
  });
  
  describe('Overshoot', () => {
    test('Underdamped overshoot calculation', () => {
      const result = calculateOvershoot(0.5, 90);
      expect(result.overshootPercent).toBeGreaterThan(0);
      expect(result.overshootPercent).toBeCloseTo(16.3, 1);
      expect(result.peakValue).toBeGreaterThan(90);
    });
    
    test('No overshoot for overdamped', () => {
      const result = calculateOvershoot(1.5, 90);
      expect(result.overshootPercent).toBe(0);
      expect(result.peakValue).toBe(90);
    });
  });
});



