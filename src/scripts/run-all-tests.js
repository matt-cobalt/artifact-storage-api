import { OttoAgent } from '../agents/otto.js';
import { DexAgent } from '../agents/dex.js';
import { CalAgent } from '../agents/cal.js';
import { FloAgent } from '../agents/flo.js';
import { MacAgent } from '../agents/mac.js';
import { KitAgent } from '../agents/kit.js';
import { VinAgent } from '../agents/vin.js';
import { MilesAgent } from '../agents/miles.js';
import { RoyAgent } from '../agents/roy.js';
import { PennypAgent } from '../agents/pennyp.js';
import { BlazeAgent } from '../agents/blaze.js';
import { LanceAgent } from '../agents/lance.js';
import { OracleAgent } from '../agents/oracle.js';
import { ForgeAgent } from '../agents/forge.js';
import { AtlasAgent } from '../agents/atlas.js';
import { ScoutAgent } from '../agents/scout.js';
import { SageAgent } from '../agents/sage.js';
import { GuardianAgent } from '../agents/guardian.js';
import { PhoenixAgent } from '../agents/phoenix.js';
import { SpecAgent } from '../agents/spec.js';
import { ApexAgent } from '../agents/apex.js';
import { NexusAgent } from '../agents/nexus.js';
import { LensAgent } from '../agents/lens.js';
import { ConductorAgent } from '../agents/conductor.js';
import { MentorAgent } from '../agents/mentor.js';

const agents = [
  {
    id: 'otto',
    Agent: OttoAgent,
    input: {
      customer_id: 'cust_001',
      request: 'Customer just arrived for an oil change. What should we recommend?'
    }
  },
  {
    id: 'dex',
    Agent: DexAgent,
    input: {
      customer_id: 'cust_001',
      symptoms: 'check engine light on, rough idle',
      dtc_codes: ['P0301', 'P0171']
    }
  },
  {
    id: 'cal',
    Agent: CalAgent,
    input: {
      customer_id: 'cust_001',
      ro_id: 'ro_001',
      request: 'Build a customer-friendly estimate for front brakes and 30k service.'
    }
  },
  {
    id: 'flo',
    Agent: FloAgent,
    input: {
      shop_id: 'shop_001',
      day: '2024-01-15'
    }
  },
  {
    id: 'mac',
    Agent: MacAgent,
    input: {
      ro_id: 'ro_2001',
      focus: 'Analyze parts and labor mix for current jobs.'
    }
  },
  {
    id: 'kit',
    Agent: KitAgent,
    input: {
      customer_id: 'cust_001',
      ro_id: 'ro_parts_001',
      needed_parts: [
        { part_number: 'PAD-FT-123', description: 'Front brake pads', qty: 1 },
        { part_number: 'ROTOR-FT-123', description: 'Front brake rotors', qty: 2 }
      ]
    }
  },
  {
    id: 'vin',
    Agent: VinAgent,
    input: {
      customer_id: 'cust_001',
      ro_id: 'ro_vin_001',
      vin: '1HGBH41JXMN109186'
    }
  },
  {
    id: 'miles',
    Agent: MilesAgent,
    input: {
      customer_id: 'cust_002',
      request: 'Assess churn risk and propose a retention plan.'
    }
  },
  {
    id: 'roy',
    Agent: RoyAgent,
    input: {
      date_range: { start: '2024-01-01', end: '2024-01-31' },
      summary_focus: 'Daily KPIs and coaching tips.'
    }
  },
  {
    id: 'pennyp',
    Agent: PennypAgent,
    input: {
      customer_id: 'cust_003',
      ro_id: 'ro_invoice_001',
      request: 'Review this RO for invoicing and collections.'
    }
  },
  {
    id: 'blaze',
    Agent: BlazeAgent,
    input: {
      campaign_name: 'Fall brake safety campaign',
      goal: 'Bring back lapsed customers for safety inspections.'
    }
  },
  {
    id: 'lance',
    Agent: LanceAgent,
    input: {
      customer_id: 'cust_fraud_001',
      ro_id: 'ro_fraud_001',
      scenario:
        'Customer with prior chargebacks is declining safety work and using multiple cards.'
    }
  },
  {
    id: 'oracle',
    Agent: OracleAgent,
    input: {
      request: 'Analyze last 7 days of operations for patterns, anomalies, and forecast.',
      window: { start: '2024-01-08', end: '2024-01-15' }
    }
  },
  {
    id: 'forge',
    Agent: ForgeAgent,
    input: {
      request:
        'Plan and sequence the work to add a new /api/agents/squad/execute endpoint.',
      repo: 'artifact-storage-api',
      area: 'backend'
    }
  },
  {
    id: 'atlas',
    Agent: AtlasAgent,
    input: {
      question:
        'How should we evolve the Artifact Storage API architecture to handle 10x traffic?'
    }
  },
  {
    id: 'scout',
    Agent: ScoutAgent,
    input: {
      request: 'Evaluate SMS providers for agent notifications.',
      candidates: ['Twilio', 'MessageBird', 'Vonage']
    }
  },
  {
    id: 'sage',
    Agent: SageAgent,
    input: {
      agent_id: 'otto',
      goal: "Improve Otto's prompt for clearer safety and pricing guidance."
    }
  },
  {
    id: 'guardian',
    Agent: GuardianAgent,
    input: {
      request:
        'Perform a security and quality audit of the Artifact Storage API routes and config.'
    }
  },
  {
    id: 'phoenix',
    Agent: PhoenixAgent,
    input: {
      request:
        'Plan a production deployment of the latest Artifact Storage API changes.',
      service: 'artifact-storage-api',
      environment: 'production'
    }
  },
  {
    id: 'spec',
    Agent: SpecAgent,
    input: {
      request:
        'Define requirements for a Squad Agents control panel in Trinity UI.',
      stakeholders: ['ops', 'devs', 'service_writers']
    }
  },
  {
    id: 'apex',
    Agent: ApexAgent,
    input: {
      decision:
        'Should Artifact Storage API adopt per-tenant partitions or stay single-tenant?'
    }
  },
  {
    id: 'nexus',
    Agent: NexusAgent,
    input: {
      request:
        'Review and improve integrations between Artifact Storage API, Supabase, and Slack.',
      integrations: ['supabase', 'slack', 'tekmetric']
    }
  },
  {
    id: 'lens',
    Agent: LensAgent,
    input: {
      request: 'Analyze Artifact Storage usage data for patterns and data quality issues.',
      dataset_name: 'artifact_operations'
    }
  },
  {
    id: 'conductor',
    Agent: ConductorAgent,
    input: {
      request:
        'Review the CI/CD pipeline for artifact-storage-api and recommend improvements.'
    }
  },
  {
    id: 'mentor',
    Agent: MentorAgent,
    input: {
      request:
        'Audit and improve documentation for Trinity Test, Artifact Storage API, and Squad agents.',
      audiences: ['devs', 'ops', 'service_writers']
    }
  }
];

async function runAllTests() {
  let passed = 0;
  let failed = 0;

  for (const { id, Agent, input } of agents) {
    try {
      const agent = new Agent();
      await agent.execute(input, { triggered_by: 'run_all_tests' });
      console.log(`✅ ${id.toUpperCase()}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${id.toUpperCase()}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of 25 total`);
}

runAllTests().catch(err => {
  console.error('Unexpected error running all agent tests:', err);
  process.exit(1);
});









