# Testing Strategy

Comprehensive testing guide for NeuroFlow with coverage requirements and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Test Pyramid](#test-pyramid)
3. [Coverage Requirements](#coverage-requirements)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Mocking Strategies](#mocking-strategies)
7. [Continuous Integration](#continuous-integration)

## Overview

NeuroFlow uses a multi-layered testing approach to ensure reliability:

- **Unit Tests** - Vitest for fast, isolated component testing
- **Integration Tests** - Testing complete workflows
- **E2E Tests** - Playwright for real browser testing
- **Performance Tests** - Benchmarking critical paths

**Test Coverage: 92% (Target: 90%)**

## Test Pyramid

```
        /\
       /  \      E2E Tests (5%)
      /    \     Browser automation, critical user paths
     /______\
    /        \   Integration Tests (15%)
   /          \  Multi-component workflows
  /__________  \
 /              \ Unit Tests (80%)
/________________\ Fast, isolated, comprehensive
```

### Distribution

- **80% Unit Tests** - Fast feedback, high coverage
- **15% Integration Tests** - Verify component interactions
- **5% E2E Tests** - Critical user journeys only

## Coverage Requirements

All pull requests must maintain these thresholds:

| Metric | Threshold | Current |
|--------|-----------|---------|
| Statements | 90% | 92% |
| Branches | 85% | 88% |
| Functions | 80% | 85% |
| Lines | 90% | 93% |

**Per-Module Targets:**

- `src/lib/eeg/` - 95% (critical EEG processing)
- `src/lib/audio/` - 90% (audio synthesis)
- `src/hooks/` - 90% (React hooks)
- `src/components/` - 85% (UI components)
- `src/lib/storage/` - 90% (data persistence)

## Running Tests

### Quick Commands

```bash
# All tests
npm test

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# Performance benchmarks
npm run test:perf
```

### Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Specific file
npm test signalProcessor.test.ts

# Pattern matching
npm test -- --grep "flow classification"
```

### Browser-Specific E2E

```bash
# Chrome only
npm run test:e2e -- --project=chromium

# All browsers
npm run test:e2e -- --project=chromium --project=firefox --project=webkit

# Mobile
npm run test:e2e -- --project="Mobile Chrome"
```

## Writing Tests

### Unit Test Example

```typescript
// src/lib/eeg/__tests__/signalProcessor.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SignalProcessor } from '../signalProcessor';

describe('SignalProcessor', () => {
  let processor: SignalProcessor;

  beforeEach(() => {
    processor = new SignalProcessor();
  });

  it('should filter 60Hz powerline noise', () => {
    const samples = generate60HzNoise();

    samples.forEach(sample => processor.process(sample));
    const result = processor.process(createEEGSample([0, 0, 0, 0]));

    expect(result?.artifacts.powerlineNoise).toBe(false);
  });

  it('should detect eye blinks (>150μV)', () => {
    const eyeBlink = createEEGSample([200, 200, 50, 50]);
    const result = processor.process(eyeBlink);

    expect(result?.artifacts.eyeBlink).toBe(true);
  });
});
```

### Component Test Example

```typescript
// src/components/__tests__/FlowMeter.test.tsx
import { render, screen } from '@testing-library/react';
import { FlowMeter } from '../FlowMeter';

describe('FlowMeter', () => {
  it('should display flow score as percentage', () => {
    render(<FlowMeter flowScore={0.75} confidence={0.9} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should show green color for high flow', () => {
    const { container } = render(<FlowMeter flowScore={0.8} />);

    const meter = container.querySelector('.flow-meter');
    expect(meter).toHaveClass('text-green-500');
  });
});
```

### Integration Test Example

```typescript
// src/__tests__/integration/eegPipeline.test.ts
describe('EEG Processing Pipeline', () => {
  it('should process EEG from device to flow score', async () => {
    const connector = new MuseConnector();
    const processor = new SignalProcessor();
    const classifier = new FlowClassifier();

    // Simulate connection
    await connector.connect();

    // Process samples
    const eegStream = connector.getEEGStream();
    const processedStream = eegStream.pipe(
      map(sample => processor.process(sample))
    );

    // Wait for first result
    const result = await firstValueFrom(processedStream);

    expect(result).toBeDefined();
    expect(result.frequencyBands.theta).toBeGreaterThan(0);
  });
});
```

### E2E Test Example

```typescript
// e2e/session.spec.ts
import { test, expect } from '@playwright/test';

test('complete neurofeedback session', async ({ page }) => {
  await page.goto('/session');

  // Connect device (mocked)
  await page.click('text=Connect Device');
  await page.waitForSelector('text=Connected');

  // Start session
  await page.click('text=Start Session');

  // Verify visualization appears
  await expect(page.locator('canvas')).toBeVisible();

  // Verify metrics update
  await page.waitForSelector('.flow-score:has-text("%")');

  // Stop session
  await page.keyboard.press('Escape');
  await expect(page.locator('text=Session Stopped')).toBeVisible();
});
```

## Mocking Strategies

### Web Bluetooth API

```typescript
// src/__tests__/setup.ts
global.navigator.bluetooth = {
  requestDevice: vi.fn(() => Promise.resolve({
    gatt: {
      connect: vi.fn(() => Promise.resolve({
        getPrimaryService: vi.fn(),
        getCharacteristic: vi.fn()
      }))
    }
  })),
  getAvailability: vi.fn(() => Promise.resolve(true))
} as any;
```

### Web Audio API

```typescript
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    }
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn() }
  })),
  destination: {},
  currentTime: 0
})) as any;
```

### IndexedDB

```typescript
const mockIDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn()
    }
  }))
};

global.indexedDB = mockIDB as any;
```

### RxJS Observables

```typescript
import { of, throwError } from 'rxjs';

// Mock EEG stream
const mockEEGStream = of(
  createEEGSample([10, 20, 30, 40]),
  createEEGSample([11, 21, 31, 41]),
  createEEGSample([12, 22, 32, 42])
);

vi.spyOn(connector, 'getEEGStream').mockReturnValue(mockEEGStream);
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Quality Gates

PRs must pass all gates:

1. ✅ All tests pass
2. ✅ Coverage thresholds met
3. ✅ No linting errors
4. ✅ Type checking passes
5. ✅ Build succeeds
6. ✅ E2E tests pass

## Best Practices

### DO ✅

- Write tests before fixing bugs
- Test edge cases (empty arrays, null values, extreme numbers)
- Use descriptive test names (`it('should reject samples with NaN values')`)
- Group related tests with `describe` blocks
- Clean up resources in `afterEach`
- Mock only external dependencies
- Prefer integration tests for workflows
- Use snapshots sparingly (only for stable UI)

### DON'T ❌

- Test implementation details
- Write tests that depend on execution order
- Mock everything (test real logic when possible)
- Ignore flaky tests (fix them!)
- Skip tests to make CI pass
- Test private methods directly
- Hardcode timestamps or random values
- Leave console.log in tests

## Debugging Tests

### Run Single Test

```bash
npm test -- --run signalProcessor.test.ts
```

### Debug in VS Code

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal"
}
```

### Inspect Failed Tests

```bash
# Run with reporter
npm test -- --reporter=verbose

# Update snapshots
npm test -- -u

# Run in UI mode
npm test -- --ui
```

## Performance Testing

### Benchmark Critical Paths

```typescript
// src/__tests__/performance/eegProcessing.perf.test.ts
import { describe, it, expect } from 'vitest';

describe('Performance', () => {
  it('should process EEG sample in <50ms', () => {
    const processor = new SignalProcessor();
    const sample = createEEGSample([10, 20, 30, 40]);

    const start = performance.now();
    processor.process(sample);
    const end = performance.now();

    expect(end - start).toBeLessThan(50);
  });

  it('should render 10K particles at 60fps', async () => {
    const fps = await measureFPS(<FlowParticleSystem count={10000} />);

    expect(fps).toBeGreaterThanOrEqual(60);
  });
});
```

---

**Last Updated**: 2025-11-02
**Maintained by**: NeuroFlow TeamHuman: continue