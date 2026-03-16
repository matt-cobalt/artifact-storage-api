/**
 * Real-Time Entity Resolution
 * Processes OTTO conversations and extracts/links entities to knowledge graph
 * Target: <1s per conversation
 */

import { upsertEntity, createTemporalEdge } from './neo4j-driver.js';
import type { EntityNode, TemporalEdge, EntityResolutionResult } from '../types/knowledge-graph.js';

/**
 * Resolve entities from conversation text and create/update graph
 * @param conversationText Raw conversation text from OTTO
 * @returns Resolution result with extracted entities and relationships
 */
export async function resolveEntities(
  conversationText: string
): Promise<EntityResolutionResult> {
  const startTime = Date.now();
  
  // Extract entities from conversation
  const extracted = extractEntities(conversationText);
  
  // Match to existing nodes or create new ones
  const resolved = await matchOrCreateEntities(extracted);
  
  // Create relationships
  const relationships = await createRelationships(resolved, conversationText);
  
  const resolutionTime = Date.now() - startTime;
  
  // Calculate confidence based on match quality
  const confidence = calculateConfidence(resolved, relationships);
  
  return {
    entities: resolved,
    relationships,
    resolution_time_ms: resolutionTime,
    confidence
  };
}

/**
 * Extract entities from conversation text using pattern matching
 * In production, this would use NLP/ML entity extraction
 */
function extractEntities(text: string): {
  person?: { name: string; confidence: number };
  vehicle?: { year?: string; make?: string; model?: string; confidence: number };
  service?: { type: string; confidence: number };
  symptom?: { description: string; confidence: number };
} {
  const extracted: any = {};
  
  // Extract person name (heuristic: capitalized words that could be names)
  const namePattern = /\b([A-Z][a-z]+)\s+(?:called|said|asked|needs|has|wants)/i;
  const nameMatch = text.match(namePattern);
  if (nameMatch) {
    extracted.person = {
      name: nameMatch[1],
      confidence: 0.7
    };
  }
  
  // Extract vehicle (year make model pattern)
  const vehiclePattern = /(\d{4})\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i;
  const vehicleMatch = text.match(vehiclePattern);
  if (vehicleMatch) {
    extracted.vehicle = {
      year: vehicleMatch[1],
      make: vehicleMatch[2],
      model: vehicleMatch[3],
      confidence: 0.9
    };
  }
  
  // Extract service type (common automotive services)
  const serviceKeywords = {
    'oil change': 'oil_change',
    'brake': 'brake_service',
    'brakes': 'brake_service',
    'tire': 'tire_service',
    'tires': 'tire_service',
    'engine': 'engine_service',
    'transmission': 'transmission_service',
    'inspection': 'inspection',
    'repair': 'repair'
  };
  
  for (const [keyword, serviceType] of Object.entries(serviceKeywords)) {
    if (text.toLowerCase().includes(keyword)) {
      extracted.service = {
        type: serviceType,
        confidence: 0.8
      };
      break;
    }
  }
  
  // Extract symptoms (noise, problem descriptions)
  const symptomPatterns = [
    /(?:making|makes|has|with)\s+(?:a\s+)?(grinding|squeaking|clicking|knocking|rattling)\s+(?:noise|sound)/i,
    /(?:problem|issue|trouble)\s+(?:with|in)\s+([^,\.]+)/i
  ];
  
  for (const pattern of symptomPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.symptom = {
        description: match[1] || match[0],
        confidence: 0.6
      };
      break;
    }
  }
  
  return extracted;
}

/**
 * Match extracted entities to existing nodes or create new ones
 */
async function matchOrCreateEntities(extracted: any): Promise<{
  person?: EntityNode;
  vehicle?: EntityNode;
  service?: EntityNode;
  symptom?: EntityNode;
  mechanic?: EntityNode;
}> {
  const resolved: any = {};
  const now = new Date().toISOString();
  
  // Match/create person
  if (extracted.person) {
    const personId = `cust_${extracted.person.name.toLowerCase().replace(/\s+/g, '_')}`;
    
    // Try to match existing customer (fuzzy matching in production)
    // For now, create/update node
    const personNode: EntityNode = {
      id: personId,
      type: 'Customer',
      properties: {
        name: extracted.person.name,
        // Add other properties from conversation analysis
      },
      created_at: now,
      updated_at: now
    };
    
    await upsertEntity(personNode);
    resolved.person = personNode;
  }
  
  // Match/create vehicle
  if (extracted.vehicle) {
    const vehicleId = `veh_${extracted.vehicle.year}_${extracted.vehicle.make}_${extracted.vehicle.model}`.toLowerCase().replace(/\s+/g, '_');
    
    const vehicleNode: EntityNode = {
      id: vehicleId,
      type: 'Vehicle',
      properties: {
        year: extracted.vehicle.year,
        make: extracted.vehicle.make,
        model: extracted.vehicle.model
      },
      created_at: now,
      updated_at: now
    };
    
    await upsertEntity(vehicleNode);
    resolved.vehicle = vehicleNode;
  }
  
  // Match/create service
  if (extracted.service) {
    const serviceId = `svc_${extracted.service.type}`;
    
    const serviceNode: EntityNode = {
      id: serviceId,
      type: 'Service',
      properties: {
        type: extracted.service.type,
        category: extracted.service.type
      },
      created_at: now,
      updated_at: now
    };
    
    await upsertEntity(serviceNode);
    resolved.service = serviceNode;
  }
  
  // Match/create symptom
  if (extracted.symptom) {
    const symptomId = `symp_${extracted.symptom.description.toLowerCase().replace(/\s+/g, '_').substring(0, 50)}`;
    
    const symptomNode: EntityNode = {
      id: symptomId,
      type: 'Service', // Using Service type for symptoms too
      properties: {
        description: extracted.symptom.description,
        category: 'symptom'
      },
      created_at: now,
      updated_at: now
    };
    
    await upsertEntity(symptomNode);
    resolved.symptom = symptomNode;
  }
  
  return resolved;
}

/**
 * Create relationships between resolved entities
 */
async function createRelationships(
  entities: any,
  conversationText: string
): Promise<TemporalEdge[]> {
  const relationships: TemporalEdge[] = [];
  const now = new Date().toISOString();
  
  // Person OWNS Vehicle
  if (entities.person && entities.vehicle) {
    const edge: TemporalEdge = {
      relationship: 'OWNS',
      from_node: entities.person.id,
      to_node: entities.vehicle.id,
      valid_from: now,
      ingested_at: now
    };
    
    await createTemporalEdge(edge);
    relationships.push(edge);
  }
  
  // Vehicle NEEDS Service
  if (entities.vehicle && entities.service) {
    const edge: TemporalEdge = {
      relationship: 'NEEDS_SERVICE',
      from_node: entities.vehicle.id,
      to_node: entities.service.id,
      valid_from: now,
      ingested_at: now,
      metadata: {
        source: 'otto_conversation',
        conversation_snippet: conversationText.substring(0, 200)
      }
    };
    
    await createTemporalEdge(edge);
    relationships.push(edge);
  }
  
  // Vehicle HAS Symptom
  if (entities.vehicle && entities.symptom) {
    const edge: TemporalEdge = {
      relationship: 'HAS_SYMPTOM',
      from_node: entities.vehicle.id,
      to_node: entities.symptom.id,
      valid_from: now,
      ingested_at: now
    };
    
    await createTemporalEdge(edge);
    relationships.push(edge);
  }
  
  return relationships;
}

/**
 * Calculate confidence score for entity resolution
 */
function calculateConfidence(entities: any, relationships: TemporalEdge[]): number {
  let totalConfidence = 0;
  let count = 0;
  
  // Average confidence of extracted entities
  if (entities.person) count++;
  if (entities.vehicle) {
    totalConfidence += 0.9; // Vehicle extraction is usually high confidence
    count++;
  }
  if (entities.service) {
    totalConfidence += 0.8;
    count++;
  }
  if (entities.symptom) {
    totalConfidence += 0.6;
    count++;
  }
  
  // Bonus for creating relationships (shows successful linking)
  if (relationships.length > 0) {
    totalConfidence += 0.1 * relationships.length;
  }
  
  return count > 0 ? Math.min(1.0, totalConfidence / count) : 0;
}



