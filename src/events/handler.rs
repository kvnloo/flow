//! Event Handlers
//!
//! Trait and utilities for processing events.

use super::schema::Event;
use anyhow::Result;
use async_trait::async_trait;

/// Result of event handling
#[derive(Debug, Clone, PartialEq)]
pub enum HandleResult {
    /// Event was handled successfully
    Handled,
    /// Event was handled and generated new events
    HandledWithEvents(Vec<Event>),
    /// Event was not handled (pass to next handler)
    NotHandled,
    /// Event handling failed
    Failed(String),
}

impl HandleResult {
    /// Check if event was handled
    pub fn is_handled(&self) -> bool {
        matches!(self, HandleResult::Handled | HandleResult::HandledWithEvents(_))
    }

    /// Check if handling failed
    pub fn is_failed(&self) -> bool {
        matches!(self, HandleResult::Failed(_))
    }

    /// Get generated events if any
    pub fn events(&self) -> Vec<Event> {
        match self {
            HandleResult::HandledWithEvents(events) => events.clone(),
            _ => vec![],
        }
    }
}

/// Event handler trait
#[async_trait]
pub trait EventHandler: Send + Sync {
    /// Handle an event
    async fn handle(&mut self, event: &Event) -> Result<HandleResult>;

    /// Check if this handler should process the event
    fn should_handle(&self, event: &Event) -> bool;

    /// Handler priority (higher = processed first)
    fn priority(&self) -> u8 {
        0
    }

    /// Handler name for debugging
    fn name(&self) -> &str;
}

/// Chain of event handlers
pub struct HandlerChain {
    handlers: Vec<Box<dyn EventHandler>>,
}

impl HandlerChain {
    /// Create a new handler chain
    pub fn new() -> Self {
        Self {
            handlers: Vec::new(),
        }
    }

    /// Add a handler to the chain
    pub fn add(&mut self, handler: Box<dyn EventHandler>) {
        self.handlers.push(handler);
        // Sort by priority (descending)
        self.handlers.sort_by(|a, b| b.priority().cmp(&a.priority()));
    }

    /// Process an event through the handler chain
    pub async fn process(&mut self, event: &Event) -> Result<Vec<Event>> {
        let mut generated_events = Vec::new();

        for handler in &mut self.handlers {
            if !handler.should_handle(event) {
                continue;
            }

            match handler.handle(event).await {
                Ok(HandleResult::Handled) => {
                    break; // Stop processing
                }
                Ok(HandleResult::HandledWithEvents(events)) => {
                    generated_events.extend(events);
                    break; // Stop processing
                }
                Ok(HandleResult::NotHandled) => {
                    continue; // Try next handler
                }
                Ok(HandleResult::Failed(msg)) => {
                    tracing::error!("Handler {} failed: {}", handler.name(), msg);
                    continue; // Try next handler
                }
                Err(e) => {
                    tracing::error!("Handler {} error: {}", handler.name(), e);
                    continue; // Try next handler
                }
            }
        }

        Ok(generated_events)
    }

    /// Get number of handlers
    pub fn len(&self) -> usize {
        self.handlers.len()
    }

    /// Check if chain is empty
    pub fn is_empty(&self) -> bool {
        self.handlers.is_empty()
    }
}

impl Default for HandlerChain {
    fn default() -> Self {
        Self::new()
    }
}

/// Example: Logging event handler
pub struct LoggingHandler {
    min_severity: crate::events::schema::Severity,
}

impl LoggingHandler {
    pub fn new(min_severity: crate::events::schema::Severity) -> Self {
        Self { min_severity }
    }
}

#[async_trait]
impl EventHandler for LoggingHandler {
    async fn handle(&mut self, event: &Event) -> Result<HandleResult> {
        use crate::events::schema::Severity;

        match event.severity {
            Severity::Debug => tracing::debug!("{:?}: {:?}", event.event_type, event.payload),
            Severity::Info => tracing::info!("{:?}: {:?}", event.event_type, event.payload),
            Severity::Warning => tracing::warn!("{:?}: {:?}", event.event_type, event.payload),
            Severity::Error => tracing::error!("{:?}: {:?}", event.event_type, event.payload),
            Severity::Critical => tracing::error!("{:?}: {:?} [CRITICAL]", event.event_type, event.payload),
        }

        Ok(HandleResult::NotHandled) // Don't stop processing
    }

    fn should_handle(&self, event: &Event) -> bool {
        event.severity >= self.min_severity
    }

    fn priority(&self) -> u8 {
        255 // Highest priority (log everything first)
    }

    fn name(&self) -> &str {
        "logging"
    }
}

/// Example: Metric collection handler
pub struct MetricsHandler {
    event_count: u64,
    error_count: u64,
}

impl MetricsHandler {
    pub fn new() -> Self {
        Self {
            event_count: 0,
            error_count: 0,
        }
    }

    pub fn event_count(&self) -> u64 {
        self.event_count
    }

    pub fn error_count(&self) -> u64 {
        self.error_count
    }
}

#[async_trait]
impl EventHandler for MetricsHandler {
    async fn handle(&mut self, event: &Event) -> Result<HandleResult> {
        self.event_count += 1;

        if event.category == crate::events::schema::EventCategory::Error {
            self.error_count += 1;
        }

        Ok(HandleResult::NotHandled) // Don't stop processing
    }

    fn should_handle(&self, _event: &Event) -> bool {
        true // Handle all events
    }

    fn priority(&self) -> u8 {
        200 // High priority (collect metrics early)
    }

    fn name(&self) -> &str {
        "metrics"
    }
}

impl Default for MetricsHandler {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::events::schema::{EventCategory, Severity};

    struct TestHandler {
        name: String,
        should_handle: bool,
        result: HandleResult,
    }

    impl TestHandler {
        fn new(name: impl Into<String>, should_handle: bool, result: HandleResult) -> Self {
            Self {
                name: name.into(),
                should_handle,
                result,
            }
        }
    }

    #[async_trait]
    impl EventHandler for TestHandler {
        async fn handle(&mut self, _event: &Event) -> Result<HandleResult> {
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
    async fn test_handler_chain() {
        let mut chain = HandlerChain::new();

        chain.add(Box::new(TestHandler::new("h1", true, HandleResult::NotHandled)));
        chain.add(Box::new(TestHandler::new("h2", true, HandleResult::Handled)));
        chain.add(Box::new(TestHandler::new("h3", true, HandleResult::NotHandled)));

        let event = Event::agent_started("test-agent");
        let events = chain.process(&event).await.unwrap();

        assert!(events.is_empty()); // h2 handled it, no new events
    }

    #[tokio::test]
    async fn test_handler_chain_with_events() {
        let mut chain = HandlerChain::new();

        let new_event = Event::agent_started("generated-agent");
        chain.add(Box::new(TestHandler::new(
            "h1",
            true,
            HandleResult::HandledWithEvents(vec![new_event.clone()]),
        )));

        let event = Event::agent_started("test-agent");
        let events = chain.process(&event).await.unwrap();

        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_id, new_event.event_id);
    }

    #[tokio::test]
    async fn test_logging_handler() {
        let mut handler = LoggingHandler::new(Severity::Info);

        let event = Event::agent_started("test-agent");
        assert!(handler.should_handle(&event));

        let result = handler.handle(&event).await.unwrap();
        assert_eq!(result, HandleResult::NotHandled);
    }

    #[tokio::test]
    async fn test_metrics_handler() {
        let mut handler = MetricsHandler::new();

        let event1 = Event::agent_started("test-agent");
        handler.handle(&event1).await.unwrap();

        let event2 = Event::error("test error", Some("agent-1".to_string()));
        handler.handle(&event2).await.unwrap();

        assert_eq!(handler.event_count(), 2);
        assert_eq!(handler.error_count(), 1);
    }
}
