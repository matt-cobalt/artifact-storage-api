# Temporal Knowledge Graph Integration

Graphiti-style bi-temporal knowledge graph integration for Auto Intel GTP using Neo4j.

## Overview

This integration provides:
- **Bi-temporal tracking**: Event time (valid_from/valid_to) + Ingestion time (ingested_at/invalidated_at)
- **Hybrid retrieval**: Combines semantic, keyword, and graph search (<200ms target)
- **Real-time entity resolution**: Processes OTTO conversations and creates graph relationships
- **Agent integration**: Unified interface for all 25 agents with Supabase fallback

## Prerequisites

1. **Neo4j Desktop** running with database:
   - Database: `AutoIntelKG`
   - Bolt URL: `bolt://localhost:7687`
   - Username: `neo4j`
   - Password: `1IntelGTP!`

2. **Dependencies**:
   ```bash
   npm install neo4j-driver
   ```

   For TypeScript support (optional):
   ```bash
   npm install --save-dev typescript @types/neo4j-driver ts-node
   ```

## File Structure

```
src/
├── types/
│   └── knowledge-graph.ts          # TypeScript type definitions
├── lib/
│   ├── neo4j-driver.ts             # Neo4j connection & bi-temporal operations
│   ├── temporal-query.ts           # Hybrid retrieval engine
│   ├── entity-resolver.ts          # Real-time entity extraction from conversations
│   └── temporal-knowledge-graph-tests.ts  # Validation tests
└── agents/
    └── temporal-memory.ts          # Agent integration hook (used by all 25 agents)
```

## Quick Start

### 1. Verify Neo4j Connection

```typescript
import { testConnection } from './lib/neo4j-driver.js';

const isConnected = await testConnection();
console.log('Neo4j connected:', isConnected);
```

### 2. Create Entity

```typescript
import { upsertEntity } from './lib/neo4j-driver.js';

await upsertEntity({
  id: 'cust_sarah',
  type: 'Customer',
  properties: { name: 'Sarah Martinez' },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});
```

### 3. Create Bi-Temporal Relationship

```typescript
import { createTemporalEdge } from './lib/neo4j-driver.js';

await createTemporalEdge({
  relationship: 'PREFERS_MECHANIC',
  from_node: 'cust_sarah',
  to_node: 'mech_tom',
  valid_from: '2024-06-15T00:00:00Z',
  valid_to: '2025-03-20T00:00:00Z',  // Historical relationship
  ingested_at: '2024-06-16T00:00:00Z',
  invalidated_at: '2025-03-21T00:00:00Z'
});
```

### 4. Query from Agent

```typescript
import { queryTemporalMemory } from './agents/temporal-memory.js';

// Natural language query
const memory = await queryTemporalMemory(
  'OTTO',
  'Show customer Sarah service history',
  { includeHistory: true }
);

console.log(memory.entities);
console.log(memory.relationships);
```

### 5. Resolve Entities from Conversation

```typescript
import { resolveEntities } from './lib/entity-resolver.js';

const conversation = "Sarah called about grinding brakes on her 2020 Honda";
const result = await resolveEntities(conversation);

console.log(result.entities);        // Extracted entities
console.log(result.relationships);   // Created relationships
console.log(result.resolution_time_ms); // Should be <1000ms
```

## Running Tests

### Using TypeScript (Recommended)

```bash
# Install TypeScript
npm install --save-dev typescript ts-node @types/node

# Run tests
npx ts-node src/lib/temporal-knowledge-graph-tests.ts
```

### Using JavaScript (Compile First)

```bash
# Compile TypeScript
npx tsc

# Run compiled tests
node dist/lib/temporal-knowledge-graph-tests.js
```

## Validation Tests

The test suite includes 4 validation tests:

1. **Bi-Temporal Query**: Verifies point-in-time queries return historical relationships
2. **Real-Time Entity Resolution**: Verifies entity extraction from conversations (<1s)
3. **Hybrid Retrieval Speed**: Verifies query latency <200ms
4. **Fallback Behavior**: Verifies Supabase fallback when Neo4j unavailable

All tests must pass for production readiness.

## Agent Integration

All 25 agents can use the temporal memory hook:

```typescript
import { queryTemporalMemory } from './agents/temporal-memory.js';

// In any agent file
const memory = await queryTemporalMemory(
  agentId,           // e.g., 'OTTO', 'DEX', 'MILES'
  query,             // Natural language or entity ID
  {
    timeContext: new Date('2024-08-15'),  // Point-in-time query
    includeHistory: true,                  // Include invalidated relationships
    maxDepth: 3                            // Graph traversal depth
  }
);
```

The function automatically:
- Tries Neo4j first (fast, rich context)
- Falls back to Supabase if Neo4j unavailable
- Logs fallback events for monitoring

## Bi-Temporal Model

Relationships track two time dimensions:

1. **Valid Time** (valid_from/valid_to): When the fact was true in the real world
   - Example: Sarah preferred mechanic Tom from June 2024 to March 2025

2. **Transaction Time** (ingested_at/invalidated_at): When the system learned/unlearned it
   - Example: System learned this relationship on June 16, 2024

This enables:
- Historical queries: "Who was Sarah's mechanic in August 2024?"
- Audit trails: "When did we learn about this relationship?"
- Time travel: Query the graph state at any point in time

## Performance Targets

- **Query latency**: <200ms (95th percentile)
- **Entity resolution**: <1s per conversation
- **Memory accuracy**: >90% (vs 85% with flat tables)
- **Temporal queries**: Point-in-time queries (new capability)

## Neo4j Index Setup

For optimal performance, create these indexes in Neo4j Browser:

```cypher
// Full-text index for keyword search
CREATE FULLTEXT INDEX entity_text_index FOR (n) ON EACH [n.name, n.description, n.properties]

// Index on entity IDs
CREATE INDEX entity_id_index FOR (n) ON (n.id)

// Index on relationship properties for temporal queries
CREATE INDEX rel_valid_from_index FOR ()-[r]-() ON (r.valid_from)
CREATE INDEX rel_ingested_at_index FOR ()-[r]-() ON (r.ingested_at)
```

## Environment Variables

Add to `.env`:

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=1IntelGTP!
NEO4J_DATABASE=AutoIntelKG
```

## Troubleshooting

### Neo4j Connection Failed
- Verify Neo4j Desktop is running
- Check database name matches `AutoIntelKG`
- Verify credentials in `.env`

### Tests Failing
- Ensure Neo4j indexes are created
- Check Neo4j logs for errors
- Verify test data isn't conflicting with production data

### Fallback Always Triggering
- Check `isNeo4jHealthy()` function
- Verify Neo4j driver initialization
- Check connection health monitoring

## Next Steps

1. Install dependencies: `npm install neo4j-driver`
2. Create Neo4j indexes (see above)
3. Run validation tests
4. Integrate into agent code
5. Monitor performance metrics

## Support

For issues or questions, check:
- Neo4j logs in Neo4j Desktop
- Console logs for fallback events
- Supabase `agent_fallback_events` table for monitoring



