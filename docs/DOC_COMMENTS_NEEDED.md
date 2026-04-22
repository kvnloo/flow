# Documentation Comments Needed

This document lists source files that need documentation comments added to meet project standards.

## Documentation Standards

All public items (`pub`) should have `///` doc comments with:
- Brief description
- `# Arguments` section (for functions with parameters)
- `# Returns` section (for non-unit return types)
- `# Errors` section (for `Result` return types)
- `# Panics` section (if panics are possible)
- `# Example` section (for non-trivial public APIs)

Modules should have `//!` module-level documentation.

---

## Critical (Public API - High Priority)

### src/state/agent.rs
**Status**: Needs comprehensive documentation

Required documentation:
- [ ] Module-level docs explaining agent lifecycle
- [ ] `Agent` struct fields documentation
- [ ] `Agent::new()` with example
- [ ] `AgentId` type documentation
- [ ] `AgentRole` variant descriptions
- [ ] `AgentStatus` variant descriptions
- [ ] `AgentMetrics` struct documentation

**Example**:
```rust
/// Represents an AI agent in the orchestration system.
///
/// Agents are the core execution units that perform tasks. Each agent has a
/// specific role, maintains its own state, and can communicate with other agents.
///
/// # Example
///
/// ```rust
/// use flow_orchestrator_tui::state::{Agent, AgentRole};
///
/// let agent = Agent::new("researcher-1", AgentRole::Researcher);
/// assert_eq!(agent.status, AgentStatus::Idle);
/// ```
pub struct Agent {
    /// Unique identifier for this agent
    pub id: AgentId,
    // ...
}
```

### src/state/task.rs
**Status**: Needs comprehensive documentation

Required documentation:
- [ ] Module-level docs explaining task management
- [ ] `Task` struct and all fields
- [ ] `Task::new()` with example
- [ ] `TaskStatus` enum and variants
- [ ] `TaskType` enum and variants
- [ ] `Priority` enum and variants
- [ ] `TaskError` error type

### src/state/session.rs
**Status**: Needs comprehensive documentation

Required documentation:
- [ ] Module-level docs explaining session lifecycle
- [ ] `Session` struct documentation
- [ ] `Session::new()` with example
- [ ] `SessionType` enum variants
- [ ] `SessionStatus` enum variants
- [ ] `SessionConfig` struct

### src/state/graph.rs
**Status**: Needs comprehensive documentation

Required documentation:
- [ ] Module-level docs explaining graph structure
- [ ] `AgentGraph` struct and methods
- [ ] `Cluster` struct documentation
- [ ] `ClusterType` enum variants
- [ ] `Topology` enum variants
- [ ] Graph algorithms documentation

### src/state/metrics.rs
**Status**: Needs comprehensive documentation

Required documentation:
- [ ] Module-level docs explaining metrics collection
- [ ] `MetricsHistory` struct and methods
- [ ] `MetricPoint` struct
- [ ] `MetricType` enum variants
- [ ] `MetricsSnapshot` struct
- [ ] Aggregation methods documentation

---

## Important (Event System - Medium Priority)

### src/events/agent.rs
**Status**: Needs documentation

Required documentation:
- [ ] Module-level docs
- [ ] `AgentEvent` struct
- [ ] `AgentEventPayload` enum variants
- [ ] Event construction helpers

### src/events/bus.rs
**Status**: Needs documentation

Required documentation:
- [ ] Module-level docs explaining pub/sub pattern
- [ ] `EventBus::new()` with example
- [ ] `EventBus::subscribe()` with filtering examples
- [ ] `EventBus::publish()` with error handling
- [ ] `EventFilter` struct and methods
- [ ] `EventSubscriber` trait

### src/events/handler.rs
**Status**: Needs documentation

Required documentation:
- [ ] Module-level docs explaining handler chain
- [ ] `EventHandler` trait with implementation example
- [ ] `HandleResult` enum variants
- [ ] `HandlerChain` composition
- [ ] Built-in handler documentation (LoggingHandler, MetricsHandler)

### src/events/keyboard.rs
**Status**: Needs documentation

Required documentation:
- [ ] Module-level docs explaining keyboard handling
- [ ] `KeyHandler` trait
- [ ] `KeyBinding` struct
- [ ] `ModifierKeys` flags
- [ ] `InputMode` enum variants
- [ ] Modal key handling examples

### src/events/schema.rs
**Status**: Needs documentation

Required documentation:
- [ ] Module-level docs explaining event schema
- [ ] `Event` struct with all fields
- [ ] `EventType` enum and all variants
- [ ] `EventCategory` enum variants
- [ ] `EventSource` struct
- [ ] `EventMetadata` struct
- [ ] `Severity` levels
- [ ] `Framework` enum

---

## Standard (Application Code - Lower Priority)

### src/app/config.rs
**Status**: Needs documentation

Required documentation:
- [ ] Module-level docs
- [ ] `AppConfig::load()` with configuration sources
- [ ] Configuration file format example
- [ ] Environment variable documentation
- [ ] Settings structs (AppSettings, UiSettings, etc.)

### src/app/state.rs
**Status**: Needs documentation

Required documentation:
- [ ] Module-level docs
- [ ] `AppState` struct
- [ ] `Dashboard` enum variants
- [ ] `Mode` enum variants
- [ ] State transition documentation
- [ ] Scroll state management

### src/ui/theme.rs
**Status**: Partially documented, needs completion

Required documentation:
- [ ] Module-level docs explaining theming system
- [ ] `FlowTheme` struct and all color fields
- [ ] `StyleGuide` constants
- [ ] Theme customization examples
- [ ] Color palette documentation

### src/ui/widgets/mod.rs
**Status**: Needs documentation

Required documentation:
- [ ] Module-level docs explaining widget system
- [ ] Widget trait documentation
- [ ] Common widget patterns

### src/ui/widgets/agent_card.rs
**Status**: Needs implementation and docs

Required documentation:
- [ ] Widget purpose and usage
- [ ] Rendering behavior
- [ ] Configuration options
- [ ] Example usage

### src/ui/widgets/log_viewer.rs
**Status**: Needs implementation and docs

Required documentation:
- [ ] Widget purpose and usage
- [ ] Filtering capabilities
- [ ] Scrolling behavior
- [ ] Example usage

### src/ui/widgets/progress_gauge.rs
**Status**: Needs implementation and docs

Required documentation:
- [ ] Widget purpose and usage
- [ ] Visual representation
- [ ] Configuration options
- [ ] Example usage

### src/ui/widgets/sparkline_widget.rs
**Status**: Needs implementation and docs

Required documentation:
- [ ] Widget purpose and usage
- [ ] Data format requirements
- [ ] Scaling behavior
- [ ] Example usage

### src/ui/dashboards/overview.rs
**Status**: Needs documentation

Required documentation:
- [ ] Dashboard purpose and layout
- [ ] Rendered components
- [ ] Data requirements
- [ ] Navigation

### src/ui/dashboards/flow_view.rs
**Status**: Needs documentation

Required documentation:
- [ ] Dashboard purpose (agent graph visualization)
- [ ] Graph layout algorithm
- [ ] Interaction model
- [ ] Example usage

### src/ui/dashboards/metrics.rs
**Status**: Needs documentation

Required documentation:
- [ ] Dashboard purpose (metrics visualization)
- [ ] Displayed metrics
- [ ] Visualization types
- [ ] Time range selection

### src/ui/dashboards/agent_focus.rs
**Status**: Needs documentation

Required documentation:
- [ ] Dashboard purpose (single agent view)
- [ ] Displayed information
- [ ] Agent selection
- [ ] Detail views

---

## Internal (Private Implementation)

These are lower priority but should still have clear inline comments:

### src/app/mod.rs
- Event handling logic
- Terminal setup/teardown
- Main event loop

### src/error.rs
- Error conversion implementations
- Error context

### src/auth/oauth.rs
**Status**: Well documented ✅ (Good example for other modules)

---

## Documentation Examples

### Good Example (from src/auth/oauth.rs):

```rust
/// Generate PKCE parameters (code_verifier and code_challenge)
///
/// # PKCE Flow
/// 1. Generate random `code_verifier` (128 characters)
/// 2. Create `code_challenge` = BASE64URL(SHA256(code_verifier))
/// 3. Send `code_challenge` to authorization server
/// 4. Receive authorization code
/// 5. Send `code_verifier` to exchange code for token
///
/// This prevents authorization code interception attacks.
pub fn generate_pkce_params() -> Result<(String, String)>
```

### Needs Improvement Example:

```rust
// Current (insufficient):
pub struct Agent {
    pub id: AgentId,
    pub name: String,
    // ...
}

// Should be:
/// Represents an AI agent in the orchestration system.
///
/// Agents are autonomous execution units that perform tasks within a session.
/// Each agent has a unique identifier, role, status, and maintains metrics
/// about its execution.
///
/// # Lifecycle
///
/// Agents transition through states: Idle → Running → Completed/Failed
///
/// # Example
///
/// ```rust
/// use flow_orchestrator_tui::state::{Agent, AgentRole};
///
/// let agent = Agent::new("researcher-1", AgentRole::Researcher);
/// assert_eq!(agent.status, AgentStatus::Idle);
/// ```
pub struct Agent {
    /// Unique identifier (format: "{role}-{number}")
    pub id: AgentId,

    /// Human-readable name for display
    pub name: String,

    /// Agent's specialized role in the system
    pub role: AgentRole,

    /// Current execution status
    pub status: AgentStatus,

    /// Performance metrics collected during execution
    pub metrics: AgentMetrics,

    /// Timestamp when agent was created
    pub created_at: DateTime<Utc>,

    /// Timestamp of last status update
    pub updated_at: DateTime<Utc>,
}
```

---

## Action Items

1. **High Priority** (Public API surface):
   - [ ] Complete state module documentation (agent, task, session, graph, metrics)
   - [ ] Complete events module documentation (bus, handler, schema)

2. **Medium Priority** (Core functionality):
   - [ ] Document application configuration
   - [ ] Document UI theming system
   - [ ] Document widget implementations

3. **Lower Priority** (Internal):
   - [ ] Add inline comments for complex algorithms
   - [ ] Document private helper functions
   - [ ] Add module-level implementation notes

---

## Documentation Review Checklist

When adding documentation, ensure:

- [ ] All public items have doc comments
- [ ] Examples compile and run (use `# Ok::<(), Error>(())` for Result examples)
- [ ] Cross-references use proper syntax: `` [`StateManager`] ``
- [ ] Code blocks specify language: ` ```rust `
- [ ] Panics, errors, and safety are documented
- [ ] Complex behavior has detailed explanation
- [ ] Related functions are cross-referenced

Run `cargo doc` to verify documentation builds without warnings.
