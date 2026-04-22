# Flow Orchestrator TUI - Test Strategy

**Version:** 1.0
**Date:** 2025-11-25
**Status:** Active

---

## 1. Test Pyramid Overview

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲             ~5% - End-to-End Tests
                 ╱──────╲            - Full TUI integration
                ╱        ╲           - Authentication flows
               ╱Integration╲        - Framework adapters
              ╱────────────╲        ~15% - Integration Tests
             ╱              ╲       - Dashboard rendering
            ╱   Unit Tests   ╲     - Event coordination
           ╱──────────────────╲    - Multi-component flows
          ╱____________________╲
                                    ~80% - Unit Tests
                                    - Pure functions
                                    - State machines
                                    - Data transformations
```

### Test Distribution Goals
- **Unit Tests:** 80% of test suite (fast, isolated, comprehensive)
- **Integration Tests:** 15% of test suite (component coordination)
- **E2E Tests:** 5% of test suite (critical user journeys)

### Quality Targets
- **Code Coverage:** ≥ 80% line coverage, ≥ 70% branch coverage
- **Performance:** All tests complete in < 30 seconds
- **Reliability:** < 0.1% flake rate (1 failure per 1000 runs)
- **Maintainability:** Each test < 50 lines, clear arrange-act-assert pattern

---

## 2. Unit Test Strategy

### 2.1 Test Organization

```
flow/
├── src/
│   ├── state/
│   │   ├── mod.rs
│   │   └── tests.rs              # State management tests
│   ├── events/
│   │   ├── mod.rs
│   │   └── tests.rs              # Event handling tests
│   ├── auth/
│   │   ├── pkce.rs
│   │   ├── storage.rs
│   │   └── tests/                # Auth module tests
│   │       ├── mod.rs
│   │       ├── pkce_tests.rs
│   │       └── storage_tests.rs
│   └── ui/
│       └── tests/                # UI component tests
└── tests/                        # Integration & E2E tests
    ├── common/
    │   └── mod.rs                # Shared test utilities
    ├── integration/
    │   ├── dashboard_tests.rs
    │   └── adapter_tests.rs
    └── e2e/
        └── full_flow_tests.rs
```

### 2.2 Unit Test Guidelines

**Principles:**
- **Fast:** Each test < 10ms execution time
- **Isolated:** No shared state, no I/O operations
- **Deterministic:** Same input always produces same output
- **Self-Documenting:** Test name describes scenario and expected outcome

**Naming Convention:**
```rust
#[test]
fn test_{component}_{scenario}_{expected_outcome}()

// Examples:
fn test_agent_state_transition_idle_to_running_success()
fn test_pkce_generation_creates_valid_challenge()
fn test_log_buffer_exceeds_capacity_drops_oldest()
```

### 2.3 State Management Tests

```rust
// src/state/tests.rs
use super::*;

#[cfg(test)]
mod state_tests {
    use super::*;

    #[test]
    fn test_agent_state_new_default_values() {
        let state = AgentState::new("test-agent");

        assert_eq!(state.id, "test-agent");
        assert_eq!(state.status, AgentStatus::Idle);
        assert_eq!(state.task_count, 0);
        assert!(state.metrics.is_empty());
    }

    #[test]
    fn test_agent_state_transition_idle_to_running() {
        let mut state = AgentState::new("agent-1");

        let result = state.transition_to(AgentStatus::Running);

        assert!(result.is_ok());
        assert_eq!(state.status, AgentStatus::Running);
        assert!(state.last_transition.elapsed().as_secs() < 1);
    }

    #[test]
    fn test_agent_state_transition_invalid_fails() {
        let mut state = AgentState::new("agent-1");
        state.status = AgentStatus::Stopped;

        let result = state.transition_to(AgentStatus::Running);

        assert!(result.is_err());
        assert_eq!(state.status, AgentStatus::Stopped); // No change
    }

    #[test]
    fn test_dashboard_state_add_agent_increments_count() {
        let mut dashboard = DashboardState::default();

        dashboard.add_agent(AgentState::new("agent-1"));
        dashboard.add_agent(AgentState::new("agent-2"));

        assert_eq!(dashboard.agent_count(), 2);
        assert!(dashboard.get_agent("agent-1").is_some());
    }

    #[test]
    fn test_dashboard_state_remove_agent_decrements_count() {
        let mut dashboard = DashboardState::default();
        dashboard.add_agent(AgentState::new("agent-1"));

        let removed = dashboard.remove_agent("agent-1");

        assert!(removed.is_some());
        assert_eq!(dashboard.agent_count(), 0);
    }

    #[test]
    fn test_log_buffer_circular_buffer_drops_oldest() {
        let mut buffer = LogBuffer::with_capacity(3);

        buffer.push(LogEntry::new(LogLevel::Info, "msg1"));
        buffer.push(LogEntry::new(LogLevel::Info, "msg2"));
        buffer.push(LogEntry::new(LogLevel::Info, "msg3"));
        buffer.push(LogEntry::new(LogLevel::Info, "msg4"));

        assert_eq!(buffer.len(), 3);
        assert_eq!(buffer.get(0).unwrap().message, "msg2");
        assert_eq!(buffer.get(2).unwrap().message, "msg4");
    }

    #[test]
    fn test_metrics_snapshot_calculate_averages() {
        let mut snapshot = MetricsSnapshot::new();

        snapshot.record_latency(100);
        snapshot.record_latency(200);
        snapshot.record_latency(300);

        assert_eq!(snapshot.avg_latency(), 200);
        assert_eq!(snapshot.min_latency(), 100);
        assert_eq!(snapshot.max_latency(), 300);
    }
}
```

### 2.4 Event Handling Tests

```rust
// src/events/tests.rs
use super::*;
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

#[cfg(test)]
mod event_tests {
    use super::*;

    #[test]
    fn test_event_handler_key_quit_returns_exit() {
        let handler = EventHandler::new();
        let key_event = KeyEvent::new(KeyCode::Char('q'), KeyModifiers::empty());

        let action = handler.handle_key(key_event);

        assert_eq!(action, Action::Exit);
    }

    #[test]
    fn test_event_handler_tab_cycles_dashboards() {
        let mut handler = EventHandler::new();
        let tab_event = KeyEvent::new(KeyCode::Tab, KeyModifiers::empty());

        let action1 = handler.handle_key(tab_event);
        let action2 = handler.handle_key(tab_event);

        assert_eq!(action1, Action::NextDashboard);
        assert_eq!(action2, Action::NextDashboard);
    }

    #[test]
    fn test_event_handler_number_keys_jump_to_dashboard() {
        let handler = EventHandler::new();
        let key_event = KeyEvent::new(KeyCode::Char('3'), KeyModifiers::empty());

        let action = handler.handle_key(key_event);

        assert_eq!(action, Action::JumpToDashboard(3));
    }

    #[test]
    fn test_event_queue_fifo_ordering() {
        let mut queue = EventQueue::new();

        queue.push(Event::AgentStarted("agent-1".to_string()));
        queue.push(Event::AgentStopped("agent-1".to_string()));
        queue.push(Event::TaskCompleted("task-1".to_string()));

        assert_eq!(queue.pop(), Some(Event::AgentStarted("agent-1".to_string())));
        assert_eq!(queue.pop(), Some(Event::AgentStopped("agent-1".to_string())));
        assert_eq!(queue.pop(), Some(Event::TaskCompleted("task-1".to_string())));
    }

    #[test]
    fn test_event_queue_bounded_capacity() {
        let mut queue = EventQueue::with_capacity(2);

        queue.push(Event::AgentStarted("agent-1".to_string()));
        queue.push(Event::AgentStarted("agent-2".to_string()));
        let overflow = queue.push(Event::AgentStarted("agent-3".to_string()));

        assert!(overflow.is_err());
        assert_eq!(queue.len(), 2);
    }
}
```

### 2.5 Data Model Serialization Tests

```rust
// src/models/tests.rs
use serde_json;

#[cfg(test)]
mod model_tests {
    use super::*;

    #[test]
    fn test_agent_state_serializes_to_json() {
        let state = AgentState {
            id: "agent-1".to_string(),
            status: AgentStatus::Running,
            task_count: 5,
            metrics: vec![],
        };

        let json = serde_json::to_string(&state).unwrap();

        assert!(json.contains("\"id\":\"agent-1\""));
        assert!(json.contains("\"status\":\"Running\""));
        assert!(json.contains("\"task_count\":5"));
    }

    #[test]
    fn test_agent_state_deserializes_from_json() {
        let json = r#"{"id":"agent-1","status":"Running","task_count":5,"metrics":[]}"#;

        let state: AgentState = serde_json::from_str(json).unwrap();

        assert_eq!(state.id, "agent-1");
        assert_eq!(state.status, AgentStatus::Running);
        assert_eq!(state.task_count, 5);
    }

    #[test]
    fn test_log_entry_roundtrip_serialization() {
        let original = LogEntry {
            timestamp: Utc::now(),
            level: LogLevel::Error,
            message: "Test error".to_string(),
            source: "test-agent".to_string(),
        };

        let json = serde_json::to_string(&original).unwrap();
        let deserialized: LogEntry = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.level, original.level);
        assert_eq!(deserialized.message, original.message);
        assert_eq!(deserialized.source, original.source);
    }
}
```

### 2.6 Authentication Tests

```rust
// src/auth/tests/pkce_tests.rs
use super::*;
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};

#[cfg(test)]
mod pkce_tests {
    use super::*;

    #[test]
    fn test_pkce_verifier_length() {
        let (verifier, _) = generate_pkce_params().unwrap();
        assert_eq!(verifier.len(), 128);
    }

    #[test]
    fn test_pkce_challenge_is_valid_base64() {
        let (_, challenge) = generate_pkce_params().unwrap();

        // Should not contain padding
        assert!(!challenge.contains('='));

        // Should only contain base64url characters
        assert!(challenge.chars().all(|c|
            c.is_alphanumeric() || c == '-' || c == '_'
        ));
    }

    #[test]
    fn test_pkce_challenge_matches_verifier() {
        let (verifier, challenge) = generate_pkce_params().unwrap();

        // Manually compute challenge to verify
        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let hash = hasher.finalize();
        let expected_challenge = URL_SAFE_NO_PAD.encode(&hash);

        assert_eq!(challenge, expected_challenge);
    }

    #[test]
    fn test_pkce_generates_unique_params() {
        let (verifier1, challenge1) = generate_pkce_params().unwrap();
        let (verifier2, challenge2) = generate_pkce_params().unwrap();

        assert_ne!(verifier1, verifier2);
        assert_ne!(challenge1, challenge2);
    }
}
```

---

## 3. Integration Test Strategy

### 3.1 Dashboard Rendering Tests

```rust
// tests/integration/dashboard_tests.rs
use flow::ui::dashboards::*;
use flow::state::*;
use ratatui::{backend::TestBackend, Terminal};

#[test]
fn test_agent_graph_dashboard_renders_without_panic() {
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).unwrap();

    let mut state = AgentGraphState::default();
    state.add_agent_node(("agent-1", 50, 20));
    state.add_agent_node(("agent-2", 70, 30));

    terminal.draw(|f| {
        render_agent_graph_dashboard(f, &state);
    }).unwrap();

    // Should not panic
}

#[test]
fn test_agent_metrics_dashboard_displays_agents() {
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).unwrap();

    let mut state = AgentMetricsState::default();
    state.add_agent(AgentMetrics {
        id: "agent-1".to_string(),
        status: "Running".to_string(),
        tasks: 10,
        cpu: 25.5,
        memory: 512,
    });

    terminal.draw(|f| {
        render_agent_metrics_dashboard(f, &state);
    }).unwrap();

    let buffer = terminal.backend().buffer().clone();
    let content = buffer.content().iter().map(|c| c.symbol()).collect::<String>();

    assert!(content.contains("agent-1"));
    assert!(content.contains("Running"));
}

#[test]
fn test_log_console_filters_by_level() {
    let mut state = LogConsoleState::default();

    state.push(LogEntry::new(LogLevel::Info, "Info message"));
    state.push(LogEntry::new(LogLevel::Error, "Error message"));
    state.push(LogEntry::new(LogLevel::Debug, "Debug message"));

    state.set_filter(LogLevel::Error);
    let filtered = state.filtered_logs();

    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].level, LogLevel::Error);
}

#[test]
fn test_metrics_dashboard_calculates_totals() {
    let mut state = MetricsDashboardState::default();

    state.record_task_completed(100); // 100ms latency
    state.record_task_completed(200);
    state.record_task_completed(300);

    assert_eq!(state.total_tasks(), 3);
    assert_eq!(state.avg_latency(), 200);
    assert_eq!(state.throughput_per_second(), 3);
}
```

### 3.2 Event Flow End-to-End Tests

```rust
// tests/integration/event_flow_tests.rs
use flow::{App, Event, Action};
use std::time::Duration;

#[tokio::test]
async fn test_agent_lifecycle_event_flow() {
    let mut app = App::new().await;

    // Start agent
    app.handle_event(Event::AgentStarted("agent-1".to_string())).await;
    assert_eq!(app.agent_count(), 1);
    assert_eq!(app.get_agent("agent-1").unwrap().status, AgentStatus::Running);

    // Complete task
    app.handle_event(Event::TaskCompleted("task-1".to_string())).await;
    assert_eq!(app.get_agent("agent-1").unwrap().task_count, 1);

    // Stop agent
    app.handle_event(Event::AgentStopped("agent-1".to_string())).await;
    assert_eq!(app.get_agent("agent-1").unwrap().status, AgentStatus::Stopped);
}

#[tokio::test]
async fn test_log_streaming_updates_ui() {
    let mut app = App::new().await;

    app.handle_event(Event::LogMessage(
        LogLevel::Info,
        "Test log message".to_string()
    )).await;

    let logs = app.log_console_state.logs();
    assert_eq!(logs.len(), 1);
    assert_eq!(logs[0].message, "Test log message");
}

#[tokio::test]
async fn test_metrics_aggregation_across_agents() {
    let mut app = App::new().await;

    // Start multiple agents
    app.handle_event(Event::AgentStarted("agent-1".to_string())).await;
    app.handle_event(Event::AgentStarted("agent-2".to_string())).await;

    // Record metrics
    app.handle_event(Event::MetricsUpdate(
        "agent-1".to_string(),
        MetricsData { cpu: 20.0, memory: 256 }
    )).await;
    app.handle_event(Event::MetricsUpdate(
        "agent-2".to_string(),
        MetricsData { cpu: 30.0, memory: 512 }
    )).await;

    let total_cpu = app.total_cpu_usage();
    let total_memory = app.total_memory_usage();

    assert_eq!(total_cpu, 50.0);
    assert_eq!(total_memory, 768);
}
```

### 3.3 Framework Adapter Tests

```rust
// tests/integration/adapter_tests.rs
use flow::adapters::*;
use mockito::Server;

#[tokio::test]
async fn test_claude_flow_adapter_parses_events() {
    let mut server = Server::new_async().await;

    let mock = server.mock("GET", "/events")
        .with_status(200)
        .with_header("content-type", "text/event-stream")
        .with_body("data: {\"type\":\"agent.started\",\"agent_id\":\"agent-1\"}\n\n")
        .create_async()
        .await;

    let adapter = ClaudeFlowAdapter::new(server.url());
    let mut events = adapter.stream_events().await.unwrap();

    let event = events.next().await.unwrap();
    assert_eq!(event.event_type, EventType::AgentStarted);
    assert_eq!(event.agent_id, "agent-1");

    mock.assert_async().await;
}

#[tokio::test]
async fn test_autogen_adapter_handles_reconnection() {
    let mut server = Server::new_async().await;

    // First connection fails
    let mock1 = server.mock("GET", "/status")
        .with_status(500)
        .create_async()
        .await;

    // Second connection succeeds
    let mock2 = server.mock("GET", "/status")
        .with_status(200)
        .with_body("{\"status\":\"ok\"}")
        .create_async()
        .await;

    let adapter = AutogenAdapter::with_retry(server.url(), 2);
    let status = adapter.get_status().await.unwrap();

    assert_eq!(status, "ok");
    mock1.assert_async().await;
    mock2.assert_async().await;
}

#[tokio::test]
async fn test_opencode_adapter_authentication() {
    let mut server = Server::new_async().await;

    let mock = server.mock("POST", "/auth")
        .match_header("authorization", "Bearer test-token")
        .with_status(200)
        .create_async()
        .await;

    let adapter = OpenCodeAdapter::new(server.url(), "test-token");
    let result = adapter.authenticate().await;

    assert!(result.is_ok());
    mock.assert_async().await;
}
```

---

## 4. UI Testing Approach

### 4.1 Ratatui Snapshot Testing

```rust
// tests/ui/snapshot_tests.rs
use flow::ui::*;
use ratatui::{backend::TestBackend, Terminal};
use insta::assert_snapshot;

#[test]
fn test_dashboard_layout_snapshot() {
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).unwrap();

    let state = DashboardState::default();

    terminal.draw(|f| {
        render_dashboard(f, &state);
    }).unwrap();

    let buffer = terminal.backend().buffer();
    assert_snapshot!("dashboard_layout", buffer);
}

#[test]
fn test_agent_table_with_sorting() {
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).unwrap();

    let mut state = AgentTableState::default();
    state.add_agents(vec![
        agent_fixture("agent-1", 10),
        agent_fixture("agent-2", 5),
        agent_fixture("agent-3", 15),
    ]);
    state.sort_by(SortColumn::Tasks, SortOrder::Descending);

    terminal.draw(|f| {
        render_agent_table(f, &state);
    }).unwrap();

    let buffer = terminal.backend().buffer();
    assert_snapshot!("agent_table_sorted_by_tasks", buffer);
}
```

### 4.2 Layout Verification Tests

```rust
// tests/ui/layout_tests.rs
use flow::ui::layout::*;
use ratatui::layout::{Constraint, Rect};

#[test]
fn test_three_column_layout_distribution() {
    let area = Rect::new(0, 0, 120, 40);

    let chunks = three_column_layout(area);

    assert_eq!(chunks.len(), 3);
    assert_eq!(chunks[0].width, 40); // First third
    assert_eq!(chunks[1].width, 40); // Second third
    assert_eq!(chunks[2].width, 40); // Third third
}

#[test]
fn test_dashboard_layout_respects_minimum_size() {
    let small_area = Rect::new(0, 0, 40, 10); // Too small

    let result = dashboard_layout(small_area);

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), LayoutError::AreaTooSmall);
}

#[test]
fn test_responsive_layout_adapts_to_terminal_size() {
    let large_area = Rect::new(0, 0, 200, 60);
    let medium_area = Rect::new(0, 0, 120, 40);
    let small_area = Rect::new(0, 0, 80, 24);

    let large_layout = responsive_layout(large_area);
    let medium_layout = responsive_layout(medium_area);
    let small_layout = responsive_layout(small_area);

    // Large screen: 4 columns
    assert_eq!(large_layout.columns, 4);

    // Medium screen: 3 columns
    assert_eq!(medium_layout.columns, 3);

    // Small screen: 2 columns
    assert_eq!(small_layout.columns, 2);
}
```

### 4.3 Widget Behavior Tests

```rust
// tests/ui/widget_tests.rs
use flow::ui::widgets::*;

#[test]
fn test_scrollable_list_scroll_down() {
    let mut widget = ScrollableList::new(vec![
        "Item 1", "Item 2", "Item 3", "Item 4", "Item 5"
    ]);
    widget.set_viewport_height(3); // Can see 3 items at once

    widget.scroll_down();
    widget.scroll_down();

    assert_eq!(widget.offset(), 2);
    assert_eq!(widget.visible_items(), &["Item 3", "Item 4", "Item 5"]);
}

#[test]
fn test_scrollable_list_clamps_at_bottom() {
    let mut widget = ScrollableList::new(vec![
        "Item 1", "Item 2", "Item 3"
    ]);
    widget.set_viewport_height(3);

    widget.scroll_down();
    widget.scroll_down();
    widget.scroll_down(); // Should clamp

    assert_eq!(widget.offset(), 0); // Can't scroll past end
}

#[test]
fn test_sparkline_widget_calculates_scale() {
    let data = vec![10, 50, 30, 80, 20];
    let widget = SparklineWidget::new(data);

    assert_eq!(widget.min_value(), 10);
    assert_eq!(widget.max_value(), 80);
    assert_eq!(widget.scale_factor(), 70.0); // max - min
}

#[test]
fn test_progress_bar_percentage_calculation() {
    let progress = ProgressBar::new(75, 100);

    assert_eq!(progress.percentage(), 75);
    assert_eq!(progress.display_text(), "75%");
}
```

---

## 5. Performance Testing

### 5.1 Benchmark Setup

```toml
# Cargo.toml
[dev-dependencies]
criterion = "0.5"

[[bench]]
name = "render_benchmarks"
harness = false

[[bench]]
name = "state_benchmarks"
harness = false
```

### 5.2 Render Performance Benchmarks

```rust
// benches/render_benchmarks.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use flow::ui::*;
use flow::state::*;
use ratatui::{backend::TestBackend, Terminal};

fn benchmark_dashboard_render(c: &mut Criterion) {
    let mut group = c.benchmark_group("dashboard_render");

    for agent_count in [10, 50, 100, 500].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(agent_count),
            agent_count,
            |b, &count| {
                let backend = TestBackend::new(120, 40);
                let mut terminal = Terminal::new(backend).unwrap();
                let state = create_dashboard_with_agents(count);

                b.iter(|| {
                    terminal.draw(|f| {
                        render_dashboard(f, black_box(&state));
                    }).unwrap();
                });
            },
        );
    }

    group.finish();
}

fn benchmark_agent_graph_render(c: &mut Criterion) {
    let mut group = c.benchmark_group("agent_graph_render");

    for node_count in [20, 50, 100].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(node_count),
            node_count,
            |b, &count| {
                let backend = TestBackend::new(120, 40);
                let mut terminal = Terminal::new(backend).unwrap();
                let state = create_graph_with_nodes(count);

                b.iter(|| {
                    terminal.draw(|f| {
                        render_agent_graph_dashboard(f, black_box(&state));
                    }).unwrap();
                });
            },
        );
    }

    group.finish();
}

fn benchmark_log_console_append(c: &mut Criterion) {
    let mut group = c.benchmark_group("log_append");

    group.bench_function("append_1000_logs", |b| {
        b.iter(|| {
            let mut state = LogConsoleState::with_capacity(1000);
            for i in 0..1000 {
                state.push(LogEntry::new(
                    LogLevel::Info,
                    format!("Log message {}", i)
                ));
            }
            black_box(state);
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    benchmark_dashboard_render,
    benchmark_agent_graph_render,
    benchmark_log_console_append
);
criterion_main!(benches);
```

### 5.3 State Management Benchmarks

```rust
// benches/state_benchmarks.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use flow::state::*;

fn benchmark_agent_state_transitions(c: &mut Criterion) {
    c.bench_function("state_transition_1000x", |b| {
        b.iter(|| {
            let mut state = AgentState::new("agent-1");
            for _ in 0..1000 {
                state.transition_to(AgentStatus::Running).unwrap();
                state.transition_to(AgentStatus::Idle).unwrap();
            }
            black_box(state);
        });
    });
}

fn benchmark_dashboard_state_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("dashboard_operations");

    group.bench_function("add_100_agents", |b| {
        b.iter(|| {
            let mut dashboard = DashboardState::default();
            for i in 0..100 {
                dashboard.add_agent(AgentState::new(&format!("agent-{}", i)));
            }
            black_box(dashboard);
        });
    });

    group.bench_function("query_agent_by_id_in_1000", |b| {
        let mut dashboard = DashboardState::default();
        for i in 0..1000 {
            dashboard.add_agent(AgentState::new(&format!("agent-{}", i)));
        }

        b.iter(|| {
            black_box(dashboard.get_agent("agent-500"));
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    benchmark_agent_state_transitions,
    benchmark_dashboard_state_operations
);
criterion_main!(benches);
```

### 5.4 Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Dashboard Render (10 agents)** | < 16ms (60 FPS) | < 33ms (30 FPS) |
| **Dashboard Render (100 agents)** | < 33ms (30 FPS) | < 50ms (20 FPS) |
| **Agent Graph Render (50 nodes)** | < 16ms (60 FPS) | < 33ms (30 FPS) |
| **Log Append (1000 entries)** | < 5ms | < 10ms |
| **State Transition** | < 1µs | < 10µs |
| **Agent Query by ID** | < 100ns | < 1µs |
| **Memory Usage (100 agents)** | < 50MB | < 100MB |
| **Memory Usage (Idle)** | < 20MB | < 40MB |

---

## 6. Test Data & Fixtures

### 6.1 Test Fixtures Module

```rust
// tests/common/fixtures.rs
use flow::state::*;
use chrono::Utc;

pub fn agent_fixture(id: &str, task_count: u32) -> AgentState {
    AgentState {
        id: id.to_string(),
        status: AgentStatus::Running,
        task_count,
        metrics: vec![],
        last_transition: Utc::now(),
    }
}

pub fn log_entry_fixture(level: LogLevel, message: &str) -> LogEntry {
    LogEntry {
        timestamp: Utc::now(),
        level,
        message: message.to_string(),
        source: "test-agent".to_string(),
    }
}

pub fn dashboard_state_fixture(agent_count: usize) -> DashboardState {
    let mut state = DashboardState::default();
    for i in 0..agent_count {
        state.add_agent(agent_fixture(&format!("agent-{}", i), i as u32 * 10));
    }
    state
}

pub fn metrics_snapshot_fixture(tasks: u32, latencies: Vec<u64>) -> MetricsSnapshot {
    let mut snapshot = MetricsSnapshot::new();
    snapshot.task_count = tasks;
    for latency in latencies {
        snapshot.record_latency(latency);
    }
    snapshot
}

pub struct TestBackendBuilder {
    width: u16,
    height: u16,
}

impl TestBackendBuilder {
    pub fn new() -> Self {
        Self { width: 120, height: 40 }
    }

    pub fn with_size(mut self, width: u16, height: u16) -> Self {
        self.width = width;
        self.height = height;
        self
    }

    pub fn build(self) -> ratatui::backend::TestBackend {
        ratatui::backend::TestBackend::new(self.width, self.height)
    }
}

pub fn create_test_terminal() -> ratatui::Terminal<ratatui::backend::TestBackend> {
    let backend = TestBackendBuilder::new().build();
    ratatui::Terminal::new(backend).unwrap()
}
```

### 6.2 Mock Framework Adapters

```rust
// tests/common/mocks.rs
use flow::adapters::*;
use async_trait::async_trait;
use tokio::sync::mpsc;

pub struct MockClaudeFlowAdapter {
    events: mpsc::Receiver<Event>,
}

impl MockClaudeFlowAdapter {
    pub fn new() -> (Self, mpsc::Sender<Event>) {
        let (tx, rx) = mpsc::channel(100);
        (Self { events: rx }, tx)
    }
}

#[async_trait]
impl FrameworkAdapter for MockClaudeFlowAdapter {
    async fn stream_events(&mut self) -> Result<EventStream, AdapterError> {
        Ok(Box::pin(self.events))
    }

    async fn send_command(&self, command: Command) -> Result<(), AdapterError> {
        Ok(())
    }
}

pub struct MockOpenRouterClient {
    responses: Vec<String>,
    current: usize,
}

impl MockOpenRouterClient {
    pub fn with_responses(responses: Vec<String>) -> Self {
        Self { responses, current: 0 }
    }
}

#[async_trait]
impl ApiClient for MockOpenRouterClient {
    async fn chat_completion(&mut self, request: ChatRequest) -> Result<ChatResponse, ApiError> {
        if self.current >= self.responses.len() {
            return Err(ApiError::NoMoreResponses);
        }

        let response = ChatResponse {
            message: self.responses[self.current].clone(),
        };
        self.current += 1;

        Ok(response)
    }
}
```

---

## 7. CI/CD Pipeline Specification

### 7.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  RUST_BACKTRACE: 1
  CARGO_TERM_COLOR: always

jobs:
  test:
    name: Test - ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        rust: [stable, nightly]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: ${{ matrix.rust }}
          override: true
          components: rustfmt, clippy

      - name: Cache cargo registry
        uses: actions/cache@v4
        with:
          path: ~/.cargo/registry
          key: ${{ runner.os }}-cargo-registry-${{ hashFiles('**/Cargo.lock') }}

      - name: Cache cargo index
        uses: actions/cache@v4
        with:
          path: ~/.cargo/git
          key: ${{ runner.os }}-cargo-index-${{ hashFiles('**/Cargo.lock') }}

      - name: Cache target directory
        uses: actions/cache@v4
        with:
          path: target
          key: ${{ runner.os }}-target-${{ matrix.rust }}-${{ hashFiles('**/Cargo.lock') }}

      - name: Run tests
        run: cargo test --all-features --verbose

      - name: Run doctests
        run: cargo test --doc --all-features

      - name: Check formatting
        run: cargo fmt -- --check

      - name: Run clippy
        run: cargo clippy -- -D warnings

  coverage:
    name: Code Coverage
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true

      - name: Install tarpaulin
        run: cargo install cargo-tarpaulin

      - name: Generate coverage
        run: cargo tarpaulin --out Xml --all-features

      - name: Upload to codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./cobertura.xml
          fail_ci_if_error: true

  benchmark:
    name: Performance Benchmarks
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true

      - name: Run benchmarks
        run: cargo bench --all-features -- --save-baseline main

      - name: Compare benchmarks
        if: github.event_name == 'pull_request'
        run: cargo bench --all-features -- --baseline main
```

### 7.2 Pre-commit Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Running pre-commit checks..."

# Format check
cargo fmt -- --check
if [ $? -ne 0 ]; then
    echo "❌ Code formatting check failed. Run: cargo fmt"
    exit 1
fi

# Clippy check
cargo clippy -- -D warnings
if [ $? -ne 0 ]; then
    echo "❌ Clippy check failed"
    exit 1
fi

# Unit tests
cargo test --lib
if [ $? -ne 0 ]; then
    echo "❌ Unit tests failed"
    exit 1
fi

echo "✅ All pre-commit checks passed"
exit 0
```

### 7.3 Test Reporting

```rust
// Custom test reporter for detailed output
#[cfg(test)]
mod test_reporter {
    use std::time::Instant;

    pub struct TestReporter {
        start_time: Instant,
        passed: u32,
        failed: u32,
        ignored: u32,
    }

    impl TestReporter {
        pub fn new() -> Self {
            Self {
                start_time: Instant::now(),
                passed: 0,
                failed: 0,
                ignored: 0,
            }
        }

        pub fn record_pass(&mut self) {
            self.passed += 1;
        }

        pub fn record_fail(&mut self) {
            self.failed += 1;
        }

        pub fn record_ignore(&mut self) {
            self.ignored += 1;
        }

        pub fn print_summary(&self) {
            let elapsed = self.start_time.elapsed();
            println!("\n{}", "=".repeat(80));
            println!("Test Summary");
            println!("{}", "=".repeat(80));
            println!("✅ Passed:  {}", self.passed);
            println!("❌ Failed:  {}", self.failed);
            println!("⊝  Ignored: {}", self.ignored);
            println!("⏱  Duration: {:.2}s", elapsed.as_secs_f64());
            println!("{}", "=".repeat(80));
        }
    }
}
```

---

## 8. Coverage Targets & Metrics

### 8.1 Coverage Requirements

**Module-Level Targets:**

| Module | Line Coverage | Branch Coverage | Priority |
|--------|--------------|----------------|----------|
| `auth/` | ≥ 85% | ≥ 75% | Critical |
| `state/` | ≥ 90% | ≥ 80% | Critical |
| `events/` | ≥ 85% | ≥ 75% | High |
| `ui/dashboards/` | ≥ 70% | ≥ 60% | Medium |
| `ui/widgets/` | ≥ 75% | ≥ 65% | Medium |
| `adapters/` | ≥ 80% | ≥ 70% | High |
| `config/` | ≥ 85% | ≥ 75% | Medium |

**Uncovered Code Allowances:**
- Error handling for unrecoverable errors (panic paths)
- Platform-specific code that can't be tested in CI
- Debug-only code paths
- Deprecated code marked for removal

### 8.2 Coverage Collection

```bash
# Generate coverage report
cargo tarpaulin --out Html --output-dir coverage --all-features

# View coverage report
open coverage/index.html

# CI coverage with Codecov
cargo tarpaulin --out Xml --all-features
bash <(curl -s https://codecov.io/bash)
```

### 8.3 Coverage Badges

```markdown
# In README.md
[![codecov](https://codecov.io/gh/your-org/flow/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/flow)
```

---

## 9. Example Test Code (Rust)

### 9.1 Complete Unit Test Example

```rust
// src/state/agent_state.rs
#[derive(Debug, Clone, PartialEq)]
pub struct AgentState {
    pub id: String,
    pub status: AgentStatus,
    pub task_count: u32,
    pub metrics: Vec<Metric>,
    pub last_transition: Instant,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AgentStatus {
    Idle,
    Running,
    Stopped,
    Error,
}

impl AgentState {
    pub fn new(id: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            status: AgentStatus::Idle,
            task_count: 0,
            metrics: Vec::new(),
            last_transition: Instant::now(),
        }
    }

    pub fn transition_to(&mut self, new_status: AgentStatus) -> Result<(), StateError> {
        // Validate state transition
        match (self.status, new_status) {
            (AgentStatus::Stopped, AgentStatus::Running) => {
                return Err(StateError::InvalidTransition {
                    from: self.status,
                    to: new_status,
                });
            }
            _ => {}
        }

        self.status = new_status;
        self.last_transition = Instant::now();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_new_agent_starts_idle() {
        let agent = AgentState::new("agent-1");

        assert_eq!(agent.id, "agent-1");
        assert_eq!(agent.status, AgentStatus::Idle);
        assert_eq!(agent.task_count, 0);
        assert!(agent.metrics.is_empty());
    }

    #[test]
    fn test_valid_transition_idle_to_running() {
        let mut agent = AgentState::new("agent-1");

        let result = agent.transition_to(AgentStatus::Running);

        assert!(result.is_ok());
        assert_eq!(agent.status, AgentStatus::Running);
    }

    #[test]
    fn test_invalid_transition_stopped_to_running() {
        let mut agent = AgentState::new("agent-1");
        agent.status = AgentStatus::Stopped;

        let result = agent.transition_to(AgentStatus::Running);

        assert!(result.is_err());
        assert_eq!(agent.status, AgentStatus::Stopped);

        if let Err(StateError::InvalidTransition { from, to }) = result {
            assert_eq!(from, AgentStatus::Stopped);
            assert_eq!(to, AgentStatus::Running);
        } else {
            panic!("Expected InvalidTransition error");
        }
    }

    #[test]
    fn test_transition_updates_timestamp() {
        let mut agent = AgentState::new("agent-1");
        let before = agent.last_transition;

        std::thread::sleep(Duration::from_millis(10));
        agent.transition_to(AgentStatus::Running).unwrap();

        assert!(agent.last_transition > before);
        assert!(agent.last_transition.elapsed().as_millis() < 100);
    }
}
```

### 9.2 Complete Integration Test Example

```rust
// tests/integration/full_dashboard_test.rs
use flow::*;
use ratatui::{backend::TestBackend, Terminal};
use std::time::Duration;

#[tokio::test]
async fn test_full_dashboard_workflow() {
    // Setup
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut app = App::new().await;

    // Step 1: Start multiple agents
    app.handle_event(Event::AgentStarted("agent-1".to_string())).await;
    app.handle_event(Event::AgentStarted("agent-2".to_string())).await;
    app.handle_event(Event::AgentStarted("agent-3".to_string())).await;

    assert_eq!(app.agent_count(), 3);

    // Step 2: Agents complete tasks
    for i in 1..=10 {
        app.handle_event(Event::TaskCompleted(format!("task-{}", i))).await;
    }

    // Step 3: Record metrics
    app.handle_event(Event::MetricsUpdate(
        "agent-1".to_string(),
        MetricsData { cpu: 25.0, memory: 256 }
    )).await;

    // Step 4: Generate logs
    app.handle_event(Event::LogMessage(
        LogLevel::Info,
        "Task processing complete".to_string()
    )).await;

    // Step 5: Render dashboard
    terminal.draw(|f| {
        app.render(f);
    }).unwrap();

    // Verify state
    assert_eq!(app.total_tasks_completed(), 10);
    assert_eq!(app.log_count(), 1);
    assert!(app.total_cpu_usage() > 0.0);

    // Verify UI rendering (snapshot)
    let buffer = terminal.backend().buffer();
    assert!(buffer.content().iter().any(|c| c.symbol().contains("agent-1")));
    assert!(buffer.content().iter().any(|c| c.symbol().contains("Task processing")));
}
```

---

## 10. Testing Best Practices & Guidelines

### 10.1 Test Quality Checklist

**Every test should:**
- [ ] Have a clear, descriptive name that explains scenario and expected outcome
- [ ] Follow Arrange-Act-Assert (AAA) pattern
- [ ] Test one specific behavior or requirement
- [ ] Be independent and not rely on test execution order
- [ ] Run fast (< 10ms for unit tests)
- [ ] Be deterministic (no flaky tests)
- [ ] Clean up resources (no side effects)

### 10.2 Common Anti-Patterns to Avoid

**❌ Don't:**
- Write tests that depend on external services without mocks
- Use `sleep()` to wait for async operations (use proper async patterns)
- Test multiple unrelated behaviors in one test
- Ignore test failures or mark tests as `#[ignore]` without justification
- Write tests that depend on file system state
- Use hardcoded timestamps or dates
- Create tests with shared mutable state

**✅ Do:**
- Use fixtures and test builders for complex setup
- Mock external dependencies
- Use `tokio::time::timeout()` for async operations
- Write focused tests that verify single behaviors
- Clean up all resources in test teardown
- Use property-based testing for complex logic
- Implement custom assertions for domain-specific checks

### 10.3 Documentation Standards

```rust
/// Tests that agent state transitions correctly from Idle to Running
///
/// # Test Scenario
/// 1. Create new agent in Idle state
/// 2. Transition to Running state
/// 3. Verify status changed and timestamp updated
///
/// # Expected Outcome
/// - transition_to() returns Ok(())
/// - agent.status == Running
/// - agent.last_transition is recent
#[test]
fn test_agent_transition_idle_to_running() {
    // Test implementation...
}
```

### 10.4 Continuous Improvement

**Weekly Review:**
- Analyze test failure trends
- Identify flaky tests and fix root causes
- Review code coverage gaps
- Update test documentation

**Monthly Audit:**
- Review test execution times
- Identify slow tests and optimize
- Update test strategy based on production issues
- Review and update test fixtures

---

## 11. Conclusion

This test strategy provides comprehensive coverage across all layers of the Flow Orchestrator TUI application, from unit tests validating individual components to end-to-end tests verifying complete user workflows.

**Key Success Metrics:**
- **Coverage:** 80%+ line coverage, 70%+ branch coverage
- **Performance:** All tests complete in < 30 seconds
- **Reliability:** < 0.1% flake rate
- **Maintainability:** Clear, documented, easy-to-understand tests

**Implementation Priority:**
1. **Phase 1 (Week 1):** Core unit tests (state, events, auth)
2. **Phase 2 (Week 2):** Integration tests (dashboards, adapters)
3. **Phase 3 (Week 3):** Performance benchmarks and CI/CD pipeline
4. **Phase 4 (Week 4):** E2E tests and coverage analysis

By following this test strategy, we ensure the Flow Orchestrator TUI is reliable, performant, and maintainable across all supported platforms.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-25
**Next Review:** 2025-12-25
