import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client using service role key (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Create a new artifact
 * @param {Object} params
 * @param {string} params.type - Artifact type (e.g., 'performance_detection', 'root_cause_analysis')
 * @param {Object} params.data - The artifact data (JSON-serializable)
 * @param {Object} params.provenance - Creation context (agent/user/source/etc.)
 * @param {Array} params.relatedArtifacts - Array of { artifactId, type, metadata }
 * @param {Object} params.metadata - Additional metadata for the artifact
 * @returns {Promise<Object>} Created artifact row from Supabase
 */
export async function createArtifact({
  type,
  data,
  provenance = {},
  relatedArtifacts = [],
  metadata = {}
}) {
  const startTime = Date.now();

  try {
    // Generate artifact_id: type:timestamp:short_hash
    const timestamp = Date.now();
    const contentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 12);

    const artifactId = `${type}:${timestamp}:${contentHash}`;

    const artifact = {
      artifact_id: artifactId,
      type,
      data,
      created_by: provenance.agent || provenance.user || 'system',
      source: provenance.source || 'direct',
      metadata: {
        ...metadata,
        provenance
      },
      created_at_idx: new Date().toISOString(),
      type_idx: type
    };

    const { data: created, error: insertError } = await supabase
      .from('artifacts')
      .insert(artifact)
      .select()
      .single();

    if (insertError) throw insertError;

    // Create relationships if provided
    if (relatedArtifacts && relatedArtifacts.length > 0) {
      const relationships = relatedArtifacts.map(rel => ({
        source_artifact_id: artifactId,
        target_artifact_id: rel.artifactId,
        relationship_type: rel.type || 'related_to',
        metadata: rel.metadata || {}
      }));

      const { error: relError } = await supabase
        .from('artifact_relationships')
        .insert(relationships);

      if (relError) {
        // Don't fail the whole operation on relationship error; just log
        console.error('Relationship creation failed:', relError);
      }
    }

    // Log operation
    await logOperation({
      operation_type: 'create',
      artifact_id: artifactId,
      performed_by: artifact.created_by,
      duration_ms: Date.now() - startTime,
      status: 'success'
    });

    return created;
  } catch (error) {
    await logOperation({
      operation_type: 'create',
      performed_by: provenance.agent || provenance.user || 'system',
      duration_ms: Date.now() - startTime,
      status: 'error',
      error_message: error.message
    });
    throw error;
  }
}

/**
 * Get an artifact by artifact_id
 * @param {string} artifactId
 * @param {Object} options
 * @param {boolean} options.includeRelationships
 * @param {number} options.relationshipDepth
 * @returns {Promise<Object>} artifact row with optional relationships field
 */
export async function getArtifact(
  artifactId,
  { includeRelationships = false, relationshipDepth = 1 } = {}
) {
  const startTime = Date.now();

  try {
    const { data: artifact, error } = await supabase
      .from('artifacts')
      .select('*')
      .eq('artifact_id', artifactId)
      .single();

    if (error) throw error;
    if (!artifact) throw new Error(`Artifact not found: ${artifactId}`);

    if (includeRelationships) {
      artifact.relationships = await getRelationships(artifactId, relationshipDepth);
    }

    await logOperation({
      operation_type: 'read',
      artifact_id: artifactId,
      duration_ms: Date.now() - startTime,
      status: 'success'
    });

    return artifact;
  } catch (error) {
    await logOperation({
      operation_type: 'read',
      artifact_id: artifactId,
      duration_ms: Date.now() - startTime,
      status: 'error',
      error_message: error.message
    });
    throw error;
  }
}

/**
 * Query artifacts with filters
 * @param {Object} filters
 * @returns {Promise<Array>} array of artifact rows
 */
export async function queryArtifacts(filters = {}) {
  const startTime = Date.now();
  const {
    type,
    createdBy,
    startDate,
    endDate,
    dataQuery,
    status = 'active',
    limit = 100,
    orderBy = 'created_at',
    orderDirection = 'desc'
  } = filters;

  try {
    let query = supabase
      .from('artifacts')
      .select('*')
      .eq('status', status)
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .limit(limit);

    if (type) query = query.eq('type', type);
    if (createdBy) query = query.eq('created_by', createdBy);
    if (startDate) query = query.gte('created_at', startDate.toISOString());
    if (endDate) query = query.lte('created_at', endDate.toISOString());

    if (dataQuery) {
      Object.entries(dataQuery).forEach(([key, value]) => {
        query = query.contains('data', { [key]: value });
      });
    }

    const { data: artifacts, error } = await query;
    if (error) throw error;

    await logOperation({
      operation_type: 'query',
      duration_ms: Date.now() - startTime,
      status: 'success',
      result_count: artifacts.length,
      metadata: { filters }
    });

    return artifacts;
  } catch (error) {
    await logOperation({
      operation_type: 'query',
      duration_ms: Date.now() - startTime,
      status: 'error',
      error_message: error.message,
      metadata: { filters }
    });
    throw error;
  }
}

/**
 * Link two artifacts
 * @param {string} sourceId
 * @param {string} targetId
 * @param {string} relationshipType
 * @param {Object} metadata
 * @returns {Promise<Object>} created relationship row
 */
export async function linkArtifacts(sourceId, targetId, relationshipType, metadata = {}) {
  const startTime = Date.now();

  try {
    const { data: relationship, error } = await supabase
      .from('artifact_relationships')
      .insert({
        source_artifact_id: sourceId,
        target_artifact_id: targetId,
        relationship_type: relationshipType,
        metadata
      })
      .select()
      .single();

    if (error) throw error;

    await logOperation({
      operation_type: 'link',
      artifact_id: sourceId,
      duration_ms: Date.now() - startTime,
      status: 'success',
      metadata: { targetId, relationshipType }
    });

    return relationship;
  } catch (error) {
    await logOperation({
      operation_type: 'link',
      artifact_id: sourceId,
      duration_ms: Date.now() - startTime,
      status: 'error',
      error_message: error.message
    });
    throw error;
  }
}

/**
 * Get the complete artifact chain (provenance graph)
 * @param {string} artifactId
 * @param {number} depth
 * @returns {Promise<{root: Object, artifacts: Array, relationships: Array}>}
 */
export async function getArtifactChain(artifactId, depth = 5) {
  const startTime = Date.now();
  const visited = new Set();
  const chain = {
    root: null,
    artifacts: new Map(),
    relationships: []
  };

  try {
    async function traverse(currentId, currentDepth) {
      if (currentDepth > depth || visited.has(currentId)) return;
      visited.add(currentId);

      const artifact = await getArtifact(currentId);
      chain.artifacts.set(currentId, artifact);
      if (!chain.root) chain.root = artifact;

      const { data: rels, error } = await supabase
        .from('artifact_relationships')
        .select('*')
        .or(`source_artifact_id.eq.${currentId},target_artifact_id.eq.${currentId}`);

      if (error) throw error;

      if (rels && rels.length > 0) {
        chain.relationships.push(...rels);

        for (const rel of rels) {
          const nextId =
            rel.source_artifact_id === currentId
              ? rel.target_artifact_id
              : rel.source_artifact_id;
          await traverse(nextId, currentDepth + 1);
        }
      }
    }

    await traverse(artifactId, 0);

    // De-duplicate relationships (a given edge can be discovered multiple times
    // as we traverse the graph)
    const uniqueRelationships = Array.from(
      new Map(chain.relationships.map(rel => [rel.id, rel])).values()
    );

    await logOperation({
      operation_type: 'get_chain',
      artifact_id: artifactId,
      duration_ms: Date.now() - startTime,
      status: 'success',
      result_count: chain.artifacts.size
    });

    return {
      root: chain.root,
      artifacts: Array.from(chain.artifacts.values()),
      relationships: uniqueRelationships
    };
  } catch (error) {
    await logOperation({
      operation_type: 'get_chain',
      artifact_id: artifactId,
      duration_ms: Date.now() - startTime,
      status: 'error',
      error_message: error.message
    });
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getRelationships(artifactId, depth) {
  const { data: relationships, error } = await supabase
    .from('artifact_relationships')
    .select('*')
    .or(`source_artifact_id.eq.${artifactId},target_artifact_id.eq.${artifactId}`)
    .limit(depth * 10);

  if (error) {
    console.error('Failed to fetch relationships:', error);
    return [];
  }

  return relationships || [];
}

async function logOperation(operation) {
  try {
    await supabase.from('artifact_operations').insert(operation);
  } catch (error) {
    // Log but don't crash core operations on logging failure
    console.error('Failed to log artifact operation:', error);
  }
}

// Default export for convenience
export default {
  createArtifact,
  getArtifact,
  queryArtifacts,
  linkArtifacts,
  getArtifactChain
};


