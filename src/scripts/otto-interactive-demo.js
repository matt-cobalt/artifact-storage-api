import 'dotenv/config';
import { orchestrate } from '../orchestration/otto-orchestrator.js';
import readline from 'readline';

/**
 * OTTO Interactive Demo
 * Interactive command-line demo of the Edge AI orchestration system
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Predefined demo queries
const DEMO_QUERIES = [
  {
    name: 'Pricing Query',
    message: "What's the approval probability on this $500 brake job?",
    context: { customer_id: 'demo_cust_001', ro_number: 'RO-DEMO-001' }
  },
  {
    name: 'Service Recommendation',
    message: 'Customer is here for an oil change. What should I recommend?',
    context: { customer_id: 'demo_cust_002' }
  },
  {
    name: 'Multi-Agent Coordination',
    message: 'Customer wants brake quote, they haven\'t visited in 6 months',
    context: { customer_id: 'demo_cust_003', ro_number: 'RO-DEMO-002' }
  },
  {
    name: 'Diagnostics Query',
    message: 'Check engine light is on, car runs rough',
    context: { customer_id: 'demo_cust_004', vehicle_id: 'vehicle_demo_001' }
  },
  {
    name: 'Scheduling Query',
    message: 'Schedule oil change for tomorrow at 10am',
    context: { customer_id: 'demo_cust_005' }
  }
];

function printHeader() {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 THE EDGE AI - Interactive Demo');
  console.log('   Powered by OTTO Orchestration System');
  console.log('='.repeat(70));
  console.log('\nThis demo shows how OTTO coordinates 13 Squad agents');
  console.log('to provide unified "Edge AI" responses.\n');
}

function printMenu() {
  console.log('\n' + '-'.repeat(70));
  console.log('OPTIONS:');
  console.log('  1-5 : Run predefined demo query');
  console.log('  c   : Enter custom query');
  console.log('  a   : Show all 13 Squad agents');
  console.log('  h   : Show help/intent examples');
  console.log('  q   : Quit');
  console.log('-'.repeat(70));
}

function printAgents() {
  console.log('\n' + '='.repeat(70));
  console.log('THE 13 SQUAD AGENTS');
  console.log('='.repeat(70));
  
  const agents = [
    { id: 'OTTO', role: 'Gateway & Intake', intent: 'service_advisor' },
    { id: 'DEX', role: 'Diagnostics Triage', intent: 'diagnostics' },
    { id: 'CAL', role: 'Pricing & Estimates', intent: 'pricing' },
    { id: 'FLO', role: 'Operations Orchestration', intent: 'scheduling' },
    { id: 'MAC', role: 'Production Manager', intent: 'production' },
    { id: 'KIT', role: 'Parts & Inventory', intent: 'parts' },
    { id: 'VIN', role: 'Vehicle Intelligence', intent: 'vehicle' },
    { id: 'MILES', role: 'Customer Retention', intent: 'retention' },
    { id: 'ROY', role: 'Business Intelligence', intent: 'business_intel' },
    { id: 'PENNYP', role: 'Financial Operations', intent: 'financial' },
    { id: 'BLAZE', role: 'Marketing Intelligence', intent: 'marketing' },
    { id: 'LANCE', role: 'Compliance & Fraud Prevention', intent: 'compliance' },
    { id: 'ORACLE', role: 'Operational Analytics', intent: 'analytics' }
  ];

  agents.forEach((agent, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${agent.id.padEnd(10)} - ${agent.role.padEnd(35)} (${agent.intent})`);
  });
  console.log('='.repeat(70) + '\n');
}

function printIntentExamples() {
  console.log('\n' + '='.repeat(70));
  console.log('INTENT CLASSIFICATION EXAMPLES');
  console.log('='.repeat(70));
  console.log('\nOTTO detects intent from your message and routes to agents:\n');
  
  const examples = [
    { intent: 'pricing', example: "What's the approval probability on this $500 job?", agent: 'CAL' },
    { intent: 'diagnostics', example: 'Check engine light is on, car runs rough', agent: 'DEX' },
    { intent: 'scheduling', example: 'Schedule oil change for tomorrow at 10am', agent: 'FLO' },
    { intent: 'retention', example: "Customer hasn't been back in 6 months", agent: 'MILES' },
    { intent: 'service_advisor', example: 'What should I recommend to this customer?', agent: 'OTTO' }
  ];

  examples.forEach((ex, idx) => {
    console.log(`  ${idx + 1}. Intent: ${ex.intent.padEnd(15)} → Routes to: ${ex.agent}`);
    console.log(`     Example: "${ex.example}"`);
    console.log('');
  });
  
  console.log('='.repeat(70) + '\n');
}

async function runOrchestration(message, context = {}) {
  console.log('\n' + '🔄 Processing...\n');
  console.log('📝 Your Query:');
  console.log(`   "${message}"\n`);

  const startTime = Date.now();
  
  try {
    const result = await orchestrate(message, {
      ...context,
      source: 'interactive_demo',
      shop_id: context.shop_id || 'demo_shop_001'
    });

    const executionTime = Date.now() - startTime;

    console.log('='.repeat(70));
    console.log('✨ THE EDGE AI RESPONSE');
    console.log('='.repeat(70));
    console.log('\n' + result.response + '\n');
    console.log('='.repeat(70));

    console.log('\n📊 Behind the Scenes:');
    console.log(`   Agents Consulted: ${result.agents_consulted?.join(', ').toUpperCase() || 'None'}`);
    console.log(`   Confidence: ${((result.confidence || 0) * 100).toFixed(1)}%`);
    console.log(`   Quality Score: ${((result.quality_score || 0) * 100).toFixed(1)}%`);
    console.log(`   Execution Time: ${executionTime}ms`);
    
    if (result._internal) {
      const classification = result._internal.classification;
      if (classification) {
        const detectedIntents = Object.keys(classification.intents || {})
          .filter(intent => classification.intents[intent])
          .map(intent => intent.toUpperCase());
        
        if (detectedIntents.length > 0) {
          console.log(`   Detected Intents: ${detectedIntents.join(', ')}`);
        }
      }
    }

    console.log('\n💡 What Happened:');
    console.log(`   1. OTTO classified your message intent`);
    console.log(`   2. Routed to ${result.agents_consulted?.length || 0} agent(s)`);
    console.log(`   3. Agents executed in parallel`);
    console.log(`   4. OTTO synthesized their responses`);
    console.log(`   5. You received unified "Edge AI" answer`);
    
    if (result.agents_consulted && result.agents_consulted.length > 1) {
      console.log(`\n   ✨ Multi-agent coordination: ${result.agents_consulted.length} agents worked together!`);
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n');
  }
}

async function handleChoice(choice) {
  const trimmed = choice.trim().toLowerCase();

  if (trimmed === 'q' || trimmed === 'quit' || trimmed === 'exit') {
    console.log('\n👋 Thanks for trying The Edge AI!');
    console.log('   For more information, see: docs/OTTO_QUICK_START_GUIDE.md\n');
    rl.close();
    process.exit(0);
    return;
  }

  if (trimmed === 'a' || trimmed === 'agents') {
    printAgents();
    return;
  }

  if (trimmed === 'h' || trimmed === 'help') {
    printIntentExamples();
    return;
  }

  if (trimmed === 'c' || trimmed === 'custom') {
    rl.question('\n📝 Enter your query: ', async (message) => {
      if (message.trim()) {
        await runOrchestration(message.trim());
      }
      promptUser();
    });
    return;
  }

  // Handle numbered demo queries
  const num = parseInt(trimmed);
  if (num >= 1 && num <= DEMO_QUERIES.length) {
    const demo = DEMO_QUERIES[num - 1];
    console.log(`\n🎯 Running Demo: ${demo.name}`);
    await runOrchestration(demo.message, demo.context);
    return;
  }

  console.log('\n⚠️  Invalid choice. Please try again.');
}

function promptUser() {
  printMenu();
  rl.question('Select option: ', async (choice) => {
    await handleChoice(choice);
    promptUser();
  });
}

// Main execution
async function main() {
  printHeader();
  printAgents();
  console.log('💡 Tip: Start with option 1-5 to see predefined demos, or "c" for custom query\n');
  promptUser();
}

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
  console.log('\n\n👋 Demo interrupted. Goodbye!\n');
  rl.close();
  process.exit(0);
});

// Start the demo
main().catch(err => {
  console.error('Fatal error:', err);
  rl.close();
  process.exit(1);
});









