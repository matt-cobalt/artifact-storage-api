// Neo4j Indexes for Temporal Knowledge Graph
// Run this in Neo4j Browser: http://localhost:7474
// Copy and paste into query editor, then click "Run"

// Entity ID indexes (for fast lookups)
CREATE INDEX customer_id IF NOT EXISTS FOR (c:Customer) ON (c.id);
CREATE INDEX vehicle_id IF NOT EXISTS FOR (v:Vehicle) ON (v.id);
CREATE INDEX mechanic_id IF NOT EXISTS FOR (m:Mechanic) ON (m.id);
CREATE INDEX service_id IF NOT EXISTS FOR (s:Service) ON (s.id);

// Property indexes (for search/filtering)
CREATE INDEX customer_name IF NOT EXISTS FOR (c:Customer) ON (c.name);
CREATE INDEX vehicle_make_model IF NOT EXISTS FOR (v:Vehicle) ON (v.make, v.model);
CREATE INDEX vehicle_year IF NOT EXISTS FOR (v:Vehicle) ON (v.year);

// Relationship indexes (for temporal queries)
// Note: Neo4j doesn't support indexes directly on relationships,
// but indexes on node properties help relationship traversal

// Show all indexes
SHOW INDEXES;



