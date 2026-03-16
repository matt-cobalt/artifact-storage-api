/**
 * Hybrid Retrieval Engine
 * Combines semantic search, keyword search, and graph traversal
 * Target: <200ms query latency (95th percentile)
 */

import { getSession } from './neo4j-driver.js';
import { createClient } from '@supabase/supabase-js';
import neo4j from 'neo4j-driver';
import type { QueryResult, HybridQueryOptions, EntityNode } from '../types/knowledge-graph.js';

// Lazy Supabase client creation (only if URLs are provided)
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return null; // Return null if not configured (tests can run without Supabase)
  }
  return createClient(url, key);
}

/**
 * Hybrid query combining semantic, keyword, and graph search
 * @param query Natural language query string
 * @param options Query options (weights, limits, latency targets)
 */
export async function hybridQuery(
  query: string,
  options: HybridQueryOptions = {}
): Promise<QueryResult[]> {
  const startTime = Date.now();
  
  const {
    semanticWeight = 0.4,
    keywordWeight = 0.3,
    graphWeight = 0.3,
    maxResults = 5,
    maxLatency = 200
  } = options;

  // Normalize weights
  const totalWeight = semanticWeight + keywordWeight + graphWeight;
  const normalizedSemantic = semanticWeight / totalWeight;
  const normalizedKeyword = keywordWeight / totalWeight;
  const normalizedGraph = graphWeight / totalWeight;

  // Run all three methods in parallel with timeout
  const queryPromises = [
    semanticSearch(query, maxResults).catch(() => ({ results: [], latency: 0 })),
    keywordSearch(query, maxResults).catch(() => ({ results: [], latency: 0 })),
    graphSearch(query, maxResults).catch(() => ({ results: [], latency: 0 }))
  ];

  const [semanticResult, keywordResult, graphResult] = await Promise.all(
    queryPromises.map(p => Promise.race([
      p,
      new Promise(resolve => setTimeout(() => resolve({ results: [], latency: maxLatency }), maxLatency))
    ]))
  );

  // Combine and score results
  const combinedResults = combineResults(
    semanticResult.results || [],
    keywordResult.results || [],
    graphResult.results || [],
    normalizedSemantic,
    normalizedKeyword,
    normalizedGraph
  );

  const latency = Date.now() - startTime;

  // Add latency to each result
  return combinedResults
    .slice(0, maxResults)
    .map(result => ({
      ...result,
      latency_ms: latency
    }));
}

/**
 * Semantic search using embeddings (placeholder - requires embedding model)
 * In production, this would use vector similarity search
 */
async function semanticSearch(
  query: string,
  maxResults: number
): Promise<{ results: QueryResult[]; latency: number }> {
  const startTime = Date.now();
  
  // TODO: Generate query embedding and search vector index
  // For now, return empty results
  // In production, this would:
  // 1. Generate embedding for query using OpenAI/cohere/etc
  // 2. Search Neo4j vector index using cosine similarity
  // 3. Return top matches with similarity scores

  return {
    results: [],
    latency: Date.now() - startTime
  };
}

/**
 * Keyword search using BM25-style text matching
 */
async function keywordSearch(
  query: string,
  maxResults: number
): Promise<{ results: QueryResult[]; latency: number }> {
  const startTime = Date.now();
  const session = await getSession();

  try {
    // Extract keywords from query
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (keywords.length === 0) {
      return { results: [], latency: Date.now() - startTime };
    }

    // Search across node properties for keyword matches
    const query_cypher = `
      CALL db.index.fulltext.queryNodes('entity_text_index', $query)
      YIELD node, score
      WHERE score > 0.5
      OPTIONAL MATCH (node)-[r]->(related)
      WHERE r.invalidated_at IS NULL
      RETURN node, collect(DISTINCT {rel: type(r), to: related}) as relationships, score
      ORDER BY score DESC
      LIMIT $limit
    `;

    const result = await session.run(query_cypher, {
      query: keywords.join(' '),
      limit: neo4j.int(Math.floor(maxResults * 2)) // Get more for deduplication, ensure integer
    });

    const results: QueryResult[] = [];
    
    for (const record of result.records) {
      const node = record.get('node');
      const score = record.get('score');
      const relationships = record.get('relationships');

      results.push({
        nodes: [{
          id: node.properties.id,
          type: node.labels[0] as EntityNode['type'],
          properties: node.properties,
          created_at: node.properties.created_at || new Date().toISOString(),
          updated_at: node.properties.updated_at || new Date().toISOString()
        }],
        edges: [],
        score: score,
        latency_ms: Date.now() - startTime,
        method: 'keyword'
      });
    }

    return { results, latency: Date.now() - startTime };
  } catch (error) {
    console.error('[Keyword Search] Error:', error);
    return { results: [], latency: Date.now() - startTime };
  } finally {
    await session.close();
  }
}

/**
 * Graph traversal search
 * Finds connected entities within 3 hops
 */
async function graphSearch(
  query: string,
  maxResults: number
): Promise<{ results: QueryResult[]; latency: number }> {
  const startTime = Date.now();
  const session = await getSession();

  try {
    // Extract potential entity identifiers from query
    // Simple heuristic: look for capitalized words (potential names)
    const entityMatches = query.match(/\b[A-Z][a-z]+\b/g) || [];
    
    if (entityMatches.length === 0) {
      return { results: [], latency: Date.now() - startTime };
    }

    // Search for entities matching the query terms
    const searchQuery = `
      MATCH (start)
      WHERE start.id CONTAINS $query OR 
            any(prop IN keys(start) WHERE toString(start[prop]) CONTAINS $query)
      WITH start
      MATCH path = (start)-[*1..3]-(related)
      WHERE all(r in relationships(path) WHERE r.invalidated_at IS NULL)
      WITH start, related, length(path) as depth, path
      ORDER BY depth ASC
      LIMIT $limit
      RETURN DISTINCT start, collect(DISTINCT related) as related_nodes, 
             collect(DISTINCT relationships(path)) as paths
    `;

    const result = await session.run(searchQuery, {
      query: entityMatches[0], // Use first match as search term
      limit: neo4j.int(Math.floor(maxResults * 2)) // Ensure integer
    });

    const results: QueryResult[] = [];
    const seenNodes = new Set<string>();

    for (const record of result.records) {
      const startNode = record.get('start');
      const relatedNodes = record.get('related_nodes');
      const paths = record.get('paths');

      if (seenNodes.has(startNode.properties.id)) continue;
      seenNodes.add(startNode.properties.id);

      const allNodes = [startNode, ...relatedNodes].map((node: any) => ({
        id: node.properties.id,
        type: node.labels[0] as EntityNode['type'],
        properties: node.properties,
        created_at: node.properties.created_at || new Date().toISOString(),
        updated_at: node.properties.updated_at || new Date().toISOString()
      }));

      // Calculate score based on path depth (closer = higher score)
      const avgDepth = paths.length > 0 
        ? paths.flat().reduce((sum: number, p: any[]) => sum + p.length, 0) / paths.flat().length
        : 1;
      const score = 1.0 / (1.0 + avgDepth * 0.1); // Inverse depth scoring

      results.push({
        nodes: allNodes,
        edges: [],
        score: score,
        latency_ms: Date.now() - startTime,
        method: 'graph'
      });
    }

    return { results, latency: Date.now() - startTime };
  } catch (error) {
    console.error('[Graph Search] Error:', error);
    return { results: [], latency: Date.now() - startTime };
  } finally {
    await session.close();
  }
}

/**
 * Combine results from multiple search methods with weighted scoring
 */
function combineResults(
  semanticResults: QueryResult[],
  keywordResults: QueryResult[],
  graphResults: QueryResult[],
  semanticWeight: number,
  keywordWeight: number,
  graphWeight: number
): QueryResult[] {
  const nodeMap = new Map<string, QueryResult>();

  // Add semantic results
  semanticResults.forEach(result => {
    result.nodes.forEach(node => {
      const existing = nodeMap.get(node.id);
      if (existing) {
        existing.score += result.score * semanticWeight;
        // Merge nodes (avoid duplicates)
        const existingNodeIds = new Set(existing.nodes.map(n => n.id));
        result.nodes.forEach(n => {
          if (!existingNodeIds.has(n.id)) {
            existing.nodes.push(n);
          }
        });
      } else {
        nodeMap.set(node.id, {
          ...result,
          score: result.score * semanticWeight,
          method: 'hybrid'
        });
      }
    });
  });

  // Add keyword results
  keywordResults.forEach(result => {
    result.nodes.forEach(node => {
      const existing = nodeMap.get(node.id);
      if (existing) {
        existing.score += result.score * keywordWeight;
      } else {
        nodeMap.set(node.id, {
          ...result,
          score: result.score * keywordWeight,
          method: 'hybrid'
        });
      }
    });
  });

  // Add graph results
  graphResults.forEach(result => {
    result.nodes.forEach(node => {
      const existing = nodeMap.get(node.id);
      if (existing) {
        existing.score += result.score * graphWeight;
      } else {
        nodeMap.set(node.id, {
          ...result,
          score: result.score * graphWeight,
          method: 'hybrid'
        });
      }
    });
  });

  // Sort by combined score and return
  return Array.from(nodeMap.values())
    .sort((a, b) => b.score - a.score);
}



