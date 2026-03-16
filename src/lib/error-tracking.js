/**
 * Error Tracking & Logging
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Log error
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 * @param {string} severity - Error severity
 */
export async function logError(error, context = {}, severity = 'error') {
  try {
    const { data, error: insertError } = await supabase
      .from('error_logs')
      .insert({
        error_type: error.name || 'Error',
        error_message: error.message || String(error),
        stack_trace: error.stack,
        context: context,
        severity: determineSeverity(error, severity),
        shop_id: context.shop_id || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to log error:', insertError);
    }

    // Alert if critical
    if (isCritical(error, severity)) {
      await alertTeam(error, context);
    }

    return data?.id;
  } catch (logError) {
    console.error('logError function failed:', logError);
    // Fallback to console
    console.error('Original error:', error);
    console.error('Context:', context);
  }
}

/**
 * Determine error severity
 */
function determineSeverity(error, providedSeverity) {
  // Override with provided severity if exists
  if (providedSeverity && ['info', 'warning', 'error', 'critical'].includes(providedSeverity)) {
    return providedSeverity;
  }

  // Auto-detect based on error
  if (error.name === 'ValidationError' || error.name === 'BadRequestError') {
    return 'warning';
  }

  if (error.name === 'UnauthorizedError' || error.name === 'ForbiddenError') {
    return 'warning';
  }

  if (error.name === 'DatabaseError' || error.name === 'ConnectionError') {
    return 'critical';
  }

  if (error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED')) {
    return 'critical';
  }

  return 'error';
}

/**
 * Check if error is critical
 */
function isCritical(error, severity) {
  if (severity === 'critical') return true;

  const criticalPatterns = [
    'database',
    'connection',
    'timeout',
    'ECONNREFUSED',
    'ENOTFOUND',
    'unauthorized',
    'authentication failed'
  ];

  const errorMessage = (error.message || '').toLowerCase();
  return criticalPatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Alert team about critical error
 */
async function alertTeam(error, context) {
  try {
    if (process.env.SLACK_WEBHOOK_URL) {
      const { default: fetch } = await import('node-fetch');
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Critical Error: ${error.name || 'Error'}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${error.name || 'Error'}*\n\`\`\`${error.message}\`\`\`\n\n*Context:*\n\`\`\`${JSON.stringify(context, null, 2)}\`\`\``
              }
            }
          ]
        })
      });
    }
  } catch (alertError) {
    console.error('Failed to send alert:', alertError);
  }
}

/**
 * Error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Log error
  logError(err, {
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    shop_id: req.shopId,
    user_id: req.user?.id
  }).catch(console.error);

  // Send response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

export default {
  logError,
  errorHandler
};



















