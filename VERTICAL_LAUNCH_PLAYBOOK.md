# Vertical Launch Playbook
**Step-by-Step Operational Guide for Deploying New Verticals**

**Version:** 1.0  
**Date:** 2025-12-20  
**Status:** Production-Ready - Console #1  
**Example Vertical:** HVAC (Cobalt HVAC, LLC)

---

## 🎯 OVERVIEW

This playbook provides step-by-step operational guidance for launching a new vertical on the Cobalt AI Platform, from pre-launch preparation through first-month operations.

**Target Timeline:** 7 days from kickoff to go-live  
**Success Criteria:** Vertical operational with <1% error rate, all health checks passing

---

## 📋 PRE-LAUNCH CHECKLIST (Day -7 to -1)

### Phase 1: Legal & Entity Setup (Day -7)

#### ✅ Task 1.1: Legal Entity Creation

**Responsible:** Legal team + Finance  
**Timeline:** 3-5 business days

**Checklist:**
- [ ] LLC formation documents prepared
- [ ] Entity name registered: "Cobalt HVAC, LLC"
- [ ] Registered agent appointed
- [ ] Operating agreement signed
- [ ] EIN obtained from IRS
- [ ] Business bank account opened
- [ ] Entity registered in platform registry

**Validation Criteria:**
- Entity documents filed with state
- EIN received
- Bank account active
- Entity ID assigned in platform

**Documentation:**
- Store entity documents in secure repository
- Record entity ID: `ent_hvac_20251220_001`

**API Call (if automated):**
```bash
# Create vertical entity record
POST /platform/api/v1/verticals
Authorization: Platform-API-Key <admin_key>
Content-Type: application/json

{
  "vertical_name": "hvac",
  "entity_name": "Cobalt HVAC, LLC",
  "entity_type": "llc",
  "entity_id": "ent_hvac_20251220_001",
  "legal_status": "active",
  "compliance_requirements": ["PCI-DSS"]
}

# Expected Response: 201 Created
{
  "vertical_id": "vrt_hvac_20251220_001",
  "status": "pending_provisioning"
}
```

---

#### ✅ Task 1.2: Compliance Review

**Responsible:** Compliance team  
**Timeline:** 2-3 business days

**Checklist:**
- [ ] Compliance requirements identified (PCI-DSS for HVAC)
- [ ] Compliance checklist completed
- [ ] Data handling procedures documented
- [ ] Privacy policy drafted
- [ ] Terms of service drafted
- [ ] Compliance officer assigned

**Validation Criteria:**
- All compliance checklists completed
- Documentation reviewed and approved
- Compliance officer assigned

---

### Phase 2: Infrastructure Provisioning (Day -5)

#### ✅ Task 2.1: Database Schema Deployment

**Responsible:** Platform Engineering  
**Timeline:** 2 hours

**Checklist:**
- [ ] Database schema created: `vertical_hvac`
- [ ] Tables deployed from template
- [ ] Indexes created
- [ ] Row-Level Security (RLS) policies configured
- [ ] Connection pooling configured
- [ ] Backup strategy enabled

**Validation Criteria:**
- Schema exists and is accessible
- RLS policies active and tested
- All tables created successfully
- Indexes created and validated

**SQL Commands:**
```sql
-- Create schema
CREATE SCHEMA vertical_hvac;

-- Deploy tables from template
\i templates/hvac/database_schema.sql

-- Configure RLS
ALTER TABLE vertical_hvac.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY vertical_hvac_isolation ON vertical_hvac.customers
  FOR ALL
  USING (vertical_id = current_setting('app.vertical_id', true)::UUID);

-- Create indexes
CREATE INDEX idx_customers_vertical ON vertical_hvac.customers(vertical_id);
CREATE INDEX idx_customers_email ON vertical_hvac.customers(email);

-- Verify schema
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'vertical_hvac';
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'vertical_hvac';
```

**API Call:**
```bash
# Verify database schema
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/database/schema
Authorization: Platform-API-Key <admin_key>

# Expected Response: 200 OK
{
  "schema_name": "vertical_hvac",
  "tables": [
    {"name": "customers", "row_count": 0},
    {"name": "equipment", "row_count": 0},
    {"name": "service_calls", "row_count": 0}
  ],
  "rls_enabled": true,
  "indexes_count": 8
}
```

---

#### ✅ Task 2.2: Neo4j Knowledge Graph Instance Provisioned

**Responsible:** Platform Engineering  
**Timeline:** 1 hour

**Checklist:**
- [ ] Neo4j database created: `hvac_intel_kg`
- [ ] Indexes created (Customer, Equipment, Service, Technician)
- [ ] Connection tested
- [ ] Backup enabled
- [ ] Monitoring configured

**Validation Criteria:**
- Database accessible via Bolt protocol
- Indexes created and online
- Connection test successful
- Monitoring active

**Cypher Commands:**
```cypher
// Create database (if not exists)
CREATE DATABASE hvac_intel_kg IF NOT EXISTS;

// Create indexes
CREATE INDEX customer_id IF NOT EXISTS FOR (c:Customer) ON (c.id);
CREATE INDEX customer_name IF NOT EXISTS FOR (c:Customer) ON (c.name);
CREATE INDEX equipment_id IF NOT EXISTS FOR (e:Equipment) ON (e.id);
CREATE INDEX equipment_type IF NOT EXISTS FOR (e:Equipment) ON (e.type);
CREATE INDEX service_id IF NOT EXISTS FOR (s:Service) ON (s.id);
CREATE INDEX technician_id IF NOT EXISTS FOR (t:Technician) ON (t.id);

// Verify indexes
SHOW INDEXES;

// Test connection
MATCH (n) RETURN count(n) as node_count;
```

**API Call:**
```bash
# Verify knowledge graph
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/knowledge-graph
Authorization: Platform-API-Key <admin_key>

# Expected Response: 200 OK
{
  "database_name": "hvac_intel_kg",
  "status": "online",
  "indexes": [
    {"label": "Customer", "properties": ["id", "name"]},
    {"label": "Equipment", "properties": ["id", "type"]},
    {"label": "Service", "properties": ["id"]},
    {"label": "Technician", "properties": ["id"]}
  ],
  "connection_status": "healthy"
}
```

---

#### ✅ Task 2.3: API Keys Generated + RBAC Configured

**Responsible:** Platform Engineering  
**Timeline:** 30 minutes

**Checklist:**
- [ ] Platform API key generated
- [ ] API key permissions configured
- [ ] Rate limits set
- [ ] RBAC roles assigned
- [ ] Access tested

**Validation Criteria:**
- API key generated and stored securely
- Permissions configured correctly
- Rate limits active
- Test API call successful

**API Call:**
```bash
# Generate API key
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/api-keys
Authorization: Platform-API-Key <admin_key>
Content-Type: application/json

{
  "name": "hvac_primary_key",
  "permissions": ["read", "write", "deploy"],
  "rate_limit": {
    "requests_per_minute": 1000,
    "requests_per_day": 100000
  }
}

# Expected Response: 201 Created
{
  "api_key_id": "key_hvac_20251220_001",
  "api_key": "pk_live_hvac_abc123...",  // Returned only once
  "api_key_prefix": "pk_live_hvac",
  "permissions": ["read", "write", "deploy"],
  "created_at": "2025-12-20T10:00:00Z",
  "warning": "Store this key securely - it will not be shown again"
}

# Test API key
GET /platform/api/v1/verticals/vrt_hvac_20251220_001
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "vertical_id": "vrt_hvac_20251220_001",
  "vertical_name": "hvac",
  "status": "provisioning"
}
```

**Security Notes:**
- Store API key in secure key management system (AWS Secrets Manager, HashiCorp Vault)
- Never commit API keys to version control
- Rotate keys quarterly
- Monitor API key usage

---

#### ✅ Task 2.4: Cost Allocation Baseline Set

**Responsible:** Finance + Platform Engineering  
**Timeline:** 30 minutes

**Checklist:**
- [ ] Cost allocation method selected (usage-based recommended)
- [ ] Baseline metrics recorded (0 usage)
- [ ] Billing configuration set
- [ ] Resource quotas configured
- [ ] Alert thresholds set

**Validation Criteria:**
- Cost allocation method configured
- Baseline metrics recorded
- Billing configuration active
- Resource quotas set

**API Call:**
```bash
# Configure cost allocation
PATCH /platform/api/v1/verticals/vrt_hvac_20251220_001/billing
Authorization: Platform-API-Key <admin_key>
Content-Type: application/json

{
  "allocation_method": "usage_based",
  "resource_quotas": {
    "database_gb": 100,
    "compute_hours": 1000,
    "api_calls_per_day": 100000,
    "knowledge_graph_nodes": 1000000
  },
  "alert_thresholds": {
    "quota_usage_percentage": 80,
    "cost_threshold_monthly": 500
  }
}

# Expected Response: 200 OK
{
  "vertical_id": "vrt_hvac_20251220_001",
  "billing_config": {
    "allocation_method": "usage_based",
    "resource_quotas": {...},
    "alert_thresholds": {...}
  },
  "updated_at": "2025-12-20T10:30:00Z"
}

# Record baseline metrics
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/metrics/baseline
Authorization: Platform-API-Key <admin_key>

{
  "recorded_at": "2025-12-20T10:30:00Z",
  "metrics": {
    "database_gb": 0,
    "compute_hours": 0,
    "api_calls": 0,
    "knowledge_graph_nodes": 0
  }
}

# Expected Response: 201 Created
{
  "baseline_id": "base_hvac_20251220_001",
  "recorded_at": "2025-12-20T10:30:00Z"
}
```

---

#### ✅ Task 2.5: Monitoring Dashboards Created

**Responsible:** Platform Engineering  
**Timeline:** 1 hour

**Checklist:**
- [ ] Vertical-specific dashboard created
- [ ] Health check endpoints configured
- [ ] Alert rules configured
- [ ] Log aggregation set up
- [ ] Metrics collection enabled

**Validation Criteria:**
- Dashboard accessible and displaying data
- Health checks returning 200 OK
- Alert rules active
- Logs aggregating correctly

**API Call:**
```bash
# Create monitoring dashboard
POST /platform/api/v1/monitoring/dashboards
Authorization: Platform-API-Key <admin_key>
Content-Type: application/json

{
  "name": "HVAC Vertical Dashboard",
  "vertical_id": "vrt_hvac_20251220_001",
  "widgets": [
    {
      "type": "metric",
      "metric": "api_error_rate",
      "title": "API Error Rate"
    },
    {
      "type": "metric",
      "metric": "agent_success_rate",
      "title": "Agent Success Rate"
    },
    {
      "type": "graph",
      "metrics": ["database_usage_gb", "compute_hours"],
      "title": "Resource Usage"
    }
  ]
}

# Expected Response: 201 Created
{
  "dashboard_id": "dash_hvac_20251220_001",
  "url": "https://monitoring.cobalt.ai/dashboards/dash_hvac_20251220_001",
  "created_at": "2025-12-20T11:00:00Z"
}

# Configure health checks
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/health-checks
Authorization: Platform-API-Key <admin_key>
Content-Type: application/json

{
  "checks": [
    {
      "name": "database_health",
      "endpoint": "/verticals/vrt_hvac_20251220_001/health/database",
      "interval_seconds": 60,
      "timeout_seconds": 5,
      "expected_status": 200
    },
    {
      "name": "knowledge_graph_health",
      "endpoint": "/verticals/vrt_hvac_20251220_001/health/knowledge-graph",
      "interval_seconds": 60,
      "timeout_seconds": 5,
      "expected_status": 200
    },
    {
      "name": "agent_health",
      "endpoint": "/verticals/vrt_hvac_20251220_001/health/agents",
      "interval_seconds": 300,
      "timeout_seconds": 10,
      "expected_status": 200
    }
  ]
}

# Expected Response: 201 Created
{
  "health_checks": [
    {"name": "database_health", "status": "active"},
    {"name": "knowledge_graph_health", "status": "active"},
    {"name": "agent_health", "status": "active"}
  ]
}
```

---

#### ✅ Task 2.6: Pattern Library Access Granted

**Responsible:** Platform Engineering  
**Timeline:** 15 minutes

**Checklist:**
- [ ] Pattern library access enabled
- [ ] Search permissions configured
- [ ] Submit permissions configured
- [ ] Access tested

**Validation Criteria:**
- Can search patterns
- Can submit patterns
- Access logging working

**API Call:**
```bash
# Test pattern library access
GET /platform/api/v1/intelligence/patterns?vertical_id=vrt_hvac_20251220_001&problem_type=no_show_reduction
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "patterns": [
    {
      "pattern_id": "pat_auto_no_show_001",
      "source_vertical": "auto",
      "title": "48hr Multi-Channel Confirmations Reduce No-Shows",
      "applicable_verticals": ["medical", "hvac", "retail"],
      // ...
    }
  ],
  "total": 3
}
```

---

## 🚀 LAUNCH DAY (Day 0)

### Phase 3: Deployment Workflow (Day 0, 9:00 AM - 5:00 PM)

#### ✅ Task 3.1: Initialize Deployment

**Responsible:** Platform Engineering  
**Timeline:** 15 minutes

**Checklist:**
- [ ] Deployment template selected: `hvac_template`
- [ ] Configuration reviewed and approved
- [ ] Deployment initiated

**API Call:**
```bash
# Initialize deployment
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/deploy
Authorization: Platform-API-Key pk_live_hvac_abc123...
Content-Type: application/json

{
  "template_id": "hvac_template",
  "customer_config": {
    "customer_name": "HVAC Solutions Inc.",
    "locations": 25,
    "technicians": 50,
    "service_areas": ["NYC", "NJ", "CT"]
  },
  "agents": [
    {
      "template_id": "otto_template",
      "agent_id": "H-OTTO",
      "customizations": {
        "domain_context": "customer → equipment → service",
        "entity_types": ["Customer", "Equipment", "Service"],
        "workflows": ["service_call", "technician_dispatch"]
      }
    },
    {
      "agent_id": "H-DISPATCH",
      "type": "custom",
      "config": {
        "capabilities": ["technician_assignment", "route_optimization", "eta_tracking"]
      }
    },
    {
      "agent_id": "H-MAINTENANCE",
      "type": "custom",
      "config": {
        "capabilities": ["preventive_scheduling", "equipment_lifecycle", "part_ordering"]
      }
    }
  ],
  "formulas": [
    {
      "template_id": "no_show_prediction",
      "customizations": {
        "features": ["equipment_age", "customer_history", "seasonal_factors"]
      }
    },
    {
      "formula_id": "seasonal_demand_forecasting",
      "type": "custom",
      "algorithm": "time_series_with_weather_correlation"
    }
  ],
  "workflows": [
    {
      "template_id": "appointment_reminders",
      "customizations": {
        "channels": ["SMS", "Email", "Phone"],
        "timing": "48hr_before"
      }
    },
    {
      "workflow_id": "technician_dispatch",
      "type": "custom",
      "steps": ["assign_technician", "calculate_travel_time", "send_dispatch", "track_arrival"]
    }
  ]
}

# Expected Response: 202 Accepted
{
  "deployment_id": "dep_hvac_20251220_001",
  "status": "in_progress",
  "estimated_completion": "2025-12-20T17:00:00Z",
  "steps": [
    {"step": "database_schema", "status": "pending"},
    {"step": "knowledge_graph", "status": "pending"},
    {"step": "agents", "status": "pending"},
    {"step": "formulas", "status": "pending"},
    {"step": "workflows", "status": "pending"},
    {"step": "integrations", "status": "pending"},
    {"step": "validation", "status": "pending"},
    {"step": "go_live", "status": "pending"}
  ]
}
```

**Validation Criteria:**
- Deployment ID returned
- Status is "in_progress"
- All 8 steps initialized

---

#### ✅ Task 3.2: Monitor Deployment Progress

**Responsible:** Platform Engineering  
**Timeline:** Continuous monitoring (8 hours)

**Checklist:**
- [ ] Monitor deployment status every 15 minutes
- [ ] Verify each step completes successfully
- [ ] Check for errors or warnings
- [ ] Document any issues

**API Call (Poll Every 15 Minutes):**
```bash
# Check deployment status
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/deployments/dep_hvac_20251220_001
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Progress Response (Example at 50% complete):
{
  "deployment_id": "dep_hvac_20251220_001",
  "status": "in_progress",
  "progress_percentage": 50,
  "current_step": "agents",
  "steps": [
    {"step": "database_schema", "status": "complete", "completed_at": "2025-12-20T09:30:00Z"},
    {"step": "knowledge_graph", "status": "complete", "completed_at": "2025-12-20T10:15:00Z"},
    {"step": "agents", "status": "in_progress", "started_at": "2025-12-20T10:30:00Z"},
    {"step": "formulas", "status": "pending"},
    {"step": "workflows", "status": "pending"},
    {"step": "integrations", "status": "pending"},
    {"step": "validation", "status": "pending"},
    {"step": "go_live", "status": "pending"}
  ],
  "logs": [
    {"timestamp": "2025-12-20T09:15:00Z", "level": "info", "message": "Deployment started"},
    {"timestamp": "2025-12-20T09:30:00Z", "level": "info", "message": "Database schema created successfully"},
    {"timestamp": "2025-12-20T10:15:00Z", "level": "info", "message": "Knowledge graph setup complete"}
  ],
  "errors": []
}
```

**Rollback Procedure (If Deployment Fails):**
```bash
# Rollback deployment
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/deployments/dep_hvac_20251220_001/rollback
Authorization: Platform-API-Key pk_live_hvac_abc123...

{
  "rollback_to_step": "database_schema",  // Or "initial" for full rollback
  "reason": "Agent deployment failed: timeout error"
}

# Expected Response: 202 Accepted
{
  "rollback_id": "rb_hvac_20251220_001",
  "status": "in_progress",
  "deployment_id": "dep_hvac_20251220_001",
  "rollback_to_step": "database_schema"
}
```

**Validation Criteria:**
- Each step completes within expected timeframe
- No errors in deployment logs
- Progress percentage increases correctly
- Health checks pass after each step

---

#### ✅ Task 3.3: Step-by-Step Validation

**Responsible:** Platform Engineering + QA  
**Timeline:** After each step completes

##### Step 1: Database Schema (Expected: 30 minutes)

**Validation:**
```sql
-- Verify schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'vertical_hvac';

-- Verify tables created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'vertical_hvac';
-- Expected: customers, equipment, service_calls, technicians, etc.

-- Test RLS policies
SET app.vertical_id = 'vrt_hvac_20251220_001';
SELECT COUNT(*) FROM vertical_hvac.customers;
-- Expected: 0 (empty table, but accessible)
```

**Success Criteria:**
- ✅ Schema exists
- ✅ All tables created
- ✅ RLS policies active
- ✅ Indexes created

---

##### Step 2: Knowledge Graph (Expected: 45 minutes)

**Validation:**
```cypher
// Verify database exists
SHOW DATABASES;
// Should include: hvac_intel_kg

// Verify indexes
SHOW INDEXES;
// Should include: Customer(id, name), Equipment(id, type), Service(id), Technician(id)

// Test connection
MATCH (n) RETURN count(n) as node_count;
// Expected: 0 (empty database, but accessible)
```

**Success Criteria:**
- ✅ Database exists
- ✅ All indexes created and online
- ✅ Connection successful
- ✅ Query execution works

---

##### Step 3: Agents (Expected: 2 hours)

**Validation:**
```bash
# List deployed agents
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/agents
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "agents": [
    {
      "agent_id": "H-OTTO",
      "status": "active",
      "type": "squad",
      "capabilities": ["intake", "scheduling", "customer_communication"],
      "deployed_at": "2025-12-20T11:00:00Z"
    },
    {
      "agent_id": "H-DISPATCH",
      "status": "active",
      "type": "custom",
      "capabilities": ["technician_assignment", "route_optimization"],
      "deployed_at": "2025-12-20T11:15:00Z"
    },
    {
      "agent_id": "H-MAINTENANCE",
      "status": "active",
      "type": "custom",
      "capabilities": ["preventive_scheduling", "equipment_lifecycle"],
      "deployed_at": "2025-12-20T11:30:00Z"
    }
  ],
  "total": 3
}

# Test agent health
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/agents/H-OTTO/health
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "agent_id": "H-OTTO",
  "status": "healthy",
  "uptime_seconds": 3600,
  "last_request_at": "2025-12-20T12:00:00Z",
  "metrics": {
    "requests_total": 10,
    "success_rate": 1.0,
    "avg_response_time_ms": 250
  }
}
```

**Success Criteria:**
- ✅ All agents deployed
- ✅ Agent status is "active"
- ✅ Health checks passing
- ✅ Test requests successful

---

##### Step 4: Formulas (Expected: 1 hour)

**Validation:**
```bash
# List deployed formulas
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/formulas
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "formulas": [
    {
      "formula_id": "no_show_prediction_hvac",
      "status": "active",
      "type": "template_based",
      "template_id": "no_show_prediction",
      "customizations": {
        "features": ["equipment_age", "customer_history", "seasonal_factors"]
      },
      "deployed_at": "2025-12-20T13:00:00Z"
    },
    {
      "formula_id": "seasonal_demand_forecasting",
      "status": "active",
      "type": "custom",
      "algorithm": "time_series_with_weather_correlation",
      "deployed_at": "2025-12-20T13:15:00Z"
    }
  ],
  "total": 2
}

# Test formula execution
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/formulas/no_show_prediction_hvac/execute
Authorization: Platform-API-Key pk_live_hvac_abc123...
Content-Type: application/json

{
  "input": {
    "equipment_age": 5,
    "customer_history": {"no_show_rate": 0.15},
    "seasonal_factor": 1.2
  }
}

# Expected Response: 200 OK
{
  "formula_id": "no_show_prediction_hvac",
  "result": {
    "predicted_no_show_rate": 0.18,
    "confidence": 0.85
  },
  "executed_at": "2025-12-20T13:30:00Z"
}
```

**Success Criteria:**
- ✅ All formulas deployed
- ✅ Formula status is "active"
- ✅ Test executions successful
- ✅ Results within expected range

---

##### Step 5: Workflows (Expected: 1 hour)

**Validation:**
```bash
# List deployed workflows
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/workflows
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "workflows": [
    {
      "workflow_id": "appointment_reminders",
      "status": "active",
      "type": "template_based",
      "template_id": "appointment_reminders",
      "deployed_at": "2025-12-20T14:00:00Z"
    },
    {
      "workflow_id": "technician_dispatch",
      "status": "active",
      "type": "custom",
      "steps": ["assign_technician", "calculate_travel_time", "send_dispatch", "track_arrival"],
      "deployed_at": "2025-12-20T14:15:00Z"
    }
  ],
  "total": 2
}

# Test workflow execution (dry run)
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/workflows/technician_dispatch/execute
Authorization: Platform-API-Key pk_live_hvac_abc123...
Content-Type: application/json

{
  "dry_run": true,
  "input": {
    "service_call_id": "test_001",
    "customer_location": {"lat": 40.7128, "lng": -74.0060},
    "service_type": "repair",
    "urgency": "standard"
  }
}

# Expected Response: 200 OK
{
  "workflow_id": "technician_dispatch",
  "dry_run": true,
  "execution_plan": {
    "steps": [
      {"step": "assign_technician", "status": "planned", "estimated_duration_ms": 500},
      {"step": "calculate_travel_time", "status": "planned", "estimated_duration_ms": 200},
      {"step": "send_dispatch", "status": "planned", "estimated_duration_ms": 300},
      {"step": "track_arrival", "status": "planned", "estimated_duration_ms": 1000}
    ],
    "total_estimated_duration_ms": 2000
  }
}
```

**Success Criteria:**
- ✅ All workflows deployed
- ✅ Workflow status is "active"
- ✅ Test executions successful
- ✅ Execution plan valid

---

##### Step 6: Integrations (Expected: 1 hour)

**Validation:**
```bash
# List configured integrations
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/integrations
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "integrations": [
    {
      "integration_id": "twilio_sms",
      "status": "active",
      "type": "sms",
      "provider": "Twilio",
      "tested_at": "2025-12-20T15:00:00Z"
    },
    {
      "integration_id": "sendgrid_email",
      "status": "active",
      "type": "email",
      "provider": "SendGrid",
      "tested_at": "2025-12-20T15:15:00Z"
    }
  ],
  "total": 2
}

# Test integration
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/integrations/twilio_sms/test
Authorization: Platform-API-Key pk_live_hvac_abc123...
Content-Type: application/json

{
  "test_message": "Test message from HVAC vertical",
  "test_phone": "+15551234567"
}

# Expected Response: 200 OK
{
  "integration_id": "twilio_sms",
  "test_status": "success",
  "test_message_id": "test_msg_001",
  "tested_at": "2025-12-20T15:30:00Z"
}
```

**Success Criteria:**
- ✅ All integrations configured
- ✅ Integration status is "active"
- ✅ Test messages successful
- ✅ Credentials valid

---

##### Step 7: Validation Tests (Expected: 1 hour)

**Validation:**
```bash
# Run validation test suite
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/validation/run
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 202 Accepted
{
  "validation_run_id": "val_hvac_20251220_001",
  "status": "in_progress",
  "tests": [
    {"test": "database_connectivity", "status": "pending"},
    {"test": "knowledge_graph_connectivity", "status": "pending"},
    {"test": "agent_functionality", "status": "pending"},
    {"test": "formula_execution", "status": "pending"},
    {"test": "workflow_execution", "status": "pending"},
    {"test": "integration_functionality", "status": "pending"},
    {"test": "end_to_end_workflow", "status": "pending"}
  ]
}

# Check validation results
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/validation/val_hvac_20251220_001
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "validation_run_id": "val_hvac_20251220_001",
  "status": "complete",
  "tests_passed": 7,
  "tests_failed": 0,
  "tests_total": 7,
  "results": [
    {"test": "database_connectivity", "status": "passed", "duration_ms": 100},
    {"test": "knowledge_graph_connectivity", "status": "passed", "duration_ms": 150},
    {"test": "agent_functionality", "status": "passed", "duration_ms": 5000},
    {"test": "formula_execution", "status": "passed", "duration_ms": 200},
    {"test": "workflow_execution", "status": "passed", "duration_ms": 3000},
    {"test": "integration_functionality", "status": "passed", "duration_ms": 1000},
    {"test": "end_to_end_workflow", "status": "passed", "duration_ms": 8000}
  ],
  "overall_status": "passed"
}
```

**Success Criteria:**
- ✅ All validation tests passed
- ✅ No critical errors
- ✅ End-to-end workflow successful
- ✅ Performance within acceptable range

---

##### Step 8: Go-Live Authorization (Expected: 30 minutes)

**Validation:**
```bash
# Authorize go-live
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/go-live
Authorization: Platform-API-Key <admin_key>
Content-Type: application/json

{
  "authorized_by": "user_id_123",
  "authorization_notes": "All validation tests passed, ready for production traffic"
}

# Expected Response: 200 OK
{
  "vertical_id": "vrt_hvac_20251220_001",
  "status": "active",
  "go_live_at": "2025-12-20T17:00:00Z",
  "authorized_by": "user_id_123",
  "initial_health_check": {
    "database": "healthy",
    "knowledge_graph": "healthy",
    "agents": "healthy",
    "overall": "healthy"
  }
}
```

**Success Criteria:**
- ✅ Status changed to "active"
- ✅ Go-live timestamp recorded
- ✅ All health checks passing
- ✅ Monitoring active

---

## 📊 POST-LAUNCH (Day 1-7)

### Phase 4: Monitoring & Pattern Collection (Day 1-7)

#### ✅ Task 4.1: Monitor Health Metrics

**Responsible:** Platform Engineering (24/7 monitoring)  
**Timeline:** Continuous

**Checklist:**
- [ ] Dashboard monitoring (check every hour)
- [ ] Health check alerts configured
- [ ] Error rate monitoring
- [ ] Performance metrics tracking
- [ ] Resource usage monitoring

**API Call (Hourly):**
```bash
# Get health status
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/health
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "vertical_id": "vrt_hvac_20251220_001",
  "status": "healthy",
  "health_checks": {
    "database": {"status": "healthy", "latency_ms": 15},
    "knowledge_graph": {"status": "healthy", "latency_ms": 45},
    "agents": {"status": "healthy", "avg_response_time_ms": 250},
    "workflows": {"status": "healthy", "success_rate": 0.98}
  },
  "metrics": {
    "api_error_rate": 0.01,
    "agent_success_rate": 0.95,
    "resource_usage_percentage": 35
  },
  "last_updated": "2025-12-21T10:00:00Z"
}
```

**Alert Thresholds:**
- API error rate > 5%: Alert immediately
- Agent success rate < 90%: Alert immediately
- Resource usage > 80%: Alert within 1 hour
- Health check failure: Alert immediately

**Success Criteria:**
- ✅ All health checks passing
- ✅ Error rate < 1%
- ✅ Agent success rate > 90%
- ✅ No critical alerts

---

#### ✅ Task 4.2: Collect First Patterns from HVAC Operations

**Responsible:** Platform Engineering + Data Science  
**Timeline:** Day 3-7 (after sufficient data collected)

**Checklist:**
- [ ] Monitor HVAC operations for 3-5 days
- [ ] Identify successful optimizations
- [ ] Extract anonymized patterns
- [ ] Submit patterns to library
- [ ] Verify pattern approval

**API Call (After Pattern Identified):**
```bash
# Submit pattern for sharing
POST /platform/api/v1/intelligence/patterns
Authorization: Platform-API-Key pk_live_hvac_abc123...
Content-Type: application/json

{
  "vertical_id": "vrt_hvac_20251220_001",
  "pattern_type": "workflow_efficiency",
  "title": "Automated Technician Dispatch Reduces Response Time",
  "insight": {
    "description": "Automated technician dispatch reduced average response time by 28%",
    "improvement_percentage": 28,
    "conditions": [
      "Real-time technician availability tracking",
      "Automatic route optimization",
      "Automated dispatch notifications"
    ],
    "strategy": "Automated technician dispatch with route optimization",
    "metrics": {
      "before_metric": 120,  // minutes
      "after_metric": 86.4,  // minutes
      "sample_size": 500
    }
  },
  "applicable_verticals": ["auto", "medical", "retail"]  // Which verticals can use this
}

# Expected Response: 201 Created
{
  "pattern_id": "pat_hvac_dispatch_001",
  "status": "pending_review",
  "created_at": "2025-12-23T10:00:00Z",
  "message": "Pattern submitted for review. Will be available to other verticals after approval."
}
```

**Validation Criteria:**
- ✅ Pattern submitted successfully
- ✅ Status is "pending_review"
- ✅ No PII in insight data
- ✅ Metrics validated

---

#### ✅ Task 4.3: Receive Relevant Patterns from Auto/Medical

**Responsible:** Platform Engineering  
**Timeline:** Day 1-7

**Checklist:**
- [ ] Search for applicable patterns
- [ ] Review pattern recommendations
- [ ] Evaluate pattern applicability
- [ ] Document adaptation plan

**API Call:**
```bash
# Search for applicable patterns
GET /platform/api/v1/intelligence/patterns?vertical_id=vrt_hvac_20251220_001&problem_type=no_show_reduction&context=appointment_scheduling
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "patterns": [
    {
      "pattern_id": "pat_auto_no_show_001",
      "source_vertical": "auto",
      "title": "48hr Multi-Channel Confirmations Reduce No-Shows",
      "insight": {
        "description": "48hr confirmations reduce no-shows by 32%",
        "improvement_percentage": 32,
        // ...
      },
      "applicable_verticals": ["medical", "hvac", "retail"],
      "adaptation_guide": {
        "auto_context": "service appointment confirmation",
        "medical_context": "patient appointment confirmation",
        "hvac_context": "service call confirmation",
        "mappings": {...}
      },
      "effectiveness_score": 0.92,
      "adoption_count": 1
    }
  ],
  "total": 1
}
```

**Validation Criteria:**
- ✅ Patterns found and returned
- ✅ Patterns applicable to HVAC
- ✅ Adaptation guide provided
- ✅ Effectiveness scores available

---

#### ✅ Task 4.4: Measure Pattern Adoption Success

**Responsible:** Platform Engineering + Data Science  
**Timeline:** Day 7-14 (after pattern adoption)

**Checklist:**
- [ ] Adopt applicable pattern
- [ ] Monitor implementation
- [ ] Measure improvement achieved
- [ ] Update pattern effectiveness

**API Call:**
```bash
# Adopt pattern
POST /platform/api/v1/intelligence/patterns/pat_auto_no_show_001/adopt
Authorization: Platform-API-Key pk_live_hvac_abc123...
Content-Type: application/json

{
  "vertical_id": "vrt_hvac_20251220_001",
  "adaptation_config": {
    "auto_context": "service appointment",
    "hvac_context": "service call",
    "mappings": {
      "customer": "customer",
      "appointment": "service_call",
      "service": "service"
    }
  }
}

# Expected Response: 201 Created
{
  "adoption_id": "adp_hvac_no_show_001",
  "pattern_id": "pat_auto_no_show_001",
  "status": "in_progress",
  "adopted_at": "2025-12-24T10:00:00Z"
}

# After implementation, update effectiveness
PATCH /platform/api/v1/intelligence/patterns/pat_auto_no_show_001/adoptions/adp_hvac_no_show_001
Authorization: Platform-API-Key pk_live_hvac_abc123...
Content-Type: application/json

{
  "improvement_achieved": 30,  // Actual improvement percentage
  "status": "successful",
  "feedback": "Worked well for HVAC service calls, reduced no-shows by 30%"
}

# Expected Response: 200 OK
{
  "adoption_id": "adp_hvac_no_show_001",
  "status": "successful",
  "improvement_achieved": 30,
  "updated_at": "2025-12-30T10:00:00Z",
  "pattern_effectiveness_updated": true
}
```

**Success Criteria:**
- ✅ Pattern adopted successfully
- ✅ Implementation status updated
- ✅ Improvement measured and recorded
- ✅ Pattern effectiveness score updated

---

## 📈 FIRST MONTH (Day 8-30)

### Phase 5: Operations & Optimization (Day 8-30)

#### ✅ Task 5.1: Usage-Based Cost Allocation Calculated

**Responsible:** Finance + Platform Engineering  
**Timeline:** Day 30 (end of first month)

**Checklist:**
- [ ] Collect usage metrics for month
- [ ] Calculate allocation per vertical
- [ ] Generate billing report
- [ ] Review with vertical team

**API Call:**
```bash
# Get usage metrics for month
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/usage-metrics?period_start=2025-12-01&period_end=2025-12-31
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "vertical_id": "vrt_hvac_20251220_001",
  "period": {
    "start": "2025-12-01T00:00:00Z",
    "end": "2025-12-31T23:59:59Z"
  },
  "usage": {
    "database_gb": 45.2,
    "compute_hours": 320,
    "api_calls": 45230,
    "knowledge_graph_nodes": 125000
  },
  "allocation": {
    "method": "usage_based",
    "shared_platform_allocation": 85.50,  // Based on usage percentage
    "infrastructure_cost": 130.00,  // Direct costs
    "total_allocation": 215.50
  },
  "resource_quotas": {
    "database_gb": 100,
    "compute_hours": 1000,
    "api_calls_per_day": 100000,
    "usage_percentage": 45.2  // 45.2GB / 100GB quota
  }
}
```

**Success Criteria:**
- ✅ Usage metrics collected accurately
- ✅ Allocation calculated correctly
- ✅ Billing report generated
- ✅ Within resource quotas

---

#### ✅ Task 5.2: P&L Review

**Responsible:** Finance + Vertical Management  
**Timeline:** Day 30-35

**Checklist:**
- [ ] Review revenue for month
- [ ] Review costs (platform allocation + direct costs)
- [ ] Calculate gross margin
- [ ] Identify optimization opportunities

**API Call:**
```bash
# Get P&L summary
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/pandl?period_start=2025-12-01&period_end=2025-12-31
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "vertical_id": "vrt_hvac_20251220_001",
  "period": {
    "start": "2025-12-01T00:00:00Z",
    "end": "2025-12-31T23:59:59Z"
  },
  "revenue": {
    "customer_subscriptions": 5000.00,
    "usage_based_revenue": 250.00,
    "add_on_features": 500.00,
    "total_revenue": 5750.00
  },
  "costs": {
    "platform_services": {
      "infrastructure_allocation": 215.50,
      "api_usage": 45.23,
      "knowledge_graph": 65.00,
      "total": 325.73
    },
    "direct_costs": {
      "customer_support": 500.00,
      "sales_marketing": 1000.00,
      "operations": 300.00,
      "total": 1800.00
    },
    "total_costs": 2125.73
  },
  "profit": {
    "gross_profit": 3950.00,  // Revenue - Direct Costs
    "net_profit": 3624.27,    // Revenue - Total Costs
    "margin_percentage": 63.0
  }
}
```

**Success Criteria:**
- ✅ P&L calculated accurately
- ✅ Margin > 50% (target)
- ✅ Costs within budget
- ✅ Revenue tracking correctly

---

#### ✅ Task 5.3: Pattern Effectiveness Scoring

**Responsible:** Data Science + Platform Engineering  
**Timeline:** Day 30

**Checklist:**
- [ ] Review pattern adoptions
- [ ] Calculate effectiveness scores
- [ ] Identify top-performing patterns
- [ ] Document recommendations

**API Call:**
```bash
# Get pattern effectiveness summary
GET /platform/api/v1/intelligence/patterns/effectiveness?vertical_id=vrt_hvac_20251220_001
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "vertical_id": "vrt_hvac_20251220_001",
  "pattern_adoptions": [
    {
      "pattern_id": "pat_auto_no_show_001",
      "pattern_title": "48hr Multi-Channel Confirmations Reduce No-Shows",
      "adopted_at": "2025-12-24T10:00:00Z",
      "improvement_achieved": 30,
      "status": "successful",
      "effectiveness_score": 0.92
    }
  ],
  "summary": {
    "total_adoptions": 1,
    "successful_adoptions": 1,
    "average_improvement": 30,
    "top_pattern": "pat_auto_no_show_001"
  }
}
```

**Success Criteria:**
- ✅ Effectiveness scores calculated
- ✅ Patterns ranked by effectiveness
- ✅ Recommendations documented
- ✅ Success rate > 80%

---

#### ✅ Task 5.4: Optimization Recommendations

**Responsible:** Platform Engineering + Data Science  
**Timeline:** Day 30-35

**Checklist:**
- [ ] Analyze performance metrics
- [ ] Identify bottlenecks
- [ ] Generate optimization recommendations
- [ ] Prioritize improvements

**API Call:**
```bash
# Get optimization recommendations
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/optimization/recommendations
Authorization: Platform-API-Key pk_live_hvac_abc123...

# Expected Response: 200 OK
{
  "vertical_id": "vrt_hvac_20251220_001",
  "recommendations": [
    {
      "type": "cost_optimization",
      "priority": "medium",
      "title": "Optimize Database Queries",
      "description": "Reduce database query time by 20% through query optimization",
      "estimated_savings": "$15/month",
      "effort": "low"
    },
    {
      "type": "performance_optimization",
      "priority": "high",
      "title": "Add Caching Layer",
      "description": "Add Redis caching to reduce API response time by 30%",
      "estimated_improvement": "30% faster response times",
      "effort": "medium"
    },
    {
      "type": "pattern_adoption",
      "priority": "low",
      "title": "Adopt Additional Patterns",
      "description": "3 additional patterns available that could improve efficiency",
      "estimated_improvement": "15% efficiency gain",
      "effort": "low"
    }
  ],
  "generated_at": "2025-12-31T10:00:00Z"
}
```

**Success Criteria:**
- ✅ Recommendations generated
- ✅ Prioritized by impact/effort
- ✅ Actionable and specific
- ✅ Estimated improvements provided

---

## 🎯 SUCCESS METRICS

### Launch Success Criteria

**Day 0 (Go-Live):**
- ✅ All deployment steps completed successfully
- ✅ All validation tests passed
- ✅ Health checks passing
- ✅ Status changed to "active"

**Day 1-7:**
- ✅ Error rate < 1%
- ✅ Agent success rate > 90%
- ✅ All health checks passing
- ✅ At least 1 pattern submitted to library
- ✅ At least 1 pattern adopted from other verticals

**Day 8-30 (First Month):**
- ✅ Error rate < 0.5%
- ✅ Agent success rate > 95%
- ✅ Resource usage < 80% of quotas
- ✅ Margin > 50%
- ✅ Pattern effectiveness score > 0.8

---

## 🔄 ROLLBACK PROCEDURES

### If Deployment Fails

**Step 1: Identify Failure Point**
```bash
GET /platform/api/v1/verticals/vrt_hvac_20251220_001/deployments/dep_hvac_20251220_001
# Check which step failed
```

**Step 2: Determine Rollback Strategy**
- **Partial Rollback:** Rollback to last successful step
- **Full Rollback:** Rollback to initial state (remove all resources)

**Step 3: Execute Rollback**
```bash
POST /platform/api/v1/verticals/vrt_hvac_20251220_001/deployments/dep_hvac_20251220_001/rollback
{
  "rollback_to_step": "database_schema",  // Or "initial" for full rollback
  "reason": "Agent deployment failed: timeout error"
}
```

**Step 4: Verify Rollback**
- Check resource cleanup
- Verify database state
- Confirm no orphaned resources

**Step 5: Investigate Root Cause**
- Review deployment logs
- Identify failure reason
- Document issue and resolution

**Step 6: Retry Deployment (After Fix)**
- Fix identified issue
- Re-run deployment from failure point
- Monitor closely

---

## 📝 ESCALATION PATHS

### Issue Severity Levels

**Critical (P0):**
- Production system down
- Data loss risk
- Security breach
- **Escalation:** On-call engineer immediately, notify CTO

**High (P1):**
- Significant performance degradation
- Partial system outage
- Deployment failure
- **Escalation:** Platform Engineering lead within 1 hour

**Medium (P2):**
- Minor performance issues
- Non-critical errors
- **Escalation:** Platform Engineering within 4 hours

**Low (P3):**
- Optimization opportunities
- Feature requests
- **Escalation:** Next business day

---

## 📚 APPENDIX

### A. Contact Information

**Platform Engineering:**
- On-call: platform-oncall@cobalt.ai
- Slack: #platform-engineering

**Finance:**
- finance@cobalt.ai

**Legal:**
- legal@cobalt.ai

---

### B. Quick Reference

**API Base URL:** `https://platform.cobalt.ai/api/v1`

**Key Endpoints:**
- Vertical Management: `/verticals/{vertical_id}`
- Deployments: `/verticals/{vertical_id}/deployments`
- Patterns: `/intelligence/patterns`
- Metrics: `/verticals/{vertical_id}/metrics`
- Health: `/verticals/{vertical_id}/health`

---

### C. Timeline Summary

| Phase | Duration | Key Milestones |
|-------|----------|----------------|
| Pre-Launch | Day -7 to -1 | Legal setup, infrastructure provisioning |
| Launch Day | Day 0 | 8-step deployment workflow |
| Post-Launch | Day 1-7 | Monitoring, pattern collection |
| First Month | Day 8-30 | Operations, P&L review, optimization |

**Total Timeline:** 37 days from kickoff to first month completion

---

**Playbook Version: 1.0**  
**Last Updated: 2025-12-20**  
**Status: Production-Ready**

---

*This playbook is a living document and will be updated based on operational learnings.*



