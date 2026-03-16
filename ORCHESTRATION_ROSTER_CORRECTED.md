# OTTO Orchestration - Corrected 13-Agent Roster ✅

**Date:** December 17, 2024  
**Status:** Updated to match revised Technical Manifesto

---

## Corrected Squad Roster (13 Agents)

The OTTO Orchestration Layer has been updated to support all **13 Squad agents**:

### 1. **OTTO** - Gateway & Intake
- **Role:** First contact, routes to specialists
- **Intent:** `service_advisor`
- **Handles:** General recommendations, initial routing

### 2. **DEX** - Diagnostics Triage
- **Role:** Analyzes symptoms, recommends tests
- **Intent:** `diagnostics`
- **Handles:** Check engine lights, DTC codes, diagnostic procedures

### 3. **CAL** - Pricing & Estimates
- **Role:** Builds quotes, maximizes conversion
- **Intent:** `pricing`
- **Handles:** Estimates, approval probability, pricing strategy

### 4. **FLO** - Operations Orchestration
- **Role:** Scheduling, dispatch, workflow
- **Intent:** `scheduling`
- **Handles:** Appointments, workflow coordination, timing

### 5. **MAC** - Production Manager
- **Role:** Shop floor execution, wrench time
- **Intent:** `production`
- **Handles:** Tech assignments, bay status, production workflow

### 6. **KIT** - Parts & Inventory
- **Role:** Parts sourcing, pricing, availability
- **Intent:** `parts`
- **Handles:** Inventory checks, parts ordering, supplier coordination

### 7. **VIN** - Vehicle Intelligence
- **Role:** VIN decode, service history
- **Intent:** `vehicle`
- **Handles:** Vehicle-specific data, service records, recalls

### 8. **MILES** - Customer Retention
- **Role:** Post-service, loyalty, next visits
- **Intent:** `retention`
- **Handles:** Churn risk, follow-up strategies, loyalty programs

### 9. **ROY** - Business Intelligence
- **Role:** Daily KPIs, coaching insights
- **Intent:** `business_intel`
- **Handles:** Performance metrics, coaching recommendations, business analytics

### 10. **PENNYP** - Financial Operations
- **Role:** Invoicing, payments, QuickBooks
- **Intent:** `financial`
- **Handles:** Billing, collections, financial reporting

### 11. **BLAZE** - Marketing Intelligence
- **Role:** Campaigns, customer acquisition
- **Intent:** `marketing`
- **Handles:** Marketing campaigns, lead generation, customer acquisition

### 12. **LANCE** - Compliance & Fraud Prevention
- **Role:** The Shield - detects fraud, ensures compliance
- **Intent:** `compliance`
- **Handles:** Fraud detection, warranty verification, regulatory compliance

### 13. **ORACLE** - Operational Analytics
- **Role:** Real-time reporting, patterns
- **Intent:** `analytics`
- **Handles:** Pattern analysis, trend forecasting, operational insights

---

## Implementation Updates

### ✅ Updated Files

1. **`src/orchestration/otto-orchestrator.js`**
   - Updated `AGENT_INTENT_MAP` to include all 13 agents
   - Updated `classifyUserIntent()` with all intent patterns
   - Updated `extractKeyPoints()` to handle all agent types
   - Added logic to include ROY for business context on complex queries

2. **`database/otto_orchestration_schema.sql`**
   - Added `primary_intent` field
   - Added `confidence_scores` JSONB field
   - Added `agents_timed_out` and `agents_errored` arrays
   - Added `coordination_strategy` field
   - Added `fallback_used` boolean

3. **`database/otto_errors_table.sql`** (new)
   - Created error tracking table for debugging

4. **Documentation Updated**
   - `src/orchestration/README.md` - Updated intent classification section
   - All references updated from 11 to 13 agents

---

## Intent Classification Patterns

The orchestrator now detects these intent patterns:

```javascript
diagnostics:    /diagnos|symptom|trouble.*code|check.*engine|scan|dtc|warning.*light/i
pricing:        /price|cost|estimate|quote|how.*much|approval.*prob|convert/i
scheduling:     /schedule|appointment|book|dispatch|when.*can|available|workflow/i
production:     /shop.*floor|tech.*assign|wrench.*time|production|work.*order|bay.*status/i
parts:          /part|inventory|stock|order.*part|supplier|availability|parts.*price/i
vehicle:        /vin|vehicle.*history|service.*record|recall|maintenance.*schedule/i
retention:      /customer.*return|churn|loyalty|follow.*up|next.*visit|win.*back/i
business_intel: /kpi|performance|coaching|daily.*report|business.*metric|how.*doing/i
financial:      /invoice|payment|quickbooks|billing|collection|accounts.*receivable/i
marketing:      /marketing|campaign|promotion|lead|acquisition|advertising/i
compliance:     /fraud|warranty.*abuse|compliant|regulation|liability|verify|suspicious/i
analytics:      /analyze|pattern|trend|forecast|real.*time|operational.*data|reporting/i
service_advisor: /recommend|suggest|should|advice|what|help|need|service/i
```

---

## Multi-Agent Coordination

The orchestrator can coordinate multiple agents in parallel:

**Example:** "What's the approval probability on this $650 brake job?"

- Routes to: **CAL** (primary - pricing), **MILES** (supporting - retention context), **ROY** (background - business context)
- All execute in parallel
- OTTO synthesizes unified response
- User sees: Single coherent "Edge AI" response

---

## Status: ✅ COMPLETE

All 13 Squad agents are:
- ✅ Registered in the agent registry
- ✅ Mapped to their respective intents
- ✅ Supported in the orchestrator
- ✅ Ready for orchestration

**Next Steps:**
1. Run database migrations (including new error tracking table)
2. Test with real queries for each agent type
3. Verify multi-agent coordination works correctly
4. Monitor performance and refine intent patterns









