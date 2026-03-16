import { OttoAgent } from './otto.js';
import { DexAgent } from './dex.js';
import { CalAgent } from './cal.js';
import { FloAgent } from './flo.js';
import { MacAgent } from './mac.js';
import { KitAgent } from './kit.js';
import { VinAgent } from './vin.js';
import { MilesAgent } from './miles.js';
import { RoyAgent } from './roy.js';
import { PennypAgent } from './pennyp.js';
import { BlazeAgent } from './blaze.js';
import { LanceAgent } from './lance.js';
import { OracleAgent } from './oracle.js';
import { ForgeAgent } from './forge.js';
import { AtlasAgent } from './atlas.js';
import { ScoutAgent } from './scout.js';
import { SageAgent } from './sage.js';
import { GuardianAgent } from './guardian.js';
import { PhoenixAgent } from './phoenix.js';
import { SpecAgent } from './spec.js';
import { ApexAgent } from './apex.js';
import { NexusAgent } from './nexus.js';
import { LensAgent } from './lens.js';
import { ConductorAgent } from './conductor.js';
import { MentorAgent } from './mentor.js';

/**
 * Central registry of all agents.
 */
export const AgentRegistry = {
  // Squad (customer-facing)
  otto: OttoAgent,
  dex: DexAgent,
  cal: CalAgent,
  flo: FloAgent,
  mac: MacAgent,
  kit: KitAgent,
  vin: VinAgent,
  miles: MilesAgent,
  roy: RoyAgent,
  pennyp: PennypAgent,
  blaze: BlazeAgent,
  lance: LanceAgent,
  oracle: OracleAgent,

  // Forge (backend / development)
  forge: ForgeAgent,
  atlas: AtlasAgent,
  scout: ScoutAgent,
  sage: SageAgent,
  guardian: GuardianAgent,
  phoenix: PhoenixAgent,
  spec: SpecAgent,
  apex: ApexAgent,
  nexus: NexusAgent,
  lens: LensAgent,
  conductor: ConductorAgent,
  mentor: MentorAgent
};

/**
 * Get an agent instance by ID.
 */
export function getAgent(agentId) {
  const AgentClass = AgentRegistry[agentId];
  if (!AgentClass) {
    throw new Error(`Agent not found: ${agentId}`);
  }
  return new AgentClass();
}

/**
 * Execute any registered agent.
 */
export async function executeAgent(agentId, input, context = {}) {
  const agent = getAgent(agentId);
  return agent.execute(input, context);
}

/**
 * List all available agents and their basic metadata.
 */
export function listAgents() {
  return Object.keys(AgentRegistry).map(id => {
    const AgentClass = AgentRegistry[id];
    const agent = new AgentClass();
    return {
      id: agent.agentId,
      name: agent.agentName,
      role: agent.role,
      formulas: agent.formulas
    };
  });
}

export default {
  AgentRegistry,
  getAgent,
  executeAgent,
  listAgents
};




















