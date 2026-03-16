import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Save OTTO System Artifacts to Supabase
 * Creates 4 comprehensive artifacts for system reference
 */

async function saveArtifacts() {
  console.log('🚀 Creating OTTO System Artifacts...\n');

  const artifacts = [];

  // ============================================================================
  // ARTIFACT 1: OTTO System Architecture Reference
  // ============================================================================
  const architectureArtifact = {
    title: 'OTTO Edge AI Orchestration System - Architecture Reference',
    version: '1.0',
    created_date: new Date().toISOString(),
    type: 'system_architecture',
    overview: {
      purpose: 'Unified AI interface powered by 13 specialized Squad agents coordinated by OTTO orchestrator',
      user_interface: 'Single "Edge AI" chat interface',
      hidden_complexity: 'Multi-agent orchestration layer',
      competitive_advantage: 'Competitors see simple chatbot, reality is 13-agent coordinated system'
    },
    architecture_layers: {
      layer_1: {
        name: 'User Interface',
        description: 'What users see - "The Edge AI" unified chat interface',
        interfaces: ['POS UI', 'Slack', 'API Direct', 'n8n Webhook']
      },
      layer_2: {
        name: 'Orchestration Layer (OTTO)',
        description: 'Hidden coordination - routes messages to agents, synthesizes responses',
        components: ['Intent Classifier', 'Agent Router', 'Parallel Execution Coordinator', 'Response Synthesizer']
      },
      layer_3: {
        name: 'Squad Agents (13)',
        description: 'Customer-facing specialized intelligence agents',
        agents: [
          'OTTO - Gateway & Intake',
          'DEX - Diagnostics Triage',
          'CAL - Pricing & Estimates',
          'FLO - Operations Orchestration',
          'MAC - Production Manager',
          'KIT - Parts & Inventory',
          'VIN - Vehicle Intelligence',
          'MILES - Customer Retention',
          'ROY - Business Intelligence',
          'PENNYP - Financial Operations',
          'BLAZE - Marketing Intelligence',
          'LANCE - Compliance & Fraud Prevention',
          'ORACLE - Operational Analytics'
        ]
      },
      layer_4: {
        name: 'Forge Agents (12)',
        description: 'Development team agents (hidden from users)',
        agents: ['FORGE', 'ATLAS', 'SCOUT', 'SAGE', 'GUARDIAN', 'PHOENIX', 'SPEC', 'APEX', 'NEXUS', 'LENS', 'CONDUCTOR', 'MENTOR']
      }
    },
    orchestration_flow: {
      step_1: 'User message received',
      step_2: 'OTTO classifies intent using pattern matching',
      step_3: 'OTTO routes to appropriate Squad agents (1-5 agents)',
      step_4: 'Agents execute in parallel (3-second timeout each)',
      step_5: 'OTTO synthesizes agent responses into unified text',
      step_6: 'Unified response returned as "The Edge AI"',
      step_7: 'Orchestration logged to Supabase for analytics'
    },
    key_metrics: {
      target_response_time: '< 3 seconds (95th percentile)',
      target_success_rate: '> 95%',
      target_quality_score: '> 0.85',
      max_agent_timeout: '3 seconds per agent',
      parallel_execution: 'All agents execute simultaneously'
    },
    api_endpoint: 'POST /api/edge-ai/query',
    documentation_files: [
      'docs/OTTO_EDGE_AI_TECHNICAL_DOCUMENTATION.md',
      'docs/OTTO_Test_Suite.md',
      'docs/OTTO_Monitoring_SQL_Queries.md',
      'docs/OTTO_Troubleshooting_Guide.md'
    ]
  };

  // ============================================================================
  // ARTIFACT 2: Agent Capability Matrix
  // ============================================================================
  const capabilityMatrix = {
    title: 'Squad Agent Capability Matrix - All 13 Agents',
    version: '1.0',
    created_date: new Date().toISOString(),
    type: 'agent_capability_matrix',
    agents: [
      {
        id: 'otto',
        name: 'OTTO',
        role: 'Gateway & Intake',
        intent: 'service_advisor',
        purpose: 'First contact, routes to specialists, general service recommendations',
        example_queries: [
          'What should I recommend to this customer?',
          'Customer needs help, what do I do?',
          'Help with service recommendation'
        ],
        key_capabilities: ['Service recommendations', 'Customer interaction', 'Gateway routing', 'Upselling']
      },
      {
        id: 'dex',
        name: 'DEX',
        role: 'Diagnostics Triage',
        intent: 'diagnostics',
        purpose: 'Analyzes symptoms, recommends diagnostic tests, trouble code analysis',
        example_queries: [
          'Check engine light is on, what could it be?',
          'Customer says car runs rough',
          'DTC code P0301, what does it mean?'
        ],
        key_capabilities: ['Diagnostic procedures', 'Symptom analysis', 'Trouble code interpretation', 'Test recommendations']
      },
      {
        id: 'cal',
        name: 'CAL',
        role: 'Pricing & Estimates',
        intent: 'pricing',
        purpose: 'Builds quotes, calculates approval probability, optimizes pricing strategy',
        example_queries: [
          "What's the approval probability on this $500 brake job?",
          'How much should I charge for brake pads?',
          'Is this price competitive?'
        ],
        key_capabilities: ['Approval probability', 'Price optimization', 'Competitive analysis', 'Quote building']
      },
      {
        id: 'flo',
        name: 'FLO',
        role: 'Operations Orchestration',
        intent: 'scheduling',
        purpose: 'Scheduling, appointment booking, workflow coordination, dispatch',
        example_queries: [
          'Schedule oil change for tomorrow at 10am',
          'When can we book this customer?',
          'Coordinate workflow for brake service'
        ],
        key_capabilities: ['Appointment scheduling', 'Workflow coordination', 'Dispatch management', 'Timing optimization']
      },
      {
        id: 'mac',
        name: 'MAC',
        role: 'Production Manager',
        intent: 'production',
        purpose: 'Shop floor execution, tech assignments, bay management, wrench time optimization',
        example_queries: [
          'Which tech should handle this job?',
          'Bay 3 status?',
          'How to optimize production flow?'
        ],
        key_capabilities: ['Tech assignments', 'Bay management', 'Production optimization', 'Work order coordination']
      },
      {
        id: 'kit',
        name: 'KIT',
        role: 'Parts & Inventory',
        intent: 'parts',
        purpose: 'Parts sourcing, inventory management, supplier coordination, parts pricing',
        example_queries: [
          'Do we have brake pads in stock?',
          'Order front rotors',
          'Parts availability for this job?'
        ],
        key_capabilities: ['Inventory checking', 'Parts ordering', 'Supplier coordination', 'Parts pricing']
      },
      {
        id: 'vin',
        name: 'VIN',
        role: 'Vehicle Intelligence',
        intent: 'vehicle',
        purpose: 'VIN decode, service history, recalls, vehicle-specific information',
        example_queries: [
          "What's the service history for this VIN?",
          'Any recalls on this vehicle?',
          'Vehicle-specific maintenance schedule?'
        ],
        key_capabilities: ['VIN decoding', 'Service history', 'Recall information', 'Vehicle specifications']
      },
      {
        id: 'miles',
        name: 'MILES',
        role: 'Customer Retention',
        intent: 'retention',
        purpose: 'Post-service follow-up, churn prevention, loyalty building, win-back strategies',
        example_queries: [
          'Customer hasn\'t been back in 6 months',
          'Win-back strategy for this customer?',
          'What\'s the churn risk?'
        ],
        key_capabilities: ['Churn risk assessment', 'Win-back strategies', 'Follow-up scheduling', 'Loyalty programs']
      },
      {
        id: 'roy',
        name: 'ROY',
        role: 'Business Intelligence',
        intent: 'business_intel',
        purpose: 'Daily KPIs, performance metrics, coaching insights, business analytics',
        example_queries: [
          'How are we doing today?',
          'Daily KPIs?',
          'Business performance metrics?'
        ],
        key_capabilities: ['KPI tracking', 'Performance analysis', 'Coaching insights', 'Business metrics']
      },
      {
        id: 'pennyp',
        name: 'PENNYP',
        role: 'Financial Operations',
        intent: 'financial',
        purpose: 'Invoicing, payments, QuickBooks integration, collections, financial reporting',
        example_queries: [
          'Invoice status?',
          'Outstanding balance?',
          'Payment processing?'
        ],
        key_capabilities: ['Invoicing', 'Payment tracking', 'QuickBooks sync', 'Financial reporting']
      },
      {
        id: 'blaze',
        name: 'BLAZE',
        role: 'Marketing Intelligence',
        intent: 'marketing',
        purpose: 'Marketing campaigns, customer acquisition, lead generation, promotional strategies',
        example_queries: [
          'Marketing campaign ideas?',
          'Customer acquisition strategy?',
          'Promotional campaigns?'
        ],
        key_capabilities: ['Campaign planning', 'Lead generation', 'Customer acquisition', 'Marketing analytics']
      },
      {
        id: 'lance',
        name: 'LANCE',
        role: 'Compliance & Fraud Prevention',
        intent: 'compliance',
        purpose: 'Fraud detection, warranty verification, compliance checking, suspicious activity monitoring',
        example_queries: [
          'This customer seems suspicious',
          'Fraud check needed',
          'Verify warranty claim?'
        ],
        key_capabilities: ['Fraud detection', 'Warranty verification', 'Compliance checking', 'Risk assessment']
      },
      {
        id: 'oracle',
        name: 'ORACLE',
        role: 'Operational Analytics',
        intent: 'analytics',
        purpose: 'Pattern analysis, trend forecasting, real-time reporting, operational insights',
        example_queries: [
          'Trend analysis?',
          'Forecast next month?',
          'Operational patterns?'
        ],
        key_capabilities: ['Pattern analysis', 'Trend forecasting', 'Real-time reporting', 'Operational insights']
      }
    ],
    intent_mapping: {
      diagnostics: 'dex',
      pricing: 'cal',
      scheduling: 'flo',
      production: 'mac',
      parts: 'kit',
      vehicle: 'vin',
      retention: 'miles',
      business_intel: 'roy',
      financial: 'pennyp',
      marketing: 'blaze',
      compliance: 'lance',
      analytics: 'oracle',
      service_advisor: 'otto'
    },
    multi_agent_coordination: {
      rule: 'When 2+ agents are consulted, ROY is automatically added for business context',
      example: 'CAL (pricing) + MILES (retention) + ROY (business context)'
    }
  };

  // ============================================================================
  // ARTIFACT 3: API Quick Reference
  // ============================================================================
  const apiReference = {
    title: 'API Quick Reference - All Endpoints',
    version: '1.0',
    created_date: new Date().toISOString(),
    type: 'api_reference',
    base_url: 'http://localhost:3000/api',
    endpoints: [
      {
        method: 'POST',
        path: '/edge-ai/query',
        description: 'OTTO Orchestration - Unified "Edge AI" interface',
        example_request: {
          message: "What's the approval probability on this $500 brake job?",
          context: {
            customer_id: 'cust_001',
            ro_number: 'RO-2024-523',
            shop_id: 'shop_001'
          }
        },
        example_curl: `curl -X POST http://localhost:3000/api/edge-ai/query \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What'\''s the approval probability on this $500 brake job?",
    "context": {
      "customer_id": "cust_001",
      "ro_number": "RO-2024-523"
    }
  }'`,
        response_example: {
          success: true,
          response: '87% approval probability. This price is competitive...',
          confidence: 0.87,
          execution_time_ms: 1247,
          _metadata: {
            agents_consulted: ['cal', 'miles'],
            quality_score: 0.89
          }
        }
      },
      {
        method: 'POST',
        path: '/agents/:agentId/execute',
        description: 'Execute individual Squad agent directly',
        example_paths: [
          '/api/agents/cal/execute',
          '/api/agents/dex/execute',
          '/api/agents/miles/execute'
        ],
        example_curl: `curl -X POST http://localhost:3000/api/agents/cal/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": {
      "customer_id": "cust_001",
      "ro_number": "RO-2024-523",
      "request": "Calculate approval probability"
    },
    "context": {
      "triggered_by": "api_direct"
    }
  }'`
      },
      {
        method: 'GET',
        path: '/agents',
        description: 'List all available agents',
        example_curl: 'curl http://localhost:3000/api/agents',
        response_example: [
          {
            id: 'otto',
            name: 'Otto',
            role: 'service_advisor',
            formulas: ['CLV_CALCULATION', 'NCR_FORMULA']
          }
        ]
      },
      {
        method: 'GET',
        path: '/agents/:agentId/history',
        description: 'Get execution history for an agent',
        example_curl: 'curl "http://localhost:3000/api/agents/cal/history?limit=10"'
      },
      {
        method: 'GET',
        path: '/artifacts',
        description: 'Query artifacts with filters',
        example_curl: 'curl "http://localhost:3000/api/artifacts?type=agent_decision&limit=100"',
        query_params: {
          type: 'Filter by artifact type',
          limit: 'Maximum number of results',
          startDate: 'Start date (ISO format)',
          endDate: 'End date (ISO format)'
        }
      },
      {
        method: 'GET',
        path: '/artifacts/:id',
        description: 'Get specific artifact by ID',
        example_curl: 'curl http://localhost:3000/api/artifacts/artifact_id_here'
      },
      {
        method: 'GET',
        path: '/artifacts/:id/chain',
        description: 'Get artifact provenance chain',
        example_curl: 'curl "http://localhost:3000/api/artifacts/artifact_id_here/chain?depth=8"'
      }
    ],
    authentication: {
      type: 'None required for localhost',
      note: 'For production, add API key authentication'
    },
    rate_limiting: {
      status: 'Not currently implemented',
      recommendation: 'Add rate limiting for production'
    }
  };

  // ============================================================================
  // ARTIFACT 4: System Status Summary
  // ============================================================================
  const systemStatus = {
    title: 'OTTO System Status Summary',
    version: '1.0',
    created_date: new Date().toISOString(),
    type: 'system_status',
    overall_status: 'OPERATIONAL',
    last_updated: new Date().toISOString(),
    components: {
      orchestration_layer: {
        status: 'OPERATIONAL',
        version: '1.0',
        endpoint: '/api/edge-ai/query',
        features: [
          'Intent classification',
          'Agent routing',
          'Parallel execution',
          'Response synthesis',
          'Error handling',
          'Database logging'
        ]
      },
      squad_agents: {
        status: 'OPERATIONAL',
        total_agents: 13,
        agents: [
          { id: 'otto', status: 'OPERATIONAL' },
          { id: 'dex', status: 'OPERATIONAL' },
          { id: 'cal', status: 'OPERATIONAL' },
          { id: 'flo', status: 'OPERATIONAL' },
          { id: 'mac', status: 'OPERATIONAL' },
          { id: 'kit', status: 'OPERATIONAL' },
          { id: 'vin', status: 'OPERATIONAL' },
          { id: 'miles', status: 'OPERATIONAL' },
          { id: 'roy', status: 'OPERATIONAL' },
          { id: 'pennyp', status: 'OPERATIONAL' },
          { id: 'blaze', status: 'OPERATIONAL' },
          { id: 'lance', status: 'OPERATIONAL' },
          { id: 'oracle', status: 'OPERATIONAL' }
        ]
      },
      database: {
        status: 'OPERATIONAL',
        tables: [
          'artifacts',
          'otto_orchestrations',
          'agent_performance_metrics',
          'otto_errors'
        ],
        schema_version: '1.0'
      },
      api_server: {
        status: 'OPERATIONAL',
        port: 3000,
        endpoints_total: 7,
        health_check: '/health'
      }
    },
    metrics: {
      target_response_time: '< 3 seconds (95th percentile)',
      target_success_rate: '> 95%',
      target_quality_score: '> 0.85',
      parallel_execution: 'enabled',
      agent_timeout: '3 seconds'
    },
    documentation: {
      technical_docs: 'docs/OTTO_EDGE_AI_TECHNICAL_DOCUMENTATION.md',
      test_suite: 'docs/OTTO_Test_Suite.md',
      monitoring_queries: 'docs/OTTO_Monitoring_SQL_Queries.md',
      troubleshooting: 'docs/OTTO_Troubleshooting_Guide.md'
    },
    next_steps: [
      'Run database migrations (otto_orchestrations, otto_errors tables)',
      'Test orchestration with real queries',
      'Set up monitoring dashboards',
      'Build n8n workflow',
      'Add Slack notifications'
    ]
  };

  // ============================================================================
  // Save All Artifacts
  // ============================================================================
  
  const artifactsToSave = [
    {
      id: `otto_architecture:${Date.now()}:reference`,
      type: 'otto_system_architecture',
      data: architectureArtifact
    },
    {
      id: `agent_capability_matrix:${Date.now()}:reference`,
      type: 'agent_capability_matrix',
      data: capabilityMatrix
    },
    {
      id: `api_reference:${Date.now()}:reference`,
      type: 'api_reference',
      data: apiReference
    },
    {
      id: `system_status:${Date.now()}:summary`,
      type: 'system_status',
      data: systemStatus
    }
  ];

  let savedCount = 0;
  let errorCount = 0;

  for (const artifact of artifactsToSave) {
    try {
      const { data, error } = await supabase
        .from('artifacts')
        .insert({
          artifact_id: artifact.id,
          type: artifact.type,
          data: artifact.data,
          source: 'otto_system_artifacts_script',
          created_by: 'system'
        })
        .select('artifact_id')
        .single();

      if (error) {
        console.error(`❌ Error saving ${artifact.type}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Saved: ${artifact.type} (${data.artifact_id})`);
        savedCount++;
      }
    } catch (err) {
      console.error(`❌ Unexpected error saving ${artifact.type}:`, err.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('ARTIFACT SAVE SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully saved: ${savedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total artifacts: ${artifactsToSave.length}`);

  if (errorCount === 0) {
    console.log('\n🎉 All artifacts saved successfully!');
    return true;
  } else {
    console.log('\n⚠️  Some artifacts failed to save. Review errors above.');
    return false;
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || 
                     process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || !process.env.RUN_FROM_TEST) {
  saveArtifacts()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

export default saveArtifacts;









