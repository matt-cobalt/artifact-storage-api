# OTTO Edge AI Orchestration System - Technical Documentation

**Version:** 1.0  
**Date:** December 17, 2024  
**Author:** Cursor Console #2  
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Intent Classification](#intent-classification)
4. [Agent Routing Logic](#agent-routing-logic)
5. [Response Synthesis](#response-synthesis)
6. [Database Schema](#database-schema)
7. [n8n Workflow Structure](#n8n-workflow-structure)
8. [Error Handling](#error-handling)
9. [Monitoring & Analytics](#monitoring--analytics)
10. [Testing Procedures](#testing-procedures)

---

## Overview

### What OTTO Does

OTTO (Orchestrator) is the intelligent routing and coordination layer that powers "The Edge AI" - the unified AI assistant interface. OTTO receives user messages, classifies their intent, routes them to the appropriate Squad agents (one or more of 13 specialized agents), coordinates parallel execution, and synthesizes their responses into a single coherent answer branded as "The Edge AI."

**Key Function:**
- Receives user messages from POS, Slack, or API
- Classifies intent using pattern matching
- Routes to 1-5 specialized Squad agents in parallel
- Synthesizes agent responses into unified output
- Returns single "Edge AI" response to user
- Logs all orchestration events for analytics

### Why It Exists

OTTO exists to provide a **unified, simple interface** that hides the complexity of a multi-agent system. Users interact with "The Edge AI" - a single intelligent assistant - but behind the scenes, 13 specialized agents work together to provide comprehensive answers.

**Strategic Benefits:**
- **User Experience:** Simple, unified interface - no complexity exposed
- **Competitive Advantage:** Competitors see "one AI" but it's actually 13 coordinated agents
- **Maintainability:** Specialized agents can be improved independently
- **Scalability:** New agents can be added without changing user interface
- **Performance:** Parallel execution means faster responses

### How It Works

The orchestration process follows these steps:

```
1. User Message Received
   ↓
2. Intent Classification (pattern matching on message text)
   ↓
3. Agent Routing (determines which Squad agents to consult)
   ↓
4. Parallel Agent Execution (all agents execute simultaneously, 3s timeout each)
   ↓
5. Response Collection (gather all agent responses, handle timeouts/errors)
   ↓
6. Response Synthesis (combine insights into coherent unified text)
   ↓
7. Quality Scoring (calculate confidence and quality metrics)
   ↓
8. Logging (save to Supabase for analytics)
   ↓
9. Return Unified Response (user sees "The Edge AI" answer)
```

---

## Architecture Diagram

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                            │
│              "The Edge AI" Chat Interface                    │
│         (POS, Slack, API, n8n Webhook)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ POST /api/edge-ai/query
                         │ {message, context}
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              OTTO ORCHESTRATION LAYER                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. Intent Classifier                               │   │
│  │     - Pattern matching on message                   │   │
│  │     - Detects: pricing, diagnostics, scheduling...  │   │
│  │     - Returns: intents + confidence scores          │   │
│  └───────────────────┬─────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼─────────────────────────────────┐   │
│  │  2. Agent Router                                    │   │
│  │     - Maps intents → agents                         │   │
│  │     - Determines primary + supporting agents        │   │
│  │     - Adds ROY for business context (if 2+ agents)  │   │
│  └───────────────────┬─────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼─────────────────────────────────┐   │
│  │  3. Parallel Execution Coordinator                  │   │
│  │     - Executes all agents simultaneously            │   │
│  │     - 3-second timeout per agent                    │   │
│  │     - Handles failures gracefully                   │   │
│  └───────┬───────────┬───────────┬───────────────────┘   │
│          │           │           │                          │
└──────────┼───────────┼───────────┼──────────────────────────┘
           │           │           │
           ↓           ↓           ↓
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │   CAL    │ │  MILES   │ │   ROY    │  ... (up to 5 agents)
    │ (pricing)│ │(retention)│ │(business)│
    └────┬─────┘ └────┬─────┘ └────┬─────┘
         │            │            │
         └────────────┼────────────┘
                      │
                      │ Agent Responses
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Response Synthesizer                                    │
│     - Extracts key points from each agent                   │
│     - Combines into coherent unified text                   │
│     - Calculates quality and confidence scores              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ Unified Response
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Logging & Analytics                                     │
│     - Save to otto_orchestrations table                     │
│     - Record agent performance metrics                      │
│     - Track errors (if any)                                 │
└─────────────────────────────────────────────────────────────┘
                    │
                    ↓
         Return to User as "The Edge AI"
```

### 13 Squad Agents Mapped to Intents

```
Intent         → Agent(s)        → Purpose
───────────────────────────────────────────────────────────────
diagnostics    → DEX             → Diagnostics Triage
pricing        → CAL             → Pricing & Estimates
scheduling     → FLO             → Operations Orchestration
production     → MAC             → Production Manager
parts          → KIT             → Parts & Inventory
vehicle        → VIN             → Vehicle Intelligence
retention      → MILES           → Customer Retention
business_intel → ROY             → Business Intelligence
financial      → PENNYP          → Financial Operations
marketing      → BLAZE           → Marketing Intelligence
compliance     → LANCE           → Compliance & Fraud Prevention
analytics      → ORACLE          → Operational Analytics
service_advisor→ OTTO            → Gateway & Intake (fallback)
```

### Decision Tree for Routing Logic

```
User Message Received
│
├─ Intent Classification
│  │
│  ├─ Single Intent Detected?
│  │  └─ Yes → Route to Primary Agent Only
│  │
│  └─ Multiple Intents Detected?
│     └─ Yes → Route to All Relevant Agents
│              ├─ Primary Intent → Primary Agent
│              ├─ Supporting Intents → Supporting Agents
│              └─ If 2+ agents → Add ROY for business context
│
├─ No Clear Intent?
│  └─ Yes → Route to OTTO (Gateway & Intake)
│
└─ Execute Agents in Parallel
   ├─ All Agents Respond Successfully?
   │  └─ Yes → Full Synthesis
   │
   ├─ Some Agents Timeout/Fail?
   │  └─ Yes → Partial Synthesis (use successful agents)
   │
   └─ All Agents Fail?
      └─ Yes → Fallback Response
```

---

## Intent Classification

### Complete Intent List

OTTO classifies user messages into 13 intent categories. Each intent maps to one or more Squad agents.

| Intent | Agent | Regex Pattern | Example Queries |
|--------|-------|---------------|-----------------|
| **diagnostics** | DEX | `/(?:diagnos\|symptom\|trouble.*code\|check.*engine\|scan\|dtc\|warning.*light\|engine.*light\|rough.*idle\|transmission.*problem)/i` | "Check engine light is on", "Car runs rough", "DTC code P0301" |
| **pricing** | CAL | `/(?:price\|cost\|estimate\|quote\|how.*much\|approval.*prob\|convert\|pricing\|budget\|charge\|fee)/i` | "What's the approval probability on this $500 job?", "How much for brake pads?" |
| **scheduling** | FLO | `/(?:schedule\|appointment\|book\|dispatch\|when.*can\|available\|workflow\|coordinate\|time.*slot\|when.*will)/i` | "Schedule oil change for tomorrow", "When can we book this?" |
| **production** | MAC | `/(?:shop.*floor\|tech.*assign\|wrench.*time\|production\|work.*order\|bay.*status\|tech.*busy\|bay.*available)/i` | "Which tech should handle this?", "Bay 3 status?" |
| **parts** | KIT | `/(?:part\|inventory\|stock\|order.*part\|supplier\|availability\|parts.*price\|need.*part\|part.*in.*stock)/i` | "Do we have brake pads in stock?", "Order front rotors" |
| **vehicle** | VIN | `/(?:vin\|vehicle.*history\|service.*record\|recall\|maintenance.*schedule\|specific.*to.*vehicle\|make.*model.*year)/i` | "What's the service history for this VIN?", "Any recalls?" |
| **retention** | MILES | `/(?:customer.*return\|churn\|loyalty\|follow.*up\|next.*visit\|win.*back\|retention\|coming.*back\|last.*visit)/i` | "Customer hasn't been back in 6 months", "Win-back strategy?" |
| **business_intel** | ROY | `/(?:kpi\|performance\|coaching\|daily.*report\|business.*metric\|how.*doing\|dashboard\|metrics)/i` | "How are we doing today?", "Daily KPIs?" |
| **financial** | PENNYP | `/(?:invoice\|payment\|quickbooks\|billing\|collection\|accounts.*receivable\|paid\|outstanding\|balance)/i` | "Invoice status?", "Outstanding balance?" |
| **marketing** | BLAZE | `/(?:marketing\|campaign\|promotion\|lead\|acquisition\|advertising\|customer.*acquisition\|mailing\|email.*campaign)/i` | "Marketing campaign ideas?", "New customer acquisition?" |
| **compliance** | LANCE | `/(?:fraud\|warranty.*abuse\|compliant\|regulation\|liability\|verify\|suspicious\|fraudulent\|warranty.*claim)/i` | "This seems suspicious", "Fraud check?" |
| **analytics** | ORACLE | `/(?:analyze\|pattern\|trend\|forecast\|real.*time\|operational.*data\|reporting\|data.*analysis\|insights)/i` | "Trend analysis?", "Forecast next month?" |
| **service_advisor** | OTTO | `/(?:recommend\|suggest\|should\|advice\|what\|help\|need\|service\|maintenance\|what.*should\|what.*do)/i` | "What should I recommend?", "Help with customer?" |

### Classification Confidence

Confidence scores are calculated based on:
1. **Keyword Match Count:** More keywords = higher confidence
2. **Pattern Strength:** Stronger patterns (exact matches) = higher confidence
3. **Multi-Intent Detection:** Multiple intents can be detected simultaneously

**Confidence Calculation:**
```javascript
confidence = 0.5 + (keywordCount * 0.15)
// Capped at 0.95 maximum
```

**Example:**
- Message: "What's the approval probability on this $500 brake job?"
- Detected: `pricing: true` (3 keywords: "approval", "probability", "$500")
- Confidence: `0.5 + (3 * 0.15) = 0.95`

---

## Agent Routing Logic

### Single-Agent Requests

When a message matches a single intent, OTTO routes to the primary agent only:

**Example:**
```
Input: "What's the approval probability on this $500 estimate?"
Intent: pricing
Route: CAL only
Execution: CAL.execute(input, context)
Result: CAL's response synthesized directly
```

### Multi-Agent Coordination

When a message matches multiple intents, OTTO routes to all relevant agents:

**Example:**
```
Input: "Customer wants brake quote, they haven't visited in a while"
Intents: pricing, retention
Route: CAL (primary) + MILES (supporting)
Execution: Both execute in parallel
Result: CAL pricing insights + MILES retention strategy → synthesized
```

**Special Rule - Business Context:**
When 2+ agents are consulted, OTTO automatically adds ROY (Business Intelligence) as a background agent to provide business context.

**Example:**
```
Input: "Schedule transmission service, need parts ordered and bay assigned"
Intents: scheduling, parts, production
Route: FLO (primary) + KIT (supporting) + MAC (supporting) + ROY (background)
Execution: All 4 execute in parallel
Result: Coordinated response with business insights
```

### Parallel vs Sequential Execution

**Always Parallel:**
- All agents execute simultaneously
- No waiting for one agent before starting another
- Maximum response time = slowest agent (up to 3s timeout)

**Why Parallel?**
- **Speed:** 3 agents in parallel = ~3 seconds total
- **Efficiency:** No idle time waiting
- **User Experience:** Faster responses

**Example Timeline:**
```
Time 0ms:    CAL, MILES, ROY all start simultaneously
Time 487ms:  CAL finishes
Time 523ms:  MILES finishes
Time 1247ms: ROY finishes
Time 1247ms: Synthesis begins (after slowest agent)
Time 1321ms: Unified response ready
```

### Timeout Handling

Each agent has a **3-second timeout**. If an agent doesn't respond within 3 seconds:

1. **Agent marked as "timeout"**
2. **Other agents continue** (don't wait)
3. **Synthesis proceeds** with successful agents only
4. **Error logged** for monitoring
5. **User gets response** without that agent's input

**Timeout Behavior:**
```javascript
Promise.race([
  agent.execute(input, context),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('timeout')), 3000)
  )
])
```

**Example:**
```
Agents: CAL, MILES, ROY
CAL: responds in 487ms ✅
MILES: responds in 523ms ✅
ROY: times out after 3000ms ❌
Result: Synthesis uses CAL + MILES only, notes ROY timeout
```

---

## Response Synthesis

### How Multiple Agent Responses Combine

The synthesis process follows these steps:

1. **Extract Key Points** from each agent's decision
2. **Prioritize Primary Agent** insights
3. **Add Supporting Agent** insights as context
4. **Build Coherent Text** that flows naturally
5. **Calculate Quality Score** based on success rate and confidence

**Synthesis Algorithm:**
```javascript
1. Primary Agent (first in route order)
   → Extract 2 key points
   → Use as opening of unified response

2. Supporting Agents (remaining successful agents)
   → Extract 1 key point each
   → Add as "Additionally..." context

3. Combine into single paragraph
   → Ensure natural flow
   → Add appropriate punctuation
```

**Example Synthesis:**

**Input Query:**
"What's the approval probability on this $500 brake job?"

**Agent Responses:**
- CAL: "87% approval probability. Pricing is competitive."
- MILES: "Customer has 92% approval history. Low churn risk."
- ROY: "Business metrics trending positive."

**Synthesized Output:**
"87% approval probability. Pricing is competitive. Additionally, this customer has 92% approval history with low churn risk."

### Quality Scoring Mechanism

Quality score (0.0 - 1.0) calculated from:

1. **Success Rate** (30%): `successfulAgents / totalAgents`
2. **Speed Contribution** (20%): Faster execution = higher score
3. **Confidence Average** (20%): Average confidence from all agents
4. **Base Score** (30%): Always included

**Formula:**
```javascript
qualityScore = Math.min(
  0.3 + // Base score
  (successfulAgents / totalAgents) * 0.3 + // Success rate
  Math.max(0, 1 - (avgExecutionTime / 3000)) * 0.2 + // Speed
  avgConfidence * 0.2, // Confidence
  1.0 // Cap at 1.0
)
```

**Example:**
- 3 agents, 2 succeed, avg time 1247ms, avg confidence 0.87
- Quality: `0.3 + (2/3 * 0.3) + (1 - 1247/3000) * 0.2 + 0.87 * 0.2 = 0.85`

### Fallback Behavior

**Scenario 1: Some Agents Fail**
- Continue with successful agents
- Log failed agents for monitoring
- Return partial synthesis

**Scenario 2: All Agents Fail**
- Return fallback message: "I'm having trouble processing that right now. Let me connect you with a team member who can help."
- Log error for investigation
- Still return 200 status (don't fail the request)

**Scenario 3: Synthesis Logic Fails**
- Return best single-agent response
- Log synthesis error
- Include fallback flag in response

### Confidence Calculation

Overall confidence = average of all successful agent confidences

```javascript
confidence = successfulAgents
  .map(agent => agent.decision.confidence || 0.7)
  .reduce((sum, conf) => sum + conf, 0) / successfulAgents.length
```

---

## Database Schema

### otto_orchestrations Table

Logs every orchestration event.

```sql
CREATE TABLE otto_orchestrations (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Request Context
  user_message TEXT NOT NULL,
  user_id TEXT,
  ro_number TEXT,
  shop_id TEXT,
  
  -- Intent Classification
  intents_detected JSONB NOT NULL DEFAULT '{}',
  primary_intent TEXT,
  confidence_scores JSONB,
  confidence_score NUMERIC(3,2),
  
  -- Agent Routing
  agents_consulted TEXT[] NOT NULL DEFAULT '{}',
  agents_timed_out TEXT[] DEFAULT '{}',
  agents_errored TEXT[] DEFAULT '{}',
  coordination_strategy TEXT DEFAULT 'parallel',
  parallel_execution BOOLEAN DEFAULT true,
  
  -- Agent Responses
  agent_responses JSONB NOT NULL DEFAULT '[]',
  execution_time_ms INTEGER,
  
  -- Synthesized Output
  unified_response TEXT NOT NULL,
  synthesis_quality NUMERIC(3,2),
  response_quality_score NUMERIC(3,2),
  fallback_used BOOLEAN DEFAULT false,
  
  -- Additional Context
  context JSONB DEFAULT '{}',
  
  -- Metadata
  source TEXT, -- 'pos_ui', 'n8n_webhook', 'api_direct', etc.
  session_id TEXT
);
```

**Key Fields:**
- `agents_consulted`: Array of agent IDs that were called
- `agent_responses`: Full JSON responses from each agent
- `unified_response`: Final synthesized text shown to user
- `synthesis_quality`: Quality score (0-1)

### agent_performance_metrics Table

Tracks individual agent performance over time.

```sql
CREATE TABLE agent_performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  agent_name TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'response_time_ms', 'success_rate', 'confidence'
  metric_value NUMERIC NOT NULL,
  
  context JSONB DEFAULT '{}',
  orchestration_id BIGINT REFERENCES otto_orchestrations(id),
  
  shop_id TEXT,
  session_id TEXT
);
```

**Metric Types:**
- `response_time_ms`: How long agent took to respond
- `success_count`: Increment on success
- `error_count`: Increment on error/timeout
- `confidence`: Agent's confidence score

### otto_errors Table

Tracks errors for debugging and monitoring.

```sql
CREATE TABLE otto_errors (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  
  error_type TEXT NOT NULL, -- 'timeout', 'agent_error', 'synthesis_error'
  error_message TEXT,
  agent_name TEXT,
  
  orchestration_id BIGINT REFERENCES otto_orchestrations(id),
  stack_trace TEXT,
  context JSONB DEFAULT '{}',
  
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);
```

**Error Types:**
- `timeout`: Agent exceeded 3-second timeout
- `agent_error`: Agent execution failed
- `synthesis_error`: Response synthesis failed
- `classification_error`: Intent classification failed
- `routing_error`: Agent routing failed

### Example Queries

**Recent Orchestrations:**
```sql
SELECT 
  id,
  created_at,
  user_message,
  agents_consulted,
  execution_time_ms,
  synthesis_quality,
  unified_response
FROM otto_orchestrations
ORDER BY created_at DESC
LIMIT 10;
```

**Agent Success Rates:**
```sql
SELECT 
  agent_name,
  SUM(CASE WHEN metric_type = 'success_count' THEN metric_value ELSE 0 END) as successes,
  SUM(CASE WHEN metric_type = 'error_count' THEN metric_value ELSE 0 END) as errors,
  ROUND(
    SUM(CASE WHEN metric_type = 'success_count' THEN metric_value ELSE 0 END)::NUMERIC /
    NULLIF(SUM(CASE WHEN metric_type IN ('success_count', 'error_count') THEN metric_value ELSE 0 END), 0) * 100,
    2
  ) as success_rate_pct
FROM agent_performance_metrics
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY agent_name
ORDER BY success_rate_pct DESC;
```

---

## n8n Workflow Structure

### Node-by-Node Breakdown

**Node 1: Webhook Trigger**
- **Type:** Webhook
- **Method:** POST
- **Path:** `edge-ai-query`
- **Settings:**
  - Response Mode: "Respond When Last Node Finishes"
  - Response Data: "All Incoming Items"

**Node 2: Intent Classifier (Code Node)**
- **Type:** Code
- **Language:** JavaScript
- **Mode:** Run Once for Each Item
- **Code:** Intent classification logic (see manifest)
- **Critical Setting:** Always Output Data = true

**Node 3: Agent Router (Code Node)**
- **Type:** Code
- **Language:** JavaScript
- **Mode:** Run Once for Each Item
- **Code:** Routing logic that creates one item per agent
- **Output:** Array of items (one per agent to consult)

**Node 4-N: HTTP Request Nodes (Parallel)**
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `http://localhost:3000/api/agents/{agentId}/execute`
- **Timeout:** 3000ms
- **Critical Settings:**
  - Continue On Fail = true (don't block other agents)
  - Always Output Data = true
- **Body:**
```json
{
  "input": {
    "message": "{{ $json.message }}",
    "customer_id": "{{ $json.context.customer_id }}"
  },
  "context": {
    "triggered_by": "otto_orchestration",
    "intent": "{{ $json.intent }}"
  }
}
```

**Node: Merge Responses**
- **Type:** Merge
- **Mode:** Merge All Items
- **Operation:** Append

**Node: Response Synthesizer (Code Node)**
- **Type:** Code
- **Language:** JavaScript
- **Mode:** Run Once for All Items
- **Code:** Synthesis logic

**Node: Log to Supabase**
- **Type:** Supabase Insert
- **Table:** `otto_orchestrations`
- **Settings:**
  - Continue On Fail = true (don't block response)

**Node: Respond to Webhook**
- **Type:** Respond to Webhook
- **Response Code:** 200
- **Response Body:**
```json
{
  "success": true,
  "response": "{{ $json.response }}",
  "confidence": {{ $json.confidence }},
  "execution_time_ms": {{ $json.execution_time_ms }}
}
```

### Critical Settings

1. **Continue On Fail = true** on all HTTP Request nodes (so one failure doesn't block others)
2. **Timeout = 3000ms** on all HTTP Request nodes
3. **Always Output Data = true** on Code nodes to prevent workflow failures
4. **Parallel Execution:** HTTP Request nodes execute in parallel if at same level

---

## Error Handling

### Timeout Scenarios

**Single Agent Timeout:**
- Agent marked as "timeout" in logs
- Other agents continue normally
- Synthesis proceeds with remaining agents
- User receives response (may be partial)

**Multiple Agent Timeouts:**
- All timed-out agents logged
- Successful agents used for synthesis
- If all timeout → fallback response

**Recovery:**
- No automatic retry (would slow system)
- Errors logged for investigation
- Monitoring alerts if timeout rate > 10%

### Agent Failure Scenarios

**Agent Returns Error:**
- Error captured in response
- Agent marked as "error" in logs
- Other agents continue
- Synthesis proceeds with successful agents

**Agent API Unavailable:**
- Network error logged
- Agent marked as "error"
- Fallback to other agents or general response

**Recovery:**
- System continues (graceful degradation)
- Errors logged for ops team
- Monitoring dashboard alerts

### Synthesis Failure Scenarios

**Synthesis Logic Error:**
- Catches exception
- Returns best single-agent response
- Logs synthesis error
- Sets fallback_used = true

**Empty Agent Responses:**
- Checks for empty responses
- Uses fallback message if all empty
- Logs warning

**Recovery:**
- Always returns some response (never fails request)
- Errors logged for debugging
- Fallback responses are user-friendly

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Response Time**
   - Target: < 3 seconds for 95% of requests
   - Alert if: avg > 3.5 seconds over 1 hour

2. **Success Rate**
   - Target: > 95% successful orchestrations
   - Alert if: success rate < 90% over 1 hour

3. **Agent Timeout Rate**
   - Target: < 5% timeouts per agent
   - Alert if: timeout rate > 10% for any agent

4. **Synthesis Quality**
   - Target: > 0.85 average quality score
   - Alert if: quality < 0.75 over 1 hour

5. **Agent Utilization**
   - Track which agents are called most
   - Identify underutilized agents
   - Optimize routing if needed

### SQL Queries for Monitoring

See separate document: `OTTO_Monitoring_SQL_Queries.md`

---

## Testing Procedures

### How to Test Single-Agent Routing

1. **Send test message** targeting specific intent
2. **Verify** only expected agent is consulted
3. **Check** response quality and relevance
4. **Confirm** no other agents called unnecessarily

**Example:**
```bash
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the approval probability on this $500 estimate?",
    "context": {"customer_id": "test_001"}
  }'
```

**Expected:**
- `agents_consulted: ["cal"]`
- Response includes approval percentage
- Execution time < 3 seconds

### How to Test Multi-Agent Coordination

1. **Send message** with multiple intents
2. **Verify** all relevant agents are called
3. **Check** responses are synthesized correctly
4. **Confirm** parallel execution (time should be ~max(agent_times), not sum)

**Example:**
```bash
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Customer wants brake quote, they haven'\''t visited in 6 months",
    "context": {"customer_id": "test_001"}
  }'
```

**Expected:**
- `agents_consulted: ["cal", "miles"]` (and possibly "roy")
- Response includes both pricing and retention insights
- Execution time < 3 seconds (parallel)

### How to Simulate Failures

**Simulate Agent Timeout:**
- Modify agent to sleep > 3 seconds
- Send request
- Verify other agents still complete
- Check timeout logged correctly

**Simulate Agent Error:**
- Modify agent to throw error
- Send request
- Verify graceful degradation
- Check error logged

**Simulate All Failures:**
- Disable all agents
- Send request
- Verify fallback response delivered
- Check user gets helpful message

### Expected Results for Each Test

See separate document: `OTTO_Test_Suite.md`

---

## Conclusion

The OTTO Orchestration System provides a robust, scalable foundation for "The Edge AI" unified interface. By coordinating 13 specialized Squad agents behind a simple user interface, it delivers comprehensive intelligence while maintaining simplicity for end users.

**Key Strengths:**
- Parallel execution for speed
- Graceful error handling
- Comprehensive logging and monitoring
- Flexible routing based on intent
- Quality synthesis of multiple responses

**Maintenance Notes:**
- Monitor timeout rates and adjust if needed
- Review synthesis quality scores regularly
- Add new agents by updating AGENT_INTENT_MAP
- Refine intent patterns based on user queries

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2024  
**Maintained By:** Cursor Console #2









