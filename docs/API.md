# Flow Orchestrator TUI - API Reference

Complete public API documentation for Flow Orchestrator TUI library.

## Table of Contents

- [Application](#application)
- [Events](#events)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Configuration](#configuration)

---

## Application

### `App`

Main application structure that manages the TUI lifecycle.

```rust
pub struct App {
    pub state: AppState,
    pub config: AppConfig,
    // ... private fields
}
```

#### Methods

##### `new() -> Result<Self>`

Creates a new application instance with default configuration.

```rust
use flow_orchestrator_tui::App;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app = App::new().await?;
    Ok(())
}
```

**Errors**: Returns `FlowError` if:
- Configuration cannot be loaded
- Terminal initialization fails
- Required dependencies are not available

##### `run() -> Result<()>`

Runs the application main loop until quit is requested.

```rust
use flow_orchestrator_tui::App;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut app = App::new().await?;
    app.run().await?;
    Ok(())
}
```

**Behavior**:
- Sets up terminal in raw mode
- Spawns input and tick handlers
- Runs event loop until shutdown
- Restores terminal state on exit

### `AppEvent`

Events that drive the application state machine.

```rust
pub enum AppEvent {
    Key(KeyEvent),
    Resize(u16, u16),
    Tick,
    Quit,
    SwitchDashboard(Dashboard),
    ChangeMode(Mode),
    ExecuteCommand(String),
}
```

---

## Events

### `Event`

Core event type for framework-agnostic event handling.

```rust
pub struct Event {
    pub id: EventId,
    pub event_type: EventType,
    pub category: EventCategory,
    pub severity: Severity,
    pub source: EventSource,
    pub timestamp: DateTime<Utc>,
    pub metadata: EventMetadata,
}
```

#### Factory Methods

```rust
// Create agent started event
let event = Event::agent_started("agent-1");

// Create agent stopped event
let event = Event::agent_stopped("agent-1");

// Create task event
let event = Event::task_created("task-1", "agent-1");
```

### `EventBus`

Pub/sub event distribution system.

```rust
pub struct EventBus {
    // ... private fields
}
```

#### Methods

##### `new() -> Self`

Creates a new event bus.

```rust
use flow_orchestrator_tui::events::EventBus;

let event_bus = EventBus::new();
```

##### `subscribe(filter: Option<EventFilter>) -> Receiver<Event>`

Subscribes to events with optional filtering.

```rust
use flow_orchestrator_tui::events::{EventBus, EventFilter, EventCategory};

#[tokio::main]
async fn main() {
    let event_bus = EventBus::new();

    // Subscribe to all events
    let mut rx_all = event_bus.subscribe(None).await;

    // Subscribe to agent events only
    let filter = EventFilter::category(EventCategory::Agent);
    let mut rx_agents = event_bus.subscribe(Some(filter)).await;

    // Receive events
    while let Some(event) = rx_all.recv().await {
        println!("Event: {:?}", event.event_type);
    }
}
```

##### `publish(event: Event) -> Result<()>`

Publishes an event to all subscribers.

```rust
use flow_orchestrator_tui::events::{EventBus, Event};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let event_bus = EventBus::new();

    let event = Event::agent_started("agent-1");
    event_bus.publish(event).await?;

    Ok(())
}
```

### `EventType`

Categorization of event types.

```rust
pub enum EventType {
    AgentStarted,
    AgentStopped,
    AgentError,
    TaskCreated,
    TaskCompleted,
    TaskFailed,
    SessionStarted,
    SessionEnded,
    MetricsUpdated,
    Custom(String),
}
```

### `EventCategory`

High-level event categorization for filtering.

```rust
pub enum EventCategory {
    Agent,
    Task,
    Session,
    Metrics,
    System,
    Custom,
}
```

### `Severity`

Event severity levels.

```rust
pub enum Severity {
    Debug,
    Info,
    Warning,
    Error,
    Critical,
}
```

### `EventHandler`

Trait for implementing event handlers.

```rust
#[async_trait]
pub trait EventHandler: Send + Sync {
    async fn handle(&self, event: &Event) -> HandleResult;
}
```

**Example Implementation**:

```rust
use flow_orchestrator_tui::events::{EventHandler, HandleResult, Event};
use async_trait::async_trait;

struct CustomHandler;

#[async_trait]
impl EventHandler for CustomHandler {
    async fn handle(&self, event: &Event) -> HandleResult {
        println!("Handling event: {:?}", event.event_type);
        HandleResult::Continue
    }
}
```

### `HandleResult`

Result of event handler execution.

```rust
pub enum HandleResult {
    Continue,    // Continue to next handler
    Stop,        // Stop handler chain
    Error(String), // Handler error
}
```

---

## State Management

### `StateManager`

Thread-safe global state management.

```rust
pub struct StateManager {
    pub session: Arc<RwLock<Option<Session>>>,
    pub agent_graph: Arc<RwLock<AgentGraph>>,
    pub metrics_history: Arc<RwLock<MetricsHistory>>,
}
```

#### Methods

##### `new() -> Self`

Creates a new state manager with empty state.

```rust
use flow_orchestrator_tui::state::StateManager;

let state = StateManager::new();
```

##### `start_session(session: Session)`

Initializes a new session.

```rust
use flow_orchestrator_tui::state::{StateManager, Session, SessionType};

let state = StateManager::new();
let session = Session::new(SessionType::Development);
state.start_session(session);
```

##### `add_agent(agent: Agent) -> Result<(), StateError>`

Adds an agent to the current session.

```rust
use flow_orchestrator_tui::state::{StateManager, Agent, AgentRole};

let state = StateManager::new();
let agent = Agent::new("researcher-1", AgentRole::Researcher);

state.add_agent(agent)?;
```

##### `add_task(task: Task) -> Result<(), StateError>`

Adds a task to the current session.

```rust
use flow_orchestrator_tui::state::{StateManager, Task, TaskType, Priority};

let state = StateManager::new();
let task = Task::new(
    "task-1",
    "Analyze requirements",
    TaskType::Research,
    Priority::High,
);

state.add_task(task)?;
```

##### `update_agent_status(agent_id: AgentId, status: AgentStatus) -> Result<(), StateError>`

Updates an agent's status.

```rust
use flow_orchestrator_tui::state::{StateManager, AgentStatus};

state.update_agent_status(agent_id, AgentStatus::Running)?;
```

##### `record_metric(point: MetricPoint)`

Records a metric data point.

```rust
use flow_orchestrator_tui::state::{StateManager, MetricPoint, MetricType};

let metric = MetricPoint::new(MetricType::TokenUsage, 1500.0);
state.record_metric(metric);
```

### `Agent`

Represents an AI agent in the system.

```rust
pub struct Agent {
    pub id: AgentId,
    pub name: String,
    pub role: AgentRole,
    pub status: AgentStatus,
    pub metrics: AgentMetrics,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

#### Methods

##### `new(name: &str, role: AgentRole) -> Self`

Creates a new agent.

```rust
use flow_orchestrator_tui::state::{Agent, AgentRole};

let agent = Agent::new("researcher-1", AgentRole::Researcher);
```

### `AgentRole`

Predefined agent roles.

```rust
pub enum AgentRole {
    Researcher,
    Planner,
    Coder,
    Reviewer,
    Tester,
    Architect,
    Custom(String),
}
```

### `AgentStatus`

Agent lifecycle status.

```rust
pub enum AgentStatus {
    Idle,
    Running,
    Paused,
    Completed,
    Failed,
    Unknown,
}
```

### `Task`

Represents a task assigned to agents.

```rust
pub struct Task {
    pub id: TaskId,
    pub title: String,
    pub description: Option<String>,
    pub task_type: TaskType,
    pub priority: Priority,
    pub status: TaskStatus,
    pub progress: u8,
    pub assigned_to: Option<AgentId>,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}
```

#### Methods

##### `new(id: &str, title: &str, task_type: TaskType, priority: Priority) -> Self`

Creates a new task.

```rust
use flow_orchestrator_tui::state::{Task, TaskType, Priority};

let task = Task::new(
    "task-1",
    "Implement authentication",
    TaskType::Development,
    Priority::High,
);
```

### `TaskStatus`

Task lifecycle status.

```rust
pub enum TaskStatus {
    Pending,
    InProgress,
    Paused,
    Completed,
    Failed,
    Cancelled,
}
```

### `TaskType`

Task categorization.

```rust
pub enum TaskType {
    Research,
    Planning,
    Development,
    Review,
    Testing,
    Documentation,
    Custom(String),
}
```

### `Priority`

Task priority levels.

```rust
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}
```

### `Session`

Represents a work session.

```rust
pub struct Session {
    pub id: SessionId,
    pub session_type: SessionType,
    pub status: SessionStatus,
    pub agents: HashMap<AgentId, Agent>,
    pub tasks: HashMap<TaskId, Task>,
    pub metrics: MetricsSnapshot,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
}
```

#### Methods

##### `new(session_type: SessionType) -> Self`

Creates a new session.

```rust
use flow_orchestrator_tui::state::{Session, SessionType};

let session = Session::new(SessionType::Development);
```

### `AgentGraph`

Manages agent network topology and relationships.

```rust
pub struct AgentGraph {
    // ... private fields
}
```

#### Methods

##### `new() -> Self`

Creates an empty agent graph.

##### `add_agent(agent: Agent)`

Adds an agent to the graph.

##### `connect(from: AgentId, to: AgentId)`

Creates a connection between two agents.

##### `get_neighbors(agent_id: &AgentId) -> Vec<AgentId>`

Returns neighboring agents.

### `MetricsHistory`

Time-series metrics storage.

```rust
pub struct MetricsHistory {
    // ... private fields
}
```

#### Methods

##### `new() -> Self`

Creates empty metrics history.

##### `record(point: MetricPoint)`

Records a metric data point.

##### `get_range(start: DateTime<Utc>, end: DateTime<Utc>) -> Vec<MetricPoint>`

Retrieves metrics within a time range.

---

## Error Handling

### `FlowError`

Main error type for the application.

```rust
pub enum FlowError {
    Config(String),
    Io(std::io::Error),
    Auth(String),
    State(StateError),
    Event(String),
    Terminal(String),
}
```

**Usage**:

```rust
use flow_orchestrator_tui::{FlowError, Result};

fn example() -> Result<()> {
    Err(FlowError::Config("Invalid configuration".to_string()))
}
```

### `StateError`

State management specific errors.

```rust
pub enum StateError {
    NoActiveSession,
    AgentNotFound(AgentId),
    TaskNotFound(TaskId),
    InvalidStateTransition,
}
```

### `Result<T>`

Type alias for standard Result with FlowError.

```rust
pub type Result<T> = std::result::Result<T, FlowError>;
```

---

## Authentication

### OAuth PKCE Flow

#### `generate_pkce_params() -> Result<(String, String)>`

Generates PKCE code verifier and challenge.

```rust
use flow_orchestrator_tui::auth::generate_pkce_params;

let (code_verifier, code_challenge) = generate_pkce_params()?;
```

**Returns**: `(code_verifier, code_challenge)` tuple

**PKCE Flow**:
1. Generate random `code_verifier` (128 characters)
2. Create `code_challenge` = BASE64URL(SHA256(code_verifier))
3. Send `code_challenge` to authorization server
4. Receive authorization code
5. Exchange code using `code_verifier` for token

#### `build_auth_url(code_challenge: &str) -> Result<String>`

Builds OpenRouter authorization URL.

```rust
use flow_orchestrator_tui::auth::build_auth_url;

let auth_url = build_auth_url(&code_challenge)?;
println!("Open in browser: {}", auth_url);
```

---

## Configuration

### `AppConfig`

Application configuration structure.

```rust
pub struct AppConfig {
    pub app: AppSettings,
    pub ui: UiSettings,
    pub auth: AuthSettings,
    pub logging: LoggingSettings,
}
```

#### Methods

##### `load() -> Result<Self>`

Loads configuration from file or defaults.

```rust
use flow_orchestrator_tui::app::AppConfig;

let config = AppConfig::load()?;
```

**Configuration Sources** (in priority order):
1. Environment variable `FLOW_CONFIG_PATH`
2. `~/.config/flow-orchestrator/config.toml`
3. Default values

### Configuration File Format

```toml
[app]
name = "Flow Orchestrator"
update_interval = 16  # milliseconds

[ui]
theme = "dark"
border_style = "rounded"
show_help = true
update_interval = 16

[auth]
provider = "openrouter"
callback_port = 8080

[logging]
level = "info"
file = "/tmp/flow-tui/flow-tui.log"
```

---

## Examples

### Complete Application Example

```rust
use flow_orchestrator_tui::{
    App, Result,
    events::{EventBus, Event},
    state::{StateManager, Agent, AgentRole, Session, SessionType},
};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize application
    let mut app = App::new().await?;

    // Setup event bus
    let event_bus = EventBus::new();
    let mut rx = event_bus.subscribe(None).await;

    // Initialize state
    let state = StateManager::new();
    let session = Session::new(SessionType::Development);
    state.start_session(session);

    // Add agents
    let agent = Agent::new("researcher-1", AgentRole::Researcher);
    state.add_agent(agent)?;

    // Publish event
    let event = Event::agent_started("researcher-1");
    event_bus.publish(event).await?;

    // Run application
    app.run().await?;

    Ok(())
}
```

### Custom Event Handler Example

```rust
use flow_orchestrator_tui::events::{EventHandler, HandleResult, Event};
use async_trait::async_trait;

struct MetricsCollector;

#[async_trait]
impl EventHandler for MetricsCollector {
    async fn handle(&self, event: &Event) -> HandleResult {
        // Collect metrics from events
        match event.event_type {
            EventType::AgentStarted => {
                println!("Agent started: {}", event.source.agent_id.unwrap());
            }
            EventType::MetricsUpdated => {
                println!("Metrics updated at: {}", event.timestamp);
            }
            _ => {}
        }
        HandleResult::Continue
    }
}
```

### State Management Example

```rust
use flow_orchestrator_tui::state::{
    StateManager, Session, SessionType,
    Agent, AgentRole, AgentStatus,
    Task, TaskType, Priority, TaskStatus,
};

fn setup_session() -> Result<(), StateError> {
    let state = StateManager::new();

    // Start session
    let session = Session::new(SessionType::Research);
    state.start_session(session);

    // Add agents
    let researcher = Agent::new("researcher-1", AgentRole::Researcher);
    let coder = Agent::new("coder-1", AgentRole::Coder);
    state.add_agent(researcher)?;
    state.add_agent(coder)?;

    // Create tasks
    let task1 = Task::new(
        "task-1",
        "Research authentication patterns",
        TaskType::Research,
        Priority::High,
    );
    state.add_task(task1)?;

    // Update agent status
    state.update_agent_status(
        AgentId::from("researcher-1"),
        AgentStatus::Running
    )?;

    // Update task progress
    state.update_task_progress(
        TaskId::from("task-1"),
        50,
        TaskStatus::InProgress
    )?;

    Ok(())
}
```

---

## Version Compatibility

This API documentation is for version 0.1.0. The API is not yet stable and may change between minor versions until 1.0.0 release.

## See Also

- [README.md](../README.md) - Project overview
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [Architecture Documentation](architecture/) - Design decisions
