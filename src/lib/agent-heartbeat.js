/**
 * Agent Heartbeat System - Presence and health monitoring
 * Agents send heartbeats every 30 seconds to indicate they're alive
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { EventBus } from './event-bus.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * AgentHeartbeat class for managing agent presence
 */
export class AgentHeartbeat {
  constructor(agentId, shopId = null, options = {}) {
    this.agentId = agentId;
    this.shopId = shopId;
    this.intervalMs = options.intervalMs || 30000; // Default 30 seconds
    this.heartbeatTimer = null;
    this.eventBus = new EventBus(shopId);
    this.isRunning = false;
  }

  /**
   * Start sending heartbeats
   * @param {string} status - Initial status (idle, working, etc.)
   * @param {Object} metadata - Optional metadata
   */
  async start(status = 'idle', metadata = {}) {
    if (this.isRunning) {
      console.warn(`Heartbeat already running for agent ${this.agentId}`);
      return;
    }

    // Send initial heartbeat
    await this.sendHeartbeat(status, metadata);

    // Set up interval
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.sendHeartbeat(status, metadata);
      } catch (error) {
        console.error(`Heartbeat failed for agent ${this.agentId}:`, error);
      }
    }, this.intervalMs);

    this.isRunning = true;
    console.log(`Heartbeat started for agent ${this.agentId} (interval: ${this.intervalMs}ms)`);
  }

  /**
   * Stop sending heartbeats
   */
  stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Mark agent as offline
    this.sendHeartbeat('offline', {}).catch(error => {
      console.error(`Failed to mark agent offline: ${error.message}`);
    });

    this.isRunning = false;
    console.log(`Heartbeat stopped for agent ${this.agentId}`);
  }

  /**
   * Update status (while keeping heartbeat running)
   * @param {string} status - New status
   * @param {Object} metadata - Optional metadata
   */
  async updateStatus(status, metadata = {}) {
    if (!this.isRunning) {
      console.warn(`Cannot update status - heartbeat not running for agent ${this.agentId}`);
      return;
    }

    await this.sendHeartbeat(status, metadata);
  }

  /**
   * Send a heartbeat to the database
   * @private
   */
  async sendHeartbeat(status, metadata = {}) {
    try {
      const { error } = await supabase.rpc('update_agent_heartbeat', {
        p_agent_id: this.agentId,
        p_shop_id: this.shopId,
        p_status: status,
        p_current_task: metadata.current_task || null,
        p_current_task_id: metadata.current_task_id || null,
        p_metadata: {
          ...metadata,
          last_heartbeat_sent: new Date().toISOString()
        }
      });

      if (error) {
        console.error(`Failed to send heartbeat for agent ${this.agentId}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`AgentHeartbeat.sendHeartbeat error [${this.agentId}]:`, error);
      throw error;
    }
  }
}

/**
 * Check agent health (find stale heartbeats)
 * @param {string} shopId - Optional shop ID filter
 * @returns {Promise<Object>} Health check results
 */
export async function checkAgentHealth(shopId = null) {
  try {
    // Mark stale agents as offline
    const { data: staleCount, error: markError } = await supabase.rpc('mark_stale_agents_offline');

    if (markError) {
      console.error('Failed to mark stale agents offline:', markError);
    }

    // Get active agents
    const { data: activeAgents, error: activeError } = await supabase.rpc('get_active_agents', {
      p_shop_id: shopId
    });

    if (activeError) {
      throw new Error(`Failed to get active agents: ${activeError.message}`);
    }

    // Get all agents (including offline)
    const query = supabase
      .from('agent_status')
      .select('agent_id, status, last_heartbeat')
      .order('last_heartbeat', { ascending: false });

    if (shopId) {
      query.eq('shop_id', shopId);
    }

    const { data: allAgents, error: allError } = await query;

    if (allError) {
      throw new Error(`Failed to get all agents: ${allError.message}`);
    }

    return {
      active_count: activeAgents?.length || 0,
      total_count: allAgents?.length || 0,
      stale_marked: staleCount || 0,
      active_agents: activeAgents || [],
      all_agents: allAgents || []
    };
  } catch (error) {
    console.error('checkAgentHealth error:', error);
    throw error;
  }
}

export default AgentHeartbeat;



















