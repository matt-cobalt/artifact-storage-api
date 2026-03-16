/**
 * Agent Self-Regulation System
 * 
 * Each agent continuously monitors its performance and adjusts
 * parameters using control theory to maintain optimal operation.
 * 
 * This enables autonomous optimization without manual intervention.
 */

import { 
  firstOrderControl, 
  FeedbackControl,
  pidControl,
  PIDState,
  PIDController,
  homeostaticRegulation,
  HomeostaticState,
  stabilityCheck,
  StabilityAnalysis
} from './control-theory.js';

/**
 * Agent performance metrics tracking
 */
export interface AgentMetrics {
  agentId: string;
  metricName: string;
  current: number;
  target: number;
  history: number[];
  lastUpdated: Date;
}

/**
 * Regulation action taken by the system
 */
export interface RegulationAction {
  agentId: string;
  parameter: string;
  currentValue: number;
  adjustedValue: number;
  reason: string;
  controlMethod: 'proportional' | 'pid' | 'homeostatic';
  timestamp: Date;
  confidence: number;              // 0.0 - 1.0
}

/**
 * Agent Regulator Class
 * 
 * Monitors and regulates agent performance using control theory
 */
export class AgentRegulator {
  private metrics: Map<string, AgentMetrics> = new Map();
  private pidStates: Map<string, PIDState> = new Map();
  private regulationHistory: RegulationAction[] = [];
  
  /**
   * Monitor agent metric and apply control correction
   */
  async regulate(
    agentId: string,
    metricName: string,
    currentValue: number,
    targetValue: number,
    controlType: 'proportional' | 'pid' = 'proportional'
  ): Promise<RegulationAction | null> {
    
    const key = `${agentId}-${metricName}`;
    
    // Get or create metric tracking
    let metric = this.metrics.get(key);
    if (!metric) {
      metric = {
        agentId,
        metricName,
        current: currentValue,
        target: targetValue,
        history: [],
        lastUpdated: new Date()
      };
      this.metrics.set(key, metric);
    }
    
    // Update history
    metric.history.push(currentValue);
    if (metric.history.length > 20) {
      metric.history.shift();
    }
    metric.current = currentValue;
    metric.lastUpdated = new Date();
    
    // Apply control based on type
    let correction: number;
    let method: 'proportional' | 'pid' | 'homeostatic';
    let confidence: number = 0.7;
    
    if (controlType === 'pid' && metric.history.length >= 3) {
      // Use PID control for complex, time-dependent adjustments
      let pidState = this.pidStates.get(key);
      if (!pidState) {
        pidState = {
          errorHistory: [],
          lastError: 0,
          dt: 1.0
        };
        this.pidStates.set(key, pidState);
      }
      
      const result = pidControl(
        targetValue,
        currentValue,
        0.5,  // Kp: Proportional gain
        0.1,  // Ki: Integral gain
        0.3,  // Kd: Derivative gain
        pidState
      );
      
      correction = result.totalCorrection;
      method = 'pid';
      
      // Confidence based on history length
      confidence = Math.min(0.95, 0.5 + metric.history.length * 0.03);
      
    } else {
      // Use simple proportional control
      const result = firstOrderControl(
        targetValue,
        currentValue,
        0.5  // Gain factor
      );
      
      correction = result.correction;
      method = 'proportional';
      
      // Confidence based on history
      confidence = Math.min(0.9, 0.6 + metric.history.length * 0.02);
    }
    
    // Only apply if correction is significant (>1% or >0.01 absolute)
    const relativeChange = Math.abs(correction / (currentValue || 1));
    const absoluteChange = Math.abs(correction);
    
    if (relativeChange < 0.01 && absoluteChange < 0.01) {
      return null; // Correction too small, skip
    }
    
    const adjustedValue = currentValue + correction;
    
    // Create regulation action
    const action: RegulationAction = {
      agentId,
      parameter: metricName,
      currentValue,
      adjustedValue,
      reason: this.generateReason(currentValue, targetValue, correction, method),
      controlMethod: method,
      timestamp: new Date(),
      confidence
    };
    
    // Log to database (for audit trail)
    await this.logRegulation(action);
    
    // Store in history
    this.regulationHistory.push(action);
    if (this.regulationHistory.length > 1000) {
      this.regulationHistory.shift();
    }
    
    return action;
  }
  
  /**
   * Generate human-readable reason for regulation
   */
  private generateReason(
    current: number,
    target: number,
    correction: number,
    method: string
  ): string {
    const errorPercent = ((current - target) / target * 100).toFixed(1);
    const correctionPercent = (Math.abs(correction) / (current || 1) * 100).toFixed(1);
    const direction = correction > 0 ? 'increase' : 'decrease';
    
    return `Deviation from target: ${errorPercent}%. Applying ${correctionPercent}% ${direction} using ${method} control.`;
  }
  
  /**
   * Check overall system stability
   */
  async checkSystemStability(
    agentCount: number,
    activeDisturbances: number
  ): Promise<HomeostaticState> {
    // Assume each agent provides 1 feedback loop
    const feedbackLoops = agentCount;
    
    const stability = homeostaticRegulation(
      feedbackLoops,
      activeDisturbances
    );
    
    if (stability.status === 'critical') {
      // Trigger recovery procedure
      await this.triggerRecovery(stability);
    }
    
    return stability;
  }
  
  /**
   * Check stability of a specific feedback loop
   */
  checkLoopStability(
    a: number,  // Second-order coefficient
    b: number,  // First-order coefficient
    c: number   // Constant term
  ): StabilityAnalysis {
    return stabilityCheck(a, b, c);
  }
  
  /**
   * Get regulation history for an agent
   */
  getRegulationHistory(agentId: string, limit: number = 50): RegulationAction[] {
    return this.regulationHistory
      .filter(action => action.agentId === agentId)
      .slice(-limit)
      .reverse();
  }
  
  /**
   * Get current metrics for an agent
   */
  getAgentMetrics(agentId: string): AgentMetrics[] {
    const metrics: AgentMetrics[] = [];
    this.metrics.forEach((metric, key) => {
      if (metric.agentId === agentId) {
        metrics.push(metric);
      }
    });
    return metrics;
  }
  
  /**
   * Reset regulation state (for testing or agent restart)
   */
  resetAgent(agentId: string): void {
    // Remove metrics
    const keysToDelete: string[] = [];
    this.metrics.forEach((metric, key) => {
      if (metric.agentId === agentId) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      this.metrics.delete(key);
      this.pidStates.delete(key);
    });
  }
  
  /**
   * Log regulation action to database
   */
  private async logRegulation(action: RegulationAction): Promise<void> {
    // TODO: Integrate with Supabase
    // await supabase.from('agent_regulations').insert({
    //   agent_id: action.agentId,
    //   parameter: action.parameter,
    //   current_value: action.currentValue,
    //   adjusted_value: action.adjustedValue,
    //   reason: action.reason,
    //   control_method: action.controlMethod,
    //   confidence: action.confidence,
    //   timestamp: action.timestamp.toISOString()
    // });
    
    console.log('[AgentRegulator] Regulation action:', {
      agent: action.agentId,
      parameter: action.parameter,
      change: `${action.currentValue.toFixed(2)} → ${action.adjustedValue.toFixed(2)}`,
      method: action.controlMethod,
      confidence: (action.confidence * 100).toFixed(0) + '%'
    });
  }
  
  /**
   * Trigger recovery procedure for critical stability issues
   */
  private async triggerRecovery(stability: HomeostaticState): Promise<void> {
    console.error('[AgentRegulator] CRITICAL STABILITY ISSUE:', {
      stabilityIndex: stability.stabilityIndex.toFixed(2),
      feedbackLoops: stability.feedbackLoops,
      disturbances: stability.disturbances,
      recommendation: stability.recommendation
    });
    
    // TODO: Trigger PHOENIX agent for recovery
    // await phoenixAgent.triggerRecovery(stability);
    
    // TODO: Send alert to monitoring system
    // await sendCriticalAlert({
    //   type: 'stability_critical',
    //   stabilityIndex: stability.stabilityIndex,
    //   recommendation: stability.recommendation
    // });
  }
  
  /**
   * Get system-wide regulation statistics
   */
  getSystemStatistics(): {
    totalRegulations: number;
    agentsRegulated: number;
    averageConfidence: number;
    regulationFrequency: { [agentId: string]: number };
  } {
    const agentIds = new Set(this.regulationHistory.map(a => a.agentId));
    const frequency: { [agentId: string]: number } = {};
    
    agentIds.forEach(agentId => {
      frequency[agentId] = this.regulationHistory.filter(a => a.agentId === agentId).length;
    });
    
    const avgConfidence = this.regulationHistory.length > 0
      ? this.regulationHistory.reduce((sum, a) => sum + a.confidence, 0) / this.regulationHistory.length
      : 0;
    
    return {
      totalRegulations: this.regulationHistory.length,
      agentsRegulated: agentIds.size,
      averageConfidence: avgConfidence,
      regulationFrequency: frequency
    };
  }
}

/**
 * Singleton instance for global use
 */
export const agentRegulator = new AgentRegulator();



