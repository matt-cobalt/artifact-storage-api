/**
 * Forge Agent Coordination Utilities
 * Helper functions for Squad → Forge task delegation and Forge → Forge coordination
 */

import { createClient } from '@supabase/supabase-js';
import ArtifactStorage from '../artifact-storage/core.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Create a task for a Forge agent
 * @param {Object} params
 * @param {string} params.taskName - Task name/title
 * @param {string} params.assignedAgent - Forge agent ID (forge, atlas, scout, etc.)
 * @param {string} params.createdBy - Who created this (agent ID or user ID)
 * @param {Object} params.inputContext - Context/requirements for the task
 * @param {string} params.priority - Priority level (low, medium, high, critical)
 * @param {Array<string>} params.dependencies - Array of task IDs that must complete first
 * @param {number} params.estimatedHours - Estimated hours to complete
 * @returns {Promise<Object>} Created task
 */
export async function createForgeTask({
  taskName,
  description,
  assignedAgent,
  createdBy,
  inputContext = {},
  priority = 'medium',
  dependencies = [],
  estimatedHours = null
}) {
  const { data: task, error } = await supabase
    .from('forge_tasks')
    .insert({
      task_name: taskName,
      description,
      assigned_agent: assignedAgent,
      created_by: createdBy,
      input_context: inputContext,
      priority,
      dependencies,
      estimated_hours: estimatedHours,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create forge task: ${error.message}`);
  }

  // Create artifact for task creation
  await ArtifactStorage.createArtifact({
    type: 'forge_task_created',
    data: {
      task_id: task.id,
      task_name: taskName,
      assigned_agent: assignedAgent,
      created_by: createdBy,
      priority
    },
    provenance: {
      agent: createdBy,
      source: 'forge_coordination',
      trigger: 'task_creation'
    },
    metadata: {
      task_id: task.id
    }
  });

  return task;
}

/**
 * Get pending tasks for a Forge agent
 * @param {string} agentId - Forge agent ID
 * @returns {Promise<Array>} Array of pending tasks
 */
export async function getPendingTasksForAgent(agentId) {
  const { data, error } = await supabase.rpc('get_pending_forge_tasks', {
    p_agent_name: agentId
  });

  if (error) {
    throw new Error(`Failed to get pending tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Update task status
 * @param {string} taskId - Task UUID
 * @param {string} status - New status (pending, in_progress, completed, blocked, cancelled)
 * @param {string} outputArtifactId - Optional artifact ID for completed work
 * @returns {Promise<Object>} Updated task
 */
export async function updateTaskStatus(taskId, status, outputArtifactId = null) {
  const updateData = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === 'in_progress' && !outputArtifactId) {
    updateData.started_at = new Date().toISOString();
  }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
    if (outputArtifactId) {
      updateData.output_artifact_id = outputArtifactId;
    }
  }

  const { data: task, error } = await supabase
    .from('forge_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task status: ${error.message}`);
  }

  return task;
}

/**
 * Send coordination message from one agent to another
 * @param {Object} params
 * @param {string} params.fromAgent - Source agent ID
 * @param {string} params.toAgent - Target agent ID
 * @param {string} params.message - Message content
 * @param {string} params.coordinationType - Type (delegation, question, update, blocker, handoff)
 * @param {string} params.taskId - Optional related task ID
 * @param {Object} params.metadata - Optional metadata
 * @returns {Promise<Object>} Created coordination message
 */
export async function sendCoordinationMessage({
  fromAgent,
  toAgent,
  message,
  coordinationType = 'delegation',
  taskId = null,
  metadata = {}
}) {
  const { data: coordination, error } = await supabase
    .from('forge_coordination')
    .insert({
      from_agent: fromAgent,
      to_agent: toAgent,
      message,
      coordination_type: coordinationType,
      task_id: taskId,
      metadata,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to send coordination message: ${error.message}`);
  }

  // Create artifact for coordination
  await ArtifactStorage.createArtifact({
    type: 'forge_coordination',
    data: {
      coordination_id: coordination.id,
      from_agent: fromAgent,
      to_agent: toAgent,
      message,
      coordination_type: coordinationType,
      task_id: taskId
    },
    provenance: {
      agent: fromAgent,
      source: 'forge_coordination',
      trigger: 'agent_message'
    },
    metadata: {
      coordination_id: coordination.id
    }
  });

  return coordination;
}

/**
 * Get coordination messages for an agent
 * @param {string} agentId - Agent ID
 * @param {number} limit - Maximum number of messages to return
 * @returns {Promise<Array>} Array of coordination messages
 */
export async function getCoordinationMessagesForAgent(agentId, limit = 10) {
  const { data, error } = await supabase.rpc('get_forge_coordination_for_agent', {
    p_agent_name: agentId,
    p_limit: limit
  });

  if (error) {
    throw new Error(`Failed to get coordination messages: ${error.message}`);
  }

  return data || [];
}

/**
 * Acknowledge a coordination message
 * @param {string} coordinationId - Coordination message ID
 * @param {string} response - Optional response message
 * @returns {Promise<Object>} Updated coordination message
 */
export async function acknowledgeCoordination(coordinationId, response = null) {
  const updateData = {
    status: 'acknowledged',
    acknowledged_at: new Date().toISOString()
  };

  if (response) {
    updateData.response = response;
  }

  const { data: coordination, error } = await supabase
    .from('forge_coordination')
    .update(updateData)
    .eq('id', coordinationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to acknowledge coordination: ${error.message}`);
  }

  return coordination;
}

/**
 * Store agent memory/context
 * @param {Object} params
 * @param {string} params.agentName - Agent ID
 * @param {string} params.memoryType - Type (work_history, learned_pattern, code_snippet, decision)
 * @param {Object} params.content - Memory content
 * @param {string} params.relatedTaskId - Optional related task ID
 * @param {number} params.relevanceScore - Relevance score (0-1)
 * @returns {Promise<Object>} Created memory record
 */
export async function storeAgentMemory({
  agentName,
  memoryType,
  content,
  relatedTaskId = null,
  relevanceScore = 1.0
}) {
  const { data: memory, error } = await supabase
    .from('forge_agent_memory')
    .insert({
      agent_name: agentName,
      memory_type: memoryType,
      content,
      related_task_id: relatedTaskId,
      relevance_score: relevanceScore,
      last_accessed: new Date().toISOString(),
      access_count: 0
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store agent memory: ${error.message}`);
  }

  return memory;
}

/**
 * Retrieve agent memory by type
 * @param {string} agentName - Agent ID
 * @param {string} memoryType - Type to retrieve
 * @param {number} limit - Maximum number of memories to return
 * @returns {Promise<Array>} Array of memory records
 */
export async function getAgentMemory(agentName, memoryType = null, limit = 10) {
  let query = supabase
    .from('forge_agent_memory')
    .select('*')
    .eq('agent_name', agentName)
    .order('relevance_score', { ascending: false })
    .limit(limit);

  if (memoryType) {
    query = query.eq('memory_type', memoryType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get agent memory: ${error.message}`);
  }

  // Update last_accessed and access_count
  if (data && data.length > 0) {
    const ids = data.map(m => m.id);
    await supabase
      .from('forge_agent_memory')
      .update({
        last_accessed: new Date().toISOString(),
        access_count: supabase.raw('access_count + 1')
      })
      .in('id', ids);
  }

  return data || [];
}

/**
 * Delegate task from Squad agent to Forge agent
 * Helper function for Squad agents to use
 * @param {Object} params
 * @param {string} params.fromAgent - Squad agent ID (e.g., 'otto')
 * @param {string} params.toAgent - Forge agent ID (e.g., 'forge', 'atlas')
 * @param {string} params.taskName - Task name
 * @param {string} params.description - Task description
 * @param {Object} params.context - Task context/requirements
 * @param {string} params.priority - Priority level
 * @returns {Promise<Object>} Created task and coordination message
 */
export async function delegateToForgeAgent({
  fromAgent,
  toAgent,
  taskName,
  description,
  context = {},
  priority = 'medium'
}) {
  // Create task
  const task = await createForgeTask({
    taskName,
    description,
    assignedAgent: toAgent,
    createdBy: fromAgent,
    inputContext: context,
    priority
  });

  // Send coordination message
  const coordination = await sendCoordinationMessage({
    fromAgent,
    toAgent,
    message: `New task assigned: ${taskName}. ${description}`,
    coordinationType: 'delegation',
    taskId: task.id,
    metadata: { task_name: taskName, priority }
  });

  return {
    task,
    coordination
  };
}

export default {
  createForgeTask,
  getPendingTasksForAgent,
  updateTaskStatus,
  sendCoordinationMessage,
  getCoordinationMessagesForAgent,
  acknowledgeCoordination,
  storeAgentMemory,
  getAgentMemory,
  delegateToForgeAgent
};



















