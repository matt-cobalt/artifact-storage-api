/**
 * Control Theory & Cybernetics Formula Library
 * 
 * Mathematical foundation for self-regulating agent systems.
 * Based on 50-70 years of proven engineering control theory.
 * 
 * Application: Autonomous agent optimization and system stability.
 */

// ============================================================================
// FORMULA 1: ASHBY'S LAW OF REQUISITE VARIETY
// ============================================================================

/**
 * Ashby's Law: To control a system, the controller must have 
 * at least as much variety as the system being controlled.
 * 
 * Regulatory_Capacity = log₂(System_Disturbances)
 * 
 * Application: Determine minimum number of agent types needed
 * to handle variety of customer scenarios
 */
export interface VarietyAnalysis {
  systemDisturbances: number;      // Number of distinct scenarios
  requiredAgents: number;           // log₂(disturbances)
  currentAgents: number;            // Actual agents deployed
  varietySufficiency: number;       // currentAgents / requiredAgents
  recommendation: 'sufficient' | 'insufficient' | 'over-provisioned';
}

export function ashbysLaw(
  uniqueScenarios: number,
  currentAgentTypes: number
): VarietyAnalysis {
  const requiredAgents = Math.log2(uniqueScenarios);
  const varietySufficiency = currentAgentTypes / requiredAgents;
  
  let recommendation: 'sufficient' | 'insufficient' | 'over-provisioned';
  if (varietySufficiency >= 1.0 && varietySufficiency < 1.5) {
    recommendation = 'sufficient';
  } else if (varietySufficiency < 1.0) {
    recommendation = 'insufficient';
  } else {
    recommendation = 'over-provisioned';
  }
  
  return {
    systemDisturbances: uniqueScenarios,
    requiredAgents: Math.ceil(requiredAgents),
    currentAgents: currentAgentTypes,
    varietySufficiency,
    recommendation
  };
}

// Example usage:
// If we see 256 unique customer scenarios
// Required agents = log₂(256) = 8
// Current agents = 13
// Variety sufficiency = 13/8 = 1.625 (over-provisioned, good)

// ============================================================================
// FORMULA 2: FIRST-ORDER FEEDBACK CONTROL
// ============================================================================

/**
 * Basic feedback control: Adjust output based on error
 * 
 * Output(t) = Goal - K × Error(t)
 * 
 * Application: Agent performance self-correction
 */
export interface FeedbackControl {
  goal: number;                    // Target metric value
  current: number;                 // Current metric value
  gainFactor: number;              // K (how aggressively to correct)
  error: number;                   // Goal - Current
  correction: number;              // K × Error
  adjustedOutput: number;          // New output value
}

export function firstOrderControl(
  goal: number,
  current: number,
  gainFactor: number = 0.5
): FeedbackControl {
  const error = goal - current;
  const correction = gainFactor * error;
  const adjustedOutput = current + correction;
  
  return {
    goal,
    current,
    gainFactor,
    error,
    correction,
    adjustedOutput
  };
}

// Example usage for OTTO conversion rate:
// Goal = 87% conversion
// Current = 82% conversion
// Gain = 0.5
// Error = 5%
// Correction = 0.5 × 5% = 2.5%
// Action: Increase qualifying question depth by 2.5%

// ============================================================================
// FORMULA 3: PID CONTROLLER (PROPORTIONAL-INTEGRAL-DERIVATIVE)
// ============================================================================

/**
 * Advanced control: Combines present error, past errors, and rate of change
 * 
 * Output = Kp×Error + Ki×∫Error dt + Kd×(dError/dt)
 * 
 * Application: Dynamic pricing adjustment (CAL agent)
 */
export interface PIDController {
  proportional: number;            // Kp × current error
  integral: number;                // Ki × accumulated error
  derivative: number;              // Kd × rate of change
  totalCorrection: number;         // Sum of all three
  adjustedValue: number;           // New output value
}

export interface PIDState {
  errorHistory: number[];          // Past errors for integral
  lastError: number;               // For derivative calculation
  dt: number;                      // Time step
}

export function pidControl(
  goal: number,
  current: number,
  Kp: number,      // Proportional gain (present)
  Ki: number,      // Integral gain (past)
  Kd: number,      // Derivative gain (future trend)
  state: PIDState
): PIDController {
  // Current error
  const error = goal - current;
  
  // Proportional term (respond to current error)
  const proportional = Kp * error;
  
  // Integral term (respond to accumulated past errors)
  state.errorHistory.push(error);
  if (state.errorHistory.length > 10) {
    state.errorHistory.shift(); // Keep last 10 only
  }
  const errorSum = state.errorHistory.reduce((a, b) => a + b, 0);
  const integral = Ki * errorSum * state.dt;
  
  // Derivative term (respond to rate of change)
  const errorRate = (error - state.lastError) / state.dt;
  const derivative = Kd * errorRate;
  state.lastError = error;
  
  const totalCorrection = proportional + integral + derivative;
  const adjustedValue = current + totalCorrection;
  
  return {
    proportional,
    integral,
    derivative,
    totalCorrection,
    adjustedValue
  };
}

// Example usage for CAL pricing:
// Goal price = $500 (market optimal)
// Current price = $450 (underpriced)
// Kp = 0.3 (respond to current gap)
// Ki = 0.1 (respond to persistent underpricing)
// Kd = 0.5 (respond to price trend)
// → Adjusts price dynamically based on all three factors

// ============================================================================
// FORMULA 4: TRANSFER FUNCTION (SYSTEM RESPONSE)
// ============================================================================

/**
 * System response to inputs over time
 * 
 * H(s) = Output(s) / Input(s)
 * 
 * First-order system: K × (1 - e^(-t/τ))
 * 
 * Application: Predict how long agent changes take to affect metrics
 */
export interface TransferFunction {
  timeConstant: number;            // τ (tau) - how fast system responds
  steadyStateGain: number;         // K - final output per unit input
  currentResponse: number;         // Response at time t
  timeToSteadyState: number;      // ~5τ (95% of final value)
  responsePercentage: number;     // Current response / steady state (0-1)
}

export function systemResponse(
  input: number,
  timeConstant: number,
  steadyStateGain: number,
  elapsedTime: number
): TransferFunction {
  // First-order system response: K × (1 - e^(-t/τ))
  const currentResponse = steadyStateGain * input * (1 - Math.exp(-elapsedTime / timeConstant));
  const timeToSteadyState = 5 * timeConstant;
  const responsePercentage = elapsedTime > 0 
    ? (1 - Math.exp(-elapsedTime / timeConstant))
    : 0;
  
  return {
    timeConstant,
    steadyStateGain,
    currentResponse,
    timeToSteadyState,
    responsePercentage
  };
}

// Example usage:
// Input: Improve OTTO prompt (change magnitude = 1.0)
// Time constant: 2 days (how fast effect shows)
// Steady state gain: 0.05 (5% improvement expected)
// After 1 day: Response = 0.05 × 1.0 × (1 - e^(-1/2)) = 0.0197 (~2%)
// After 10 days (5τ): Response = 0.05 × 1.0 × (1 - e^(-10/2)) = 0.0497 (~5%)

// ============================================================================
// FORMULA 5: STABILITY CRITERION (ROUTH-HURWITZ)
// ============================================================================

/**
 * Determine if system is stable (won't oscillate out of control)
 * 
 * For system: as² + bs + c = 0
 * Stable if: a, b, c > 0 and b² > ac
 * 
 * Application: Check if agent feedback loops are stable
 */
export interface StabilityAnalysis {
  coefficients: { a: number; b: number; c: number };
  allPositive: boolean;
  hurwitzCondition: boolean;
  isStable: boolean;
  stabilityMargin: number;         // How far from instability (0-∞, >1 is stable)
}

export function stabilityCheck(
  a: number,  // Second-order coefficient
  b: number,  // First-order coefficient
  c: number   // Constant term
): StabilityAnalysis {
  const allPositive = a > 0 && b > 0 && c > 0;
  const hurwitzCondition = b * b > a * c;
  const isStable = allPositive && hurwitzCondition;
  const stabilityMargin = hurwitzCondition ? (b * b) / (a * c) : 0;
  
  return {
    coefficients: { a, b, c },
    allPositive,
    hurwitzCondition,
    isStable,
    stabilityMargin
  };
}

// Example usage:
// Agent feedback loop: conversion_rate adjustment
// a = 1.0, b = 3.0, c = 2.0
// All positive: YES
// b² = 9, ac = 2, b² > ac: YES (9 > 2)
// System is STABLE with margin = 4.5

// ============================================================================
// FORMULA 6: HOMEOSTATIC REGULATION
// ============================================================================

/**
 * Maintain system equilibrium despite disturbances
 * 
 * Stability_Index = Σ(Feedback_Loops) / Σ(Disturbances)
 * 
 * Application: System stability score
 */
export interface HomeostaticState {
  feedbackLoops: number;           // Active regulation mechanisms
  disturbances: number;            // External disruptions
  stabilityIndex: number;          // Ratio
  status: 'stable' | 'unstable' | 'critical';
  recommendation: string;
}

export function homeostaticRegulation(
  activeFeedbackLoops: number,
  activeDisturbances: number
): HomeostaticState {
  if (activeDisturbances === 0) {
    return {
      feedbackLoops: activeFeedbackLoops,
      disturbances: 0,
      stabilityIndex: Infinity,
      status: 'stable',
      recommendation: 'No disturbances detected. System stable.'
    };
  }
  
  const stabilityIndex = activeFeedbackLoops / activeDisturbances;
  
  let status: 'stable' | 'unstable' | 'critical';
  let recommendation: string;
  
  if (stabilityIndex >= 1.5) {
    status = 'stable';
    recommendation = 'System well-regulated. Maintain current configuration.';
  } else if (stabilityIndex >= 1.0) {
    status = 'stable';
    recommendation = 'Monitor closely, near threshold. Consider adding feedback mechanisms.';
  } else if (stabilityIndex >= 0.5) {
    status = 'unstable';
    recommendation = 'Add feedback loops or reduce disturbances. System losing stability.';
  } else {
    status = 'critical';
    recommendation = 'IMMEDIATE ACTION: System losing control. Trigger recovery procedures.';
  }
  
  return {
    feedbackLoops: activeFeedbackLoops,
    disturbances: activeDisturbances,
    stabilityIndex,
    status,
    recommendation
  };
}

// Example usage:
// Active feedback loops: 15 (OTTO, CAL, REX monitoring)
// Active disturbances: 8 (competitor changes, market shifts, etc.)
// Stability index = 15/8 = 1.875 (STABLE)

// ============================================================================
// FORMULA 7: ADAPTIVE CONTROL
// ============================================================================

/**
 * Learn optimal control parameters over time
 * 
 * K_optimal = K_current × (1 + α × Performance_Error)
 * 
 * Application: Continuously optimize control gains
 */
export interface AdaptiveControl {
  currentGain: number;
  performanceError: number;        // 0 = perfect, >0 = underperformance
  learningRate: number;            // α (adaptation speed)
  adjustedGain: number;
  adaptationDirection: 'increase' | 'decrease' | 'maintain';
}

export function adaptiveControl(
  currentGain: number,
  performanceError: number,
  learningRate: number = 0.1
): AdaptiveControl {
  const adjustment = learningRate * performanceError;
  const adjustedGain = currentGain * (1 + adjustment);
  
  let adaptationDirection: 'increase' | 'decrease' | 'maintain';
  if (Math.abs(adjustment) < 0.001) {
    adaptationDirection = 'maintain';
  } else if (adjustment > 0) {
    adaptationDirection = 'increase';
  } else {
    adaptationDirection = 'decrease';
  }
  
  return {
    currentGain,
    performanceError,
    learningRate,
    adjustedGain: Math.max(0.01, Math.min(10.0, adjustedGain)), // Clamp to reasonable range
    adaptationDirection
  };
}

// Example usage:
// Current PID gain Kp = 0.5
// Performance error = 0.1 (10% underperformance)
// Learning rate = 0.1
// Adjusted gain = 0.5 × (1 + 0.1 × 0.1) = 0.505 (slight increase)

// ============================================================================
// FORMULA 8: STATE SPACE REPRESENTATION
// ============================================================================

/**
 * Model system as state vector: x' = Ax + Bu
 * 
 * Application: Multi-dimensional system modeling
 */
export interface StateSpace {
  stateVector: number[];           // Current system state
  stateMatrix: number[][];         // A matrix (system dynamics)
  inputMatrix: number[][];         // B matrix (control inputs)
  controlVector: number[];         // u (control inputs)
  nextState: number[];             // Predicted next state
}

export function stateSpaceUpdate(
  currentState: number[],
  stateMatrix: number[][],
  inputMatrix: number[][],
  controlInput: number[]
): StateSpace {
  // Matrix-vector multiplication: Ax
  const Ax = stateMatrix.map((row, i) => 
    row.reduce((sum, val, j) => sum + val * currentState[j], 0)
  );
  
  // Matrix-vector multiplication: Bu
  const Bu = inputMatrix.map((row, i) =>
    row.reduce((sum, val, j) => sum + val * controlInput[j], 0)
  );
  
  // Next state: x' = Ax + Bu
  const nextState = Ax.map((val, i) => val + Bu[i]);
  
  return {
    stateVector: currentState,
    stateMatrix,
    inputMatrix,
    controlVector: controlInput,
    nextState
  };
}

// Example usage:
// State: [conversion_rate, avg_response_time, customer_satisfaction]
// Control: [prompt_optimization, response_priority, personalization_level]
// Predicts next state based on current state and control inputs

// ============================================================================
// FORMULA 9: OBSERVABILITY MATRIX
// ============================================================================

/**
 * Can we measure what we need to control?
 * 
 * Rank(Observability_Matrix) = number of observable states
 * 
 * Application: Verify we can monitor all critical metrics
 */
export interface ObservabilityAnalysis {
  observabilityMatrix: number[][];
  rank: number;
  totalStates: number;
  isObservable: boolean;
  unobservableStates: number;
}

export function checkObservability(
  stateMatrix: number[][],
  outputMatrix: number[][]
): ObservabilityAnalysis {
  // Simplified: Check if we have sensors for all states
  // In practice, would compute full observability matrix rank
  
  const totalStates = stateMatrix.length;
  const measuredOutputs = outputMatrix.length;
  const rank = Math.min(totalStates, measuredOutputs);
  const isObservable = rank === totalStates;
  const unobservableStates = totalStates - rank;
  
  // Construct observability matrix (simplified)
  const observabilityMatrix: number[][] = [];
  for (let i = 0; i < measuredOutputs; i++) {
    observabilityMatrix.push([...outputMatrix[i]]);
  }
  
  return {
    observabilityMatrix,
    rank,
    totalStates,
    isObservable,
    unobservableStates
  };
}

// Example usage:
// States: [conversion, revenue, satisfaction, efficiency]
// Outputs: [conversion, revenue, satisfaction] (can measure 3/4)
// Not fully observable (efficiency not measured)
// Recommendation: Add efficiency monitoring

// ============================================================================
// FORMULA 10: CONTROLLABILITY MATRIX
// ============================================================================

/**
 * Can we change what we want to control?
 * 
 * Rank(Controllability_Matrix) = number of controllable states
 * 
 * Application: Verify we can adjust all critical parameters
 */
export interface ControllabilityAnalysis {
  controllabilityMatrix: number[][];
  rank: number;
  totalStates: number;
  isControllable: boolean;
  uncontrollableStates: number;
}

export function checkControllability(
  stateMatrix: number[][],
  inputMatrix: number[][]
): ControllabilityAnalysis {
  // Simplified: Check if we have controls for all states
  const totalStates = stateMatrix.length;
  const controlInputs = inputMatrix[0]?.length || 0;
  const rank = Math.min(totalStates, controlInputs);
  const isControllable = rank === totalStates;
  const uncontrollableStates = totalStates - rank;
  
  // Construct controllability matrix (simplified)
  const controllabilityMatrix: number[][] = [];
  for (let i = 0; i < inputMatrix.length; i++) {
    controllabilityMatrix.push([...inputMatrix[i]]);
  }
  
  return {
    controllabilityMatrix,
    rank,
    totalStates,
    isControllable,
    uncontrollableStates
  };
}

// Example usage:
// States: [conversion, revenue, satisfaction]
// Controls: [prompt_tuning, pricing, personalization]
// Fully controllable (can adjust all states)

// ============================================================================
// FORMULA 11: KALMAN FILTER
// ============================================================================

/**
 * Optimal state estimation with noise
 * 
 * x_hat = x_predicted + K × (z_observed - x_predicted)
 * 
 * Application: Filter noisy metrics to get true values
 */
export interface KalmanFilter {
  predictedState: number;
  observedState: number;
  kalmanGain: number;              // K (how much to trust observation)
  estimatedState: number;          // Filtered estimate
  uncertainty: number;             // Estimate confidence
}

export function kalmanFilter(
  predictedState: number,
  observedState: number,
  predictionUncertainty: number,
  observationUncertainty: number
): KalmanFilter {
  // Kalman gain: K = P_pred / (P_pred + R_obs)
  const kalmanGain = predictionUncertainty / (predictionUncertainty + observationUncertainty);
  
  // Updated estimate: x_hat = x_pred + K × (z - x_pred)
  const estimatedState = predictedState + kalmanGain * (observedState - predictedState);
  
  // Updated uncertainty: P = (1 - K) × P_pred
  const uncertainty = (1 - kalmanGain) * predictionUncertainty;
  
  return {
    predictedState,
    observedState,
    kalmanGain,
    estimatedState,
    uncertainty
  };
}

// Example usage:
// Predicted conversion rate: 87% (uncertainty: 0.02)
// Observed conversion rate: 85% (uncertainty: 0.05, noisy measurement)
// Kalman gain = 0.02 / (0.02 + 0.05) = 0.286
// Estimated = 87% + 0.286 × (85% - 87%) = 86.4% (smoothed estimate)

// ============================================================================
// FORMULA 12: LQR CONTROLLER (LINEAR QUADRATIC REGULATOR)
// ============================================================================

/**
 * Optimal control: Minimize cost function J = ∫(x²Q + u²R)dt
 * 
 * Application: Optimal resource allocation
 */
export interface LQRController {
  stateCost: number;               // x²Q (penalty for deviation)
  controlCost: number;             // u²R (penalty for control effort)
  totalCost: number;               // Combined cost
  optimalControl: number;          // u* (optimal input)
}

export function lqrControl(
  stateError: number,
  stateWeight: number,             // Q (how much to penalize error)
  controlWeight: number,           // R (how much to penalize control effort)
  currentControl: number
): LQRController {
  // Simplified LQR: u* = -K × x, where K = Q/R
  const stateCost = stateWeight * stateError * stateError;
  const controlGain = stateWeight / controlWeight;
  const optimalControl = -controlGain * stateError;
  const controlCost = controlWeight * optimalControl * optimalControl;
  const totalCost = stateCost + controlCost;
  
  return {
    stateCost,
    controlCost,
    totalCost,
    optimalControl
  };
}

// Example usage:
// State error: 5% (conversion rate below target)
// State weight: 10 (high penalty for deviation)
// Control weight: 1 (low penalty for adjustment)
// Optimal control = -10 × 5% = -50% (large adjustment)
// Trade-off: Large correction vs. control effort

// ============================================================================
// FORMULA 13: VIABLE SYSTEM MODEL (BEER) - Recursive Levels
// ============================================================================

/**
 * Stafford Beer's 5-level recursive organization
 * 
 * Level 1: Operations
 * Level 2: Coordination
 * Level 3: Control
 * Level 4: Intelligence
 * Level 5: Policy
 * 
 * Application: System organization analysis
 */
export interface SystemLevel {
  level: number;
  name: string;
  function: string;
  viability: number;  // 0.0 - 1.0
}

export interface VSMAnalysis {
  levels: SystemLevel[];
  overallViability: number;
  weakestLevel: SystemLevel;
  strongestLevel: SystemLevel;
}

export function analyzeViableSystem(levelViabilities: number[]): VSMAnalysis {
  const levelNames = [
    'Operations',
    'Coordination',
    'Control',
    'Intelligence',
    'Policy'
  ];
  
  const levelFunctions = [
    'Execute primary business functions',
    'Resolve conflicts between operational units',
    'Resource allocation and optimization',
    'Monitor environment, detect threats/opportunities',
    'Define identity, values, strategic direction'
  ];
  
  const levels: SystemLevel[] = levelViabilities.map((viability, index) => ({
    level: index + 1,
    name: levelNames[index],
    function: levelFunctions[index],
    viability
  }));
  
  // Overall viability = minimum (weakest link)
  const overallViability = Math.min(...levelViabilities);
  
  // Find weakest and strongest levels
  const weakestLevel = levels.reduce((min, level) => 
    level.viability < min.viability ? level : min
  );
  
  const strongestLevel = levels.reduce((max, level) =>
    level.viability > max.viability ? level : max
  );
  
  return {
    levels,
    overallViability,
    weakestLevel,
    strongestLevel
  };
}

// Example usage:
// Level viabilities: [0.95, 0.92, 0.88, 0.85, 0.90]
// Overall viability = 0.85 (Level 4 - Intelligence is weakest)
// Recommendation: Strengthen environmental monitoring

// ============================================================================
// FORMULA 14: REQUISITE VARIETY MATCHING
// ============================================================================

/**
 * Match controller variety to disturbance variety
 * 
 * Controller_Variety = log₂(Controller_States)
 * Disturbance_Variety = log₂(Disturbance_Types)
 * 
 * Match when: Controller_Variety ≥ Disturbance_Variety
 */
export interface VarietyMatching {
  controllerVariety: number;
  disturbanceVariety: number;
  matchRatio: number;              // controller / disturbance
  isMatched: boolean;
  recommendation: string;
}

export function matchRequisiteVariety(
  controllerStates: number,
  disturbanceTypes: number
): VarietyMatching {
  const controllerVariety = Math.log2(controllerStates);
  const disturbanceVariety = Math.log2(disturbanceTypes);
  const matchRatio = controllerVariety / disturbanceVariety;
  const isMatched = matchRatio >= 1.0;
  
  let recommendation: string;
  if (isMatched) {
    recommendation = 'Controller has sufficient variety to handle disturbances.';
  } else {
    const requiredStates = Math.pow(2, disturbanceVariety);
    recommendation = `Increase controller states to ${Math.ceil(requiredStates)} to match disturbance variety.`;
  }
  
  return {
    controllerVariety,
    disturbanceVariety,
    matchRatio,
    isMatched,
    recommendation
  };
}

// Example usage:
// Controller states: 16 (4 bits of control)
// Disturbance types: 64 (6 bits of variety)
// Controller variety = log₂(16) = 4
// Disturbance variety = log₂(64) = 6
// Match ratio = 4/6 = 0.67 (INSUFFICIENT)
// Need: 2^6 = 64 controller states

// ============================================================================
// FORMULA 15: FEEDBACK LOOP GAIN
// ============================================================================

/**
 * Amplification of corrections in feedback loop
 * 
 * Gain = Output_Change / Input_Change
 * 
 * Application: How much effect do adjustments have?
 */
export interface FeedbackGain {
  inputChange: number;
  outputChange: number;
  gain: number;
  isStable: boolean;               // Gain < 1 for stability (in closed loop)
  recommendation: string;
}

export function calculateFeedbackGain(
  inputChange: number,
  outputChange: number,
  isOpenLoop: boolean = true
): FeedbackGain {
  const gain = Math.abs(outputChange / inputChange);
  
  // In closed-loop systems, gain must be < 1 for stability
  // In open-loop systems, higher gain is generally better
  const isStable = isOpenLoop || gain < 1.0;
  
  let recommendation: string;
  if (isOpenLoop) {
    if (gain > 1.0) {
      recommendation = 'High gain - adjustments have strong effect. Monitor for overshoot.';
    } else {
      recommendation = 'Low gain - adjustments have weak effect. Consider increasing gain.';
    }
  } else {
    if (gain >= 1.0) {
      recommendation = 'WARNING: Gain >= 1 in closed loop. System may be unstable.';
    } else {
      recommendation = `Stable gain of ${gain.toFixed(2)}. System should be stable.`;
    }
  }
  
  return {
    inputChange,
    outputChange,
    gain,
    isStable,
    recommendation
  };
}

// Example usage:
// Input change: Increase prompt quality by 10%
// Output change: Conversion rate increases by 3%
// Gain = 3% / 10% = 0.3
// (Open loop) Low gain - consider stronger prompt improvements

// ============================================================================
// FORMULA 16: DAMPING RATIO
// ============================================================================

/**
 * Prevent oscillations in system response
 * 
 * ζ (zeta) = damping / (2 × sqrt(mass × spring))
 * 
 * ζ < 1: Underdamped (oscillates)
 * ζ = 1: Critically damped (fastest without oscillation)
 * ζ > 1: Overdamped (slow, no oscillation)
 */
export interface DampingAnalysis {
  dampingCoefficient: number;      // ζ (zeta)
  naturalFrequency: number;        // ωn
  responseType: 'underdamped' | 'critically_damped' | 'overdamped';
  settlingTime: number;            // Time to settle within 2% of final value
  overshoot: number;               // Peak overshoot (underdamped only)
}

export function calculateDamping(
  dampingRatio: number,
  naturalFrequency: number
): DampingAnalysis {
  let responseType: 'underdamped' | 'critically_damped' | 'overdamped';
  let settlingTime: number;
  let overshoot: number = 0;
  
  if (dampingRatio < 1.0) {
    responseType = 'underdamped';
    // Underdamped: oscillates before settling
    settlingTime = 4 / (dampingRatio * naturalFrequency);
    overshoot = Math.exp(-Math.PI * dampingRatio / Math.sqrt(1 - dampingRatio * dampingRatio));
  } else if (dampingRatio === 1.0) {
    responseType = 'critically_damped';
    settlingTime = 4.75 / naturalFrequency;
  } else {
    responseType = 'overdamped';
    settlingTime = 7.5 / naturalFrequency; // Approximate
  }
  
  return {
    dampingCoefficient: dampingRatio,
    naturalFrequency,
    responseType,
    settlingTime,
    overshoot
  };
}

// Example usage:
// Damping ratio: 0.7 (underdamped)
// Natural frequency: 0.5 rad/day
// Response: Oscillates with 4.6% overshoot
// Settling time: 4 / (0.7 × 0.5) = 11.4 days

// ============================================================================
// FORMULA 17: SETTLING TIME
// ============================================================================

/**
 * Time to reach and stay within 2% of steady-state value
 * 
 * For second-order system: Ts ≈ 4 / (ζ × ωn)
 * 
 * Application: How long until changes stabilize?
 */
export interface SettlingTimeAnalysis {
  settlingTime: number;            // Time to settle (seconds/days)
  tolerance: number;               // ±2% by default
  systemType: 'first_order' | 'second_order';
  timeConstant?: number;           // τ (for first-order)
  dampingRatio?: number;           // ζ (for second-order)
  naturalFrequency?: number;       // ωn (for second-order)
}

export function calculateSettlingTime(
  systemType: 'first_order' | 'second_order',
  timeConstant?: number,
  dampingRatio?: number,
  naturalFrequency?: number,
  tolerance: number = 0.02  // 2%
): SettlingTimeAnalysis {
  let settlingTime: number;
  
  if (systemType === 'first_order' && timeConstant) {
    // First-order: Ts = -τ × ln(tolerance)
    settlingTime = -timeConstant * Math.log(tolerance);
  } else if (systemType === 'second_order' && dampingRatio && naturalFrequency) {
    // Second-order: Ts ≈ 4 / (ζ × ωn) for 2% tolerance
    settlingTime = 4 / (dampingRatio * naturalFrequency);
  } else {
    throw new Error('Invalid parameters for system type');
  }
  
  return {
    settlingTime,
    tolerance,
    systemType,
    timeConstant,
    dampingRatio,
    naturalFrequency
  };
}

// Example usage:
// First-order system with τ = 2 days
// Settling time = -2 × ln(0.02) = 7.82 days
// (Time for change to reach 98% of final value)

// ============================================================================
// FORMULA 18: OVERSHOOT CALCULATION
// ============================================================================

/**
 * Peak deviation before settling to steady state
 * 
 * For underdamped second-order: Mp = e^(-πζ/√(1-ζ²))
 * 
 * Application: Predict maximum overshoot when adjusting parameters
 */
export interface OvershootAnalysis {
  dampingRatio: number;            // ζ
  overshootPercent: number;        // Mp × 100%
  peakValue: number;               // Steady-state × (1 + Mp)
  isAcceptable: boolean;           // Typically < 10% is acceptable
}

export function calculateOvershoot(
  dampingRatio: number,
  steadyStateValue: number
): OvershootAnalysis {
  if (dampingRatio >= 1.0) {
    // No overshoot for critically damped or overdamped
    return {
      dampingRatio,
      overshootPercent: 0,
      peakValue: steadyStateValue,
      isAcceptable: true
    };
  }
  
  // Underdamped overshoot: Mp = e^(-πζ/√(1-ζ²))
  const sqrtTerm = Math.sqrt(1 - dampingRatio * dampingRatio);
  const overshootRatio = Math.exp(-Math.PI * dampingRatio / sqrtTerm);
  const overshootPercent = overshootRatio * 100;
  const peakValue = steadyStateValue * (1 + overshootRatio);
  const isAcceptable = overshootPercent < 10.0;
  
  return {
    dampingRatio,
    overshootPercent,
    peakValue,
    isAcceptable
  };
}

// Example usage:
// Damping ratio: 0.5 (underdamped)
// Steady-state target: 90% conversion
// Overshoot = e^(-π×0.5/√(1-0.25)) = 0.163 (16.3%)
// Peak value = 90% × 1.163 = 104.7% (exceeds 100%, clamp to 100%)
// Not acceptable - reduce damping ratio or increase it to reduce overshoot



