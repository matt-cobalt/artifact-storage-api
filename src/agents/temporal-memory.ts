/**
 * Agent Integration Hook for Temporal Memory
 * All 25 agents use this for knowledge graph queries
 * Provides fallback to Supabase if Neo4j unavailable
 */

import { isNeo4jHealthy, queryEntityAtTime, getEntityRelationships } from '../lib/neo4j-driver.js';
import { hybridQuery } from '../lib/temporal-query.js';
import { createClient } from '@supabase/supabase-js';
import type { MemoryResult, TemporalQueryOptions, EntityNode, TemporalEdge } from '../types/knowledge-graph.js';

// Lazy Supabase client creation
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key);
}

/**
 * Query temporal memory for agent
 * Primary interface for all agents to access knowledge graph
 * @param agentId Agent ID (e.g., 'OTTO', 'DEX', 'MILES')
 * @param query Natural language query or entity ID
 * @param options Temporal query options (time context, history, depth)
 */
export async function queryTemporalMemory(
  agentId: string,
  query: string,
  options: TemporalQueryOptions = {}
): Promise<MemoryResult> {
  const startTime = Date.now();
  
  // Try Neo4j first (fast, rich context)
  if (isNeo4jHealthy()) {
    try {
      return await queryNeo4jMemory(agentId, query, options);
    } catch (error) {
      console.error(`[${agentId}] Neo4j query failed, falling back to Supabase:`, error);
      // Fall through to Supabase fallback
    }
  } else {
    console.warn(`[${agentId}] Neo4j unavailable, using Supabase fallback`);
  }
  
  // Fallback to Supabase
  return await querySupabaseFallback(agentId, query, options, startTime);
}

/**
 * Query Neo4j knowledge graph
 */
async function queryNeo4jMemory(
  agentId: string,
  query: string,
  options: TemporalQueryOptions
): Promise<MemoryResult> {
  const startTime = Date.now();
  
  // Determine if query is entity ID or natural language
  const isEntityId = /^[a-z_]+_\w+$/i.test(query.trim());
  
  if (isEntityId) {
    // Direct entity lookup
    const timeContext = options.timeContext || new Date();
    const entity = await queryEntityAtTime(query.trim(), timeContext);
    
    if (!entity) {
      return {
        entities: [],
        relationships: [],
        context: `No entity found with ID: ${query}`,
        query_latency_ms: Date.now() - startTime,
        source: 'neo4j'
      };
    }
    
    const relationships = await getEntityRelationships(
      entity.id,
      options.includeHistory || false
    );
    
    return {
      entities: [entity],
      relationships,
      context: `Found entity ${entity.id} of type ${entity.type}`,
      query_latency_ms: Date.now() - startTime,
      source: 'neo4j'
    };
  } else {
    // Natural language query - use hybrid search
    const maxDepth = options.maxDepth || 3;
    const results = await hybridQuery(query, {
      maxResults: 5,
      maxLatency: 200
    });
    
    // Flatten results
    const allEntities = results.flatMap(r => r.nodes);
    const allEdges: TemporalEdge[] = results.flatMap(r => r.edges);
    
    // Deduplicate entities
    const entityMap = new Map<string, EntityNode>();
    allEntities.forEach(e => entityMap.set(e.id, e));
    
    return {
      entities: Array.from(entityMap.values()),
      relationships: allEdges,
      context: `Found ${entityMap.size} entities matching: ${query}`,
      query_latency_ms: Date.now() - startTime,
      source: 'neo4j'
    };
  }
}

/**
 * Fallback to Supabase if Neo4j unavailable
 * Maps knowledge graph queries to Supabase table queries
 */
async function querySupabaseFallback(
  agentId: string,
  query: string,
  options: TemporalQueryOptions,
  startTime: number
): Promise<MemoryResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    // No Supabase configured - return empty result
    return {
      entities: [],
      relationships: [],
      context: 'Supabase not configured - Neo4j unavailable and no fallback',
      query_latency_ms: Date.now() - startTime,
      source: 'supabase_fallback'
    };
  }
  
  // Log fallback event
  await logFallbackEvent(agentId, query);
  
  // Simple fallback: query customers table for now
  // In production, this would map query to appropriate Supabase tables
  const isEntityId = /^cust_\w+$/i.test(query.trim());
  
  if (isEntityId) {
    // Query customer by ID
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', query.trim())
      .single();
    
    if (error || !data) {
      return {
        entities: [],
        relationships: [],
        context: `No customer found with ID: ${query}`,
        query_latency_ms: Date.now() - startTime,
        source: 'supabase_fallback'
      };
    }
    
    // Convert Supabase row to EntityNode
    const entity: EntityNode = {
      id: data.id,
      type: 'Customer',
      properties: data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString()
    };
    
    return {
      entities: [entity],
      relationships: [], // Relationships not easily mapped in fallback
      context: `Found customer from Supabase fallback: ${query}`,
      query_latency_ms: Date.now() - startTime,
      source: 'supabase_fallback'
    };
  } else {
    // Text search fallback - search customer names
    const searchTerm = query.trim().toLowerCase();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(5);
    
    if (error || !data || data.length === 0) {
      return {
        entities: [],
        relationships: [],
        context: `No results found in Supabase for: ${query}`,
        query_latency_ms: Date.now() - startTime,
        source: 'supabase_fallback'
      };
    }
    
    const entities: EntityNode[] = data.map((row: any) => ({
      id: row.id,
      type: 'Customer',
      properties: row,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString()
    }));
    
    return {
      entities,
      relationships: [],
      context: `Found ${entities.length} customers from Supabase fallback`,
      query_latency_ms: Date.now() - startTime,
      source: 'supabase_fallback'
    };
  }
}

/**
 * Log fallback events for monitoring
 */
async function logFallbackEvent(agentId: string, query: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return; // Skip logging if Supabase not configured
    
    // Log to Supabase analytics or monitoring table
    await supabase.from('agent_fallback_events').insert({
      agent_id: agentId,
      query: query.substring(0, 500), // Truncate long queries
      timestamp: new Date().toISOString(),
      reason: 'neo4j_unavailable'
    });
  } catch (error) {
    console.error('[TemporalMemory] Failed to log fallback event:', error);
    // Don't throw - logging failure shouldn't break queries
  }
}

/**
 * Helper function for agents to get customer history
 * Common use case for many agents
 */
export async function getCustomerHistory(
  customerId: string,
  agentId: string = 'SYSTEM'
): Promise<MemoryResult> {
  return queryTemporalMemory(agentId, customerId, {
    includeHistory: true,
    maxDepth: 3
  });
}

/**
 * Helper function for agents to find related entities
 * Example: "Find all vehicles owned by customer X"
 */
export async function findRelatedEntities(
  entityId: string,
  relationshipType: string,
  agentId: string = 'SYSTEM'
): Promise<MemoryResult> {
  const query = `entities connected via ${relationshipType} from ${entityId}`;
  return queryTemporalMemory(agentId, query, {
    maxDepth: 1
  });
}



