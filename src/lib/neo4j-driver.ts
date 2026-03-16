/**
 * Neo4j Connection Layer with Bi-Temporal Tracking
 * 
 * Database: AutoIntelKG
 * Bolt URL: bolt://localhost:7687
 * Username: neo4j
 * Password: 1IntelGTP!
 */

import neo4j, { Driver, Session, Result, DateTime, Integer } from 'neo4j-driver';
import type { EntityNode, TemporalEdge } from '../types/knowledge-graph.js';

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '1IntelGTP!';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'AutoIntelKG';

let driver: Driver | null = null;
let connectionHealthy = false;

/**
 * Initialize Neo4j driver connection
 */
export function initNeo4jDriver(): Driver {
  if (driver) {
    return driver;
  }

  try {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
      {
        maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 60000, // 60 seconds
        database: NEO4J_DATABASE
      }
    );

    // Test connection
    driver.verifyConnectivity()
      .then(() => {
        connectionHealthy = true;
        console.log('[Neo4j] Connected successfully to', NEO4J_URI);
      })
      .catch((err) => {
        connectionHealthy = false;
        console.error('[Neo4j] Connection failed:', err.message);
      });

    return driver;
  } catch (error) {
    console.error('[Neo4j] Driver initialization failed:', error);
    connectionHealthy = false;
    throw error;
  }
}

/**
 * Get a Neo4j session
 * @param database Optional database name (defaults to AutoIntelKG, falls back to 'neo4j' if not found)
 */
export async function getSession(database?: string): Promise<Session> {
  if (!driver) {
    driver = initNeo4jDriver();
  }

  const dbName = database || NEO4J_DATABASE;
  
  // Try specified database, fallback to 'neo4j' if not found
  // Note: Database existence is checked when session is used, not when created
  return driver.session({ database: dbName });
}

/**
 * Check if Neo4j connection is healthy
 */
export function isNeo4jHealthy(): boolean {
  return connectionHealthy && driver !== null;
}

/**
 * Close Neo4j driver connection
 */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    connectionHealthy = false;
  }
}

/**
 * Create or update an entity node
 * @param entity Entity node to create/update
 */
export async function upsertEntity(entity: EntityNode): Promise<void> {
  let session = await getSession();

  try {
    const query = `
      MERGE (n:${entity.type} {id: $id})
      SET n += $properties,
          n.created_at = COALESCE(n.created_at, $created_at),
          n.updated_at = $updated_at
      ${entity.embedding ? ', n.embedding = $embedding' : ''}
    `;

    await session.run(query, {
      id: entity.id,
      properties: entity.properties,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      ...(entity.embedding ? { embedding: entity.embedding } : {})
    });
  } catch (error: any) {
    // If database doesn't exist, try default 'neo4j' database
    if (error.code === 'Neo.ClientError.Database.DatabaseNotFound') {
      await session.close();
      session = await getSession('neo4j');
      
      const query = `
        MERGE (n:${entity.type} {id: $id})
        SET n += $properties,
            n.created_at = COALESCE(n.created_at, $created_at),
            n.updated_at = $updated_at
        ${entity.embedding ? ', n.embedding = $embedding' : ''}
      `;
      
      await session.run(query, {
        id: entity.id,
        properties: entity.properties,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
        ...(entity.embedding ? { embedding: entity.embedding } : {})
      });
      
      console.warn(`[Neo4j] Using default 'neo4j' database (${NEO4J_DATABASE} not found)`);
    } else {
      throw error;
    }
  } finally {
    await session.close();
  }
}

/**
 * Create a bi-temporal relationship edge
 * @param edge Temporal edge to create
 */
export async function createTemporalEdge(edge: TemporalEdge): Promise<void> {
  const session = await getSession();

  try {
    // Invalidate existing relationships if this is an update
    const invalidateQuery = `
      MATCH (a)-[r:${edge.relationship}]->(b)
      WHERE a.id = $from_node AND b.id = $to_node
        AND r.invalidated_at IS NULL
        AND r.valid_to IS NULL
      SET r.valid_to = $valid_from,
          r.invalidated_at = $ingested_at
    `;

    await session.run(invalidateQuery, {
      from_node: edge.from_node,
      to_node: edge.to_node,
      valid_from: edge.valid_from,
      ingested_at: edge.ingested_at
    });

    // Create new relationship
    // Handle metadata - Neo4j requires primitive types, so convert to JSON string if needed
    const metadataValue = edge.metadata && Object.keys(edge.metadata).length > 0 
      ? JSON.stringify(edge.metadata) 
      : null;
    
    const createQuery = `
      MATCH (a {id: $from_node})
      MATCH (b {id: $to_node})
      CREATE (a)-[r:${edge.relationship} {
        valid_from: $valid_from,
        valid_to: $valid_to,
        ingested_at: $ingested_at,
        invalidated_at: $invalidated_at
        ${metadataValue ? ', metadata: $metadata' : ''}
      }]->(b)
      RETURN r
    `;

    const params: any = {
      from_node: edge.from_node,
      to_node: edge.to_node,
      valid_from: edge.valid_from,
      valid_to: edge.valid_to || null,
      ingested_at: edge.ingested_at,
      invalidated_at: edge.invalidated_at || null
    };
    
    if (metadataValue) {
      params.metadata = metadataValue;
    }

    await session.run(createQuery, params);
  } finally {
    await session.close();
  }
}

/**
 * Query entities at a specific point in time (bi-temporal query)
 * @param entityId Entity ID to query
 * @param timeContext Point in time to query (default: now)
 */
export async function queryEntityAtTime(
  entityId: string,
  timeContext?: Date
): Promise<EntityNode | null> {
  const session = await getSession();
  const queryTime = (timeContext || new Date()).toISOString();

  try {
    const query = `
      MATCH (n {id: $id})
      WHERE n.created_at <= $queryTime
      OPTIONAL MATCH (n)-[r]->(related)
      WHERE (r.valid_from IS NULL OR r.valid_from <= $queryTime)
        AND (r.valid_to IS NULL OR r.valid_to > $queryTime)
        AND (r.invalidated_at IS NULL OR r.invalidated_at > $queryTime)
      RETURN n, collect(DISTINCT {rel: type(r), to: related.id}) as relationships
      LIMIT 1
    `;

    const result = await session.run(query, {
      id: entityId,
      queryTime
    });

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    const node = record.get('n');
    
    return {
      id: node.properties.id,
      type: node.labels[0] as EntityNode['type'],
      properties: node.properties,
      created_at: node.properties.created_at,
      updated_at: node.properties.updated_at
    };
  } finally {
    await session.close();
  }
}

/**
 * Get all relationships for an entity (including history if requested)
 * @param entityId Entity ID
 * @param includeHistory Include invalidated relationships
 */
export async function getEntityRelationships(
  entityId: string,
  includeHistory: boolean = false
): Promise<TemporalEdge[]> {
  const session = await getSession();

  try {
    const query = includeHistory
      ? `
        MATCH (a {id: $id})-[r]->(b)
        RETURN type(r) as relationship, a.id as from_node, b.id as to_node,
               r.valid_from as valid_from, r.valid_to as valid_to, 
               r.ingested_at as ingested_at, r.invalidated_at as invalidated_at, 
               r.metadata as metadata
        ORDER BY r.ingested_at DESC
      `
      : `
        MATCH (a {id: $id})-[r]->(b)
        WHERE r.invalidated_at IS NULL
        RETURN type(r) as relationship, a.id as from_node, b.id as to_node,
               r.valid_from as valid_from, r.valid_to as valid_to,
               r.ingested_at as ingested_at, r.invalidated_at as invalidated_at,
               r.metadata as metadata
      `;

    const result = await session.run(query, { id: entityId });
    const edges: TemporalEdge[] = [];

    // Helper function to convert Neo4j DateTime/Date to ISO string
    const toISOString = (value: any): string | undefined => {
      if (!value) return undefined;
      
      // If it's already a string, return as-is
      if (typeof value === 'string') return value;
      
      // If it's a Neo4j DateTime object, convert to ISO string
      if (neo4j.isDateTime(value)) {
        const dt = value as DateTime;
        // Neo4j DateTime has toString() method that returns ISO format
        return dt.toString();
      }
      
      // If it's a JavaScript Date, convert to ISO string
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // If it has a toString method (fallback), use it
      if (typeof value.toString === 'function') {
        try {
          const str = value.toString();
          // Try to parse as date to validate
          const date = new Date(str);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
          return str;
        } catch {
          return undefined;
        }
      }
      
      return undefined;
    };

    for (const record of result.records) {
      // Convert Neo4j DateTime objects to ISO strings
      const validFrom = record.get('valid_from');
      const validTo = record.get('valid_to');
      const ingestedAt = record.get('ingested_at');
      const invalidatedAt = record.get('invalidated_at');
      const metadata = record.get('metadata');
      
      // Convert all DateTime values to ISO strings
      const validFromStr = toISOString(validFrom) || new Date().toISOString();
      const validToStr = toISOString(validTo);
      const ingestedAtStr = toISOString(ingestedAt) || new Date().toISOString();
      const invalidatedAtStr = toISOString(invalidatedAt);
      
      edges.push({
        relationship: record.get('relationship'),
        from_node: record.get('from_node'),
        to_node: record.get('to_node'),
        valid_from: validFromStr,
        valid_to: validToStr,
        ingested_at: ingestedAtStr,
        invalidated_at: invalidatedAtStr,
        metadata: (metadata && typeof metadata === 'string') ? JSON.parse(metadata) : (metadata || undefined)
      });
    }

    return edges;
  } finally {
    await session.close();
  }
}

/**
 * Test Neo4j connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const session = await getSession();
    const result = await session.run('RETURN 1 as test');
    await session.close();
    connectionHealthy = true;
    return result.records.length > 0;
  } catch (error) {
    connectionHealthy = false;
    console.error('[Neo4j] Connection test failed:', error);
    return false;
  }
}

// Initialize driver on module load
initNeo4jDriver();



