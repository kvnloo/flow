//! Common Event Schema
//!
//! Unified event format across all agent frameworks with framework-agnostic structure.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Common event schema (unified across frameworks)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Event {
    /// Schema version for compatibility
    pub schema_version: String,

    /// Unique event identifier
    pub event_id: Uuid,

    /// Event timestamp
    pub timestamp: DateTime<Utc>,

    /// Event source information
    pub source: EventSource,

    /// Event type/category
    #[serde(rename = "type")]
    pub event_type: EventType,

    /// Broad category classification
    pub category: EventCategory,

    /// Severity level
    pub severity: Severity,

    /// Framework-specific payload data
    pub payload: serde_json::Value,

    /// Additional metadata
    pub metadata: EventMetadata,
}

impl Event {
    /// Create a new event with default values
    pub fn new(
        source: EventSource,
        event_type: EventType,
        category: EventCategory,
        severity: Severity,
    ) -> Self {
        Self {
            schema_version: "1.0.0".to_string(),
            event_id: Uuid::new_v4(),
            timestamp: Utc::now(),
            source,
            event_type,
            category,
            severity,
            payload: serde_json::json!({}),
            metadata: EventMetadata::default(),
        }
    }

    /// Create an agent started event
    pub fn agent_started(agent_id: impl Into<String>) -> Self {
        Self::new(
            EventSource {
                framework: Framework::ClaudeFlow,
                agent_id: Some(agent_id.into()),
                agent_type: None,
                session_id: Uuid::new_v4(),
            },
            EventType::AgentStarted,
            EventCategory::Lifecycle,
            Severity::Info,
        )
    }

    /// Create a task completed event
    pub fn task_completed(agent_id: impl Into<String>, task_id: impl Into<String>) -> Self {
        let mut event = Self::new(
            EventSource {
                framework: Framework::ClaudeFlow,
                agent_id: Some(agent_id.into()),
                agent_type: None,
                session_id: Uuid::new_v4(),
            },
            EventType::TaskCompleted,
            EventCategory::Execution,
            Severity::Info,
        );
        event.payload = serde_json::json!({
            "task_id": task_id.into()
        });
        event
    }

    /// Create an error event
    pub fn error(message: impl Into<String>, agent_id: Option<String>) -> Self {
        let mut event = Self::new(
            EventSource {
                framework: Framework::ClaudeFlow,
                agent_id,
                agent_type: None,
                session_id: Uuid::new_v4(),
            },
            EventType::ErrorOccurred,
            EventCategory::Error,
            Severity::Error,
        );
        event.payload = serde_json::json!({
            "message": message.into()
        });
        event
    }
}

/// Event source information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EventSource {
    /// Framework that generated this event
    pub framework: Framework,

    /// Agent ID (if applicable)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,

    /// Agent type (if known)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_type: Option<String>,

    /// Session ID
    pub session_id: Uuid,
}

/// Agent framework identifier
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "kebab-case")]
pub enum Framework {
    /// Claude Flow (MCP-based)
    ClaudeFlow,
    /// Microsoft AutoGen
    AutoGen,
    /// LangChain LangGraph
    LangGraph,
    /// CrewAI
    CrewAI,
    /// OpenCode
    OpenCode,
    /// Custom framework
    Custom(String),
}

impl std::fmt::Display for Framework {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Framework::ClaudeFlow => write!(f, "Claude Flow"),
            Framework::AutoGen => write!(f, "AutoGen"),
            Framework::LangGraph => write!(f, "LangGraph"),
            Framework::CrewAI => write!(f, "CrewAI"),
            Framework::OpenCode => write!(f, "OpenCode"),
            Framework::Custom(name) => write!(f, "{}", name),
        }
    }
}

/// Event type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum EventType {
    // Lifecycle events
    AgentStarted,
    AgentCompleted,
    AgentFailed,
    AgentPaused,
    AgentResumed,
    AgentTerminated,

    // Task events
    TaskAssigned,
    TaskStarted,
    TaskProgress,
    TaskCompleted,
    TaskFailed,
    TaskCancelled,

    // Communication events
    MessageSent,
    MessageReceived,
    HandoffInitiated,
    HandoffCompleted,

    // Tool events
    ToolCalled,
    ToolResult,

    // State events
    StateUpdated,
    CheckpointCreated,

    // Session events
    SessionStarted,
    SessionPaused,
    SessionResumed,
    SessionEnded,

    // Error events
    ErrorOccurred,

    // Custom event type
    Custom(String),
}

impl std::fmt::Display for EventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EventType::AgentStarted => write!(f, "Agent Started"),
            EventType::AgentCompleted => write!(f, "Agent Completed"),
            EventType::AgentFailed => write!(f, "Agent Failed"),
            EventType::AgentPaused => write!(f, "Agent Paused"),
            EventType::AgentResumed => write!(f, "Agent Resumed"),
            EventType::AgentTerminated => write!(f, "Agent Terminated"),
            EventType::TaskAssigned => write!(f, "Task Assigned"),
            EventType::TaskStarted => write!(f, "Task Started"),
            EventType::TaskProgress => write!(f, "Task Progress"),
            EventType::TaskCompleted => write!(f, "Task Completed"),
            EventType::TaskFailed => write!(f, "Task Failed"),
            EventType::TaskCancelled => write!(f, "Task Cancelled"),
            EventType::MessageSent => write!(f, "Message Sent"),
            EventType::MessageReceived => write!(f, "Message Received"),
            EventType::HandoffInitiated => write!(f, "Handoff Initiated"),
            EventType::HandoffCompleted => write!(f, "Handoff Completed"),
            EventType::ToolCalled => write!(f, "Tool Called"),
            EventType::ToolResult => write!(f, "Tool Result"),
            EventType::StateUpdated => write!(f, "State Updated"),
            EventType::CheckpointCreated => write!(f, "Checkpoint Created"),
            EventType::SessionStarted => write!(f, "Session Started"),
            EventType::SessionPaused => write!(f, "Session Paused"),
            EventType::SessionResumed => write!(f, "Session Resumed"),
            EventType::SessionEnded => write!(f, "Session Ended"),
            EventType::ErrorOccurred => write!(f, "Error"),
            EventType::Custom(name) => write!(f, "{}", name),
        }
    }
}

/// Event category for broad classification
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum EventCategory {
    /// Agent/task lifecycle events
    Lifecycle,
    /// Inter-agent communication
    Communication,
    /// Task execution and tool calls
    Execution,
    /// Error and exception events
    Error,
    /// State changes and checkpoints
    State,
    /// System-level events
    System,
}

impl std::fmt::Display for EventCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EventCategory::Lifecycle => write!(f, "Lifecycle"),
            EventCategory::Communication => write!(f, "Communication"),
            EventCategory::Execution => write!(f, "Execution"),
            EventCategory::Error => write!(f, "Error"),
            EventCategory::State => write!(f, "State"),
            EventCategory::System => write!(f, "System"),
        }
    }
}

/// Event severity level
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    /// Debug-level information
    Debug,
    /// Informational message
    Info,
    /// Warning message
    Warning,
    /// Error condition
    Error,
    /// Critical failure
    Critical,
}

impl std::fmt::Display for Severity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Severity::Debug => write!(f, "DEBUG"),
            Severity::Info => write!(f, "INFO"),
            Severity::Warning => write!(f, "WARN"),
            Severity::Error => write!(f, "ERROR"),
            Severity::Critical => write!(f, "CRIT"),
        }
    }
}

/// Event metadata for additional context
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct EventMetadata {
    /// Distributed tracing ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,

    /// Parent event ID (for causal relationships)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_event_id: Option<Uuid>,

    /// Event tags for filtering
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,

    /// Additional custom metadata
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_creation() {
        let event = Event::agent_started("test-agent");
        assert_eq!(event.event_type, EventType::AgentStarted);
        assert_eq!(event.category, EventCategory::Lifecycle);
        assert_eq!(event.severity, Severity::Info);
    }

    #[test]
    fn test_event_serialization() {
        let event = Event::agent_started("test-agent");
        let json = serde_json::to_string(&event).unwrap();
        let deserialized: Event = serde_json::from_str(&json).unwrap();
        assert_eq!(event.event_id, deserialized.event_id);
    }

    #[test]
    fn test_framework_display() {
        assert_eq!(Framework::ClaudeFlow.to_string(), "Claude Flow");
        assert_eq!(Framework::AutoGen.to_string(), "AutoGen");
    }

    #[test]
    fn test_severity_ordering() {
        assert!(Severity::Debug < Severity::Info);
        assert!(Severity::Info < Severity::Warning);
        assert!(Severity::Warning < Severity::Error);
        assert!(Severity::Error < Severity::Critical);
    }
}
