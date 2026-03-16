import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { executeAgent } from '../agents/registry.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * OTTO ORCHESTRATOR
 * Routes user messages to Squad agents and synthesizes unified responses
 * branded as "The Edge AI"
 */

// Agent-to-intent mapping (which agents handle which intents)
// All 13 Squad agents mapped to their specific intents
const AGENT_INTENT_MAP = {
  diagnostics: ['dex'],        // DEX - Diagnostics Triage
  pricing: ['cal'],            // CAL - Pricing & Estimates
  scheduling: ['flo'],         // FLO - Operations Orchestration
  production: ['mac'],         // MAC - Production Manager
  parts: ['kit'],              // KIT - Parts & Inventory
  vehicle: ['vin'],            // VIN - Vehicle Intelligence
  retention: ['miles'],        // MILES - Customer Retention
  business_intel: ['roy'],     // ROY - Business Intelligence
  financial: ['pennyp'],       // PENNYP - Financial Operations
  marketing: ['blaze'],        // BLAZE - Marketing Intelligence
  compliance: ['lance'],       // LANCE - Compliance & Fraud Prevention
  analytics: ['oracle'],       // ORACLE - Operational Analytics
  service_advisor: ['otto']    // OTTO - Gateway & Intake (fallback/default)
};

// Default agent context for different intent types
const INTENT_CONTEXT_TEMPLATES = {
  diagnostics: {
    request_type: 'diagnostic_analysis',
    include_vehicle_data: true,
    include_dtc_codes: true,
    include_symptoms: true
  },
  pricing: {
    request_type: 'pricing_analysis',
    include_history: true,
    include_market_data: true,
    include_approval_probability: true
  },
  scheduling: {
    request_type: 'scheduling_coordination',
    include_timing: true,
    include_bay_availability: true,
    include_workflow_dependencies: true
  },
  production: {
    request_type: 'production_management',
    include_shop_floor_status: true,
    include_tech_assignments: true,
    include_wrench_time: true
  },
  parts: {
    request_type: 'parts_inventory',
    include_availability: true,
    include_supplier_data: true,
    include_pricing: true
  },
  vehicle: {
    request_type: 'vehicle_intelligence',
    include_vin_decode: true,
    include_service_history: true,
    include_recalls: true
  },
  retention: {
    request_type: 'retention_analysis',
    include_churn_risk: true,
    include_loyalty_data: true,
    include_follow_up_strategy: true
  },
  business_intel: {
    request_type: 'business_intelligence',
    include_kpis: true,
    include_daily_metrics: true,
    include_coaching_insights: true
  },
  financial: {
    request_type: 'financial_operations',
    include_invoicing: true,
    include_payment_status: true,
    include_quickbooks_sync: true
  },
  marketing: {
    request_type: 'marketing_intelligence',
    include_campaigns: true,
    include_customer_acquisition: true,
    include_lead_generation: true
  },
  compliance: {
    request_type: 'compliance_fraud_prevention',
    include_fraud_detection: true,
    include_warranty_verification: true,
    include_regulatory_compliance: true
  },
  analytics: {
    request_type: 'operational_analytics',
    include_pattern_analysis: true,
    include_trend_forecasting: true,
    include_real_time_reporting: true
  },
  service_advisor: {
    request_type: 'service_recommendation',
    include_customer_context: true,
    include_gateway_routing: true
  }
};

/**
 * Classify user intent from message
 * @param {string} message - User's message
 * @returns {Object} - Intent flags with confidence scores
 */
export function classifyUserIntent(message) {
  const messageLower = message.toLowerCase();
  
  const intents = {
    // DEX - Diagnostics Triage
    diagnostics: /(?:diagnos|symptom|trouble.*code|check.*engine|scan|dtc|warning.*light|engine.*light|rough.*idle|transmission.*problem)/i.test(message),
    
    // CAL - Pricing & Estimates
    pricing: /(?:price|cost|estimate|quote|how.*much|approval.*prob|convert|pricing|budget|charge|fee)/i.test(message),
    
    // FLO - Operations Orchestration
    scheduling: /(?:schedule|appointment|book|dispatch|when.*can|available|workflow|coordinate|time.*slot|when.*will)/i.test(message),
    
    // MAC - Production Manager
    production: /(?:shop.*floor|tech.*assign|wrench.*time|production|work.*order|bay.*status|tech.*busy|bay.*available)/i.test(message),
    
    // KIT - Parts & Inventory
    parts: /(?:part|inventory|stock|order.*part|supplier|availability|parts.*price|need.*part|part.*in.*stock)/i.test(message),
    
    // VIN - Vehicle Intelligence
    vehicle: /(?:vin|vehicle.*history|service.*record|recall|maintenance.*schedule|specific.*to.*vehicle|make.*model.*year)/i.test(message),
    
    // MILES - Customer Retention
    retention: /(?:customer.*return|churn|loyalty|follow.*up|next.*visit|win.*back|retention|coming.*back|last.*visit)/i.test(message),
    
    // ROY - Business Intelligence
    business_intel: /(?:kpi|performance|coaching|daily.*report|business.*metric|how.*doing|dashboard|metrics)/i.test(message),
    
    // PENNYP - Financial Operations
    financial: /(?:invoice|payment|quickbooks|billing|collection|accounts.*receivable|paid|outstanding|balance)/i.test(message),
    
    // BLAZE - Marketing Intelligence
    marketing: /(?:marketing|campaign|promotion|lead|acquisition|advertising|customer.*acquisition|mailing|email.*campaign)/i.test(message),
    
    // LANCE - Compliance & Fraud Prevention
    compliance: /(?:fraud|warranty.*abuse|compliant|regulation|liability|verify|suspicious|fraudulent|warranty.*claim)/i.test(message),
    
    // ORACLE - Operational Analytics
    analytics: /(?:analyze|pattern|trend|forecast|real.*time|operational.*data|reporting|data.*analysis|insights)/i.test(message),
    
    // OTTO - Gateway & Intake (fallback)
    service_advisor: /(?:recommend|suggest|should|advice|what|help|need|service|maintenance|what.*should|what.*do)/i.test(message)
  };

  // Calculate confidence scores (simple keyword matching for now)
  const confidenceScores = {};
  Object.keys(intents).forEach(intent => {
    if (intents[intent]) {
      // Simple heuristic: more keywords = higher confidence
      const keywordCount = messageLower.match(new RegExp(INTENT_KEYWORD_REGEX[intent], 'gi'))?.length || 0;
      confidenceScores[intent] = Math.min(0.5 + (keywordCount * 0.15), 0.95);
    } else {
      confidenceScores[intent] = 0.0;
    }
  });

  // Overall confidence (average of detected intents)
  const detectedIntents = Object.keys(intents).filter(key => intents[key]);
  const overallConfidence = detectedIntents.length > 0
    ? detectedIntents.reduce((sum, intent) => sum + confidenceScores[intent], 0) / detectedIntents.length
    : 0.5; // Default if no clear intent

  return {
    intents,
    confidenceScores,
    overallConfidence,
    primaryIntent: detectedIntents[0] || 'service_advisor', // Fallback to service_advisor
    detectedCount: detectedIntents.length
  };
}

// Keyword regex patterns for confidence scoring
const INTENT_KEYWORD_REGEX = {
  diagnostics: /(?:diagnos|symptom|trouble.*code|check.*engine|scan|dtc|warning.*light|engine.*light)/gi,
  pricing: /(?:price|cost|estimate|quote|how.*much|approval.*prob|convert|pricing|budget)/gi,
  scheduling: /(?:schedule|appointment|book|dispatch|when.*can|available|workflow|coordinate)/gi,
  production: /(?:shop.*floor|tech.*assign|wrench.*time|production|work.*order|bay.*status)/gi,
  parts: /(?:part|inventory|stock|order.*part|supplier|availability|parts.*price)/gi,
  vehicle: /(?:vin|vehicle.*history|service.*record|recall|maintenance.*schedule)/gi,
  retention: /(?:customer.*return|churn|loyalty|follow.*up|next.*visit|win.*back|retention)/gi,
  business_intel: /(?:kpi|performance|coaching|daily.*report|business.*metric|how.*doing)/gi,
  financial: /(?:invoice|payment|quickbooks|billing|collection|accounts.*receivable|paid)/gi,
  marketing: /(?:marketing|campaign|promotion|lead|acquisition|advertising|customer.*acquisition)/gi,
  compliance: /(?:fraud|warranty.*abuse|compliant|regulation|liability|verify|suspicious)/gi,
  analytics: /(?:analyze|pattern|trend|forecast|real.*time|operational.*data|reporting)/gi,
  service_advisor: /(?:recommend|suggest|should|advice|what|help|need|service|maintenance)/gi
};

/**
 * Determine which agents to route to based on intents
 * @param {Object} classificationResult - Result from classifyUserIntent
 * @param {Object} userContext - Additional context (customer_id, ro_number, etc.)
 * @returns {Array} - Array of {agentId, context} objects
 */
export function routeToAgents(classificationResult, userContext = {}) {
  const { intents, primaryIntent } = classificationResult;
  const agentsToConsult = [];
  const agentSet = new Set(); // Prevent duplicate agents

  // Route based on detected intents (primary intent gets priority)
  Object.keys(intents).forEach(intent => {
    if (intents[intent] && AGENT_INTENT_MAP[intent]) {
      AGENT_INTENT_MAP[intent].forEach(agentId => {
        // Use lowercase agent ID for consistency
        const agentIdLower = agentId.toLowerCase();
        if (!agentSet.has(agentIdLower)) {
          agentSet.add(agentIdLower);
          agentsToConsult.push({
            agentId: agentIdLower,
            intent,
            context: {
              ...userContext,
              ...INTENT_CONTEXT_TEMPLATES[intent],
              is_primary: intent === primaryIntent
            }
          });
        }
      });
    }
  });

  // Always include ROY for business context on complex multi-agent queries (if 2+ agents)
  if (agentsToConsult.length > 2 && !agentSet.has('roy')) {
    agentsToConsult.push({
      agentId: 'roy',
      intent: 'business_intel',
      context: {
        ...userContext,
        ...INTENT_CONTEXT_TEMPLATES.business_intel,
        is_primary: false,
        priority: 'background'
      }
    });
  }

  // Fallback: if no clear intent, route to OTTO (Gateway & Intake)
  if (agentsToConsult.length === 0) {
    agentsToConsult.push({
      agentId: 'otto',
      intent: 'service_advisor',
      context: {
        ...userContext,
        ...INTENT_CONTEXT_TEMPLATES.service_advisor,
        is_primary: true
      }
    });
  }

  return agentsToConsult;
}

/**
 * Execute agent with timeout
 * @param {string} agentId - Agent ID
 * @param {Object} input - Agent input
 * @param {Object} context - Agent context
 * @param {number} timeoutMs - Timeout in milliseconds (default 3000)
 * @returns {Promise<Object>} - Agent result or timeout error
 */
async function executeAgentWithTimeout(agentId, input, context, timeoutMs = 3000) {
  const startTime = Date.now();
  
  return Promise.race([
    executeAgent(agentId, input, context)
      .then(result => ({
        ...result,
        execution_time_ms: Date.now() - startTime,
        agent: agentId,
        status: 'success'
      })),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Agent ${agentId} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]).catch(error => ({
    agent: agentId,
    status: 'error',
    error: error.message,
    execution_time_ms: Date.now() - startTime
  }));
}

/**
 * Execute multiple agents in parallel
 * @param {Array} agentRoutes - Array from routeToAgents
 * @param {Object} userMessage - Original user message
 * @param {Object} userContext - User context (customer_id, ro_number, etc.)
 * @returns {Promise<Array>} - Array of agent results
 */
export async function executeAgentsInParallel(agentRoutes, userMessage, userContext = {}) {
  const agentPromises = agentRoutes.map(({ agentId, intent, context }) => {
    // Prepare input for agent based on intent
    const input = {
      ...userContext,
      message: userMessage,
      request: userMessage,
      triggered_by: 'otto_orchestration',
      orchestration_intent: intent
    };

    return executeAgentWithTimeout(agentId, input, { ...context, triggered_by: 'otto_orchestration' });
  });

  const results = await Promise.all(agentPromises);
  return results;
}

/**
 * Synthesize agent responses into unified "Edge AI" response
 * @param {Array} agentResults - Array of agent execution results
 * @param {string} userMessage - Original user message
 * @returns {Object} - Synthesized response
 */
export function synthesizeResponse(agentResults, userMessage) {
  const successfulAgents = agentResults.filter(r => r.status === 'success');
  const failedAgents = agentResults.filter(r => r.status === 'error');

  if (successfulAgents.length === 0) {
    return {
      text: "I'm having trouble processing your request right now. Please try rephrasing or contact support.",
      confidence: 0.3,
      agents_consulted: agentResults.map(r => r.agent),
      synthesis_method: 'fallback_all_failed',
      internal_breakdown: agentResults
    };
  }

  // Extract key insights from each agent's decision
  const insights = successfulAgents.map(result => {
    const decision = result.decision || {};
    return {
      agent: result.agent,
      key_points: extractKeyPoints(decision, result.agent),
      confidence: result.decision?.confidence || 0.7,
      execution_time_ms: result.execution_time_ms
    };
  });

  // Build unified response
  const unifiedText = buildUnifiedText(insights, userMessage, successfulAgents);
  
  // Calculate overall confidence (weighted average)
  const totalConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0);
  const avgConfidence = totalConfidence / insights.length;

  // Response quality score (0-1): higher if more agents succeeded, faster execution, higher confidence
  const avgExecutionTime = insights.reduce((sum, i) => sum + (i.execution_time_ms || 0), 0) / insights.length;
  const qualityScore = Math.min(
    0.3 + // Base score
    (successfulAgents.length / agentResults.length) * 0.3 + // Success rate contribution
    Math.max(0, 1 - (avgExecutionTime / 3000)) * 0.2 + // Speed contribution (faster = better, max 3s)
    avgConfidence * 0.2, // Confidence contribution
    1.0
  );

  return {
    text: unifiedText,
    confidence: avgConfidence,
    quality_score: qualityScore,
    agents_consulted: agentResults.map(r => r.agent),
    agents_succeeded: successfulAgents.map(r => r.agent),
    agents_failed: failedAgents.map(r => r.agent),
    synthesis_method: successfulAgents.length === agentResults.length ? 'full_synthesis' : 'partial_synthesis',
    internal_breakdown: agentResults, // For logging/debugging, not shown to user
    insights_count: insights.length
  };
}

/**
 * Extract key points from agent decision based on agent type
 * @param {Object} decision - Agent's decision object
 * @param {string} agentId - Agent ID
 * @returns {Array<string>} - Key points
 */
function extractKeyPoints(decision, agentId) {
  const points = [];
  const agent = agentId.toLowerCase();

  switch (agent) {
    case 'cal': // Pricing & Estimates
      if (decision.estimate_summary) points.push(decision.estimate_summary);
      if (decision.totals?.total) points.push(`Total: $${decision.totals.total.toFixed(2)}`);
      if (decision.pricing_position) points.push(`Pricing: ${decision.pricing_position.replace('_', ' ')}`);
      if (decision.approval_probability) points.push(`Approval probability: ${(decision.approval_probability * 100).toFixed(0)}%`);
      if (decision.talking_points) points.push(...decision.talking_points.slice(0, 2));
      break;

    case 'miles': // Customer Retention
      if (decision.churn_risk?.level) points.push(`Churn risk: ${decision.churn_risk.level}`);
      if (decision.retention_plan?.recommended_actions) {
        points.push(...decision.retention_plan.recommended_actions.slice(0, 2));
      }
      break;

    case 'dex': // Diagnostics Triage
      if (decision.diagnosis) points.push(decision.diagnosis);
      if (decision.recommended_actions) points.push(...decision.recommended_actions.slice(0, 2));
      if (decision.likely_causes) points.push(...decision.likely_causes.slice(0, 2));
      break;

    case 'flo': // Operations Orchestration
      if (decision.schedule_confirmation) points.push(decision.schedule_confirmation);
      if (decision.estimated_completion) points.push(`Estimated completion: ${decision.estimated_completion}`);
      if (decision.workflow_recommendations) points.push(...decision.workflow_recommendations.slice(0, 2));
      break;

    case 'mac': // Production Manager
      if (decision.tech_assignment) points.push(`Tech assignment: ${decision.tech_assignment}`);
      if (decision.bay_status) points.push(`Bay status: ${decision.bay_status}`);
      if (decision.production_recommendations) points.push(...decision.production_recommendations.slice(0, 2));
      break;

    case 'kit': // Parts & Inventory
      if (decision.parts_availability) points.push(`Parts availability: ${decision.parts_availability}`);
      if (decision.supplier_info) points.push(decision.supplier_info);
      if (decision.parts_recommendations) points.push(...decision.parts_recommendations.slice(0, 2));
      break;

    case 'vin': // Vehicle Intelligence
      if (decision.vehicle_summary) points.push(decision.vehicle_summary);
      if (decision.service_history_summary) points.push(decision.service_history_summary);
      if (decision.recall_info) points.push(...decision.recall_info.slice(0, 1));
      break;

    case 'roy': // Business Intelligence
      if (decision.kpi_summary) points.push(decision.kpi_summary);
      if (decision.coaching_insights) points.push(...decision.coaching_insights.slice(0, 2));
      if (decision.performance_trends) points.push(decision.performance_trends);
      break;

    case 'pennyp': // Financial Operations
      if (decision.invoice_status) points.push(decision.invoice_status);
      if (decision.payment_info) points.push(decision.payment_info);
      if (decision.financial_recommendations) points.push(...decision.financial_recommendations.slice(0, 2));
      break;

    case 'blaze': // Marketing Intelligence
      if (decision.campaign_recommendations) points.push(...decision.campaign_recommendations.slice(0, 2));
      if (decision.acquisition_strategy) points.push(decision.acquisition_strategy);
      break;

    case 'lance': // Compliance & Fraud Prevention
      if (decision.fraud_assessment) points.push(`Fraud assessment: ${decision.fraud_assessment}`);
      if (decision.compliance_status) points.push(decision.compliance_status);
      if (decision.recommended_actions) points.push(...decision.recommended_actions.slice(0, 2));
      break;

    case 'oracle': // Operational Analytics
      if (decision.pattern_analysis) points.push(decision.pattern_analysis);
      if (decision.trend_insights) points.push(...decision.trend_insights.slice(0, 2));
      if (decision.forecast_summary) points.push(decision.forecast_summary);
      break;

    case 'otto': // Gateway & Intake
      if (decision.recommended_services) {
        decision.recommended_services.slice(0, 2).forEach(svc => {
          if (svc.service) points.push(`${svc.service}: ${svc.priority}`);
        });
      }
      if (decision.gateway_routing) points.push(decision.gateway_routing);
      break;

    default:
      // Generic extraction for any agent not specifically handled
      if (decision.recommendations) points.push(...decision.recommendations.slice(0, 3));
      if (decision.summary) points.push(decision.summary);
      if (decision.rationale) points.push(decision.rationale);
      if (decision.key_insights) points.push(...decision.key_insights.slice(0, 2));
  }

  return points.filter(Boolean);
}

/**
 * Build unified text response from insights
 * @param {Array} insights - Extracted insights from agents
 * @param {string} userMessage - Original user message
 * @param {Array} agentResults - Full agent results
 * @returns {string} - Unified response text
 */
function buildUnifiedText(insights, userMessage, agentResults) {
  const parts = [];

  // Primary insight from first agent (typically the most relevant)
  if (insights.length > 0 && insights[0].key_points.length > 0) {
    const primaryPoints = insights[0].key_points.slice(0, 2);
    parts.push(primaryPoints.join('. '));
  }

  // Additional insights from other agents
  if (insights.length > 1) {
    const additionalInsights = insights.slice(1)
      .flatMap(insight => insight.key_points.slice(0, 1))
      .filter(Boolean);
    
    if (additionalInsights.length > 0) {
      parts.push(`Additionally, ${additionalInsights.join('. ')}`);
    }
  }

  // Fallback if no insights extracted
  if (parts.length === 0) {
    // Try to extract something from decision objects
    const firstDecision = agentResults[0]?.decision;
    if (firstDecision) {
      if (typeof firstDecision === 'string') {
        parts.push(firstDecision);
      } else if (firstDecision.summary) {
        parts.push(firstDecision.summary);
      } else if (firstDecision.rationale) {
        parts.push(firstDecision.rationale);
      }
    }

    // Ultimate fallback
    if (parts.length === 0) {
      parts.push("I've analyzed your request and gathered relevant information. Please let me know if you need more details.");
    }
  }

  // Join parts with appropriate punctuation
  let unifiedText = parts.join('. ');
  if (!unifiedText.endsWith('.') && !unifiedText.endsWith('!') && !unifiedText.endsWith('?')) {
    unifiedText += '.';
  }

  return unifiedText;
}

/**
 * Main orchestration function - the entry point for "The Edge AI"
 * @param {Object} params - {userMessage, userContext (customer_id, ro_number, shop_id, etc.)}
 * @returns {Promise<Object>} - Orchestration result
 */
export async function orchestrate(userMessage, userContext = {}) {
  const startTime = Date.now();

  try {
    // 1. Classify intent
    const classification = classifyUserIntent(userMessage);

    // 2. Route to agents
    const agentRoutes = routeToAgents(classification, userContext);

    // 3. Execute agents in parallel
    const agentResults = await executeAgentsInParallel(agentRoutes, userMessage, userContext);

    // 4. Synthesize response
    const synthesized = synthesizeResponse(agentResults, userMessage);

    // 5. Calculate execution time
    const executionTimeMs = Date.now() - startTime;

    // 6. Prepare orchestration record
    const orchestrationRecord = {
      user_message: userMessage,
      user_id: userContext.user_id || null,
      ro_number: userContext.ro_number || null,
      shop_id: userContext.shop_id || null,
      intents_detected: classification.intents,
      confidence_score: classification.overallConfidence,
      agents_consulted: agentRoutes.map(r => r.agentId),
      parallel_execution: true,
      agent_responses: agentResults,
      execution_time_ms: executionTimeMs,
      unified_response: synthesized.text,
      response_quality_score: synthesized.quality_score,
      context: userContext,
      source: userContext.source || 'api_direct',
      session_id: userContext.session_id || null
    };

    // 7. Save to Supabase and get ID for metrics
    const orchestrationId = await saveOrchestrationRecord(orchestrationRecord).catch(err => {
      console.error('Failed to save orchestration record:', err);
      return null;
    });

    // 8. Record agent performance metrics (fire and forget)
    if (orchestrationId) {
      recordAgentPerformanceMetrics(agentResults, orchestrationId).catch(err => {
        console.error('Failed to record agent performance metrics:', err);
      });
    }

    // 9. Return unified response (branded as "The Edge AI")
    return {
      success: true,
      response: synthesized.text, // User sees this as "The Edge AI"
      confidence: synthesized.confidence,
      quality_score: synthesized.quality_score,
      execution_time_ms: executionTimeMs,
      agents_consulted: synthesized.agents_consulted,
      // Internal metadata (for debugging/logging, not typically shown to user)
      _internal: {
        classification,
        agent_results: agentResults,
        synthesis_method: synthesized.synthesis_method
      }
    };

  } catch (error) {
    console.error('OTTO orchestration error:', error);
    
    // Return graceful error response
    return {
      success: false,
      response: "I encountered an error processing your request. Please try again or contact support.",
      error: error.message,
      execution_time_ms: Date.now() - startTime,
      agents_consulted: []
    };
  }
}

/**
 * Save orchestration record to Supabase
 * @param {Object} record - Orchestration record
 * @returns {Promise<number|null>} - Orchestration ID or null on error
 */
async function saveOrchestrationRecord(record) {
  try {
    const { data, error } = await supabase
      .from('otto_orchestrations')
      .insert(record)
      .select('id')
      .single();

    if (error) {
      console.error('Error saving orchestration record:', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('Unexpected error saving orchestration record:', err);
    return null;
  }
}

/**
 * Record agent performance metrics
 * @param {Array} agentResults - Agent execution results
 * @param {number} orchestrationId - Orchestration record ID
 * @returns {Promise<void>}
 */
async function recordAgentPerformanceMetrics(agentResults, orchestrationId) {
  const metrics = [];

  agentResults.forEach(result => {
    // Response time metric
    if (result.execution_time_ms !== undefined) {
      metrics.push({
        agent_name: result.agent,
        metric_type: 'response_time_ms',
        metric_value: result.execution_time_ms,
        orchestration_id: orchestrationId,
        context: { status: result.status }
      });
    }

    // Success rate metric
    metrics.push({
      agent_name: result.agent,
      metric_type: result.status === 'success' ? 'success_count' : 'error_count',
      metric_value: 1,
      orchestration_id: orchestrationId,
      context: { error: result.error || null }
    });
  });

  if (metrics.length > 0) {
    try {
      const { error } = await supabase
        .from('agent_performance_metrics')
        .insert(metrics);

      if (error) {
        console.error('Error recording agent performance metrics:', error);
      }
    } catch (err) {
      console.error('Unexpected error recording metrics:', err);
    }
  }
}

export default {
  orchestrate,
  classifyUserIntent,
  routeToAgents,
  executeAgentsInParallel,
  synthesizeResponse
};









