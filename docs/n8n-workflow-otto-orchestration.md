# n8n Workflow: OTTO - Edge AI Orchestrator

**Purpose:** Route user messages to Squad agents and synthesize unified responses branded as "The Edge AI"

**Status:** Ready for implementation  
**Last Updated:** December 17, 2024

---

## Workflow Overview

```
User Message → OTTO Classifier → Agent Router → Parallel Agent Execution → 
Response Synthesizer → Supabase Logging → Unified Response
```

---

## Node-by-Node Setup

### Node 1: Webhook Trigger

**Type:** Webhook  
**Settings:**
- **HTTP Method:** POST
- **Path:** `edge-ai-query`
- **Response Mode:** "Respond When Last Node Finishes"

**Output Example:**
```json
{
  "body": {
    "message": "What's the approval probability on this $500 brake job?",
    "context": {
      "customer_id": "cust_001",
      "ro_number": "RO-2024-523",
      "shop_id": "shop_001"
    }
  }
}
```

---

### Node 2: Intent Classifier (Code Node)

**Type:** Code  
**Language:** JavaScript  
**Code:**

```javascript
// Extract message from webhook
const message = $input.item.json.body.message || $input.item.json.body.message || '';
const context = $input.item.json.body.context || {};

// Intent classification patterns
const messageLower = message.toLowerCase();

const intents = {
  pricing: /(?:price|cost|estimate|charge|quote|how much|pricing|budget)/i.test(message),
  workflow: /(?:schedule|when|time|ready|complete|status|timeline|duration|when will|how long)/i.test(message),
  retention: /(?:customer|return|last.*visit|churn|retention|loyalty|coming back|come back)/i.test(message),
  communication: /(?:text|email|call|message|reach|contact|notify|send|sms)/i.test(message),
  intelligence: /(?:history|prefer|usual|always|never|typically|usually|preference|like|dislike)/i.test(message),
  diagnostics: /(?:diagnostic|dtc|check engine|code|symptom|trouble|problem|issue)/i.test(message),
  service_advisor: /(?:recommend|suggest|should|advice|what|help|need|service|maintenance)/i.test(message)
};

// Calculate confidence scores
const confidenceScores = {};
Object.keys(intents).forEach(intent => {
  if (intents[intent]) {
    const keywordCount = (messageLower.match(new RegExp(getKeywordRegex(intent), 'gi')) || []).length;
    confidenceScores[intent] = Math.min(0.5 + (keywordCount * 0.15), 0.95);
  } else {
    confidenceScores[intent] = 0.0;
  }
});

function getKeywordRegex(intent) {
  const patterns = {
    pricing: '(?:price|cost|estimate|charge|quote|pricing|budget|how much)',
    workflow: '(?:schedule|when|time|ready|complete|status|timeline|duration|how long)',
    retention: '(?:customer|return|visit|churn|retention|loyalty|coming back)',
    communication: '(?:text|email|call|message|reach|contact|notify|send|sms)',
    intelligence: '(?:history|prefer|usual|always|never|typically|preference|like|dislike)',
    diagnostics: '(?:diagnostic|dtc|check engine|code|symptom|trouble|problem|issue)',
    service_advisor: '(?:recommend|suggest|should|advice|what|help|need|service|maintenance)'
  };
  return patterns[intent] || '';
}

const detectedIntents = Object.keys(intents).filter(key => intents[key]);
const overallConfidence = detectedIntents.length > 0
  ? detectedIntents.reduce((sum, intent) => sum + confidenceScores[intent], 0) / detectedIntents.length
  : 0.5;

const primaryIntent = detectedIntents[0] || 'service_advisor';

// Determine which agents to route to
const agentsToConsult = [];
const agentSet = new Set();

const AGENT_INTENT_MAP = {
  pricing: ['cal'],
  workflow: ['roy'],
  retention: ['miles'],
  communication: ['otto'],
  intelligence: ['otto'],
  diagnostics: ['dex'],
  service_advisor: ['otto']
};

Object.keys(intents).forEach(intent => {
  if (intents[intent] && AGENT_INTENT_MAP[intent]) {
    AGENT_INTENT_MAP[intent].forEach(agentId => {
      if (!agentSet.has(agentId)) {
        agentSet.add(agentId);
        agentsToConsult.push({
          agentId,
          intent,
          is_primary: intent === primaryIntent
        });
      }
    });
  }
});

// Fallback to OTTO if no agents selected
if (agentsToConsult.length === 0) {
  agentsToConsult.push({
    agentId: 'otto',
    intent: 'service_advisor',
    is_primary: true
  });
}

return [{
  json: {
    message,
    context,
    classification: {
      intents,
      confidenceScores,
      overallConfidence,
      primaryIntent,
      detectedCount: detectedIntents.length
    },
    agentsToConsult,
    originalBody: $input.item.json.body
  }
}];
```

**Output:**
```json
{
  "message": "...",
  "context": {...},
  "classification": {
    "intents": {...},
    "confidenceScores": {...},
    "overallConfidence": 0.85,
    "primaryIntent": "pricing",
    "detectedCount": 2
  },
  "agentsToConsult": [
    {"agentId": "cal", "intent": "pricing", "is_primary": true},
    {"agentId": "miles", "intent": "retention", "is_primary": false}
  ]
}
```

---

### Node 3: Switch Node (Route to Agents)

**Type:** Switch  
**Mode:** "Rules"

**Rules:**
Create one rule per agent. For each agent in `agentsToConsult`, create a condition that checks if that agent is in the array.

**Example Rule for CAL:**
- **Value 1:** `{{ $json.agentsToConsult }}`
- **Operation:** "Contains"
- **Value 2:** `"agentId": "cal"`

**Problem:** Switch node in n8n doesn't handle parallel branches well for dynamic agent routing.

**Better Approach:** Use Code Node to split into multiple items, one per agent, then use a Split In Batches node, or use HTTP Request nodes in parallel with IF conditions.

---

### Alternative: Code Node for Agent Routing (Recommended)

**Type:** Code  
**Language:** JavaScript  
**Code:**

```javascript
// This node creates one output item per agent that needs to be consulted
const agentsToConsult = $input.item.json.agentsToConsult || [];
const message = $input.item.json.message;
const context = $input.item.json.context;

const agentItems = agentsToConsult.map(agent => ({
  json: {
    agentId: agent.agentId,
    intent: agent.intent,
    is_primary: agent.is_primary,
    message,
    context,
    classification: $input.item.json.classification,
    originalContext: $input.item.json.context
  }
}));

return agentItems;
```

**Output:** One item per agent (e.g., if CAL and MILES, outputs 2 items)

---

### Node 4-N: HTTP Request Nodes (One Per Agent - Executed in Parallel)

For each agent (CAL, MILES, OTTO, DEX, ROY), create an HTTP Request node that:
- Only executes if that agent is in `agentsToConsult`
- Calls the agent's execute endpoint
- Has a 3-second timeout

**Type:** HTTP Request  
**Method:** POST  
**URL:** `http://localhost:3000/api/agents/{{ $json.agentId }}/execute`  
**Authentication:** None (or API key if needed)  
**Body Content Type:** JSON  
**Body:**

```json
{
  "input": {
    "message": "{{ $json.message }}",
    "customer_id": "{{ $json.context.customer_id }}",
    "ro_number": "{{ $json.context.ro_number }}",
    "triggered_by": "otto_orchestration",
    "orchestration_intent": "{{ $json.intent }}"
  },
  "context": {
    "triggered_by": "otto_orchestration",
    "is_primary": {{ $json.is_primary }},
    "shop_id": "{{ $json.context.shop_id }}"
  }
}
```

**Options:**
- **Timeout:** 3000ms (3 seconds)
- **Ignore SSL Issues:** (if using localhost)

**Error Handling:**
In n8n, set "Continue On Fail" to `true` so other agents can still complete even if one fails.

---

### Node: Merge Agent Responses (Code Node)

**Type:** Code  
**Language:** JavaScript  
**Mode:** "Run Once for All Items"

**Code:**

```javascript
// Collect all agent responses
const items = $input.all();
const agentResults = items.map(item => ({
  agent: item.json.agentId || item.json.agent || 'unknown',
  status: item.json.success ? 'success' : 'error',
  decision: item.json.decision || null,
  execution_time_ms: item.json.execution_time_ms || 0,
  error: item.json.error || null,
  artifact_id: item.json.artifact_id || null
}));

// Extract original message and context from first item
const firstItem = items[0];
const message = firstItem.json.message || firstItem.json.originalContext?.message || '';
const context = firstItem.json.originalContext || firstItem.json.context || {};
const classification = firstItem.json.classification || {};

// Synthesize responses
const successfulAgents = agentResults.filter(r => r.status === 'success');
const failedAgents = agentResults.filter(r => r.status === 'error');

let unifiedText = '';
let avgConfidence = 0.5;

if (successfulAgents.length > 0) {
  // Extract key insights
  const insights = successfulAgents.map(result => {
    const decision = result.decision || {};
    return {
      agent: result.agent,
      key_points: extractKeyPoints(decision, result.agent),
      confidence: decision.confidence || 0.7
    };
  });

  // Build unified text
  if (insights[0] && insights[0].key_points.length > 0) {
    unifiedText = insights[0].key_points.slice(0, 2).join('. ');
    
    if (insights.length > 1) {
      const additional = insights.slice(1)
        .flatMap(i => i.key_points.slice(0, 1))
        .filter(Boolean);
      if (additional.length > 0) {
        unifiedText += `. Additionally, ${additional.join('. ')}`;
      }
    }
  }

  // Calculate confidence
  avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
  
  if (!unifiedText) {
    unifiedText = successfulAgents[0].decision?.summary || 
                  successfulAgents[0].decision?.rationale || 
                  "I've analyzed your request and gathered relevant information.";
  }
} else {
  unifiedText = "I'm having trouble processing your request right now. Please try rephrasing or contact support.";
  avgConfidence = 0.3;
}

// Ensure text ends properly
if (unifiedText && !unifiedText.match(/[.!?]$/)) {
  unifiedText += '.';
}

return [{
  json: {
    success: successfulAgents.length > 0,
    response: unifiedText,
    confidence: avgConfidence,
    agents_consulted: agentResults.map(r => r.agent),
    agents_succeeded: successfulAgents.map(r => r.agent),
    agents_failed: failedAgents.map(r => r.agent),
    agent_results: agentResults,
    message,
    context,
    classification,
    execution_time_ms: Math.max(...agentResults.map(r => r.execution_time_ms), 0)
  }
}];

function extractKeyPoints(decision, agentId) {
  const points = [];
  
  switch (agentId) {
    case 'cal':
      if (decision.estimate_summary) points.push(decision.estimate_summary);
      if (decision.totals?.total) points.push(`Total: $${decision.totals.total.toFixed(2)}`);
      if (decision.pricing_position) points.push(`Pricing: ${decision.pricing_position.replace('_', ' ')}`);
      if (decision.talking_points) points.push(...decision.talking_points.slice(0, 2));
      break;
      
    case 'miles':
      if (decision.churn_risk?.level) points.push(`Churn risk: ${decision.churn_risk.level}`);
      if (decision.retention_plan?.recommended_actions) {
        points.push(...decision.retention_plan.recommended_actions.slice(0, 2));
      }
      break;
      
    case 'otto':
      if (decision.recommended_services) {
        decision.recommended_services.slice(0, 2).forEach(svc => {
          if (svc.service) points.push(`${svc.service}: ${svc.priority}`);
        });
      }
      break;
      
    default:
      if (decision.recommendations) points.push(...decision.recommendations.slice(0, 3));
      if (decision.summary) points.push(decision.summary);
  }
  
  return points.filter(Boolean);
}
```

---

### Node: Log to Supabase (Optional - Can be done in background)

**Type:** HTTP Request  
**Method:** POST  
**URL:** `{{ $env.SUPABASE_URL }}/rest/v1/otto_orchestrations`  
**Authentication:** Bearer Token  
**Token:** `{{ $env.SUPABASE_SERVICE_KEY }}`  
**Headers:**
- `apikey`: `{{ $env.SUPABASE_SERVICE_KEY }}`
- `Prefer`: `return=representation`

**Body:**

```json
{
  "user_message": "{{ $json.message }}",
  "user_id": "{{ $json.context.user_id }}",
  "ro_number": "{{ $json.context.ro_number }}",
  "shop_id": "{{ $json.context.shop_id }}",
  "intents_detected": {{ JSON.stringify($json.classification.intents) }},
  "confidence_score": {{ $json.classification.overallConfidence }},
  "agents_consulted": {{ JSON.stringify($json.agents_consulted) }},
  "parallel_execution": true,
  "agent_responses": {{ JSON.stringify($json.agent_results) }},
  "execution_time_ms": {{ $json.execution_time_ms }},
  "unified_response": "{{ $json.response }}",
  "response_quality_score": {{ $json.confidence }},
  "context": {{ JSON.stringify($json.context) }},
  "source": "n8n_webhook"
}
```

**Options:**
- **Continue On Fail:** `true` (don't block response if logging fails)

---

### Node: Respond to Webhook

**Type:** Respond to Webhook  
**Response Code:** 200

**Response Body:**

```json
{
  "success": {{ $json.success }},
  "response": "{{ $json.response }}",
  "confidence": {{ $json.confidence }},
  "execution_time_ms": {{ $json.execution_time_ms }}
}
```

---

## Simplified Approach (Using API Endpoint)

If the above workflow is too complex, you can use the `/api/edge-ai/query` endpoint directly:

### Single HTTP Request Node

**Type:** HTTP Request  
**Method:** POST  
**URL:** `http://localhost:3000/api/edge-ai/query`  
**Body:**

```json
{
  "message": "{{ $json.body.message }}",
  "context": {{ JSON.stringify($json.body.context || {}) }}
}
```

**Response:** Already unified, just pass through to webhook response.

---

## Testing the Workflow

1. **Test with simple pricing query:**
   ```json
   {
     "message": "What's the approval probability on this $500 brake job?",
     "context": {
       "customer_id": "cust_001",
       "ro_number": "RO-2024-523"
     }
   }
   ```

2. **Expected:** Routes to CAL (and possibly MILES for retention context)

3. **Verify:** Response is unified, not mentioning agent names

---

## Notes

- **Parallel Execution:** n8n executes HTTP Request nodes in parallel if they're at the same level in the workflow
- **Error Handling:** Set "Continue On Fail" on HTTP Request nodes so one failure doesn't block others
- **Timeouts:** Set 3-second timeout per agent HTTP request
- **Logging:** Supabase logging can be done asynchronously - don't block the response

---

## Next Steps

1. Build the workflow in n8n using the simplified API endpoint approach first
2. Test with various message types
3. Monitor execution times (should be < 3 seconds)
4. Add Slack notifications to #squad-live for internal visibility
5. Refine synthesis logic based on real responses









