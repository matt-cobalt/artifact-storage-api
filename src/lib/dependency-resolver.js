/**
 * Dependency Resolver - Builds dependency graphs and determines execution order
 * Handles topological sorting and parallel batch identification
 */

/**
 * Build dependency graph from steps
 * @param {Array} steps - Array of steps with dependencies
 * @returns {Object} Dependency graph { stepId: [dependentStepIds] }
 */
export function buildDependencyGraph(steps) {
  const graph = {};
  
  // Initialize graph with all steps
  steps.forEach(step => {
    graph[step.id] = [];
  });

  // Build edges: step -> depends on -> prerequisite
  steps.forEach(step => {
    if (step.dependencies && step.dependencies.length > 0) {
      step.dependencies.forEach(depId => {
        if (graph[depId]) {
          graph[depId].push(step.id);
        }
      });
    }
  });

  return graph;
}

/**
 * Detect circular dependencies using DFS
 * @param {Object} graph - Dependency graph
 * @returns {Array} Array of cycles found (empty if none)
 */
export function detectCircularDependencies(graph) {
  const cycles = [];
  const visited = new Set();
  const recStack = new Set();

  function dfs(node, path) {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = dfs(neighbor, [...path]);
        if (cycle) {
          cycles.push(cycle);
        }
      } else if (recStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        cycles.push([...path.slice(cycleStart), neighbor]);
      }
    }

    recStack.delete(node);
    return null;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

/**
 * Topological sort to determine execution order
 * @param {Object} graph - Dependency graph
 * @param {Array} steps - Array of all steps
 * @returns {Array} Steps in execution order
 */
export function topologicalSort(graph, steps) {
  const inDegree = {};
  const queue = [];
  const result = [];

  // Initialize in-degree count
  steps.forEach(step => {
    inDegree[step.id] = 0;
  });

  // Calculate in-degrees
  steps.forEach(step => {
    const dependents = graph[step.id] || [];
    dependents.forEach(depId => {
      inDegree[depId] = (inDegree[depId] || 0) + 1;
    });
  });

  // Find all nodes with no incoming edges
  steps.forEach(step => {
    if (inDegree[step.id] === 0) {
      queue.push(step);
    }
  });

  // Process queue
  while (queue.length > 0) {
    const step = queue.shift();
    result.push(step);

    // Reduce in-degree for dependent steps
    const dependents = graph[step.id] || [];
    dependents.forEach(depId => {
      inDegree[depId]--;
      if (inDegree[depId] === 0) {
        const depStep = steps.find(s => s.id === depId);
        if (depStep) {
          queue.push(depStep);
        }
      }
    });
  }

  // Check for cycles (if result length < steps length)
  if (result.length < steps.length) {
    const cycles = detectCircularDependencies(graph);
    throw new Error(`Circular dependency detected: ${JSON.stringify(cycles)}`);
  }

  return result;
}

/**
 * Identify parallel batches (steps that can execute simultaneously)
 * @param {Object} graph - Dependency graph
 * @param {Array} steps - Array of all steps
 * @returns {Array<Array>} Array of batches, each batch can execute in parallel
 */
export function identifyParallelBatches(graph, steps) {
  const batches = [];
  const executed = new Set();
  const remainingSteps = [...steps];

  while (remainingSteps.length > 0) {
    // Find steps with no dependencies or all dependencies executed
    const readyBatch = remainingSteps.filter(step => {
      if (!step.dependencies || step.dependencies.length === 0) {
        return true;
      }
      return step.dependencies.every(depId => executed.has(depId));
    });

    if (readyBatch.length === 0) {
      // Should not happen if graph is valid
      throw new Error('No ready steps found - circular dependency or invalid graph');
    }

    batches.push(readyBatch);

    // Mark batch as executed
    readyBatch.forEach(step => {
      executed.add(step.id);
      const index = remainingSteps.findIndex(s => s.id === step.id);
      if (index !== -1) {
        remainingSteps.splice(index, 1);
      }
    });
  }

  return batches;
}

/**
 * Validate dependency graph
 * @param {Array} steps - Array of steps with dependencies
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
export function validateDependencyGraph(steps) {
  const errors = [];
  
  // Check for circular dependencies
  const graph = buildDependencyGraph(steps);
  const cycles = detectCircularDependencies(graph);
  
  if (cycles.length > 0) {
    errors.push(`Circular dependencies detected: ${JSON.stringify(cycles)}`);
  }

  // Check for invalid dependency references
  const stepIds = new Set(steps.map(s => s.id));
  steps.forEach(step => {
    if (step.dependencies) {
      step.dependencies.forEach(depId => {
        if (!stepIds.has(depId)) {
          errors.push(`Step ${step.id} references invalid dependency ${depId}`);
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  buildDependencyGraph,
  detectCircularDependencies,
  topologicalSort,
  identifyParallelBatches,
  validateDependencyGraph
};



















