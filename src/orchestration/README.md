# OTTO Orchestration Layer - "The Edge AI"

**Purpose:** Routes user messages to Squad agents and synthesizes unified responses branded as "The Edge AI"

**Status:** ✅ Complete - Ready for Testing  
**Date:** December 17, 2024

---

## Overview

The OTTO Orchestration Layer is the hidden intelligence that powers "The Edge AI" - the unified interface that users interact with. Behind the scenes, OTTO:

1. **Classifies** user intent from messages
2. **Routes** to appropriate Squad agents (CAL, MILES, OTTO, DEX, ROY, etc.)
3. **Executes** agents in parallel for speed
4. **Synthesizes** responses into coherent unified answers
5. **Logs** orchestration events to Supabase for analysis

**Key Principle:** Users see "The Edge AI" - they never see agent names or know about multi-agent orchestration.

---

## Architecture

```
User Message
    ↓
OTTO Intent Classifier
    ↓
Agent Router (determines which agents to consult)
    ↓
Parallel Agent Execution (CAL, MILES, OTTO, etc.)
    ↓
Response Synthesizer (combines insights)
    ↓
Unified "Edge AI" Response
    ↓
Supabase Logging (internal tracking)
```

---

## Files

### Core Orchestration Module
- **`otto-orchestrator.js`** - Main orchestration logic
  - `classifyUserIntent()` - Intent detection
  - `routeToAgents()` - Agent routing
  - `executeAgentsInParallel()` - Parallel execution with timeouts
  - `synthesizeResponse()` - Response synthesis
  - `orchestrate()` - Main entry point

### API Endpoint
- **`../artifact-storage/routes.js`** - Added `/api/edge-ai/query` endpoint

### Database Schema
- **`../../database/otto_orchestration_schema.sql`** - Supabase tables
  - `otto_orchestrations` - Logs every orchestration
  - `agent_performance_metrics` - Tracks agent performance

### Test Script
- **`../scripts/test-otto-orchestration.js`** - Test orchestration with various queries

### Documentation
- **`../../docs/n8n-workflow-otto-orchestration.md`** - n8n workflow setup guide

---

## Usage

### Via API Endpoint

```bash
POST http://localhost:3000/api/edge-ai/query
Content-Type: application/json

{
  "message": "What's the approval probability on this $500 brake job?",
  "context": {
    "customer_id": "cust_001",
    "ro_number": "RO-2024-523",
    "shop_id": "shop_001"
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "87% approval probability. This price is competitive...",
  "confidence": 0.87,
  "execution_time_ms": 1247,
  "_metadata": {
    "agents_consulted": ["cal", "miles"],
    "quality_score": 0.89
  }
}
```

### Programmatically

```javascript
import { orchestrate } from './otto-orchestrator.js';

const result = await orchestrate(
  "What's the approval probability on this $500 brake job?",
  {
    customer_id: 'cust_001',
    ro_number: 'RO-2024-523',
    shop_id: 'shop_001'
  }
);

console.log(result.response); // Unified "Edge AI" response
```

---

## Testing

Run the test script:

```bash
cd artifact-storage-api
node src/scripts/test-otto-orchestration.js
```

This will test various query types and verify:
- Intent classification accuracy
- Agent routing correctness
- Response synthesis quality
- Execution time (< 5 seconds for 3-agent orchestration)

---

## Database Setup

Before using orchestration, run the database schema:

```sql
-- Execute in Supabase SQL Editor
\i database/otto_orchestration_schema.sql
```

Or copy/paste the SQL from `database/otto_orchestration_schema.sql` into Supabase.

---

## Intent Classification

OTTO detects these intents and routes to the appropriate Squad agents:

- **diagnostics** - DTC codes, symptoms, problems → Routes to **DEX** (Diagnostics Triage)
- **pricing** - Price, cost, estimate, quote queries → Routes to **CAL** (Pricing & Estimates)
- **scheduling** - Schedule, appointment, workflow queries → Routes to **FLO** (Operations Orchestration)
- **production** - Shop floor, tech assignment, bay status → Routes to **MAC** (Production Manager)
- **parts** - Parts inventory, availability, sourcing → Routes to **KIT** (Parts & Inventory)
- **vehicle** - VIN decode, service history, recalls → Routes to **VIN** (Vehicle Intelligence)
- **retention** - Customer return, churn, loyalty → Routes to **MILES** (Customer Retention)
- **business_intel** - KPIs, performance metrics, coaching → Routes to **ROY** (Business Intelligence)
- **financial** - Invoicing, payments, QuickBooks → Routes to **PENNYP** (Financial Operations)
- **marketing** - Campaigns, customer acquisition, leads → Routes to **BLAZE** (Marketing Intelligence)
- **compliance** - Fraud detection, warranty abuse, compliance → Routes to **LANCE** (Compliance & Fraud Prevention)
- **analytics** - Patterns, trends, forecasting, reporting → Routes to **ORACLE** (Operational Analytics)
- **service_advisor** - General recommendations, gateway intake → Routes to **OTTO** (Gateway & Intake)

---

## Agent Execution

- **Parallel execution** - All agents run simultaneously for speed
- **3-second timeout** - Each agent has 3s timeout, continues with others if one fails
- **Graceful degradation** - If some agents fail, response still works with remaining agents
- **Error handling** - Failed agents are logged but don't block response

---

## Response Synthesis

OTTO synthesizes responses by:

1. Extracting key points from each agent's decision
2. Prioritizing primary agent's insights
3. Adding context from secondary agents
4. Building coherent unified text
5. Calculating quality scores

**User sees:** One coherent response from "The Edge AI"  
**We see:** Which agents contributed, their responses, quality metrics

---

## Performance Targets

- **Response time:** < 3 seconds for 95% of queries
- **Agent timeout:** 3 seconds per agent
- **Parallel execution:** All agents start simultaneously
- **Success rate:** > 90% of orchestrations succeed

---

## Logging

Every orchestration is logged to Supabase `otto_orchestrations` table:

- User message and context
- Detected intents and confidence scores
- Agents consulted and their responses
- Synthesized response and quality score
- Execution time and metadata

Agent performance metrics are tracked in `agent_performance_metrics`:
- Response times per agent
- Success/error rates
- Usage patterns

---

## n8n Integration

See `docs/n8n-workflow-otto-orchestration.md` for complete n8n workflow setup.

**Quick version:** Use a single HTTP Request node calling `/api/edge-ai/query`

---

## Next Steps

1. ✅ Database schema created
2. ✅ Orchestration logic implemented
3. ✅ API endpoint created
4. ✅ Test script created
5. ⏳ **Run database migration in Supabase**
6. ⏳ **Test with real queries**
7. ⏳ **Build n8n workflow**
8. ⏳ **Add Slack notifications to #squad-live**
9. ⏳ **Monitor performance and refine synthesis logic**

---

## Notes

- **Agent availability:** Some agents mentioned in the manifesto (REX, NOVA, VAL) are not yet implemented. Using OTTO as placeholder where needed.
- **Error handling:** Orchestration gracefully handles agent failures - partial responses are still returned.
- **Internal vs External:** The `_internal` metadata in responses is for debugging/logging, not shown to users.

---

## Reference

See `THE_EDGE_AI_TECHNICAL_MANIFESTO.md` in the repository root for the complete strategic architecture.









