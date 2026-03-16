/**
 * Performance Monitoring
 * Tracks API response times, database performance, agent execution duration
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Performance metrics storage
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiResponses: [],
      databaseQueries: [],
      agentExecutions: [],
      eventBusLatency: []
    };
  }

  /**
   * Record API response time
   */
  recordAPIResponse(endpoint, method, statusCode, durationMs) {
    this.metrics.apiResponses.push({
      endpoint,
      method,
      statusCode,
      durationMs,
      timestamp: Date.now()
    });

    // Keep only last 1000 entries
    if (this.metrics.apiResponses.length > 1000) {
      this.metrics.apiResponses = this.metrics.apiResponses.slice(-1000);
    }
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(table, operation, durationMs) {
    this.metrics.databaseQueries.push({
      table,
      operation,
      durationMs,
      timestamp: Date.now()
    });

    if (this.metrics.databaseQueries.length > 1000) {
      this.metrics.databaseQueries = this.metrics.databaseQueries.slice(-1000);
    }
  }

  /**
   * Record agent execution duration
   */
  recordAgentExecution(agentId, durationMs, success) {
    this.metrics.agentExecutions.push({
      agentId,
      durationMs,
      success,
      timestamp: Date.now()
    });

    if (this.metrics.agentExecutions.length > 1000) {
      this.metrics.agentExecutions = this.metrics.agentExecutions.slice(-1000);
    }
  }

  /**
   * Record Event Bus message latency
   */
  recordEventBusLatency(channel, eventType, latencyMs) {
    this.metrics.eventBusLatency.push({
      channel,
      eventType,
      latencyMs,
      timestamp: Date.now()
    });

    if (this.metrics.eventBusLatency.length > 1000) {
      this.metrics.eventBusLatency = this.metrics.eventBusLatency.slice(-1000);
    }
  }

  /**
   * Calculate percentiles
   */
  calculatePercentiles(values, percentiles = [50, 95, 99]) {
    const sorted = [...values].sort((a, b) => a - b);
    const results = {};

    percentiles.forEach(p => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      results[`p${p}`] = sorted[Math.max(0, index)] || 0;
    });

    return results;
  }

  /**
   * Get API performance metrics
   */
  getAPIMetrics() {
    const durations = this.metrics.apiResponses.map(m => m.durationMs);
    const percentiles = this.calculatePercentiles(durations);

    const byEndpoint = {};
    this.metrics.apiResponses.forEach(m => {
      if (!byEndpoint[m.endpoint]) {
        byEndpoint[m.endpoint] = [];
      }
      byEndpoint[m.endpoint].push(m.durationMs);
    });

    const endpointStats = {};
    Object.keys(byEndpoint).forEach(endpoint => {
      endpointStats[endpoint] = this.calculatePercentiles(byEndpoint[endpoint]);
    });

    return {
      overall: {
        count: durations.length,
        ...percentiles,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length || 0
      },
      byEndpoint: endpointStats
    };
  }

  /**
   * Get database performance metrics
   */
  getDatabaseMetrics() {
    const durations = this.metrics.databaseQueries.map(m => m.durationMs);
    const percentiles = this.calculatePercentiles(durations);

    const byTable = {};
    this.metrics.databaseQueries.forEach(m => {
      if (!byTable[m.table]) {
        byTable[m.table] = [];
      }
      byTable[m.table].push(m.durationMs);
    });

    const tableStats = {};
    Object.keys(byTable).forEach(table => {
      tableStats[table] = this.calculatePercentiles(byTable[table]);
    });

    return {
      overall: {
        count: durations.length,
        ...percentiles,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length || 0
      },
      byTable: tableStats
    };
  }

  /**
   * Get agent execution metrics
   */
  getAgentMetrics() {
    const durations = this.metrics.agentExecutions.map(m => m.durationMs);
    const successCount = this.metrics.agentExecutions.filter(m => m.success).length;
    const failureCount = this.metrics.agentExecutions.length - successCount;

    const byAgent = {};
    this.metrics.agentExecutions.forEach(m => {
      if (!byAgent[m.agentId]) {
        byAgent[m.agentId] = { durations: [], successes: 0, failures: 0 };
      }
      byAgent[m.agentId].durations.push(m.durationMs);
      if (m.success) {
        byAgent[m.agentId].successes++;
      } else {
        byAgent[m.agentId].failures++;
      }
    });

    const agentStats = {};
    Object.keys(byAgent).forEach(agentId => {
      const agent = byAgent[agentId];
      agentStats[agentId] = {
        ...this.calculatePercentiles(agent.durations),
        success_rate: agent.durations.length > 0 
          ? agent.successes / agent.durations.length 
          : 0,
        total_executions: agent.durations.length
      };
    });

    return {
      overall: {
        count: durations.length,
        success_rate: durations.length > 0 ? successCount / durations.length : 0,
        failure_rate: durations.length > 0 ? failureCount / durations.length : 0,
        ...this.calculatePercentiles(durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length || 0
      },
      byAgent: agentStats
    };
  }

  /**
   * Get Event Bus latency metrics
   */
  getEventBusMetrics() {
    const latencies = this.metrics.eventBusLatency.map(m => m.latencyMs);
    const percentiles = this.calculatePercentiles(latencies);

    return {
      overall: {
        count: latencies.length,
        ...percentiles,
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length || 0
      }
    };
  }

  /**
   * Get all metrics summary
   */
  getAllMetrics() {
    return {
      api: this.getAPIMetrics(),
      database: this.getDatabaseMetrics(),
      agents: this.getAgentMetrics(),
      eventBus: this.getEventBusMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics = {
      apiResponses: [],
      databaseQueries: [],
      agentExecutions: [],
      eventBusLatency: []
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Express middleware to record API response times
 */
export function performanceMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    performanceMonitor.recordAPIResponse(
      req.path,
      req.method,
      res.statusCode,
      duration
    );
  });

  next();
}

export default {
  performanceMonitor,
  performanceMiddleware
};



















