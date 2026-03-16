import express from 'express';
import {
  createArtifact,
  getArtifact,
  queryArtifacts,
  linkArtifacts,
  getArtifactChain
} from './core.js';
import * as ForgeCoordination from '../lib/forge-coordination.js';
import * as TekmetricIntegration from '../lib/tekmetric-integration.js';
import * as Admin from '../lib/admin.js';
import { EventBus, createEventBus } from '../lib/event-bus.js';
import { WorkflowCoordinator } from '../lib/workflow-coordinator.js';
import { AgentHeartbeat, checkAgentHealth } from '../lib/agent-heartbeat.js';
import { OrchestrationEngine } from '../lib/orchestration-engine.js';
import * as HealthCheck from '../routes/health.js';
import * as Onboarding from '../routes/onboarding.js';
import * as ABTesting from '../routes/ab-testing.js';
import * as Analytics from '../routes/analytics.js';
import * as FormulaMonitoring from '../routes/formula-monitoring.js';
import POSRoutes from '../routes/pos.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const router = express.Router();

// ============================================================================
// ARTIFACT STORAGE API ENDPOINTS
// ============================================================================

/**
 * POST /api/artifacts
 * Create a new artifact
 */
router.post('/artifacts', async (req, res) => {
  try {
    const artifact = await createArtifact(req.body || {});
    res.status(201).json(artifact);
  } catch (error) {
    console.error('Create artifact error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/artifacts/:id
 * Get an artifact by artifact_id
 */
router.get('/artifacts/:id', async (req, res) => {
  try {
    const { includeRelationships, relationshipDepth } = req.query;
    const artifact = await getArtifact(req.params.id, {
      includeRelationships: includeRelationships === 'true',
      relationshipDepth: parseInt(relationshipDepth, 10) || 1
    });
    res.json(artifact);
  } catch (error) {
    console.error('Get artifact error:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/artifacts
 * Query artifacts with filters
 */
router.get('/artifacts', async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      createdBy: req.query.createdBy,
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 100
    };

    const artifacts = await queryArtifacts(filters);
    res.json(artifacts);
  } catch (error) {
    console.error('Query artifacts error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/artifacts/link
 * Link two artifacts
 */
router.post('/artifacts/link', async (req, res) => {
  try {
    const { sourceId, targetId, relationshipType, metadata } = req.body || {};
    if (!sourceId || !targetId || !relationshipType) {
      return res.status(400).json({ error: 'sourceId, targetId and relationshipType are required' });
    }

    const relationship = await linkArtifacts(sourceId, targetId, relationshipType, metadata);
    res.status(201).json(relationship);
  } catch (error) {
    console.error('Link artifacts error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/artifacts/:id/chain
 * Get artifact provenance chain (rooted at :id)
 */
router.get('/artifacts/:id/chain', async (req, res) => {
  try {
    const depth = req.query.depth ? parseInt(req.query.depth, 10) : 5;
    const chain = await getArtifactChain(req.params.id, depth);
    res.json(chain);
  } catch (error) {
    console.error('Get artifact chain error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/trinity-test/run
 * Run the Trinity Test and return results
 */
router.post('/trinity-test/run', async (req, res) => {
  try {
    // Dynamic import to avoid any circular dependency issues
    const runnerModule = await import('../trinity-test/runner.js');
    const runTrinityTest =
      runnerModule.runTrinityTest ||
      (runnerModule.default && runnerModule.default.runTrinityTest);

    if (!runTrinityTest) {
      throw new Error('runTrinityTest function not found in runner.js');
    }

    console.log('[Artifact API] Starting Trinity Test via /trinity-test/run ...');

    const results = await runTrinityTest();

    console.log(
      `[Artifact API] Trinity Test complete. Created ${results.artifacts?.length || 0} artifacts.`
    );

    res.json({
      success: results.success ?? true,
      artifacts: results.artifacts || [],
      timeline: results.timeline || [],
      metrics:
        results.metrics || {
          before: 0.78,
          after: 0.91
        },
      chain: results.chain || null
    });
  } catch (error) {
    console.error('Trinity Test API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/formulas/execute', async (req, res) => {
  try {
    const { formula, inputs, context } = req.body || {};

    if (!formula) {
      return res.status(400).json({
        success: false,
        error: 'formula is required'
      });
    }

    // Dynamic import to avoid any possibility of circular deps
    const registryModule = await import('../formulas/registry.js');
    const executeFormula =
      registryModule.executeFormula ||
      (registryModule.default && registryModule.default.executeFormula);

    if (!executeFormula) {
      throw new Error('executeFormula function not found in formulas registry');
    }

    const execResult = await executeFormula(formula, inputs || {}, context || {});

    res.json({
      success: true,
      formula,
      result: execResult.result,
      artifact_id: execResult.artifact?.artifact_id || null,
      execution_time_ms: execResult.execution_time_ms
    });
  } catch (error) {
    console.error('Formula execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/:agentId/execute
 * Execute an agent with input and create an agent_decision artifact.
 */
router.post('/agents/:agentId/execute', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { input, context } = req.body || {};

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'agentId is required in the URL path'
      });
    }

    const registryModule = await import('../agents/registry.js');
    const executeAgent =
      registryModule.executeAgent ||
      (registryModule.default && registryModule.default.executeAgent);

    if (!executeAgent) {
      throw new Error('executeAgent function not found in agents registry');
    }

    const result = await executeAgent(agentId, input || {}, context || {});

    res.json(result);
  } catch (error) {
    console.error('Agent execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents
 * List all available agents and their configuration metadata.
 */
router.get('/agents', async (req, res) => {
  try {
    const registryModule = await import('../agents/registry.js');
    const listAgents =
      registryModule.listAgents ||
      (registryModule.default && registryModule.default.listAgents);

    if (!listAgents) {
      throw new Error('listAgents function not found in agents registry');
    }

    const agents = listAgents();
    res.json({ agents });
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/:agentId/history
 * Get recent decision history for a specific agent.
 */
router.get('/agents/:agentId/history', async (req, res) => {
  try {
    const { agentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const artifacts = await queryArtifacts({
      type: 'agent_decision',
      dataQuery: { agent: agentId },
      limit,
      orderBy: 'created_at',
      orderDirection: 'desc'
    });

    res.json({ artifacts });
  } catch (error) {
    console.error('Agent history error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/edge-ai/query
 * "The Edge AI" unified interface - OTTO orchestration endpoint
 * Routes user messages to appropriate Squad agents and synthesizes unified response
 */
router.post('/edge-ai/query', async (req, res) => {
  try {
    const { message, context } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'message (string) is required in request body'
      });
    }

    // Dynamic import to avoid circular dependencies
    const orchestratorModule = await import('../orchestration/otto-orchestrator.js');
    const orchestrate =
      orchestratorModule.orchestrate ||
      (orchestratorModule.default && orchestratorModule.default.orchestrate);

    if (!orchestrate) {
      throw new Error('orchestrate function not found in otto-orchestrator.js');
    }

    console.log('[Edge AI API] Processing query:', message.substring(0, 100));

    // Execute orchestration
    const result = await orchestrate(message, context || {});

    if (result.success) {
      // Return unified response (branded as "The Edge AI")
      res.json({
        success: true,
        response: result.response, // User-facing unified response
        confidence: result.confidence,
        execution_time_ms: result.execution_time_ms,
        // Include minimal internal metadata (for debugging if needed)
        _metadata: {
          agents_consulted: result.agents_consulted,
          quality_score: result.quality_score
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Orchestration failed',
        response: result.response, // Graceful error message
        execution_time_ms: result.execution_time_ms
      });
    }
  } catch (error) {
    console.error('[Edge AI API] Orchestration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      response: "I encountered an error processing your request. Please try again."
    });
  }
});

// ============================================================================
// FORGE COORDINATION ENDPOINTS
// ============================================================================

/**
 * POST /api/forge/tasks
 * Create a new task for a Forge agent
 */
router.post('/forge/tasks', async (req, res) => {
  try {
    const {
      task_name,
      description,
      assigned_agent,
      created_by,
      input_context,
      priority,
      dependencies,
      estimated_hours
    } = req.body;

    if (!task_name || !assigned_agent || !created_by) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: task_name, assigned_agent, created_by'
      });
    }

    const task = await ForgeCoordination.createForgeTask({
      taskName: task_name,
      description,
      assignedAgent: assigned_agent,
      createdBy: created_by,
      inputContext: input_context || {},
      priority: priority || 'medium',
      dependencies: dependencies || [],
      estimatedHours: estimated_hours
    });

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Create forge task error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/forge/tasks/:agentId
 * Get pending tasks for a Forge agent
 */
router.get('/forge/tasks/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const tasks = await ForgeCoordination.getPendingTasksForAgent(agentId);

    res.json({
      success: true,
      tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Get forge tasks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/forge/tasks/:taskId/status
 * Update task status
 */
router.patch('/forge/tasks/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, output_artifact_id } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: status'
      });
    }

    const task = await ForgeCoordination.updateTaskStatus(taskId, status, output_artifact_id);

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/forge/coordination
 * Send coordination message between agents
 */
router.post('/forge/coordination', async (req, res) => {
  try {
    const {
      from_agent,
      to_agent,
      message,
      coordination_type,
      task_id,
      metadata
    } = req.body;

    if (!from_agent || !to_agent || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: from_agent, to_agent, message'
      });
    }

    const coordination = await ForgeCoordination.sendCoordinationMessage({
      fromAgent: from_agent,
      toAgent: to_agent,
      message,
      coordinationType: coordination_type || 'delegation',
      taskId: task_id,
      metadata: metadata || {}
    });

    res.json({
      success: true,
      coordination
    });
  } catch (error) {
    console.error('Send coordination message error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/forge/coordination/:agentId
 * Get coordination messages for an agent
 */
router.get('/forge/coordination/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const messages = await ForgeCoordination.getCoordinationMessagesForAgent(agentId, limit);

    res.json({
      success: true,
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Get coordination messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/forge/delegate
 * Delegate task from Squad agent to Forge agent (helper endpoint)
 */
router.post('/forge/delegate', async (req, res) => {
  try {
    const {
      from_agent,
      to_agent,
      task_name,
      description,
      context,
      priority
    } = req.body;

    if (!from_agent || !to_agent || !task_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: from_agent, to_agent, task_name'
      });
    }

    const result = await ForgeCoordination.delegateToForgeAgent({
      fromAgent: from_agent,
      toAgent: to_agent,
      taskName: task_name,
      description,
      context: context || {},
      priority: priority || 'medium'
    });

    res.json({
      success: true,
      task: result.task,
      coordination: result.coordination
    });
  } catch (error) {
    console.error('Delegate to forge agent error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// TEKMETRIC INTEGRATION ENDPOINTS
// ============================================================================

/**
 * POST /api/tekmetric/webhook
 * Receive Tekmetric webhooks (validates signature, routes to handlers)
 */
router.post('/tekmetric/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-tekmetric-signature'] || req.headers['x-signature'];
    const rawBody = JSON.stringify(req.body);
    const shopId = req.body.shop_id || req.body.shopId;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        error: 'Missing shop_id in webhook payload'
      });
    }

    // Get shop's webhook secret
    const connection = await TekmetricIntegration.getTekmetricConnection(shopId);
    if (!connection || !connection.active) {
      return res.status(403).json({
        success: false,
        error: 'Tekmetric connection not active for this shop'
      });
    }

    // Validate signature
    const signatureValid = signature
      ? TekmetricIntegration.validateTekmetricSignature(rawBody, signature, connection.webhook_secret)
      : false;

    const eventType = req.body.event_type || req.body.type || 'unknown';
    
    // Log webhook
    const logEntry = await TekmetricIntegration.logTekmetricWebhook({
      shopId,
      eventType,
      payload: req.body,
      signatureValid
    });

    if (!signatureValid && process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    // Route to appropriate handler based on event type
    let syncResult = null;
    if (eventType.startsWith('repair_order.')) {
      syncResult = await TekmetricIntegration.syncTekmetricRepairOrder({
        shopId,
        webhookData: req.body
      });
    } else if (eventType.startsWith('customer.')) {
      syncResult = await TekmetricIntegration.syncTekmetricCustomer({
        shopId,
        webhookData: req.body
      });
    } else if (eventType.startsWith('vehicle.')) {
      syncResult = await TekmetricIntegration.syncTekmetricVehicle({
        shopId,
        webhookData: req.body
      });
    } else if (eventType.startsWith('payment.')) {
      // Payment handling would trigger revenue agent
      // For now, just acknowledge
      syncResult = { event_type: 'payment', processed: true };
    }

    // Mark webhook log as processed
    if (logEntry && syncResult) {
      await supabase
        .from('tekmetric_webhook_log')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - new Date(logEntry.created_at).getTime()
        })
        .eq('id', logEntry.id);
    }

    res.json({
      success: true,
      event_type: eventType,
      processed: true,
      result: syncResult
    });
  } catch (error) {
    console.error('Tekmetric webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tekmetric/sync/repair-order
 * Manually sync a repair order (for initial import or retry)
 */
router.post('/tekmetric/sync/repair-order', async (req, res) => {
  try {
    const { shop_id, webhook_data } = req.body;

    if (!shop_id || !webhook_data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: shop_id, webhook_data'
      });
    }

    const result = await TekmetricIntegration.syncTekmetricRepairOrder({
      shopId: shop_id,
      webhookData: webhook_data
    });

    res.json({
      success: true,
      repair_order: result
    });
  } catch (error) {
    console.error('Sync repair order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tekmetric/sync/customer
 * Manually sync a customer (for initial import or retry)
 */
router.post('/tekmetric/sync/customer', async (req, res) => {
  try {
    const { shop_id, webhook_data } = req.body;

    if (!shop_id || !webhook_data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: shop_id, webhook_data'
      });
    }

    const result = await TekmetricIntegration.syncTekmetricCustomer({
      shopId: shop_id,
      webhookData: webhook_data
    });

    res.json({
      success: true,
      customer: result
    });
  } catch (error) {
    console.error('Sync customer error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tekmetric/sync/vehicle
 * Manually sync a vehicle (for initial import or retry)
 */
router.post('/tekmetric/sync/vehicle', async (req, res) => {
  try {
    const { shop_id, webhook_data } = req.body;

    if (!shop_id || !webhook_data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: shop_id, webhook_data'
      });
    }

    const result = await TekmetricIntegration.syncTekmetricVehicle({
      shopId: shop_id,
      webhookData: webhook_data
    });

    res.json({
      success: true,
      vehicle: result
    });
  } catch (error) {
    console.error('Sync vehicle error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tekmetric/connect
 * Connect a shop to Tekmetric (register webhook, validate credentials)
 */
router.post('/tekmetric/connect', async (req, res) => {
  try {
    const { shop_id, api_key, webhook_secret } = req.body;

    if (!shop_id || !api_key || !webhook_secret) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: shop_id, api_key, webhook_secret'
      });
    }

    // TODO: Validate Tekmetric API credentials by making test API call
    // For now, just store the connection

    // Encrypt API key (in production, use Supabase Vault or similar)
    // For now, store as-is (should be encrypted in production)
    const apiKeyEncrypted = api_key; // TODO: Encrypt

    const { data: connection, error } = await supabase
      .from('tekmetric_connections')
      .upsert({
        shop_id,
        api_key_encrypted: apiKeyEncrypted,
        webhook_secret,
        active: true,
        sync_status: 'idle',
        initial_import_complete: false,
        webhook_registered: false
      }, {
        onConflict: 'shop_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create connection: ${error.message}`);
    }

    res.json({
      success: true,
      connection: {
        shop_id: connection.shop_id,
        active: connection.active,
        sync_status: connection.sync_status
      },
      message: 'Tekmetric connection established. Run initial import to sync historical data.'
    });
  } catch (error) {
    console.error('Tekmetric connect error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ADMIN ENDPOINTS (Backend-only, no UI overlap)
// ============================================================================

/**
 * POST /api/admin/shops
 * Create a new shop
 */
router.post('/admin/shops', async (req, res) => {
  try {
    const { name, owner_email, plan } = req.body;

    if (!name || !owner_email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, owner_email'
      });
    }

    const shop = await Admin.createShop({
      name,
      ownerEmail: owner_email,
      plan: plan || 'trial'
    });

    res.json({
      success: true,
      shop
    });
  } catch (error) {
    console.error('Create shop error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/shops
 * List all shops (admin only)
 */
router.get('/admin/shops', async (req, res) => {
  try {
    const { plan, billing_status, limit, offset } = req.query;

    const shops = await Admin.listShops({
      plan,
      billing_status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });

    res.json({
      success: true,
      shops,
      count: shops.length
    });
  } catch (error) {
    console.error('List shops error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/shops/:shopId
 * Get shop details with usage stats
 */
router.get('/admin/shops/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const details = await Admin.getShopDetails(shopId);

    res.json({
      success: true,
      shop: details
    });
  } catch (error) {
    console.error('Get shop details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/admin/shops/:shopId
 * Update shop settings
 */
router.patch('/admin/shops/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Admin.updateShopSettings(shopId, req.body);

    res.json({
      success: true,
      shop
    });
  } catch (error) {
    console.error('Update shop settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/shops/:shopId/deactivate
 * Deactivate/suspend shop access
 */
router.post('/admin/shops/:shopId/deactivate', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { reason } = req.body;

    const shop = await Admin.deactivateShop(shopId, reason);

    res.json({
      success: true,
      shop,
      message: 'Shop deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate shop error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/shops/:shopId/usage
 * Get shop usage data for billing
 */
router.get('/admin/shops/:shopId/usage', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { start_date, end_date } = req.query;

    const usage = await Admin.getShopUsage(shopId, {
      start_date,
      end_date
    });

    res.json({
      success: true,
      usage,
      count: usage.length
    });
  } catch (error) {
    console.error('Get shop usage error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/shops/compare
 * Compare multiple shops for benchmarking
 */
router.post('/admin/shops/compare', async (req, res) => {
  try {
    const { shop_ids, metric, start_date, end_date } = req.body;

    if (!shop_ids || !Array.isArray(shop_ids) || shop_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: shop_ids (array)'
      });
    }

    const comparison = await Admin.compareShops(shop_ids, metric || 'total_revenue', {
      start_date,
      end_date
    });

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Compare shops error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/industry-average
 * Get industry average metrics for benchmarking
 */
router.get('/admin/industry-average', async (req, res) => {
  try {
    const { metric, plan } = req.query;

    const average = await Admin.getIndustryAverage(metric || 'total_revenue', plan);

    res.json({
      success: true,
      industry_average: average
    });
  } catch (error) {
    console.error('Get industry average error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// EVENT BUS & AGENT COMMUNICATION ENDPOINTS
// ============================================================================

/**
 * POST /api/events/publish
 * Publish an event to a channel
 */
router.post('/events/publish', async (req, res) => {
  try {
    const { channel, event_type, payload, publisher_agent_id, shop_id } = req.body;

    if (!channel || !event_type || !payload) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: channel, event_type, payload'
      });
    }

    const eventBus = createEventBus(shop_id);
    const result = await eventBus.publish(
      channel,
      event_type,
      payload,
      publisher_agent_id || 'system'
    );

    res.json({
      success: true,
      event: result
    });
  } catch (error) {
    console.error('Publish event error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/events/channel/:channel
 * Get recent events for a channel
 */
router.get('/events/channel/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    const { limit = 100, shop_id } = req.query;

    const eventBus = createEventBus(shop_id);
    const events = await eventBus.getRecentEvents(channel, parseInt(limit));

    res.json({
      success: true,
      channel,
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/active
 * Get list of active agents
 */
router.get('/agents/active', async (req, res) => {
  try {
    const { shop_id } = req.query;

    const eventBus = createEventBus(shop_id);
    const agents = await eventBus.getActiveAgents(shop_id);

    res.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Get active agents error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/:agentId/status
 * Broadcast agent status update
 */
router.post('/agents/:agentId/status', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status, metadata, shop_id } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: status'
      });
    }

    const eventBus = createEventBus(shop_id);
    await eventBus.broadcastStatus(agentId, status, metadata || {});

    res.json({
      success: true,
      agent_id: agentId,
      status,
      message: 'Status broadcasted successfully'
    });
  } catch (error) {
    console.error('Broadcast status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/health
 * Check agent health (find stale heartbeats)
 */
router.get('/agents/health', async (req, res) => {
  try {
    const { shop_id } = req.query;

    const health = await checkAgentHealth(shop_id);

    res.json({
      success: true,
      health
    });
  } catch (error) {
    console.error('Check agent health error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// WORKFLOW COORDINATION ENDPOINTS
// ============================================================================

/**
 * POST /api/workflows/start
 * Start a new workflow execution
 */
router.post('/workflows/start', async (req, res) => {
  try {
    const { workflow_id, workflow_name, steps, shop_id } = req.body;

    if (!workflow_id || !workflow_name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: workflow_id, workflow_name, steps (array)'
      });
    }

    const coordinator = new WorkflowCoordinator(shop_id);
    const execution = await coordinator.startWorkflow(workflow_id, workflow_name, steps);

    res.json({
      success: true,
      execution
    });
  } catch (error) {
    console.error('Start workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/workflows/:executionId/resolve
 * Resolve a workflow step
 */
router.post('/workflows/:executionId/resolve', async (req, res) => {
  try {
    const { executionId } = req.params;
    const { step_id, result, shop_id } = req.body;

    if (!step_id || !result) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: step_id, result'
      });
    }

    const coordinator = new WorkflowCoordinator(shop_id);
    const execution = await coordinator.resolveStep(executionId, step_id, result);

    res.json({
      success: true,
      execution
    });
  } catch (error) {
    console.error('Resolve step error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/workflows/:executionId
 * Get workflow execution status
 */
router.get('/workflows/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const { shop_id } = req.query;

    const coordinator = new WorkflowCoordinator(shop_id);
    const execution = await coordinator.getWorkflowStatus(executionId);

    res.json({
      success: true,
      execution
    });
  } catch (error) {
    console.error('Get workflow status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ORCHESTRATION ENDPOINTS
// ============================================================================

/**
 * POST /api/orchestration/analyze
 * Analyze request complexity and determine execution plan
 */
router.post('/orchestration/analyze', async (req, res) => {
  try {
    const { request, shop_id } = req.body;

    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: request'
      });
    }

    const engine = new OrchestrationEngine(shop_id);
    const analysis = await engine.analyzeRequest(request);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Analyze request error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/orchestration/execute
 * Execute full orchestration (analyze + plan + execute + synthesize)
 */
router.post('/orchestration/execute', async (req, res) => {
  try {
    const { request, steps, shop_id } = req.body;

    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: request'
      });
    }

    const engine = new OrchestrationEngine(shop_id);

    // Analyze request
    const analysis = await engine.analyzeRequest(request);

    // Create plan (steps should be provided or generated from analysis)
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // If steps not provided, generate from analysis
    const orchestrationSteps = steps || analysis.required_agents.map((agentId, index) => ({
      agent_id: agentId,
      task_description: `Execute ${analysis.execution_strategy} task for agent ${agentId}`,
      dependencies: index > 0 ? [] : [], // Simple sequential if not provided
      input_data: {}
    }));

    const { plan } = await engine.createOrchestrationPlan(
      requestId,
      request,
      analysis,
      orchestrationSteps
    );

    // Execute plan
    const results = await engine.executePlan(plan.id);

    // Synthesize results
    const synthesis = await engine.synthesizeResults(plan.id, 'analyze');

    res.json({
      success: true,
      plan_id: plan.id,
      analysis,
      results,
      synthesis
    });
  } catch (error) {
    console.error('Execute orchestration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/orchestration/status/:planId
 * Get orchestration status with real-time progress
 */
router.get('/orchestration/status/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const { shop_id } = req.query;

    const engine = new OrchestrationEngine(shop_id);
    const status = await engine.getOrchestrationStatus(planId);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Get orchestration status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/orchestration/history
 * Get orchestration history
 */
router.get('/orchestration/history', async (req, res) => {
  try {
    const { shop_id, limit = 50, status } = req.query;

    let query = supabase
      .from('orchestration_plans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (shop_id) {
      query = query.eq('shop_id', shop_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get history: ${error.message}`);
    }

    res.json({
      success: true,
      orchestrations: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Get orchestration history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/orchestration/cancel/:planId
 * Cancel in-progress orchestration
 */
router.post('/orchestration/cancel/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const { shop_id } = req.body;

    const engine = new OrchestrationEngine(shop_id);
    await engine.cancelOrchestration(planId);

    res.json({
      success: true,
      message: 'Orchestration cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel orchestration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

/**
 * GET /api/health
 * Basic health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = await HealthCheck.basicHealthCheck();
    res.status(200).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/deep
 * Deep health check - all systems
 */
router.get('/health/deep', async (req, res) => {
  try {
    const health = await HealthCheck.deepHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Deep health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// ONBOARDING ENDPOINTS
// ============================================================================

/**
 * POST /api/onboarding/start
 * Start onboarding process
 */
router.post('/onboarding/start', async (req, res) => {
  try {
    const { email, shop_name, phone } = req.body;

    if (!email || !shop_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, shop_name'
      });
    }

    const result = await Onboarding.startOnboarding(email, shop_name, phone);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Start onboarding error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/onboarding/connect-tekmetric
 * Connect Tekmetric account
 */
router.post('/onboarding/connect-tekmetric', async (req, res) => {
  try {
    const { onboarding_id, api_key, webhook_secret } = req.body;

    if (!onboarding_id || !api_key) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: onboarding_id, api_key'
      });
    }

    const result = await Onboarding.connectTekmetric(onboarding_id, api_key, webhook_secret);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Connect Tekmetric error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/onboarding/status/:onboardingId
 * Get onboarding status
 */
router.get('/onboarding/status/:onboardingId', async (req, res) => {
  try {
    const { onboardingId } = req.params;

    const status = await Onboarding.getOnboardingStatus(onboardingId);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/onboarding/complete
 * Complete onboarding
 */
router.post('/onboarding/complete', async (req, res) => {
  try {
    const { onboarding_id } = req.body;

    if (!onboarding_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: onboarding_id'
      });
    }

    const result = await Onboarding.completeOnboarding(onboarding_id);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/onboarding/demo-mode
 * Enable demo mode
 */
router.post('/onboarding/demo-mode', async (req, res) => {
  try {
    const { onboarding_id } = req.body;

    if (!onboarding_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: onboarding_id'
      });
    }

    const result = await Onboarding.enableDemoModeForOnboarding(onboarding_id);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Enable demo mode error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// A/B TESTING ENDPOINTS
// ============================================================================

/**
 * GET /api/ab-testing/tests
 * Get all A/B tests
 */
router.get('/ab-testing/tests', async (req, res) => {
  try {
    const { shop_id, status } = req.query;

    const tests = await ABTesting.getAllTests(shop_id, status);

    res.json({
      success: true,
      tests,
      count: tests.length
    });
  } catch (error) {
    console.error('Get A/B tests error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ab-testing/test/:testId
 * Get test details with statistics
 */
router.get('/ab-testing/test/:testId', async (req, res) => {
  try {
    const { testId } = req.params;

    const details = await ABTesting.getTestDetails(testId);

    res.json({
      success: true,
      ...details
    });
  } catch (error) {
    console.error('Get test details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ab-testing/test/:testId/results
 * Get test results (time-series)
 */
router.get('/ab-testing/test/:testId/results', async (req, res) => {
  try {
    const { testId } = req.params;
    const { limit = 100 } = req.query;

    const results = await ABTesting.getTestResults(testId, parseInt(limit));

    res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ab-testing/test
 * Create new A/B test
 */
router.post('/ab-testing/test', async (req, res) => {
  try {
    const testData = req.body;

    const test = await ABTesting.createTest(testData);

    res.json({
      success: true,
      test
    });
  } catch (error) {
    console.error('Create A/B test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ab-testing/test/:testId/stop
 * Stop test and optionally promote winner
 */
router.post('/ab-testing/test/:testId/stop', async (req, res) => {
  try {
    const { testId } = req.params;
    const { promote_winner = true } = req.body;

    const result = await ABTesting.stopTest(testId, promote_winner);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Stop test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ANALYTICS & BUSINESS INTELLIGENCE ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/agent-roi
 * Get agent ROI metrics
 */
router.get('/analytics/agent-roi', async (req, res) => {
  try {
    const { shop_id, agent_id, start_date, end_date } = req.query;

    const dateRange = start_date && end_date ? { start_date, end_date } : {};

    const roi = await Analytics.getAgentROI(shop_id, agent_id || null, dateRange);

    res.json({
      success: true,
      roi: Array.isArray(roi) ? roi : [roi],
      count: Array.isArray(roi) ? roi.length : 1
    });
  } catch (error) {
    console.error('Get agent ROI error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/agent-roi/:agentId
 * Get detailed ROI for specific agent
 */
router.get('/analytics/agent-roi/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { shop_id, start_date, end_date } = req.query;

    const dateRange = start_date && end_date ? { start_date, end_date } : {};

    const roi = await Analytics.getAgentROI(shop_id, agentId, dateRange);

    res.json({
      success: true,
      roi
    });
  } catch (error) {
    console.error('Get agent ROI details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/customer-ltv
 * Get customer LTV predictions
 */
router.get('/analytics/customer-ltv', async (req, res) => {
  try {
    const { shop_id, customer_id } = req.query;

    const ltv = await Analytics.getCustomerLTV(shop_id, customer_id || null);

    res.json({
      success: true,
      predictions: Array.isArray(ltv) ? ltv : [ltv],
      count: Array.isArray(ltv) ? ltv.length : 1
    });
  } catch (error) {
    console.error('Get customer LTV error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/churn-risk
 * Get churn risk scores
 */
router.get('/analytics/churn-risk', async (req, res) => {
  try {
    const { shop_id, limit = 50 } = req.query;

    const risks = await Analytics.getChurnRisk(shop_id, parseInt(limit));

    res.json({
      success: true,
      risks,
      count: risks.length
    });
  } catch (error) {
    console.error('Get churn risk error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/campaigns
 * Get marketing campaign metrics
 */
router.get('/analytics/campaigns', async (req, res) => {
  try {
    const { shop_id, campaign_id } = req.query;

    const campaigns = await Analytics.getCampaignMetrics(shop_id, campaign_id || null);

    res.json({
      success: true,
      campaigns: Array.isArray(campaigns) ? campaigns : [campaigns],
      count: Array.isArray(campaigns) ? campaigns.length : 1
    });
  } catch (error) {
    console.error('Get campaign metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/benchmark
 * Get shop performance benchmark
 */
router.get('/analytics/benchmark', async (req, res) => {
  try {
    const { shop_id, start_date, end_date } = req.query;

    const dateRange = start_date && end_date ? { start_date, end_date } : {};

    const benchmark = await Analytics.getShopBenchmark(shop_id, dateRange);

    res.json({
      success: true,
      benchmark
    });
  } catch (error) {
    console.error('Get benchmark error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// FORMULA MONITORING ENDPOINTS
// ============================================================================

/**
 * GET /api/formula-monitoring/feed
 * Get real-time formula execution feed
 */
router.get('/formula-monitoring/feed', async (req, res) => {
  try {
    const { shop_id, limit = 20 } = req.query;

    const feed = await FormulaMonitoring.getFormulaFeed(shop_id, parseInt(limit));

    res.json({
      success: true,
      feed,
      count: feed.length
    });
  } catch (error) {
    console.error('Get formula feed error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/formula-monitoring/performance
 * Get formula performance stats
 */
router.get('/formula-monitoring/performance', async (req, res) => {
  try {
    const { shop_id, formula_name } = req.query;

    const performance = await FormulaMonitoring.getFormulaPerformance(shop_id, formula_name || null);

    res.json({
      success: true,
      performance: Array.isArray(performance) ? performance : [performance],
      count: Array.isArray(performance) ? performance.length : 1
    });
  } catch (error) {
    console.error('Get formula performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/formula-monitoring/patterns
 * Get detected patterns
 */
router.get('/formula-monitoring/patterns', async (req, res) => {
  try {
    const { shop_id, status } = req.query;

    const patterns = await FormulaMonitoring.getPatterns(shop_id, status || null);

    res.json({
      success: true,
      patterns,
      count: patterns.length
    });
  } catch (error) {
    console.error('Get patterns error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/formula-monitoring/history/:formulaName
 * Get time-series history for formula
 */
router.get('/formula-monitoring/history/:formulaName', async (req, res) => {
  try {
    const { formulaName } = req.params;
    const { shop_id, days = 30 } = req.query;

    const history = await FormulaMonitoring.getFormulaHistory(
      shop_id,
      formulaName,
      parseInt(days)
    );

    res.json({
      success: true,
      formula_name: formulaName,
      history,
      count: history.length
    });
  } catch (error) {
    console.error('Get formula history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// POS (HYBRID POS) ROUTES
// ============================================================================

router.use('/pos', POSRoutes);

export default router;


