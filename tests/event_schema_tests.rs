//! Event Schema Tests
//!
//! Tests for common event schema and type definitions.

use flow_orchestrator_tui::events::{
    Event, EventCategory, EventMetadata, EventSource, EventType, Framework, Severity,
};
use std::collections::HashMap;
use uuid::Uuid;

#[test]
fn test_event_creation() {
    let source = EventSource {
        framework: Framework::ClaudeFlow,
        agent_id: Some("agent-1".to_string()),
        agent_type: Some("coder".to_string()),
        session_id: Uuid::new_v4(),
    };

    let event = Event::new(
        source,
        EventType::AgentStarted,
        EventCategory::Lifecycle,
        Severity::Info,
    );

    assert_eq!(event.schema_version, "1.0.0");
    assert_eq!(event.event_type, EventType::AgentStarted);
    assert_eq!(event.category, EventCategory::Lifecycle);
    assert_eq!(event.severity, Severity::Info);
    assert!(event.payload.is_object());
}

#[test]
fn test_event_agent_started() {
    let event = Event::agent_started("test-agent");

    assert_eq!(event.event_type, EventType::AgentStarted);
    assert_eq!(event.category, EventCategory::Lifecycle);
    assert_eq!(event.severity, Severity::Info);
    assert_eq!(event.source.framework, Framework::ClaudeFlow);
    assert_eq!(event.source.agent_id, Some("test-agent".to_string()));
}

#[test]
fn test_event_task_completed() {
    let event = Event::task_completed("agent-1", "task-123");

    assert_eq!(event.event_type, EventType::TaskCompleted);
    assert_eq!(event.category, EventCategory::Execution);
    assert_eq!(event.severity, Severity::Info);

    let task_id = event.payload["task_id"].as_str().unwrap();
    assert_eq!(task_id, "task-123");
}

#[test]
fn test_event_error() {
    let event = Event::error("Something went wrong", Some("agent-2".to_string()));

    assert_eq!(event.event_type, EventType::ErrorOccurred);
    assert_eq!(event.category, EventCategory::Error);
    assert_eq!(event.severity, Severity::Error);

    let message = event.payload["message"].as_str().unwrap();
    assert_eq!(message, "Something went wrong");
}

#[test]
fn test_event_serialization() {
    let event = Event::agent_started("test-agent");
    let json = serde_json::to_string(&event).unwrap();
    let deserialized: Event = serde_json::from_str(&json).unwrap();

    assert_eq!(event.event_id, deserialized.event_id);
    assert_eq!(event.event_type, deserialized.event_type);
    assert_eq!(event.category, deserialized.category);
    assert_eq!(event.severity, deserialized.severity);
}

#[test]
fn test_event_serialization_preserves_timestamp() {
    let event = Event::agent_started("test");
    let json = serde_json::to_string(&event).unwrap();
    let deserialized: Event = serde_json::from_str(&json).unwrap();

    assert_eq!(event.timestamp, deserialized.timestamp);
}

#[test]
fn test_framework_display() {
    assert_eq!(Framework::ClaudeFlow.to_string(), "Claude Flow");
    assert_eq!(Framework::AutoGen.to_string(), "AutoGen");
    assert_eq!(Framework::LangGraph.to_string(), "LangGraph");
    assert_eq!(Framework::CrewAI.to_string(), "CrewAI");
    assert_eq!(Framework::OpenCode.to_string(), "OpenCode");
    assert_eq!(
        Framework::Custom("MyFramework".to_string()).to_string(),
        "MyFramework"
    );
}

#[test]
fn test_event_type_display() {
    assert_eq!(EventType::AgentStarted.to_string(), "Agent Started");
    assert_eq!(EventType::AgentCompleted.to_string(), "Agent Completed");
    assert_eq!(EventType::TaskProgress.to_string(), "Task Progress");
    assert_eq!(EventType::ErrorOccurred.to_string(), "Error");
    assert_eq!(
        EventType::Custom("MyEvent".to_string()).to_string(),
        "MyEvent"
    );
}

#[test]
fn test_event_category_display() {
    assert_eq!(EventCategory::Lifecycle.to_string(), "Lifecycle");
    assert_eq!(EventCategory::Communication.to_string(), "Communication");
    assert_eq!(EventCategory::Execution.to_string(), "Execution");
    assert_eq!(EventCategory::Error.to_string(), "Error");
    assert_eq!(EventCategory::State.to_string(), "State");
    assert_eq!(EventCategory::System.to_string(), "System");
}

#[test]
fn test_severity_display() {
    assert_eq!(Severity::Debug.to_string(), "DEBUG");
    assert_eq!(Severity::Info.to_string(), "INFO");
    assert_eq!(Severity::Warning.to_string(), "WARN");
    assert_eq!(Severity::Error.to_string(), "ERROR");
    assert_eq!(Severity::Critical.to_string(), "CRIT");
}

#[test]
fn test_severity_ordering() {
    assert!(Severity::Debug < Severity::Info);
    assert!(Severity::Info < Severity::Warning);
    assert!(Severity::Warning < Severity::Error);
    assert!(Severity::Error < Severity::Critical);

    assert!(Severity::Critical > Severity::Error);
    assert!(Severity::Error > Severity::Warning);
    assert!(Severity::Warning > Severity::Info);
    assert!(Severity::Info > Severity::Debug);
}

#[test]
fn test_severity_equality() {
    assert_eq!(Severity::Info, Severity::Info);
    assert_ne!(Severity::Info, Severity::Debug);
}

#[test]
fn test_event_metadata_default() {
    let metadata = EventMetadata::default();

    assert!(metadata.trace_id.is_none());
    assert!(metadata.parent_event_id.is_none());
    assert!(metadata.tags.is_empty());
    assert!(metadata.extra.is_empty());
}

#[test]
fn test_event_metadata_with_trace_id() {
    let mut metadata = EventMetadata::default();
    metadata.trace_id = Some("trace-123".to_string());

    let json = serde_json::to_string(&metadata).unwrap();
    assert!(json.contains("trace-123"));

    let deserialized: EventMetadata = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.trace_id, Some("trace-123".to_string()));
}

#[test]
fn test_event_metadata_with_parent_event() {
    let parent_id = Uuid::new_v4();
    let mut metadata = EventMetadata::default();
    metadata.parent_event_id = Some(parent_id);

    let json = serde_json::to_string(&metadata).unwrap();
    let deserialized: EventMetadata = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.parent_event_id, Some(parent_id));
}

#[test]
fn test_event_metadata_with_tags() {
    let mut metadata = EventMetadata::default();
    metadata.tags = vec!["important".to_string(), "urgent".to_string()];

    let json = serde_json::to_string(&metadata).unwrap();
    let deserialized: EventMetadata = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.tags.len(), 2);
    assert!(deserialized.tags.contains(&"important".to_string()));
    assert!(deserialized.tags.contains(&"urgent".to_string()));
}

#[test]
fn test_event_metadata_with_extra() {
    let mut metadata = EventMetadata::default();
    let mut extra = HashMap::new();
    extra.insert("custom_field".to_string(), serde_json::json!("value"));
    extra.insert("count".to_string(), serde_json::json!(42));
    metadata.extra = extra;

    let json = serde_json::to_string(&metadata).unwrap();
    let deserialized: EventMetadata = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.extra.len(), 2);
    assert_eq!(
        deserialized.extra.get("custom_field"),
        Some(&serde_json::json!("value"))
    );
    assert_eq!(deserialized.extra.get("count"), Some(&serde_json::json!(42)));
}

#[test]
fn test_event_source_serialization() {
    let source = EventSource {
        framework: Framework::LangGraph,
        agent_id: Some("agent-99".to_string()),
        agent_type: Some("researcher".to_string()),
        session_id: Uuid::new_v4(),
    };

    let json = serde_json::to_string(&source).unwrap();
    let deserialized: EventSource = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.framework, Framework::LangGraph);
    assert_eq!(deserialized.agent_id, Some("agent-99".to_string()));
    assert_eq!(deserialized.agent_type, Some("researcher".to_string()));
    assert_eq!(deserialized.session_id, source.session_id);
}

#[test]
fn test_event_source_optional_fields() {
    let source = EventSource {
        framework: Framework::AutoGen,
        agent_id: None,
        agent_type: None,
        session_id: Uuid::new_v4(),
    };

    let json = serde_json::to_string(&source).unwrap();

    // Optional fields should not be serialized
    assert!(!json.contains("agent_id"));
    assert!(!json.contains("agent_type"));

    let deserialized: EventSource = serde_json::from_str(&json).unwrap();
    assert!(deserialized.agent_id.is_none());
    assert!(deserialized.agent_type.is_none());
}

#[test]
fn test_framework_serialization() {
    let frameworks = vec![
        Framework::ClaudeFlow,
        Framework::AutoGen,
        Framework::LangGraph,
        Framework::CrewAI,
        Framework::OpenCode,
        Framework::Custom("Test".to_string()),
    ];

    for framework in frameworks {
        let json = serde_json::to_string(&framework).unwrap();
        let deserialized: Framework = serde_json::from_str(&json).unwrap();
        assert_eq!(framework, deserialized);
    }
}

#[test]
fn test_event_type_serialization() {
    let types = vec![
        EventType::AgentStarted,
        EventType::TaskProgress,
        EventType::MessageSent,
        EventType::ErrorOccurred,
        EventType::Custom("CustomEvent".to_string()),
    ];

    for event_type in types {
        let json = serde_json::to_string(&event_type).unwrap();
        let deserialized: EventType = serde_json::from_str(&json).unwrap();
        assert_eq!(event_type, deserialized);
    }
}

#[test]
fn test_full_event_with_metadata() {
    let parent_id = Uuid::new_v4();
    let mut metadata = EventMetadata::default();
    metadata.trace_id = Some("trace-xyz".to_string());
    metadata.parent_event_id = Some(parent_id);
    metadata.tags = vec!["test".to_string()];

    let source = EventSource {
        framework: Framework::ClaudeFlow,
        agent_id: Some("agent-1".to_string()),
        agent_type: Some("tester".to_string()),
        session_id: Uuid::new_v4(),
    };

    let mut event = Event::new(
        source,
        EventType::TaskCompleted,
        EventCategory::Execution,
        Severity::Info,
    );
    event.metadata = metadata;

    let json = serde_json::to_string(&event).unwrap();
    let deserialized: Event = serde_json::from_str(&json).unwrap();

    assert_eq!(
        deserialized.metadata.trace_id,
        Some("trace-xyz".to_string())
    );
    assert_eq!(deserialized.metadata.parent_event_id, Some(parent_id));
    assert_eq!(deserialized.metadata.tags.len(), 1);
}

#[test]
fn test_event_unique_ids() {
    let event1 = Event::agent_started("agent-1");
    let event2 = Event::agent_started("agent-2");

    assert_ne!(event1.event_id, event2.event_id);
}

#[test]
fn test_event_type_equality() {
    assert_eq!(EventType::AgentStarted, EventType::AgentStarted);
    assert_ne!(EventType::AgentStarted, EventType::AgentCompleted);
}

#[test]
fn test_framework_equality() {
    assert_eq!(Framework::ClaudeFlow, Framework::ClaudeFlow);
    assert_ne!(Framework::ClaudeFlow, Framework::AutoGen);
    assert_eq!(
        Framework::Custom("X".to_string()),
        Framework::Custom("X".to_string())
    );
    assert_ne!(
        Framework::Custom("X".to_string()),
        Framework::Custom("Y".to_string())
    );
}
