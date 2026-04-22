# Flow Orchestrator TUI - System Architecture

**Version:** 1.0.0
**Date:** 2025-11-25
**Status:** Design Specification

---

## Table of Contents

1. [System Context](#1-system-context)
2. [Component Architecture](#2-component-architecture)
3. [Module Structure](#3-module-structure)
4. [Key Traits & Interfaces](#4-key-traits--interfaces)
5. [Data Flow Architecture](#5-data-flow-architecture)
6. [State Management](#6-state-management)
7. [Event System](#7-event-system)
8. [Plugin Architecture](#8-plugin-architecture)
9. [Authentication System](#9-authentication-system)
10. [Error Handling Strategy](#10-error-handling-strategy)
11. [Configuration Management](#11-configuration-management)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. System Context

### 1.1 High-Level Overview

Flow Orchestrator TUI is a terminal-based multi-agent orchestration dashboard that provides unified monitoring, control, and interaction across multiple AI agent frameworks (Claude Flow, AutoGen, LangGraph, CrewAI, OpenCode).

```
┌─────────────────────────────────────────────────────────────────┐
│                     External Systems                            │
├─────────────┬────────────┬────────────┬────────────┬───────────┤
│ Claude Flow │  AutoGen   │ LangGraph  │  CrewAI    │ OpenCode  │
│   (MCP)     │(WebSocket) │   (SSE)    │  (Events)  │   (SSE)   │
└──────┬──────┴──────┬─────┴──────┬─────┴──────┬─────┴──────┬────┘
       │             │            │            │            │
       └─────────────┴────────────┴────────────┴────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Flow Orchestrator │
                    │       TUI          │
                    │  (Ratatui + Tokio) │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼──────────┐
                    │   OpenRouter API   │
                    │    (OAuth PKCE)    │
                    └────────────────────┘
```

**Key Characteristics:**
- **Async-first**: Built on Tokio for non-blocking I/O
- **Event-driven**: All state changes propagate through event system
- **Framework-agnostic**: Adapter pattern for framework integration
- **Terminal-native**: Optimized for keyboard-driven interaction
- **Real-time**: 60fps rendering with animated effects

### 1.2 System Context Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Environment                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────┐         ┌──────────────────────┐                │
│  │  Terminal  │────────▶│  Flow Orchestrator   │                │
│  │  (User)    │◀────────│       TUI            │                │
│  └────────────┘         └──────────┬───────────┘                │
│                                     │                             │
│                         ┌───────────┴──────────┐                 │
│                         │                      │                 │
│              ┌──────────▼──────┐    ┌─────────▼──────────┐      │
│              │  OpenRouter     │    │   Framework        │      │
│              │  (Auth & LLM)   │    │   Adapters         │      │
│              └──────────┬──────┘    └─────────┬──────────┘      │
│                         │                      │                 │
└─────────────────────────┼──────────────────────┼─────────────────┘
                          │                      │
              ┌───────────▼────────┐  ┌──────────▼─────────────┐
              │  OpenRouter API    │  │  Agent Frameworks      │
              │  - Claude Models   │  │  - Claude Flow (MCP)   │
              │  - GPT Models      │  │  - AutoGen (WS)        │
              │  - Gemini, etc.    │  │  - LangGraph (SSE)     │
              └────────────────────┘  │  - CrewAI (Events)     │
                                      │  - OpenCode (SSE)      │
                                      └────────────────────────┘
```

**External Dependencies:**
- **OpenRouter**: LLM API access + OAuth authentication
- **Agent Frameworks**: Multi-framework orchestration sources
- **System Keyring**: Secure credential storage (macOS Keychain, Windows Credential Manager, Linux Secret Service)

---

## 2. Component Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Flow Orchestrator TUI                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    UI Layer (Ratatui)                     │   │
│  │  ┌────────────┐  ┌──────────┐  ┌─────────────────────┐  │   │
│  │  │ Dashboard  │  │  Widgets │  │  Animation Engine   │  │   │
│  │  │ Components │  │  (Custom)│  │   (Tachyonfx)       │  │   │
│  │  └─────┬──────┘  └─────┬────┘  └──────────┬──────────┘  │   │
│  └────────┼───────────────┼──────────────────┼─────────────┘   │
│           │               │                  │                  │
│  ┌────────▼───────────────▼──────────────────▼─────────────┐   │
│  │              Application State Manager                   │   │
│  │  - Agent State  - Task State  - Session State            │   │
│  │  - Config State - Auth State  - UI State                 │   │
│  └────────┬──────────────────────────────────────────┬──────┘   │
│           │                                          │           │
│  ┌────────▼────────────────────────┐   ┌────────────▼────────┐ │
│  │      Event System               │   │   Command Router    │ │
│  │  - Event Bus                    │   │   - Key Handlers    │ │
│  │  - Event Aggregator             │   │   - Command Palette │ │
│  │  - Event Filters                │   │   - Action System   │ │
│  └────────┬────────────────────────┘   └─────────────────────┘ │
│           │                                                      │
│  ┌────────▼──────────────────────────────────────────────────┐ │
│  │                 Adapter Layer                              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │  Claude  │  │ AutoGen  │  │LangGraph │  │  CrewAI  │  │ │
│  │  │   Flow   │  │ Adapter  │  │ Adapter  │  │ Adapter  │  │ │
│  │  │ Adapter  │  │   (WS)   │  │  (SSE)   │  │ (Events) │  │ │
│  │  │  (MCP)   │  └──────────┘  └──────────┘  └──────────┘  │ │
│  │  └──────────┘                                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Authentication Module                       │   │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐ │   │
│  │  │   PKCE   │  │  OAuth    │  │   Keyring Storage    │ │   │
│  │  │  Engine  │  │  Callback │  │   (OS-native)        │ │   │
│  │  └──────────┘  └───────────┘  └──────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Infrastructure Services                        │   │
│  │  - Config Loader    - Logger    - Metrics Collector     │   │
│  │  - Error Handler    - Storage   - Network Client        │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

#### UI Layer
- **Rendering**: 60fps Ratatui rendering with tachyonfx effects
- **Input Handling**: Keyboard/mouse event processing
- **Layout Management**: Adaptive, context-aware layouts
- **Animation**: Breathing agent nodes, smooth transitions, visual feedback

#### Application Layer
- **State Management**: Centralized state with immutable updates
- **Event Processing**: Event-driven architecture with pub-sub
- **Business Logic**: Agent coordination, task orchestration
- **Command Routing**: Vim-style modal commands, gesture recognition

#### Adapter Layer
- **Framework Integration**: Protocol-specific adapters
- **Event Translation**: Framework events → common schema
- **Connection Management**: Reconnection, health checks
- **Error Recovery**: Graceful degradation

#### Service Layer
- **Authentication**: OpenRouter OAuth PKCE flow
- **Configuration**: TOML-based config with hot reload
- **Logging**: Structured logging with tracing
- **Metrics**: Performance and cost tracking

---

## 3. Module Structure

### 3.1 Project Layout

```
flow/
├── src/
│   ├── main.rs                    # Entry point, CLI parsing
│   │
│   ├── app/                       # Application lifecycle
│   │   ├── mod.rs                 # Public API
│   │   ├── state.rs               # Global state management
│   │   ├── lifecycle.rs           # Init, run, shutdown
│   │   └── context.rs             # App context (DI container)
│   │
│   ├── ui/                        # Ratatui components
│   │   ├── mod.rs                 # Public UI API
│   │   ├── app.rs                 # Main app component
│   │   ├── dashboards/            # Dashboard views
│   │   │   ├── mod.rs
│   │   │   ├── overview.rs        # System overview
│   │   │   ├── agents.rs          # Agent monitoring
│   │   │   ├── tasks.rs           # Task management
│   │   │   ├── research.rs        # Research tree view
│   │   │   └── logs.rs            # Log viewer
│   │   ├── widgets/               # Custom widgets
│   │   │   ├── mod.rs
│   │   │   ├── agent_graph.rs     # Breathing node graph
│   │   │   ├── timeline.rs        # Temporal views
│   │   │   ├── metric_panel.rs    # Real-time metrics
│   │   │   └── command_palette.rs # Fuzzy command search
│   │   ├── layouts/               # Layout presets
│   │   │   ├── mod.rs
│   │   │   ├── manager.rs         # Layout switching
│   │   │   └── presets.rs         # Predefined layouts
│   │   └── effects/               # Tachyonfx animations
│   │       ├── mod.rs
│   │       ├── breathing.rs       # Node pulse animation
│   │       └── transitions.rs     # Layout transitions
│   │
│   ├── adapters/                  # Framework adapters
│   │   ├── mod.rs                 # Adapter registry
│   │   ├── interface.rs           # Adapter trait
│   │   ├── claude_flow.rs         # MCP adapter
│   │   ├── autogen.rs             # WebSocket adapter
│   │   ├── langgraph.rs           # SSE adapter
│   │   ├── crewai.rs              # Event adapter
│   │   └── opencode.rs            # SSE adapter
│   │
│   ├── events/                    # Event system
│   │   ├── mod.rs                 # Public API
│   │   ├── schema.rs              # Common event schema
│   │   ├── bus.rs                 # Event bus (pub-sub)
│   │   ├── aggregator.rs          # Multi-adapter aggregation
│   │   ├── filters.rs             # Event filtering
│   │   └── handlers.rs            # Event handler registry
│   │
│   ├── state/                     # State management
│   │   ├── mod.rs                 # Public API
│   │   ├── manager.rs             # State manager
│   │   ├── agent.rs               # Agent state
│   │   ├── task.rs                # Task state
│   │   ├── session.rs             # Session state
│   │   └── snapshot.rs            # State snapshots
│   │
│   ├── auth/                      # Authentication
│   │   ├── mod.rs                 # Public auth API
│   │   ├── pkce.rs                # PKCE implementation
│   │   ├── callback.rs            # OAuth callback server
│   │   ├── storage.rs             # Keyring integration
│   │   └── openrouter.rs          # OpenRouter client
│   │
│   ├── commands/                  # Command system
│   │   ├── mod.rs                 # Command registry
│   │   ├── router.rs              # Command routing
│   │   ├── palette.rs             # Fuzzy command search
│   │   ├── handlers/              # Command handlers
│   │   │   ├── mod.rs
│   │   │   ├── agent.rs           # Agent commands
│   │   │   ├── task.rs            # Task commands
│   │   │   ├── view.rs            # View commands
│   │   │   └── system.rs          # System commands
│   │   └── macros.rs              # Macro recording
│   │
│   ├── config/                    # Configuration
│   │   ├── mod.rs                 # Config loader
│   │   ├── schema.rs              # Config schema
│   │   └── validation.rs          # Config validation
│   │
│   └── utils/                     # Utilities
│       ├── mod.rs
│       ├── logging.rs             # Structured logging
│       ├── metrics.rs             # Metrics collection
│       ├── network.rs             # HTTP/WS client
│       └── time.rs                # Time utilities
│
├── tests/                         # Integration tests
│   ├── adapters/                  # Adapter tests
│   ├── auth/                      # Auth flow tests
│   └── ui/                        # UI component tests
│
├── benches/                       # Benchmarks
│   ├── rendering.rs               # Render performance
│   └── event_processing.rs        # Event throughput
│
├── docs/                          # Documentation
│   ├── architecture/              # This document
│   ├── api/                       # API docs
│   └── user/                      # User guide
│
└── examples/                      # Usage examples
    ├── basic_monitoring.rs
    └── custom_dashboard.rs
```

### 3.2 Module Dependencies

```
main.rs
  └─> app::run()
       ├─> config::load()
       ├─> auth::authenticate()
       ├─> adapters::initialize()
       └─> ui::App::new()
            ├─> state::StateManager
            ├─> events::EventBus
            ├─> commands::Router
            └─> ui::render_loop()
```

**Dependency Rules:**
- **No circular dependencies** between modules
- **UI depends on state**, not vice versa
- **Adapters are independent** (no inter-adapter dependencies)
- **Events flow upward** (adapters → aggregator → state → UI)
- **Commands flow downward** (UI → router → handlers → state)

---

## 4. Key Traits & Interfaces

### 4.1 Adapter Trait

```rust
use async_trait::async_trait;
use anyhow::Result;

#[async_trait]
pub trait FrameworkAdapter: Send + Sync {
    /// Lifecycle
    async fn initialize(&mut self, config: AdapterConfig) -> Result<()>;
    async fn start(&mut self) -> Result<()>;
    async fn stop(&mut self) -> Result<()>;
    async fn health_check(&self) -> Result<Health>;

    /// Event streaming
    fn event_stream(&self) -> mpsc::Receiver<Event>;

    /// Agent management
    async fn list_agents(&self) -> Result<Vec<AgentInfo>>;
    async fn spawn_agent(&self, request: SpawnRequest) -> Result<AgentId>;
    async fn stop_agent(&self, id: AgentId) -> Result<()>;

    /// Task orchestration
    async fn assign_task(&self, request: TaskRequest) -> Result<TaskId>;
    async fn get_task_status(&self, id: TaskId) -> Result<TaskStatus>;
    async fn cancel_task(&self, id: TaskId) -> Result<()>;

    /// State queries
    async fn get_state(&self) -> Result<AdapterState>;

    /// Metadata
    fn framework_name(&self) -> &'static str;
    fn framework_version(&self) -> &str;
    fn capabilities(&self) -> Vec<Capability>;
}
```

**Design Rationale:**
- **Async-first**: All I/O operations are async for non-blocking execution
- **Error handling**: `Result<T>` for explicit error propagation
- **Send + Sync**: Thread-safe for concurrent access
- **Streaming events**: Channel-based event streaming for real-time updates
- **Metadata**: Runtime introspection for UI display

### 4.2 Dashboard Trait

```rust
pub trait Dashboard {
    type State;
    type Message;

    /// Initialize dashboard
    fn init(&mut self) -> Result<()>;

    /// Handle updates
    fn update(&mut self, msg: Self::Message) -> Result<()>;

    /// Render dashboard
    fn render(&mut self, frame: &mut Frame, area: Rect);

    /// Handle input events
    fn handle_event(&mut self, event: crossterm::event::Event) -> Result<Option<Self::Message>>;

    /// Dashboard metadata
    fn id(&self) -> &str;
    fn title(&self) -> &str;
    fn hotkey(&self) -> Option<char>;
}
```

**Design Rationale:**
- **Component-based**: Each dashboard is a self-contained component
- **Message-passing**: TEA (The Elm Architecture) pattern
- **Flexible state**: Generic state type for dashboard-specific data
- **Hotkey support**: Quick keyboard navigation

### 4.3 Event Trait

```rust
pub trait EventProcessor: Send {
    /// Process incoming event
    fn process(&mut self, event: Event) -> Result<Vec<Event>>;

    /// Filter predicate
    fn should_process(&self, event: &Event) -> bool;

    /// Processor priority
    fn priority(&self) -> u8;
}
```

**Design Rationale:**
- **Pipeline pattern**: Chain of event processors
- **Event transformation**: Process can emit multiple events
- **Filtering**: Skip irrelevant events early
- **Priority ordering**: Control execution order

### 4.4 State Manager Trait

```rust
pub trait StateManager: Send + Sync {
    /// Apply event to state
    fn apply(&mut self, event: &Event) -> Result<()>;

    /// Get current state snapshot
    fn snapshot(&self) -> StateSnapshot;

    /// Subscribe to state changes
    fn subscribe(&self, key: &str) -> mpsc::Receiver<StateChange>;

    /// Query state
    fn get<T: StateQuery>(&self, query: T) -> Result<T::Output>;
}
```

**Design Rationale:**
- **Immutable updates**: Events drive state transitions
- **Snapshots**: Consistent views of state
- **Subscriptions**: Reactive updates for UI
- **Type-safe queries**: Compile-time query validation

---

## 5. Data Flow Architecture

### 5.1 Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    External Events                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Claude  │  │ AutoGen  │  │LangGraph │  │  CrewAI  │   │
│  │   Flow   │  │          │  │          │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                          │
                ┌─────────▼──────────┐
                │  Adapter Layer     │
                │  - Protocol Conv   │
                │  - Event Mapping   │
                └─────────┬──────────┘
                          │
                ┌─────────▼──────────┐
                │  Event Aggregator  │
                │  - Merge streams   │
                │  - Deduplicate     │
                │  - Enrich metadata │
                └─────────┬──────────┘
                          │
                ┌─────────▼──────────┐
                │    Event Bus       │
                │  - Pub/Sub routing │
                │  - Priority queue  │
                └─────────┬──────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌──────▼───────┐ ┌──────▼───────┐
│ State Manager  │ │    Logger    │ │   Metrics    │
│ - Apply event  │ │ - Audit log  │ │ - Count/time │
│ - Update state │ │ - Debug info │ │ - Dashboards │
└───────┬────────┘ └──────────────┘ └──────────────┘
        │
        │ State Change Notifications
        │
┌───────▼──────────────────────────────────────────┐
│              UI Layer (Reactive)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │Dashboard │  │  Widgets │  │ Animation│       │
│  │Components│  │          │  │  Engine  │       │
│  └──────────┘  └──────────┘  └──────────┘       │
└──────────────────────────────────────────────────┘
```

### 5.2 Command Flow Diagram

```
┌─────────────────────────────────────────────────┐
│            User Input                           │
│  - Keyboard events                              │
│  - Mouse events                                 │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────▼──────────┐
        │  Input Handler     │
        │  - Mode detection  │
        │  - Gesture recog   │
        └─────────┬──────────┘
                  │
        ┌─────────▼──────────┐
        │  Command Router    │
        │  - Parse command   │
        │  - Validate args   │
        │  - Route to handler│
        └─────────┬──────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼────────┐  ┌────────▼───────┐
│ Command Handler│  │  State Query   │
│ - Execute logic│  │  - Read state  │
│ - Emit events  │  │  - Return data │
└───────┬────────┘  └────────────────┘
        │
        │ Emits Events
        │
┌───────▼──────────┐
│   Event Bus      │
│ (back to state)  │
└──────────────────┘
```

### 5.3 State Update Flow

```
Event → EventBus → StateManager.apply(event)
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐   ┌────▼────┐
    │ Agent   │    │   Task    │   │ Session │
    │ State   │    │   State   │   │  State  │
    └────┬────┘    └─────┬─────┘   └────┬────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
              Notify Subscribers
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼────┐                     ┌────▼────┐
    │   UI    │                     │ Logger  │
    │Components│                     │ Metrics │
    └─────────┘                     └─────────┘
```

**Key Principles:**
1. **Unidirectional flow**: Events flow in one direction (adapters → state → UI)
2. **Immutable state**: State updates create new state, old state preserved
3. **Event sourcing**: All changes recorded as events
4. **Reactive UI**: UI subscribes to state changes, not polling
5. **Async everywhere**: All I/O is async, no blocking operations

---

## 6. State Management

### 6.1 State Architecture

```rust
pub struct AppState {
    pub agents: AgentState,
    pub tasks: TaskState,
    pub sessions: SessionState,
    pub auth: AuthState,
    pub config: ConfigState,
    pub ui: UIState,
}

pub struct AgentState {
    agents: HashMap<AgentId, Agent>,
    clusters: Vec<AgentCluster>,
    active_agents: HashSet<AgentId>,
    agent_metrics: HashMap<AgentId, AgentMetrics>,
}

pub struct TaskState {
    tasks: HashMap<TaskId, Task>,
    task_queue: VecDeque<TaskId>,
    task_history: CircularBuffer<TaskEvent>,
    task_dependencies: DependencyGraph,
}

pub struct SessionState {
    session_id: SessionId,
    start_time: Instant,
    phase: WorkflowPhase,
    history: Vec<SessionEvent>,
    checkpoints: Vec<Checkpoint>,
}
```

**Design Decisions:**
- **Normalized state**: Entities stored by ID for efficient updates
- **Computed views**: Clusters, metrics derived from base state
- **History tracking**: Circular buffers for bounded memory
- **Graph structures**: Dependencies as directed acyclic graphs (DAGs)

### 6.2 State Transitions

```rust
impl StateManager {
    pub fn apply(&mut self, event: &Event) -> Result<()> {
        match event.event_type {
            EventType::AgentStarted => {
                let agent = Agent::from_event(event)?;
                self.state.agents.agents.insert(agent.id.clone(), agent);
                self.notify_subscribers("agents", &event)?;
            }
            EventType::TaskProgress => {
                let task_id = event.payload.get("task_id")?;
                let task = self.state.tasks.tasks.get_mut(task_id)?;
                task.progress = event.payload.get("progress_percent")?;
                self.notify_subscribers("tasks", &event)?;
            }
            // ... other event types
        }
        Ok(())
    }
}
```

**State Invariants:**
- **Agent exists** before receiving task assignments
- **Task dependencies** form a DAG (no cycles)
- **Session** always has at least one checkpoint
- **Metrics** are eventually consistent (updated async)

### 6.3 State Persistence

```rust
pub struct StateSnapshot {
    pub timestamp: Instant,
    pub agents: Vec<Agent>,
    pub tasks: Vec<Task>,
    pub session: Session,
}

impl StateManager {
    /// Save state snapshot
    pub async fn save_snapshot(&self, path: &Path) -> Result<()> {
        let snapshot = self.snapshot();
        let serialized = serde_json::to_string_pretty(&snapshot)?;
        tokio::fs::write(path, serialized).await?;
        Ok(())
    }

    /// Restore from snapshot
    pub async fn restore_snapshot(&mut self, path: &Path) -> Result<()> {
        let serialized = tokio::fs::read_to_string(path).await?;
        let snapshot: StateSnapshot = serde_json::from_str(&serialized)?;
        self.apply_snapshot(snapshot)?;
        Ok(())
    }
}
```

**Persistence Strategy:**
- **Auto-save**: Every 30 seconds during active sessions
- **Manual save**: On user command (`:save`)
- **Session restore**: Automatic on startup if recent session exists
- **Checkpoint system**: Save state before risky operations

---

## 7. Event System

### 7.1 Common Event Schema

```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub schema_version: String,
    pub event_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub source: EventSource,
    pub event_type: EventType,
    pub event_category: EventCategory,
    pub severity: Severity,
    pub payload: serde_json::Value,
    pub metadata: EventMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSource {
    pub framework: Framework,
    pub agent_id: Option<AgentId>,
    pub agent_type: Option<AgentType>,
    pub session_id: Option<SessionId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventType {
    // Agent lifecycle
    AgentStarted,
    AgentCompleted,
    AgentPaused,
    AgentResumed,
    AgentError,

    // Task events
    TaskAssigned,
    TaskStarted,
    TaskProgress,
    TaskCompleted,
    TaskFailed,

    // Communication
    MessageSent,
    MessageReceived,

    // Tool execution
    ToolCalled,
    ToolResult,

    // State changes
    StateUpdated,
    CheckpointCreated,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventCategory {
    Lifecycle,
    Communication,
    Execution,
    Error,
    State,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Severity {
    Debug,
    Info,
    Warning,
    Error,
    Critical,
}
```

### 7.2 Event Bus Implementation

```rust
pub struct EventBus {
    tx: mpsc::UnboundedSender<Event>,
    rx: Arc<Mutex<mpsc::UnboundedReceiver<Event>>>,
    subscribers: Arc<RwLock<HashMap<SubscriptionId, Subscriber>>>,
}

impl EventBus {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::unbounded_channel();
        Self {
            tx,
            rx: Arc::new(Mutex::new(rx)),
            subscribers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Publish event to all subscribers
    pub fn publish(&self, event: Event) -> Result<()> {
        self.tx.send(event)?;
        Ok(())
    }

    /// Subscribe to events matching filter
    pub fn subscribe(&self, filter: EventFilter) -> mpsc::UnboundedReceiver<Event> {
        let (tx, rx) = mpsc::unbounded_channel();
        let id = Uuid::new_v4();

        let subscriber = Subscriber { id, tx, filter };

        self.subscribers.write().unwrap().insert(id, subscriber);

        rx
    }

    /// Run event bus (distribute events to subscribers)
    pub async fn run(&self) {
        let mut rx = self.rx.lock().await;

        while let Some(event) = rx.recv().await {
            let subscribers = self.subscribers.read().unwrap();

            for subscriber in subscribers.values() {
                if subscriber.filter.matches(&event) {
                    let _ = subscriber.tx.send(event.clone());
                }
            }
        }
    }
}
```

**Event Bus Features:**
- **Pub-sub pattern**: Many publishers, many subscribers
- **Filtered subscriptions**: Subscribe to specific event types
- **Async distribution**: Non-blocking event delivery
- **Backpressure handling**: Bounded channels prevent memory issues

### 7.3 Event Aggregation

```rust
pub struct EventAggregator {
    adapters: Vec<Arc<dyn FrameworkAdapter>>,
    event_bus: Arc<EventBus>,
}

impl EventAggregator {
    pub async fn start(&mut self) -> Result<()> {
        // Start all adapters
        for adapter in &self.adapters {
            adapter.start().await?;
        }

        // Spawn tasks to merge event streams
        for adapter in &self.adapters {
            let adapter = adapter.clone();
            let bus = self.event_bus.clone();

            tokio::spawn(async move {
                let mut stream = adapter.event_stream();

                while let Some(event) = stream.recv().await {
                    // Enrich with metadata
                    let enriched = Self::enrich_event(event, &adapter);

                    // Publish to bus
                    let _ = bus.publish(enriched);
                }
            });
        }

        Ok(())
    }

    fn enrich_event(event: Event, adapter: &Arc<dyn FrameworkAdapter>) -> Event {
        let mut enriched = event;
        enriched.metadata.adapter = Some(adapter.framework_name().to_string());
        enriched.metadata.adapter_version = Some(adapter.framework_version().to_string());
        enriched
    }
}
```

---

## 8. Plugin Architecture

### 8.1 Plugin System Design

```rust
pub trait Plugin: Send + Sync {
    /// Plugin metadata
    fn name(&self) -> &str;
    fn version(&self) -> &str;
    fn description(&self) -> &str;

    /// Lifecycle hooks
    fn on_load(&mut self, app: &mut App) -> Result<()>;
    fn on_unload(&mut self, app: &mut App) -> Result<()>;

    /// Event hooks
    fn on_event(&mut self, event: &Event) -> Result<()>;

    /// Command hooks
    fn commands(&self) -> Vec<Command>;

    /// Widget hooks
    fn widgets(&self) -> Vec<Box<dyn Widget>>;
}

pub struct PluginManager {
    plugins: HashMap<String, Box<dyn Plugin>>,
    plugin_dir: PathBuf,
}

impl PluginManager {
    pub fn load_plugin(&mut self, path: &Path) -> Result<()> {
        // Load plugin from shared library
        // Register with app
        Ok(())
    }

    pub fn unload_plugin(&mut self, name: &str) -> Result<()> {
        // Unregister plugin
        // Unload shared library
        Ok(())
    }
}
```

**Plugin Types:**
1. **Adapter Plugins**: New framework integrations
2. **Dashboard Plugins**: Custom visualizations
3. **Command Plugins**: New commands
4. **Widget Plugins**: Custom UI components
5. **Export Plugins**: Data export formats

**Plugin Discovery:**
- Plugins located in `~/.config/flow-tui/plugins/`
- Auto-loaded on startup
- Hot reload support

---

## 9. Authentication System

### 9.1 OAuth PKCE Flow

```rust
pub struct AuthModule {
    pkce_engine: PkceEngine,
    callback_server: CallbackServer,
    storage: KeyringStorage,
    client: OpenRouterClient,
}

impl AuthModule {
    pub async fn authenticate(&mut self) -> Result<ApiKey> {
        // 1. Check for stored key
        if let Ok(key) = self.storage.get_key() {
            if self.validate_key(&key).await? {
                return Ok(key);
            }
            self.storage.delete_key()?;
        }

        // 2. Generate PKCE parameters
        let (verifier, challenge) = self.pkce_engine.generate()?;

        // 3. Start callback server
        let callback_handle = tokio::spawn(
            self.callback_server.start()
        );

        // 4. Open browser for authorization
        let auth_url = self.build_auth_url(&challenge)?;
        open::that(&auth_url)?;

        // 5. Wait for callback
        let auth_code = callback_handle.await??;

        // 6. Exchange code for API key
        let api_key = self.client.exchange_code(auth_code, verifier).await?;

        // 7. Store key securely
        self.storage.store_key(&api_key)?;

        Ok(api_key)
    }
}
```

### 9.2 Secure Storage

```rust
use keyring::Entry;

pub struct KeyringStorage {
    service: &'static str,
    username: &'static str,
}

impl KeyringStorage {
    pub fn store_key(&self, key: &str) -> Result<()> {
        let entry = Entry::new(self.service, self.username)?;
        entry.set_password(key)?;
        Ok(())
    }

    pub fn get_key(&self) -> Result<String> {
        let entry = Entry::new(self.service, self.username)?;
        Ok(entry.get_password()?)
    }

    pub fn delete_key(&self) -> Result<()> {
        let entry = Entry::new(self.service, self.username)?;
        entry.delete_credential()?;
        Ok(())
    }
}
```

**Platform Support:**
- **macOS**: Keychain
- **Windows**: Credential Manager
- **Linux**: Secret Service API (GNOME Keyring, KWallet)

---

## 10. Error Handling Strategy

### 10.1 Error Types

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum FlowError {
    // Auth errors
    #[error("Authentication failed: {0}")]
    AuthenticationError(#[from] AuthError),

    // Adapter errors
    #[error("Adapter error ({adapter}): {message}")]
    AdapterError {
        adapter: String,
        message: String,
    },

    // Network errors
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    // State errors
    #[error("State error: {0}")]
    StateError(String),

    // UI errors
    #[error("UI error: {0}")]
    UiError(String),

    // Config errors
    #[error("Configuration error: {0}")]
    ConfigError(#[from] config::ConfigError),

    // IO errors
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

#[derive(Error, Debug)]
pub enum AuthError {
    #[error("PKCE generation failed")]
    PkceError,

    #[error("OAuth callback timeout")]
    CallbackTimeout,

    #[error("Token exchange failed: {0}")]
    TokenExchangeError(String),

    #[error("Keyring access failed: {0}")]
    KeyringError(String),
}
```

### 10.2 Error Recovery

```rust
impl EventBus {
    async fn handle_adapter_error(&self, adapter: &str, error: FlowError) {
        match error {
            FlowError::NetworkError(_) => {
                // Attempt reconnection with backoff
                self.schedule_reconnect(adapter).await;
            }
            FlowError::AdapterError { .. } => {
                // Log error, mark adapter as unhealthy
                self.mark_unhealthy(adapter);
            }
            _ => {
                // Generic error handling
                error!("Adapter {} error: {}", adapter, error);
            }
        }
    }
}
```

**Recovery Strategies:**
- **Transient errors**: Retry with exponential backoff
- **Connection errors**: Automatic reconnection
- **Authentication errors**: Prompt user to re-authenticate
- **Fatal errors**: Graceful shutdown with state save

---

## 11. Configuration Management

### 11.1 Configuration Schema

```toml
# ~/.config/flow-tui/config.toml

[app]
log_level = "info"
metrics_enabled = true
auto_save = true
save_interval = 30  # seconds

[ui]
theme = "dark"
update_interval = 16  # ms (60fps)
animation_enabled = true
vim_mode = true

[ui.layouts]
default = "overview"
startup_layout = "last_used"

[auth]
provider = "openrouter"
auto_refresh = true

[adapters.claude_flow]
enabled = true
connection = "stdio"
command = ["npx", "claude-flow@alpha", "mcp", "start"]

[adapters.autogen]
enabled = true
connection = "websocket"
url = "ws://localhost:8765"
reconnect = true

[adapters.langgraph]
enabled = true
connection = "sse"
url = "http://localhost:8000/stream"

[adapters.crewai]
enabled = false

[adapters.opencode]
enabled = false

[metrics]
cost_tracking = true
token_tracking = true
budget_warning = 1.0  # USD

[logging]
file = "/tmp/flow-tui.log"
format = "json"
```

### 11.2 Config Loader

```rust
use config::{Config, File, Environment};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct AppConfig {
    pub app: AppSettings,
    pub ui: UiSettings,
    pub auth: AuthSettings,
    pub adapters: AdapterConfigs,
    pub metrics: MetricsSettings,
    pub logging: LoggingSettings,
}

impl AppConfig {
    pub fn load() -> Result<Self> {
        let config_path = Self::config_path()?;

        let config = Config::builder()
            // Default config
            .add_source(File::from_str(DEFAULT_CONFIG, config::FileFormat::Toml))
            // User config
            .add_source(File::with_name(&config_path).required(false))
            // Environment overrides
            .add_source(Environment::with_prefix("FLOW").separator("_"))
            .build()?;

        Ok(config.try_deserialize()?)
    }

    fn config_path() -> Result<String> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| anyhow!("Config dir not found"))?;

        Ok(config_dir
            .join("flow-tui")
            .join("config.toml")
            .to_string_lossy()
            .to_string())
    }
}
```

**Config Priority:**
1. **Environment variables** (highest)
2. **User config file** (`~/.config/flow-tui/config.toml`)
3. **Default config** (lowest)

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Working TUI with single adapter

**Deliverables:**
- ✅ Project structure setup
- ✅ Ratatui rendering loop (60fps)
- ✅ Basic agent graph visualization
- ✅ Event system foundation
- ✅ State management
- ✅ Claude Flow adapter (MCP)
- ✅ OpenRouter authentication (OAuth PKCE)
- ✅ Configuration system

**Key Milestones:**
- Day 3: Basic TUI renders
- Day 7: Claude Flow adapter working
- Day 10: Authentication complete
- Day 14: End-to-end monitoring functional

### Phase 2: Multi-Adapter (Weeks 3-4)

**Goal**: Support all 5 frameworks

**Deliverables:**
- ✅ AutoGen adapter (WebSocket)
- ✅ LangGraph adapter (SSE)
- ✅ CrewAI adapter (Events)
- ✅ OpenCode adapter (SSE)
- ✅ Event aggregation layer
- ✅ Unified event schema
- ✅ Dashboard switching

**Key Milestones:**
- Day 17: AutoGen + LangGraph adapters
- Day 21: CrewAI + OpenCode adapters
- Day 24: Event aggregation complete
- Day 28: Multi-framework monitoring working

### Phase 3: Advanced UI (Weeks 5-6)

**Goal**: Rich visualizations and interactions

**Deliverables:**
- ✅ Breathing agent animations (tachyonfx)
- ✅ Modal editing (Vim-style)
- ✅ Command palette
- ✅ Gesture shortcuts
- ✅ Timeline views
- ✅ Smart summaries
- ✅ Cost/token tracking UI

**Key Milestones:**
- Day 31: Breathing animations
- Day 35: Modal editing complete
- Day 38: Command palette working
- Day 42: Timeline + summaries

### Phase 4: Polish & Testing (Weeks 7-8)

**Goal**: Production-ready release

**Deliverables:**
- ✅ Comprehensive tests (unit, integration)
- ✅ Performance optimization
- ✅ Error handling robustness
- ✅ Documentation complete
- ✅ Examples and tutorials
- ✅ Release pipeline

**Key Milestones:**
- Day 45: Test coverage >80%
- Day 49: Performance benchmarks met
- Day 52: Documentation complete
- Day 56: v1.0.0 release

---

## Performance Targets

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Render Latency** | < 16ms | Frame time (60fps) |
| **Event Throughput** | > 10k events/sec | Benchmark |
| **Memory Usage** | < 100MB | Idle state |
| **Startup Time** | < 2s | Cold start |
| **Config Load** | < 100ms | File I/O |
| **Adapter Init** | < 5s | Per adapter |

---

## Security Considerations

1. **API Key Storage**: OS-native keyring, never in files
2. **Network Security**: HTTPS-only for OpenRouter
3. **Input Validation**: All external data validated
4. **Rate Limiting**: Client-side rate limiting
5. **Audit Logging**: All sensitive operations logged

---

## References

- **Ratatui**: https://ratatui.rs/
- **Tachyonfx**: https://github.com/junkdog/tachyonfx
- **OpenRouter**: https://openrouter.ai/docs
- **Tokio**: https://tokio.rs/
- **Claude Flow**: https://github.com/ruvnet/claude-flow
- **AutoGen**: https://microsoft.github.io/autogen/
- **LangGraph**: https://www.langchain.com/langgraph
- **CrewAI**: https://docs.crewai.com/
- **OpenCode**: https://opencode.ai/docs/

---

**Document Status**: ✅ Complete
**Last Updated**: 2025-11-25
**Next Review**: Implementation kickoff
