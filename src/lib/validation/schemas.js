/**
 * Input Validation Schemas
 * Using Zod for type-safe validation
 */

import { z } from 'zod';

/**
 * Agent execution request schema
 */
export const AgentRequestSchema = z.object({
  agent_id: z.string().max(50),
  request: z.string().max(5000),
  context: z.object({}).passthrough().optional(),
  customer_id: z.string().uuid().optional(),
  shop_id: z.string().uuid().optional()
});

/**
 * Onboarding request schema
 */
export const OnboardingSchema = z.object({
  email: z.string().email(),
  shop_name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional()
});

/**
 * Tekmetric connection schema
 */
export const TekmetricConnectionSchema = z.object({
  onboarding_id: z.string().uuid(),
  api_key: z.string().min(10),
  webhook_secret: z.string().min(10)
});

/**
 * A/B test creation schema
 */
export const ABTestSchema = z.object({
  agent_id: z.string().max(50),
  test_name: z.string().min(5).max(100),
  hypothesis: z.string().max(500),
  variant_a: z.object({
    system_prompt: z.string().max(10000),
    temperature: z.number().min(0).max(2).optional()
  }),
  variant_b: z.object({
    system_prompt: z.string().max(10000),
    temperature: z.number().min(0).max(2).optional()
  })
});

/**
 * Formula execution schema
 */
export const FormulaExecutionSchema = z.object({
  formula: z.string().max(100),
  inputs: z.object({}).passthrough(),
  context: z.object({}).passthrough().optional()
});

/**
 * Analytics query schema
 */
export const AnalyticsQuerySchema = z.object({
  shop_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(1000).optional()
});

/**
 * Validation middleware
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
}

export default {
  AgentRequestSchema,
  OnboardingSchema,
  TekmetricConnectionSchema,
  ABTestSchema,
  FormulaExecutionSchema,
  AnalyticsQuerySchema,
  validate
};



















