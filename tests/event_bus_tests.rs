//! EventBus Tests
//!
//! Tests for publish/subscribe pattern with filtering and multiple subscribers.

use flow_orchestrator_tui::events::{
    EventBus, EventFilter, Event, EventCategory, EventType, Framework, Severity,
};
use std::time::Duration;
use tokio::time::timeout;
use uuid::Uuid;

#[tokio::test]
async fn test_event_bus_creation() {
    let (bus, _runner) = EventBus::new();
    assert_eq!(bus.subscriber_count().await, 0);
}

#[tokio::test]
async fn test_event_bus_clone() {
    let (bus1, _runner) = EventBus::new();
    let bus2 = bus1.clone();

    // Both should reference same subscriber registry
    let _sub = bus1.subscribe(None).await;
    assert_eq!(bus2.subscriber_count().await, 1);
}

#[tokio::test]
async fn test_publish_to_single_subscriber() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let mut subscriber = bus.subscribe(None).await;
    assert_eq!(bus.subscriber_count().await, 1);

    let event = Event::agent_started("test-agent");
    let event_id = event.event_id;

    bus.publish(event).await.unwrap();

    let received = timeout(Duration::from_millis(100), subscriber.recv())
        .await
        .expect("Timeout waiting for event")
        .expect("No event received");

    assert_eq!(received.event_id, event_id);
}

#[tokio::test]
async fn test_publish_to_multiple_subscribers() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let mut sub1 = bus.subscribe(None).await;
    let mut sub2 = bus.subscribe(None).await;
    let mut sub3 = bus.subscribe(None).await;

    assert_eq!(bus.subscriber_count().await, 3);

    let event = Event::agent_started("test-agent");
    let event_id = event.event_id;

    bus.publish(event).await.unwrap();

    // All subscribers should receive the event
    let rcv1 = timeout(Duration::from_millis(100), sub1.recv())
        .await
        .unwrap()
        .unwrap();
    let rcv2 = timeout(Duration::from_millis(100), sub2.recv())
        .await
        .unwrap()
        .unwrap();
    let rcv3 = timeout(Duration::from_millis(100), sub3.recv())
        .await
        .unwrap()
        .unwrap();

    assert_eq!(rcv1.event_id, event_id);
    assert_eq!(rcv2.event_id, event_id);
    assert_eq!(rcv3.event_id, event_id);
}

#[tokio::test]
async fn test_unsubscribe() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let mut sub1 = bus.subscribe(None).await;
    let sub2 = bus.subscribe(None).await;
    let sub1_id = sub1.id;

    assert_eq!(bus.subscriber_count().await, 2);

    // Unsubscribe first subscriber
    bus.unsubscribe(sub1_id).await;
    assert_eq!(bus.subscriber_count().await, 1);

    // Publish event
    let event = Event::agent_started("test-agent");
    bus.publish(event).await.unwrap();

    // First subscriber should not receive (channel closed)
    let result = timeout(Duration::from_millis(50), sub1.recv()).await;
    assert!(result.is_err() || result.unwrap().is_none());

    // Second subscriber still active but we don't wait for it
    drop(sub2);
}

#[tokio::test]
async fn test_subscriber_close() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let mut subscriber = bus.subscribe(None).await;

    subscriber.close();

    let event = Event::agent_started("test-agent");
    bus.publish(event).await.unwrap();

    // Closed subscriber should not receive
    let received = subscriber.recv().await;
    assert!(received.is_none());
}

#[tokio::test]
async fn test_try_recv() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let mut subscriber = bus.subscribe(None).await;

    // No event yet
    assert!(subscriber.try_recv().is_err());

    let event = Event::agent_started("test-agent");
    bus.publish(event).await.unwrap();

    // Give runner time to process
    tokio::time::sleep(Duration::from_millis(10)).await;

    // Should have event now
    let received = subscriber.try_recv().unwrap();
    assert_eq!(received.event_type, EventType::AgentStarted);
}

#[tokio::test]
async fn test_filter_by_framework() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let filter = EventFilter::new().framework(Framework::ClaudeFlow);
    let mut subscriber = bus.subscribe(Some(filter)).await;

    // Publish matching event
    let event1 = Event::agent_started("test-agent");
    bus.publish(event1.clone()).await.unwrap();

    // Publish non-matching event
    let mut event2 = Event::agent_started("other-agent");
    event2.source.framework = Framework::AutoGen;
    bus.publish(event2).await.unwrap();

    // Should only receive matching event
    let received = timeout(Duration::from_millis(100), subscriber.recv())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(received.event_id, event1.event_id);

    // No more events
    let result = timeout(Duration::from_millis(50), subscriber.recv()).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_filter_by_event_type() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let filter = EventFilter::new().event_type(EventType::AgentCompleted);
    let mut subscriber = bus.subscribe(Some(filter)).await;

    // Publish non-matching
    let event1 = Event::agent_started("test-agent");
    bus.publish(event1).await.unwrap();

    // Publish matching
    let mut event2 = Event::agent_started("test-agent");
    event2.event_type = EventType::AgentCompleted;
    bus.publish(event2.clone()).await.unwrap();

    let received = timeout(Duration::from_millis(100), subscriber.recv())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(received.event_type, EventType::AgentCompleted);
}

#[tokio::test]
async fn test_filter_by_category() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let filter = EventFilter::new().category(EventCategory::Error);
    let mut subscriber = bus.subscribe(Some(filter)).await;

    // Publish matching
    let error_event = Event::error("test error", Some("agent-1".to_string()));
    bus.publish(error_event.clone()).await.unwrap();

    // Publish non-matching
    let lifecycle_event = Event::agent_started("test-agent");
    bus.publish(lifecycle_event).await.unwrap();

    let received = timeout(Duration::from_millis(100), subscriber.recv())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(received.category, EventCategory::Error);
}

#[tokio::test]
async fn test_filter_by_severity() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let filter = EventFilter::new().min_severity(Severity::Warning);
    let mut subscriber = bus.subscribe(Some(filter)).await;

    // Publish below threshold (should be filtered out)
    let mut info_event = Event::agent_started("test-agent");
    info_event.severity = Severity::Info;
    bus.publish(info_event).await.unwrap();

    // Publish above threshold
    let mut error_event = Event::agent_started("test-agent");
    error_event.severity = Severity::Error;
    bus.publish(error_event.clone()).await.unwrap();

    let received = timeout(Duration::from_millis(100), subscriber.recv())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(received.severity, Severity::Error);
}

#[tokio::test]
async fn test_filter_by_agent_id() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let filter = EventFilter::new().agent_id("agent-1");
    let mut subscriber = bus.subscribe(Some(filter)).await;

    // Publish matching
    let event1 = Event::agent_started("agent-1");
    bus.publish(event1.clone()).await.unwrap();

    // Publish non-matching
    let event2 = Event::agent_started("agent-2");
    bus.publish(event2).await.unwrap();

    let received = timeout(Duration::from_millis(100), subscriber.recv())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(
        received.source.agent_id.as_ref().unwrap(),
        "agent-1"
    );
}

#[tokio::test]
async fn test_filter_by_session_id() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let session_id = Uuid::new_v4();
    let filter = EventFilter::new().session_id(session_id);
    let mut subscriber = bus.subscribe(Some(filter)).await;

    // Create matching event
    let mut event1 = Event::agent_started("test-agent");
    event1.source.session_id = session_id;
    bus.publish(event1.clone()).await.unwrap();

    // Create non-matching event
    let event2 = Event::agent_started("test-agent");
    bus.publish(event2).await.unwrap();

    let received = timeout(Duration::from_millis(100), subscriber.recv())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(received.source.session_id, session_id);
}

#[tokio::test]
async fn test_filter_builder_chain() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let session_id = Uuid::new_v4();
    let filter = EventFilter::new()
        .framework(Framework::ClaudeFlow)
        .event_type(EventType::AgentCompleted)
        .min_severity(Severity::Warning)
        .session_id(session_id);

    let mut subscriber = bus.subscribe(Some(filter)).await;

    // Non-matching events
    let event1 = Event::agent_started("test-agent");
    bus.publish(event1).await.unwrap();

    // Matching event
    let mut event2 = Event::agent_started("test-agent");
    event2.event_type = EventType::AgentCompleted;
    event2.severity = Severity::Warning;
    event2.source.session_id = session_id;
    bus.publish(event2.clone()).await.unwrap();

    let received = timeout(Duration::from_millis(100), subscriber.recv())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(received.event_id, event2.event_id);
}

#[tokio::test]
async fn test_multiple_subscribers_with_different_filters() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let filter1 = EventFilter::new().event_type(EventType::AgentStarted);
    let filter2 = EventFilter::new().event_type(EventType::AgentCompleted);

    let mut sub1 = bus.subscribe(Some(filter1)).await;
    let mut sub2 = bus.subscribe(Some(filter2)).await;

    // Publish event matching filter1
    let event1 = Event::agent_started("test-agent");
    bus.publish(event1.clone()).await.unwrap();

    // Publish event matching filter2
    let mut event2 = Event::agent_started("test-agent");
    event2.event_type = EventType::AgentCompleted;
    bus.publish(event2.clone()).await.unwrap();

    // Sub1 gets first event
    let rcv1 = timeout(Duration::from_millis(100), sub1.recv())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(rcv1.event_type, EventType::AgentStarted);

    // Sub2 gets second event
    let rcv2 = timeout(Duration::from_millis(100), sub2.recv())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(rcv2.event_type, EventType::AgentCompleted);
}

#[tokio::test]
async fn test_high_volume_events() {
    let (bus, runner) = EventBus::new();
    tokio::spawn(runner.run());

    let mut subscriber = bus.subscribe(None).await;

    let event_count = 1000;
    for i in 0..event_count {
        let event = Event::agent_started(format!("agent-{}", i));
        bus.publish(event).await.unwrap();
    }

    let mut received_count = 0;
    for _ in 0..event_count {
        if timeout(Duration::from_millis(500), subscriber.recv())
            .await
            .is_ok()
        {
            received_count += 1;
        }
    }

    assert_eq!(received_count, event_count);
}

#[tokio::test]
async fn test_default_filter_matches_all() {
    let filter = EventFilter::default();

    let event1 = Event::agent_started("test-agent");
    assert!(filter.matches(&event1));

    let mut event2 = Event::error("error", Some("agent-1".to_string()));
    event2.source.framework = Framework::AutoGen;
    assert!(filter.matches(&event2));
}

#[tokio::test]
async fn test_frameworks_filter() {
    let filter = EventFilter::new().frameworks(vec![
        Framework::ClaudeFlow,
        Framework::AutoGen,
    ]);

    let mut event1 = Event::agent_started("test");
    event1.source.framework = Framework::ClaudeFlow;
    assert!(filter.matches(&event1));

    let mut event2 = Event::agent_started("test");
    event2.source.framework = Framework::AutoGen;
    assert!(filter.matches(&event2));

    let mut event3 = Event::agent_started("test");
    event3.source.framework = Framework::LangGraph;
    assert!(!filter.matches(&event3));
}

#[tokio::test]
async fn test_event_types_filter() {
    let filter = EventFilter::new().event_types(vec![
        EventType::AgentStarted,
        EventType::AgentCompleted,
    ]);

    let event1 = Event::agent_started("test");
    assert!(filter.matches(&event1));

    let mut event2 = Event::agent_started("test");
    event2.event_type = EventType::AgentCompleted;
    assert!(filter.matches(&event2));

    let mut event3 = Event::agent_started("test");
    event3.event_type = EventType::TaskProgress;
    assert!(!filter.matches(&event3));
}
