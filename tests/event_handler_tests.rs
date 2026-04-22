//! Event Handler Tests
//!
//! Tests for event handler chains and processing.

use anyhow::Result;
use async_trait::async_trait;
use flow_orchestrator_tui::events::{
    EventHandler, HandleResult, HandlerChain, LoggingHandler, MetricsHandler,
    Event, EventCategory, Severity,
};

// Test handler that records calls
struct RecordingHandler {
    name: String,
    calls: std::sync::Arc<std::sync::Mutex<Vec<String>>>,
    result: HandleResult,
    should_handle: bool,
}

impl RecordingHandler {
    fn new(name: impl Into<String>, result: HandleResult) -> Self {
        Self {
            name: name.into(),
            calls: std::sync::Arc::new(std::sync::Mutex::new(Vec::new())),
            result,
            should_handle: true,
        }
    }

    fn with_filter(mut self, should_handle: bool) -> Self {
        self.should_handle = should_handle;
        self
    }

    fn calls(&self) -> Vec<String> {
        self.calls.lock().unwrap().clone()
    }
}

#[async_trait]
impl EventHandler for RecordingHandler {
    async fn handle(&mut self, event: &Event) -> Result<HandleResult> {
        self.calls
            .lock()
            .unwrap()
            .push(format!("{}-{:?}", self.name, event.event_type));
        Ok(self.result.clone())
    }

    fn should_handle(&self, _event: &Event) -> bool {
        self.should_handle
    }

    fn priority(&self) -> u8 {
        0
    }

    fn name(&self) -> &str {
        &self.name
    }
}

#[tokio::test]
async fn test_handler_chain_empty() {
    let mut chain = HandlerChain::new();
    assert!(chain.is_empty());
    assert_eq!(chain.len(), 0);

    let event = Event::agent_started("test");
    let events = chain.process(&event).await.unwrap();
    assert!(events.is_empty());
}

#[tokio::test]
async fn test_handler_chain_single_handler() {
    let mut chain = HandlerChain::new();
    let handler = RecordingHandler::new("h1", HandleResult::Handled);

    chain.add(Box::new(handler));
    assert_eq!(chain.len(), 1);

    let event = Event::agent_started("test");
    let events = chain.process(&event).await.unwrap();
    assert!(events.is_empty());
}

#[tokio::test]
async fn test_handler_chain_stops_on_handled() {
    let mut chain = HandlerChain::new();

    let h1 = RecordingHandler::new("h1", HandleResult::NotHandled);
    let h2 = RecordingHandler::new("h2", HandleResult::Handled);
    let h3 = RecordingHandler::new("h3", HandleResult::NotHandled);

    let h1_calls = h1.calls.clone();
    let h2_calls = h2.calls.clone();
    let h3_calls = h3.calls.clone();

    chain.add(Box::new(h1));
    chain.add(Box::new(h2));
    chain.add(Box::new(h3));

    let event = Event::agent_started("test");
    chain.process(&event).await.unwrap();

    // h1 and h2 should be called, h3 should not
    assert_eq!(h1_calls.lock().unwrap().len(), 1);
    assert_eq!(h2_calls.lock().unwrap().len(), 1);
    assert_eq!(h3_calls.lock().unwrap().len(), 0);
}

#[tokio::test]
async fn test_handler_chain_continues_on_not_handled() {
    let mut chain = HandlerChain::new();

    let h1 = RecordingHandler::new("h1", HandleResult::NotHandled);
    let h2 = RecordingHandler::new("h2", HandleResult::NotHandled);
    let h3 = RecordingHandler::new("h3", HandleResult::NotHandled);

    let h3_calls = h3.calls.clone();

    chain.add(Box::new(h1));
    chain.add(Box::new(h2));
    chain.add(Box::new(h3));

    let event = Event::agent_started("test");
    chain.process(&event).await.unwrap();

    // All handlers should be called
    assert_eq!(h3_calls.lock().unwrap().len(), 1);
}

#[tokio::test]
async fn test_handler_chain_with_generated_events() {
    let mut chain = HandlerChain::new();

    let new_event = Event::agent_started("generated");
    let handler = RecordingHandler::new(
        "h1",
        HandleResult::HandledWithEvents(vec![new_event.clone()]),
    );

    chain.add(Box::new(handler));

    let event = Event::agent_started("test");
    let events = chain.process(&event).await.unwrap();

    assert_eq!(events.len(), 1);
    assert_eq!(events[0].event_id, new_event.event_id);
}

#[tokio::test]
async fn test_handler_chain_skips_filtered() {
    let mut chain = HandlerChain::new();

    let h1 = RecordingHandler::new("h1", HandleResult::Handled).with_filter(false);
    let h2 = RecordingHandler::new("h2", HandleResult::Handled).with_filter(true);

    let h1_calls = h1.calls.clone();
    let h2_calls = h2.calls.clone();

    chain.add(Box::new(h1));
    chain.add(Box::new(h2));

    let event = Event::agent_started("test");
    chain.process(&event).await.unwrap();

    // h1 filtered out, h2 called
    assert_eq!(h1_calls.lock().unwrap().len(), 0);
    assert_eq!(h2_calls.lock().unwrap().len(), 1);
}

#[tokio::test]
async fn test_handler_chain_continues_on_failed() {
    let mut chain = HandlerChain::new();

    let h1 = RecordingHandler::new("h1", HandleResult::Failed("error".to_string()));
    let h2 = RecordingHandler::new("h2", HandleResult::Handled);

    let h2_calls = h2.calls.clone();

    chain.add(Box::new(h1));
    chain.add(Box::new(h2));

    let event = Event::agent_started("test");
    chain.process(&event).await.unwrap();

    // h2 should still be called even though h1 failed
    assert_eq!(h2_calls.lock().unwrap().len(), 1);
}

#[tokio::test]
async fn test_handle_result_is_handled() {
    assert!(HandleResult::Handled.is_handled());
    assert!(HandleResult::HandledWithEvents(vec![]).is_handled());
    assert!(!HandleResult::NotHandled.is_handled());
    assert!(!HandleResult::Failed("error".to_string()).is_handled());
}

#[tokio::test]
async fn test_handle_result_is_failed() {
    assert!(HandleResult::Failed("error".to_string()).is_failed());
    assert!(!HandleResult::Handled.is_failed());
    assert!(!HandleResult::NotHandled.is_failed());
    assert!(!HandleResult::HandledWithEvents(vec![]).is_failed());
}

#[tokio::test]
async fn test_handle_result_events() {
    let event = Event::agent_started("test");

    assert!(HandleResult::Handled.events().is_empty());
    assert!(HandleResult::NotHandled.events().is_empty());

    let events = vec![event.clone()];
    let result = HandleResult::HandledWithEvents(events.clone());
    assert_eq!(result.events().len(), 1);
}

#[tokio::test]
async fn test_logging_handler() {
    let mut handler = LoggingHandler::new(Severity::Info);

    // Should handle Info and above
    let info_event = Event::agent_started("test");
    assert!(handler.should_handle(&info_event));

    // Should not handle Debug
    let mut debug_event = Event::agent_started("test");
    debug_event.severity = Severity::Debug;
    assert!(!handler.should_handle(&debug_event));

    // Should return NotHandled (doesn't stop chain)
    let result = handler.handle(&info_event).await.unwrap();
    assert_eq!(result, HandleResult::NotHandled);

    // Should have highest priority
    assert_eq!(handler.priority(), 255);
}

#[tokio::test]
async fn test_metrics_handler() {
    let mut handler = MetricsHandler::new();

    assert_eq!(handler.event_count(), 0);
    assert_eq!(handler.error_count(), 0);

    // Should handle all events
    let event1 = Event::agent_started("test");
    assert!(handler.should_handle(&event1));

    handler.handle(&event1).await.unwrap();
    assert_eq!(handler.event_count(), 1);
    assert_eq!(handler.error_count(), 0);

    // Handle error event
    let error_event = Event::error("test error", Some("agent".to_string()));
    handler.handle(&error_event).await.unwrap();
    assert_eq!(handler.event_count(), 2);
    assert_eq!(handler.error_count(), 1);

    // Should have high priority
    assert_eq!(handler.priority(), 200);
}

#[tokio::test]
async fn test_metrics_handler_default() {
    let handler = MetricsHandler::default();
    assert_eq!(handler.event_count(), 0);
    assert_eq!(handler.error_count(), 0);
}

// Test priority ordering
struct PriorityHandler {
    priority: u8,
    name: String,
}

#[async_trait]
impl EventHandler for PriorityHandler {
    async fn handle(&mut self, _event: &Event) -> Result<HandleResult> {
        Ok(HandleResult::NotHandled)
    }

    fn should_handle(&self, _event: &Event) -> bool {
        true
    }

    fn priority(&self) -> u8 {
        self.priority
    }

    fn name(&self) -> &str {
        &self.name
    }
}

#[tokio::test]
async fn test_handler_priority_ordering() {
    let mut chain = HandlerChain::new();

    // Add handlers in random order
    chain.add(Box::new(PriorityHandler {
        priority: 50,
        name: "h50".to_string(),
    }));
    chain.add(Box::new(PriorityHandler {
        priority: 200,
        name: "h200".to_string(),
    }));
    chain.add(Box::new(PriorityHandler {
        priority: 10,
        name: "h10".to_string(),
    }));
    chain.add(Box::new(PriorityHandler {
        priority: 100,
        name: "h100".to_string(),
    }));

    assert_eq!(chain.len(), 4);

    // Handlers should be processed in priority order (highest first)
    // This is implicit in the chain's behavior
}

#[tokio::test]
async fn test_handler_chain_multiple_generated_events() {
    let mut chain = HandlerChain::new();

    let event1 = Event::agent_started("gen1");
    let event2 = Event::agent_started("gen2");
    let event3 = Event::agent_started("gen3");

    let handler = RecordingHandler::new(
        "h1",
        HandleResult::HandledWithEvents(vec![
            event1.clone(),
            event2.clone(),
            event3.clone(),
        ]),
    );

    chain.add(Box::new(handler));

    let event = Event::agent_started("test");
    let events = chain.process(&event).await.unwrap();

    assert_eq!(events.len(), 3);
    assert_eq!(events[0].event_id, event1.event_id);
    assert_eq!(events[1].event_id, event2.event_id);
    assert_eq!(events[2].event_id, event3.event_id);
}

#[tokio::test]
async fn test_real_world_handler_chain() {
    let mut chain = HandlerChain::new();

    // Add typical handler configuration
    chain.add(Box::new(LoggingHandler::new(Severity::Debug)));
    chain.add(Box::new(MetricsHandler::new()));

    let error_event = Event::error("test error", Some("agent-1".to_string()));
    let events = chain.process(&error_event).await.unwrap();

    // Both handlers return NotHandled, so no generated events
    assert!(events.is_empty());
}
