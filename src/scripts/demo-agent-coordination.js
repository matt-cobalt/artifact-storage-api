/**
 * Demo Agent Coordination Script
 * Simulates a complex multi-agent workflow for Trinity Test demo
 * 
 * Scenario:
 * 1. Customer calls shop (SV04-COMMS receives)
 * 2. SV04-COMMS asks SV01-REVENUE for customer value
 * 3. SV01-REVENUE calculates VORP, responds
 * 4. SV04-COMMS asks SV02-RETENTION for service history
 * 5. SV02-RETENTION queries Tekmetric, responds
 * 6. SV04-COMMS synthesizes → personalized greeting
 * 7. All coordination visible in real-time
 */

import 'dotenv/config';
import { EventBus, createEventBus } from '../lib/event-bus.js';
import { WorkflowCoordinator } from '../lib/workflow-coordinator.js';
import { AgentHeartbeat } from '../lib/agent-heartbeat.js';

const SHOP_ID = process.env.DEMO_SHOP_ID || null;

// Simulate agent IDs (using Squad agent IDs from roster)
const SV04_COMMS = 'sv04-comms'; // Communications agent
const SV01_REVENUE = 'sv01-revenue'; // Revenue agent
const SV02_RETENTION = 'sv02-retention'; // Retention agent

// Delay helper for simulating async operations
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simulate SV04-COMMS agent (Communications)
 */
async function simulateCommsAgent(eventBus) {
  console.log('\n📞 [SV04-COMMS] Customer call received...');
  
  // Start heartbeat
  const heartbeat = new AgentHeartbeat(SV04_COMMS, SHOP_ID);
  await heartbeat.start('working', { current_task: 'Handling customer call' });

  const customerPhone = '555-1234';
  console.log(`📞 [SV04-COMMS] Customer phone: ${customerPhone}`);

  // Publish coordination request for customer value
  console.log(`📞 [SV04-COMMS] Requesting customer value from SV01-REVENUE...`);
  
  const responseChannel1 = `coordination-response-${Date.now()}`;
  await eventBus.publish('agent-coordination', 'COORDINATION_REQUEST', {
    from_agent: SV04_COMMS,
    question: 'What is customer lifetime value?',
    customer_phone: customerPhone,
    requesting_agents: [SV01_REVENUE],
    response_channel: responseChannel1
  }, SV04_COMMS);

  // Subscribe for response
  let customerValue = null;
  const unsubscribe1 = await eventBus.subscribe(responseChannel1, (event) => {
    if (event.event_type === 'COORDINATION_RESPONSE') {
      customerValue = event.payload.value;
      console.log(`📞 [SV04-COMMS] Received customer value: $${customerValue}`);
      unsubscribe1();
    }
  });

  // Wait for response (in real scenario, this would be async)
  await delay(2000);

  // Request service history
  console.log(`📞 [SV04-COMMS] Requesting service history from SV02-RETENTION...`);
  
  const responseChannel2 = `coordination-response-${Date.now() + 1}`;
  await eventBus.publish('agent-coordination', 'COORDINATION_REQUEST', {
    from_agent: SV04_COMMS,
    question: 'What is customer service history?',
    customer_phone: customerPhone,
    requesting_agents: [SV02_RETENTION],
    response_channel: responseChannel2
  }, SV04_COMMS);

  // Subscribe for response
  let serviceHistory = null;
  const unsubscribe2 = await eventBus.subscribe(responseChannel2, (event) => {
    if (event.event_type === 'COORDINATION_RESPONSE') {
      serviceHistory = event.payload.history;
      console.log(`📞 [SV04-COMMS] Received service history:`, serviceHistory);
      unsubscribe2();
    }
  });

  // Wait for response
  await delay(2000);

  // Synthesize personalized greeting
  console.log(`📞 [SV04-COMMS] Synthesizing personalized greeting...`);
  
  const greeting = `Hello! Thank you for calling. I see you're a valued customer with $${customerValue} in lifetime value. Your last service was ${serviceHistory.last_service} on ${serviceHistory.last_date}. How can I help you today?`;
  
  console.log(`📞 [SV04-COMMS] Personalized greeting: "${greeting}"`);
  
  // Broadcast completion
  await eventBus.broadcastStatus(SV04_COMMS, 'idle', {
    current_task: null,
    last_customer_handled: customerPhone
  });

  heartbeat.stop();
  
  return greeting;
}

/**
 * Simulate SV01-REVENUE agent (Revenue)
 */
async function simulateRevenueAgent(eventBus) {
  console.log('\n💰 [SV01-REVENUE] Agent starting...');
  
  const heartbeat = new AgentHeartbeat(SV01_REVENUE, SHOP_ID);
  await heartbeat.start('idle');

  // Subscribe to coordination requests
  const unsubscribe = await eventBus.subscribe('agent-coordination', async (event) => {
    if (event.event_type === 'COORDINATION_REQUEST' && 
        event.payload.requesting_agents?.includes(SV01_REVENUE)) {
      
      console.log(`💰 [SV01-REVENUE] Received coordination request: ${event.payload.question}`);
      
      await heartbeat.updateStatus('working', { 
        current_task: 'Calculating customer value' 
      });

      // Simulate calculation
      await delay(1000);
      
      const customerValue = 1250.50; // Mock calculation
      console.log(`💰 [SV01-REVENUE] Calculated customer value: $${customerValue}`);

      // Respond to coordination request
      await eventBus.publish(event.payload.response_channel, 'COORDINATION_RESPONSE', {
        from_agent: SV01_REVENUE,
        value: customerValue,
        calculation_method: 'LTV formula',
        confidence: 0.92
      }, SV01_REVENUE);

      await heartbeat.updateStatus('idle', { current_task: null });
    }
  });

  // Keep agent running
  await delay(5000);
  unsubscribe();
  heartbeat.stop();
}

/**
 * Simulate SV02-RETENTION agent (Retention)
 */
async function simulateRetentionAgent(eventBus) {
  console.log('\n💚 [SV02-RETENTION] Agent starting...');
  
  const heartbeat = new AgentHeartbeat(SV02_RETENTION, SHOP_ID);
  await heartbeat.start('idle');

  // Subscribe to coordination requests
  const unsubscribe = await eventBus.subscribe('agent-coordination', async (event) => {
    if (event.event_type === 'COORDINATION_REQUEST' && 
        event.payload.requesting_agents?.includes(SV02_RETENTION)) {
      
      console.log(`💚 [SV02-RETENTION] Received coordination request: ${event.payload.question}`);
      
      await heartbeat.updateStatus('working', { 
        current_task: 'Querying service history' 
      });

      // Simulate querying Tekmetric
      await delay(1000);
      
      const serviceHistory = {
        total_visits: 8,
        last_service: 'Oil Change',
        last_date: '2024-12-10',
        lifetime_spent: 1250.50,
        preferred_services: ['Oil Change', 'Tire Rotation']
      };
      
      console.log(`💚 [SV02-RETENTION] Retrieved service history:`, serviceHistory);

      // Respond to coordination request
      await eventBus.publish(event.payload.response_channel, 'COORDINATION_RESPONSE', {
        from_agent: SV02_RETENTION,
        history: serviceHistory,
        source: 'Tekmetric API'
      }, SV02_RETENTION);

      await heartbeat.updateStatus('idle', { current_task: null });
    }
  });

  // Keep agent running
  await delay(5000);
  unsubscribe();
  heartbeat.stop();
}

/**
 * Run workflow-based coordination demo
 */
async function runWorkflowDemo() {
  console.log('\n🎯 Starting Workflow-Based Coordination Demo...\n');

  const coordinator = new WorkflowCoordinator(SHOP_ID);

  // Define workflow steps
  const workflowSteps = [
    {
      step_id: 'step-1',
      agent_id: SV01_REVENUE,
      task: 'Calculate customer lifetime value',
      dependencies: [],
      parallel_group: 'data-gathering'
    },
    {
      step_id: 'step-2',
      agent_id: SV02_RETENTION,
      task: 'Retrieve service history',
      dependencies: [],
      parallel_group: 'data-gathering' // Runs in parallel with step-1
    },
    {
      step_id: 'step-3',
      agent_id: SV04_COMMS,
      task: 'Synthesize personalized greeting',
      dependencies: ['step-1', 'step-2'] // Waits for both parallel steps
    }
  ];

  // Start workflow
  console.log('Starting workflow: "Customer Call Handling"...');
  const execution = await coordinator.startWorkflow(
    'demo-workflow-001',
    'Customer Call Handling',
    workflowSteps
  );

  console.log(`Workflow started: ${execution.id}`);
  console.log(`Status: ${execution.status}`);
  console.log(`Total steps: ${execution.total_steps}\n`);

  // In a real scenario, agents would resolve steps as they complete
  // For demo, we'll simulate this
  await delay(2000);
  
  // Resolve step 1
  console.log('Resolving step 1 (Revenue calculation)...');
  await coordinator.resolveStep(execution.id, 'step-1', {
    customer_value: 1250.50,
    confidence: 0.92
  });

  await delay(1000);

  // Resolve step 2
  console.log('Resolving step 2 (Service history)...');
  await coordinator.resolveStep(execution.id, 'step-2', {
    total_visits: 8,
    last_service: 'Oil Change',
    last_date: '2024-12-10'
  });

  await delay(1000);

  // Resolve step 3 (final step)
  console.log('Resolving step 3 (Greeting synthesis)...');
  await coordinator.resolveStep(execution.id, 'step-3', {
    greeting: 'Hello! Thank you for calling. How can I help you today?',
    personalization_applied: true
  });

  // Check final status
  const finalStatus = await coordinator.getWorkflowStatus(execution.id);
  console.log(`\n✅ Workflow completed: ${finalStatus.status}`);
  console.log(`Result:`, JSON.stringify(finalStatus.result, null, 2));
}

/**
 * Main demo execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🤖 AGENT COORDINATION DEMO');
  console.log('='.repeat(60));

  try {
    const eventBus = createEventBus(SHOP_ID);

    // Check active agents
    console.log('\n📊 Checking active agents...');
    const activeAgents = await eventBus.getActiveAgents(SHOP_ID);
    console.log(`Active agents: ${activeAgents.length}`);

    // Option 1: Event-based coordination
    console.log('\n' + '='.repeat(60));
    console.log('📡 EVENT-BASED COORDINATION DEMO');
    console.log('='.repeat(60));

    // Start background agents
    const revenuePromise = simulateRevenueAgent(eventBus);
    const retentionPromise = simulateRetentionAgent(eventBus);

    // Run comms agent (will coordinate with others)
    await simulateCommsAgent(eventBus);

    // Wait for background agents
    await Promise.all([revenuePromise, retentionPromise]);

    // Option 2: Workflow-based coordination
    console.log('\n' + '='.repeat(60));
    console.log('🎯 WORKFLOW-BASED COORDINATION DEMO');
    console.log('='.repeat(60));

    await runWorkflowDemo();

    // Final status check
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL STATUS');
    console.log('='.repeat(60));

    const finalAgents = await eventBus.getActiveAgents(SHOP_ID);
    console.log(`Active agents: ${finalAgents.length}`);

    const recentEvents = await eventBus.getRecentEvents('agent-coordination', 10);
    console.log(`Recent coordination events: ${recentEvents.length}`);

    console.log('\n✅ Demo completed successfully!');
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { simulateCommsAgent, simulateRevenueAgent, simulateRetentionAgent, runWorkflowDemo };



















