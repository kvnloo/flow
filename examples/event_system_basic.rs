//! Basic Event System Usage Example
//!
//! Demonstrates the core event system features:
//! - Creating and publishing events
//! - Subscribing with filters
//! - Event handlers
//! - Agent events with typed payloads

use flow_orchestrator_tui::events::{
    Event, EventBus, EventFilter, EventType, Framework, Severity,
    AgentEvent, AgentEventPayload,
    EventHandler, HandleResult, LoggingHandler, MetricsHandler,
    handler::HandlerChain,
};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    println!("=== Flow Orchestrator Event System Example ===\n");

    // 1. Create event bus
    let (bus, runner) = EventBus::new();

    // Start runner in background
    tokio::spawn(runner.run());

    println!("✅ Event bus created\n");

    // 2. Subscribe to all events
    let mut all_events = bus.subscribe(None).await;
    println!("✅ Subscribed to all events");

    // 3. Subscribe to errors only
    let filter = EventFilter::new()
        .min_severity(Severity::Error);
    let mut errors_only = bus.subscribe(Some(filter)).await;
    println!("✅ Subscribed to errors only\n");

    // 4. Create and publish events
    println!("📤 Publishing events...\n");

    // Agent started event
    let event1 = Event::agent_started("agent-001");
    bus.publish(event1.clone()).await?;
    println!("  • Published: Agent Started (agent-001)");

    // Task completed event
    let event2 = Event::task_completed("agent-001", "task-123");
    bus.publish(event2.clone()).await?;
    println!("  • Published: Task Completed (task-123)");

    // Error event
    let event3 = Event::error("Connection timeout", Some("agent-002".to_string()));
    bus.publish(event3.clone()).await?;
    println!("  • Published: Error (agent-002)\n");

    // 5. Receive events
    println!("📥 Receiving events...\n");

    // Receive from all_events subscriber
    tokio::select! {
        Some(event) = all_events.recv() => {
            println!("  [ALL] Received: {:?}", event.event_type);
        }
        _ = tokio::time::sleep(std::time::Duration::from_millis(100)) => {}
    }

    tokio::select! {
        Some(event) = all_events.recv() => {
            println!("  [ALL] Received: {:?}", event.event_type);
        }
        _ = tokio::time::sleep(std::time::Duration::from_millis(100)) => {}
    }

    tokio::select! {
        Some(event) = all_events.recv() => {
            println!("  [ALL] Received: {:?}", event.event_type);
        }
        _ = tokio::time::sleep(std::time::Duration::from_millis(100)) => {}
    }

    // Receive from errors_only subscriber
    tokio::select! {
        Some(event) = errors_only.recv() => {
            println!("  [ERRORS] Received: {:?} (filtered)", event.event_type);
        }
        _ = tokio::time::sleep(std::time::Duration::from_millis(100)) => {}
    }

    println!();

    // 6. Agent events with typed payloads
    println!("🤖 Agent Events with Typed Payloads...\n");

    let agent_event = AgentEvent::spawned(
        Framework::ClaudeFlow,
        "coder-001".to_string(),
        "Coder".to_string(),
        Uuid::new_v4(),
        vec!["code_generation".to_string(), "code_review".to_string()],
    );

    println!("  • Agent Event: {:?}", agent_event.event.event_type);
    println!("  • Payload: {:?}", agent_event.payload);
    println!();

    // 7. Event handlers
    println!("🔧 Event Handlers...\n");

    let mut chain = HandlerChain::new();
    chain.add(Box::new(LoggingHandler::new(Severity::Info)));
    chain.add(Box::new(MetricsHandler::new()));

    let test_event = Event::agent_started("handler-test");
    let generated = chain.process(&test_event).await?;
    println!("  • Processed through handler chain");
    println!("  • Generated {} new events", generated.len());
    println!();

    // 8. Statistics
    println!("📊 Statistics:");
    let subscriber_count = bus.subscriber_count().await;
    println!("  • Active subscribers: {}", subscriber_count);
    println!("  • Events published: 3");
    println!();

    println!("✅ Example completed successfully!");

    Ok(())
}
