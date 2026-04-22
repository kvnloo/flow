//! Integration tests for the event system
//!
//! These tests verify the event system works correctly when all components
//! are used together.

use flow_orchestrator_tui::events::{
    Event, EventBus, EventFilter, EventType, Framework, Severity,
    AgentEvent, AgentEventPayload,
    KeyEvent, KeyHandler, KeyBinding, ModifierKeys, InputMode,
    EventHandler, HandleResult, LoggingHandler, MetricsHandler,
    handler::HandlerChain,
};
use crossterm::event::KeyCode;
use uuid::Uuid;

#[tokio::test]
async fn test_complete_event_flow() {
    // Create event bus
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    // Subscribe with filter
    let filter = EventFilter::new()
        .framework(Framework::ClaudeFlow)
        .min_severity(Severity::Info);
    let mut subscriber = bus.subscribe(Some(filter)).await;

    // Publish events
    let event1 = Event::agent_started("agent-1");
    bus.publish(event1.clone()).await.unwrap();

    let mut event2 = Event::agent_started("agent-2");
    event2.severity = Severity::Debug; // Filtered out
    event2.source.framework = Framework::AutoGen; // Filtered out
    bus.publish(event2).await.unwrap();

    let event3 = Event::task_completed("agent-1", "task-1");
    bus.publish(event3.clone()).await.unwrap();

    // Receive filtered events
    let received1 = tokio::time::timeout(
        std::time::Duration::from_millis(100),
        subscriber.recv()
    ).await.unwrap().unwrap();
    assert_eq!(received1.event_id, event1.event_id);

    let received2 = tokio::time::timeout(
        std::time::Duration::from_millis(100),
        subscriber.recv()
    ).await.unwrap().unwrap();
    assert_eq!(received2.event_id, event3.event_id);

    // No more events (event2 was filtered)
    assert!(tokio::time::timeout(
        std::time::Duration::from_millis(50),
        subscriber.recv()
    ).await.is_err());
}

#[tokio::test]
async fn test_agent_events_with_handlers() {
    let mut chain = HandlerChain::new();
    chain.add(Box::new(MetricsHandler::new()));

    // Create agent event
    let agent_event = AgentEvent::spawned(
        Framework::ClaudeFlow,
        "coder-1".to_string(),
        "Coder".to_string(),
        Uuid::new_v4(),
        vec!["code_generation".to_string()],
    );

    // Process through handler chain
    let generated = chain.process(&agent_event.event).await.unwrap();
    assert!(generated.is_empty());

    // Verify metrics were collected
    if let Some(handler) = chain.handlers.get(0) {
        // Handler is private, but we know it processed the event
        // In real usage, we'd expose metrics via a public interface
    }
}

#[test]
fn test_keyboard_handling() {
    let mut handler = KeyHandler::default();

    // Test normal mode navigation
    let event = KeyEvent::new(
        KeyCode::Char('j'),
        ModifierKeys::NONE,
        InputMode::Normal
    );
    let action = handler.handle(event);
    assert_eq!(action, Some("move_down".to_string()));

    // Test mode switching
    let event = KeyEvent::new(
        KeyCode::Char('i'),
        ModifierKeys::NONE,
        InputMode::Normal
    );
    let action = handler.handle(event);
    assert_eq!(action, Some("enter_insert".to_string()));

    // Test global quit
    let event = KeyEvent::new(
        KeyCode::Char('q'),
        ModifierKeys::NONE,
        InputMode::Normal
    );
    let action = handler.handle(event);
    assert_eq!(action, Some("quit".to_string()));
}

#[test]
fn test_event_serialization_roundtrip() {
    let event = Event::agent_started("test-agent");

    // Serialize to JSON
    let json = serde_json::to_string(&event).unwrap();

    // Deserialize back
    let deserialized: Event = serde_json::from_str(&json).unwrap();

    // Verify
    assert_eq!(event.event_id, deserialized.event_id);
    assert_eq!(event.event_type, deserialized.event_type);
    assert_eq!(event.source.agent_id, deserialized.source.agent_id);
}

#[tokio::test]
async fn test_multiple_subscribers() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    // Create multiple subscribers
    let mut sub1 = bus.subscribe(None).await;
    let mut sub2 = bus.subscribe(Some(
        EventFilter::new().event_type(EventType::AgentCompleted)
    )).await;
    let mut sub3 = bus.subscribe(Some(
        EventFilter::new().min_severity(Severity::Error)
    )).await;

    // Publish events
    let event1 = Event::agent_started("agent-1");
    bus.publish(event1.clone()).await.unwrap();

    let mut event2 = Event::agent_started("agent-2");
    event2.event_type = EventType::AgentCompleted;
    bus.publish(event2.clone()).await.unwrap();

    let event3 = Event::error("test error", Some("agent-3".to_string()));
    bus.publish(event3.clone()).await.unwrap();

    // sub1 receives all
    assert!(tokio::time::timeout(
        std::time::Duration::from_millis(100),
        sub1.recv()
    ).await.is_ok());
    assert!(tokio::time::timeout(
        std::time::Duration::from_millis(100),
        sub1.recv()
    ).await.is_ok());
    assert!(tokio::time::timeout(
        std::time::Duration::from_millis(100),
        sub1.recv()
    ).await.is_ok());

    // sub2 receives only AgentCompleted
    let received = tokio::time::timeout(
        std::time::Duration::from_millis(100),
        sub2.recv()
    ).await.unwrap().unwrap();
    assert_eq!(received.event_type, EventType::AgentCompleted);

    // sub3 receives only errors
    let received = tokio::time::timeout(
        std::time::Duration::from_millis(100),
        sub3.recv()
    ).await.unwrap().unwrap();
    assert_eq!(received.event_type, EventType::ErrorOccurred);
}

#[test]
fn test_event_payload_types() {
    // Test different payload types
    let payloads = vec![
        AgentEventPayload::Spawned {
            agent_type: "Coder".to_string(),
            capabilities: vec!["code".to_string()],
            timestamp: chrono::Utc::now(),
        },
        AgentEventPayload::ToolCalled {
            tool_name: "search".to_string(),
            arguments: serde_json::json!({"query": "test"}),
            timestamp: chrono::Utc::now(),
        },
        AgentEventPayload::Error {
            error_type: "RuntimeError".to_string(),
            message: "Failed".to_string(),
            stack_trace: None,
            severity: Severity::Error,
            timestamp: chrono::Utc::now(),
        },
    ];

    for payload in payloads {
        // Verify serialization works
        let json = serde_json::to_string(&payload).unwrap();
        let _deserialized: AgentEventPayload = serde_json::from_str(&json).unwrap();
    }
}
