/// Agent state unit tests following London School TDD approach
///
/// Tests focus on behavior verification and object interactions rather than
/// internal state. Uses mocks to isolate units and verify contracts.

use chrono::Utc;
use flow_orchestrator_tui::state::{
    Agent, AgentMetrics, AgentRole, AgentStatus,
    agent::Framework,
};
use uuid::Uuid;

// ============================================================================
// Agent Creation and Initialization Tests
// ============================================================================

#[test]
fn test_agent_new_creates_with_correct_defaults() {
    let agent = Agent::new(
        AgentRole::Coder,
        "Test Agent".to_string(),
        Framework::ClaudeFlow,
    );

    assert_eq!(agent.role, AgentRole::Coder);
    assert_eq!(agent.name, "Test Agent");
    assert_eq!(agent.framework, Framework::ClaudeFlow);
    assert_eq!(agent.status, AgentStatus::Idle);
    assert!(agent.capabilities.is_empty());
    assert!(agent.parent.is_none());
    assert!(agent.children.is_empty());
    assert!(agent.cluster.is_none());
    assert_eq!(agent.metrics, AgentMetrics::default());
    assert!(agent.config.is_empty());
}

#[test]
fn test_agent_new_generates_unique_ids() {
    let agent1 = Agent::new(
        AgentRole::Coordinator,
        "Agent 1".to_string(),
        Framework::ClaudeFlow,
    );
    let agent2 = Agent::new(
        AgentRole::Coordinator,
        "Agent 2".to_string(),
        Framework::ClaudeFlow,
    );

    assert_ne!(agent1.id, agent2.id);
}

#[test]
fn test_agent_new_sets_timestamps() {
    let before = Utc::now();
    let agent = Agent::new(
        AgentRole::Researcher,
        "Test".to_string(),
        Framework::AutoGen,
    );
    let after = Utc::now();

    assert!(agent.created_at >= before && agent.created_at <= after);
    assert!(agent.updated_at >= before && agent.updated_at <= after);
    assert_eq!(agent.created_at, agent.updated_at);
}

// ============================================================================
// Capability Management Tests
// ============================================================================

#[test]
fn test_add_capability_appends_to_list() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );

    agent.add_capability("rust");
    agent.add_capability("python");

    assert_eq!(agent.capabilities.len(), 2);
    assert!(agent.capabilities.contains(&"rust".to_string()));
    assert!(agent.capabilities.contains(&"python".to_string()));
}

#[test]
fn test_has_capability_returns_true_when_present() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );
    agent.add_capability("typescript");

    assert!(agent.has_capability("typescript"));
}

#[test]
fn test_has_capability_returns_false_when_absent() {
    let agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );

    assert!(!agent.has_capability("go"));
}

#[test]
fn test_add_capability_accepts_string_types() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );

    // Test different string types via Into<String>
    agent.add_capability("literal");
    agent.add_capability(String::from("owned"));

    assert_eq!(agent.capabilities.len(), 2);
}

// ============================================================================
// Parent-Child Relationship Tests
// ============================================================================

#[test]
fn test_set_parent_assigns_parent_id() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Child".to_string(),
        Framework::ClaudeFlow,
    );
    let parent_id = Uuid::new_v4();

    agent.set_parent(parent_id);

    assert_eq!(agent.parent, Some(parent_id));
}

#[test]
fn test_add_child_appends_child_id() {
    let mut agent = Agent::new(
        AgentRole::Coordinator,
        "Parent".to_string(),
        Framework::ClaudeFlow,
    );
    let child_id = Uuid::new_v4();

    agent.add_child(child_id);

    assert_eq!(agent.children.len(), 1);
    assert!(agent.children.contains(&child_id));
}

#[test]
fn test_add_child_prevents_duplicates() {
    let mut agent = Agent::new(
        AgentRole::Coordinator,
        "Parent".to_string(),
        Framework::ClaudeFlow,
    );
    let child_id = Uuid::new_v4();

    agent.add_child(child_id);
    agent.add_child(child_id);
    agent.add_child(child_id);

    assert_eq!(agent.children.len(), 1);
}

#[test]
fn test_is_root_returns_true_when_no_parent() {
    let agent = Agent::new(
        AgentRole::Coordinator,
        "Root".to_string(),
        Framework::ClaudeFlow,
    );

    assert!(agent.is_root());
}

#[test]
fn test_is_root_returns_false_when_has_parent() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Child".to_string(),
        Framework::ClaudeFlow,
    );
    agent.set_parent(Uuid::new_v4());

    assert!(!agent.is_root());
}

#[test]
fn test_has_children_returns_false_when_empty() {
    let agent = Agent::new(
        AgentRole::Coordinator,
        "Leaf".to_string(),
        Framework::ClaudeFlow,
    );

    assert!(!agent.has_children());
}

#[test]
fn test_has_children_returns_true_when_present() {
    let mut agent = Agent::new(
        AgentRole::Coordinator,
        "Parent".to_string(),
        Framework::ClaudeFlow,
    );
    agent.add_child(Uuid::new_v4());

    assert!(agent.has_children());
}

// ============================================================================
// Status Management Tests
// ============================================================================

#[test]
fn test_set_status_updates_status() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );

    agent.set_status(AgentStatus::Running);

    assert_eq!(agent.status, AgentStatus::Running);
}

#[test]
fn test_set_status_updates_timestamp() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );
    let initial_time = agent.updated_at;

    std::thread::sleep(std::time::Duration::from_millis(10));
    agent.set_status(AgentStatus::Running);

    assert!(agent.updated_at > initial_time);
}

#[test]
fn test_is_active_returns_true_for_running() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );
    agent.set_status(AgentStatus::Running);

    assert!(agent.is_active());
}

#[test]
fn test_is_active_returns_true_for_waiting() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );
    agent.set_status(AgentStatus::Waiting);

    assert!(agent.is_active());
}

#[test]
fn test_is_active_returns_false_for_idle() {
    let agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );

    assert!(!agent.is_active());
}

#[test]
fn test_is_active_returns_false_for_terminal_states() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );

    agent.set_status(AgentStatus::Completed);
    assert!(!agent.is_active());

    agent.set_status(AgentStatus::Failed);
    assert!(!agent.is_active());

    agent.set_status(AgentStatus::Terminated);
    assert!(!agent.is_active());
}

// ============================================================================
// AgentRole Tests
// ============================================================================

#[test]
fn test_agent_role_display_names() {
    assert_eq!(AgentRole::Coordinator.display_name(), "Coordinator");
    assert_eq!(AgentRole::Planner.display_name(), "Planner");
    assert_eq!(AgentRole::Coder.display_name(), "Coder");
    assert_eq!(AgentRole::Tester.display_name(), "Tester");
    assert_eq!(
        AgentRole::Custom("MyRole".to_string()).display_name(),
        "MyRole"
    );
}

#[test]
fn test_agent_role_serialization() {
    let role = AgentRole::Coordinator;
    let json = serde_json::to_string(&role).unwrap();
    assert_eq!(json, "\"coordinator\"");
}

#[test]
fn test_agent_role_custom_serialization() {
    let role = AgentRole::Custom("test_role".to_string());
    let json = serde_json::to_string(&role).unwrap();
    let deserialized: AgentRole = serde_json::from_str(&json).unwrap();
    assert_eq!(role, deserialized);
}

// ============================================================================
// AgentStatus Tests
// ============================================================================

#[test]
fn test_agent_status_is_active() {
    assert!(AgentStatus::Running.is_active());
    assert!(AgentStatus::Waiting.is_active());
    assert!(!AgentStatus::Idle.is_active());
    assert!(!AgentStatus::Paused.is_active());
    assert!(!AgentStatus::Completed.is_active());
}

#[test]
fn test_agent_status_is_terminal() {
    assert!(AgentStatus::Completed.is_terminal());
    assert!(AgentStatus::Failed.is_terminal());
    assert!(AgentStatus::Terminated.is_terminal());
    assert!(!AgentStatus::Running.is_terminal());
    assert!(!AgentStatus::Idle.is_terminal());
}

#[test]
fn test_agent_status_serialization() {
    let status = AgentStatus::Running;
    let json = serde_json::to_string(&status).unwrap();
    assert_eq!(json, "\"RUNNING\"");
}

// ============================================================================
// Framework Tests
// ============================================================================

#[test]
fn test_framework_display_names() {
    assert_eq!(Framework::ClaudeFlow.display_name(), "Claude Flow");
    assert_eq!(Framework::AutoGen.display_name(), "AutoGen");
    assert_eq!(Framework::LangGraph.display_name(), "LangGraph");
    assert_eq!(Framework::CrewAI.display_name(), "CrewAI");
    assert_eq!(
        Framework::Custom("MyFramework".to_string()).display_name(),
        "MyFramework"
    );
}

#[test]
fn test_framework_serialization() {
    let framework = Framework::ClaudeFlow;
    let json = serde_json::to_string(&framework).unwrap();
    assert_eq!(json, "\"claude-flow\"");
}

// ============================================================================
// AgentMetrics Tests
// ============================================================================

#[test]
fn test_agent_metrics_default() {
    let metrics = AgentMetrics::default();

    assert_eq!(metrics.tokens_used, 0);
    assert_eq!(metrics.cost, 0.0);
    assert_eq!(metrics.avg_latency_ms, 0.0);
    assert_eq!(metrics.tasks_completed, 0);
    assert_eq!(metrics.tasks_failed, 0);
    assert_eq!(metrics.queue_depth, 0);
    assert_eq!(metrics.errors, 0);
    assert_eq!(metrics.heat, 0);
    assert_eq!(metrics.xp, 0);
}

#[test]
fn test_agent_metrics_new_equals_default() {
    let metrics = AgentMetrics::new();
    assert_eq!(metrics, AgentMetrics::default());
}

#[test]
fn test_success_rate_with_no_tasks() {
    let metrics = AgentMetrics::default();
    assert_eq!(metrics.success_rate(), 1.0);
}

#[test]
fn test_success_rate_with_all_completed() {
    let mut metrics = AgentMetrics::default();
    metrics.tasks_completed = 10;
    metrics.tasks_failed = 0;

    assert_eq!(metrics.success_rate(), 1.0);
}

#[test]
fn test_success_rate_with_all_failed() {
    let mut metrics = AgentMetrics::default();
    metrics.tasks_completed = 0;
    metrics.tasks_failed = 5;

    assert_eq!(metrics.success_rate(), 0.0);
}

#[test]
fn test_success_rate_with_mixed_results() {
    let mut metrics = AgentMetrics::default();
    metrics.tasks_completed = 7;
    metrics.tasks_failed = 3;

    assert_eq!(metrics.success_rate(), 0.7);
}

#[test]
fn test_record_completion_updates_counters() {
    let mut metrics = AgentMetrics::default();

    metrics.record_completion(1000, 150.0, 0.05);

    assert_eq!(metrics.tasks_completed, 1);
    assert_eq!(metrics.tokens_used, 1000);
    assert_eq!(metrics.cost, 0.05);
    assert_eq!(metrics.avg_latency_ms, 150.0);
}

#[test]
fn test_record_completion_updates_average_latency() {
    let mut metrics = AgentMetrics::default();

    metrics.record_completion(1000, 100.0, 0.05);
    metrics.record_completion(1000, 200.0, 0.05);

    // Average should be (100 + 200) / 2 = 150
    assert_eq!(metrics.avg_latency_ms, 150.0);
}

#[test]
fn test_record_completion_accumulates_tokens_and_cost() {
    let mut metrics = AgentMetrics::default();

    metrics.record_completion(1000, 100.0, 0.05);
    metrics.record_completion(2000, 100.0, 0.10);

    assert_eq!(metrics.tokens_used, 3000);
    assert!((metrics.cost - 0.15).abs() < 0.0001); // Use epsilon for float comparison
}

#[test]
fn test_record_completion_increases_heat() {
    let mut metrics = AgentMetrics::default();

    metrics.record_completion(1000, 100.0, 0.05);

    assert!(metrics.heat > 0);
    assert!(metrics.heat <= 100);
}

#[test]
fn test_record_completion_awards_xp() {
    let mut metrics = AgentMetrics::default();

    metrics.record_completion(1000, 100.0, 0.05);

    // Base 10 XP + tokens/100 = 10 + 10 = 20
    assert_eq!(metrics.xp, 20);
}

#[test]
fn test_record_failure_increments_counters() {
    let mut metrics = AgentMetrics::default();

    metrics.record_failure();

    assert_eq!(metrics.tasks_failed, 1);
    assert_eq!(metrics.errors, 1);
}

#[test]
fn test_record_failure_increases_heat_moderately() {
    let mut metrics = AgentMetrics::default();
    metrics.heat = 0;

    metrics.record_failure();

    assert!(metrics.heat > 0);
    assert!(metrics.heat < 10); // Should be less than completion heat
}

#[test]
fn test_decay_heat_reduces_heat() {
    let mut metrics = AgentMetrics::default();
    metrics.heat = 100;

    metrics.decay_heat();

    assert!(metrics.heat < 100);
    assert_eq!(metrics.heat, 95); // 100 * 0.95
}

#[test]
fn test_decay_heat_floors_at_zero() {
    let mut metrics = AgentMetrics::default();
    metrics.heat = 1;

    for _ in 0..100 {
        metrics.decay_heat();
    }

    assert_eq!(metrics.heat, 0);
}

#[test]
fn test_heat_caps_at_100() {
    let mut metrics = AgentMetrics::default();
    metrics.heat = 98;

    // Try to push heat over 100
    for _ in 0..10 {
        metrics.record_completion(1000, 100.0, 0.05);
    }

    assert!(metrics.heat <= 100);
    assert!(metrics.heat >= 95); // Should be close to 100
}

// ============================================================================
// Serialization Tests
// ============================================================================

#[test]
fn test_agent_serialization_roundtrip() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test Agent".to_string(),
        Framework::ClaudeFlow,
    );
    agent.add_capability("rust");
    agent.set_status(AgentStatus::Running);

    let json = serde_json::to_string(&agent).unwrap();
    let deserialized: Agent = serde_json::from_str(&json).unwrap();

    assert_eq!(agent.id, deserialized.id);
    assert_eq!(agent.name, deserialized.name);
    assert_eq!(agent.role, deserialized.role);
    assert_eq!(agent.status, deserialized.status);
    assert_eq!(agent.capabilities, deserialized.capabilities);
}

#[test]
fn test_agent_metrics_serialization_roundtrip() {
    let mut metrics = AgentMetrics::default();
    metrics.record_completion(1000, 150.0, 0.05);

    let json = serde_json::to_string(&metrics).unwrap();
    let deserialized: AgentMetrics = serde_json::from_str(&json).unwrap();

    assert_eq!(metrics, deserialized);
}

// ============================================================================
// Edge Cases and Contract Tests
// ============================================================================

#[test]
fn test_agent_clone_creates_independent_copy() {
    let mut original = Agent::new(
        AgentRole::Coder,
        "Original".to_string(),
        Framework::ClaudeFlow,
    );
    original.add_capability("rust");

    let mut cloned = original.clone();
    cloned.add_capability("python");

    assert_eq!(original.capabilities.len(), 1);
    assert_eq!(cloned.capabilities.len(), 2);
}

#[test]
fn test_agent_with_empty_name() {
    let agent = Agent::new(
        AgentRole::Coder,
        String::new(),
        Framework::ClaudeFlow,
    );

    assert_eq!(agent.name, "");
}

#[test]
fn test_agent_with_very_long_name() {
    let long_name = "a".repeat(10000);
    let agent = Agent::new(
        AgentRole::Coder,
        long_name.clone(),
        Framework::ClaudeFlow,
    );

    assert_eq!(agent.name.len(), 10000);
}

#[test]
fn test_multiple_status_transitions() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test".to_string(),
        Framework::ClaudeFlow,
    );

    // Test full lifecycle
    agent.set_status(AgentStatus::Running);
    assert_eq!(agent.status, AgentStatus::Running);

    agent.set_status(AgentStatus::Waiting);
    assert_eq!(agent.status, AgentStatus::Waiting);

    agent.set_status(AgentStatus::Paused);
    assert_eq!(agent.status, AgentStatus::Paused);

    agent.set_status(AgentStatus::Running);
    assert_eq!(agent.status, AgentStatus::Running);

    agent.set_status(AgentStatus::Completed);
    assert_eq!(agent.status, AgentStatus::Completed);
}

#[test]
fn test_metrics_with_extreme_values() {
    let mut metrics = AgentMetrics::default();

    // Test with very large values
    metrics.record_completion(u64::MAX / 2, f64::MAX / 2.0, f64::MAX / 2.0);

    assert!(metrics.tokens_used > 0);
    assert!(metrics.cost > 0.0);
}
