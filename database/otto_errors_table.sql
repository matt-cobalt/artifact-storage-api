-- ============================================================================
-- OTTO ERROR TRACKING TABLE
-- ============================================================================
-- Purpose: Track errors during orchestration for debugging and improvement
-- Version: 1.0
-- Date: December 17, 2024
-- ============================================================================

CREATE TABLE IF NOT EXISTS otto_errors (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  
  error_type TEXT NOT NULL, -- 'timeout', 'agent_error', 'synthesis_error', 'classification_error', 'routing_error'
  error_message TEXT,
  agent_name TEXT,
  
  orchestration_id BIGINT REFERENCES otto_orchestrations(id) ON DELETE SET NULL,
  stack_trace TEXT,
  context JSONB DEFAULT '{}',
  
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  INDEX idx_errors_unresolved ON otto_errors(resolved, occurred_at DESC) WHERE resolved = false,
  INDEX idx_errors_agent ON otto_errors(agent_name, error_type),
  INDEX idx_errors_type ON otto_errors(error_type, occurred_at DESC),
  INDEX idx_errors_orchestration ON otto_errors(orchestration_id) WHERE orchestration_id IS NOT NULL
);

COMMENT ON TABLE otto_errors IS 'Tracks errors during OTTO orchestration for debugging and system improvement';
COMMENT ON COLUMN otto_errors.error_type IS 'Type of error: timeout, agent_error, synthesis_error, classification_error, routing_error';
COMMENT ON COLUMN otto_errors.orchestration_id IS 'Link to the orchestration record where this error occurred (if applicable)';









