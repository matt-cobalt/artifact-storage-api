# 🏗️ Cobalt AI Platform Architecture
**Multi-Vertical Platform Layer with Shared Intelligence**

**Version:** 1.0  
**Date:** 2025-12-20  
**Status:** Architecture Design - Console #1

---

## 🎯 EXECUTIVE SUMMARY

The Cobalt AI Platform is a **multi-vertical SaaS platform** that enables rapid deployment of AI-powered vertical solutions (Automotive, Medical, etc.) while maintaining strict data isolation, compliance, and billing separation. The platform provides a **shared intelligence layer** that allows verticals to learn from each other without exposing sensitive data.

**Key Principles:**
- **Vertical Isolation:** Complete data, billing, and compliance separation
- **Shared Intelligence:** Cross-vertical learning without data exposure
- **Rapid Deployment:** Platform APIs enable new verticals in days, not months
- **Scalable Architecture:** Support unlimited verticals with consistent performance

---

## 📐 CORPORATE & LEGAL STRUCTURE

### Entity Hierarchy

```
Cobalt AI Holdings, LLC (Parent Company)
├── Platform Services, Inc. (Platform Layer)
│   ├── Shared Intelligence Services
│   ├── Platform APIs & Infrastructure
│   └── Cross-Vertical Analytics (Anonymized)
│
├── Cobalt Auto, LLC (Automotive Vertical)
│   ├── Lake Street Auto (Customer)
│   └── [Future Auto Customers]
│
├── Cobalt Medical, LLC (Medical Vertical)
│   ├── Spine Clinic Network (50 clinics)
│   └── [Future Medical Customers]
│
└── [Future Verticals]
    ├── Cobalt Retail, LLC
    ├── Cobalt Hospitality, LLC
    └── ...
```

### Legal & Compliance Structure

**1. Entity Separation:**
- Each vertical is a **separate legal entity** (LLC)
- Independent contracts, billing, and data ownership
- Platform Services provides technology under **B2B SaaS agreements**

**2. Data Ownership:**
- **Vertical Entity** owns all customer data
- **Platform Services** provides infrastructure only
- **No cross-entity data access** without explicit consent

**3. Compliance Partitioning:**
- **HIPAA (Medical):** Cobalt Medical, LLC maintains HIPAA compliance
- **PCI-DSS (Automotive):** Cobalt Auto, LLC maintains PCI compliance
- **GDPR/CCPA:** Each entity maintains its own compliance
- **Platform Services:** SOC 2 Type II (infrastructure only, no customer data)

**4. Billing Structure:**
- **Platform Services:** Charges vertical entities for platform usage
- **Vertical Entities:** Bill their customers directly
- **No cross-vertical billing** or revenue sharing

---

## 🏛️ PLATFORM ARCHITECTURE

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VERTICAL LAYER                            │
│  (Cobalt Auto, Cobalt Medical, Future Verticals)           │
│  - Vertical-specific agents, formulas, workflows           │
│  - Customer-facing interfaces                               │
│  - Vertical-specific business logic                         │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  PLATFORM SERVICES LAYER                     │
│  - Multi-tenant infrastructure                              │
│  - Platform APIs (deployment, monitoring, analytics)       │
│  - Shared Intelligence Layer (anonymized learning)           │
│  - Cross-vertical insights (aggregated, anonymized)         │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                      │
│  - Database (Supabase multi-tenant)                         │
│  - Knowledge Graph (Neo4j per-vertical)                     │
│  - Compute (Vercel, AWS, etc.)                             │
│  - Message Queue (n8n workflows)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 DATA ISOLATION & COMPLIANCE

### Database Architecture: Multi-Tenant with Row-Level Security

**Supabase Schema Structure:**
```sql
-- Platform-level tables (Platform Services)
CREATE SCHEMA platform;
CREATE TABLE platform.verticals (
  vertical_id UUID PRIMARY KEY,
  vertical_name VARCHAR(100) NOT NULL,
  entity_name VARCHAR(200) NOT NULL,
  compliance_requirements TEXT[], -- ['HIPAA', 'PCI-DSS', etc.]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vertical-specific schemas (isolated)
CREATE SCHEMA vertical_auto;
CREATE SCHEMA vertical_medical;
CREATE SCHEMA vertical_retail; -- Future

-- Row-Level Security (RLS) Policies
ALTER TABLE vertical_auto.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY vertical_isolation_auto ON vertical_auto.customers
  USING (vertical_id = current_setting('app.vertical_id')::UUID);

-- Platform Services can query aggregated data only
CREATE VIEW platform.vertical_metrics AS
SELECT 
  vertical_id,
  COUNT(DISTINCT customer_id) as customer_count,
  SUM(revenue) as total_revenue,
  AVG(agent_success_rate) as avg_success_rate
FROM vertical_auto.metrics
GROUP BY vertical_id;
```

### Knowledge Graph Isolation: Per-Vertical Databases

**Neo4j Structure:**
```
Neo4j Cluster
├── Database: auto_intel_kg (Cobalt Auto)
│   └── All automotive customer data, relationships
│
├── Database: medical_intel_kg (Cobalt Medical)
│   └── All medical patient data, relationships
│
└── Database: platform_insights (Platform Services)
    └── Aggregated, anonymized patterns only
```

**Isolation Rules:**
- Each vertical has **dedicated Neo4j database**
- **No cross-database queries** allowed
- Platform Services database contains **only anonymized patterns**

---

## 🧠 SHARED INTELLIGENCE LAYER

### How Verticals Learn from Each Other (Without Data Exposure)

**1. Pattern Extraction (Anonymized)**
```typescript
// Platform Services extracts patterns (not data)
interface AnonymizedPattern {
  pattern_id: string;
  pattern_type: 'agent_optimization' | 'formula_improvement' | 'workflow_efficiency';
  vertical_source: string; // 'auto' or 'medical' (not customer-specific)
  anonymized_insight: {
    // Example: "Agent X improved success rate by 15% when using strategy Y"
    // No customer data, no PII, no business-specific details
    improvement_type: string;
    improvement_percentage: number;
    conditions: string[]; // Generic conditions
  };
  applicable_verticals: string[]; // Which verticals can use this
  created_at: Date;
}

// Pattern matching across verticals
async function findApplicablePatterns(
  verticalId: string,
  problemType: string
): Promise<AnonymizedPattern[]> {
  // Returns patterns from OTHER verticals that might help
  // No customer data, only anonymized insights
}
```

**2. Formula & Agent Template Sharing**
```typescript
// Platform Services maintains template library
interface AgentTemplate {
  template_id: string;
  agent_type: 'intake' | 'billing' | 'retention' | 'operations';
  vertical_origin: string; // Where it was proven
  success_metrics: {
    avg_success_rate: number;
    customer_satisfaction: number;
    deployment_count: number; // How many verticals use it
  };
  generic_config: {
    // No customer-specific data
    prompt_template: string;
    workflow_steps: string[];
    integration_points: string[];
  };
  vertical_adaptations: {
    // How each vertical adapts it
    auto: { context: 'customer → patient', mappings: {...} },
    medical: { context: 'patient → customer', mappings: {...} }
  };
}
```

**3. Cross-Vertical Analytics (Aggregated Only)**
```sql
-- Platform Services can query aggregated metrics
CREATE VIEW platform.cross_vertical_insights AS
SELECT 
  vertical_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(DISTINCT customer_id) as active_customers,
  AVG(agent_success_rate) as avg_success_rate,
  AVG(customer_satisfaction) as avg_satisfaction,
  SUM(revenue) as total_revenue
FROM (
  SELECT * FROM vertical_auto.metrics
  UNION ALL
  SELECT * FROM vertical_medical.metrics
) all_metrics
GROUP BY vertical_id, month;

-- No individual customer data exposed
-- Only aggregated, anonymized insights
```

**4. Learning Feedback Loop**
```
Vertical A (Auto) → Discovers optimization
         ↓
Platform Services → Extracts pattern (anonymized)
         ↓
Pattern Library → Stores as template
         ↓
Vertical B (Medical) → Searches for applicable patterns
         ↓
Platform Services → Returns matching patterns
         ↓
Vertical B → Adapts pattern to medical context
         ↓
Platform Services → Tracks success, updates pattern
```

---

## 🔌 PLATFORM APIs

### Core Platform Services API

**Base URL:** `https://platform.cobalt.ai/api/v1`

#### 1. Vertical Management API

```typescript
// Create new vertical
POST /verticals
{
  "vertical_name": "retail",
  "entity_name": "Cobalt Retail, LLC",
  "compliance_requirements": ["PCI-DSS"],
  "initial_config": {
    "database_schema": "retail",
    "knowledge_graph_db": "retail_intel_kg",
    "default_agents": ["RETAIL_INTAKE", "RETAIL_INVENTORY"]
  }
}

// Get vertical configuration
GET /verticals/{vertical_id}

// Update vertical settings
PATCH /verticals/{vertical_id}
```

#### 2. Deployment Automation API

```typescript
// Deploy vertical from template
POST /verticals/{vertical_id}/deploy
{
  "template_id": "medical_clinic_template",
  "customer_config": {
    "customer_name": "Spine Clinic Network",
    "locations": 50,
    "ehr_system": "athenahealth"
  },
  "agents": ["M-OTTO", "M-BILLING", "M-RETENTION"],
  "formulas": ["scheduling", "no_show_prediction", "retention"]
}

// Get deployment status
GET /verticals/{vertical_id}/deployments/{deployment_id}

// Rollback deployment
POST /verticals/{vertical_id}/deployments/{deployment_id}/rollback
```

#### 3. Shared Intelligence API

```typescript
// Search for applicable patterns
GET /intelligence/patterns
{
  "vertical_id": "medical",
  "problem_type": "no_show_prediction",
  "context": "patient_scheduling"
}

// Response: Anonymized patterns from other verticals
{
  "patterns": [
    {
      "pattern_id": "pattern_123",
      "source_vertical": "auto", // Not customer-specific
      "insight": "Appointment reminder optimization improved show rate by 18%",
      "applicable": true,
      "adaptation_guide": {
        "auto_context": "service appointment",
        "medical_context": "patient appointment",
        "mappings": {...}
      }
    }
  ]
}

// Submit pattern for sharing (anonymized)
POST /intelligence/patterns
{
  "vertical_id": "auto",
  "pattern_type": "agent_optimization",
  "anonymized_insight": {
    // No customer data, only generic insights
    "improvement": "15% success rate increase",
    "strategy": "Multi-channel communication",
    "conditions": ["high-value customers", "recurring services"]
  }
}
```

#### 4. Analytics & Monitoring API

```typescript
// Get vertical metrics (aggregated)
GET /verticals/{vertical_id}/metrics
{
  "time_range": "30d",
  "metrics": ["customer_count", "revenue", "agent_success_rate"]
}

// Get cross-vertical insights (platform-level, anonymized)
GET /platform/insights
{
  "metric_type": "agent_performance",
  "comparison": true // Compare across verticals
}

// Response: Aggregated data only, no customer PII
{
  "insights": {
    "auto": {
      "avg_success_rate": 0.91,
      "customer_count": 150,
      "revenue_trend": "+12%"
    },
    "medical": {
      "avg_success_rate": 0.88,
      "customer_count": 50,
      "revenue_trend": "+8%"
    }
  }
}
```

---

## 💰 BILLING & RESOURCE PARTITIONING

### Billing Structure

**1. Platform Services Billing (to Vertical Entities)**
```typescript
interface PlatformBilling {
  vertical_id: string;
  billing_period: string; // '2025-01'
  charges: {
    infrastructure: {
      database_storage_gb: number;
      compute_hours: number;
      knowledge_graph_nodes: number;
      api_calls: number;
    };
    platform_services: {
      deployment_automation: number;
      shared_intelligence_queries: number;
      cross_vertical_analytics: number;
    };
  };
  total_amount: number;
  invoice_id: string;
}
```

**2. Vertical Entity Billing (to Customers)**
```typescript
// Each vertical entity bills their customers independently
// Platform Services has NO visibility into customer billing
interface VerticalCustomerBilling {
  customer_id: string; // Vertical's customer, not platform's
  vertical_id: string;
  billing_period: string;
  charges: {
    // Vertical-specific pricing
    agents: number;
    formulas: number;
    locations: number;
    custom_features: number;
  };
  total_amount: number;
  // Platform Services never sees this
}
```

### Resource Partitioning

**Database Resources:**
- Each vertical gets **dedicated schema** in Supabase
- **Row-Level Security** enforces isolation
- **Resource quotas** per vertical (configurable)

**Knowledge Graph Resources:**
- Each vertical gets **dedicated Neo4j database**
- **No cross-database access** allowed
- **Resource monitoring** per database

**Compute Resources:**
- **Vertical-specific compute pools** (optional)
- **Shared compute** with vertical isolation (default)
- **Resource quotas** and monitoring

---

## 🚀 RAPID VERTICAL DEPLOYMENT

### Deployment Engine Architecture

**1. Vertical Template System**
```typescript
interface VerticalTemplate {
  template_id: string;
  template_name: string; // e.g., "Medical Clinic", "Auto Shop"
  components: {
    agents: AgentTemplate[];
    formulas: FormulaTemplate[];
    workflows: WorkflowTemplate[];
    database_schema: SchemaTemplate;
    knowledge_graph_config: KGConfig;
  };
  deployment_steps: DeploymentStep[];
  validation_tests: ValidationTest[];
}
```

**2. Automated Deployment Pipeline**
```
Step 1: Template Selection
  ↓
Step 2: Database Schema Creation
  ↓
Step 3: Knowledge Graph Setup
  ↓
Step 4: Agent Deployment
  ↓
Step 5: Formula Configuration
  ↓
Step 6: Workflow Setup
  ↓
Step 7: Integration Testing
  ↓
Step 8: Go-Live
```

**3. Deployment API**
```typescript
// Deploy new vertical from template
POST /deploy/vertical
{
  "template_id": "medical_clinic",
  "vertical_config": {
    "name": "Cobalt Medical",
    "entity_name": "Cobalt Medical, LLC",
    "compliance": ["HIPAA"]
  },
  "customer_config": {
    "name": "Spine Clinic Network",
    "locations": 50,
    "ehr_system": "athenahealth"
  }
}

// Response: Deployment job
{
  "deployment_id": "deploy_123",
  "status": "in_progress",
  "estimated_completion": "2025-12-20T15:00:00Z",
  "steps": [
    { "step": "database_schema", "status": "complete" },
    { "step": "knowledge_graph", "status": "in_progress" },
    { "step": "agents", "status": "pending" }
  ]
}
```

---

## 🔒 SECURITY & COMPLIANCE

### Security Architecture

**1. Authentication & Authorization**
```typescript
// Platform-level authentication
interface PlatformAuth {
  vertical_id: string;
  api_key: string; // Per-vertical API key
  permissions: string[]; // ['read', 'write', 'deploy']
  rls_context: {
    // Sets Supabase RLS context
    vertical_id: string;
    customer_id?: string; // Optional customer-level isolation
  };
}

// Vertical-specific authentication
// Each vertical manages their own customer authentication
// Platform Services never sees customer credentials
```

**2. Data Encryption**
- **At Rest:** All databases encrypted (Supabase, Neo4j)
- **In Transit:** TLS 1.3 for all API calls
- **Key Management:** AWS KMS or equivalent per vertical

**3. Audit Logging**
```sql
-- Platform Services audit log
CREATE TABLE platform.audit_logs (
  log_id UUID PRIMARY KEY,
  vertical_id UUID,
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id UUID,
  user_id UUID,
  ip_address INET,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Vertical-specific audit logs (isolated)
CREATE TABLE vertical_auto.audit_logs (...);
CREATE TABLE vertical_medical.audit_logs (...);
```

### Compliance Partitioning

**HIPAA (Medical Vertical):**
- Cobalt Medical, LLC maintains **Business Associate Agreements (BAAs)**
- Platform Services provides **infrastructure only** (no PHI access)
- **Encryption, access controls, audit logs** per HIPAA requirements

**PCI-DSS (Automotive Vertical):**
- Cobalt Auto, LLC maintains PCI compliance
- **Payment data never touches Platform Services**
- Vertical handles all payment processing directly

**GDPR/CCPA:**
- Each vertical entity maintains their own **data subject rights** processes
- Platform Services provides **data export/deletion APIs** per vertical
- **No cross-vertical data sharing** without explicit consent

---

## 📊 MONITORING & OBSERVABILITY

### Platform-Level Monitoring

```typescript
// Platform Services monitors infrastructure only
interface PlatformMetrics {
  vertical_id: string;
  infrastructure: {
    database_queries_per_second: number;
    knowledge_graph_latency_ms: number;
    api_response_time_ms: number;
    error_rate: number;
  };
  // No customer-specific metrics
  // No business data
}

// Cross-vertical insights (anonymized)
interface CrossVerticalInsights {
  vertical_comparison: {
    auto: { avg_success_rate: 0.91, customer_count: 150 },
    medical: { avg_success_rate: 0.88, customer_count: 50 }
  };
  // No individual customer data
}
```

### Vertical-Level Monitoring

```typescript
// Each vertical monitors their own customers
// Platform Services has NO access to customer-specific metrics
interface VerticalMetrics {
  customer_id: string; // Vertical's customer
  agent_performance: {...};
  revenue_metrics: {...};
  customer_satisfaction: {...};
  // Platform Services never sees this
}
```

---

## 🎯 KEY ARCHITECTURAL DECISIONS

### 1. Why Separate Legal Entities?

**Decision:** Each vertical is a separate LLC

**Rationale:**
- **Liability isolation:** Medical malpractice doesn't affect automotive
- **Compliance separation:** HIPAA compliance isolated to medical entity
- **Billing independence:** Each vertical sets their own pricing
- **Customer trust:** Customers contract with vertical, not platform

### 2. Why Shared Intelligence Layer?

**Decision:** Anonymized pattern sharing across verticals

**Rationale:**
- **Faster innovation:** Verticals learn from each other's successes
- **No data exposure:** Only anonymized patterns, no customer data
- **Competitive advantage:** Platform becomes smarter with each vertical
- **Rapid deployment:** New verticals start with proven patterns

### 3. Why Per-Vertical Knowledge Graphs?

**Decision:** Separate Neo4j database per vertical

**Rationale:**
- **Data isolation:** No cross-vertical data leakage possible
- **Performance:** Each vertical optimized independently
- **Compliance:** Easier to audit and maintain compliance
- **Scalability:** Each vertical scales independently

### 4. Why Platform APIs?

**Decision:** Centralized deployment and management APIs

**Rationale:**
- **Rapid deployment:** New verticals in days, not months
- **Consistency:** All verticals use same deployment process
- **Monitoring:** Platform-level observability
- **Shared services:** Intelligence layer, analytics, etc.

---

## 🚀 DEPLOYMENT ROADMAP

### Phase 1: Foundation (Current)
- ✅ Platform Services infrastructure
- ✅ Multi-tenant database architecture
- ✅ Per-vertical knowledge graphs
- ✅ Basic deployment automation

### Phase 2: Shared Intelligence (Next)
- ⏭️ Pattern extraction engine
- ⏭️ Template library
- ⏭️ Cross-vertical analytics (anonymized)
- ⏭️ Learning feedback loop

### Phase 3: Scale (Future)
- ⏭️ Additional verticals (Retail, Hospitality, etc.)
- ⏭️ Advanced deployment automation
- ⏭️ Self-service vertical creation
- ⏭️ Marketplace for vertical templates

---

## 📋 IMPLEMENTATION CHECKLIST

### Platform Services Layer
- [ ] Multi-tenant Supabase setup with RLS
- [ ] Per-vertical Neo4j databases
- [ ] Platform APIs (deployment, monitoring, intelligence)
- [ ] Authentication & authorization system
- [ ] Audit logging infrastructure
- [ ] Billing & resource partitioning

### Shared Intelligence Layer
- [ ] Pattern extraction engine
- [ ] Template library system
- [ ] Cross-vertical analytics (anonymized)
- [ ] Pattern matching & recommendation engine
- [ ] Learning feedback loop

### Vertical Isolation
- [ ] Database schema per vertical
- [ ] Row-Level Security policies
- [ ] Knowledge graph isolation
- [ ] Compliance partitioning (HIPAA, PCI-DSS)
- [ ] Billing separation

### Deployment Automation
- [ ] Vertical template system
- [ ] Automated deployment pipeline
- [ ] Validation & testing framework
- [ ] Rollback capabilities
- [ ] Monitoring & observability

---

## 🎯 SUCCESS METRICS

**Platform-Level:**
- Time to deploy new vertical: **< 7 days** (target: < 3 days)
- Cross-vertical pattern adoption rate: **> 30%**
- Platform API uptime: **> 99.9%**
- Infrastructure cost per vertical: **< $500/month**

**Vertical-Level:**
- Customer deployment time: **< 24 hours**
- Agent success rate: **> 90%**
- Customer satisfaction: **> 4.5/5**
- Revenue per customer: **$X,XXX/month**

---

## 📚 APPENDIX

### A. Entity Structure Diagram
```
[See Corporate & Legal Structure section above]
```

### B. API Reference
```
[See Platform APIs section above]
```

### C. Database Schema
```sql
[See Data Isolation & Compliance section above]
```

### D. Compliance Checklist
- [ ] HIPAA BAA for Medical vertical
- [ ] PCI-DSS compliance for Automotive vertical
- [ ] SOC 2 Type II for Platform Services
- [ ] GDPR/CCPA compliance per vertical
- [ ] Data retention policies per vertical

---

**Status:** Architecture Design Complete  
**Next Steps:** Implementation planning and technical specification  
**Owner:** Console #1 - Platform Architecture Team

---

*Document Version: 1.0*  
*Last Updated: 2025-12-20*  
*Architecture Status: Ready for Review*



