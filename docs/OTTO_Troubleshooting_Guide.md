# OTTO Troubleshooting Guide

**Version:** 1.0  
**Date:** December 17, 2024  
**Purpose:** Common issues and fixes for OTTO orchestration system

---

## Table of Contents

1. [Workflow Not Triggering](#issue-1-workflow-not-triggering)
2. [Agents Timing Out Frequently](#issue-2-agents-timing-out-frequently)
3. [Poor Synthesis Quality](#issue-3-poor-synthesis-quality)
4. [High Error Rates](#issue-4-high-error-rates)
5. [Slow Response Times](#issue-5-slow-response-times)
6. [Incorrect Agent Routing](#issue-6-incorrect-agent-routing)
7. [Database Connection Issues](#issue-7-database-connection-issues)
8. [Missing Agent Responses](#issue-8-missing-agent-responses)
9. [Intent Classification Failing](#issue-9-intent-classification-failing)
10. [Fallback Responses Too Frequent](#issue-10-fallback-responses-too-frequent)

---

## Issue 1: Workflow Not Triggering

### Symptoms
- Webhook receives no requests
- n8n workflow shows no executions
- No logs in `otto_orchestrations` table

### Diagnosis Steps

1. **Check Webhook URL**
   ```bash
   # Test webhook manually
   curl -X POST https://your-n8n-instance.com/webhook/edge-ai-query \
     -H "Content-Type: application/json" \
     -d '{"message": "test", "context": {}}'
   ```

2. **Check n8n Workflow Status**
   - Verify workflow is **Active**
   - Check webhook node is enabled
   - Verify webhook path matches expected

3. **Check API Server**
   ```bash
   # Verify API is running
   curl http://localhost:3000/health
   
   # Check if server is listening on correct port
   netstat -ano | findstr :3000  # Windows
   lsof -i :3000  # Mac/Linux
   ```

4. **Check Logs**
   ```bash
   # Check API server logs
   # Check n8n execution logs
   # Check browser console (if testing from UI)
   ```

### Fixes

**Fix 1: Webhook URL Incorrect**
- ✅ Verify webhook URL in source system (POS, Slack, etc.)
- ✅ Copy exact URL from n8n webhook node
- ✅ Test webhook URL with curl

**Fix 2: Workflow Inactive**
- ✅ Activate workflow in n8n
- ✅ Verify webhook node is enabled (not paused)
- ✅ Check workflow has no errors

**Fix 3: API Server Down**
- ✅ Restart API server: `node src/artifact-storage/server.js`
- ✅ Check for port conflicts
- ✅ Verify environment variables are set

---

## Issue 2: Agents Timing Out Frequently

### Symptoms
- High timeout rate (> 10% of requests)
- `agents_timed_out` array frequently populated
- Slow overall response times

### Diagnosis Steps

1. **Check Agent Response Times**
   ```sql
   -- Query from monitoring guide
   SELECT agent_name, AVG(execution_time_ms) as avg_time
   FROM agent_performance_metrics
   WHERE metric_type = 'response_time_ms'
     AND recorded_at > NOW() - INTERVAL '24 hours'
   GROUP BY agent_name;
   ```

2. **Check Agent Endpoints**
   ```bash
   # Test each agent endpoint directly
   curl -X POST http://localhost:3000/api/agents/cal/execute \
     -H "Content-Type: application/json" \
     -d '{"input": {"test": true}, "context": {}}'
   ```

3. **Check Network Connectivity**
   - Verify agent endpoints are accessible
   - Check firewall rules
   - Verify DNS resolution

### Fixes

**Fix 1: Agent Endpoint Slow**
- ✅ Check agent execution logic for bottlenecks
- ✅ Optimize agent queries (database, API calls)
- ✅ Add caching where appropriate
- ✅ Consider increasing timeout from 3s to 5s (if acceptable)

**Fix 2: Agent Endpoint Unavailable**
- ✅ Verify agent API is running
- ✅ Check agent server logs for errors
- ✅ Restart agent services if needed

**Fix 3: Network Issues**
- ✅ Check network latency between orchestrator and agents
- ✅ Verify no firewall blocking requests
- ✅ Check DNS resolution

**Fix 4: Timeout Too Aggressive**
- ✅ Review if 3-second timeout is appropriate
- ✅ Consider agent-specific timeouts (some agents may need more time)
- ✅ Monitor timeout rate and adjust if needed

---

## Issue 3: Poor Synthesis Quality

### Symptoms
- Low `synthesis_quality` scores (< 0.75)
- Responses feel incoherent or disjointed
- Key information missing from synthesized response

### Diagnosis Steps

1. **Check Quality Scores**
   ```sql
   SELECT 
     AVG(synthesis_quality) as avg_quality,
     COUNT(CASE WHEN synthesis_quality < 0.7 THEN 1 END) as low_quality_count
   FROM otto_orchestrations
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Review Agent Responses**
   ```sql
   -- Look at recent orchestrations with low quality
   SELECT 
     id,
     user_message,
     agents_consulted,
     agent_responses,
     synthesis_quality,
     unified_response
   FROM otto_orchestrations
   WHERE created_at > NOW() - INTERVAL '24 hours'
     AND synthesis_quality < 0.7
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Check Agent Response Structure**
   - Verify agents return structured responses
   - Check if agents are returning expected fields
   - Review `extractKeyPoints()` function logic

### Fixes

**Fix 1: Agent Responses Not Structured**
- ✅ Ensure agents return JSON with expected fields
- ✅ Update `extractKeyPoints()` to handle agent-specific response formats
- ✅ Add fallback extraction logic for unexpected formats

**Fix 2: Synthesis Logic Issues**
- ✅ Review `buildUnifiedText()` function
- ✅ Improve key point extraction for each agent type
- ✅ Add better handling for empty or null responses

**Fix 3: Too Many Agents**
- ✅ Review if routing too many agents (causes complexity)
- ✅ Consider limiting to 3-4 agents max per request
- ✅ Prioritize primary agent more heavily in synthesis

---

## Issue 4: High Error Rates

### Symptoms
- High number of errors in `otto_errors` table
- Frequent fallback responses
- Agents returning errors frequently

### Diagnosis Steps

1. **Check Error Types**
   ```sql
   SELECT 
     error_type,
     agent_name,
     COUNT(*) as error_count
   FROM otto_errors
   WHERE occurred_at > NOW() - INTERVAL '24 hours'
     AND resolved = false
   GROUP BY error_type, agent_name
   ORDER BY error_count DESC;
   ```

2. **Review Error Messages**
   ```sql
   SELECT 
     error_type,
     error_message,
     agent_name,
     occurred_at
   FROM otto_errors
   WHERE occurred_at > NOW() - INTERVAL '24 hours'
   ORDER BY occurred_at DESC
   LIMIT 20;
   ```

3. **Check Agent Logs**
   - Review agent execution logs
   - Check for common error patterns
   - Verify agent error handling

### Fixes

**Fix 1: Agent Throwing Errors**
- ✅ Fix underlying agent bug
- ✅ Improve agent error handling
- ✅ Add validation to prevent invalid inputs

**Fix 2: Network/API Errors**
- ✅ Verify agent endpoints are stable
- ✅ Add retry logic (with backoff)
- ✅ Implement circuit breaker pattern

**Fix 3: Database Errors**
- ✅ Check Supabase connection
- ✅ Verify database schema is up to date
- ✅ Check for constraint violations

---

## Issue 5: Slow Response Times

### Symptoms
- Average response time > 3 seconds
- Users experiencing delays
- High P95/P99 response times

### Diagnosis Steps

1. **Check Overall Performance**
   ```sql
   SELECT 
     AVG(execution_time_ms) as avg_time,
     PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_time,
     PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time_ms) as p99_time
   FROM otto_orchestrations
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Identify Slow Agents**
   ```sql
   -- Find which agents are slowest
   SELECT 
     unnest(agents_consulted) as agent_name,
     AVG(execution_time_ms) as avg_time
   FROM otto_orchestrations
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY agent_name
   ORDER BY avg_time DESC;
   ```

3. **Check for Bottlenecks**
   - Database query performance
   - External API calls
   - Network latency

### Fixes

**Fix 1: Slow Agent Performance**
- ✅ Optimize agent code (database queries, API calls)
- ✅ Add caching for frequently accessed data
- ✅ Consider parallelizing agent internal operations

**Fix 2: Too Many Agents**
- ✅ Review routing logic (are we calling too many agents?)
- ✅ Consider sequential execution for non-critical agents
- ✅ Limit to essential agents only

**Fix 3: Database Slow**
- ✅ Optimize database queries
- ✅ Add indexes if missing
- ✅ Consider read replicas for heavy reads

**Fix 4: Network Latency**
- ✅ Move services closer together (same region)
- ✅ Use connection pooling
- ✅ Optimize payload sizes

---

## Issue 6: Incorrect Agent Routing

### Symptoms
- Wrong agents being consulted for queries
- Missing agents that should be called
- Low routing accuracy

### Diagnosis Steps

1. **Review Intent Classification**
   ```sql
   -- Compare detected intents with expected
   SELECT 
     user_message,
     intents_detected,
     primary_intent,
     agents_consulted
   FROM otto_orchestrations
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

2. **Check Intent Patterns**
   - Review regex patterns in `classifyUserIntent()`
   - Test patterns with sample messages
   - Verify patterns match expected intents

3. **Manual Testing**
   - Test specific queries that should route to specific agents
   - Compare expected vs actual routing

### Fixes

**Fix 1: Intent Patterns Too Broad/Narrow**
- ✅ Refine regex patterns in `classifyUserIntent()`
- ✅ Add negative patterns to exclude false positives
- ✅ Test patterns with sample queries

**Fix 2: Routing Logic Issues**
- ✅ Review `routeToAgents()` function
- ✅ Verify `AGENT_INTENT_MAP` is correct
- ✅ Check if ROY auto-addition is causing issues

**Fix 3: Missing Agent in Map**
- ✅ Verify all 13 agents are in `AGENT_INTENT_MAP`
- ✅ Add missing mappings
- ✅ Test routing after changes

---

## Issue 7: Database Connection Issues

### Symptoms
- Orchestration records not saving
- Errors about Supabase connection
- Missing logs in database

### Diagnosis Steps

1. **Check Environment Variables**
   ```bash
   # Verify .env file has correct values
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_KEY
   ```

2. **Test Supabase Connection**
   ```javascript
   // Test script
   import { createClient } from '@supabase/supabase-js';
   const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_KEY
   );
   const { data, error } = await supabase.from('otto_orchestrations').select('count');
   console.log('Connection test:', error || 'Success');
   ```

3. **Check Database Logs**
   - Review Supabase dashboard for errors
   - Check connection limits
   - Verify table exists and is accessible

### Fixes

**Fix 1: Missing Environment Variables**
- ✅ Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to `.env`
- ✅ Restart API server after adding variables
- ✅ Verify variables are loaded: `console.log(process.env.SUPABASE_URL)`

**Fix 2: Invalid Credentials**
- ✅ Verify service key is correct (not anon key)
- ✅ Check key has appropriate permissions
- ✅ Regenerate key if needed

**Fix 3: Database Table Missing**
- ✅ Run database migration scripts
- ✅ Verify tables exist: `SELECT * FROM otto_orchestrations LIMIT 1;`
- ✅ Check table permissions

---

## Issue 8: Missing Agent Responses

### Symptoms
- Some agents not appearing in `agents_consulted`
- Incomplete responses
- Missing expected information

### Diagnosis Steps

1. **Check Agent Response Array**
   ```sql
   SELECT 
     id,
     agents_consulted,
     jsonb_array_length(agent_responses) as response_count
   FROM otto_orchestrations
   WHERE created_at > NOW() - INTERVAL '24 hours'
     AND jsonb_array_length(agent_responses) < array_length(agents_consulted, 1)
   ORDER BY created_at DESC
   LIMIT 20;
   ```

2. **Review Execution Logic**
   - Check if agents are being called
   - Verify error handling isn't swallowing responses
   - Check timeout logic

### Fixes

**Fix 1: Agent Not Being Called**
- ✅ Verify agent is in routing logic
- ✅ Check if intent classification is working
- ✅ Review `executeAgentsInParallel()` function

**Fix 2: Response Not Collected**
- ✅ Check merge logic in n8n workflow
- ✅ Verify HTTP request nodes output data
- ✅ Check if "Continue On Fail" is causing issues

**Fix 3: Agent Silent Failure**
- ✅ Improve agent error handling
- ✅ Ensure agents always return response (even on error)
- ✅ Add logging to track agent execution

---

## Issue 9: Intent Classification Failing

### Symptoms
- All queries routing to OTTO (fallback)
- `primary_intent` is null or incorrect
- Low confidence scores

### Diagnosis Steps

1. **Check Classification Results**
   ```sql
   SELECT 
     user_message,
     intents_detected,
     primary_intent,
     confidence_score
   FROM otto_orchestrations
   WHERE created_at > NOW() - INTERVAL '24 hours'
     AND primary_intent IS NULL
   ORDER BY created_at DESC
   LIMIT 20;
   ```

2. **Test Classification Function**
   ```javascript
   // Test classification directly
   import { classifyUserIntent } from './otto-orchestrator.js';
   const result = classifyUserIntent("What's the approval probability?");
   console.log('Classification:', result);
   ```

### Fixes

**Fix 1: Patterns Not Matching**
- ✅ Review and update regex patterns
- ✅ Test patterns with sample messages
- ✅ Add more keyword variations

**Fix 2: Message Preprocessing Needed**
- ✅ Add message normalization (lowercase, trim)
- ✅ Remove special characters if causing issues
- ✅ Handle edge cases (empty messages, very long messages)

**Fix 3: Confidence Threshold Too High**
- ✅ Lower minimum confidence threshold
- ✅ Adjust confidence calculation
- ✅ Improve pattern matching

---

## Issue 10: Fallback Responses Too Frequent

### Symptoms
- High `fallback_used` rate (> 10%)
- Users seeing generic "I'm having trouble..." messages
- Low success rate

### Diagnosis Steps

1. **Check Fallback Rate**
   ```sql
   SELECT 
     COUNT(CASE WHEN fallback_used THEN 1 END) as fallback_count,
     COUNT(*) as total_count,
     ROUND(
       COUNT(CASE WHEN fallback_used THEN 1 END)::NUMERIC / 
       NULLIF(COUNT(*), 0) * 100, 
       2
     ) as fallback_rate_pct
   FROM otto_orchestrations
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Identify Root Causes**
   ```sql
   -- What's causing fallbacks?
   SELECT 
     CASE 
       WHEN array_length(agents_timed_out, 1) > 0 THEN 'timeout'
       WHEN array_length(agents_errored, 1) > 0 THEN 'error'
       ELSE 'other'
     END as fallback_reason,
     COUNT(*) as count
   FROM otto_orchestrations
   WHERE created_at > NOW() - INTERVAL '24 hours'
     AND fallback_used = true
   GROUP BY fallback_reason;
   ```

### Fixes

**Fix 1: Too Many Timeouts**
- ✅ Fix slow agents (see Issue 2)
- ✅ Increase timeout threshold if appropriate
- ✅ Optimize agent performance

**Fix 2: Too Many Errors**
- ✅ Fix agent errors (see Issue 4)
- ✅ Improve error handling
- ✅ Add retry logic

**Fix 3: Synthesis Failing**
- ✅ Fix synthesis logic (see Issue 3)
- ✅ Improve fallback synthesis
- ✅ Add better error recovery

---

## General Troubleshooting Tips

### Always Check First

1. **Environment Variables**
   ```bash
   # Verify all required env vars are set
   cat .env | grep -E "SUPABASE|ANTHROPIC"
   ```

2. **API Server Status**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Recent Errors**
   ```sql
   SELECT * FROM otto_errors 
   WHERE occurred_at > NOW() - INTERVAL '1 hour' 
   ORDER BY occurred_at DESC LIMIT 10;
   ```

4. **Logs**
   - Check API server console logs
   - Check n8n execution logs
   - Check Supabase logs (if available)

### Common Patterns

- **Timeouts** → Usually agent performance issue
- **Errors** → Usually agent code bug or API issue
- **Poor Quality** → Usually synthesis logic or agent response format
- **Slow Times** → Usually too many agents or slow agent performance
- **Routing Issues** → Usually intent pattern or routing logic

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2024









