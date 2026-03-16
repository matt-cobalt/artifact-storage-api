/**
 * Viable System Model (Stafford Beer)
 * 
 * 5-level recursive organization model for complex systems:
 * 
 * Level 1: Operations - Doing the work (Squad agents)
 * Level 2: Coordination - Resolving conflicts (NEXUS)
 * Level 3: Control - Resource allocation (MILES, PENNYP, MAC)
 * Level 4: Intelligence - External environment monitoring (ROY, BLAZE, REX)
 * Level 5: Policy - Identity, values, strategic direction (GUARDIAN, LANCE)
 * 
 * Application: Analyze system organization and identify weaknesses
 */

export interface SystemLevel {
  level: number;
  name: string;
  agents: string[];
  function: string;
  viability: number;  // 0.0 - 1.0
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

export interface VSMAnalysis {
  levels: SystemLevel[];
  overallViability: number;        // Minimum of all levels (weakest link)
  weakestLevel: SystemLevel;
  strongestLevel: SystemLevel;
  recommendations: string[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

/**
 * Default agent assignments by level
 */
const DEFAULT_LEVEL_AGENTS: { [level: number]: string[] } = {
  1: ['OTTO', 'CAL', 'DEX', 'FLO', 'KIT', 'MAC', 'VIN'],  // Operations
  2: ['NEXUS'],                                            // Coordination
  3: ['MILES', 'PENNYP', 'MAC'],                          // Control
  4: ['ROY', 'BLAZE', 'REX'],                             // Intelligence
  5: ['GUARDIAN', 'LANCE']                                // Policy
};

const LEVEL_NAMES: { [level: number]: string } = {
  1: 'Operations',
  2: 'Coordination',
  3: 'Control',
  4: 'Intelligence',
  5: 'Policy'
};

const LEVEL_FUNCTIONS: { [level: number]: string } = {
  1: 'Execute primary business functions (customer service, pricing, scheduling)',
  2: 'Resolve conflicts between operational agents',
  3: 'Resource allocation and optimization',
  4: 'Monitor environment, detect threats/opportunities',
  5: 'Define identity, values, strategic direction'
};

/**
 * Analyze viable system organization
 * 
 * @param levelViabilities Array of 5 viability scores (0.0-1.0) for each level
 * @param customAgents Optional custom agent assignments per level
 */
export function analyzeViableSystem(
  levelViabilities: number[],
  customAgents?: { [level: number]: string[] }
): VSMAnalysis {
  if (levelViabilities.length !== 5) {
    throw new Error('Must provide exactly 5 viability scores (one per level)');
  }
  
  const agents = customAgents || DEFAULT_LEVEL_AGENTS;
  
  const levels: SystemLevel[] = levelViabilities.map((viability, index) => {
    const levelNum = index + 1;
    let healthStatus: 'healthy' | 'degraded' | 'critical';
    
    if (viability >= 0.9) {
      healthStatus = 'healthy';
    } else if (viability >= 0.7) {
      healthStatus = 'degraded';
    } else {
      healthStatus = 'critical';
    }
    
    return {
      level: levelNum,
      name: LEVEL_NAMES[levelNum],
      agents: agents[levelNum] || [],
      function: LEVEL_FUNCTIONS[levelNum],
      viability,
      healthStatus
    };
  });
  
  // Overall viability = minimum (weakest link principle)
  const overallViability = Math.min(...levelViabilities);
  
  // Find weakest and strongest levels
  const weakestLevel = levels.reduce((min, level) => 
    level.viability < min.viability ? level : min
  );
  
  const strongestLevel = levels.reduce((max, level) =>
    level.viability > max.viability ? level : max
  );
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  levels.forEach(level => {
    if (level.healthStatus === 'critical') {
      recommendations.push(
        `CRITICAL: Level ${level.level} (${level.name}) is at ${(level.viability * 100).toFixed(0)}% viability. ` +
        `Immediate action required. Function: ${level.function}. Agents: ${level.agents.join(', ')}.`
      );
    } else if (level.healthStatus === 'degraded') {
      recommendations.push(
        `WARNING: Level ${level.level} (${level.name}) is at ${(level.viability * 100).toFixed(0)}% viability. ` +
        `Consider strengthening ${level.function.toLowerCase()}.`
      );
    }
  });
  
  // Overall system health
  let systemHealth: 'healthy' | 'degraded' | 'critical';
  if (overallViability >= 0.9) {
    systemHealth = 'healthy';
    if (recommendations.length === 0) {
      recommendations.push('All system levels operating above 90% viability. System is healthy.');
    }
  } else if (overallViability >= 0.7) {
    systemHealth = 'degraded';
  } else {
    systemHealth = 'critical';
    recommendations.unshift(
      'SYSTEM CRITICAL: Overall viability below 70%. Immediate intervention required.'
    );
  }
  
  return {
    levels,
    overallViability,
    weakestLevel,
    strongestLevel,
    recommendations,
    systemHealth
  };
}

/**
 * Calculate level viability based on agent performance metrics
 * 
 * @param agentPerformances Map of agent ID to performance score (0.0-1.0)
 * @param levelAgents Array of agent IDs in this level
 */
export function calculateLevelViability(
  agentPerformances: Map<string, number>,
  levelAgents: string[]
): number {
  if (levelAgents.length === 0) {
    return 0.0; // No agents = 0% viable
  }
  
  const performances = levelAgents
    .map(agentId => agentPerformances.get(agentId) || 0.0)
    .filter(perf => perf > 0);
  
  if (performances.length === 0) {
    return 0.0; // No active agents
  }
  
  // Average performance of active agents
  const averagePerformance = performances.reduce((sum, perf) => sum + perf, 0) / performances.length;
  
  // Weight by number of active agents (more agents = more resilient)
  const activeRatio = performances.length / levelAgents.length;
  
  // Combined viability score
  return averagePerformance * activeRatio;
}

/**
 * Default viability scores (example values based on current system)
 * 
 * These would typically come from actual agent performance monitoring
 */
export function getDefaultViabilityScores(): number[] {
  return [
    0.95,  // Level 1: Operations (OTTO, CAL, DEX, etc.) - 95% operational
    0.92,  // Level 2: Coordination (NEXUS) - 92% conflict resolution
    0.88,  // Level 3: Control (MILES, PENNYP, MAC) - 88% efficiency
    0.85,  // Level 4: Intelligence (ROY, BLAZE, REX) - 85% environmental awareness
    0.90   // Level 5: Policy (GUARDIAN, LANCE) - 90% alignment
  ];
}

/**
 * Quick analysis using default values
 */
export function quickVSMAnalysis(): VSMAnalysis {
  return analyzeViableSystem(getDefaultViabilityScores());
}

/**
 * Example usage:
 * 
 * const analysis = analyzeViableSystem([0.95, 0.92, 0.88, 0.85, 0.90]);
 * 
 * Result:
 * - Overall viability: 0.85 (Level 4 - Intelligence is weakest)
 * - System health: degraded
 * - Recommendation: Strengthen environmental monitoring (ROY, BLAZE, REX)
 */



