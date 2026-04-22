# Contributing to Flow Orchestrator TUI

Thank you for your interest in contributing to Flow Orchestrator TUI! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to professional standards of conduct:

- **Be Respectful**: Treat all contributors with respect and professionalism
- **Be Constructive**: Provide helpful, actionable feedback
- **Be Collaborative**: Work together toward project goals
- **Be Inclusive**: Welcome contributors of all skill levels

## Getting Started

### Prerequisites

- **Rust**: 1.80.0 or later ([install](https://www.rust-lang.org/tools/install))
- **Git**: For version control
- **Terminal**: With true color support for best development experience
- **Editor**: VS Code with rust-analyzer recommended, but any editor works

### First Steps

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then:
   git clone https://github.com/YOUR_USERNAME/evolve.git
   cd evolve/repos/flow
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/kvnloo/evolve.git
   ```

3. **Install dependencies**
   ```bash
   cargo build
   ```

4. **Run tests**
   ```bash
   cargo test
   ```

5. **Run the application**
   ```bash
   cargo run
   ```

## Development Setup

### Recommended Tools

- **rust-analyzer**: LSP for Rust (VS Code extension)
- **clippy**: Rust linter (`rustup component add clippy`)
- **rustfmt**: Code formatter (`rustup component add rustfmt`)
- **cargo-watch**: Auto-rebuild on changes (`cargo install cargo-watch`)

### Development Workflow

```bash
# Watch and rebuild on changes
cargo watch -x check -x test

# Run with debug output
RUST_LOG=debug cargo run

# Run specific tests
cargo test test_name

# Format code
cargo fmt

# Run linter
cargo clippy
```

## How to Contribute

### Types of Contributions

1. **Bug Fixes**: Fix issues in existing functionality
2. **Features**: Add new capabilities (discuss in issue first)
3. **Documentation**: Improve docs, examples, or comments
4. **Tests**: Add test coverage for existing code
5. **Performance**: Optimize existing functionality
6. **Framework Adapters**: Add support for new orchestration frameworks

### Before You Start

1. **Check existing issues**: Search for related issues/PRs
2. **Open an issue**: Discuss significant changes before implementing
3. **Get feedback**: Ensure your approach aligns with project goals
4. **Claim the issue**: Comment on the issue to avoid duplicate work

## Coding Standards

### Rust Style Guide

Follow the [Rust Style Guide](https://doc.rust-lang.org/1.0.0/style/README.html):

- Use `rustfmt` for automatic formatting
- Run `clippy` and address warnings
- Prefer explicit types over type inference when it aids clarity
- Use meaningful variable and function names

### Code Organization

```rust
// Module structure
pub mod module_name {
    // Imports
    use std::collections::HashMap;
    use crate::other_module;

    // Constants
    const MAX_SIZE: usize = 1024;

    // Types
    pub struct MyType {
        field: String,
    }

    // Implementations
    impl MyType {
        pub fn new() -> Self {
            Self {
                field: String::new(),
            }
        }
    }

    // Free functions
    pub fn helper_function() {}

    // Tests
    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_something() {}
    }
}
```

### Documentation Standards

- **Module docs**: Every module should have `//!` module-level documentation
- **Public APIs**: All public items must have `///` doc comments
- **Examples**: Include `# Example` sections for non-trivial public APIs
- **Panics**: Document panic conditions with `# Panics`
- **Errors**: Document error conditions with `# Errors`
- **Safety**: Document safety requirements with `# Safety` for unsafe code

Example:
```rust
/// Creates a new agent with the specified configuration.
///
/// # Arguments
///
/// * `name` - Unique identifier for the agent
/// * `role` - The role this agent will perform
///
/// # Returns
///
/// Returns `Ok(Agent)` on success, or `Err(AgentError)` if validation fails.
///
/// # Errors
///
/// Returns `AgentError::InvalidName` if the name is empty or contains invalid characters.
///
/// # Example
///
/// ```rust
/// use flow_orchestrator_tui::state::{Agent, AgentRole};
///
/// let agent = Agent::new("researcher-1", AgentRole::Researcher)?;
/// assert_eq!(agent.name, "researcher-1");
/// # Ok::<(), Box<dyn std::error::Error>>(())
/// ```
pub fn new(name: &str, role: AgentRole) -> Result<Agent, AgentError> {
    // Implementation
}
```

### Error Handling

- Use `thiserror` for error types
- Provide context with `anyhow` where appropriate
- Avoid `unwrap()` and `expect()` in library code
- Use `?` operator for error propagation
- Return `Result<T, E>` for fallible operations

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum FlowError {
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Agent {0} not found")]
    AgentNotFound(AgentId),
}
```

### Async Code

- Use `async/await` syntax
- Prefer `tokio::spawn` for background tasks
- Use channels for communication between tasks
- Document async runtime requirements

```rust
/// Starts the event listener in the background.
///
/// This spawns a new Tokio task that runs until the application shuts down.
pub async fn start_listener(&self) -> Result<()> {
    let event_tx = self.event_tx.clone();

    tokio::spawn(async move {
        // Background task implementation
    });

    Ok(())
}
```

## Testing Guidelines

### Test Coverage

- Aim for >80% code coverage for new features
- All public APIs must have tests
- Include edge cases and error conditions
- Test both success and failure paths

### Test Organization

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Unit tests
    #[test]
    fn test_basic_functionality() {
        let result = function_under_test();
        assert_eq!(result, expected_value);
    }

    // Async tests
    #[tokio::test]
    async fn test_async_operation() {
        let result = async_function().await;
        assert!(result.is_ok());
    }

    // Error cases
    #[test]
    fn test_error_handling() {
        let result = failing_function();
        assert!(matches!(result, Err(ErrorType::Specific)));
    }
}
```

### Integration Tests

Place integration tests in `tests/` directory:

```rust
// tests/integration_test.rs
use flow_orchestrator_tui::{App, Result};

#[tokio::test]
async fn test_app_initialization() -> Result<()> {
    let app = App::new().await?;
    assert!(app.state.is_running());
    Ok(())
}
```

### Running Tests

```bash
# All tests
cargo test

# Specific test
cargo test test_name

# With output
cargo test -- --nocapture

# Integration tests only
cargo test --test '*'

# With coverage (requires cargo-tarpaulin)
cargo tarpaulin --out Html
```

## Commit Guidelines

### Commit Message Format

```
type(scope): brief description

Detailed explanation of what changed and why.

Fixes #issue_number
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring without behavior change
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.

### Examples

```bash
# Good commits
feat(auth): implement OAuth PKCE flow
fix(ui): prevent panic on terminal resize
docs(api): add examples for EventBus usage
refactor(state): simplify agent graph operations
test(events): add integration tests for event bus

# Bad commits
"fixed stuff"
"updated code"
"changes"
```

## Pull Request Process

### Before Submitting

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run quality checks**
   ```bash
   cargo fmt --check
   cargo clippy -- -D warnings
   cargo test
   ```

3. **Update documentation** if needed
   - Update README.md for user-facing changes
   - Update API.md for public API changes
   - Add/update doc comments

4. **Add tests** for new functionality

### Submitting a PR

1. **Create a descriptive PR title**
   - Use the same format as commit messages
   - Example: `feat(widgets): add sparkline widget for metrics`

2. **Fill out the PR template**
   - Describe what changed and why
   - Reference related issues
   - Add screenshots for UI changes
   - Note breaking changes

3. **Request review** from maintainers

4. **Address feedback**
   - Respond to all comments
   - Make requested changes
   - Re-request review after updates

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass (`cargo test`)
- [ ] Clippy produces no warnings (`cargo clippy`)
- [ ] Code is formatted (`cargo fmt`)
- [ ] Documentation is updated
- [ ] Commit messages follow guidelines
- [ ] PR description is clear and complete
- [ ] Breaking changes are documented

## Project Structure

```
flow-orchestrator-tui/
├── src/
│   ├── app/              # Application logic
│   ├── auth/             # Authentication
│   ├── events/           # Event system
│   ├── state/            # State management
│   ├── ui/               # User interface
│   ├── error.rs          # Error types
│   ├── lib.rs            # Library entry
│   └── main.rs           # Binary entry
├── tests/                # Integration tests
├── docs/                 # Documentation
│   ├── architecture/     # Design docs
│   ├── implementation/   # Implementation guides
│   ├── API.md            # API reference
│   └── CONTRIBUTING.md   # This file
├── Cargo.toml            # Project metadata
└── README.md             # Project overview
```

## Documentation

### Types of Documentation

1. **Code Documentation**
   - Module-level (`//!`)
   - Item-level (`///`)
   - Inline comments for complex logic

2. **User Documentation**
   - README.md (overview and quick start)
   - Usage guides
   - Configuration examples

3. **Developer Documentation**
   - API.md (public API reference)
   - Architecture docs
   - Implementation guides

### Building Documentation

```bash
# Generate and open API docs
cargo doc --open

# Generate docs with private items
cargo doc --document-private-items --open
```

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Feature Requests**: Open a GitHub Issue with [Feature Request] prefix
- **Security Issues**: Email maintainers directly (see README)

## Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Project README (for major features)

Thank you for contributing to Flow Orchestrator TUI!
