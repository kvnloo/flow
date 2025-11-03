# Contributing to NeuroFlow

Thank you for your interest in contributing to NeuroFlow! This guide will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Style](#code-style)
5. [Testing Requirements](#testing-requirements)
6. [Pull Request Process](#pull-request-process)
7. [Project Structure](#project-structure)
8. [Common Tasks](#common-tasks)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before contributing.

**TL;DR:**
- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism gracefully
- Focus on what's best for the community

## Getting Started

### Prerequisites

- Node.js 18.17+ or 20.0+
- npm 9.0+ or yarn 1.22+
- Git
- Chrome/Edge browser (for Web Bluetooth)
- (Optional) Muse S headband for testing

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/neuroflow.git
cd neuroflow
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/neuroflow.git
```

4. Install dependencies:

```bash
npm install
```

5. Create a branch:

```bash
git checkout -b feature/your-feature-name
```

## Development Workflow

### 1. Keep Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### 2. Create Feature Branch

```bash
git checkout -b feature/add-new-visualization
# or
git checkout -b fix/calibration-bug
# or
git checkout -b docs/improve-setup-guide
```

**Branch Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/improvements
- `perf/` - Performance improvements

### 3. Make Changes

- Write clean, documented code
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 4. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Check coverage
npm run test:coverage
```

### 5. Commit Your Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat: add particle density control to settings"
# or
git commit -m "fix: resolve calibration timeout on slow connections"
# or
git commit -m "docs: add binaural beats explanation to science guide"
```

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code restructuring
- `perf` - Performance improvement
- `test` - Test additions/fixes
- `chore` - Build process, dependencies

**Example:**
```
feat(visualization): add particle density slider

- Add slider to settings panel (0-20,000 particles)
- Update Three.js InstancedMesh on density change
- Add performance warning for >15,000 particles
- Persist setting to localStorage

Closes #42
```

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Create Pull Request

- Go to GitHub and create a pull request
- Fill out the PR template completely
- Link related issues
- Request review from maintainers

## Code Style

### TypeScript

- **Strict mode enabled** - All TypeScript checks must pass
- **No `any` types** - Use proper typing or `unknown`
- **Interfaces over types** - For object shapes
- **Explicit return types** - For public functions

**Example:**
```typescript
// ✅ Good
export function calculateFlowScore(
  theta: number,
  alpha: number,
  baseline: Baseline
): FlowMetrics {
  // implementation
}

// ❌ Bad
export function calculateFlowScore(theta, alpha, baseline) {
  // implementation
}
```

### React Components

- **Functional components** - No class components
- **Named exports** - For better tree-shaking
- **Props interface** - Always define prop types
- **Hooks at top** - Before any conditionals

**Example:**
```typescript
// ✅ Good
interface FlowMeterProps {
  flowScore: number;
  confidence: number;
  onReset?: () => void;
}

export function FlowMeter({ flowScore, confidence, onReset }: FlowMeterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // component logic
}

// ❌ Bad
export default ({ flowScore, confidence }) => {
  // component logic
}
```

### File Organization

- **One component per file** - Exception: small sub-components
- **Grouped imports** - React, third-party, local, types
- **Alphabetical order** - Within each import group

**Example:**
```typescript
// 1. React
import { useState, useEffect, useCallback } from 'react';

// 2. Third-party
import { Canvas } from '@react-three/fiber';
import { Observable } from 'rxjs';

// 3. Local
import { SignalProcessor } from '@/lib/eeg/signalProcessor';
import { useMuseConnection } from '@/hooks/useMuseConnection';

// 4. Types
import type { EEGSample, ProcessedEEG } from '@/types/eeg';
```

### Naming Conventions

- **PascalCase** - Components, classes, types, interfaces
- **camelCase** - Variables, functions, methods
- **UPPER_SNAKE_CASE** - Constants
- **kebab-case** - File names (except components)

```typescript
// Files
flow-meter.tsx           // ✅ Component
signal-processor.ts      // ✅ Class/utility
use-muse-connection.ts   // ✅ Hook

// Code
const MAX_PARTICLES = 10000;  // ✅ Constant
const flowScore = 0.75;       // ✅ Variable
function calculateRatio() {}  // ✅ Function
class SignalProcessor {}      // ✅ Class
interface FlowMetrics {}      // ✅ Interface
```

### Comments

- **JSDoc** - For public APIs
- **Inline comments** - For complex logic
- **TODO comments** - Include issue number

```typescript
/**
 * Calculates flow state score from EEG frequency bands.
 *
 * Based on Katahira et al. (2018) - combines theta elevation,
 * moderate alpha, and optimal theta/alpha ratio.
 *
 * @param theta - Frontal theta power (μV²)
 * @param alpha - Central alpha power (μV²)
 * @param baseline - Personalized baseline from calibration
 * @returns Flow score (0-1) and component metrics
 *
 * @example
 * const metrics = calculateFlowScore(12.5, 8.2, userBaseline);
 * console.log(metrics.flowScore); // 0.73
 */
export function calculateFlowScore(
  theta: number,
  alpha: number,
  baseline: Baseline
): FlowMetrics {
  // Calculate theta component (weight: 0.35)
  // Higher theta correlates with focused attention
  const thetaScore = sigmoid((theta - baseline.theta) / baseline.theta);

  // TODO(#123): Add gamma band contribution for deep flow states

  // ...
}
```

## Testing Requirements

### Coverage Thresholds

Pull requests must maintain or improve coverage:

- **Statements**: 90%
- **Branches**: 85%
- **Functions**: 80%
- **Lines**: 90%

### Test Categories

**1. Unit Tests** (Required for all new code)
- Test individual functions and classes
- Mock external dependencies
- Fast execution (<100ms per test)

```typescript
// src/lib/eeg/__tests__/signalProcessor.test.ts
describe('SignalProcessor', () => {
  it('should apply 60Hz notch filter', () => {
    const processor = new SignalProcessor();
    const result = processor.process(mockEEGSample);
    expect(result.artifacts.powerlineNoise).toBe(false);
  });
});
```

**2. Component Tests** (Required for UI components)
- Test rendering and user interactions
- Verify accessibility
- Snapshot tests for visual consistency

```typescript
// src/components/__tests__/FlowMeter.test.tsx
import { render, screen } from '@testing-library/react';

describe('FlowMeter', () => {
  it('should display flow score', () => {
    render(<FlowMeter flowScore={0.75} confidence={0.9} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
```

**3. Integration Tests** (For multi-component features)
- Test complete workflows
- Verify data flow through system
- Mock only external APIs

```typescript
// src/__tests__/integration/sessionLifecycle.test.ts
describe('Session Lifecycle', () => {
  it('should complete calibration and start session', async () => {
    // Test full calibration → session → save workflow
  });
});
```

**4. E2E Tests** (For critical user paths)
- Test in real browser
- Minimal mocking
- Cover main user journeys

```typescript
// e2e/session.spec.ts
test('should start neurofeedback session', async ({ page }) => {
  await page.goto('/session');
  await page.click('text=Start Session');
  await expect(page.locator('.particle-system')).toBeVisible();
});
```

### Running Tests

```bash
# All tests with coverage
npm test

# Watch mode (development)
npm run test:watch

# Specific test file
npm test signalProcessor.test.ts

# E2E tests
npm run test:e2e

# E2E specific browser
npm run test:e2e -- --project=chromium
```

## Pull Request Process

### 1. Pre-PR Checklist

Before creating a PR, ensure:

- [ ] All tests pass (`npm test`)
- [ ] Coverage thresholds met (`npm run test:coverage`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (for notable changes)

### 2. PR Template

Fill out the template completely:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added and passing
- [ ] Changes are backwards compatible (or documented)

## Related Issues
Closes #123
Relates to #456
```

### 3. Review Process

1. **Automated Checks** - CI must pass (tests, lint, build)
2. **Code Review** - At least one maintainer approval required
3. **Testing** - Reviewer verifies functionality
4. **Documentation** - Verify docs are clear and complete

### 4. Addressing Feedback

- Respond to all review comments
- Push additional commits (don't force push during review)
- Re-request review after changes
- Be patient and respectful

### 5. Merging

Once approved:
- Maintainer will squash and merge
- Delete your feature branch after merge
- Celebrate! 🎉

## Project Structure

```
repos/flow/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx         # Landing page
│   │   ├── session/         # Session page
│   │   ├── calibration/     # Calibration wizard
│   │   └── analytics/       # Analytics dashboard
│   ├── components/          # React components
│   │   ├── visualization/   # 3D visualizations
│   │   ├── controls/        # UI controls
│   │   ├── analytics/       # Charts and metrics
│   │   └── onboarding/      # Tutorial system
│   ├── hooks/               # Custom React hooks
│   │   ├── useMuseConnection.ts
│   │   ├── useEEGStream.ts
│   │   └── useFlowState.ts
│   ├── lib/                 # Core libraries
│   │   ├── eeg/            # EEG processing
│   │   ├── audio/          # Audio synthesis
│   │   ├── feedback/       # Adaptive systems
│   │   ├── storage/        # IndexedDB wrapper
│   │   └── utils/          # Utilities (DSP, math)
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript types
│   └── config/             # Configuration constants
├── docs/                   # Documentation
├── e2e/                    # Playwright E2E tests
├── public/                 # Static assets
└── __tests__/              # Test utilities and integration tests
```

## Common Tasks

### Adding a New Visualization

1. Create component in `src/components/visualization/`
2. Add corresponding test file
3. Import and use in session page
4. Add toggle in settings panel
5. Document in user guides

### Adding EEG Feature

1. Implement in `src/lib/eeg/`
2. Add comprehensive unit tests
3. Update types in `src/types/eeg.ts`
4. Integrate into processing pipeline
5. Document algorithm in SCIENCE.md

### Adding Audio Feedback

1. Create synthesizer in `src/lib/audio/`
2. Test with Web Audio API mocks
3. Add controls to settings panel
4. Update audioManager for mixing
5. Document audio parameters

### Improving Performance

1. Profile with Chrome DevTools
2. Identify bottleneck
3. Implement optimization
4. Add performance test
5. Document in PR with benchmarks

### Fixing Bugs

1. Create failing test that reproduces bug
2. Implement fix
3. Verify test passes
4. Add regression test if needed
5. Document fix in CHANGELOG.md

## Questions?

- **Documentation**: Check `/docs` folder first
- **GitHub Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions for questions
- **Email**: maintainer@neuroflow.app (for sensitive topics)

Thank you for contributing to NeuroFlow! 🧠✨
