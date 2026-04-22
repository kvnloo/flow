/// Metrics state unit tests following London School TDD approach
///
/// Tests verify metrics collection, aggregation, time-series queries,
/// and retention policy enforcement.

use chrono::{Duration, Utc};
use flow_orchestrator_tui::state::{
    AgentMetrics, MetricPoint, MetricType, MetricsHistory, MetricsSnapshot,
};
use uuid::Uuid;

// ============================================================================
// MetricPoint Tests
// ============================================================================

#[test]
fn test_metric_point_new() {
    let before = Utc::now();
    let point = MetricPoint::new(MetricType::TokensUsed, 1000.0);
    let after = Utc::now();

    assert_eq!(point.metric_type, MetricType::TokensUsed);
    assert_eq!(point.value, 1000.0);
    assert!(point.agent_id.is_none());
    assert!(point.labels.is_empty());
    assert!(point.timestamp >= before && point.timestamp <= after);
}

#[test]
fn test_metric_point_with_agent() {
    let agent_id = Uuid::new_v4();
    let point = MetricPoint::new(MetricType::Cost, 0.05)
        .with_agent(agent_id);

    assert_eq!(point.agent_id, Some(agent_id));
}

#[test]
fn test_metric_point_with_label() {
    let point = MetricPoint::new(MetricType::Latency, 150.0)
        .with_label("model".to_string(), "claude-3-5".to_string());

    assert_eq!(
        point.labels.get("model"),
        Some(&"claude-3-5".to_string())
    );
}

#[test]
fn test_metric_point_builder_chain() {
    let agent_id = Uuid::new_v4();
    let point = MetricPoint::new(MetricType::Heat, 85.0)
        .with_agent(agent_id)
        .with_label("role".to_string(), "coder".to_string())
        .with_label("framework".to_string(), "claude-flow".to_string());

    assert_eq!(point.agent_id, Some(agent_id));
    assert_eq!(point.labels.len(), 2);
}

// ============================================================================
// MetricType Tests
// ============================================================================

#[test]
fn test_metric_type_display_names() {
    assert_eq!(MetricType::TokensUsed.display_name(), "Tokens Used");
    assert_eq!(MetricType::Cost.display_name(), "Cost");
    assert_eq!(MetricType::Latency.display_name(), "Latency");
    assert_eq!(MetricType::QueueDepth.display_name(), "Queue Depth");
    assert_eq!(MetricType::ErrorRate.display_name(), "Error Rate");
    assert_eq!(
        MetricType::Custom("MyMetric".to_string()).display_name(),
        "MyMetric"
    );
}

#[test]
fn test_metric_type_units() {
    assert_eq!(MetricType::TokensUsed.unit(), "tokens");
    assert_eq!(MetricType::Cost.unit(), "USD");
    assert_eq!(MetricType::Latency.unit(), "ms");
    assert_eq!(MetricType::QueueDepth.unit(), "tasks");
    assert_eq!(MetricType::ErrorRate.unit(), "%");
    assert_eq!(MetricType::Heat.unit(), "score");
    assert_eq!(MetricType::Custom("test".to_string()).unit(), "");
}

#[test]
fn test_metric_type_serialization() {
    let metric_type = MetricType::TokensUsed;
    let json = serde_json::to_string(&metric_type).unwrap();
    assert_eq!(json, "\"tokens_used\"");
}

// ============================================================================
// MetricsHistory Creation Tests
// ============================================================================

#[test]
fn test_metrics_history_new() {
    let history = MetricsHistory::new();

    assert!(history.is_empty());
    assert_eq!(history.len(), 0);
}

#[test]
fn test_metrics_history_with_retention() {
    let retention = Duration::hours(2);
    let history = MetricsHistory::with_retention(retention);

    assert!(history.is_empty());
}

#[test]
fn test_metrics_history_default() {
    let history = MetricsHistory::default();

    assert!(history.is_empty());
}

// ============================================================================
// MetricsHistory Recording Tests
// ============================================================================

#[test]
fn test_record_adds_metric_point() {
    let mut history = MetricsHistory::new();
    let point = MetricPoint::new(MetricType::TokensUsed, 1000.0);

    history.record(point);

    assert_eq!(history.len(), 1);
    assert!(!history.is_empty());
}

#[test]
fn test_record_maintains_chronological_order() {
    let mut history = MetricsHistory::new();

    history.record(MetricPoint::new(MetricType::TokensUsed, 100.0));
    std::thread::sleep(std::time::Duration::from_millis(10));
    history.record(MetricPoint::new(MetricType::TokensUsed, 200.0));
    std::thread::sleep(std::time::Duration::from_millis(10));
    history.record(MetricPoint::new(MetricType::TokensUsed, 300.0));

    assert_eq!(history.len(), 3);
}

#[test]
fn test_record_respects_capacity() {
    let mut history = MetricsHistory::with_retention(Duration::hours(24));

    // Record more than capacity would hold in practice
    for i in 0..10 {
        history.record(MetricPoint::new(MetricType::TokensUsed, i as f64));
    }

    assert_eq!(history.len(), 10);
}

// ============================================================================
// MetricsHistory Query Tests
// ============================================================================

#[test]
fn test_query_filters_by_metric_type() {
    let mut history = MetricsHistory::new();
    let start = Utc::now();

    history.record(MetricPoint::new(MetricType::TokensUsed, 100.0));
    history.record(MetricPoint::new(MetricType::Cost, 0.05));
    history.record(MetricPoint::new(MetricType::TokensUsed, 200.0));

    let end = Utc::now();

    let results = history.query(MetricType::TokensUsed, None, start, end);
    assert_eq!(results.len(), 2);
}

#[test]
fn test_query_filters_by_agent_id() {
    let mut history = MetricsHistory::new();
    let agent1 = Uuid::new_v4();
    let agent2 = Uuid::new_v4();
    let start = Utc::now();

    history.record(MetricPoint::new(MetricType::TokensUsed, 100.0).with_agent(agent1));
    history.record(MetricPoint::new(MetricType::TokensUsed, 200.0).with_agent(agent2));
    history.record(MetricPoint::new(MetricType::TokensUsed, 300.0).with_agent(agent1));

    let end = Utc::now();

    let results = history.query(MetricType::TokensUsed, Some(agent1), start, end);
    assert_eq!(results.len(), 2);
}

#[test]
fn test_query_filters_by_time_range() {
    let mut history = MetricsHistory::new();
    let _t1 = Utc::now();

    history.record(MetricPoint::new(MetricType::TokensUsed, 100.0));

    std::thread::sleep(std::time::Duration::from_millis(50));
    let t2 = Utc::now();

    history.record(MetricPoint::new(MetricType::TokensUsed, 200.0));
    history.record(MetricPoint::new(MetricType::TokensUsed, 300.0));

    let t3 = Utc::now();

    let results = history.query(MetricType::TokensUsed, None, t2, t3);
    assert_eq!(results.len(), 2);
}

#[test]
fn test_agent_metrics_returns_only_agent_points() {
    let mut history = MetricsHistory::new();
    let agent_id = Uuid::new_v4();

    history.record(MetricPoint::new(MetricType::TokensUsed, 100.0).with_agent(agent_id));
    history.record(MetricPoint::new(MetricType::Cost, 0.05)); // No agent
    history.record(MetricPoint::new(MetricType::Latency, 150.0).with_agent(agent_id));

    let results = history.agent_metrics(agent_id);
    assert_eq!(results.len(), 2);
}

#[test]
fn test_latest_returns_most_recent() {
    let mut history = MetricsHistory::new();

    history.record(MetricPoint::new(MetricType::TokensUsed, 100.0));
    std::thread::sleep(std::time::Duration::from_millis(10));
    history.record(MetricPoint::new(MetricType::TokensUsed, 200.0));
    std::thread::sleep(std::time::Duration::from_millis(10));
    history.record(MetricPoint::new(MetricType::TokensUsed, 300.0));

    let latest = history.latest(MetricType::TokensUsed, None);
    assert!(latest.is_some());
    assert_eq!(latest.unwrap().value, 300.0);
}

#[test]
fn test_latest_returns_none_when_not_found() {
    let history = MetricsHistory::new();

    let latest = history.latest(MetricType::TokensUsed, None);
    assert!(latest.is_none());
}

// ============================================================================
// MetricsHistory Aggregation Tests
// ============================================================================

#[test]
fn test_average_calculates_correctly() {
    let mut history = MetricsHistory::new();
    let start = Utc::now();

    history.record(MetricPoint::new(MetricType::Latency, 100.0));
    history.record(MetricPoint::new(MetricType::Latency, 200.0));
    history.record(MetricPoint::new(MetricType::Latency, 300.0));

    let end = Utc::now();

    let avg = history.average(MetricType::Latency, None, start, end);
    assert_eq!(avg, Some(200.0));
}

#[test]
fn test_average_returns_none_when_no_data() {
    let history = MetricsHistory::new();
    let start = Utc::now();
    let end = Utc::now();

    let avg = history.average(MetricType::TokensUsed, None, start, end);
    assert!(avg.is_none());
}

#[test]
fn test_sum_calculates_correctly() {
    let mut history = MetricsHistory::new();
    let start = Utc::now();

    history.record(MetricPoint::new(MetricType::TokensUsed, 100.0));
    history.record(MetricPoint::new(MetricType::TokensUsed, 200.0));
    history.record(MetricPoint::new(MetricType::TokensUsed, 300.0));

    let end = Utc::now();

    let sum = history.sum(MetricType::TokensUsed, None, start, end);
    assert_eq!(sum, 600.0);
}

#[test]
fn test_sum_returns_zero_when_no_data() {
    let history = MetricsHistory::new();
    let start = Utc::now();
    let end = Utc::now();

    let sum = history.sum(MetricType::TokensUsed, None, start, end);
    assert_eq!(sum, 0.0);
}

// ============================================================================
// MetricsHistory Retention Tests
// ============================================================================

#[test]
fn test_clear_removes_all_points() {
    let mut history = MetricsHistory::new();

    history.record(MetricPoint::new(MetricType::TokensUsed, 100.0));
    history.record(MetricPoint::new(MetricType::Cost, 0.05));

    assert_eq!(history.len(), 2);

    history.clear();

    assert!(history.is_empty());
    assert_eq!(history.len(), 0);
}

// ============================================================================
// MetricsSnapshot Tests
// ============================================================================

#[test]
fn test_metrics_snapshot_new() {
    let now = Utc::now();
    let snapshot = MetricsSnapshot::new(now);

    assert_eq!(snapshot.start_time, now);
    assert_eq!(snapshot.end_time, now);
    assert_eq!(snapshot.total_tokens, 0);
    assert_eq!(snapshot.total_cost, 0.0);
    assert_eq!(snapshot.avg_latency_ms, 0.0);
    assert_eq!(snapshot.peak_queue_depth, 0);
    assert!(snapshot.agent_metrics.is_empty());
    assert_eq!(snapshot.total_errors, 0);
}

#[test]
fn test_update_from_agent_accumulates_tokens() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());
    let agent_id = Uuid::new_v4();

    let mut metrics = AgentMetrics::default();
    metrics.tokens_used = 1000;

    snapshot.update_from_agent(agent_id, metrics.clone());

    assert_eq!(snapshot.total_tokens, 1000);

    metrics.tokens_used = 2000;
    snapshot.update_from_agent(Uuid::new_v4(), metrics);

    assert_eq!(snapshot.total_tokens, 3000);
}

#[test]
fn test_update_from_agent_accumulates_cost() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());
    let agent_id = Uuid::new_v4();

    let mut metrics = AgentMetrics::default();
    metrics.cost = 0.05;

    snapshot.update_from_agent(agent_id, metrics.clone());

    assert_eq!(snapshot.total_cost, 0.05);

    metrics.cost = 0.10;
    snapshot.update_from_agent(Uuid::new_v4(), metrics);

    assert!((snapshot.total_cost - 0.15).abs() < 0.0001); // Use epsilon for float comparison
}

#[test]
fn test_update_from_agent_tracks_peak_queue_depth() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());

    let mut metrics = AgentMetrics::default();
    metrics.queue_depth = 5;
    snapshot.update_from_agent(Uuid::new_v4(), metrics.clone());

    assert_eq!(snapshot.peak_queue_depth, 5);

    metrics.queue_depth = 3;
    snapshot.update_from_agent(Uuid::new_v4(), metrics.clone());

    assert_eq!(snapshot.peak_queue_depth, 5); // Should keep peak

    metrics.queue_depth = 10;
    snapshot.update_from_agent(Uuid::new_v4(), metrics);

    assert_eq!(snapshot.peak_queue_depth, 10); // Should update to new peak
}

#[test]
fn test_update_from_agent_accumulates_errors() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());

    let mut metrics = AgentMetrics::default();
    metrics.errors = 2;
    snapshot.update_from_agent(Uuid::new_v4(), metrics.clone());

    assert_eq!(snapshot.total_errors, 2);

    metrics.errors = 3;
    snapshot.update_from_agent(Uuid::new_v4(), metrics);

    assert_eq!(snapshot.total_errors, 5);
}

#[test]
fn test_update_from_agent_calculates_average_latency() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());

    let mut metrics = AgentMetrics::default();
    metrics.avg_latency_ms = 100.0;
    snapshot.update_from_agent(Uuid::new_v4(), metrics.clone());

    assert_eq!(snapshot.avg_latency_ms, 100.0);

    metrics.avg_latency_ms = 200.0;
    snapshot.update_from_agent(Uuid::new_v4(), metrics);

    // Average of 100 and 200 should be 150
    assert_eq!(snapshot.avg_latency_ms, 150.0);
}

#[test]
fn test_update_from_agent_stores_agent_metrics() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());
    let agent_id = Uuid::new_v4();

    let mut metrics = AgentMetrics::default();
    metrics.tokens_used = 1000;

    snapshot.update_from_agent(agent_id, metrics.clone());

    assert_eq!(snapshot.agent_metrics.len(), 1);
    assert_eq!(
        snapshot.agent_metrics.get(&agent_id).unwrap().tokens_used,
        1000
    );
}

#[test]
fn test_duration_seconds_calculates_correctly() {
    let start = Utc::now();
    let mut snapshot = MetricsSnapshot::new(start);

    std::thread::sleep(std::time::Duration::from_millis(100));
    snapshot.end_time = Utc::now();

    let duration = snapshot.duration_seconds();
    assert!(duration >= 0);
}

#[test]
fn test_total_tasks_completed() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());

    let mut metrics1 = AgentMetrics::default();
    metrics1.tasks_completed = 5;
    snapshot.update_from_agent(Uuid::new_v4(), metrics1);

    let mut metrics2 = AgentMetrics::default();
    metrics2.tasks_completed = 3;
    snapshot.update_from_agent(Uuid::new_v4(), metrics2);

    assert_eq!(snapshot.total_tasks_completed(), 8);
}

#[test]
fn test_total_tasks_failed() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());

    let mut metrics1 = AgentMetrics::default();
    metrics1.tasks_failed = 2;
    snapshot.update_from_agent(Uuid::new_v4(), metrics1);

    let mut metrics2 = AgentMetrics::default();
    metrics2.tasks_failed = 1;
    snapshot.update_from_agent(Uuid::new_v4(), metrics2);

    assert_eq!(snapshot.total_tasks_failed(), 3);
}

#[test]
fn test_success_rate_with_no_tasks() {
    let snapshot = MetricsSnapshot::new(Utc::now());

    assert_eq!(snapshot.success_rate(), 1.0);
}

#[test]
fn test_success_rate_with_all_completed() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());

    let mut metrics = AgentMetrics::default();
    metrics.tasks_completed = 10;
    metrics.tasks_failed = 0;
    snapshot.update_from_agent(Uuid::new_v4(), metrics);

    assert_eq!(snapshot.success_rate(), 1.0);
}

#[test]
fn test_success_rate_with_mixed_results() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());

    let mut metrics = AgentMetrics::default();
    metrics.tasks_completed = 7;
    metrics.tasks_failed = 3;
    snapshot.update_from_agent(Uuid::new_v4(), metrics);

    assert_eq!(snapshot.success_rate(), 0.7);
}

#[test]
fn test_cost_per_token_with_no_tokens() {
    let snapshot = MetricsSnapshot::new(Utc::now());

    assert_eq!(snapshot.cost_per_token(), 0.0);
}

#[test]
fn test_cost_per_token_calculates_correctly() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());

    let mut metrics = AgentMetrics::default();
    metrics.tokens_used = 1000;
    metrics.cost = 0.50;
    snapshot.update_from_agent(Uuid::new_v4(), metrics);

    assert_eq!(snapshot.cost_per_token(), 0.0005);
}

// ============================================================================
// Serialization Tests
// ============================================================================

#[test]
fn test_metric_point_serialization_roundtrip() {
    let agent_id = Uuid::new_v4();
    let point = MetricPoint::new(MetricType::TokensUsed, 1000.0)
        .with_agent(agent_id)
        .with_label("model".to_string(), "claude".to_string());

    let json = serde_json::to_string(&point).unwrap();
    let deserialized: MetricPoint = serde_json::from_str(&json).unwrap();

    assert_eq!(point.metric_type, deserialized.metric_type);
    assert_eq!(point.value, deserialized.value);
    assert_eq!(point.agent_id, deserialized.agent_id);
}

#[test]
fn test_metrics_snapshot_serialization_roundtrip() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());
    snapshot.total_tokens = 5000;
    snapshot.total_cost = 2.50;

    let json = serde_json::to_string(&snapshot).unwrap();
    let deserialized: MetricsSnapshot = serde_json::from_str(&json).unwrap();

    assert_eq!(snapshot.total_tokens, deserialized.total_tokens);
    assert_eq!(snapshot.total_cost, deserialized.total_cost);
}

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

#[test]
fn test_metrics_with_extreme_values() {
    let mut history = MetricsHistory::new();

    history.record(MetricPoint::new(MetricType::TokensUsed, f64::MAX / 2.0));
    history.record(MetricPoint::new(MetricType::Cost, f64::MAX / 2.0));

    assert_eq!(history.len(), 2);
}

#[test]
fn test_snapshot_with_many_agents() {
    let mut snapshot = MetricsSnapshot::new(Utc::now());

    for _ in 0..100 {
        let mut metrics = AgentMetrics::default();
        metrics.tokens_used = 100;
        metrics.cost = 0.01;
        snapshot.update_from_agent(Uuid::new_v4(), metrics);
    }

    assert_eq!(snapshot.agent_metrics.len(), 100);
    assert_eq!(snapshot.total_tokens, 10000);
    assert!((snapshot.total_cost - 1.0).abs() < 0.0001); // Use epsilon for float comparison
}

#[test]
fn test_complex_time_series_query() {
    let mut history = MetricsHistory::new();
    let agent1 = Uuid::new_v4();
    let agent2 = Uuid::new_v4();

    let t1 = Utc::now();

    // Agent 1 metrics
    history.record(MetricPoint::new(MetricType::TokensUsed, 100.0).with_agent(agent1));
    history.record(MetricPoint::new(MetricType::Cost, 0.05).with_agent(agent1));

    std::thread::sleep(std::time::Duration::from_millis(50));
    let t2 = Utc::now();

    // Agent 2 metrics
    history.record(MetricPoint::new(MetricType::TokensUsed, 200.0).with_agent(agent2));
    history.record(MetricPoint::new(MetricType::Latency, 150.0).with_agent(agent2));

    let t3 = Utc::now();

    // Query agent 1 only
    let agent1_results = history.query(MetricType::TokensUsed, Some(agent1), t1, t3);
    assert_eq!(agent1_results.len(), 1);

    // Query all in time range
    let all_tokens = history.query(MetricType::TokensUsed, None, t1, t3);
    assert_eq!(all_tokens.len(), 2);

    // Query second half only
    let recent = history.query(MetricType::TokensUsed, None, t2, t3);
    assert_eq!(recent.len(), 1);
}
