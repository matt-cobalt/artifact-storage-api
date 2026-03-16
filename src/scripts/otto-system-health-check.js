import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { orchestrate } from '../orchestration/otto-orchestrator.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * OTTO System Health Check
 * Comprehensive validation of all system components
 */

const HEALTH_CHECK_RESULTS = {
  database: { status: 'unknown', details: [] },
  orchestration: { status: 'unknown', details: [] },
  agents: { status: 'unknown', details: [] },
  api: { status: 'unknown', details: [] },
  performance: { status: 'unknown', details: [] }
};

async function checkDatabase() {
  console.log('🗄️  Checking Database...');
  const checks = [];

  try {
    // Check artifacts table
    const { data: artifacts, error: artifactsError } = await supabase
      .from('artifacts')
      .select('count')
      .limit(1);

    if (artifactsError) {
      checks.push({ check: 'artifacts table', status: '❌', error: artifactsError.message });
    } else {
      checks.push({ check: 'artifacts table', status: '✅', message: 'Accessible' });
    }

    // Check otto_orchestrations table
    const { data: orchestrations, error: orchError } = await supabase
      .from('otto_orchestrations')
      .select('count')
      .limit(1);

    if (orchError) {
      // Table might not exist or name might be different
      checks.push({ check: 'otto_orchestrations table', status: '⚠️', error: orchError.message });
    } else {
      checks.push({ check: 'otto_orchestrations table', status: '✅', message: 'Accessible' });
    }

    // Check agent_performance_metrics table
    const { data: metrics, error: metricsError } = await supabase
      .from('agent_performance_metrics')
      .select('count')
      .limit(1);

    if (metricsError) {
      checks.push({ check: 'agent_performance_metrics table', status: '⚠️', error: metricsError.message });
    } else {
      checks.push({ check: 'agent_performance_metrics table', status: '✅', message: 'Accessible' });
    }

    // Check otto_errors table (optional)
    const { data: errors, error: errorsError } = await supabase
      .from('otto_errors')
      .select('count')
      .limit(1);

    if (errorsError && !errorsError.message.includes('does not exist')) {
      checks.push({ check: 'otto_errors table', status: '⚠️', error: errorsError.message });
    } else {
      checks.push({ check: 'otto_errors table', status: '✅', message: 'Accessible (or optional)' });
    }

    const allPassed = checks.every(c => c.status === '✅');
    HEALTH_CHECK_RESULTS.database = {
      status: allPassed ? 'healthy' : 'degraded',
      details: checks
    };

    checks.forEach(c => {
      console.log(`  ${c.status} ${c.check}: ${c.message || c.error || 'OK'}`);
    });

  } catch (err) {
    HEALTH_CHECK_RESULTS.database = {
      status: 'error',
      details: [{ error: err.message }]
    };
    console.log(`  ❌ Database check failed: ${err.message}`);
  }

  console.log('');
}

async function checkOrchestration() {
  console.log('🧠 Checking Orchestration System...');
  const checks = [];

  try {
    // Test orchestration with simple query
    const testMessage = 'test health check';
    const startTime = Date.now();
    
    const result = await orchestrate(testMessage, {
      shop_id: 'health_check',
      source: 'system_health_check'
    });

    const executionTime = Date.now() - startTime;

    if (result.success) {
      checks.push({ check: 'orchestration execution', status: '✅', message: 'Working' });
      checks.push({ 
        check: 'response time', 
        status: executionTime < 5000 ? '✅' : '⚠️', 
        message: `${executionTime}ms (target: <3000ms)` 
      });
      checks.push({ 
        check: 'agents consulted', 
        status: '✅', 
        message: result.agents_consulted?.join(', ') || 'none' 
      });
    } else {
      checks.push({ check: 'orchestration execution', status: '❌', error: result.error });
    }

    HEALTH_CHECK_RESULTS.orchestration = {
      status: result.success ? 'healthy' : 'error',
      details: checks,
      execution_time_ms: executionTime
    };

    checks.forEach(c => {
      console.log(`  ${c.status} ${c.check}: ${c.message || c.error || 'OK'}`);
    });

  } catch (err) {
    HEALTH_CHECK_RESULTS.orchestration = {
      status: 'error',
      details: [{ error: err.message }]
    };
    console.log(`  ❌ Orchestration check failed: ${err.message}`);
  }

  console.log('');
}

async function checkAgents() {
  console.log('👥 Checking Squad Agents...');
  const checks = [];

  try {
    // Check if agents can be imported
    const { executeAgent } = await import('../agents/registry.js');
    
    // Test a few key agents
    const testAgents = ['otto', 'cal', 'dex', 'miles', 'roy'];
    
    for (const agentId of testAgents) {
      try {
        const agent = await executeAgent(agentId, { test: true }, { triggered_by: 'health_check' });
        checks.push({ 
          check: `${agentId} agent`, 
          status: agent.success ? '✅' : '⚠️', 
          message: agent.success ? 'Available' : 'Error: ' + (agent.error || 'unknown') 
        });
      } catch (err) {
        checks.push({ 
          check: `${agentId} agent`, 
          status: '❌', 
          error: err.message 
        });
      }
    }

    const allPassed = checks.every(c => c.status === '✅');
    const somePassed = checks.some(c => c.status === '✅');

    HEALTH_CHECK_RESULTS.agents = {
      status: allPassed ? 'healthy' : (somePassed ? 'degraded' : 'error'),
      details: checks
    };

    checks.forEach(c => {
      console.log(`  ${c.status} ${c.check}: ${c.message || c.error || 'OK'}`);
    });

  } catch (err) {
    HEALTH_CHECK_RESULTS.agents = {
      status: 'error',
      details: [{ error: err.message }]
    };
    console.log(`  ❌ Agents check failed: ${err.message}`);
  }

  console.log('');
}

async function checkAPI() {
  console.log('🌐 Checking API Endpoints...');
  const checks = [];

  try {
    const baseUrl = process.env.API_URL || 'http://localhost:3000';

    // Check health endpoint
    try {
      const healthResponse = await fetch(`${baseUrl}/health`);
      if (healthResponse.ok) {
        checks.push({ check: 'health endpoint', status: '✅', message: 'Responding' });
      } else {
        checks.push({ check: 'health endpoint', status: '⚠️', message: `Status: ${healthResponse.status}` });
      }
    } catch (err) {
      checks.push({ check: 'health endpoint', status: '❌', error: 'Not reachable - API server may be down' });
    }

    // Check agents endpoint
    try {
      const agentsResponse = await fetch(`${baseUrl}/api/agents`);
      if (agentsResponse.ok) {
        const agents = await agentsResponse.json();
        checks.push({ check: 'agents endpoint', status: '✅', message: `${agents.length || 0} agents available` });
      } else {
        checks.push({ check: 'agents endpoint', status: '⚠️', message: `Status: ${agentsResponse.status}` });
      }
    } catch (err) {
      checks.push({ check: 'agents endpoint', status: '❌', error: 'Not reachable' });
    }

    // Check edge-ai endpoint (POST, so we'll just check if server is up)
    checks.push({ check: 'edge-ai endpoint', status: '⚠️', message: 'Requires POST request to test' });

    const allPassed = checks.every(c => c.status === '✅');
    const somePassed = checks.some(c => c.status === '✅');

    HEALTH_CHECK_RESULTS.api = {
      status: allPassed ? 'healthy' : (somePassed ? 'degraded' : 'error'),
      details: checks
    };

    checks.forEach(c => {
      console.log(`  ${c.status} ${c.check}: ${c.message || c.error || 'OK'}`);
    });

  } catch (err) {
    HEALTH_CHECK_RESULTS.api = {
      status: 'error',
      details: [{ error: err.message }]
    };
    console.log(`  ❌ API check failed: ${err.message}`);
  }

  console.log('');
}

async function checkPerformance() {
  console.log('⚡ Checking Performance Metrics...');
  const checks = [];

  try {
    // Check recent orchestration performance
    const { data: recentOrchs, error } = await supabase
      .from('otto_orchestrations')
      .select('execution_time_ms, synthesis_quality, fallback_used')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      checks.push({ check: 'performance data', status: '⚠️', message: 'Could not query performance data: ' + error.message });
    } else if (recentOrchs && recentOrchs.length > 0) {
      const avgTime = recentOrchs.reduce((sum, o) => sum + (o.execution_time_ms || 0), 0) / recentOrchs.length;
      const avgQuality = recentOrchs.reduce((sum, o) => sum + (o.synthesis_quality || 0), 0) / recentOrchs.length;
      const fallbackRate = recentOrchs.filter(o => o.fallback_used).length / recentOrchs.length;

      checks.push({ 
        check: 'avg response time', 
        status: avgTime < 3000 ? '✅' : '⚠️', 
        message: `${Math.round(avgTime)}ms (target: <3000ms)` 
      });
      checks.push({ 
        check: 'avg quality score', 
        status: avgQuality > 0.7 ? '✅' : '⚠️', 
        message: `${avgQuality.toFixed(2)} (target: >0.7)` 
      });
      checks.push({ 
        check: 'fallback rate', 
        status: fallbackRate < 0.1 ? '✅' : '⚠️', 
        message: `${(fallbackRate * 100).toFixed(1)}% (target: <10%)` 
      });
    } else {
      checks.push({ check: 'performance data', status: '⚠️', message: 'No recent orchestrations to analyze' });
    }

    HEALTH_CHECK_RESULTS.performance = {
      status: checks.every(c => c.status === '✅') ? 'healthy' : 'degraded',
      details: checks
    };

    checks.forEach(c => {
      console.log(`  ${c.status} ${c.check}: ${c.message || 'OK'}`);
    });

  } catch (err) {
    HEALTH_CHECK_RESULTS.performance = {
      status: 'error',
      details: [{ error: err.message }]
    };
    console.log(`  ❌ Performance check failed: ${err.message}`);
  }

  console.log('');
}

function generateSummary() {
  console.log('='.repeat(60));
  console.log('HEALTH CHECK SUMMARY');
  console.log('='.repeat(60));

  const components = [
    { name: 'Database', result: HEALTH_CHECK_RESULTS.database },
    { name: 'Orchestration', result: HEALTH_CHECK_RESULTS.orchestration },
    { name: 'Agents', result: HEALTH_CHECK_RESULTS.agents },
    { name: 'API', result: HEALTH_CHECK_RESULTS.api },
    { name: 'Performance', result: HEALTH_CHECK_RESULTS.performance }
  ];

  components.forEach(comp => {
    const statusIcon = comp.result.status === 'healthy' ? '✅' : 
                      comp.result.status === 'degraded' ? '⚠️' : '❌';
    console.log(`${statusIcon} ${comp.name}: ${comp.result.status.toUpperCase()}`);
  });

  const allHealthy = components.every(c => c.result.status === 'healthy');
  const anyErrors = components.some(c => c.result.status === 'error');

  console.log('\n' + '='.repeat(60));
  if (allHealthy) {
    console.log('🎉 SYSTEM STATUS: ALL SYSTEMS HEALTHY');
  } else if (anyErrors) {
    console.log('⚠️  SYSTEM STATUS: SOME COMPONENTS HAVE ERRORS');
  } else {
    console.log('⚠️  SYSTEM STATUS: SYSTEM DEGRADED (BUT OPERATIONAL)');
  }
  console.log('='.repeat(60));

  return { allHealthy, anyErrors, components };
}

async function runHealthCheck() {
  console.log('='.repeat(60));
  console.log('OTTO SYSTEM HEALTH CHECK');
  console.log('='.repeat(60));
  console.log(`Time: ${new Date().toISOString()}\n`);

  await checkDatabase();
  await checkOrchestration();
  await checkAgents();
  await checkAPI();
  await checkPerformance();

  const summary = generateSummary();

  return summary;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || !process.env.RUN_FROM_TEST) {
  runHealthCheck()
    .then(summary => {
      process.exit(summary.allHealthy ? 0 : (summary.anyErrors ? 2 : 1));
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

export default runHealthCheck;









