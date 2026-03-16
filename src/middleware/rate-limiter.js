/**
 * API Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';

/**
 * Public API rate limiter (100 requests/hour per IP)
 */
export const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Authenticated API rate limiter (1000 requests/hour per API key)
 */
export const authenticatedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: 'Too many requests with this API key, please try again later.',
  keyGenerator: (req) => {
    return req.headers['x-api-key'] || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Webhook rate limiter (10000 requests/hour)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10000,
  message: 'Too many webhook requests, please try again later.',
  keyGenerator: (req) => {
    return req.headers['x-webhook-secret'] || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Strict rate limiter for sensitive operations (10 requests/hour)
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many requests for this operation, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});



















