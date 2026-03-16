/**
 * Event Bus - Real-time agent communication system
 * Uses Supabase Realtime for pub/sub messaging between agents
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * EventBus class for real-time agent coordination
 */
export class EventBus {
  constructor(shopId = null) {
    this.shopId = shopId;
    this.subscriptions = new Map(); // channel -> subscription map
  }

  /**
   * Publish an event to a channel
   * @param {string} channel - Channel name
   * @param {string} eventType - Event type (e.g., 'TASK_DELEGATION', 'STATUS_UPDATE')
   * @param {Object} payload - Event payload
   * @param {string} publisherAgentId - ID of agent publishing the event
   * @returns {Promise<Object>} Event log entry with id
   */
  async publish(channel, eventType, payload, publisherAgentId = 'system') {
    try {
      // Log event to database for audit trail
      const { data: eventLog, error: logError } = await supabase
        .from('event_bus_log')
        .insert({
          shop_id: this.shopId,
          channel,
          event_type: eventType,
          publisher_agent_id: publisherAgentId,
          payload,
          delivered_count: 0
        })
        .select()
        .single();

      if (logError) {
        console.error('Failed to log event:', logError);
        throw new Error(`Event logging failed: ${logError.message}`);
      }

      // Publish to Supabase Realtime channel
      // Note: Supabase Realtime automatically broadcasts INSERT to subscribers
      // The event_bus_log table is enabled for Realtime, so the INSERT above triggers the broadcast

      return {
        event_id: eventLog.id,
        channel,
        event_type: eventType,
        created_at: eventLog.created_at,
        delivered_count: 0 // Will be updated as subscribers receive
      };
    } catch (error) {
      console.error(`EventBus.publish error [${channel}]:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to events on a channel
   * @param {string} channel - Channel name to subscribe to
   * @param {Function} callback - Callback function(event) when event received
   * @param {string} filterEventType - Optional: only receive specific event types
   * @returns {Promise<Function>} Unsubscribe function
   */
  async subscribe(channel, callback, filterEventType = null) {
    try {
      // Subscribe to Supabase Realtime changes on event_bus_log table
      // Filter by channel in the callback
      const subscription = supabase
        .channel(`event-bus:${channel}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'event_bus_log',
            filter: `channel=eq.${channel}`
          },
          async (payload) => {
            const event = payload.new;
            
            // Apply event type filter if specified
            if (filterEventType && event.event_type !== filterEventType) {
              return;
            }

            // Update delivered_count (approximate, as we can't track individual subscribers)
            await supabase
              .from('event_bus_log')
              .update({ delivered_count: supabase.raw('delivered_count + 1') })
              .eq('id', event.id);

            // Call the callback with event data
            callback({
              id: event.id,
              channel: event.channel,
              event_type: event.event_type,
              publisher_agent_id: event.publisher_agent_id,
              payload: event.payload,
              created_at: event.created_at
            });
          }
        )
        .subscribe();

      // Store subscription for cleanup
      const unsubscribeFn = () => {
        subscription.unsubscribe();
        this.subscriptions.delete(channel);
      };

      this.subscriptions.set(channel, { subscription, unsubscribe: unsubscribeFn });

      return unsubscribeFn;
    } catch (error) {
      console.error(`EventBus.subscribe error [${channel}]:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a channel
   * @param {string} channel - Channel to unsubscribe from
   */
  unsubscribe(channel) {
    const sub = this.subscriptions.get(channel);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(channel);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    this.subscriptions.forEach((sub, channel) => {
      sub.unsubscribe();
    });
    this.subscriptions.clear();
  }

  /**
   * Get list of active agents (online within last 90 seconds)
   * @param {string} shopId - Optional shop ID filter
   * @returns {Promise<Array>} Array of active agents
   */
  async getActiveAgents(shopId = null) {
    try {
      const { data, error } = await supabase.rpc('get_active_agents', {
        p_shop_id: shopId || this.shopId
      });

      if (error) {
        console.error('Failed to get active agents:', error);
        throw new Error(`Failed to get active agents: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('EventBus.getActiveAgents error:', error);
      throw error;
    }
  }

  /**
   * Broadcast agent status update
   * @param {string} agentId - Agent ID
   * @param {string} status - Status (idle, working, blocked, error, offline)
   * @param {Object} metadata - Optional metadata (current_task, progress, etc.)
   * @returns {Promise<void>}
   */
  async broadcastStatus(agentId, status, metadata = {}) {
    try {
      // Update agent_status table (triggers Realtime broadcast)
      const { error } = await supabase.rpc('update_agent_heartbeat', {
        p_agent_id: agentId,
        p_shop_id: this.shopId,
        p_status: status,
        p_current_task: metadata.current_task || null,
        p_current_task_id: metadata.current_task_id || null,
        p_metadata: metadata
      });

      if (error) {
        console.error('Failed to broadcast status:', error);
        throw new Error(`Status broadcast failed: ${error.message}`);
      }

      // Also publish to agent-status channel for event log
      await this.publish('agent-status', 'STATUS_UPDATE', {
        agent_id: agentId,
        status,
        ...metadata
      }, agentId);
    } catch (error) {
      console.error('EventBus.broadcastStatus error:', error);
      throw error;
    }
  }

  /**
   * Get recent events for a channel
   * @param {string} channel - Channel name
   * @param {number} limit - Number of events to retrieve
   * @returns {Promise<Array>} Array of recent events
   */
  async getRecentEvents(channel, limit = 100) {
    try {
      const { data, error } = await supabase.rpc('get_recent_events', {
        p_channel: channel,
        p_limit: limit,
        p_shop_id: this.shopId
      });

      if (error) {
        console.error('Failed to get recent events:', error);
        throw new Error(`Failed to get recent events: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('EventBus.getRecentEvents error:', error);
      throw error;
    }
  }
}

/**
 * Create a new EventBus instance
 * @param {string} shopId - Shop ID for shop-isolated events
 * @returns {EventBus} New EventBus instance
 */
export function createEventBus(shopId = null) {
  return new EventBus(shopId);
}

export default EventBus;



















