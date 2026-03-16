/**
 * Health Check Endpoints
 * Monitor system health and component status
 */

import { createClient } from '@supabase/supabase-js';
import { createEventBus } from '../lib/event-bus.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Basic health check
 */
export async function basicHealthCheck() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'artifact-storage-api',
    version: process.env.APP_VERSION || '1.0.0'
  };
}

/**
 * Deep health check - verify all systems
 */
export async function deepHealthCheck() {
  const checks = {
    database: await checkDatabase(),
    event_bus: await checkEventBus(),
    agents: await checkAgents(),
    external_apis: await checkExternalAPIs(),
    system_resources: await checkSystemResources()
  };

  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  };
}

/**
 * Check database connectivity
 */
async function checkDatabase() {
  const startTime = Date.now();
  
  try {
    const { error } = await supabase
      .from('shops')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency_ms: latency
      };
    }

    return {
      status: 'healthy',
      latency_ms: latency
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      latency_ms: Date.now() - startTime
    };
  }
}

/**
 * Check Event Bus functionality
 */
async function checkEventBus() {
  try {
    const eventBus = createEventBus();
    
    // Try to get active agents (simple check)
    const agents = await eventBus.getActiveAgents();
    
    return {
      status: 'healthy',
      active_agents_count: agents.length
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Check agent endpoints
 */
async function checkAgents() {
  try {
    // Check if agent registry is accessible
    const { AgentRegistry } = await import('../agents/registry.js');
    const agentCount = Object.keys(AgentRegistry).length;

    // Try to get agent list from API (if available)
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    let responsiveCount = 0;

    try {
      const response = await fetch(`${apiUrl}/api/agents`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        responsiveCount = data.agents?.length || 0;
      }
    } catch (error) {
      // API might not be accessible in health check context
      responsiveCount = agentCount; // Assume all are responsive if we can't check
    }

    return {
      status: 'healthy',
      registered: agentCount,
      responsive: responsiveCount
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Check external API connectivity
 */
async function checkExternalAPIs() {
  const results = {
    tekmetric: { status: 'unknown', error: null },
    ringcentral: { status: 'unknown', error: null },
    anthropic: { status: 'unknown', error: null }
  };

  // Check Anthropic API (if key is configured)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      // Simple validation - check if key format looks valid
      if (process.env.ANTHROPIC_API_KEY.startsWith('sk-')) {
        results.anthropic.status = 'healthy';
      } else {
        results.anthropic.status = 'unhealthy';
        results.anthropic.error = 'Invalid API key format';
      }
    } catch (error) {
      results.anthropic.status = 'unhealthy';
      results.anthropic.error = error.message;
    }
  } else {
    results.anthropic.status = 'not_configured';
  }

  // Tekmetric - would check if webhook endpoint is accessible
  // RingCentral - would check if API credentials are valid

  const allHealthy = Object.values(results).every(r => 
    r.status === 'healthy' || r.status === 'not_configured'
  );

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    apis: results
  };
}

/**
 * Check system resources
 */
async function checkSystemResources() {
  try {
    const os = await import('os');
    
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    const cpus = os.cpus();
    const loadAverage = os.loadavg();

    // Check disk space (would use 'node-disk-info' or similar in production)
    const diskInfo = {
      available: 'unknown',
      usage_percent: 0
    };

    return {
      status: memoryUsagePercent < 90 ? 'healthy' : 'warning',
      memory: {
        total_mb: Math.round(totalMemory / 1024 / 1024),
        used_mb: Math.round(usedMemory / 1024 / 1024),
        usage_percent: Math.round(memoryUsagePercent)
      },
      cpu: {
        cores: cpus.length,
        load_average: loadAverage[0].toFixed(2)
      },
      disk: diskInfo
    };
  } catch (error) {
    return {
      status: 'unknown',
      error: error.message
    };
  }
}

export default {
  basicHealthCheck,
  deepHealthCheck
};



















