/**
 * TypeScript definitions for Temporal Knowledge Graph
 * Bi-temporal model with event_time + ingestion_time
 */

export interface TemporalEdge {
  relationship: string;
  from_node: string;
  to_node: string;
  valid_from: string;      // ISO datetime - when fact was true in real world
  valid_to?: string;       // ISO datetime or null (still valid)
  ingested_at: string;     // ISO datetime - when system learned it
  invalidated_at?: string; // ISO datetime or null (not invalidated)
  metadata?: Record<string, any>;
}

export interface EntityNode {
  id: string;
  type: 'Customer' | 'Vehicle' | 'Service' | 'Mechanic' | 'Part' | 'Shop' | 'Appointment' | 'Invoice';
  properties: Record<string, any>;
  created_at: string;
  updated_at: string;
  embedding?: number[]; // Vector embedding for semantic search
}

export interface QueryResult {
  nodes: EntityNode[];
  edges: TemporalEdge[];
  score: number;
  latency_ms: number;
  method: 'semantic' | 'keyword' | 'graph' | 'hybrid';
}

export interface MemoryResult {
  entities: EntityNode[];
  relationships: TemporalEdge[];
  context: string;
  query_latency_ms: number;
  source: 'neo4j' | 'supabase_fallback';
}

export interface HybridQueryOptions {
  semanticWeight?: number;  // 0-1, default 0.4
  keywordWeight?: number;   // 0-1, default 0.3
  graphWeight?: number;     // 0-1, default 0.3
  maxResults?: number;      // default 5
  maxLatency?: number;      // ms, default 200
}

export interface TemporalQueryOptions {
  timeContext?: Date;       // Point-in-time query
  includeHistory?: boolean; // Include invalidated relationships
  maxDepth?: number;        // Graph traversal depth (1-3)
}

export interface EntityResolutionResult {
  entities: {
    person?: EntityNode;
    vehicle?: EntityNode;
    service?: EntityNode;
    symptom?: EntityNode;
    mechanic?: EntityNode;
  };
  relationships: TemporalEdge[];
  resolution_time_ms: number;
  confidence: number; // 0-1
}



