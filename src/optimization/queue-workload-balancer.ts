/**
 * Queuing Theory Workload Balancer
 * 
 * Uses M/M/c queue model to:
 * - Calculate optimal agent count per task type
 * - Predict wait times before they happen
 * - Pre-allocate resources based on arrival rates
 * - Achieve <50ms average wait time
 * 
 * M/M/c: Poisson arrivals, Exponential service, c servers
 */

import { mmcQueue, findOptimalServers, MMCQueueResult } from '../lib/queuing-theory.js';

export interface TaskQueue {
  taskType: string;
  arrivalRate: number;          // λ (tasks per second)
  serviceRate: number;          // μ (tasks per second per agent)
  activeAgents: number;         // c (current agent count)
  queueLength: number;          // L (tasks waiting)
  avgWaitTime: number;          // W (average wait in ms)
  utilization: number;          // ρ (0.0-1.0)
}

export interface WorkloadAnalysis {
  taskType: string;
  currentAgents: number;
  optimalAgents: number;
  currentWaitTime: number;      // ms
  optimalWaitTime: number;      // ms
  recommendation: 'add_agents' | 'remove_agents' | 'optimal';
  improvement: number;          // % improvement from optimization
}

export class QueueWorkloadBalancer {
  private queues: Map<string, TaskQueue> = new Map();
  private targetWaitTime: number = 0.05;  // 50ms in seconds
  
  /**
   * Register task queue for monitoring
   */
  registerQueue(
    taskType: string,
    arrivalRate: number,
    serviceRate: number,
    initialAgents?: number
  ): void {
    
    const agents = initialAgents || Math.ceil(arrivalRate / serviceRate) + 1;
    
    // Calculate initial metrics
    let initialWaitTime = 0;
    let initialUtilization = 0;
    
    try {
      const result = mmcQueue(arrivalRate, serviceRate, agents);
      initialWaitTime = result.avgWaitTime * 1000;  // Convert to ms
      initialUtilization = result.utilization;
    } catch (error) {
      // Queue unstable, start with more agents
      const stableAgents = Math.ceil(arrivalRate / serviceRate) * 2;
      const result = mmcQueue(arrivalRate, serviceRate, stableAgents);
      initialWaitTime = result.avgWaitTime * 1000;
      initialUtilization = result.utilization;
    }
    
    this.queues.set(taskType, {
      taskType,
      arrivalRate,
      serviceRate,
      activeAgents: agents,
      queueLength: 0,
      avgWaitTime: initialWaitTime,
      utilization: initialUtilization
    });
    
    console.log(`[QueueBalancer] Registered queue: ${taskType} with ${agents} initial agents (wait time: ${initialWaitTime.toFixed(0)}ms)`);
  }
  
  /**
   * Analyze queue and recommend optimal agent count
   */
  analyzeQueue(taskType: string): WorkloadAnalysis {
    const queue = this.queues.get(taskType);
    if (!queue) {
      throw new Error(`Queue ${taskType} not registered`);
    }
    
    // Calculate current performance using M/M/c model
    let currentPerformance: MMCQueueResult;
    
    try {
      currentPerformance = mmcQueue(
        queue.arrivalRate,
        queue.serviceRate,
        queue.activeAgents
      );
    } catch (error) {
      // Queue unstable, need more agents
      currentPerformance = {
        utilization: 1.0,
        avgQueueLength: Infinity,
        avgWaitTime: Infinity,
        avgSystemTime: Infinity,
        avgSystemLength: Infinity,
        probabilityOfWait: 1.0,
        isStable: false
      };
    }
    
    const currentWaitTime = currentPerformance.isStable 
      ? currentPerformance.avgWaitTime * 1000  // Convert to ms
      : Infinity;
    
    // Find optimal agent count for target wait time
    const optimalAgents = findOptimalServers(
      queue.arrivalRate,
      queue.serviceRate,
      this.targetWaitTime
    );
    
    const optimalPerformance = mmcQueue(
      queue.arrivalRate,
      queue.serviceRate,
      optimalAgents
    );
    
    const optimalWaitTime = optimalPerformance.avgWaitTime * 1000;
    
    // Determine recommendation
    let recommendation: 'add_agents' | 'remove_agents' | 'optimal';
    
    if (optimalAgents > queue.activeAgents) {
      recommendation = 'add_agents';
    } else if (optimalAgents < queue.activeAgents) {
      recommendation = 'remove_agents';
    } else {
      recommendation = 'optimal';
    }
    
    // Calculate improvement percentage
    const improvement = currentWaitTime < Infinity && currentWaitTime > 0
      ? ((currentWaitTime - optimalWaitTime) / currentWaitTime) * 100
      : 100;  // Infinite wait time → 100% improvement
    
    return {
      taskType,
      currentAgents: queue.activeAgents,
      optimalAgents,
      currentWaitTime,
      optimalWaitTime,
      recommendation,
      improvement
    };
  }
  
  /**
   * Update queue with real-time measurements
   */
  updateQueue(
    taskType: string,
    measuredArrivalRate: number,
    measuredServiceRate: number,
    currentQueueLength: number
  ): void {
    
    const queue = this.queues.get(taskType);
    if (!queue) {
      console.warn(`[QueueBalancer] Queue ${taskType} not found, registering now`);
      this.registerQueue(taskType, measuredArrivalRate, measuredServiceRate);
      return;
    }
    
    // Update with smoothed exponential moving average
    const alpha = 0.3;  // Smoothing factor (30% new, 70% old)
    queue.arrivalRate = alpha * measuredArrivalRate + (1 - alpha) * queue.arrivalRate;
    queue.serviceRate = alpha * measuredServiceRate + (1 - alpha) * queue.serviceRate;
    queue.queueLength = currentQueueLength;
    
    // Recalculate metrics
    try {
      const performance = mmcQueue(
        queue.arrivalRate,
        queue.serviceRate,
        queue.activeAgents
      );
      
      queue.avgWaitTime = performance.avgWaitTime * 1000;
      queue.utilization = performance.utilization;
    } catch (error) {
      console.warn(`[QueueBalancer] Queue ${taskType} unstable, adding agents`);
      queue.activeAgents++;
      
      // Recalculate with new agent count
      try {
        const performance = mmcQueue(
          queue.arrivalRate,
          queue.serviceRate,
          queue.activeAgents
        );
        queue.avgWaitTime = performance.avgWaitTime * 1000;
        queue.utilization = performance.utilization;
      } catch (error2) {
        console.error(`[QueueBalancer] Queue ${taskType} still unstable after adding agent`);
      }
    }
  }
  
  /**
   * Automatically adjust agent count based on analysis
   */
  async autoOptimize(): Promise<Map<string, WorkloadAnalysis>> {
    const results = new Map<string, WorkloadAnalysis>();
    
    for (const [taskType, queue] of this.queues.entries()) {
      const analysis = this.analyzeQueue(taskType);
      results.set(taskType, analysis);
      
      // Apply recommendation
      if (analysis.recommendation === 'add_agents') {
        const toAdd = analysis.optimalAgents - analysis.currentAgents;
        console.log(`[QueueBalancer] ${taskType}: Adding ${toAdd} agents (wait time ${analysis.currentWaitTime.toFixed(0)}ms → ${analysis.optimalWaitTime.toFixed(0)}ms, ${analysis.improvement.toFixed(0)}% improvement)`);
        queue.activeAgents = analysis.optimalAgents;
      } else if (analysis.recommendation === 'remove_agents') {
        const toRemove = analysis.currentAgents - analysis.optimalAgents;
        console.log(`[QueueBalancer] ${taskType}: Removing ${toRemove} agents (over-provisioned, wait time ${analysis.currentWaitTime.toFixed(0)}ms → ${analysis.optimalWaitTime.toFixed(0)}ms)`);
        queue.activeAgents = analysis.optimalAgents;
      } else {
        console.log(`[QueueBalancer] ${taskType}: Optimal (${analysis.currentAgents} agents, ${analysis.currentWaitTime.toFixed(0)}ms wait time)`);
      }
    }
    
    return results;
  }
  
  /**
   * Get current queue statistics
   */
  getStatistics(): Array<{
    taskType: string;
    arrivalRate: number;
    activeAgents: number;
    queueLength: number;
    avgWaitTime: number;
    utilization: number;
  }> {
    
    return Array.from(this.queues.values()).map(q => ({
      taskType: q.taskType,
      arrivalRate: q.arrivalRate,
      activeAgents: q.activeAgents,
      queueLength: q.queueLength,
      avgWaitTime: q.avgWaitTime,
      utilization: q.utilization
    }));
  }
  
  /**
   * Predict future queue state
   */
  predictFutureState(
    taskType: string,
    hoursAhead: number
  ): {
    predictedArrivalRate: number;
    recommendedAgents: number;
    predictedWaitTime: number;
  } {
    
    const queue = this.queues.get(taskType);
    if (!queue) {
      throw new Error(`Queue ${taskType} not found`);
    }
    
    // Simple prediction: use historical patterns (time-of-day based)
    // In production: integrate with Kalman Filter for better prediction
    const timeOfDay = new Date().getHours();
    const targetTime = (timeOfDay + hoursAhead) % 24;
    
    // Peak hours: 9-11 AM, 2-4 PM (1.5x traffic)
    let multiplier = 1.0;
    if ((targetTime >= 9 && targetTime <= 11) || (targetTime >= 14 && targetTime <= 16)) {
      multiplier = 1.5;
    }
    // After hours: 6 PM - 8 AM (0.3x traffic)
    else if (targetTime >= 18 || targetTime <= 8) {
      multiplier = 0.3;
    }
    
    const predictedArrivalRate = queue.arrivalRate * multiplier;
    const recommendedAgents = findOptimalServers(
      predictedArrivalRate,
      queue.serviceRate,
      this.targetWaitTime
    );
    
    const predictedPerformance = mmcQueue(
      predictedArrivalRate,
      queue.serviceRate,
      recommendedAgents
    );
    
    const predictedWaitTime = predictedPerformance.avgWaitTime * 1000;
    
    return {
      predictedArrivalRate,
      recommendedAgents,
      predictedWaitTime
    };
  }
  
  /**
   * Set target wait time
   */
  setTargetWaitTime(targetMs: number): void {
    this.targetWaitTime = targetMs / 1000;  // Convert to seconds
    console.log(`[QueueBalancer] Target wait time set to ${targetMs}ms`);
  }
  
  /**
   * Get queue by type
   */
  getQueue(taskType: string): TaskQueue | undefined {
    return this.queues.get(taskType);
  }
  
  /**
   * Remove queue
   */
  unregisterQueue(taskType: string): void {
    this.queues.delete(taskType);
    console.log(`[QueueBalancer] Unregistered queue: ${taskType}`);
  }
}

/**
 * Singleton instance for global use
 */
export const queueBalancer = new QueueWorkloadBalancer();

// Initialize queues for common task types (default configuration)
queueBalancer.registerQueue('llm_inference', 5, 10);      // 5 req/s, 10 req/s capacity
queueBalancer.registerQueue('knowledge_graph', 20, 50);   // 20 req/s, 50 req/s capacity
queueBalancer.registerQueue('agent_coordination', 10, 30); // 10 req/s, 30 req/s capacity

// Auto-optimize every 30 seconds (if in production)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    queueBalancer.autoOptimize().catch(error => {
      console.error('[QueueBalancer] Auto-optimize error:', error);
    });
  }, 30000);  // Every 30 seconds
}



