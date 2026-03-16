-- ============================================================================
-- OTTO ORCHESTRATION LAYER - DATABASE SCHEMA
-- ============================================================================
-- Purpose: Track multi-agent orchestration for "The Edge AI" unified interface
-- Version: 1.0
-- Date: December 17, 2024
-- ============================================================================

-- ----------------------------------------------------------------------------
-- OTTO ORCHESTRATIONS TABLE
-- ----------------------------------------------------------------------------
-- Logs every orchestration event where OTTO routes messages to Squad agents
-- and synthesizes unified responses.

CREATE TABLE IF NOT EXISTS otto_orchestrations (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Request Context
  user_message TEXT NOT NULL,
  user_id TEXT,
  ro_number TEXT,
  shop_id TEXT,
  
  -- Intent Classification
  intents_detected JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  
  -- Agent Routing
  agents_consulted TEXT[] NOT NULL DEFAULT '{}',
  parallel_execution BOOLEAN DEFAULT true,
  
  -- Agent Responses (raw data from each agent)
  agent_responses JSONB NOT NULL DEFAULT '[]',
  execution_time_ms INTEGER,
  
  -- Synthesized Output
  unified_response TEXT NOT NULL,
  synthesis_quality NUMERIC(3,2), -- 0.00 to 1.00
  response_quality_score NUMERIC(3,2), -- 0.00 to 1.00 (alias for synthesis_quality)
  fallback_used BOOLEAN DEFAULT false,
  
  -- Additional Context
  context JSONB DEFAULT '{}',
  
  -- Metadata
  source TEXT, -- 'pos_ui', 'n8n_webhook', 'api_direct', etc.
  session_id TEXT -- For tracking conversation sessions
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_otto_user ON otto_orchestrations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otto_ro ON otto_orchestrations(ro_number) WHERE ro_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_otto_agents ON otto_orchestrations USING GIN(agents_consulted);
CREATE INDEX IF NOT EXISTS idx_otto_created ON otto_orchestrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otto_shop ON otto_orchestrations(shop_id, created_at DESC) WHERE shop_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- AGENT PERFORMANCE METRICS TABLE
-- ----------------------------------------------------------------------------
-- Tracks agent performance over time: response times, accuracy, usage patterns

CREATE TABLE IF NOT EXISTS agent_performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  agent_name TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'response_time_ms', 'accuracy_score', 'usage_count', 'error_rate', 'success_rate'
  metric_value NUMERIC NOT NULL,
  
  -- Context about when/why this metric was recorded
  context JSONB DEFAULT '{}',
  
  -- Optional linking to specific orchestration
  orchestration_id BIGINT REFERENCES otto_orchestrations(id) ON DELETE SET NULL,
  
  -- Metadata
  shop_id TEXT,
  session_id TEXT
);

-- Indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent ON agent_performance_metrics(agent_name, metric_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_type ON agent_performance_metrics(metric_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_orchestration ON agent_performance_metrics(orchestration_id) WHERE orchestration_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- COMMENTS FOR DOCUMENTATION
-- ----------------------------------------------------------------------------

COMMENT ON TABLE otto_orchestrations IS 'Logs every OTTO orchestration event where user messages are routed to Squad agents and responses are synthesized into unified "Edge AI" output';
COMMENT ON TABLE agent_performance_metrics IS 'Tracks performance metrics for individual agents over time (response times, accuracy, usage, errors)';

COMMENT ON COLUMN otto_orchestrations.intents_detected IS 'JSON object with intent flags: {pricing: true, workflow: false, retention: true, ...}';
COMMENT ON COLUMN otto_orchestrations.agents_consulted IS 'Array of agent IDs that were consulted in this orchestration: ["cal", "miles", "val"]';
COMMENT ON COLUMN otto_orchestrations.agent_responses IS 'Array of raw agent responses: [{agent: "cal", status: "success", result: {...}, execution_time_ms: 487}, ...]';
COMMENT ON COLUMN otto_orchestrations.unified_response IS 'The final synthesized response shown to the user as "The Edge AI"';
COMMENT ON COLUMN otto_orchestrations.response_quality_score IS 'Subjective quality score (0-1) of how coherent/useful the synthesized response is';

COMMENT ON COLUMN agent_performance_metrics.metric_type IS 'Type of metric: response_time_ms, accuracy_score, usage_count, error_rate, success_rate';
COMMENT ON COLUMN agent_performance_metrics.metric_value IS 'Numeric value of the metric (e.g., 487 for response_time_ms, 0.94 for accuracy_score)';

-- ----------------------------------------------------------------------------
-- HELPER VIEW: RECENT ORCHESTRATIONS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW otto_orchestrations_recent AS
SELECT 
  id,
  created_at,
  user_message,
  ro_number,
  shop_id,
  intents_detected,
  agents_consulted,
  execution_time_ms,
  response_quality_score,
  array_length(agents_consulted, 1) as agent_count
FROM otto_orchestrations
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON VIEW otto_orchestrations_recent IS 'Quick view of most recent 100 orchestrations';

-- ----------------------------------------------------------------------------
-- HELPER VIEW: AGENT PERFORMANCE SUMMARY
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT 
  agent_name,
  metric_type,
  AVG(metric_value) as avg_value,
  MIN(metric_value) as min_value,
  MAX(metric_value) as max_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as median_value,
  COUNT(*) as sample_count,
  MAX(recorded_at) as last_recorded
FROM agent_performance_metrics
WHERE recorded_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name, metric_type
ORDER BY agent_name, metric_type;

COMMENT ON VIEW agent_performance_summary IS 'Summary statistics for agent performance metrics over last 7 days';









