//! Event Bus
//!
//! Pub/sub event distribution system with filtering and multiple subscribers.

use super::schema::{Event, EventCategory, EventType, Framework, Severity};
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

/// Event bus for publishing and subscribing to events
pub struct EventBus {
    /// Event channel sender
    tx: mpsc::UnboundedSender<Event>,
    /// Subscribers registry
    subscribers: Arc<RwLock<Vec<SubscriberEntry>>>,
}

impl EventBus {
    /// Create a new event bus
    pub fn new() -> (Self, EventBusRunner) {
        let (tx, rx) = mpsc::unbounded_channel();
        let subscribers = Arc::new(RwLock::new(Vec::new()));

        let bus = Self {
            tx,
            subscribers: subscribers.clone(),
        };

        let runner = EventBusRunner {
            rx,
            subscribers,
        };

        (bus, runner)
    }

    /// Publish an event to all subscribers
    pub async fn publish(&self, event: Event) -> Result<()> {
        self.tx
            .send(event)
            .map_err(|e| anyhow::anyhow!("Failed to publish event: {}", e))?;
        Ok(())
    }

    /// Subscribe to events with optional filter
    pub async fn subscribe(&self, filter: Option<EventFilter>) -> EventSubscriber {
        let (tx, rx) = mpsc::unbounded_channel();
        let id = Uuid::new_v4();

        let entry = SubscriberEntry {
            id,
            tx,
            filter: filter.unwrap_or_default(),
        };

        self.subscribers.write().await.push(entry);

        EventSubscriber { id, rx }
    }

    /// Unsubscribe a subscriber
    pub async fn unsubscribe(&self, subscriber_id: Uuid) {
        let mut subscribers = self.subscribers.write().await;
        subscribers.retain(|entry| entry.id != subscriber_id);
    }

    /// Get subscriber count
    pub async fn subscriber_count(&self) -> usize {
        self.subscribers.read().await.len()
    }
}

impl Clone for EventBus {
    fn clone(&self) -> Self {
        Self {
            tx: self.tx.clone(),
            subscribers: self.subscribers.clone(),
        }
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new().0
    }
}

/// Event bus runner (runs in background task)
pub struct EventBusRunner {
    /// Event receiver
    rx: mpsc::UnboundedReceiver<Event>,
    /// Subscribers registry
    subscribers: Arc<RwLock<Vec<SubscriberEntry>>>,
}

impl EventBusRunner {
    /// Run the event bus (distributes events to subscribers)
    pub async fn run(mut self) {
        while let Some(event) = self.rx.recv().await {
            let subscribers = self.subscribers.read().await;

            for entry in subscribers.iter() {
                if entry.filter.matches(&event) {
                    // Ignore send errors (subscriber might be closed)
                    let _ = entry.tx.send(event.clone());
                }
            }
        }
    }
}

/// Subscriber entry in registry
struct SubscriberEntry {
    /// Unique subscriber ID
    id: Uuid,
    /// Event sender to subscriber
    tx: mpsc::UnboundedSender<Event>,
    /// Event filter
    filter: EventFilter,
}

/// Event subscriber (receiver)
pub struct EventSubscriber {
    /// Subscriber ID
    pub id: Uuid,
    /// Event receiver
    rx: mpsc::UnboundedReceiver<Event>,
}

impl EventSubscriber {
    /// Receive next event
    pub async fn recv(&mut self) -> Option<Event> {
        self.rx.recv().await
    }

    /// Try to receive event without blocking
    pub fn try_recv(&mut self) -> Result<Event, mpsc::error::TryRecvError> {
        self.rx.try_recv()
    }

    /// Close the subscriber
    pub fn close(&mut self) {
        self.rx.close();
    }
}

/// Event filter for selective subscription
#[derive(Debug, Clone, Default)]
pub struct EventFilter {
    /// Filter by frameworks
    pub frameworks: Option<Vec<Framework>>,
    /// Filter by event types
    pub event_types: Option<Vec<EventType>>,
    /// Filter by categories
    pub categories: Option<Vec<EventCategory>>,
    /// Filter by severity (minimum level)
    pub min_severity: Option<Severity>,
    /// Filter by agent ID
    pub agent_id: Option<String>,
    /// Filter by session ID
    pub session_id: Option<Uuid>,
}

impl EventFilter {
    /// Create a new empty filter (matches all events)
    pub fn new() -> Self {
        Self::default()
    }

    /// Filter by framework
    pub fn framework(mut self, framework: Framework) -> Self {
        self.frameworks = Some(vec![framework]);
        self
    }

    /// Filter by multiple frameworks
    pub fn frameworks(mut self, frameworks: Vec<Framework>) -> Self {
        self.frameworks = Some(frameworks);
        self
    }

    /// Filter by event type
    pub fn event_type(mut self, event_type: EventType) -> Self {
        self.event_types = Some(vec![event_type]);
        self
    }

    /// Filter by multiple event types
    pub fn event_types(mut self, event_types: Vec<EventType>) -> Self {
        self.event_types = Some(event_types);
        self
    }

    /// Filter by category
    pub fn category(mut self, category: EventCategory) -> Self {
        self.categories = Some(vec![category]);
        self
    }

    /// Filter by minimum severity
    pub fn min_severity(mut self, severity: Severity) -> Self {
        self.min_severity = Some(severity);
        self
    }

    /// Filter by agent ID
    pub fn agent_id(mut self, agent_id: impl Into<String>) -> Self {
        self.agent_id = Some(agent_id.into());
        self
    }

    /// Filter by session ID
    pub fn session_id(mut self, session_id: Uuid) -> Self {
        self.session_id = Some(session_id);
        self
    }

    /// Check if event matches this filter
    pub fn matches(&self, event: &Event) -> bool {
        // Check framework filter
        if let Some(frameworks) = &self.frameworks {
            if !frameworks.contains(&event.source.framework) {
                return false;
            }
        }

        // Check event type filter
        if let Some(event_types) = &self.event_types {
            if !event_types.contains(&event.event_type) {
                return false;
            }
        }

        // Check category filter
        if let Some(categories) = &self.categories {
            if !categories.contains(&event.category) {
                return false;
            }
        }

        // Check severity filter
        if let Some(min_severity) = &self.min_severity {
            if event.severity < *min_severity {
                return false;
            }
        }

        // Check agent ID filter
        if let Some(agent_id) = &self.agent_id {
            if event.source.agent_id.as_ref() != Some(agent_id) {
                return false;
            }
        }

        // Check session ID filter
        if let Some(session_id) = &self.session_id {
            if event.source.session_id != *session_id {
                return false;
            }
        }

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::events::schema::{EventSource, Framework};

    #[test]
    fn test_event_filter_framework() {
        let filter = EventFilter::new().framework(Framework::ClaudeFlow);

        let event = Event::agent_started("test-agent");
        assert!(filter.matches(&event));

        let mut event2 = Event::agent_started("test-agent");
        event2.source.framework = Framework::AutoGen;
        assert!(!filter.matches(&event2));
    }

    #[test]
    fn test_event_filter_severity() {
        let filter = EventFilter::new().min_severity(Severity::Warning);

        let mut event_info = Event::agent_started("test-agent");
        event_info.severity = Severity::Info;
        assert!(!filter.matches(&event_info));

        let mut event_error = Event::agent_started("test-agent");
        event_error.severity = Severity::Error;
        assert!(filter.matches(&event_error));
    }

    #[tokio::test]
    async fn test_event_bus_publish_subscribe() {
        let (bus, runner) = EventBus::new();

        // Start runner in background
        tokio::spawn(runner.run());

        // Subscribe
        let mut subscriber = bus.subscribe(None).await;

        // Publish event
        let event = Event::agent_started("test-agent");
        bus.publish(event.clone()).await.unwrap();

        // Receive event
        let received = tokio::time::timeout(
            std::time::Duration::from_millis(100),
            subscriber.recv()
        )
        .await
        .expect("Timeout")
        .expect("No event received");

        assert_eq!(received.event_id, event.event_id);
    }

    #[tokio::test]
    async fn test_event_bus_filtered_subscription() {
        let (bus, runner) = EventBus::new();
        tokio::spawn(runner.run());

        // Subscribe with filter
        let filter = EventFilter::new().event_type(EventType::AgentCompleted);
        let mut subscriber = bus.subscribe(Some(filter)).await;

        // Publish non-matching event
        let event1 = Event::agent_started("test-agent");
        bus.publish(event1).await.unwrap();

        // Publish matching event
        let mut event2 = Event::agent_started("test-agent");
        event2.event_type = EventType::AgentCompleted;
        bus.publish(event2.clone()).await.unwrap();

        // Should only receive matching event
        let received = tokio::time::timeout(
            std::time::Duration::from_millis(100),
            subscriber.recv()
        )
        .await
        .expect("Timeout")
        .expect("No event received");

        assert_eq!(received.event_type, EventType::AgentCompleted);
    }
}
