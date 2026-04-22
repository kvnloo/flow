//! Agent Event Tests
//!
//! Tests for framework-agnostic agent lifecycle events.

use chrono::Utc;
use flow_orchestrator_tui::events::{
    AgentEvent, AgentEventPayload,
    EventCategory, EventType, Framework, Severity,
};
use uuid::Uuid;

#[test]
fn test_agent_spawned_event() {
    let session_id = Uuid::new_v4();
    let event = AgentEvent::spawned(
        Framework::ClaudeFlow,
        "agent-1".to_string(),
        "coder".to_string(),
        session_id,
        vec!["code_generation".to_string(), "testing".to_string()],
    );

    assert_eq!(event.event.event_type, EventType::AgentStarted);
    assert_eq!(event.event.category, EventCategory::Lifecycle);
    assert_eq!(event.event.severity, Severity::Info);
    assert_eq!(event.event.source.framework, Framework::ClaudeFlow);
    assert_eq!(event.event.source.agent_id, Some("agent-1".to_string()));
    assert_eq!(event.event.source.agent_type, Some("coder".to_string()));
    assert_eq!(event.event.source.session_id, session_id);

    match event.payload {
        AgentEventPayload::Spawned {
            agent_type,
            capabilities,
            ..
        } => {
            assert_eq!(agent_type, "coder");
            assert_eq!(capabilities.len(), 2);
            assert_eq!(capabilities[0], "code_generation");
            assert_eq!(capabilities[1], "testing");
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_agent_completed_event() {
    let session_id = Uuid::new_v4();
    let result = serde_json::json!({
        "status": "success",
        "output": "Generated code"
    });

    let event = AgentEvent::completed(
        Framework::AutoGen,
        "agent-2".to_string(),
        session_id,
        result.clone(),
    );

    assert_eq!(event.event.event_type, EventType::AgentCompleted);
    assert_eq!(event.event.category, EventCategory::Lifecycle);
    assert_eq!(event.event.severity, Severity::Info);

    match event.payload {
        AgentEventPayload::Completed { result: res, .. } => {
            assert_eq!(res, result);
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_agent_message_sent_event() {
    let session_id = Uuid::new_v4();
    let event = AgentEvent::message_sent(
        Framework::LangGraph,
        "agent-1".to_string(),
        session_id,
        Some("agent-2".to_string()),
        "Hello, agent-2!".to_string(),
    );

    assert_eq!(event.event.event_type, EventType::MessageSent);
    assert_eq!(event.event.category, EventCategory::Communication);
    assert_eq!(event.event.severity, Severity::Debug);

    match event.payload {
        AgentEventPayload::MessageSent {
            to_agent, content, ..
        } => {
            assert_eq!(to_agent, Some("agent-2".to_string()));
            assert_eq!(content, "Hello, agent-2!");
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_agent_error_event() {
    let session_id = Uuid::new_v4();
    let event = AgentEvent::error(
        Framework::CrewAI,
        "agent-3".to_string(),
        session_id,
        "RuntimeError".to_string(),
        "Failed to execute task".to_string(),
        Severity::Error,
    );

    assert_eq!(event.event.event_type, EventType::ErrorOccurred);
    assert_eq!(event.event.category, EventCategory::Error);
    assert_eq!(event.event.severity, Severity::Error);

    match event.payload {
        AgentEventPayload::Error {
            error_type,
            message,
            severity,
            ..
        } => {
            assert_eq!(error_type, "RuntimeError");
            assert_eq!(message, "Failed to execute task");
            assert_eq!(severity, Severity::Error);
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_agent_error_event_with_critical_severity() {
    let session_id = Uuid::new_v4();
    let event = AgentEvent::error(
        Framework::ClaudeFlow,
        "agent-4".to_string(),
        session_id,
        "FatalError".to_string(),
        "System failure".to_string(),
        Severity::Critical,
    );

    assert_eq!(event.event.severity, Severity::Critical);

    match event.payload {
        AgentEventPayload::Error { severity, .. } => {
            assert_eq!(severity, Severity::Critical);
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_payload_serialization_spawned() {
    let payload = AgentEventPayload::Spawned {
        agent_type: "researcher".to_string(),
        capabilities: vec!["search".to_string(), "analyze".to_string()],
        timestamp: Utc::now(),
    };

    let json = serde_json::to_string(&payload).unwrap();
    let deserialized: AgentEventPayload = serde_json::from_str(&json).unwrap();

    match deserialized {
        AgentEventPayload::Spawned {
            agent_type,
            capabilities,
            ..
        } => {
            assert_eq!(agent_type, "researcher");
            assert_eq!(capabilities.len(), 2);
        }
        _ => panic!("Wrong payload type after deserialization"),
    }
}

#[test]
fn test_payload_serialization_completed() {
    let result = serde_json::json!({"key": "value"});
    let payload = AgentEventPayload::Completed {
        result: result.clone(),
        timestamp: Utc::now(),
    };

    let json = serde_json::to_string(&payload).unwrap();
    let deserialized: AgentEventPayload = serde_json::from_str(&json).unwrap();

    match deserialized {
        AgentEventPayload::Completed { result: res, .. } => {
            assert_eq!(res, result);
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_payload_serialization_message_sent() {
    let payload = AgentEventPayload::MessageSent {
        to_agent: Some("agent-2".to_string()),
        content: "Test message".to_string(),
        timestamp: Utc::now(),
    };

    let json = serde_json::to_string(&payload).unwrap();
    let deserialized: AgentEventPayload = serde_json::from_str(&json).unwrap();

    match deserialized {
        AgentEventPayload::MessageSent { content, .. } => {
            assert_eq!(content, "Test message");
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_payload_serialization_error() {
    let payload = AgentEventPayload::Error {
        error_type: "ValueError".to_string(),
        message: "Invalid input".to_string(),
        stack_trace: Some("line 42".to_string()),
        severity: Severity::Warning,
        timestamp: Utc::now(),
    };

    let json = serde_json::to_string(&payload).unwrap();
    let deserialized: AgentEventPayload = serde_json::from_str(&json).unwrap();

    match deserialized {
        AgentEventPayload::Error {
            error_type,
            message,
            stack_trace,
            severity,
            ..
        } => {
            assert_eq!(error_type, "ValueError");
            assert_eq!(message, "Invalid input");
            assert_eq!(stack_trace, Some("line 42".to_string()));
            assert_eq!(severity, Severity::Warning);
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_payload_serialization_tool_called() {
    let args = serde_json::json!({"param": "value"});
    let payload = AgentEventPayload::ToolCalled {
        tool_name: "search".to_string(),
        arguments: args.clone(),
        timestamp: Utc::now(),
    };

    let json = serde_json::to_string(&payload).unwrap();
    let deserialized: AgentEventPayload = serde_json::from_str(&json).unwrap();

    match deserialized {
        AgentEventPayload::ToolCalled {
            tool_name,
            arguments,
            ..
        } => {
            assert_eq!(tool_name, "search");
            assert_eq!(arguments, args);
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_payload_serialization_task_progress() {
    let payload = AgentEventPayload::TaskProgress {
        task_id: "task-123".to_string(),
        progress_percent: 75,
        message: Some("Processing data".to_string()),
        timestamp: Utc::now(),
    };

    let json = serde_json::to_string(&payload).unwrap();
    let deserialized: AgentEventPayload = serde_json::from_str(&json).unwrap();

    match deserialized {
        AgentEventPayload::TaskProgress {
            task_id,
            progress_percent,
            message,
            ..
        } => {
            assert_eq!(task_id, "task-123");
            assert_eq!(progress_percent, 75);
            assert_eq!(message, Some("Processing data".to_string()));
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_infer_category_severity_lifecycle() {
    let session_id = Uuid::new_v4();

    let started = AgentEvent::spawned(
        Framework::ClaudeFlow,
        "agent".to_string(),
        "coder".to_string(),
        session_id,
        vec![],
    );
    assert_eq!(started.event.category, EventCategory::Lifecycle);
    assert_eq!(started.event.severity, Severity::Info);

    let completed = AgentEvent::completed(
        Framework::ClaudeFlow,
        "agent".to_string(),
        session_id,
        serde_json::json!({}),
    );
    assert_eq!(completed.event.category, EventCategory::Lifecycle);
    assert_eq!(completed.event.severity, Severity::Info);
}

#[test]
fn test_infer_category_severity_communication() {
    let session_id = Uuid::new_v4();
    let event = AgentEvent::message_sent(
        Framework::ClaudeFlow,
        "agent-1".to_string(),
        session_id,
        None,
        "broadcast".to_string(),
    );

    assert_eq!(event.event.category, EventCategory::Communication);
    assert_eq!(event.event.severity, Severity::Debug);
}

#[test]
fn test_infer_category_severity_error() {
    let session_id = Uuid::new_v4();
    let event = AgentEvent::error(
        Framework::ClaudeFlow,
        "agent".to_string(),
        session_id,
        "Error".to_string(),
        "message".to_string(),
        Severity::Critical,
    );

    assert_eq!(event.event.category, EventCategory::Error);
    assert_eq!(event.event.severity, Severity::Critical);
}

#[test]
fn test_event_payload_roundtrip() {
    let session_id = Uuid::new_v4();
    let original = AgentEvent::spawned(
        Framework::ClaudeFlow,
        "agent-1".to_string(),
        "tester".to_string(),
        session_id,
        vec!["testing".to_string()],
    );

    // Serialize to JSON
    let json = serde_json::to_string(&original).unwrap();

    // Deserialize back
    let deserialized: AgentEvent = serde_json::from_str(&json).unwrap();

    assert_eq!(original, deserialized);
}

#[test]
fn test_custom_framework() {
    let session_id = Uuid::new_v4();
    let event = AgentEvent::spawned(
        Framework::Custom("MyFramework".to_string()),
        "agent-1".to_string(),
        "custom".to_string(),
        session_id,
        vec![],
    );

    assert_eq!(
        event.event.source.framework,
        Framework::Custom("MyFramework".to_string())
    );
}

#[test]
fn test_payload_state_update() {
    let payload = AgentEventPayload::StateUpdate {
        field: "status".to_string(),
        old_value: Some(serde_json::json!("idle")),
        new_value: serde_json::json!("active"),
        timestamp: Utc::now(),
    };

    let json = serde_json::to_string(&payload).unwrap();
    let deserialized: AgentEventPayload = serde_json::from_str(&json).unwrap();

    match deserialized {
        AgentEventPayload::StateUpdate {
            field,
            old_value,
            new_value,
            ..
        } => {
            assert_eq!(field, "status");
            assert_eq!(old_value, Some(serde_json::json!("idle")));
            assert_eq!(new_value, serde_json::json!("active"));
        }
        _ => panic!("Wrong payload type"),
    }
}

#[test]
fn test_payload_tool_result() {
    let result = serde_json::json!({"data": [1, 2, 3]});
    let payload = AgentEventPayload::ToolResult {
        tool_name: "fetch".to_string(),
        result: result.clone(),
        success: true,
        timestamp: Utc::now(),
    };

    let json = serde_json::to_string(&payload).unwrap();
    let deserialized: AgentEventPayload = serde_json::from_str(&json).unwrap();

    match deserialized {
        AgentEventPayload::ToolResult {
            tool_name,
            result: res,
            success,
            ..
        } => {
            assert_eq!(tool_name, "fetch");
            assert_eq!(res, result);
            assert!(success);
        }
        _ => panic!("Wrong payload type"),
    }
}
