# Contributing to Flow

Thank you for your interest in contributing to Flow! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain professionalism

## Getting Started

1. **Fork the repository**
   ```bash
   gh repo fork evolve/flow --clone
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### 1. Write Tests First
Follow TDD principles:
- Write failing test
- Implement feature
- Ensure tests pass
- Refactor

### 2. Code Style
- Follow existing code conventions
- Use TypeScript for type safety
- Run linter: `npm run lint`
- Format code: `npm run format`

### 3. Commit Messages
Use conventional commits format:
```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(workflow): add parallel execution support`
- `fix(orchestrator): resolve race condition in task queue`
- `docs(readme): update installation instructions`

### 4. Pull Requests

**Before submitting:**
- [ ] All tests pass (`npm test`)
- [ ] Code is linted (`npm run lint`)
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

**PR Description should include:**
- Summary of changes
- Related issue numbers
- Testing approach
- Breaking changes (if any)

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.spec.ts
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update inline documentation
- Add examples for new features

## Project Structure

```
flow/
├── src/           # Source code
├── tests/         # Test files
├── docs/          # Documentation
├── examples/      # Usage examples
└── scripts/       # Build and utility scripts
```

## Review Process

1. Submit pull request
2. Automated checks run (CI/CD)
3. Code review by maintainers
4. Address feedback
5. Approval and merge

## Need Help?

- Check existing issues and discussions
- Ask questions in pull request comments
- Join community discussions

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to Flow!
