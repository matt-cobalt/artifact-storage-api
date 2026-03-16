/**
 * Homeostatic Monitoring System
 * 
 * Continuously monitors system stability and triggers
 * recovery when stability falls below threshold.
 * 
 * Uses control theory (homeostatic regulation) to maintain
 * system equilibrium despite external disturbances.
 */

import { homeostaticRegulation, HomeostaticState } from '../lib/control-theory.js';
import { agentRegulator } from '../lib/agent-self-regulation.js';

/**
 * Stability report from monitoring check
 */
export interface StabilityReport {
  timestamp: Date;
  feedbackLoops: number;
  disturbances: number;
  stabilityIndex: number;
  status: 'stable' | 'unstable' | 'critical';
  actions: string[];
  previousStatus?: 'stable' | 'unstable' | 'critical';
  statusChanged: boolean;
}

/**
 * Disturbance event
 */
export interface DisturbanceEvent {
  id: string;
  type: 'error' | 'anomaly' | 'external_change' | 'performance_degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Homeostatic Monitor Class
 * 
 * Real-time system stability monitoring using homeostatic regulation
 */
export class HomeostaticMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private checkIntervalMs: number = 60000; // 1 minute default
  private stabilityHistory: StabilityReport[] = [];
  private disturbanceEvents: DisturbanceEvent[] = [];
  private agentCount: number = 25; // Default: 25 agents
  private lastStatus: 'stable' | 'unstable' | 'critical' | null = null;
  
  /**
   * Start continuous monitoring
   * 
   * @param intervalMs Check interval in milliseconds (default: 60000 = 1 minute)
   */
  start(intervalMs: number = 60000): void {
    if (this.isRunning) {
      console.warn('[HomeostaticMonitor] Already running');
      return;
    }
    
    this.checkIntervalMs = intervalMs;
    this.isRunning = true;
    
    console.log(`[HomeostaticMonitor] Starting monitoring (interval: ${intervalMs}ms)`);
    
    // Initial check
    this.checkStability();
    
    // Set up interval
    this.checkInterval = setInterval(async () => {
      await this.checkStability();
    }, intervalMs);
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.isRunning = false;
    console.log('[HomeostaticMonitor] Monitoring stopped');
  }
  
  /**
   * Check current system stability
   */
  async checkStability(): Promise<StabilityReport> {
    // Count active feedback loops (agents with monitoring)
    const feedbackLoops = await this.countFeedbackLoops();
    
    // Count active disturbances (errors, anomalies, external changes)
    const disturbances = await this.countDisturbances();
    
    // Calculate stability using homeostatic regulation
    const stability = homeostaticRegulation(feedbackLoops, disturbances);
    
    const actions: string[] = [];
    const statusChanged = this.lastStatus !== null && this.lastStatus !== stability.status;
    
    // Take action based on stability
    if (stability.status === 'critical') {
      actions.push('PHOENIX recovery triggered');
      await this.triggerPhoenixRecovery(stability);
    } else if (stability.status === 'unstable') {
      actions.push('Stability alert sent to monitoring');
      await this.sendStabilityAlert(stability);
    }
    
    const report: StabilityReport = {
      timestamp: new Date(),
      feedbackLoops,
      disturbances,
      stabilityIndex: stability.stabilityIndex,
      status: stability.status,
      actions,
      previousStatus: this.lastStatus || undefined,
      statusChanged
    };
    
    // Update last status
    this.lastStatus = stability.status;
    
    // Store in history
    this.stabilityHistory.push(report);
    if (this.stabilityHistory.length > 1000) {
      this.stabilityHistory.shift();
    }
    
    // Log to database
    await this.logStability(report);
    
    // Log to console
    if (statusChanged || stability.status === 'critical' || stability.status === 'unstable') {
      console.log('[HomeostaticMonitor] Stability check:', {
        status: stability.status,
        index: stability.stabilityIndex.toFixed(2),
        feedbackLoops,
        disturbances,
        actions: actions.length > 0 ? actions : 'None'
      });
    }
    
    return report;
  }
  
  /**
   * Count active feedback loops
   * 
   * Each agent provides at least one feedback loop through monitoring
   */
  private async countFeedbackLoops(): Promise<number> {
    // TODO: Query actual agent status from database
    // For now, return configured agent count
    // In production, would check which agents are active and monitoring
    
    // Example: Check agent metrics from regulator
    const stats = agentRegulator.getSystemStatistics();
    const activeAgents = stats.agentsRegulated || this.agentCount;
    
    return activeAgents;
  }
  
  /**
   * Count active disturbances
   * 
   * Checks for errors, anomalies, external changes, performance degradation
   */
  private async countDisturbances(): Promise<number> {
    const hourAgo = new Date(Date.now() - 3600000); // Last hour
    
    // Filter recent unresolved disturbances
    const recentDisturbances = this.disturbanceEvents.filter(event => 
      event.timestamp >= hourAgo && !event.resolved
    );
    
    // Count by severity (weighted)
    let disturbanceCount = 0;
    recentDisturbances.forEach(event => {
      switch (event.severity) {
        case 'low':
          disturbanceCount += 0.5;
          break;
        case 'medium':
          disturbanceCount += 1.0;
          break;
        case 'high':
          disturbanceCount += 2.0;
          break;
        case 'critical':
          disturbanceCount += 5.0;
          break;
      }
    });
    
    // TODO: Query actual error logs from database
    // const errors = await supabase
    //   .from('error_logs')
    //   .select('*')
    //   .gte('created_at', hourAgo.toISOString())
    //   .eq('resolved', false);
    
    return Math.ceil(disturbanceCount);
  }
  
  /**
   * Record a disturbance event
   */
  recordDisturbance(event: Omit<DisturbanceEvent, 'id' | 'timestamp' | 'resolved'>): void {
    const disturbance: DisturbanceEvent = {
      ...event,
      id: `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false
    };
    
    this.disturbanceEvents.push(disturbance);
    
    // Keep only last 1000 events
    if (this.disturbanceEvents.length > 1000) {
      this.disturbanceEvents.shift();
    }
    
    // If critical, trigger immediate stability check
    if (event.severity === 'critical') {
      this.checkStability();
    }
  }
  
  /**
   * Mark disturbance as resolved
   */
  resolveDisturbance(disturbanceId: string): void {
    const disturbance = this.disturbanceEvents.find(e => e.id === disturbanceId);
    if (disturbance) {
      disturbance.resolved = true;
    }
  }
  
  /**
   * Trigger PHOENIX recovery procedure
   */
  private async triggerPhoenixRecovery(stability: HomeostaticState): Promise<void> {
    console.error('[HomeostaticMonitor] CRITICAL STABILITY: Triggering PHOENIX recovery', {
      stabilityIndex: stability.stabilityIndex.toFixed(2),
      feedbackLoops: stability.feedbackLoops,
      disturbances: stability.disturbances,
      recommendation: stability.recommendation
    });
    
    // TODO: Integrate with PHOENIX agent
    // await phoenixAgent.triggerRecovery({
    //   type: 'stability_critical',
    //   stabilityIndex: stability.stabilityIndex,
    //   feedbackLoops: stability.feedbackLoops,
    //   disturbances: stability.disturbances,
    //   recommendation: stability.recommendation
    // });
    
    // TODO: Send critical alert
    // await sendCriticalAlert({
    //   type: 'stability_critical',
    //   stabilityIndex: stability.stabilityIndex,
    //   recommendation: stability.recommendation,
    //   timestamp: new Date().toISOString()
    // });
  }
  
  /**
   * Send stability alert
   */
  private async sendStabilityAlert(stability: HomeostaticState): Promise<void> {
    console.warn('[HomeostaticMonitor] Stability warning:', {
      status: stability.status,
      stabilityIndex: stability.stabilityIndex.toFixed(2),
      recommendation: stability.recommendation
    });
    
    // TODO: Send alert to monitoring system (Slack, email, etc.)
    // await sendAlert({
    //   type: 'stability_warning',
    //   status: stability.status,
    //   stabilityIndex: stability.stabilityIndex,
    //   recommendation: stability.recommendation
    // });
  }
  
  /**
   * Log stability report to database
   */
  private async logStability(report: StabilityReport): Promise<void> {
    // TODO: Integrate with Supabase
    // await supabase.from('stability_reports').insert({
    //   timestamp: report.timestamp.toISOString(),
    //   feedback_loops: report.feedbackLoops,
    //   disturbances: report.disturbances,
    //   stability_index: report.stabilityIndex,
    //   status: report.status,
    //   actions: report.actions,
    //   status_changed: report.statusChanged
    // });
    
    // For now, just log to console at debug level
    if (process.env.NODE_ENV === 'development') {
      console.debug('[HomeostaticMonitor] Stability logged:', {
        timestamp: report.timestamp.toISOString(),
        status: report.status,
        index: report.stabilityIndex.toFixed(2)
      });
    }
  }
  
  /**
   * Get stability history
   */
  getStabilityHistory(limit: number = 100): StabilityReport[] {
    return this.stabilityHistory.slice(-limit).reverse();
  }
  
  /**
   * Get current status
   */
  getCurrentStatus(): 'stable' | 'unstable' | 'critical' | null {
    return this.lastStatus;
  }
  
  /**
   * Get active disturbances
   */
  getActiveDisturbances(): DisturbanceEvent[] {
    return this.disturbanceEvents.filter(e => !e.resolved);
  }
  
  /**
   * Set agent count (for accurate feedback loop counting)
   */
  setAgentCount(count: number): void {
    this.agentCount = count;
  }
  
  /**
   * Get monitoring statistics
   */
  getStatistics(): {
    isRunning: boolean;
    checkIntervalMs: number;
    totalChecks: number;
    currentStatus: 'stable' | 'unstable' | 'critical' | null;
    activeDisturbances: number;
    averageStabilityIndex: number;
  } {
    const recentReports = this.stabilityHistory.slice(-100);
    const avgStabilityIndex = recentReports.length > 0
      ? recentReports.reduce((sum, r) => sum + r.stabilityIndex, 0) / recentReports.length
      : 0;
    
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.checkIntervalMs,
      totalChecks: this.stabilityHistory.length,
      currentStatus: this.lastStatus,
      activeDisturbances: this.getActiveDisturbances().length,
      averageStabilityIndex: avgStabilityIndex
    };
  }
}

/**
 * Singleton instance for global use
 */
export const homeostaticMonitor = new HomeostaticMonitor();

// Example usage:
// homeostaticMonitor.start(60000); // Check every minute
// homeostaticMonitor.recordDisturbance({
//   type: 'error',
//   severity: 'high',
//   description: 'OTTO agent response time exceeded 2 seconds'
// });



