//! Event System for Flow Orchestrator TUI
//!
//! This module provides a unified event system for handling events from multiple
//! AI agent frameworks (Claude Flow, AutoGen, LangGraph, CrewAI, OpenCode).
//!
//! # Architecture
//!
//! - **Event Schema**: Common event format across all frameworks
//! - **Event Bus**: Pub/sub pattern for event distribution
//! - **Event Handlers**: Process and route events to appropriate handlers
//! - **Keyboard Events**: Handle keyboard input with modal awareness
//! - **Agent Events**: Framework-agnostic agent lifecycle events
//!
//! # Example
//!
//! ```rust,no_run
//! use flow_orchestrator_tui::events::{EventBus, Event, EventType};
//!
//! #[tokio::main]
//! async fn main() {
//!     let event_bus = EventBus::new();
//!
//!     // Subscribe to events
//!     let mut rx = event_bus.subscribe(None).await;
//!
//!     // Publish an event
//!     let event = Event::agent_started("agent-1");
//!     event_bus.publish(event).await.unwrap();
//!
//!     // Receive event
//!     if let Some(event) = rx.recv().await {
//!         println!("Received: {:?}", event.event_type);
//!     }
//! }
//! ```

mod agent;
mod bus;
mod handler;
mod keyboard;
mod schema;

// Re-exports
pub use agent::{AgentEvent, AgentEventPayload};
pub use bus::{EventBus, EventFilter, EventSubscriber};
pub use handler::{EventHandler, HandleResult, HandlerChain, LoggingHandler, MetricsHandler};
pub use keyboard::{KeyHandler, KeyBinding, KeyEvent, ModifierKeys, InputMode};
pub use schema::{
    Event, EventCategory, EventMetadata, EventSource, EventType, Framework, Severity,
};
