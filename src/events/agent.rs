//! Agent Events
//!
//! Framework-agnostic agent lifecycle and execution events.

use super::schema::{Event, EventCategory, EventSource, EventType, Framework, Severity};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Agent event with typed payload
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AgentEvent {
    /// Event metadata
    pub event: Event,
    /// Typed payload
    pub payload: AgentEventPayload,
}

impl AgentEvent {
    /// Create a new agent event
    pub fn new(
        framework: Framework,
        agent_id: String,
        agent_type: Option<String>,
        session_id: Uuid,
        event_type: EventType,
        payload: AgentEventPayload,
    ) -> Self {
        let source = EventSource {
            framework,
            agent_id: Some(agent_id),
            agent_type,
            session_id,
        };

        let (category, severity) = Self::infer_category_severity(&event_type, &payload);

        let mut event = Event::new(source, event_type, category, severity);
        event.payload = serde_json::to_value(&payload).unwrap_or_default();

        Self { event, payload }
    }

    /// Infer category and severity from event type and payload
    fn infer_category_severity(
        event_type: &EventType,
        payload: &AgentEventPayload,
    ) -> (EventCategory, Severity) {
        match event_type {
            EventType::AgentStarted | EventType::AgentCompleted | EventType::AgentTerminated => {
                (EventCategory::Lifecycle, Severity::Info)
            }
            EventType::AgentFailed => (EventCategory::Lifecycle, Severity::Error),
            EventType::AgentPaused | EventType::AgentResumed => {
                (EventCategory::Lifecycle, Severity::Debug)
            }
            EventType::MessageSent | EventType::MessageReceived => {
                (EventCategory::Communication, Severity::Debug)
            }
            EventType::ToolCalled | EventType::ToolResult => {
                (EventCategory::Execution, Severity::Debug)
            }
            EventType::TaskProgress => (EventCategory::Execution, Severity::Info),
            EventType::TaskCompleted => (EventCategory::Execution, Severity::Info),
            EventType::TaskFailed => (EventCategory::Execution, Severity::Error),
            EventType::ErrorOccurred => {
                if let AgentEventPayload::Error { severity, .. } = payload {
                    (EventCategory::Error, *severity)
                } else {
                    (EventCategory::Error, Severity::Error)
                }
            }
            _ => (EventCategory::System, Severity::Info),
        }
    }

    /// Create agent spawned event
    pub fn spawned(
        framework: Framework,
        agent_id: String,
        agent_type: String,
        session_id: Uuid,
        capabilities: Vec<String>,
    ) -> Self {
        Self::new(
            framework,
            agent_id,
            Some(agent_type.clone()),
            session_id,
            EventType::AgentStarted,
            AgentEventPayload::Spawned {
                agent_type,
                capabilities,
                timestamp: Utc::now(),
            },
        )
    }

    /// Create agent completed event
    pub fn completed(
        framework: Framework,
        agent_id: String,
        session_id: Uuid,
        result: serde_json::Value,
    ) -> Self {
        Self::new(
            framework,
            agent_id,
            None,
            session_id,
            EventType::AgentCompleted,
            AgentEventPayload::Completed {
                result,
                timestamp: Utc::now(),
            },
        )
    }

    /// Create message sent event
    pub fn message_sent(
        framework: Framework,
        agent_id: String,
        session_id: Uuid,
        to_agent: Option<String>,
        content: String,
    ) -> Self {
        Self::new(
            framework,
            agent_id,
            None,
            session_id,
            EventType::MessageSent,
            AgentEventPayload::MessageSent {
                to_agent,
                content,
                timestamp: Utc::now(),
            },
        )
    }

    /// Create error event
    pub fn error(
        framework: Framework,
        agent_id: String,
        session_id: Uuid,
        error_type: String,
        message: String,
        severity: Severity,
    ) -> Self {
        Self::new(
            framework,
            agent_id,
            None,
            session_id,
            EventType::ErrorOccurred,
            AgentEventPayload::Error {
                error_type,
                message,
                stack_trace: None,
                severity,
                timestamp: Utc::now(),
            },
        )
    }
}

/// Agent event payload variants
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AgentEventPayload {
    /// Agent was spawned
    Spawned {
        agent_type: String,
        capabilities: Vec<String>,
        timestamp: DateTime<Utc>,
    },

    /// Agent completed execution
    Completed {
        result: serde_json::Value,
        timestamp: DateTime<Utc>,
    },

    /// Agent failed
    Failed {
        error_type: String,
        message: String,
        timestamp: DateTime<Utc>,
    },

    /// Agent paused
    Paused { timestamp: DateTime<Utc> },

    /// Agent resumed
    Resumed { timestamp: DateTime<Utc> },

    /// Agent terminated
    Terminated {
        reason: String,
        timestamp: DateTime<Utc>,
    },

    /// Message sent to another agent
    MessageSent {
        to_agent: Option<String>,
        content: String,
        timestamp: DateTime<Utc>,
    },

    /// Message received from another agent
    MessageReceived {
        from_agent: String,
        content: String,
        timestamp: DateTime<Utc>,
    },

    /// Tool called
    ToolCalled {
        tool_name: String,
        arguments: serde_json::Value,
        timestamp: DateTime<Utc>,
    },

    /// Tool execution result
    ToolResult {
        tool_name: String,
        result: serde_json::Value,
        success: bool,
        timestamp: DateTime<Utc>,
    },

    /// Task progress update
    TaskProgress {
        task_id: String,
        progress_percent: u8,
        message: Option<String>,
        timestamp: DateTime<Utc>,
    },

    /// Error occurred
    Error {
        error_type: String,
        message: String,
        stack_trace: Option<String>,
        severity: Severity,
        timestamp: DateTime<Utc>,
    },

    /// Generic state update
    StateUpdate {
        field: String,
        old_value: Option<serde_json::Value>,
        new_value: serde_json::Value,
        timestamp: DateTime<Utc>,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_spawned_event() {
        let event = AgentEvent::spawned(
            Framework::ClaudeFlow,
            "agent-1".to_string(),
            "coder".to_string(),
            Uuid::new_v4(),
            vec!["code_generation".to_string()],
        );

        assert_eq!(event.event.event_type, EventType::AgentStarted);
        assert_eq!(event.event.category, EventCategory::Lifecycle);
        assert_eq!(event.event.severity, Severity::Info);

        match event.payload {
            AgentEventPayload::Spawned {
                agent_type,
                capabilities,
                ..
            } => {
                assert_eq!(agent_type, "coder");
                assert_eq!(capabilities.len(), 1);
            }
            _ => panic!("Wrong payload type"),
        }
    }

    #[test]
    fn test_agent_error_event() {
        let event = AgentEvent::error(
            Framework::ClaudeFlow,
            "agent-1".to_string(),
            Uuid::new_v4(),
            "RuntimeError".to_string(),
            "Failed to execute task".to_string(),
            Severity::Error,
        );

        assert_eq!(event.event.event_type, EventType::ErrorOccurred);
        assert_eq!(event.event.category, EventCategory::Error);
        assert_eq!(event.event.severity, Severity::Error);
    }

    #[test]
    fn test_payload_serialization() {
        let payload = AgentEventPayload::MessageSent {
            to_agent: Some("agent-2".to_string()),
            content: "Hello".to_string(),
            timestamp: Utc::now(),
        };

        let json = serde_json::to_string(&payload).unwrap();
        let deserialized: AgentEventPayload = serde_json::from_str(&json).unwrap();

        match deserialized {
            AgentEventPayload::MessageSent { content, .. } => {
                assert_eq!(content, "Hello");
            }
            _ => panic!("Wrong payload type after deserialization"),
        }
    }
}
