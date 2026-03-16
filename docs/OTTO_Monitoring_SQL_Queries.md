# OTTO Monitoring - SQL Queries

**Version:** 1.0  
**Date:** December 17, 2024  
**Purpose:** SQL queries for monitoring OTTO orchestration system performance and health

---

## Real-Time Performance Queries

### Query 1: Last Hour Performance

```sql
-- Overall performance metrics for last hour
SELECT 
  COUNT(*) as total_requests,
  AVG(execution_time_ms) as avg_response_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time_ms) as median_response_time_ms,
  MAX(execution_time_ms) as max_response_time_ms,
  MIN(execution_time_ms) as min_response_time_ms,
  AVG(array_length(agents_consulted, 1)) as avg_agents_per_request,
  AVG(synthesis_quality) as avg_quality_score,
  COUNT(CASE WHEN fallback_used THEN 1 END) as fallback_count,
  ROUND(
    COUNT(CASE WHEN fallback_used THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as fallback_rate_pct
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Alert Threshold:** 
- If `avg_response_time_ms > 3500` → Alert: "Response times above target"
- If `fallback_rate_pct > 10` → Alert: "High fallback rate"

---

### Query 2: Last 24 Hours Trend

```sql
-- Performance trend over last 24 hours (hourly buckets)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as requests,
  AVG(execution_time_ms) as avg_response_time_ms,
  AVG(synthesis_quality) as avg_quality_score,
  COUNT(CASE WHEN fallback_used THEN 1 END) as fallback_count,
  AVG(array_length(agents_consulted, 1)) as avg_agents_per_request
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

---

### Query 3: Success Rate Over Time

```sql
-- Overall success rate (non-fallback requests)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN NOT fallback_used THEN 1 END) as successful_requests,
  ROUND(
    COUNT(CASE WHEN NOT fallback_used THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as success_rate_pct
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

**Alert Threshold:** 
- If `success_rate_pct < 90` for any hour → Alert: "Success rate below target"

---

## Agent Utilization Queries

### Query 4: Agent Call Frequency

```sql
-- Which agents are being called most frequently?
SELECT 
  unnest(agents_consulted) as agent_name,
  COUNT(*) as call_count,
  COUNT(DISTINCT id) as unique_orchestrations,
  ROUND(
    COUNT(*)::NUMERIC / 
    NULLIF((SELECT COUNT(*) FROM otto_orchestrations WHERE created_at > NOW() - INTERVAL '24 hours'), 0) * 100, 
    2
  ) as usage_percentage
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agent_name
ORDER BY call_count DESC;
```

---

### Query 5: Agent Average Response Times

```sql
-- Average response time per agent (from agent_responses JSONB)
SELECT 
  agent_name,
  AVG((response->>'execution_time_ms')::INTEGER) as avg_response_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY (response->>'execution_time_ms')::INTEGER
  ) as median_response_time_ms,
  MAX((response->>'execution_time_ms')::INTEGER) as max_response_time_ms,
  COUNT(*) as sample_count
FROM otto_orchestrations,
  jsonb_array_elements(agent_responses) as response(agent_data),
  jsonb_to_record(response.agent_data) as x(agent TEXT as agent_name, execution_time_ms INTEGER)
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND response.agent_data->>'status' = 'success'
GROUP BY agent_name
ORDER BY avg_response_time_ms DESC;
```

---

### Query 6: Agent Success Rates

```sql
-- Success rate per agent
SELECT 
  agent_name,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successes,
  COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeouts,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
  ROUND(
    COUNT(CASE WHEN status = 'success' THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as success_rate_pct
FROM otto_orchestrations,
  jsonb_array_elements(agent_responses) as response(agent_data),
  jsonb_to_record(response.agent_data) as x(agent TEXT as agent_name, status TEXT)
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agent_name
ORDER BY success_rate_pct ASC, total_calls DESC;
```

**Alert Threshold:**
- If `success_rate_pct < 90` for any agent → Alert: "Agent {agent_name} success rate below target"
- If `timeout_count > total_calls * 0.1` → Alert: "Agent {agent_name} timeout rate high"

---

## Error Tracking Queries

### Query 7: Recent Errors by Type

```sql
-- Recent errors grouped by type and agent
SELECT 
  error_type,
  agent_name,
  COUNT(*) as error_count,
  MAX(occurred_at) as most_recent,
  COUNT(CASE WHEN resolved = false THEN 1 END) as unresolved_count
FROM otto_errors
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type, agent_name
ORDER BY error_count DESC, most_recent DESC;
```

---

### Query 8: Unresolved Errors

```sql
-- All unresolved errors needing attention
SELECT 
  id,
  occurred_at,
  error_type,
  agent_name,
  error_message,
  orchestration_id
FROM otto_errors
WHERE resolved = false
ORDER BY occurred_at DESC
LIMIT 50;
```

**Alert Threshold:**
- If `unresolved_count > 10` → Alert: "Multiple unresolved errors"

---

### Query 9: Error Rate Trend

```sql
-- Error rate over time (hourly)
SELECT 
  DATE_TRUNC('hour', occurred_at) as hour,
  error_type,
  COUNT(*) as error_count
FROM otto_errors
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', occurred_at), error_type
ORDER BY hour DESC, error_count DESC;
```

---

## Intent Distribution Queries

### Query 10: Intent Usage Statistics

```sql
-- What are users asking about most?
SELECT 
  primary_intent,
  COUNT(*) as request_count,
  AVG(synthesis_quality) as avg_quality_score,
  AVG(execution_time_ms) as avg_execution_time_ms,
  AVG(array_length(agents_consulted, 1)) as avg_agents_per_request,
  ROUND(
    COUNT(*)::NUMERIC / 
    NULLIF((SELECT COUNT(*) FROM otto_orchestrations WHERE created_at > NOW() - INTERVAL '7 days'), 0) * 100, 
    2
  ) as percentage_of_total
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '7 days'
  AND primary_intent IS NOT NULL
GROUP BY primary_intent
ORDER BY request_count DESC;
```

---

### Query 11: Multi-Intent Requests

```sql
-- How often are multiple intents detected?
SELECT 
  array_length(agents_consulted, 1) as agent_count,
  COUNT(*) as request_count,
  AVG(execution_time_ms) as avg_execution_time_ms,
  AVG(synthesis_quality) as avg_quality_score
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY array_length(agents_consulted, 1)
ORDER BY agent_count DESC;
```

---

## Quality Metrics Queries

### Query 12: Quality Score Distribution

```sql
-- Distribution of synthesis quality scores
SELECT 
  CASE 
    WHEN synthesis_quality >= 0.9 THEN 'Excellent (0.9-1.0)'
    WHEN synthesis_quality >= 0.8 THEN 'Good (0.8-0.9)'
    WHEN synthesis_quality >= 0.7 THEN 'Fair (0.7-0.8)'
    WHEN synthesis_quality >= 0.6 THEN 'Poor (0.6-0.7)'
    ELSE 'Very Poor (<0.6)'
  END as quality_bucket,
  COUNT(*) as count,
  ROUND(
    COUNT(*)::NUMERIC / 
    NULLIF((SELECT COUNT(*) FROM otto_orchestrations WHERE created_at > NOW() - INTERVAL '7 days'), 0) * 100, 
    2
  ) as percentage
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY quality_bucket
ORDER BY MIN(synthesis_quality) DESC;
```

**Alert Threshold:**
- If `percentage` for "Poor" or "Very Poor" > 15 → Alert: "Quality degradation detected"

---

### Query 13: Confidence Score Analysis

```sql
-- Average confidence by intent type
SELECT 
  primary_intent,
  AVG(confidence_score) as avg_confidence,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY confidence_score) as median_confidence,
  COUNT(*) as sample_count
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '7 days'
  AND primary_intent IS NOT NULL
GROUP BY primary_intent
ORDER BY avg_confidence DESC;
```

---

## Performance Bottleneck Queries

### Query 14: Slow Orchestrations

```sql
-- Find slow orchestrations for investigation
SELECT 
  id,
  created_at,
  user_message,
  agents_consulted,
  execution_time_ms,
  synthesis_quality,
  primary_intent
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND execution_time_ms > 3000
ORDER BY execution_time_ms DESC
LIMIT 50;
```

---

### Query 15: Agent Timeout Analysis

```sql
-- Which agents are timing out most frequently?
SELECT 
  unnest(agents_timed_out) as agent_name,
  COUNT(*) as timeout_count,
  COUNT(DISTINCT id) as orchestrations_affected
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '7 days'
  AND array_length(agents_timed_out, 1) > 0
GROUP BY agent_name
ORDER BY timeout_count DESC;
```

**Alert Threshold:**
- If `timeout_count > 10` for any agent in 24 hours → Alert: "Agent {agent_name} timing out frequently"

---

## User Experience Queries

### Query 16: Response Time Percentiles

```sql
-- Response time percentiles (P50, P75, P90, P95, P99)
SELECT 
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY execution_time_ms) as p50_ms,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY execution_time_ms) as p75_ms,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY execution_time_ms) as p90_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time_ms) as p99_ms,
  COUNT(*) as sample_count
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Target:** P95 < 3000ms, P99 < 5000ms

---

### Query 17: Shop-Specific Performance

```sql
-- Performance by shop (for multi-tenant scenarios)
SELECT 
  shop_id,
  COUNT(*) as request_count,
  AVG(execution_time_ms) as avg_response_time_ms,
  AVG(synthesis_quality) as avg_quality_score,
  COUNT(CASE WHEN fallback_used THEN 1 END) as fallback_count
FROM otto_orchestrations
WHERE created_at > NOW() - INTERVAL '7 days'
  AND shop_id IS NOT NULL
GROUP BY shop_id
ORDER BY request_count DESC;
```

---

## Dashboard View Queries

### Query 18: Real-Time Dashboard Summary

```sql
-- Comprehensive dashboard summary (last hour)
WITH recent_data AS (
  SELECT * FROM otto_orchestrations
  WHERE created_at > NOW() - INTERVAL '1 hour'
),
agent_stats AS (
  SELECT 
    unnest(agents_consulted) as agent_name,
    COUNT(*) as calls
  FROM recent_data
  GROUP BY agent_name
)
SELECT 
  (SELECT COUNT(*) FROM recent_data) as total_requests,
  (SELECT AVG(execution_time_ms) FROM recent_data) as avg_response_time_ms,
  (SELECT AVG(synthesis_quality) FROM recent_data) as avg_quality_score,
  (SELECT COUNT(*) FROM otto_errors WHERE occurred_at > NOW() - INTERVAL '1 hour' AND resolved = false) as unresolved_errors,
  (SELECT jsonb_object_agg(agent_name, calls) FROM agent_stats) as agent_call_distribution;
```

---

### Query 19: Agent Performance Summary View

```sql
-- Create a view for agent performance (refresh periodically)
CREATE OR REPLACE VIEW otto_agent_performance_summary AS
SELECT 
  agent_name,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successes,
  COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeouts,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
  AVG(CASE WHEN status = 'success' THEN execution_time_ms END) as avg_success_time_ms,
  ROUND(
    COUNT(CASE WHEN status = 'success' THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as success_rate_pct
FROM otto_orchestrations,
  jsonb_array_elements(agent_responses) as response(agent_data),
  jsonb_to_record(response.agent_data) as x(
    agent TEXT as agent_name, 
    status TEXT, 
    execution_time_ms INTEGER
  )
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name;

-- Query the view
SELECT * FROM otto_agent_performance_summary
ORDER BY success_rate_pct ASC, total_calls DESC;
```

---

### Query 20: Health Check Query

```sql
-- Overall system health check (returns health status)
SELECT 
  CASE 
    WHEN 
      (SELECT AVG(execution_time_ms) FROM otto_orchestrations 
       WHERE created_at > NOW() - INTERVAL '1 hour') < 3000
      AND
      (SELECT COUNT(*)::NUMERIC / NULLIF(COUNT(*), 0) * 100 
       FROM otto_orchestrations 
       WHERE created_at > NOW() - INTERVAL '1 hour' AND NOT fallback_used) > 90
      AND
      (SELECT COUNT(*) FROM otto_errors 
       WHERE occurred_at > NOW() - INTERVAL '1 hour' AND resolved = false) < 5
    THEN 'HEALTHY'
    ELSE 'DEGRADED'
  END as system_health,
  (SELECT COUNT(*) FROM otto_orchestrations WHERE created_at > NOW() - INTERVAL '1 hour') as requests_last_hour,
  (SELECT AVG(execution_time_ms) FROM otto_orchestrations WHERE created_at > NOW() - INTERVAL '1 hour') as avg_response_time_ms,
  (SELECT COUNT(*) FROM otto_errors WHERE occurred_at > NOW() - INTERVAL '1 hour' AND resolved = false) as unresolved_errors;
```

---

## Scheduled Monitoring Queries

### Recommended Monitoring Schedule

- **Every 5 minutes:** Query 1 (Last Hour Performance)
- **Every hour:** Query 7 (Recent Errors), Query 10 (Intent Distribution)
- **Every 6 hours:** Query 4 (Agent Utilization), Query 6 (Agent Success Rates)
- **Daily:** Query 2 (24 Hour Trend), Query 12 (Quality Distribution)

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2024









