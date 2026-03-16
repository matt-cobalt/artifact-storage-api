# QA & Testing Infrastructure
**Comprehensive Testing Framework for 210 Mathematical Formulas**

**Version:** 1.0  
**Date:** 2024-12-21  
**Status:** Production-Ready - Testing Standards

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Coverage Requirements](#test-coverage-requirements)
3. [Test Suites](#test-suites)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Testing Tools](#testing-tools)
6. [Performance Testing](#performance-testing)

---

## Testing Strategy

### Testing Pyramid

**Level 1: Unit Tests (70% of tests)**
- Test individual functions, formulas, utilities
- Fast execution (<1 second per test)
- High coverage (95%+ for critical code)
- Isolated (no dependencies, mocked)

**Level 2: Integration Tests (20% of tests)**
- Test component interactions (agents, APIs, databases)
- Moderate execution (<10 seconds per test)
- Medium coverage (80%+ for critical paths)
- Real dependencies (databases, external services in test mode)

**Level 3: End-to-End Tests (10% of tests)**
- Test complete user workflows (customer journey)
- Slow execution (<60 seconds per test)
- Critical paths only (happy path, error paths)
- Full stack (real services, test data)

---

### Testing Principles

1. **Test-Driven Development (TDD):** Write tests before code when possible
2. **Continuous Testing:** Run tests on every commit (CI/CD)
3. **Fast Feedback:** Tests should run quickly (<5 minutes total)
4. **Isolation:** Tests should be independent (no shared state)
5. **Deterministic:** Tests should produce same results every run

---

## Test Coverage Requirements

### Formula Coverage (210 Mathematical Formulas)

**Target: 100% Coverage**

**Categories:**
- **Control Theory (18 formulas):** PID controller, feedback control, stability analysis
- **Information Theory (38 formulas):** Shannon entropy, mutual information, channel capacity
- **Queuing Theory (20 formulas):** M/M/c queues, Little's Law, workload balancing
- **Complex Systems (30 formulas):** System dynamics, network effects, emergence
- **Markov Processes (25 formulas):** State transitions, probability distributions
- **Game Theory (15 formulas):** Nash equilibrium, decision theory
- **Bayesian Statistics (20 formulas):** Bayesian inference, prior/posterior
- **Optimization (24 formulas):** Linear programming, gradient descent, convex optimization

**Test Requirements:**
- Unit test for each formula (input validation, output correctness)
- Edge case testing (boundary conditions, invalid inputs)
- Performance testing (execution time <10ms per formula)
- Integration testing (formulas used in agents, workflows)

---

### Agent Coverage (25 Agents)

**Target: 80% Coverage**

**Agents:**
- OTTO (voice AI agent)
- Squad agents (CAL, FLO, DEX, etc.)
- Forge agents (DEPLOY, MONITOR, INTEL, LANCE)
- NEXUS (orchestration agent)

**Test Requirements:**
- Unit tests for agent logic (decision-making, coordination)
- Integration tests for agent communication (NEXUS routing)
- End-to-end tests for agent workflows (customer journey)

---

### API Coverage (REST APIs)

**Target: 90% Coverage**

**Endpoints:**
- Customer APIs (CRUD operations)
- Location APIs (CRUD operations)
- Call APIs (retrieve, list)
- Appointment APIs (CRUD operations)
- Integration APIs (CRUD operations)
- Knowledge Graph APIs (queries, entity resolution)

**Test Requirements:**
- Unit tests for API handlers (request validation, response formatting)
- Integration tests for API endpoints (database interactions)
- End-to-end tests for API workflows (complete user scenarios)

---

## Test Suites

### Unit Tests

**Location:** `src/**/__tests__/*.test.ts`

**Example: Control Theory Formulas**
```typescript
// src/lib/__tests__/control-theory.test.ts
import { pidControl, PIDState } from '../control-theory.js';

describe('PID Control', () => {
  it('should calculate PID correction correctly', () => {
    const target = 100;
    const current = 80;
    const kp = 0.1;
    const ki = 0.01;
    const kd = 0.05;
    const state: PIDState = {
      errorHistory: [],
      lastError: 0,
      dt: 1.0
    };

    const result = pidControl(target, current, kp, ki, kd, state);
    
    expect(result.totalCorrection).toBeCloseTo(2.0, 2);
    expect(result.proportional).toBeCloseTo(2.0, 2);
  });

  it('should handle edge cases (target equals current)', () => {
    const result = pidControl(100, 100, 0.1, 0.01, 0.05, { errorHistory: [], lastError: 0, dt: 1.0 });
    expect(result.totalCorrection).toBe(0);
  });
});
```

**Example: Agent Logic**
```typescript
// src/agents/__tests__/otto.test.ts
import { processIncomingCall } from '../otto.js';

describe('OTTO Agent', () => {
  it('should process incoming call correctly', async () => {
    const call = {
      callSid: 'test123',
      from: '+15551234567',
      to: '+15557654321'
    };

    const result = await processIncomingCall(call);
    
    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
  });
});
```

**Run Unit Tests:**
```bash
npm test                    # Run all unit tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

---

### Integration Tests

**Location:** `src/**/__tests__/*.integration.test.ts`

**Example: Agent Coordination**
```typescript
// src/agents/__tests__/nexus.integration.test.ts
import { coordinateAgents } from '../nexus.js';
import { mockCAL, mockFLO, mockDEX } from '../mocks/agents.js';

describe('NEXUS Agent Coordination', () => {
  it('should coordinate multiple agents successfully', async () => {
    const request = {
      type: 'price_and_schedule',
      customerId: 'cust123',
      serviceType: 'oil_change'
    };

    const result = await coordinateAgents(request);
    
    expect(result.pricing).toBeDefined();
    expect(result.availability).toBeDefined();
    expect(result.diagnostics).toBeDefined();
  });
});
```

**Example: Database Integration**
```typescript
// src/lib/__tests__/database.integration.test.ts
import { createCustomer, getCustomer } from '../database.js';

describe('Database Integration', () => {
  it('should create and retrieve customer', async () => {
    const customer = await createCustomer({
      name: 'Test Customer',
      email: 'test@example.com'
    });

    const retrieved = await getCustomer(customer.id);
    
    expect(retrieved.name).toBe('Test Customer');
    expect(retrieved.email).toBe('test@example.com');
  });
});
```

**Run Integration Tests:**
```bash
npm run test:integration    # Run integration tests
```

---

### End-to-End Tests

**Location:** `tests/e2e/*.e2e.test.ts`

**Example: Customer Journey**
```typescript
// tests/e2e/customer-journey.e2e.test.ts
import { test, expect } from '@playwright/test';

test('Complete customer journey: Call → Appointment → Dashboard', async ({ page }) => {
  // 1. Customer calls shop
  const callResponse = await fetch('http://localhost:3000/api/twilio/voice/incoming', {
    method: 'POST',
    body: new URLSearchParams({
      CallSid: 'test123',
      From: '+15551234567',
      To: '+15557654321'
    })
  });
  expect(callResponse.ok).toBe(true);

  // 2. Verify appointment created
  const appointments = await fetch('http://localhost:3000/api/appointments?customerId=cust123');
  const appointmentsData = await appointments.json();
  expect(appointmentsData.length).toBeGreaterThan(0);

  // 3. Verify dashboard updated
  await page.goto('http://localhost:3000/dashboard');
  await expect(page.locator('[data-testid="conversion-rate"]')).toBeVisible();
});
```

**Run E2E Tests:**
```bash
npm run test:e2e           # Run E2E tests
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

**Location:** `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:e2e

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
```

---

### Test Execution on Pull Request

**Requirements:**
- All unit tests must pass
- All integration tests must pass
- Code coverage must be >80%
- Linting must pass (no errors)
- Build must succeed

**Blocking:**
- PR cannot be merged if tests fail
- PR cannot be merged if coverage drops below 80%

---

## Testing Tools

### Unit Testing: Jest

**Configuration:** `jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts']
};
```

---

### E2E Testing: Playwright

**Configuration:** `playwright.config.ts`
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### Code Coverage: Codecov

**Integration:** GitHub Actions + Codecov
- Automatic coverage reports on every PR
- Coverage badges in README
- Coverage trends tracking

---

## Performance Testing

### Formula Performance Tests

**Target: <10ms per formula execution**

```typescript
// src/lib/__tests__/performance.test.ts
import { pidControl } from '../control-theory.js';

describe('Formula Performance', () => {
  it('PID control should execute in <10ms', () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      pidControl(100, 80, 0.1, 0.01, 0.05, { errorHistory: [], lastError: 0, dt: 1.0 });
    }
    
    const duration = performance.now() - start;
    const avgTime = duration / 1000;
    
    expect(avgTime).toBeLessThan(10); // <10ms per execution
  });
});
```

---

### API Performance Tests

**Target: <200ms response time (95th percentile)**

```typescript
// tests/performance/api.test.ts
import { performance } from 'perf_hooks';

describe('API Performance', () => {
  it('GET /customers should respond in <200ms', async () => {
    const times: number[] = [];
    
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await fetch('http://localhost:3000/api/customers');
      const duration = performance.now() - start;
      times.push(duration);
    }
    
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    
    expect(p95).toBeLessThan(200); // <200ms at 95th percentile
  });
});
```

---

### Load Testing: k6

**Configuration:** `tests/load/load-test.js`
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
};

export default function () {
  let response = http.get('http://localhost:3000/api/customers');
  check(response, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
```

**Run Load Tests:**
```bash
npm run test:load          # Run load tests
```

---

**QA & Testing Infrastructure Complete**  
**Status: Production-Ready - Testing Standards**  
**Target: 100% formula coverage, 80%+ overall coverage, 0 regressions**



