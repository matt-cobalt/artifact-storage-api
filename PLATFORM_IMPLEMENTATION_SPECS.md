# Cobalt AI Platform - Implementation Specifications
**Detailed Technical Implementation Guide**

**Version:** 1.0  
**Date:** 2025-12-20  
**Status:** Implementation Specifications - Console #1  
**Architecture Reference:** COBALT_AI_PLATFORM_ARCHITECTURE_ENHANCED.md

---

## 🎯 OVERVIEW

This document provides detailed implementation specifications for the Cobalt AI Platform, including API endpoints, database schemas, deployment automation, and pattern library structure.

---

## 1. API SPECIFICATIONS

### 1.1 Authentication & Authorization

#### Authentication Model: API Key + OAuth 2.0

```typescript
// API Key Authentication (B2B between Platform and Verticals)
interface PlatformAPIKey {
  api_key: string;           // Base64-encoded key
  vertical_id: string;       // Vertical entity identifier
  permissions: string[];     // ['read', 'write', 'deploy', 'monitor']
  created_at: Date;
  expires_at?: Date;         // Optional expiration
  last_used_at?: Date;
  rate_limit: {
    requests_per_minute: number;
    requests_per_day: number;
  };
}

// OAuth 2.0 (For customer-facing vertical APIs)
interface OAuthToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;        // Seconds
  refresh_token?: string;
  scope: string[];          // Vertical-specific scopes
}

// Authorization Header Format
// Platform-to-Platform: Authorization: Platform-API-Key <api_key>
// Customer-to-Vertical: Authorization: Bearer <oauth_token>
```

#### Authorization Model: Role-Based Access Control (RBAC)

```typescript
interface Role {
  role_id: string;
  role_name: string;
  permissions: Permission[];
  vertical_id?: string;      // null for platform-level roles
}

interface Permission {
  resource: string;          // 'vertical', 'pattern', 'deployment', etc.
  action: string;            // 'read', 'write', 'delete', 'deploy'
  scope: 'platform' | 'vertical' | 'customer';
}

// Platform-Level Roles
const PLATFORM_ROLES = {
  PLATFORM_ADMIN: {
    permissions: ['*:*:*'],  // Full access
    scope: 'platform'
  },
  DEPLOYMENT_ENGINEER: {
    permissions: [
      'vertical:deploy:*',
      'vertical:read:*',
      'deployment:*:*'
    ],
    scope: 'platform'
  },
  INTELLIGENCE_ANALYST: {
    permissions: [
      'pattern:read:*',
      'pattern:create:platform',
      'analytics:read:*'
    ],
    scope: 'platform'
  }
};

// Vertical-Level Roles
const VERTICAL_ROLES = {
  VERTICAL_ADMIN: {
    permissions: ['*:*:vertical'],
    scope: 'vertical'
  },
  CUSTOMER_ADMIN: {
    permissions: [
      'customer:*:customer',
      'agent:read:customer',
      'workflow:read:customer'
    ],
    scope: 'customer'
  }
};
```

### 1.2 Vertical Management API

#### Base URL: `https://platform.cobalt.ai/api/v1`

#### Endpoints

```typescript
// Create New Vertical
POST /verticals
Authorization: Platform-API-Key <admin_key>
Content-Type: application/json

Request:
{
  "vertical_name": "hvac",
  "entity_name": "Cobalt HVAC, LLC",
  "entity_type": "llc",
  "compliance_requirements": ["PCI-DSS"],
  "initial_config": {
    "database_schema": "vertical_hvac",
    "knowledge_graph_db": "hvac_intel_kg",
    "default_agents": ["H-OTTO", "H-BILLING"],
    "template_id": "hvac_template"
  },
  "billing_config": {
    "allocation_method": "usage_based",
    "resource_quotas": {
      "database_gb": 100,
      "compute_hours": 1000,
      "api_calls_per_day": 100000
    }
  }
}

Response: 201 Created
{
  "vertical_id": "vrt_hvac_20251220_001",
  "status": "provisioning",
  "estimated_ready_time": "2025-12-20T18:00:00Z",
  "resources": {
    "database_schema": "vertical_hvac",
    "knowledge_graph_db": "hvac_intel_kg",
    "api_key": "pk_live_hvac_...",
    "api_secret": "sk_live_hvac_..." // Returned only once
  },
  "deployment_id": "dep_hvac_20251220_001"
}

// Get Vertical Configuration
GET /verticals/{vertical_id}
Authorization: Platform-API-Key <key>

Response: 200 OK
{
  "vertical_id": "vrt_hvac_20251220_001",
  "vertical_name": "hvac",
  "entity_name": "Cobalt HVAC, LLC",
  "status": "active",
  "compliance_requirements": ["PCI-DSS"],
  "resources": {
    "database_schema": "vertical_hvac",
    "knowledge_graph_db": "hvac_intel_kg",
    "created_at": "2025-12-20T15:00:00Z"
  },
  "billing": {
    "current_period_usage": {
      "database_gb": 45.2,
      "compute_hours": 320,
      "api_calls": 45230
    },
    "resource_quotas": {...}
  }
}

// Update Vertical Configuration
PATCH /verticals/{vertical_id}
Authorization: Platform-API-Key <key>

Request:
{
  "compliance_requirements": ["PCI-DSS", "SOC2"],
  "billing_config": {
    "resource_quotas": {
      "database_gb": 200  // Increase quota
    }
  }
}

Response: 200 OK
{
  "vertical_id": "vrt_hvac_20251220_001",
  "updated_fields": ["compliance_requirements", "billing_config"],
  "updated_at": "2025-12-20T16:00:00Z"
}

// List All Verticals (Platform Admin Only)
GET /verticals
Authorization: Platform-API-Key <admin_key>
Query Parameters:
  - status: 'active' | 'provisioning' | 'suspended'
  - limit: number (default 100)
  - offset: number (default 0)

Response: 200 OK
{
  "verticals": [
    {
      "vertical_id": "vrt_auto_20250101_001",
      "vertical_name": "auto",
      "entity_name": "Auto Intel GTP, LLC",
      "status": "active",
      "customer_count": 150,
      "created_at": "2025-01-01T00:00:00Z"
    },
    // ...
  ],
  "total": 3,
  "limit": 100,
  "offset": 0
}
```

### 1.3 Deployment Automation API

```typescript
// Deploy Vertical from Template
POST /verticals/{vertical_id}/deploy
Authorization: Platform-API-Key <key>

Request:
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
        "capabilities": ["technician_assignment", "route_optimization"]
      }
    }
  ],
  "formulas": [
    {
      "template_id": "no_show_prediction",
      "customizations": {
        "features": ["equipment_age", "customer_history", "seasonal_factors"]
      }
    }
  ],
  "workflows": [
    {
      "template_id": "appointment_reminders",
      "customizations": {
        "channels": ["SMS", "Email", "Phone"],
        "timing": "48hr_before"
      }
    }
  ]
}

Response: 202 Accepted
{
  "deployment_id": "dep_hvac_20251220_001",
  "status": "in_progress",
  "estimated_completion": "2025-12-20T18:00:00Z",
  "steps": [
    {
      "step": "database_schema",
      "status": "complete",
      "completed_at": "2025-12-20T15:05:00Z"
    },
    {
      "step": "knowledge_graph",
      "status": "in_progress",
      "started_at": "2025-12-20T15:06:00Z"
    },
    {
      "step": "agents",
      "status": "pending"
    },
    {
      "step": "formulas",
      "status": "pending"
    },
    {
      "step": "workflows",
      "status": "pending"
    },
    {
      "step": "validation",
      "status": "pending"
    },
    {
      "step": "go_live",
      "status": "pending"
    }
  ]
}

// Get Deployment Status
GET /verticals/{vertical_id}/deployments/{deployment_id}
Authorization: Platform-API-Key <key>

Response: 200 OK
{
  "deployment_id": "dep_hvac_20251220_001",
  "status": "in_progress",
  "progress_percentage": 45,
  "current_step": "agents",
  "steps": [...],
  "logs": [
    {
      "timestamp": "2025-12-20T15:05:00Z",
      "level": "info",
      "message": "Database schema created successfully"
    },
    // ...
  ],
  "errors": []
}

// Rollback Deployment
POST /verticals/{vertical_id}/deployments/{deployment_id}/rollback
Authorization: Platform-API-Key <key>

Response: 202 Accepted
{
  "rollback_id": "rb_hvac_20251220_001",
  "status": "in_progress",
  "deployment_id": "dep_hvac_20251220_001",
  "rollback_to_step": "database_schema"
}
```

### 1.4 Shared Intelligence API

```typescript
// Search for Applicable Patterns
GET /intelligence/patterns
Authorization: Platform-API-Key <key>
Query Parameters:
  - vertical_id: string (required)
  - problem_type: string (required)
  - context: string (optional)
  - limit: number (default 10)

Request Example:
GET /intelligence/patterns?vertical_id=vrt_medical_001&problem_type=no_show_reduction&context=patient_scheduling

Response: 200 OK
{
  "patterns": [
    {
      "pattern_id": "pat_auto_no_show_001",
      "source_vertical": "auto",
      "pattern_type": "workflow_efficiency",
      "title": "48hr Multi-Channel Confirmations Reduce No-Shows",
      "insight": {
        "description": "48hr confirmations reduce no-shows by 32%",
        "improvement_percentage": 32,
        "conditions": [
          "Multi-channel communication (SMS, Email, Phone)",
          "48 hours before appointment",
          "Personalized message with service details"
        ],
        "strategy": "Multi-channel appointment confirmation",
        "metrics": {
          "before_no_show_rate": 0.25,
          "after_no_show_rate": 0.17,
          "sample_size": 1500
        }
      },
      "applicable_verticals": ["medical", "hvac", "retail"],
      "adaptation_guide": {
        "auto_context": "service appointment confirmation",
        "medical_context": "patient appointment confirmation",
        "hvac_context": "service call confirmation",
        "mappings": {
          "customer": "patient",
          "appointment": "appointment",
          "service": "treatment"
        }
      },
      "effectiveness_score": 0.92,
      "adoption_count": 2,
      "created_at": "2025-11-15T00:00:00Z",
      "updated_at": "2025-12-01T00:00:00Z"
    }
  ],
  "total": 5,
  "limit": 10
}

// Submit Pattern for Sharing (Anonymized)
POST /intelligence/patterns
Authorization: Platform-API-Key <key>

Request:
{
  "vertical_id": "vrt_auto_001",
  "pattern_type": "agent_optimization",
  "title": "Multi-Channel Communication Improves Agent Success",
  "insight": {
    "description": "Multi-channel communication improved agent success rate by 15%",
    "improvement_percentage": 15,
    "conditions": [
      "High-value customers",
      "Recurring services",
      "SMS + Email + Phone combination"
    ],
    "strategy": "Multi-channel customer communication",
    "metrics": {
      "before_success_rate": 0.78,
      "after_success_rate": 0.90,
      "sample_size": 500
    }
  },
  // NO CUSTOMER DATA
  // NO PII
  // NO BUSINESS-SPECIFIC DETAILS
  "applicable_verticals": ["medical", "hvac"] // Which verticals can use this
}

Response: 201 Created
{
  "pattern_id": "pat_auto_agent_opt_002",
  "status": "pending_review",
  "created_at": "2025-12-20T16:00:00Z"
}

// Get Pattern Details
GET /intelligence/patterns/{pattern_id}
Authorization: Platform-API-Key <key>

Response: 200 OK
{
  "pattern_id": "pat_auto_no_show_001",
  "source_vertical": "auto",
  "pattern_type": "workflow_efficiency",
  // ... (same as search result)
  "effectiveness_tracking": {
    "adoptions": 2,
    "successful_adaptations": 2,
    "average_improvement": 28.5,  // Average improvement across adapters
    "adoption_history": [
      {
        "vertical_id": "vrt_medical_001",
        "adopted_at": "2025-11-20T00:00:00Z",
        "improvement_achieved": 30,
        "status": "successful"
      },
      // ...
    ]
  }
}

// Track Pattern Effectiveness (When Vertical Adopts)
POST /intelligence/patterns/{pattern_id}/adopt
Authorization: Platform-API-Key <key>

Request:
{
  "vertical_id": "vrt_medical_001",
  "adopted_at": "2025-11-20T00:00:00Z",
  "adaptation_config": {
    "auto_context": "service appointment",
    "medical_context": "patient appointment",
    "mappings": {...}
  }
}

// Update Pattern Effectiveness (After Implementation)
PATCH /intelligence/patterns/{pattern_id}/adoptions/{adoption_id}
Authorization: Platform-API-Key <key>

Request:
{
  "improvement_achieved": 30,  // Actual improvement percentage
  "status": "successful",      // 'successful' | 'partial' | 'failed'
  "feedback": "Worked well for patient scheduling, reduced no-shows by 30%"
}

Response: 200 OK
{
  "adoption_id": "adp_medical_001",
  "status": "successful",
  "improvement_achieved": 30,
  "updated_at": "2025-12-15T00:00:00Z"
}
```

### 1.5 Analytics & Monitoring API

```typescript
// Get Vertical Metrics (Aggregated Only)
GET /verticals/{vertical_id}/metrics
Authorization: Platform-API-Key <key>
Query Parameters:
  - time_range: '24h' | '7d' | '30d' | 'custom'
  - start_date: ISO8601 (for custom range)
  - end_date: ISO8601 (for custom range)
  - metrics: string[] (e.g., ['customer_count', 'revenue', 'agent_success_rate'])

Response: 200 OK
{
  "vertical_id": "vrt_auto_001",
  "period": {
    "start": "2025-12-01T00:00:00Z",
    "end": "2025-12-20T00:00:00Z"
  },
  "metrics": {
    "customer_count": 150,        // Aggregated, not individual customers
    "total_revenue": 450000,      // Aggregated
    "avg_success_rate": 0.91,
    "avg_customer_satisfaction": 4.7,
    "agent_usage": {
      "OTTO": {
        "interactions": 12500,
        "success_rate": 0.92
      },
      "DEX": {
        "interactions": 3200,
        "success_rate": 0.88
      }
    }
  },
  // NO CUSTOMER-SPECIFIC DATA
  // NO PII
  // ONLY AGGREGATED METRICS
}

// Get Cross-Vertical Insights (Platform-Level, Anonymized)
GET /platform/insights
Authorization: Platform-API-Key <admin_key>
Query Parameters:
  - metric_type: 'agent_performance' | 'revenue' | 'customer_satisfaction'
  - comparison: boolean (default true)
  - verticals: string[] (optional, filter specific verticals)

Response: 200 OK
{
  "metric_type": "agent_performance",
  "period": {
    "start": "2025-12-01T00:00:00Z",
    "end": "2025-12-20T00:00:00Z"
  },
  "comparison": {
    "auto": {
      "avg_success_rate": 0.91,
      "customer_count": 150,
      "trend": "+5%"
    },
    "medical": {
      "avg_success_rate": 0.88,
      "customer_count": 50,
      "trend": "+3%"
    }
  },
  // NO INDIVIDUAL CUSTOMER DATA
  // ONLY AGGREGATED, ANONYMIZED INSIGHTS
}

// Get Infrastructure Usage Metrics
GET /platform/infrastructure/usage
Authorization: Platform-API-Key <admin_key>

Response: 200 OK
{
  "period": {
    "start": "2025-12-01T00:00:00Z",
    "end": "2025-12-20T00:00:00Z"
  },
  "total_usage": {
    "database_gb": 450.5,
    "compute_hours": 12500,
    "api_calls": 2500000,
    "knowledge_graph_nodes": 1250000
  },
  "per_vertical_usage": [
    {
      "vertical_id": "vrt_auto_001",
      "allocation_percentage": 45,
      "usage": {
        "database_gb": 200,
        "compute_hours": 5600,
        "api_calls": 1125000,
        "knowledge_graph_nodes": 562500
      }
    },
    // ...
  ]
}
```

---

## 2. DATABASE SCHEMA DESIGN

### 2.1 Platform-Level Schema

```sql
-- Platform Services Schema
CREATE SCHEMA platform;

-- Vertical Registry
CREATE TABLE platform.verticals (
  vertical_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_name VARCHAR(100) UNIQUE NOT NULL,
  entity_name VARCHAR(200) NOT NULL,
  entity_type VARCHAR(50) NOT NULL DEFAULT 'llc',
  status VARCHAR(50) NOT NULL DEFAULT 'provisioning', -- 'active', 'suspended', 'deprecated'
  compliance_requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Resource Configuration
  database_schema VARCHAR(100) NOT NULL,
  knowledge_graph_db VARCHAR(100) NOT NULL,
  
  -- Billing Configuration
  billing_config JSONB DEFAULT '{}'::JSONB,
  resource_quotas JSONB DEFAULT '{}'::JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT valid_status CHECK (status IN ('provisioning', 'active', 'suspended', 'deprecated'))
);

CREATE INDEX idx_verticals_status ON platform.verticals(status);
CREATE INDEX idx_verticals_name ON platform.verticals(vertical_name);

-- API Keys (Platform-to-Vertical Authentication)
CREATE TABLE platform.api_keys (
  api_key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES platform.verticals(vertical_id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL,  -- Hashed API key
  api_key_prefix VARCHAR(20) NOT NULL,  -- First 8 chars for identification
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  rate_limit JSONB DEFAULT '{"requests_per_minute": 1000, "requests_per_day": 100000}'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  
  CONSTRAINT valid_permissions CHECK (array_length(permissions, 1) > 0)
);

CREATE INDEX idx_api_keys_vertical ON platform.api_keys(vertical_id);
CREATE INDEX idx_api_keys_prefix ON platform.api_keys(api_key_prefix);
CREATE INDEX idx_api_keys_active ON platform.api_keys(vertical_id, revoked_at) WHERE revoked_at IS NULL;

-- Pattern Library (Shared Intelligence)
CREATE TABLE platform.patterns (
  pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_vertical_id UUID NOT NULL REFERENCES platform.verticals(vertical_id),
  pattern_type VARCHAR(100) NOT NULL, -- 'agent_optimization', 'workflow_efficiency', 'formula_improvement'
  title VARCHAR(500) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review', -- 'pending_review', 'approved', 'deprecated'
  
  -- Anonymized Insight (NO CUSTOMER DATA)
  insight JSONB NOT NULL,  -- Contains anonymized insight data
  /*
  insight structure:
  {
    "description": "48hr confirmations reduce no-shows by 32%",
    "improvement_percentage": 32,
    "conditions": ["Multi-channel communication", "48 hours before"],
    "strategy": "Multi-channel appointment confirmation",
    "metrics": {
      "before_metric": 0.25,
      "after_metric": 0.17,
      "sample_size": 1500
    }
  }
  */
  
  -- Applicability
  applicable_verticals TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Which verticals can use this
  adaptation_guide JSONB,  -- How to adapt pattern to different contexts
  
  -- Effectiveness Tracking
  effectiveness_score DECIMAL(3,2),  -- 0.00 to 1.00
  adoption_count INTEGER DEFAULT 0,
  successful_adoption_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  
  CONSTRAINT valid_pattern_type CHECK (pattern_type IN ('agent_optimization', 'workflow_efficiency', 'formula_improvement', 'integration_pattern')),
  CONSTRAINT valid_pattern_status CHECK (status IN ('pending_review', 'approved', 'deprecated')),
  CONSTRAINT no_customer_data CHECK (
    -- Ensure insight JSONB doesn't contain customer PII
    NOT (insight::text LIKE '%customer_id%' OR 
         insight::text LIKE '%customer_name%' OR
         insight::text LIKE '%email%' OR
         insight::text LIKE '%phone%' OR
         insight::text LIKE '%address%')
  )
);

CREATE INDEX idx_patterns_source_vertical ON platform.patterns(source_vertical_id);
CREATE INDEX idx_patterns_type ON platform.patterns(pattern_type);
CREATE INDEX idx_patterns_status ON platform.patterns(status);
CREATE INDEX idx_patterns_applicable ON platform.patterns USING GIN(applicable_verticals);
CREATE INDEX idx_patterns_effectiveness ON platform.patterns(effectiveness_score DESC NULLS LAST);

-- Pattern Adoptions (Track which verticals adopted which patterns)
CREATE TABLE platform.pattern_adoptions (
  adoption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES platform.patterns(pattern_id) ON DELETE CASCADE,
  adopting_vertical_id UUID NOT NULL REFERENCES platform.verticals(vertical_id),
  
  -- Adoption Details
  adopted_at TIMESTAMPTZ DEFAULT NOW(),
  adaptation_config JSONB,  -- How vertical adapted the pattern
  implementation_status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'successful', 'partial', 'failed'
  
  -- Effectiveness Tracking
  improvement_achieved DECIMAL(5,2),  -- Actual improvement percentage
  feedback TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_implementation_status CHECK (implementation_status IN ('in_progress', 'successful', 'partial', 'failed')),
  UNIQUE(pattern_id, adopting_vertical_id)  -- One adoption per vertical per pattern
);

CREATE INDEX idx_pattern_adoptions_pattern ON platform.pattern_adoptions(pattern_id);
CREATE INDEX idx_pattern_adoptions_vertical ON platform.pattern_adoptions(adopting_vertical_id);
CREATE INDEX idx_pattern_adoptions_status ON platform.pattern_adoptions(implementation_status);

-- Deployment Registry
CREATE TABLE platform.deployments (
  deployment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES platform.verticals(vertical_id),
  template_id VARCHAR(100),
  
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'complete', 'failed', 'rolled_back'
  progress_percentage INTEGER DEFAULT 0,
  current_step VARCHAR(100),
  
  -- Configuration
  config JSONB NOT NULL,  -- Deployment configuration
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  
  -- Rollback Info
  rollback_id UUID REFERENCES platform.deployments(deployment_id),
  rolled_back_at TIMESTAMPTZ,
  
  created_by UUID,
  
  CONSTRAINT valid_deployment_status CHECK (status IN ('pending', 'in_progress', 'complete', 'failed', 'rolled_back')),
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

CREATE INDEX idx_deployments_vertical ON platform.deployments(vertical_id);
CREATE INDEX idx_deployments_status ON platform.deployments(status);
CREATE INDEX idx_deployments_vertical_status ON platform.deployments(vertical_id, status);

-- Deployment Steps (Track individual deployment steps)
CREATE TABLE platform.deployment_steps (
  step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES platform.deployments(deployment_id) ON DELETE CASCADE,
  step_name VARCHAR(100) NOT NULL,
  step_order INTEGER NOT NULL,
  
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'complete', 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  logs JSONB DEFAULT '[]'::JSONB,
  
  CONSTRAINT valid_step_status CHECK (status IN ('pending', 'in_progress', 'complete', 'failed'))
);

CREATE INDEX idx_deployment_steps_deployment ON platform.deployment_steps(deployment_id);
CREATE INDEX idx_deployment_steps_order ON platform.deployment_steps(deployment_id, step_order);

-- Usage Metrics (Aggregated per vertical, for billing)
CREATE TABLE platform.usage_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES platform.verticals(vertical_id),
  
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Infrastructure Usage
  database_gb DECIMAL(10,2) DEFAULT 0,
  compute_hours DECIMAL(10,2) DEFAULT 0,
  api_calls BIGINT DEFAULT 0,
  knowledge_graph_nodes BIGINT DEFAULT 0,
  
  -- Platform Service Usage
  pattern_queries INTEGER DEFAULT 0,
  deployment_count INTEGER DEFAULT 0,
  analytics_reports INTEGER DEFAULT 0,
  
  -- Calculated Costs (for billing)
  infrastructure_cost DECIMAL(10,2),
  platform_service_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(vertical_id, period_start, period_end)
);

CREATE INDEX idx_usage_metrics_vertical ON platform.usage_metrics(vertical_id);
CREATE INDEX idx_usage_metrics_period ON platform.usage_metrics(period_start, period_end);

-- Vertical Metrics (Aggregated customer metrics, NO PII)
CREATE TABLE platform.vertical_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES platform.verticals(vertical_id),
  
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Aggregated Metrics (NO customer-specific data)
  customer_count INTEGER,  -- Total customer count, not individual customers
  total_revenue DECIMAL(12,2),  -- Aggregated revenue
  avg_success_rate DECIMAL(5,4),  -- Average across all customers
  avg_customer_satisfaction DECIMAL(3,2),  -- Average satisfaction score
  
  -- Agent Usage (Aggregated)
  agent_usage JSONB,  -- { "OTTO": {"interactions": 12500, "success_rate": 0.92}, ... }
  
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(vertical_id, period_start, period_end)
);

CREATE INDEX idx_vertical_metrics_vertical ON platform.vertical_metrics(vertical_id);
CREATE INDEX idx_vertical_metrics_period ON platform.vertical_metrics(period_start, period_end);
```

### 2.2 Row-Level Security (RLS) Policies

```sql
-- Enable RLS on platform tables
ALTER TABLE platform.verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.usage_metrics ENABLE ROW LEVEL SECURITY;

-- Platform Admin Role (Full Access)
CREATE ROLE platform_admin;
GRANT ALL ON SCHEMA platform TO platform_admin;
GRANT ALL ON ALL TABLES IN SCHEMA platform TO platform_admin;

-- Vertical Admin Role (Access to their vertical only)
CREATE ROLE vertical_admin;

-- Function to get current vertical_id from JWT/API key context
CREATE OR REPLACE FUNCTION platform.get_current_vertical_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.vertical_id', true)::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Verticals can only see their own data
CREATE POLICY vertical_isolation_verticals ON platform.verticals
  FOR SELECT
  USING (
    vertical_id = platform.get_current_vertical_id() OR
    current_setting('app.role', true) = 'platform_admin'
  );

-- RLS Policy: Patterns (approved patterns visible to all, pending only to source vertical)
CREATE POLICY pattern_access_policy ON platform.patterns
  FOR SELECT
  USING (
    status = 'approved' OR  -- Approved patterns visible to all
    (status = 'pending_review' AND source_vertical_id = platform.get_current_vertical_id()) OR  -- Source can see pending
    current_setting('app.role', true) = 'platform_admin'  -- Admins see all
  );

-- RLS Policy: Usage Metrics (verticals see only their own)
CREATE POLICY usage_metrics_isolation ON platform.usage_metrics
  FOR SELECT
  USING (
    vertical_id = platform.get_current_vertical_id() OR
    current_setting('app.role', true) = 'platform_admin'
  );

-- RLS Policy: Vertical Metrics (verticals see only their own aggregated metrics)
CREATE POLICY vertical_metrics_isolation ON platform.vertical_metrics
  FOR SELECT
  USING (
    vertical_id = platform.get_current_vertical_id() OR
    current_setting('app.role', true) = 'platform_admin'
  );
```

### 2.3 Vertical-Specific Schema (Example: HVAC)

```sql
-- Each vertical gets its own schema
CREATE SCHEMA vertical_hvac;

-- Customers (Vertical-specific, isolated from other verticals)
CREATE TABLE vertical_hvac.customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL DEFAULT 'vrt_hvac_20251220_001'::UUID,  -- Hardcoded per vertical
  
  -- Customer Data
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address JSONB,
  
  -- Business Data
  service_history JSONB DEFAULT '[]'::JSONB,
  equipment_list JSONB DEFAULT '[]'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT vertical_isolation CHECK (vertical_id = 'vrt_hvac_20251220_001'::UUID)
);

-- Enable RLS
ALTER TABLE vertical_hvac.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only this vertical's data
CREATE POLICY vertical_hvac_customer_isolation ON vertical_hvac.customers
  FOR ALL
  USING (vertical_id = current_setting('app.vertical_id', true)::UUID);
```

### 2.4 Anonymization Pipeline Design

```sql
-- Anonymization Function (Extracts patterns from vertical metrics)
CREATE OR REPLACE FUNCTION platform.extract_pattern(
  p_vertical_id UUID,
  p_pattern_type VARCHAR(100),
  p_insight_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_pattern_id UUID;
  v_anonymized_insight JSONB;
BEGIN
  -- Validate no PII in insight_data
  IF p_insight_data::text ~* '(customer_id|customer_name|email|phone|address|ssn)' THEN
    RAISE EXCEPTION 'Pattern extraction failed: PII detected in insight data';
  END IF;
  
  -- Create anonymized insight (remove any remaining identifiers)
  v_anonymized_insight := jsonb_build_object(
    'description', p_insight_data->>'description',
    'improvement_percentage', (p_insight_data->>'improvement_percentage')::DECIMAL,
    'conditions', p_insight_data->'conditions',
    'strategy', p_insight_data->>'strategy',
    'metrics', jsonb_build_object(
      'before_metric', p_insight_data->'metrics'->>'before_metric',
      'after_metric', p_insight_data->'metrics'->>'after_metric',
      'sample_size', p_insight_data->'metrics'->>'sample_size'
    )
  );
  
  -- Insert pattern (pending review)
  INSERT INTO platform.patterns (
    source_vertical_id,
    pattern_type,
    title,
    insight,
    applicable_verticals
  ) VALUES (
    p_vertical_id,
    p_pattern_type,
    p_insight_data->>'title',
    v_anonymized_insight,
    COALESCE((p_insight_data->'applicable_verticals')::TEXT[], ARRAY[]::TEXT[])
  )
  RETURNING pattern_id INTO v_pattern_id;
  
  RETURN v_pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pattern Approval Function (Platform admin approves patterns)
CREATE OR REPLACE FUNCTION platform.approve_pattern(
  p_pattern_id UUID,
  p_approved_by UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE platform.patterns
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = p_approved_by
  WHERE pattern_id = p_pattern_id
    AND status = 'pending_review';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pattern not found or already processed';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. DEPLOYMENT AUTOMATION

### 3.1 Deployment Workflow Script

```typescript
// deployment-workflow.ts
import { PlatformAPI } from './platform-api';
import { DatabaseService } from './database-service';
import { KnowledgeGraphService } from './knowledge-graph-service';
import { AgentDeploymentService } from './agent-deployment-service';

interface DeploymentWorkflow {
  verticalId: string;
  templateId: string;
  config: DeploymentConfig;
}

class DeploymentWorkflowEngine {
  async deployVertical(workflow: DeploymentWorkflow): Promise<DeploymentResult> {
    const deploymentId = await this.createDeployment(workflow);
    
    try {
      // Step 1: Database Schema Creation
      await this.stepDatabaseSchema(deploymentId, workflow);
      
      // Step 2: Knowledge Graph Setup
      await this.stepKnowledgeGraph(deploymentId, workflow);
      
      // Step 3: Agent Deployment
      await this.stepAgentDeployment(deploymentId, workflow);
      
      // Step 4: Formula Deployment
      await this.stepFormulaDeployment(deploymentId, workflow);
      
      // Step 5: Workflow Deployment
      await this.stepWorkflowDeployment(deploymentId, workflow);
      
      // Step 6: Integration Setup
      await this.stepIntegrationSetup(deploymentId, workflow);
      
      // Step 7: Validation Testing
      await this.stepValidation(deploymentId, workflow);
      
      // Step 8: Go-Live
      await this.stepGoLive(deploymentId, workflow);
      
      return {
        deploymentId,
        status: 'complete',
        completedAt: new Date()
      };
    } catch (error) {
      await this.markDeploymentFailed(deploymentId, error);
      throw error;
    }
  }
  
  private async stepDatabaseSchema(
    deploymentId: string,
    workflow: DeploymentWorkflow
  ): Promise<void> {
    await this.updateStepStatus(deploymentId, 'database_schema', 'in_progress');
    
    const schemaName = `vertical_${workflow.config.verticalName}`;
    
    // Create schema
    await DatabaseService.createSchema(schemaName);
    
    // Create tables from template
    const template = await this.loadTemplate('database_schema', workflow.templateId);
    await DatabaseService.executeSchema(template, schemaName);
    
    // Configure RLS policies
    await DatabaseService.configureRLS(schemaName, workflow.verticalId);
    
    // Update vertical registry
    await PlatformAPI.updateVertical(workflow.verticalId, {
      database_schema: schemaName
    });
    
    await this.updateStepStatus(deploymentId, 'database_schema', 'complete');
  }
  
  private async stepKnowledgeGraph(
    deploymentId: string,
    workflow: DeploymentWorkflow
  ): Promise<void> {
    await this.updateStepStatus(deploymentId, 'knowledge_graph', 'in_progress');
    
    const dbName = `${workflow.config.verticalName}_intel_kg`;
    
    // Create Neo4j database
    await KnowledgeGraphService.createDatabase(dbName);
    
    // Create indexes
    await KnowledgeGraphService.createIndexes(dbName, workflow.templateId);
    
    // Update vertical registry
    await PlatformAPI.updateVertical(workflow.verticalId, {
      knowledge_graph_db: dbName
    });
    
    await this.updateStepStatus(deploymentId, 'knowledge_graph', 'complete');
  }
  
  private async stepAgentDeployment(
    deploymentId: string,
    workflow: DeploymentWorkflow
  ): Promise<void> {
    await this.updateStepStatus(deploymentId, 'agents', 'in_progress');
    
    for (const agentConfig of workflow.config.agents) {
      if (agentConfig.template_id) {
        // Deploy from template
        await AgentDeploymentService.deployFromTemplate(
          workflow.verticalId,
          agentConfig.template_id,
          agentConfig.agent_id,
          agentConfig.customizations
        );
      } else {
        // Deploy custom agent
        await AgentDeploymentService.deployCustom(
          workflow.verticalId,
          agentConfig.agent_id,
          agentConfig.config
        );
      }
    }
    
    await this.updateStepStatus(deploymentId, 'agents', 'complete');
  }
  
  // ... (other step methods)
  
  private async updateStepStatus(
    deploymentId: string,
    stepName: string,
    status: 'pending' | 'in_progress' | 'complete' | 'failed'
  ): Promise<void> {
    await PlatformAPI.updateDeploymentStep(deploymentId, stepName, status);
  }
}
```

### 3.2 Infrastructure-as-Code (Terraform Example)

```hcl
# terraform/vertical-provisioning.tf

# Vertical Database Schema (Supabase)
resource "supabase_schema" "vertical" {
  for_each = var.verticals
  
  name = "vertical_${each.key}"
  
  # RLS enabled by default
  row_level_security = true
  
  # Grant access to vertical role
  grants = [
    {
      role   = "vertical_${each.key}_admin"
      privileges = ["USAGE", "CREATE"]
    }
  ]
}

# Vertical Knowledge Graph Database (Neo4j)
resource "neo4j_database" "vertical_kg" {
  for_each = var.verticals
  
  name = "${each.key}_intel_kg"
  
  # Isolation: Each vertical gets dedicated database
  isolation = "database"
  
  # Indexes
  indexes = [
    {
      label = "Customer"
      properties = ["id", "name"]
    },
    {
      label = "Vehicle"
      properties = ["id", "vin"]
    }
  ]
}

# Vertical API Key
resource "platform_api_key" "vertical" {
  for_each = var.verticals
  
  vertical_id = each.value.vertical_id
  permissions = each.value.permissions
  
  rate_limit = {
    requests_per_minute = each.value.rate_limit.rpm
    requests_per_day    = each.value.rate_limit.rpd
  }
}
```

### 3.3 Monitoring & Alerting Setup

```typescript
// monitoring-setup.ts
interface MonitoringConfig {
  verticalId: string;
  alertThresholds: {
    apiErrorRate: number;      // Alert if > 5%
    deploymentFailure: boolean; // Alert on any failure
    resourceQuota: number;      // Alert if > 80% of quota
    patternEffectiveness: number; // Alert if pattern effectiveness < 0.7
  };
}

class MonitoringService {
  async setupVerticalMonitoring(config: MonitoringConfig): Promise<void> {
    // 1. Create monitoring dashboard
    await this.createDashboard(config.verticalId);
    
    // 2. Configure alerts
    await this.configureAlerts(config);
    
    // 3. Set up health checks
    await this.setupHealthChecks(config.verticalId);
    
    // 4. Configure log aggregation
    await this.setupLogging(config.verticalId);
  }
  
  private async configureAlerts(config: MonitoringConfig): Promise<void> {
    // API Error Rate Alert
    await this.createAlert({
      name: `${config.verticalId}_api_error_rate`,
      condition: {
        metric: 'api_error_rate',
        threshold: config.alertThresholds.apiErrorRate,
        operator: '>'
      },
      notification: {
        channels: ['slack', 'email'],
        recipients: ['platform-team@cobalt.ai']
      }
    });
    
    // Resource Quota Alert
    await this.createAlert({
      name: `${config.verticalId}_resource_quota`,
      condition: {
        metric: 'resource_usage_percentage',
        threshold: config.alertThresholds.resourceQuota,
        operator: '>'
      },
      notification: {
        channels: ['slack'],
        recipients: ['platform-team@cobalt.ai', `vertical-${config.verticalId}@cobalt.ai`]
      }
    });
    
    // Deployment Failure Alert
    if (config.alertThresholds.deploymentFailure) {
      await this.createAlert({
        name: `${config.verticalId}_deployment_failure`,
        condition: {
          event: 'deployment_failed',
          vertical_id: config.verticalId
        },
        notification: {
          channels: ['slack', 'pagerduty'],
          recipients: ['on-call-engineer@cobalt.ai']
        }
      });
    }
  }
  
  private async setupHealthChecks(verticalId: string): Promise<void> {
    // Health check endpoints
    const healthChecks = [
      {
        name: 'database_health',
        endpoint: `/verticals/${verticalId}/health/database`,
        interval: 60, // seconds
        timeout: 5,
        expected_status: 200
      },
      {
        name: 'knowledge_graph_health',
        endpoint: `/verticals/${verticalId}/health/knowledge_graph`,
        interval: 60,
        timeout: 5,
        expected_status: 200
      },
      {
        name: 'agent_health',
        endpoint: `/verticals/${verticalId}/health/agents`,
        interval: 300,
        timeout: 10,
        expected_status: 200
      }
    ];
    
    for (const check of healthChecks) {
      await this.createHealthCheck(verticalId, check);
    }
  }
}
```

---

## 4. PATTERN LIBRARY STRUCTURE

### 4.1 Pattern Storage Model

```typescript
// Pattern Storage: JSONB in PostgreSQL + Embeddings for Semantic Search

interface PatternStorage {
  // Primary Storage: PostgreSQL (structured data)
  database: {
    table: 'platform.patterns',
    schema: {
      pattern_id: 'UUID',
      source_vertical_id: 'UUID',
      pattern_type: 'VARCHAR',
      title: 'VARCHAR',
      version: 'INTEGER',
      status: 'VARCHAR',
      insight: 'JSONB',  // Anonymized insight data
      applicable_verticals: 'TEXT[]',
      adaptation_guide: 'JSONB',
      effectiveness_score: 'DECIMAL',
      adoption_count: 'INTEGER',
      created_at: 'TIMESTAMPTZ',
      updated_at: 'TIMESTAMPTZ'
    }
  };
  
  // Semantic Search: Vector Embeddings (optional, for future)
  embeddings: {
    provider: 'OpenAI' | 'Cohere' | 'Custom',
    model: 'text-embedding-3-large',
    dimension: 3072,
    storage: 'pgvector',  // PostgreSQL vector extension
    indexed_fields: ['title', 'insight.description', 'insight.strategy']
  };
  
  // Graph Relationships: Neo4j (for pattern connections)
  graph: {
    database: 'platform_insights',
    nodes: ['Pattern', 'Vertical', 'Adoption'],
    relationships: [
      'EXTRACTED_FROM',  // Pattern → Vertical (source)
      'ADOPTED_BY',      // Pattern → Vertical (adopter)
      'SIMILAR_TO',      // Pattern → Pattern
      'IMPROVES'         // Pattern → Pattern (versioning)
    ]
  };
}
```

### 4.2 Pattern Versioning

```sql
-- Pattern Versioning Table
CREATE TABLE platform.pattern_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES platform.patterns(pattern_id),
  version_number INTEGER NOT NULL,
  
  -- Version-specific data
  insight JSONB NOT NULL,
  adaptation_guide JSONB,
  
  -- Version metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  change_summary TEXT,
  
  -- Version status
  is_current BOOLEAN DEFAULT FALSE,
  deprecated_at TIMESTAMPTZ,
  
  UNIQUE(pattern_id, version_number)
);

CREATE INDEX idx_pattern_versions_pattern ON platform.pattern_versions(pattern_id);
CREATE INDEX idx_pattern_versions_current ON platform.pattern_versions(pattern_id, is_current) WHERE is_current = TRUE;

-- Function to create new pattern version
CREATE OR REPLACE FUNCTION platform.create_pattern_version(
  p_pattern_id UUID,
  p_insight JSONB,
  p_change_summary TEXT
)
RETURNS UUID AS $$
DECLARE
  v_new_version_number INTEGER;
  v_version_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_new_version_number
  FROM platform.pattern_versions
  WHERE pattern_id = p_pattern_id;
  
  -- Deprecate current version
  UPDATE platform.pattern_versions
  SET is_current = FALSE, deprecated_at = NOW()
  WHERE pattern_id = p_pattern_id AND is_current = TRUE;
  
  -- Create new version
  INSERT INTO platform.pattern_versions (
    pattern_id,
    version_number,
    insight,
    change_summary,
    is_current
  ) VALUES (
    p_pattern_id,
    v_new_version_number,
    p_insight,
    p_change_summary,
    TRUE
  )
  RETURNING version_id INTO v_version_id;
  
  -- Update main pattern table
  UPDATE platform.patterns
  SET 
    version = v_new_version_number,
    insight = p_insight,
    updated_at = NOW()
  WHERE pattern_id = p_pattern_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.3 Pattern Effectiveness Tracking

```sql
-- Pattern Effectiveness Metrics
CREATE TABLE platform.pattern_effectiveness (
  effectiveness_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES platform.patterns(pattern_id),
  adoption_id UUID REFERENCES platform.pattern_adoptions(adoption_id),
  
  -- Effectiveness Metrics
  improvement_achieved DECIMAL(5,2),  -- Actual improvement percentage
  baseline_metric DECIMAL(10,4),      -- Metric before pattern adoption
  achieved_metric DECIMAL(10,4),      -- Metric after pattern adoption
  
  -- Context
  vertical_id UUID NOT NULL REFERENCES platform.verticals(vertical_id),
  measurement_period_start TIMESTAMPTZ,
  measurement_period_end TIMESTAMPTZ,
  
  -- Metadata
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  measured_by UUID,
  
  CONSTRAINT valid_improvement CHECK (improvement_achieved >= -100 AND improvement_achieved <= 1000)
);

CREATE INDEX idx_pattern_effectiveness_pattern ON platform.pattern_effectiveness(pattern_id);
CREATE INDEX idx_pattern_effectiveness_vertical ON platform.pattern_effectiveness(vertical_id);

-- Function to calculate pattern effectiveness score
CREATE OR REPLACE FUNCTION platform.calculate_pattern_effectiveness(p_pattern_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  v_effectiveness_score DECIMAL(3,2);
  v_avg_improvement DECIMAL(5,2);
  v_success_rate DECIMAL(3,2);
BEGIN
  -- Calculate average improvement
  SELECT AVG(improvement_achieved)
  INTO v_avg_improvement
  FROM platform.pattern_effectiveness
  WHERE pattern_id = p_pattern_id
    AND improvement_achieved IS NOT NULL;
  
  -- Calculate success rate (successful adoptions / total adoptions)
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN
        COUNT(CASE WHEN implementation_status = 'successful' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL
      ELSE 0
    END
  INTO v_success_rate
  FROM platform.pattern_adoptions
  WHERE pattern_id = p_pattern_id
    AND implementation_status IN ('successful', 'partial', 'failed');
  
  -- Effectiveness score: weighted average of improvement and success rate
  -- Improvement normalized to 0-1 scale (assuming max 100% improvement = 1.0)
  -- Success rate already 0-1 scale
  v_effectiveness_score := (
    (LEAST(v_avg_improvement, 100) / 100.0) * 0.6 +  -- 60% weight on improvement
    v_success_rate * 0.4                                -- 40% weight on success rate
  );
  
  -- Update pattern effectiveness score
  UPDATE platform.patterns
  SET effectiveness_score = v_effectiveness_score
  WHERE pattern_id = p_pattern_id;
  
  RETURN v_effectiveness_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to recalculate effectiveness when adoption completes
CREATE OR REPLACE FUNCTION platform.update_pattern_effectiveness()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate effectiveness when adoption status changes to 'successful' or 'failed'
  IF NEW.implementation_status IN ('successful', 'failed', 'partial') 
     AND (OLD.implementation_status IS NULL OR OLD.implementation_status = 'in_progress') THEN
    PERFORM platform.calculate_pattern_effectiveness(NEW.pattern_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pattern_effectiveness
  AFTER UPDATE ON platform.pattern_adoptions
  FOR EACH ROW
  WHEN (NEW.implementation_status <> OLD.implementation_status)
  EXECUTE FUNCTION platform.update_pattern_effectiveness();
```

### 4.4 Pattern Search & Recommendation

```typescript
// Pattern Search Service
class PatternSearchService {
  // Semantic search (using embeddings)
  async searchPatternsSemantic(
    verticalId: string,
    query: string,
    limit: number = 10
  ): Promise<Pattern[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Search similar patterns
    const patterns = await db.query(`
      SELECT 
        p.*,
        (p.embedding <=> $1::vector) as similarity
      FROM platform.patterns p
      WHERE 
        p.status = 'approved'
        AND ($2 = ANY(p.applicable_verticals) OR p.applicable_verticals = ARRAY[]::TEXT[])
        AND p.source_vertical_id != $3  -- Exclude patterns from same vertical
      ORDER BY similarity ASC
      LIMIT $4
    `, [queryEmbedding, this.getVerticalType(verticalId), verticalId, limit]);
    
    return patterns;
  }
  
  // Keyword + metadata search
  async searchPatternsKeyword(
    verticalId: string,
    filters: {
      problemType?: string;
      patternType?: string;
      minEffectiveness?: number;
    },
    limit: number = 10
  ): Promise<Pattern[]> {
    const patterns = await db.query(`
      SELECT p.*
      FROM platform.patterns p
      WHERE 
        p.status = 'approved'
        AND ($1 = ANY(p.applicable_verticals) OR p.applicable_verticals = ARRAY[]::TEXT[])
        AND p.source_vertical_id != $2
        AND ($3 IS NULL OR p.pattern_type = $3)
        AND ($4 IS NULL OR p.effectiveness_score >= $4)
        AND (
          $5 IS NULL OR
          p.title ILIKE '%' || $5 || '%' OR
          p.insight->>'description' ILIKE '%' || $5 || '%'
        )
      ORDER BY 
        p.effectiveness_score DESC NULLS LAST,
        p.adoption_count DESC
      LIMIT $6
    `, [
      this.getVerticalType(verticalId),
      verticalId,
      filters.patternType,
      filters.minEffectiveness,
      filters.problemType,
      limit
    ]);
    
    return patterns;
  }
  
  // Hybrid search (combines semantic + keyword)
  async searchPatternsHybrid(
    verticalId: string,
    query: string,
    filters: PatternFilters,
    limit: number = 10
  ): Promise<Pattern[]> {
    // Get semantic results
    const semanticResults = await this.searchPatternsSemantic(verticalId, query, limit * 2);
    
    // Get keyword results
    const keywordResults = await this.searchPatternsKeyword(verticalId, filters, limit * 2);
    
    // Combine and deduplicate (weighted by effectiveness and relevance)
    const combined = this.combineResults(semanticResults, keywordResults, limit);
    
    return combined;
  }
}
```

---

## ✅ IMPLEMENTATION SPECIFICATIONS COMPLETE

**Status:** All implementation specifications provided

**Coverage:**
- ✅ API Specifications (endpoints, schemas, authentication)
- ✅ Database Schema Design (platform tables, RLS policies, anonymization)
- ✅ Deployment Automation (workflow scripts, IaC, monitoring)
- ✅ Pattern Library Structure (storage, versioning, effectiveness tracking)

**Next Steps:**
- Console #2: Token optimization
- Console #3: Integration testing
- Implementation: Begin building platform services

---

*Implementation Specifications Version: 1.0*  
*Last Updated: 2025-12-20*  
*Status: Complete - Ready for Implementation*



