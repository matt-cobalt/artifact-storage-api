/**
 * Workflow Coordinator - Multi-agent workflow execution engine
 * Coordinates complex workflows across multiple agents with dependencies
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { EventBus } from './event-bus.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * WorkflowCoordinator class for managing multi-agent workflows
 */
export class WorkflowCoordinator {
  constructor(shopId = null) {
    this.shopId = shopId;
    this.eventBus = new EventBus(shopId);
  }

  /**
   * Start a new workflow execution
   * @param {string} workflowId - Unique workflow ID
   * @param {string} workflowName - Human-readable workflow name
   * @param {Array} steps - Array of step definitions
   * @returns {Promise<Object>} Workflow execution record
   */
  async startWorkflow(workflowId, workflowName, steps) {
    try {
      // Validate steps structure
      if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error('Workflow must have at least one step');
      }

      // Create workflow execution record
      const { data: execution, error } = await supabase
        .from('workflow_executions')
        .insert({
          shop_id: this.shopId,
          workflow_id: workflowId,
          workflow_name: workflowName,
          status: 'pending',
          current_step: 0,
          total_steps: steps.length,
          steps: steps.map((step, index) => ({
            step_id: step.step_id || `step-${index + 1}`,
            agent_id: step.agent_id,
            status: 'pending',
            dependencies: step.dependencies || [],
            parallel_group: step.parallel_group || null,
            result: null,
            error: null
          })),
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create workflow execution:', error);
        throw new Error(`Workflow creation failed: ${error.message}`);
      }

      // Update status to running
      await supabase
        .from('workflow_executions')
        .update({ status: 'running' })
        .eq('id', execution.id);

      // Publish workflow started event
      await this.eventBus.publish('workflow-events', 'WORKFLOW_STARTED', {
        workflow_id: workflowId,
        execution_id: execution.id,
        workflow_name: workflowName,
        total_steps: steps.length
      }, 'workflow-coordinator');

      // Trigger initial steps (those with no dependencies)
      await this.triggerReadySteps(execution.id, execution.steps);

      return execution;
    } catch (error) {
      console.error('WorkflowCoordinator.startWorkflow error:', error);
      throw error;
    }
  }

  /**
   * Resolve a workflow step (mark as complete and trigger next steps)
   * @param {string} executionId - Workflow execution ID
   * @param {string} stepId - Step ID that completed
   * @param {Object} result - Step result
   * @returns {Promise<Object>} Updated workflow execution
   */
  async resolveStep(executionId, stepId, result) {
    try {
      // Get workflow execution
      const { data: execution, error: fetchError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (fetchError || !execution) {
        throw new Error(`Workflow execution not found: ${executionId}`);
      }

      // Update step status
      const updatedSteps = execution.steps.map(step => {
        if (step.step_id === stepId) {
          return {
            ...step,
            status: 'completed',
            result,
            completed_at: new Date().toISOString()
          };
        }
        return step;
      });

      // Update workflow execution
      const { data: updatedExecution, error: updateError } = await supabase
        .from('workflow_executions')
        .update({
          steps: updatedSteps,
          current_step: Math.max(
            execution.current_step,
            updatedSteps.findIndex(s => s.status === 'completed') + 1
          )
        })
        .eq('id', executionId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update workflow: ${updateError.message}`);
      }

      // Publish step completion event
      await this.eventBus.publish('workflow-events', 'STEP_COMPLETED', {
        workflow_id: execution.workflow_id,
        execution_id: executionId,
        step_id: stepId,
        result
      }, 'workflow-coordinator');

      // Check if workflow is complete
      const allCompleted = updatedSteps.every(step => step.status === 'completed');
      if (allCompleted) {
        await this.completeWorkflow(executionId, updatedSteps);
      } else {
        // Trigger next steps that are now ready
        await this.triggerReadySteps(executionId, updatedSteps);
      }

      return updatedExecution;
    } catch (error) {
      console.error('WorkflowCoordinator.resolveStep error:', error);
      throw error;
    }
  }

  /**
   * Handle dependencies and trigger ready steps
   * @private
   */
  async triggerReadySteps(executionId, steps) {
    const readySteps = steps.filter(step => {
      if (step.status !== 'pending') return false;
      
      // Check if all dependencies are completed
      const dependenciesMet = step.dependencies.every(depId => {
        const depStep = steps.find(s => s.step_id === depId);
        return depStep && depStep.status === 'completed';
      });

      return dependenciesMet;
    });

    // Group steps by parallel_group
    const parallelGroups = new Map();
    readySteps.forEach(step => {
      const group = step.parallel_group || `sequential-${step.step_id}`;
      if (!parallelGroups.has(group)) {
        parallelGroups.set(group, []);
      }
      parallelGroups.get(group).push(step);
    });

    // Trigger steps in parallel groups
    for (const [group, groupSteps] of parallelGroups) {
      if (groupSteps.length === 1) {
        // Single step - trigger directly
        await this.triggerStep(executionId, groupSteps[0]);
      } else {
        // Parallel steps - trigger all simultaneously
        await this.parallelExecution(executionId, groupSteps.map(s => s.step_id));
      }
    }
  }

  /**
   * Trigger a single workflow step
   * @private
   */
  async triggerStep(executionId, step) {
    try {
      // Mark step as running
      const { data: execution } = await supabase
        .from('workflow_executions')
        .select('steps')
        .eq('id', executionId)
        .single();

      const updatedSteps = execution.steps.map(s => 
        s.step_id === step.step_id 
          ? { ...s, status: 'running', started_at: new Date().toISOString() }
          : s
      );

      await supabase
        .from('workflow_executions')
        .update({ steps: updatedSteps })
        .eq('id', executionId);

      // Publish task delegation event to trigger agent
      await this.eventBus.publish('agent-coordination', 'TASK_DELEGATION', {
        workflow_execution_id: executionId,
        step_id: step.step_id,
        agent_id: step.agent_id,
        task: step.task || `Workflow step: ${step.step_id}`,
        dependencies_met: true
      }, 'workflow-coordinator');
    } catch (error) {
      console.error('WorkflowCoordinator.triggerStep error:', error);
      throw error;
    }
  }

  /**
   * Execute multiple steps in parallel
   * @param {string} executionId - Workflow execution ID
   * @param {Array<string>} stepIds - Array of step IDs to execute in parallel
   * @returns {Promise<void>}
   */
  async parallelExecution(executionId, stepIds) {
    try {
      const { data: execution } = await supabase
        .from('workflow_executions')
        .select('steps')
        .eq('id', executionId)
        .single();

      // Trigger all steps simultaneously
      const promises = stepIds.map(stepId => {
        const step = execution.steps.find(s => s.step_id === stepId);
        if (step) {
          return this.triggerStep(executionId, step);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('WorkflowCoordinator.parallelExecution error:', error);
      throw error;
    }
  }

  /**
   * Synthesize results from multiple parallel steps
   * @param {string} executionId - Workflow execution ID
   * @param {Array<string>} stepIds - Step IDs to synthesize
   * @param {Function} synthesizer - Function to combine results
   * @returns {Promise<Object>} Synthesized result
   */
  async synthesizeResults(executionId, stepIds, synthesizer) {
    try {
      const { data: execution } = await supabase
        .from('workflow_executions')
        .select('steps')
        .eq('id', executionId)
        .single();

      const results = stepIds.map(stepId => {
        const step = execution.steps.find(s => s.step_id === stepId);
        return step ? step.result : null;
      }).filter(r => r !== null);

      const synthesized = await synthesizer(results);
      return synthesized;
    } catch (error) {
      console.error('WorkflowCoordinator.synthesizeResults error:', error);
      throw error;
    }
  }

  /**
   * Mark workflow as completed
   * @private
   */
  async completeWorkflow(executionId, steps) {
    try {
      const results = steps.map(s => ({
        step_id: s.step_id,
        agent_id: s.agent_id,
        result: s.result
      }));

      await supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          result: { steps: results },
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);

      // Publish workflow completion event
      const { data: execution } = await supabase
        .from('workflow_executions')
        .select('workflow_id, workflow_name')
        .eq('id', executionId)
        .single();

      await this.eventBus.publish('workflow-events', 'WORKFLOW_COMPLETED', {
        workflow_id: execution.workflow_id,
        execution_id: executionId,
        workflow_name: execution.workflow_name,
        results
      }, 'workflow-coordinator');
    } catch (error) {
      console.error('WorkflowCoordinator.completeWorkflow error:', error);
      throw error;
    }
  }

  /**
   * Get workflow execution status
   * @param {string} executionId - Workflow execution ID
   * @returns {Promise<Object>} Workflow execution record
   */
  async getWorkflowStatus(executionId) {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (error) {
        throw new Error(`Failed to get workflow status: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('WorkflowCoordinator.getWorkflowStatus error:', error);
      throw error;
    }
  }
}

export default WorkflowCoordinator;



















