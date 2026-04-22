//! Flow Orchestrator TUI
//!
//! A terminal-based multi-agent orchestration dashboard for monitoring
//! and controlling AI agent frameworks (Claude Flow, AutoGen, LangGraph,
//! CrewAI, OpenCode).
//!
//! # Architecture
//!
//! The application follows The Elm Architecture (TEA) pattern with:
//! - Immutable state updates
//! - Message-passing for events
//! - Functional UI rendering
//!
//! # Example
//!
//! ```no_run
//! use flow_orchestrator_tui::{App, events::EventBus};
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let mut app = App::new().await?;
//!     app.run().await?;
//!     Ok(())
//! }
//! ```

// Module declarations
pub mod adapters;
pub mod app;
pub mod auth;
pub mod error;
pub mod events;
pub mod state;
pub mod ui;

// Re-export adapter layer
pub use adapters::{
    FrameworkAdapter, ConnectionConfig,
    ClaudeFlowAdapter, AutoGenAdapter, LangGraphAdapter,
    AdapterFactory, FrameworkType,
    FrameworkCommand, CommandResponse, HealthStatus,
};

// Re-export event system
pub use events::{
    Event, EventBus, EventType, EventCategory, Severity,
    AgentEvent, AgentEventPayload,
    KeyHandler, KeyEvent, KeyBinding, ModifierKeys, InputMode,
    EventHandler, HandleResult,
};

// Re-export state management
pub use state::{
    Agent, AgentId, AgentMetrics, AgentRole, AgentStatus,
    Task, TaskId, TaskStatus, TaskType, Priority,
    Session, SessionId, SessionStatus, SessionType,
    StateManager, AgentGraph, MetricsHistory,
};

// Re-export app and error types
pub use app::App;
pub use error::{FlowError, Result};
