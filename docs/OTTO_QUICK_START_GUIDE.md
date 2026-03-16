# OTTO Edge AI Orchestration - Quick Start Guide

**Version:** 1.0  
**Date:** December 17, 2024  
**Time to Complete:** 15-20 minutes

---

## Overview

This guide will get you up and running with the OTTO Edge AI Orchestration system in under 20 minutes. You'll learn how to send queries, understand responses, and monitor the system.

---

## Prerequisites

✅ API server running (`node src/artifact-storage/server.js`)  
✅ Environment variables set (`.env` file with SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY)  
✅ Database tables exist (artifacts, otto_orchestrations, etc.)

**Quick Check:**
```bash
# Verify API is running
curl http://localhost:3000/health

# Should return: {"status":"ok"} or similar
```

---

## Step 1: Your First Orchestration (2 minutes)

### Test the Edge AI Endpoint

```bash
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What should I recommend for a customer getting an oil change?",
    "context": {
      "customer_id": "test_customer_001",
      "shop_id": "test_shop_001"
    }
  }'
```

### Expected Response

```json
{
  "success": true,
  "response": "For an oil change, I recommend...",
  "confidence": 0.85,
  "execution_time_ms": 1247,
  "_metadata": {
    "agents_consulted": ["otto"],
    "quality_score": 0.89
  }
}
```

**What Happened:**
- Your message was classified (detected "service_advisor" intent)
- OTTO routed to the appropriate agent (OTTO - Gateway & Intake)
- Agent executed and returned a response
- OTTO synthesized the response into unified text
- You received "The Edge AI" response

---

## Step 2: Multi-Agent Orchestration (3 minutes)

### Test Multi-Agent Coordination

```bash
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What'\''s the approval probability on this $500 brake job? The customer hasn'\''t been in for a while.",
    "context": {
      "customer_id": "test_customer_002",
      "ro_number": "RO-TEST-001",
      "shop_id": "test_shop_001"
    }
  }'
```

### Expected Response

```json
{
  "success": true,
  "response": "87% approval probability. This price is competitive for your market, and this customer has approved 92% of similar estimates. Additionally, since they haven't been in for a while, consider a win-back follow-up strategy.",
  "confidence": 0.87,
  "execution_time_ms": 2156,
  "_metadata": {
    "agents_consulted": ["cal", "miles", "roy"],
    "quality_score": 0.91
  }
}
```

**What Happened:**
- Multiple intents detected: `pricing` + `retention`
- OTTO routed to: CAL (pricing), MILES (retention), ROY (business context)
- All agents executed in parallel (~2 seconds total, not 6+)
- Responses synthesized into coherent unified answer
- You see one response, but 3 agents contributed

---

## Step 3: Explore Agent Capabilities (5 minutes)

### Test Different Intent Types

Try these queries to see different agents in action:

#### Pricing Query (CAL)
```bash
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{"message": "How much should I charge for brake pads?"}'
```
**Expected Agent:** CAL

#### Diagnostics Query (DEX)
```bash
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Check engine light is on, car runs rough"}'
```
**Expected Agent:** DEX

#### Scheduling Query (FLO)
```bash
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Schedule oil change for tomorrow at 10am"}'
```
**Expected Agent:** FLO

#### Retention Query (MILES)
```bash
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Customer hasn'\''t been back in 6 months"}'
```
**Expected Agent:** MILES

### View Which Agents Were Consulted

Check the `_metadata.agents_consulted` field in each response to see which agents contributed.

---

## Step 4: Monitor Your Orchestrations (3 minutes)

### View Recent Orchestrations

```sql
-- Run in Supabase SQL Editor
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

### Check Performance Metrics

```sql
-- Average response time over last hour
SELECT 
  AVG(execution_time_ms) as avg_response_time_ms,
  COUNT(*) as total_requests,
  AVG(synthesis_quality) as avg_quality
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### View Agent Utilization

```sql
-- Which agents are being called most?
SELECT 
  unnest(agents_consulted) as agent_name,
  COUNT(*) as call_count
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agent_name
ORDER BY call_count DESC;
```

---

## Step 5: Run Health Check (2 minutes)

### Execute Health Check Script

```bash
node src/scripts/otto-system-health-check.js
```

**Expected Output:**
```
✅ Database: HEALTHY
✅ Orchestration: HEALTHY
✅ Agents: HEALTHY
✅ API: HEALTHY
✅ Performance: HEALTHY

🎉 SYSTEM STATUS: ALL SYSTEMS HEALTHY
```

**If you see warnings:**
- Review the health check output for specific issues
- Check the Troubleshooting Guide for solutions
- Most warnings are non-critical

---

## Step 6: Understand Intent Classification (3 minutes)

### How OTTO Classifies Your Messages

OTTO uses pattern matching to detect intent. Here are the patterns:

| Intent | Keywords | Routes To |
|--------|----------|-----------|
| `pricing` | price, cost, estimate, quote, approval probability | CAL |
| `diagnostics` | check engine, DTC, symptom, diagnostic | DEX |
| `scheduling` | schedule, appointment, book, when | FLO |
| `retention` | customer return, churn, loyalty, follow-up | MILES |
| `service_advisor` | recommend, suggest, help, what should | OTTO |

### Test Intent Detection

Try varying your message to see how intent detection works:

```bash
# This should route to CAL
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{"message": "What'\''s the approval probability?"}'

# This should also route to CAL (different wording)
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{"message": "How much should this cost?"}'
```

Both should route to CAL because they match the `pricing` intent pattern.

---

## Step 7: Handle Errors Gracefully (2 minutes)

### Test Error Handling

The system is designed to handle failures gracefully:

```bash
# Even if some agents fail, you'll get a response
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Test query with invalid context"}'
```

**Expected Behavior:**
- System attempts to route and execute agents
- If agents fail, you get a fallback response (not an error)
- Request completes successfully (200 status)
- Errors are logged for investigation

### Check Error Logs

```sql
-- View recent errors
SELECT 
  occurred_at,
  error_type,
  agent_name,
  error_message
FROM otto_errors
WHERE occurred_at > NOW() - INTERVAL '24 hours'
ORDER BY occurred_at DESC
LIMIT 10;
```

---

## Common Use Cases

### Use Case 1: Pricing Inquiry

**User Message:** "What's the approval probability on this $650 brake job?"

**What OTTO Does:**
1. Detects `pricing` intent
2. Routes to CAL (primary) + MILES (context) + ROY (business context)
3. Executes all 3 in parallel
4. Synthesizes: "87% approval probability. Price is competitive. Customer has high approval history."

**User Sees:** Single unified response from "The Edge AI"

### Use Case 2: Service Recommendation

**User Message:** "Customer is here for oil change. What should I recommend?"

**What OTTO Does:**
1. Detects `service_advisor` intent
2. Routes to OTTO (Gateway & Intake)
3. OTTO analyzes customer history and vehicle
4. Returns service recommendations

**User Sees:** Personalized service recommendations

### Use Case 3: Diagnostic Help

**User Message:** "Check engine light on, car runs rough"

**What OTTO Does:**
1. Detects `diagnostics` intent
2. Routes to DEX (Diagnostics Triage) + VIN (vehicle context if VIN provided)
3. DEX analyzes symptoms and recommends diagnostic steps
4. Returns diagnostic procedure

**User Sees:** Step-by-step diagnostic guidance

---

## Integration Examples

### From Node.js Application

```javascript
const response = await fetch('http://localhost:3000/api/edge-ai/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What's the approval probability on this $500 job?",
    context: {
      customer_id: 'cust_123',
      ro_number: 'RO-2024-523',
      shop_id: 'shop_001'
    }
  })
});

const result = await response.json();
console.log('Edge AI Response:', result.response);
console.log('Agents Consulted:', result._metadata.agents_consulted);
```

### From n8n Workflow

1. Create HTTP Request node
2. Method: POST
3. URL: `http://localhost:3000/api/edge-ai/query`
4. Body: JSON with `message` and `context`
5. Response: Use `response` field as "The Edge AI" output

### From Slack (via n8n)

1. Slack trigger → n8n webhook
2. Extract message text
3. Call `/api/edge-ai/query` with message
4. Send `response` back to Slack channel

---

## Next Steps

### Immediate
1. ✅ **You've completed the quick start!**
2. ⏭️ Experiment with different query types
3. ⏭️ Review orchestration logs in Supabase
4. ⏭️ Run health check regularly

### Advanced
1. ⏭️ **Build n8n Workflow:** See `docs/n8n-workflow-otto-orchestration.md`
2. ⏭️ **Set Up Monitoring:** Use queries from `docs/OTTO_Monitoring_SQL_Queries.md`
3. ⏭️ **Read Full Documentation:** See `docs/OTTO_EDGE_AI_TECHNICAL_DOCUMENTATION.md`
4. ⏭️ **Review Troubleshooting:** See `docs/OTTO_Troubleshooting_Guide.md`

---

## Troubleshooting

### Issue: "Could not find table otto_orchestrations"

**Solution:** The table exists but may need schema cache refresh. The system still works; logging may be affected.

### Issue: "Rate limit exceeded" from Claude API

**Solution:** Wait 1 minute for rate limit reset. This is temporary and happens during heavy testing.

### Issue: Response seems generic or fallback

**Solution:** Check which agents were consulted. May need to refine your query to match intent patterns better.

### Issue: Slow response times

**Solution:** Check health check script output. Review agent performance metrics in Supabase.

---

## Key Concepts

### What Users See
- **"The Edge AI"** - Single unified AI assistant
- Simple chat interface
- Coherent responses

### What Actually Happens
- **13 specialized Squad agents** working together
- **OTTO orchestrator** coordinating behind scenes
- **Parallel execution** for speed
- **Response synthesis** into unified text

### Why This Matters
- **Competitive Advantage:** Competitors see "one AI" but it's actually 13 coordinated agents
- **Maintainability:** Agents can be improved independently
- **Performance:** Parallel execution = faster responses
- **Scalability:** New agents can be added without changing interface

---

## Quick Reference

### API Endpoint
```
POST /api/edge-ai/query
```

### Request Format
```json
{
  "message": "Your question here",
  "context": {
    "customer_id": "optional",
    "ro_number": "optional",
    "shop_id": "optional"
  }
}
```

### Response Format
```json
{
  "success": true,
  "response": "The unified Edge AI response",
  "confidence": 0.85,
  "execution_time_ms": 1247,
  "_metadata": {
    "agents_consulted": ["cal", "miles"],
    "quality_score": 0.89
  }
}
```

### All 13 Squad Agents
1. OTTO - Gateway & Intake
2. DEX - Diagnostics Triage
3. CAL - Pricing & Estimates
4. FLO - Operations Orchestration
5. MAC - Production Manager
6. KIT - Parts & Inventory
7. VIN - Vehicle Intelligence
8. MILES - Customer Retention
9. ROY - Business Intelligence
10. PENNYP - Financial Operations
11. BLAZE - Marketing Intelligence
12. LANCE - Compliance & Fraud Prevention
13. ORACLE - Operational Analytics

---

## Success Criteria

You've successfully completed the Quick Start if you can:

✅ Send a query to `/api/edge-ai/query`  
✅ Receive a unified "Edge AI" response  
✅ Understand which agents were consulted  
✅ View orchestration logs in Supabase  
✅ Run the health check script  
✅ Handle errors gracefully  

---

**Congratulations! You're now ready to use the OTTO Edge AI Orchestration system.**

**Questions?** Check the full documentation or troubleshooting guide.

---

**Guide Version:** 1.0  
**Last Updated:** December 17, 2024









