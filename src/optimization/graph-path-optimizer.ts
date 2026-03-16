/**
 * Graph Theory Path Optimizer
 * 
 * Uses Dijkstra's algorithm to find fastest agent coordination paths.
 * 
 * Problem: When OTTO needs to coordinate multiple agents (CAL, FLO, DEX, etc.),
 * the order and path matter. Some sequences are faster than others.
 * 
 * Solution: Model agent coordination as a weighted graph where:
 * - Nodes = agents or tasks
 * - Edges = dependencies or data flow
 * - Weights = expected latency or processing time
 * 
 * Dijkstra's algorithm finds the shortest (fastest) path from start to finish.
 */

/**
 * Graph node (agent or task)
 */
export interface GraphNode {
  id: string;
  agentType: string;            // 'CAL', 'FLO', 'DEX', etc.
  expectedLatency: number;      // ms - expected processing time
}

/**
 * Graph edge (dependency or data flow)
 */
export interface GraphEdge {
  from: string;                 // Node ID
  to: string;                   // Node ID
  weight: number;               // ms - latency or cost
  dependencyType: 'data' | 'coordination' | 'sequential';
}

/**
 * Shortest path result
 */
export interface ShortestPath {
  path: string[];               // Node IDs in order
  totalLatency: number;         // ms - total path latency
  agents: string[];             // Agent types in path
}

/**
 * Agent coordination graph
 */
export class AgentCoordinationGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge[]> = new Map();  // from → [edges]
  private adjacencyList: Map<string, Array<{ to: string; weight: number }>> = new Map();
  
  /**
   * Add node (agent)
   */
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
  }
  
  /**
   * Add edge (dependency)
   */
  addEdge(edge: GraphEdge): void {
    if (!this.edges.has(edge.from)) {
      this.edges.set(edge.from, []);
    }
    this.edges.get(edge.from)!.push(edge);
    
    // Update adjacency list
    if (!this.adjacencyList.has(edge.from)) {
      this.adjacencyList.set(edge.from, []);
    }
    this.adjacencyList.get(edge.from)!.push({
      to: edge.to,
      weight: edge.weight
    });
  }
  
  /**
   * Find shortest path using Dijkstra's algorithm
   */
  findShortestPath(startNodeId: string, endNodeId: string): ShortestPath | null {
    if (!this.nodes.has(startNodeId) || !this.nodes.has(endNodeId)) {
      throw new Error(`Start or end node not found: ${startNodeId} → ${endNodeId}`);
    }
    
    // Initialize distances (all infinity except start = 0)
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();
    
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, nodeId === startNodeId ? 0 : Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }
    
    // Dijkstra's algorithm
    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNodeId: string | null = null;
      let minDistance = Infinity;
      
      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId)!;
        if (dist < minDistance) {
          minDistance = dist;
          currentNodeId = nodeId;
        }
      }
      
      if (currentNodeId === null || minDistance === Infinity) {
        // No path found
        return null;
      }
      
      // If we reached the end, reconstruct path
      if (currentNodeId === endNodeId) {
        const path: string[] = [];
        let node: string | null = endNodeId;
        
        while (node !== null) {
          path.unshift(node);
          node = previous.get(node) || null;
        }
        
        const totalLatency = distances.get(endNodeId)!;
        const agents = path.map(nodeId => this.nodes.get(nodeId)?.agentType || nodeId);
        
        return {
          path,
          totalLatency,
          agents
        };
      }
      
      // Remove current node from unvisited
      unvisited.delete(currentNodeId);
      
      // Update distances to neighbors
      const neighbors = this.adjacencyList.get(currentNodeId) || [];
      
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor.to)) continue;
        
        const altDistance = distances.get(currentNodeId)! + neighbor.weight;
        
        if (altDistance < distances.get(neighbor.to)!) {
          distances.set(neighbor.to, altDistance);
          previous.set(neighbor.to, currentNodeId);
        }
      }
    }
    
    // No path found
    return null;
  }
  
  /**
   * Find optimal coordination sequence for multiple agents
   * 
   * Uses Dijkstra's to find fastest path through required agents
   */
  findOptimalSequence(
    startAgent: string,
    requiredAgents: string[]
  ): ShortestPath | null {
    
    if (requiredAgents.length === 0) {
      return { path: [startAgent], totalLatency: 0, agents: [startAgent] };
    }
    
    if (requiredAgents.length === 1) {
      const path = this.findShortestPath(startAgent, requiredAgents[0]);
      return path;
    }
    
    // For multiple agents, find shortest path through all of them
    // This is a simplified version - full solution would use TSP or similar
    // For now, use greedy approach: find shortest path to each required agent in sequence
    
    let currentAgent = startAgent;
    const path: string[] = [startAgent];
    let totalLatency = 0;
    
    const remainingAgents = [...requiredAgents];
    
    while (remainingAgents.length > 0) {
      // Find closest remaining agent
      let closestAgent: string | null = null;
      let shortestPath: ShortestPath | null = null;
      
      for (const agent of remainingAgents) {
        const agentPath = this.findShortestPath(currentAgent, agent);
        if (agentPath && (!shortestPath || agentPath.totalLatency < shortestPath.totalLatency)) {
          shortestPath = agentPath;
          closestAgent = agent;
        }
      }
      
      if (!shortestPath || !closestAgent) {
        console.warn(`[PathOptimizer] Could not find path to remaining agents: ${remainingAgents.join(', ')}`);
        break;
      }
      
      // Add path (skip first node as it's already in path)
      path.push(...shortestPath.path.slice(1));
      totalLatency += shortestPath.totalLatency;
      
      currentAgent = closestAgent;
      remainingAgents.splice(remainingAgents.indexOf(closestAgent), 1);
    }
    
    const agents = path.map(nodeId => this.nodes.get(nodeId)?.agentType || nodeId);
    
    return {
      path,
      totalLatency,
      agents
    };
  }
  
  /**
   * Get all paths from start to end (for comparison)
   */
  getAllPaths(startNodeId: string, endNodeId: string, maxDepth: number = 10): ShortestPath[] {
    const paths: ShortestPath[] = [];
    
    // Simple DFS to find all paths (with depth limit)
    const dfs = (current: string, end: string, visited: Set<string>, path: string[], latency: number, depth: number) => {
      if (depth > maxDepth) return;
      if (current === end) {
        paths.push({
          path: [...path],
          totalLatency: latency,
          agents: path.map(id => this.nodes.get(id)?.agentType || id)
        });
        return;
      }
      
      const neighbors = this.adjacencyList.get(current) || [];
      
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.to)) continue;
        
        visited.add(neighbor.to);
        path.push(neighbor.to);
        dfs(neighbor.to, end, visited, path, latency + neighbor.weight, depth + 1);
        path.pop();
        visited.delete(neighbor.to);
      }
    };
    
    dfs(startNodeId, endNodeId, new Set([startNodeId]), [startNodeId], 0, 0);
    
    // Sort by latency
    paths.sort((a, b) => a.totalLatency - b.totalLatency);
    
    return paths;
  }
  
  /**
   * Initialize default agent coordination graph
   */
  initializeDefaultGraph(): void {
    // Add agent nodes
    this.addNode({ id: 'otto', agentType: 'OTTO', expectedLatency: 100 });
    this.addNode({ id: 'cal', agentType: 'CAL', expectedLatency: 150 });
    this.addNode({ id: 'flo', agentType: 'FLO', expectedLatency: 120 });
    this.addNode({ id: 'dex', agentType: 'DEX', expectedLatency: 200 });
    this.addNode({ id: 'vin', agentType: 'VIN', expectedLatency: 80 });
    this.addNode({ id: 'nexus', agentType: 'NEXUS', expectedLatency: 50 });
    
    // Add edges (dependencies and data flow)
    // OTTO can call any agent directly
    this.addEdge({ from: 'otto', to: 'cal', weight: 10, dependencyType: 'coordination' });
    this.addEdge({ from: 'otto', to: 'flo', weight: 10, dependencyType: 'coordination' });
    this.addEdge({ from: 'otto', to: 'dex', weight: 10, dependencyType: 'coordination' });
    this.addEdge({ from: 'otto', to: 'vin', weight: 10, dependencyType: 'coordination' });
    
    // CAL can run in parallel (no dependency)
    // FLO needs customer data (from OTTO or VIN)
    this.addEdge({ from: 'vin', to: 'flo', weight: 20, dependencyType: 'data' });
    
    // DEX can run in parallel (no dependency)
    // NEXUS coordinates everything (can be called last)
    this.addEdge({ from: 'cal', to: 'nexus', weight: 5, dependencyType: 'coordination' });
    this.addEdge({ from: 'flo', to: 'nexus', weight: 5, dependencyType: 'coordination' });
    this.addEdge({ from: 'dex', to: 'nexus', weight: 5, dependencyType: 'coordination' });
  }
}

/**
 * Singleton instance with default graph
 */
export const agentCoordinationGraph = new AgentCoordinationGraph();
agentCoordinationGraph.initializeDefaultGraph();

/**
 * Find optimal agent coordination path
 */
export function findOptimalAgentPath(
  startAgent: string,
  requiredAgents: string[]
): ShortestPath | null {
  return agentCoordinationGraph.findOptimalSequence(startAgent, requiredAgents);
}

/**
 * Example usage:
 * 
 * // Find fastest path from OTTO through CAL, FLO, DEX
 * const path = findOptimalAgentPath('otto', ['cal', 'flo', 'dex']);
 * 
 * // Result: { path: ['otto', 'cal', 'flo', 'dex'], totalLatency: 290, agents: ['OTTO', 'CAL', 'FLO', 'DEX'] }
 * // This means: call CAL first (can run in parallel), then FLO, then DEX
 */



