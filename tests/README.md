# Test Infrastructure

This directory contains the test infrastructure for the Flow project.

## Directory Structure

```
tests/
├── setup.ts              # Global test setup for Vitest
├── unit/                 # Unit tests (isolated component/function tests)
│   └── example.test.ts
├── integration/          # Integration tests (component interaction tests)
│   └── example.test.tsx
└── e2e/                  # End-to-end tests (full user flow tests)
    └── example.spec.ts
```

## Running Tests

### Unit & Integration Tests (Vitest)

```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test tests/unit/example.test.ts
```

### End-to-End Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests for specific browser
npm run test:e2e -- --project=chromium

# Run E2E tests in headed mode (see browser)
npm run test:e2e -- --headed

# Debug E2E tests
npm run test:e2e -- --debug
```

## Writing Tests

### Unit Tests

Unit tests should test isolated functionality:

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should return expected value', () => {
    expect(myFunction(input)).toBe(expectedOutput);
  });
});
```

### Integration Tests

Integration tests should test component interactions:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('should render with props', () => {
    render(<MyComponent prop="value" />);
    expect(screen.getByText('value')).toBeInTheDocument();
  });
});
```

### E2E Tests

E2E tests should test complete user flows:

```typescript
import { test, expect } from '@playwright/test';

test('user can complete workflow', async ({ page }) => {
  await page.goto('/');
  await page.click('button');
  await expect(page.locator('.result')).toBeVisible();
});
```

## Configuration Files

- `vitest.config.ts` - Vitest configuration for unit/integration tests
- `playwright.config.ts` - Playwright configuration for E2E tests
- `setup.ts` - Global setup for Vitest tests

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with setup, execution, and verification phases
4. **Mock External Dependencies**: Mock API calls, timers, and external services
5. **Test User Behavior**: Focus on testing user interactions, not implementation details
6. **Keep Tests Fast**: Unit tests should run in milliseconds, integration tests in seconds
7. **Coverage Goals**: Aim for >80% code coverage, but prioritize meaningful tests over coverage numbers

## Continuous Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Scheduled runs (nightly)

CI configuration includes:
- Parallel test execution
- Multiple browser testing (Chromium, Firefox, WebKit)
- Coverage reporting
- Test result artifacts
