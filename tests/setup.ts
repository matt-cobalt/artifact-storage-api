/**
 * Test Setup and Utilities
 * Provides mocks and helpers for Squad agent tests
 */

import { jest } from '@jest/globals';

// Mock Supabase client
export const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  })),
};

// Mock Claude API
export const mockClaudeAPI = jest.fn().mockResolvedValue({
  json: jest.fn().mockResolvedValue({
    content: [{
      text: JSON.stringify({
        greeting: 'Test greeting',
        recommended_services: [],
        confidence: 0.85,
        rationale: 'Test rationale',
      }),
    }],
  }),
  ok: true,
  status: 200,
});

// Mock fetch globally
global.fetch = jest.fn(mockClaudeAPI) as jest.Mock;

// Mock ArtifactStorage
export const mockArtifactStorage = {
  create: jest.fn().mockResolvedValue({ artifact_id: 'test-artifact-id' }),
  get: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue(null),
};

// Mock formula execution
export const mockExecuteFormula = jest.fn().mockResolvedValue({
  result: { value: 100, confidence: 0.9 },
});

// Test utilities
export const createMockCustomer = (overrides = {}) => ({
  id: 'cust_001',
  name: 'John Doe',
  phone: '555-0100',
  email: 'john@example.com',
  vehicles: [{
    id: 'veh_001',
    vin: '1HGBH41JXMN109186',
    make: 'Honda',
    model: 'Civic',
    year: 2015,
  }],
  repair_orders: [{
    id: 'ro_001',
    total: 450.00,
    status: 'completed',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  }],
  ...overrides,
});

export const createMockRO = (overrides = {}) => ({
  id: 'ro_001',
  customer_id: 'cust_001',
  vehicle_id: 'veh_001',
  total: 450.00,
  status: 'open',
  line_items: [
    { description: 'Brake pads', price: 120.00, cost: 70.00 },
  ],
  ...overrides,
});

// Performance timing utility
export const measurePerformance = async <T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> => {
  const start = Date.now();
  const result = await fn();
  const timeMs = Date.now() - start;
  return { result, timeMs };
};
