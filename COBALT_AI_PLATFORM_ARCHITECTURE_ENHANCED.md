# 🏗️ Cobalt AI Platform Architecture - Enhanced Design
**Multi-Vertical Platform Layer with Shared Intelligence**

**Version:** 2.0 Enhanced  
**Date:** 2025-12-20  
**Status:** Complete Architecture Design - Console #1

---

## 🎯 EXECUTIVE SUMMARY

The **Cobalt AI Platform** is the shared infrastructure layer that powers multiple vertical solutions (Auto Intel GTP, Medical, HVAC, etc.). The platform enables rapid vertical deployment (< 7 days) while maintaining strict data isolation, compliance separation, and intelligent cross-vertical learning.

**Key Innovation:** Verticals learn from each other's insights (e.g., "48hr confirmations reduce no-shows 32%") without exposing any customer data, enabling faster innovation while maintaining compliance.

---

## 🏢 CORPORATE STRUCTURE DESIGN

### Entity Hierarchy & Branding Strategy

```
Cobalt AI Holdings, LLC (Parent Company)
│
├── Platform Services, Inc. (Platform Layer)
│   ├── Brand: "Cobalt AI Platform" (B2B, white-label infrastructure)
│   ├── Role: Shared intelligence substrate, deployment automation
│   ├── Customers: Vertical entities (B2B SaaS)
│   └── Revenue: Infrastructure fees from verticals
│
├── Auto Intel GTP, LLC (Automotive Vertical)
│   ├── Brand: "Auto Intel GTP" (Customer-facing brand)
│   ├── Customers: Auto shops (Lake Street Auto, etc.)
│   ├── Platform User: Uses Cobalt AI Platform (white-label)
│   └── Revenue: Direct customer billing
│
├── Cobalt Medical, LLC (Medical Vertical)
│   ├── Brand: "Cobalt Medical" (Customer-facing brand)
│   ├── Customers: Medical clinics (Spine Clinic Network, etc.)
│   ├── Platform User: Uses Cobalt AI Platform (white-label)
│   └── Revenue: Direct customer billing
│
└── Future Verticals
    ├── Cobalt HVAC, LLC
    ├── Cobalt Retail, LLC
    └── ...
```

### Legal Entity Strategy: **Separate LLCs per Vertical**

**Decision:** Each vertical is a **separate LLC** under the Cobalt AI Holdings parent.

**Rationale:**
1. **Liability Isolation:** Medical malpractice doesn't affect automotive
2. **Compliance Separation:** HIPAA compliance isolated to medical entity
3. **Customer Trust:** Customers contract with vertical brand, not platform
4. **Billing Independence:** Each vertical sets their own pricing
5. **Investment Flexibility:** Can sell/divest verticals independently

### Branding Strategy: **White-Label Platform, Vertical-Specific Brands**

**Platform Level (Platform Services, Inc.):**
- **Brand:** "Cobalt AI Platform" (B2B only, not customer-facing)
- **Visibility:** Verticals use platform infrastructure (white-label)
- **Marketing:** Platform not advertised to end customers
- **Value Prop:** "Powered by Cobalt AI Platform" (optional attribution)

**Vertical Level (Auto Intel GTP, Cobalt Medical, etc.):**
- **Brand:** Vertical-specific customer-facing brands
- **Visibility:** Primary customer touchpoint
- **Marketing:** Verticals market their own brands
- **Value Prop:** Vertical-specific value propositions

**Example:**
- Customer sees: "Auto Intel GTP" (brand)
- Infrastructure: "Powered by Cobalt AI Platform" (optional)
- Platform: Never directly exposed to end customers

---

## 🔌 PLATFORM API LAYER

### Shared Intelligence Substrate

The platform provides a **shared intelligence substrate** that all verticals access:

```typescript
// Platform Services API Base
const PLATFORM_API = 'https://platform.cobalt.ai/api/v1';

interface PlatformIntelligence {
  // Agent Layer
  forgeAgents: ForgeAgent[];      // Platform-level agents (shared)
  squadAgents: SquadAgent[];      // Vertical-specific agents (deployed per vertical)
  
  // Intelligence Services
  nexus: NexusService;            // Platform-level orchestration
  knowledgeGraph: KGService;      // Per-vertical knowledge graphs
  patternLibrary: PatternLibrary; // Cross-vertical pattern sharing
  
  // Infrastructure
  deployment: DeploymentAPI;      // Vertical deployment automation
  monitoring: MonitoringAPI;      // Platform observability
  analytics: AnalyticsAPI;        // Aggregated insights
}
```

### Agent Architecture: Forge vs Squad

**FORGE Agents (Platform-Level):**
```typescript
interface ForgeAgent {
  agent_id: string;
  agent_type: 'FORGE';
  location: 'platform'; // Platform-level, shared across verticals
  capabilities: string[];
  examples: [
    'FORGE_DEPLOY',      // Deployment automation
    'FORGE_MONITOR',     // Platform monitoring
    'FORGE_OPTIMIZE',    // Cross-vertical optimization
    'FORGE_INTELLIGENCE' // Pattern extraction & sharing
  ];
}

// Forge agents are platform infrastructure
// All verticals access the same Forge agents
// Examples:
// - FORGE_DEPLOY: Deploys new verticals from templates
// - FORGE_MONITOR: Monitors platform health across all verticals
// - FORGE_INTELLIGENCE: Extracts anonymized patterns from verticals
```

**Squad Agents (Vertical-Specific):**
```typescript
interface SquadAgent {
  agent_id: string;
  agent_type: 'SQUAD';
  location: 'vertical'; // Vertical-specific deployment
  vertical_id: string;
  capabilities: string[];
  examples: {
    auto: [
      'OTTO',        // Automotive intake
      'DEX',         // Parts ordering
      'MILES',       // Customer communication
      'JACK'         // Diagnostic assistant
    ],
    medical: [
      'M-OTTO',      // Medical intake
      'M-BILLING',   // Medical billing
      'M-RETENTION', // Patient retention
      'M-OPS'        // Operations
    ],
    hvac: [
      'H-OTTO',      // HVAC intake
      'H-DISPATCH',  // Technician dispatch
      'H-BILLING',   // Service billing
      'H-MAINTENANCE' // Preventive maintenance
    ]
  };
}

// Squad agents are deployed per vertical
// Each vertical has their own Squad agent instances
// Agents are customized for vertical-specific workflows
```

**Agent Access Model:**
```
┌─────────────────────────────────────────┐
│        PLATFORM SERVICES                │
│  ┌──────────────────────────────────┐  │
│  │   FORGE AGENTS (Platform-Level)  │  │
│  │   - FORGE_DEPLOY                 │  │
│  │   - FORGE_MONITOR                │  │
│  │   - FORGE_INTELLIGENCE           │  │
│  │   - FORGE_OPTIMIZE               │  │
│  └──────────────────────────────────┘  │
│            ↕ (API Access)               │
│  ┌──────────────────────────────────┐  │
│  │   NEXUS (Platform Orchestration) │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
            ↕ (Platform APIs)
┌─────────────────────────────────────────┐
│        AUTO INTEL GTP (Vertical)        │
│  ┌──────────────────────────────────┐  │
│  │   SQUAD AGENTS (Auto-Specific)   │  │
│  │   - OTTO, DEX, MILES, JACK       │  │
│  └──────────────────────────────────┘  │
│            ↕ (Orchestration)            │
│  ┌──────────────────────────────────┐  │
│  │   NEXUS Instance (Auto Config)   │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│        COBALT MEDICAL (Vertical)        │
│  ┌──────────────────────────────────┐  │
│  │   SQUAD AGENTS (Medical-Specific)│  │
│  │   - M-OTTO, M-BILLING, etc.      │  │
│  └──────────────────────────────────┘  │
│            ↕ (Orchestration)            │
│  ┌──────────────────────────────────┐  │
│  │   NEXUS Instance (Medical Config)│  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### NEXUS: Platform-Level Orchestration

**NEXUS Location:** Platform-level service with vertical-specific instances

```typescript
interface NexusService {
  location: 'platform'; // Platform-level service
  deployment: 'per-vertical'; // One instance per vertical
  
  responsibilities: [
    'Agent orchestration',      // Coordinates Forge + Squad agents
    'Workflow execution',       // Manages vertical workflows
    'State management',         // Tracks conversation/process state
    'Integration coordination'  // Coordinates external integrations
  ];
  
  configuration: {
    platform: {
      // Platform-level NEXUS configuration
      forge_agents: ['FORGE_DEPLOY', 'FORGE_MONITOR', ...],
      cross_vertical_access: true,
      pattern_library_access: true
    },
    vertical: {
      // Vertical-specific NEXUS instance
      vertical_id: string,
      squad_agents: string[], // Vertical's Squad agents
      workflows: Workflow[],
      integrations: Integration[]
    }
  };
}
```

**NEXUS Architecture:**
- **Platform NEXUS:** Orchestrates Forge agents, manages cross-vertical intelligence
- **Vertical NEXUS:** Orchestrates Squad agents, manages vertical-specific workflows
- **Communication:** Vertical NEXUS can call Platform NEXUS for Forge agent access

---

## 🔐 DATA ISOLATION + LEARNING BRIDGE

### The Membrane: Strict Separation, Intelligent Sharing

**CRITICAL CONSTRAINT:**
- Medical data (PHI) **CANNOT** touch automotive data
- HIPAA requires complete data isolation
- But insights **CAN** transfer (anonymized patterns)

### Data Isolation Architecture

```
┌─────────────────────────────────────────────────────────┐
│              PLATFORM SERVICES LAYER                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │      SHARED INTELLIGENCE SUBSTRATE               │  │
│  │  - Pattern Library (Anonymized)                  │  │
│  │  - Template Library (Generic)                    │  │
│  │  - Cross-Vertical Analytics (Aggregated)        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │      PATTERN EXTRACTION ENGINE                   │  │
│  │  - Extracts insights (not data)                  │  │
│  │  - Anonymizes patterns                           │  │
│  │  - Stores in Pattern Library                     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                    ↕ (Pattern Queries)
┌─────────────────────────────────────────────────────────┐
│              VERTICAL: AUTO INTEL GTP                   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │      AUTOMOTIVE DATA (ISOLATED)                  │  │
│  │  - Customer: "Sarah", Vehicle: "Honda Accord"   │  │
│  │  - Service History, Appointments                 │  │
│  │  - Knowledge Graph: auto_intel_kg                │  │
│  └──────────────────────────────────────────────────┘  │
│                    ↕ (Pattern Extraction)               │
│  ┌──────────────────────────────────────────────────┐  │
│  │      PATTERN: "48hr confirmations reduce        │  │
│  │              no-shows by 32%"                     │  │
│  │  - No customer data                              │  │
│  │  - No PII                                        │  │
│  │  - Only insight                                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              VERTICAL: COBALT MEDICAL                   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │      MEDICAL DATA (ISOLATED)                     │  │
│  │  - Patient: "John Doe", Condition: "Back Pain"  │  │
│  │  - Medical History, Appointments                 │  │
│  │  - Knowledge Graph: medical_intel_kg             │  │
│  └──────────────────────────────────────────────────┘  │
│                    ↕ (Pattern Queries)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │      APPLIES PATTERN: "48hr confirmations       │  │
│  │              reduce no-shows by 32%"              │  │
│  │  - Adapts to medical context                     │  │
│  │  - No access to automotive data                  │  │
│  │  - Only insight applied                          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Pattern Extraction Engine

```typescript
interface AnonymizedPattern {
  pattern_id: string;
  source_vertical: string; // 'auto' or 'medical' (not customer-specific)
  pattern_type: 'agent_optimization' | 'workflow_efficiency' | 'formula_improvement';
  
  // ANONYMIZED INSIGHT (No customer data)
  insight: {
    description: string; // "48hr confirmations reduce no-shows by 32%"
    improvement_percentage: number; // 32
    conditions: string[]; // Generic conditions, no PII
    strategy: string; // "Multi-channel appointment confirmation"
  };
  
  // NO CUSTOMER DATA
  // NO PII
  // NO BUSINESS-SPECIFIC DETAILS
  
  applicable_verticals: string[]; // Which verticals can use this
  created_at: Date;
}

// Pattern Extraction Process
async function extractPattern(verticalId: string, metrics: VerticalMetrics): Promise<AnonymizedPattern> {
  // 1. Analyze vertical metrics (aggregated, no customer data)
  const insight = await analyzeMetrics(metrics);
  
  // 2. Anonymize insight (remove all PII, customer references)
  const anonymized = await anonymizeInsight(insight);
  
  // 3. Store in Pattern Library (platform-level, accessible to all verticals)
  const pattern = await storePattern({
    source_vertical: verticalId,
    insight: anonymized, // Only anonymized insight, no data
    applicable_verticals: determineApplicability(anonymized)
  });
  
  return pattern;
}

// Pattern Application Process
async function findApplicablePatterns(
  verticalId: string,
  problemType: string
): Promise<AnonymizedPattern[]> {
  // Returns patterns from OTHER verticals that might help
  // No customer data, only anonymized insights
  return await patternLibrary.search({
    problem_type: problemType,
    exclude_vertical: verticalId, // Don't return patterns from same vertical
    applicable_to: verticalId
  });
}
```

### Learning Bridge Example

**Scenario:** Automotive discovers "48hr confirmations reduce no-shows 32%"

**Step 1: Pattern Extraction (Auto → Platform)**
```typescript
// Auto Intel GTP discovers optimization
const autoMetrics = {
  before: { no_show_rate: 0.25 },
  after: { no_show_rate: 0.17 }, // 32% reduction
  strategy: "48hr multi-channel confirmation"
};

// Platform extracts pattern (anonymized)
const pattern = await extractPattern('auto', autoMetrics);
// Result: Pattern stored in library with NO customer data
```

**Step 2: Pattern Discovery (Medical → Platform)**
```typescript
// Cobalt Medical searches for no-show reduction strategies
const patterns = await findApplicablePatterns('medical', 'no_show_reduction');
// Returns: "48hr confirmations reduce no-shows by 32%" (from auto)

// Medical adapts pattern to medical context
const medicalAdaptation = {
  auto_context: "service appointment confirmation",
  medical_context: "patient appointment confirmation",
  strategy: "48hr multi-channel patient confirmation",
  channels: ["SMS", "Email", "Phone"] // Medical-specific adaptation
};
```

**Step 3: Pattern Application (Medical)**
```typescript
// Medical implements adapted pattern
await implementPattern('medical', medicalAdaptation);

// Medical data remains isolated
// No access to automotive customer data
// Only insight applied
```

**Result:**
- ✅ Medical benefits from automotive insight
- ✅ No data exposure (HIPAA compliant)
- ✅ Pattern adapted to medical context
- ✅ Both verticals improve without data sharing

---

## 🚀 VERTICAL DEPLOYMENT TEMPLATE

### HVAC Vertical Example: 80% Reusable, 20% Custom

**When deploying HVAC vertical, what's reusable vs custom?**

### Deployment Breakdown

#### 80% Reusable (Platform & Templates)

**1. Platform Infrastructure (100% Reusable)**
```typescript
// Platform Services provides:
- Multi-tenant database (Supabase with RLS)
- Knowledge graph infrastructure (Neo4j setup)
- Deployment automation (FORGE_DEPLOY agent)
- Monitoring & analytics (FORGE_MONITOR agent)
- Pattern library access (FORGE_INTELLIGENCE agent)
- NEXUS orchestration (platform + vertical instance)
```

**2. Agent Templates (80% Reusable, 20% Adaptation)**
```typescript
// Reusable Agent Patterns:
interface AgentTemplate {
  // 80% REUSABLE
  core_functionality: {
    intake: 'H-OTTO',        // Adapted from OTTO/M-OTTO
    billing: 'H-BILLING',    // Adapted from M-BILLING
    retention: 'H-RETENTION', // Adapted from retention agents
    operations: 'H-OPS'      // Adapted from operations agents
  };
  
  // 20% CUSTOM (HVAC-Specific)
  custom_agents: {
    dispatch: 'H-DISPATCH',      // HVAC-specific (technician dispatch)
    maintenance: 'H-MAINTENANCE', // HVAC-specific (preventive maintenance)
    diagnostics: 'H-DIAGNOSTICS'  // HVAC-specific (equipment diagnostics)
  };
}

// Agent Adaptation Example: OTTO → H-OTTO
const ottoToHVACAdaptation = {
  reusable: {
    conversation_flow: 'same',
    entity_extraction: 'same',
    intent_classification: 'same',
    knowledge_graph_integration: 'same'
  },
  custom: {
    domain_context: {
      auto: 'customer → vehicle → service',
      medical: 'patient → condition → treatment',
      hvac: 'customer → equipment → service' // HVAC-specific
    },
    entity_types: {
      auto: ['Customer', 'Vehicle', 'Service'],
      medical: ['Patient', 'Condition', 'Treatment'],
      hvac: ['Customer', 'Equipment', 'Service'] // HVAC-specific
    },
    workflows: {
      auto: 'service appointment → parts ordering',
      medical: 'patient appointment → insurance verification',
      hvac: 'service call → technician dispatch' // HVAC-specific
    }
  }
};
```

**3. Formula Templates (70% Reusable, 30% Custom)**
```typescript
// Reusable Formulas (adapt context):
const reusableFormulas = {
  scheduling: {
    reusable: 'same algorithm (optimize schedule, minimize gaps)',
    custom: {
      auto: 'service duration estimates',
      medical: 'provider availability + procedure duration',
      hvac: 'technician travel time + service duration' // HVAC-specific
    }
  },
  no_show_prediction: {
    reusable: 'same ML model (predict likelihood)',
    custom: {
      auto: 'customer history features',
      medical: 'patient history features',
      hvac: 'equipment age + customer history' // HVAC-specific
    }
  },
  retention: {
    reusable: 'same churn prediction model',
    custom: {
      auto: 'service frequency + vehicle age',
      medical: 'treatment compliance + follow-up',
      hvac: 'preventive maintenance schedule + equipment age' // HVAC-specific
    }
  }
};

// HVAC-Specific Formulas (30% custom):
const hvacSpecificFormulas = {
  seasonal_demand_forecasting: 'HVAC-specific (weather correlation)',
  technician_capacity_planning: 'HVAC-specific (dispatch optimization)',
  equipment_lifecycle_optimization: 'HVAC-specific (preventive maintenance)'
};
```

**4. Workflow Templates (75% Reusable, 25% Custom)**
```typescript
// Reusable Workflows:
const reusableWorkflows = {
  appointment_reminders: 'same (SMS/Email, 48hr before)',
  billing_automation: 'same (invoice generation, payment processing)',
  customer_communication: 'same (multi-channel messaging)',
  reporting: 'same (metrics, dashboards)'
};

// HVAC-Specific Workflows (25% custom):
const hvacSpecificWorkflows = {
  technician_dispatch: {
    trigger: 'service request created',
    steps: [
      'Assign technician based on location + skills',
      'Calculate travel time',
      'Send dispatch notification',
      'Track technician arrival',
      'Update customer on ETA'
    ]
  },
  preventive_maintenance_scheduling: {
    trigger: 'equipment service due',
    steps: [
      'Check equipment service history',
      'Calculate optimal service window',
      'Schedule maintenance appointment',
      'Order required parts',
      'Send customer notification'
    ]
  }
};
```

#### 20% Custom (HVAC-Specific)

**1. Domain-Specific Agents (Custom)**
- H-DISPATCH: Technician dispatch optimization
- H-MAINTENANCE: Preventive maintenance scheduling
- H-DIAGNOSTICS: Equipment diagnostic assistance

**2. HVAC-Specific Formulas (Custom)**
- Seasonal demand forecasting (weather correlation)
- Technician capacity planning (dispatch optimization)
- Equipment lifecycle optimization (preventive maintenance)

**3. HVAC-Specific Workflows (Custom)**
- Technician dispatch workflow
- Preventive maintenance scheduling
- Emergency service prioritization

**4. HVAC-Specific Integrations (Custom)**
- HVAC equipment manufacturer APIs
- Weather service APIs (seasonal forecasting)
- Technician management systems

### Deployment Timeline: 0 → Operational

**Target: < 7 days (Goal: < 3 days)**

```
Day 1: Platform Setup
  ├─ Create vertical entity (Cobalt HVAC, LLC)
  ├─ Create database schema (vertical_hvac)
  ├─ Create knowledge graph database (hvac_intel_kg)
  └─ Configure RLS policies
  Time: 4-6 hours

Day 2-3: Agent Deployment
  ├─ Deploy agent templates (H-OTTO, H-BILLING, etc.)
  ├─ Adapt agents to HVAC context (20% customization)
  ├─ Deploy HVAC-specific agents (H-DISPATCH, H-MAINTENANCE)
  └─ Configure NEXUS instance for HVAC
  Time: 12-16 hours

Day 4-5: Formula & Workflow Setup
  ├─ Deploy formula templates (adapt to HVAC)
  ├─ Create HVAC-specific formulas
  ├─ Deploy workflow templates
  ├─ Create HVAC-specific workflows
  └─ Configure integrations
  Time: 12-16 hours

Day 6: Testing & Validation
  ├─ Integration testing
  ├─ End-to-end workflow testing
  ├─ Performance validation
  └─ Compliance verification
  Time: 6-8 hours

Day 7: Go-Live
  ├─ Customer onboarding
  ├─ Production deployment
  ├─ Monitoring setup
  └─ Success metrics tracking
  Time: 4-6 hours

Total: ~50-60 hours = ~7 days (1 person)
       ~25-30 hours = ~3 days (2 people parallel)
```

### Deployment Playbook for HVAC

**Step 1: Platform Setup**
```bash
# Create vertical
POST /platform/api/v1/verticals
{
  "vertical_name": "hvac",
  "entity_name": "Cobalt HVAC, LLC",
  "compliance_requirements": ["PCI-DSS"],
  "template_id": "hvac_template"
}

# Platform automatically:
# - Creates database schema (vertical_hvac)
# - Creates knowledge graph (hvac_intel_kg)
# - Configures RLS policies
# - Sets up monitoring
```

**Step 2: Agent Deployment (80% Template, 20% Custom)**
```bash
# Deploy reusable agents (adapted)
POST /platform/api/v1/verticals/hvac/agents/deploy
{
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
      "template_id": "billing_template",
      "agent_id": "H-BILLING",
      "customizations": {
        "invoice_types": ["service_call", "preventive_maintenance", "parts"],
        "payment_methods": ["credit_card", "ach"]
      }
    }
  ]
}

# Deploy HVAC-specific agents (custom)
POST /platform/api/v1/verticals/hvac/agents/deploy
{
  "agents": [
    {
      "agent_id": "H-DISPATCH",
      "type": "custom",
      "capabilities": ["technician_assignment", "route_optimization", "eta_tracking"]
    },
    {
      "agent_id": "H-MAINTENANCE",
      "type": "custom",
      "capabilities": ["preventive_scheduling", "equipment_lifecycle", "part_ordering"]
    }
  ]
}
```

**Step 3: Formula Deployment (70% Template, 30% Custom)**
```bash
# Deploy reusable formulas (adapted)
POST /platform/api/v1/verticals/hvac/formulas/deploy
{
  "formulas": [
    {
      "template_id": "no_show_prediction",
      "customizations": {
        "features": ["equipment_age", "customer_history", "seasonal_factors"]
      }
    },
    {
      "template_id": "retention",
      "customizations": {
        "factors": ["preventive_maintenance_schedule", "equipment_age", "service_frequency"]
      }
    }
  ]
}

# Deploy HVAC-specific formulas (custom)
POST /platform/api/v1/verticals/hvac/formulas/deploy
{
  "formulas": [
    {
      "formula_id": "seasonal_demand_forecasting",
      "type": "custom",
      "algorithm": "time_series_with_weather_correlation"
    },
    {
      "formula_id": "technician_capacity_planning",
      "type": "custom",
      "algorithm": "dispatch_optimization"
    }
  ]
}
```

**Step 4: Workflow Deployment (75% Template, 25% Custom)**
```bash
# Deploy reusable workflows
POST /platform/api/v1/verticals/hvac/workflows/deploy
{
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

# Deploy HVAC-specific workflows
POST /platform/api/v1/verticals/hvac/workflows/deploy
{
  "workflows": [
    {
      "workflow_id": "technician_dispatch",
      "type": "custom",
      "steps": ["assign_technician", "calculate_travel_time", "send_dispatch", "track_arrival"]
    }
  ]
}
```

---

## 💰 BILLING & METRICS ARCHITECTURE

### Per-Vertical P&L Tracking

**Each vertical entity maintains independent P&L:**

```typescript
interface VerticalPandL {
  vertical_id: string;
  period: string; // '2025-01'
  
  revenue: {
    customer_subscriptions: number;
    usage_based_revenue: number;
    add_on_features: number;
    total_revenue: number;
  };
  
  costs: {
    platform_services: {
      infrastructure_fees: number;
      api_usage_fees: number;
      knowledge_graph_fees: number;
      deployment_fees: number;
    };
    direct_costs: {
      customer_support: number;
      sales_marketing: number;
      operations: number;
    };
    total_costs: number;
  };
  
  profit: {
    gross_profit: number; // revenue - direct_costs
    net_profit: number;   // revenue - total_costs
    margin_percentage: number;
  };
}
```

### Shared Infrastructure Cost Allocation

**Platform Services allocates costs to verticals:**

```typescript
interface InfrastructureCostAllocation {
  period: string;
  
  total_infrastructure_costs: {
    database: number;      // Supabase costs
    compute: number;       // Server costs
    storage: number;       // Data storage
    bandwidth: number;     // Network costs
    knowledge_graph: number; // Neo4j costs
    monitoring: number;    // Observability tools
    total: number;
  };
  
  allocation_method: 'usage_based' | 'equal_split' | 'revenue_share';
  
  per_vertical_allocation: {
    vertical_id: string;
    allocated_cost: number;
    allocation_factors: {
      database_usage_gb: number;
      compute_hours: number;
      api_calls: number;
      knowledge_graph_nodes: number;
      revenue_share_percentage?: number;
    };
  }[];
}
```

**Cost Allocation Methods:**

1. **Usage-Based (Recommended):**
```typescript
// Allocate costs based on actual usage
const allocation = {
  database: (vertical_usage_gb / total_usage_gb) * total_database_cost,
  compute: (vertical_compute_hours / total_compute_hours) * total_compute_cost,
  api_calls: (vertical_api_calls / total_api_calls) * total_api_cost,
  knowledge_graph: (vertical_nodes / total_nodes) * total_kg_cost
};
```

2. **Equal Split (Simple):**
```typescript
// Split costs equally across verticals
const allocation = total_infrastructure_costs / vertical_count;
```

3. **Revenue Share (Alternative):**
```typescript
// Allocate based on revenue percentage
const allocation = (vertical_revenue / total_revenue) * total_infrastructure_costs;
```

### Platform Charge Model (Internal Transfer Pricing)

**Platform Services charges verticals for platform usage:**

```typescript
interface PlatformCharges {
  vertical_id: string;
  billing_period: string;
  
  charges: {
    // Infrastructure Charges
    infrastructure: {
      database_storage: {
        usage_gb: number;
        rate_per_gb: number; // $0.10/GB/month
        charge: number;
      };
      compute: {
        hours: number;
        rate_per_hour: number; // $0.05/hour
        charge: number;
      };
      knowledge_graph: {
        nodes: number;
        rate_per_1k_nodes: number; // $1.00/1k nodes/month
        charge: number;
      };
    };
    
    // Platform Service Charges
    platform_services: {
      deployment_automation: {
        deployments: number;
        rate_per_deployment: number; // $50/deployment
        charge: number;
      };
      shared_intelligence: {
        pattern_queries: number;
        rate_per_query: number; // $0.01/query
        charge: number;
      };
      cross_vertical_analytics: {
        reports: number;
        rate_per_report: number; // $10/report
        charge: number;
      };
    };
    
    total_charge: number;
  };
  
  invoice: {
    invoice_id: string;
    due_date: Date;
    status: 'pending' | 'paid' | 'overdue';
  };
}
```

### Billing Flow

```
Platform Services (Infrastructure Provider)
    ↓
Charges Vertical Entities (B2B SaaS)
    ├─ Infrastructure fees (usage-based)
    ├─ Platform service fees
    └─ Knowledge graph fees
    ↓
Vertical Entities (Customer-Facing)
    ├─ Auto Intel GTP, LLC
    ├─ Cobalt Medical, LLC
    └─ Cobalt HVAC, LLC
    ↓
Bill Their Customers (Direct Billing)
    ├─ Subscription fees
    ├─ Usage-based fees
    └─ Add-on features
```

### Metrics Architecture

**Platform-Level Metrics (Aggregated Only):**
```typescript
interface PlatformMetrics {
  period: string;
  
  // Aggregated metrics (no customer data)
  vertical_aggregates: {
    vertical_id: string;
    customer_count: number; // Aggregated, not individual
    total_revenue: number;  // Aggregated
    avg_success_rate: number;
    avg_customer_satisfaction: number;
  }[];
  
  // Cross-vertical insights (anonymized)
  cross_vertical_insights: {
    pattern_adoption_rate: number;
    shared_intelligence_queries: number;
    template_usage: number;
  };
  
  // Infrastructure metrics
  infrastructure: {
    total_database_usage_gb: number;
    total_compute_hours: number;
    total_api_calls: number;
    total_knowledge_graph_nodes: number;
  };
}
```

**Vertical-Level Metrics (Customer-Specific):**
```typescript
// Each vertical tracks their own customer metrics
// Platform Services has NO access to customer-specific metrics
interface VerticalMetrics {
  vertical_id: string;
  customer_id: string; // Vertical's customer
  
  // Customer-specific metrics (not accessible to platform)
  customer_metrics: {
    agent_success_rate: number;
    revenue: number;
    satisfaction_score: number;
    usage: {
      api_calls: number;
      agents_used: number;
      formulas_used: number;
    };
  };
}
```

---

## 📊 ARCHITECTURE DIAGRAMS

### Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    COBALT AI HOLDINGS, LLC                      │
│                        (Parent Company)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────┴────────┐   ┌────────┴────────┐   ┌────────┴────────┐
│  Platform      │   │  Auto Intel     │   │  Cobalt Medical │
│  Services, Inc.│   │  GTP, LLC       │   │  LLC            │
│                │   │                 │   │                 │
│  (Platform)    │   │  (Vertical)     │   │  (Vertical)     │
└───────┬────────┘   └────────┬────────┘   └────────┬────────┘
        │                     │                     │
        │  Charges for        │  Bills customers    │  Bills customers
        │  infrastructure     │  directly           │  directly
        │                     │                     │
        │  Provides:          │  Uses:              │  Uses:
        │  - Forge Agents     │  - Squad Agents     │  - Squad Agents
        │  - NEXUS Platform   │  - NEXUS Instance   │  - NEXUS Instance
        │  - Pattern Library  │  - Pattern Access   │  - Pattern Access
        │  - Deployment API   │  - Platform APIs    │  - Platform APIs
        └─────────────────────┴─────────────────────┘
```

### Data Flow: Isolation + Learning Bridge

```
┌─────────────────────────────────────────────────────────────┐
│  VERTICAL: AUTO INTEL GTP                                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Automotive Data (ISOLATED)                          │  │
│  │  - Customer: "Sarah"                                 │  │
│  │  - Vehicle: "Honda Accord"                           │  │
│  │  - Service History                                   │  │
│  │  - Knowledge Graph: auto_intel_kg                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                    │
│                        │ (Pattern Extraction)               │
│                        ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Pattern: "48hr confirmations reduce no-shows 32%"  │  │
│  │  (ANONYMIZED - No customer data)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                    │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ↓ (Stored in Pattern Library)
┌─────────────────────────────────────────────────────────────┐
│  PLATFORM SERVICES: PATTERN LIBRARY                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Anonymized Patterns (No Customer Data)              │  │
│  │  - Pattern 1: "48hr confirmations reduce no-shows"  │  │
│  │  - Pattern 2: "Multi-channel reminders improve..."  │  │
│  │  - Pattern 3: "Automated follow-ups increase..."    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓ (Pattern Query)
┌─────────────────────────────────────────────────────────────┐
│  VERTICAL: COBALT MEDICAL                                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Medical Data (ISOLATED)                             │  │
│  │  - Patient: "John Doe"                               │  │
│  │  - Condition: "Back Pain"                            │  │
│  │  - Medical History                                   │  │
│  │  - Knowledge Graph: medical_intel_kg                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                        ↑                                    │
│                        │ (Pattern Application)              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Applied Pattern: "48hr confirmations reduce..."    │  │
│  │  (Adapted to medical context)                        │  │
│  │  (No access to automotive data)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ✅ Medical benefits from automotive insight                │
│  ✅ No data exposure (HIPAA compliant)                      │
│  ✅ Pattern adapted to medical context                      │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ SUCCESS CRITERIA MET

### 1. Corporate Structure Design ✅
- ✅ Entity hierarchy defined (Parent → Platform → Verticals)
- ✅ Legal structure (separate LLCs per vertical)
- ✅ Branding strategy (white-label platform, vertical-specific brands)

### 2. Platform API Layer ✅
- ✅ Shared intelligence substrate defined
- ✅ Forge vs Squad agents architecture
- ✅ NEXUS placement (platform-level with vertical instances)

### 3. Data Isolation + Learning Bridge ✅
- ✅ Strict data separation (HIPAA compliant)
- ✅ Intelligent insight sharing (anonymized patterns)
- ✅ Pattern extraction engine designed
- ✅ Learning bridge architecture complete

### 4. Vertical Deployment Template ✅
- ✅ 80/20 breakdown (reusable vs custom)
- ✅ HVAC example complete
- ✅ Deployment timeline (< 7 days target)
- ✅ Deployment playbook provided

### 5. Billing & Metrics Architecture ✅
- ✅ Per-vertical P&L tracking
- ✅ Shared infrastructure cost allocation
- ✅ Platform charge model (internal transfer pricing)
- ✅ Metrics architecture (platform vs vertical)

---

**Console #1: Platform Architecture Enhanced** ✅ **COMPLETE**  
**Status:** All requirements met, ready for implementation

---

*Architecture enhanced: 2025-12-20*  
*Version: 2.0 Enhanced*  
*Status: Complete and production-ready*



