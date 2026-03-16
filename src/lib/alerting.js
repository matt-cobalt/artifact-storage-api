/**
 * Alerting System
 * Sends alerts for system failures and performance issues
 */

/**
 * Alert levels
 */
export const ALERT_LEVELS = {
  CRITICAL: 'critical',  // Page on-call
  WARNING: 'warning',    // Slack alert
  INFO: 'info'           // Email digest
};

/**
 * Alert configuration
 */
const ALERT_CONFIG = {
  SLACK_WEBHOOK_URL: process.env.SLACK_ALERT_WEBHOOK_URL,
  PAGERDUTY_KEY: process.env.PAGERDUTY_INTEGRATION_KEY,
  EMAIL_RECIPIENTS: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || []
};

/**
 * Send alert
 * @param {string} level - Alert level (critical, warning, info)
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {Object} metadata - Additional metadata
 */
export async function sendAlert(level, title, message, metadata = {}) {
  const alert = {
    level,
    title,
    message,
    metadata,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    switch (level) {
      case ALERT_LEVELS.CRITICAL:
        await sendCriticalAlert(alert);
        break;
      case ALERT_LEVELS.WARNING:
        await sendWarningAlert(alert);
        break;
      case ALERT_LEVELS.INFO:
        await sendInfoAlert(alert);
        break;
    }

    // Log alert
    console.error(`[ALERT ${level.toUpperCase()}] ${title}: ${message}`, metadata);
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}

/**
 * Send critical alert (PagerDuty + Slack)
 */
async function sendCriticalAlert(alert) {
  // Send to Slack
  if (ALERT_CONFIG.SLACK_WEBHOOK_URL) {
    await sendSlackAlert(alert, 'danger');
  }

  // Send to PagerDuty (if configured)
  if (ALERT_CONFIG.PAGERDUTY_KEY) {
    await sendPagerDutyAlert(alert);
  }
}

/**
 * Send warning alert (Slack)
 */
async function sendWarningAlert(alert) {
  if (ALERT_CONFIG.SLACK_WEBHOOK_URL) {
    await sendSlackAlert(alert, 'warning');
  }
}

/**
 * Send info alert (Email digest)
 */
async function sendInfoAlert(alert) {
  // In production, would send email digest
  console.log(`[INFO ALERT] ${alert.title}: ${alert.message}`);
}

/**
 * Send Slack alert
 */
async function sendSlackAlert(alert, color) {
  if (!ALERT_CONFIG.SLACK_WEBHOOK_URL) return;

  const emoji = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️'
  }[alert.level] || '📢';

  const payload = {
    text: `${emoji} ${alert.title}`,
    attachments: [
      {
        color,
        fields: [
          {
            title: 'Message',
            value: alert.message,
            short: false
          },
          {
            title: 'Environment',
            value: alert.environment,
            short: true
          },
          {
            title: 'Timestamp',
            value: alert.timestamp,
            short: true
          }
        ]
      }
    ]
  };

  // Add metadata if present
  if (Object.keys(alert.metadata).length > 0) {
    payload.attachments[0].fields.push({
      title: 'Details',
      value: '```' + JSON.stringify(alert.metadata, null, 2) + '```',
      short: false
    });
  }

  try {
    const response = await fetch(ALERT_CONFIG.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack alert failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}

/**
 * Send PagerDuty alert
 */
async function sendPagerDutyAlert(alert) {
  if (!ALERT_CONFIG.PAGERDUTY_KEY) return;

  const payload = {
    routing_key: ALERT_CONFIG.PAGERDUTY_KEY,
    event_action: 'trigger',
    payload: {
      summary: alert.title,
      source: 'artifact-storage-api',
      severity: 'critical',
      custom_details: {
        message: alert.message,
        metadata: alert.metadata
      }
    }
  };

  try {
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`PagerDuty alert failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send PagerDuty alert:', error);
  }
}

/**
 * Alert conditions checker
 */
export class AlertMonitor {
  constructor() {
    this.metrics = {
      errorRate: 0,
      responseTimeP95: 0,
      healthCheckFailures: 0,
      agentExecutionFailures: 0
    };
  }

  /**
   * Check error rate and alert if high
   */
  async checkErrorRate(errorRate) {
    this.metrics.errorRate = errorRate;

    if (errorRate > 0.05) { // 5%
      await sendAlert(
        ALERT_LEVELS.CRITICAL,
        'High Error Rate Detected',
        `Error rate is ${(errorRate * 100).toFixed(2)}% (threshold: 5%)`,
        { error_rate: errorRate }
      );
    } else if (errorRate > 0.02) { // 2%
      await sendAlert(
        ALERT_LEVELS.WARNING,
        'Elevated Error Rate',
        `Error rate is ${(errorRate * 100).toFixed(2)}% (threshold: 2%)`,
        { error_rate: errorRate }
      );
    }
  }

  /**
   * Check response time and alert if slow
   */
  async checkResponseTime(p95ResponseTime) {
    this.metrics.responseTimeP95 = p95ResponseTime;

    if (p95ResponseTime > 3000) { // 3 seconds
      await sendAlert(
        ALERT_LEVELS.WARNING,
        'Slow Response Time',
        `P95 response time is ${p95ResponseTime}ms (threshold: 3000ms)`,
        { p95_response_time_ms: p95ResponseTime }
      );
    } else if (p95ResponseTime > 2000) { // 2 seconds
      await sendAlert(
        ALERT_LEVELS.INFO,
        'Response Time Warning',
        `P95 response time is ${p95ResponseTime}ms (threshold: 2000ms)`,
        { p95_response_time_ms: p95ResponseTime }
      );
    }
  }

  /**
   * Check health check failures
   */
  async checkHealthCheckFailures(failureCount) {
    this.metrics.healthCheckFailures = failureCount;

    if (failureCount >= 3) {
      await sendAlert(
        ALERT_LEVELS.CRITICAL,
        'Health Check Failures',
        `${failureCount} consecutive health check failures detected`,
        { failure_count: failureCount }
      );
    }
  }

  /**
   * Check agent execution failures
   */
  async checkAgentExecutionFailures(failureRate) {
    this.metrics.agentExecutionFailures = failureRate;

    if (failureRate > 0.05) { // 5%
      await sendAlert(
        ALERT_LEVELS.WARNING,
        'High Agent Execution Failure Rate',
        `Agent execution failure rate is ${(failureRate * 100).toFixed(2)}%`,
        { failure_rate: failureRate }
      );
    }
  }
}

export default {
  sendAlert,
  ALERT_LEVELS,
  AlertMonitor
};



















