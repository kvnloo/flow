//! Framework Adapter Layer
//!
//! This module provides protocol adapters for multiple AI agent frameworks,
//! enabling the TUI to communicate with Claude Flow, AutoGen, LangGraph,
//! CrewAI, and OpenCode through standardized interfaces.
//!
//! # Architecture
//!
//! The adapter layer follows the Adapter pattern to translate between:
//! - Framework-specific protocols (MCP, WebSocket, SSE)
//! - Framework-specific data formats
//! - Standardized internal event system
//!
//! # Protocol Support
//!
//! - **MCP (Model Context Protocol)**: Claude Flow, OpenCode
//! - **WebSocket**: AutoGen, CrewAI
//! - **SSE (Server-Sent Events)**: LangGraph
//!
//! # Example
//!
//! ```rust,no_run
//! use flow_orchestrator_tui::adapters::{FrameworkAdapter, ClaudeFlowAdapter};
//! use flow_orchestrator_tui::events::EventBus;
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let event_bus = EventBus::new();
//!     let adapter = ClaudeFlowAdapter::new(event_bus.clone()).await?;
//!
//!     // Connect to framework
//!     adapter.connect().await?;
//!
//!     // Start receiving events
//!     adapter.start_event_stream().await?;
//!
//!     Ok(())
//! }
//! ```

mod claude_flow;
mod autogen;
mod langgraph;
mod factory;

pub use claude_flow::ClaudeFlowAdapter;
pub use autogen::AutoGenAdapter;
pub use langgraph::LangGraphAdapter;
pub use factory::{AdapterFactory, FrameworkType};

use crate::events::{Event, EventBus};
use crate::error::Result;
use crate::state::{Agent, Task, MetricPoint};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Framework message (simplified for MVP)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub from: String,
    pub to: String,
    pub content: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Framework metric (wrapper around MetricPoint)
pub type Metric = MetricPoint;

/// Framework connection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    /// Framework endpoint URL
    pub endpoint: String,

    /// Authentication token (optional)
    pub auth_token: Option<String>,

    /// Connection timeout in seconds
    pub timeout_secs: u64,

    /// Enable TLS/SSL
    pub use_tls: bool,

    /// Additional framework-specific options
    pub options: HashMap<String, String>,
}

impl Default for ConnectionConfig {
    fn default() -> Self {
        Self {
            endpoint: String::new(),
            auth_token: None,
            timeout_secs: 30,
            use_tls: true,
            options: HashMap::new(),
        }
    }
}

/// Core trait for framework adapters
///
/// All framework adapters must implement this trait to provide
/// standardized communication with the TUI event system.
#[async_trait]
pub trait FrameworkAdapter: Send + Sync {
    /// Get the framework name (e.g., "Claude Flow", "AutoGen")
    fn framework_name(&self) -> &str;

    /// Get the protocol type (e.g., "MCP", "WebSocket", "SSE")
    fn protocol_type(&self) -> &str;

    /// Connect to the framework
    async fn connect(&mut self) -> Result<()>;

    /// Disconnect from the framework
    async fn disconnect(&mut self) -> Result<()>;

    /// Check if connected to framework
    fn is_connected(&self) -> bool;

    /// Start receiving events from framework
    ///
    /// Events are translated to internal Event types and published
    /// to the EventBus for TUI consumption.
    async fn start_event_stream(&mut self) -> Result<()>;

    /// Stop receiving events from framework
    async fn stop_event_stream(&mut self) -> Result<()>;

    /// Get list of active agents from framework
    async fn list_agents(&self) -> Result<Vec<Agent>>;

    /// Get list of active tasks from framework
    async fn list_tasks(&self) -> Result<Vec<Task>>;

    /// Get messages for a specific agent or task
    async fn get_messages(&self, entity_id: &str) -> Result<Vec<Message>>;

    /// Get metrics for a specific agent or task
    async fn get_metrics(&self, entity_id: &str) -> Result<Vec<Metric>>;

    /// Send a command to the framework
    ///
    /// Commands are framework-specific actions like:
    /// - Start/stop agent
    /// - Create task
    /// - Update configuration
    async fn send_command(&self, command: FrameworkCommand) -> Result<CommandResponse>;

    /// Health check - verify framework is responsive
    async fn health_check(&self) -> Result<HealthStatus>;
}

/// Framework command types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FrameworkCommand {
    /// Start an agent
    StartAgent {
        agent_id: String,
        config: HashMap<String, String>,
    },

    /// Stop an agent
    StopAgent {
        agent_id: String,
    },

    /// Create a new task
    CreateTask {
        task_type: String,
        description: String,
        assigned_to: Option<String>,
    },

    /// Cancel a task
    CancelTask {
        task_id: String,
    },

    /// Update agent configuration
    UpdateConfig {
        agent_id: String,
        config: HashMap<String, String>,
    },

    /// Custom framework-specific command
    Custom {
        command_type: String,
        params: HashMap<String, String>,
    },
}

/// Command response from framework
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResponse {
    /// Whether command succeeded
    pub success: bool,

    /// Response message
    pub message: String,

    /// Response data (framework-specific)
    pub data: Option<serde_json::Value>,
}

/// Health status of framework connection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    /// Whether framework is healthy
    pub healthy: bool,

    /// Response time in milliseconds
    pub response_time_ms: u64,

    /// Framework version
    pub version: Option<String>,

    /// Additional status information
    pub details: HashMap<String, String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connection_config_default() {
        let config = ConnectionConfig::default();
        assert_eq!(config.timeout_secs, 30);
        assert!(config.use_tls);
        assert!(config.options.is_empty());
    }

    #[test]
    fn test_framework_command_serialization() {
        let cmd = FrameworkCommand::StartAgent {
            agent_id: "agent-1".to_string(),
            config: HashMap::new(),
        };

        let json = serde_json::to_string(&cmd).unwrap();
        let deserialized: FrameworkCommand = serde_json::from_str(&json).unwrap();

        match deserialized {
            FrameworkCommand::StartAgent { agent_id, .. } => {
                assert_eq!(agent_id, "agent-1");
            }
            _ => panic!("Wrong command type"),
        }
    }
}
