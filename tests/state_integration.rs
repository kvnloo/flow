/// Integration tests for the state management system
///
/// This test file verifies that all state management components
/// work correctly together.

use flow_orchestrator_tui::state::*;

#[test]
fn test_state_manager_creation() {
    let state = StateManager::new();
    assert!(!state.has_active_session());
    assert!(state.current_session_id().is_none());
}

#[test]
fn test_agent_creation_and_status() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test Agent".to_string(),
        agent::Framework::ClaudeFlow,
    );

    assert_eq!(agent.status, AgentStatus::Idle);
    assert!(agent.is_root());
    assert!(!agent.has_children());

    agent.set_status(AgentStatus::Running);
    assert_eq!(agent.status, AgentStatus::Running);
    assert!(agent.is_active());
}

#[test]
fn test_agent_capabilities() {
    let mut agent = Agent::new(
        AgentRole::Coder,
        "Test Agent".to_string(),
        agent::Framework::ClaudeFlow,
    );

    agent.add_capability("rust");
    agent.add_capability("typescript");

    assert!(agent.has_capability("rust"));
    assert!(agent.has_capability("typescript"));
    assert!(!agent.has_capability("python"));
}

#[test]
fn test_task_lifecycle() {
    let agent_id = uuid::Uuid::new_v4();
    let mut task = Task::new(
        "Test task".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    assert_eq!(task.status, TaskStatus::Pending);
    assert_eq!(task.progress, 0);

    task.start();
    assert_eq!(task.status, TaskStatus::InProgress);
    assert!(task.started_at.is_some());

    task.update_progress(50);
    assert_eq!(task.progress, 50);

    task.complete(Some(serde_json::json!({"result": "success"})));
    assert_eq!(task.status, TaskStatus::Completed);
    assert_eq!(task.progress, 100);
    assert!(task.is_terminal());
    assert!(task.completed_at.is_some());
}

#[test]
fn test_agent_graph_operations() {
    let mut graph = AgentGraph::new();

    let agent1 = Agent::new(
        AgentRole::Coordinator,
        "Coordinator".to_string(),
        agent::Framework::ClaudeFlow,
    );
    let agent2 = Agent::new(
        AgentRole::Coder,
        "Coder".to_string(),
        agent::Framework::ClaudeFlow,
    );

    let id1 = agent1.id;
    let id2 = agent2.id;

    graph.add_agent(agent1);
    graph.add_agent(agent2);

    assert_eq!(graph.agent_count(), 2);
    assert!(graph.contains_agent(&id1));
    assert!(graph.contains_agent(&id2));

    // Add edge (relationship)
    graph.add_edge(id1, id2);
    let children = graph.get_children(&id1);
    assert_eq!(children.len(), 1);
    assert_eq!(children[0], id2);
}

#[test]
fn test_session_lifecycle() {
    let config = SessionConfig::new("claude-3-5-sonnet-20241022".to_string())
        .with_max_agents(5)
        .with_cost_limit(10.0);

    let mut session = Session::new(
        "Test Session".to_string(),
        SessionType::Development,
        config,
    );

    assert_eq!(session.status, SessionStatus::Active);
    assert!(session.is_active());
    assert_eq!(session.agent_count(), 0);
    assert_eq!(session.task_count(), 0);

    session.pause();
    assert_eq!(session.status, SessionStatus::Paused);

    session.resume();
    assert_eq!(session.status, SessionStatus::Active);

    session.end(SessionStatus::Completed);
    assert!(session.is_complete());
    assert!(session.ended_at.is_some());
}

#[test]
fn test_metrics_tracking() {
    let mut metrics = AgentMetrics::new();

    assert_eq!(metrics.tasks_completed, 0);
    assert_eq!(metrics.tasks_failed, 0);
    assert_eq!(metrics.success_rate(), 1.0);

    metrics.record_completion(1000, 150.0, 0.001);
    assert_eq!(metrics.tasks_completed, 1);
    assert_eq!(metrics.tokens_used, 1000);
    assert_eq!(metrics.avg_latency_ms, 150.0);
    assert!(metrics.heat > 0);

    metrics.record_failure();
    assert_eq!(metrics.tasks_failed, 1);
    assert_eq!(metrics.errors, 1);
    assert_eq!(metrics.success_rate(), 0.5);
}

#[test]
fn test_metrics_history() {
    let mut history = MetricsHistory::new();

    let point1 = MetricPoint::new(MetricType::TokensUsed, 1000.0);
    let point2 = MetricPoint::new(MetricType::Cost, 0.05);

    history.record(point1);
    history.record(point2);

    assert_eq!(history.len(), 2);
    assert!(!history.is_empty());

    let token_point = history.latest(MetricType::TokensUsed, None);
    assert!(token_point.is_some());
    assert_eq!(token_point.unwrap().value, 1000.0);
}

#[test]
fn test_state_manager_with_session() {
    let state = StateManager::new();
    let config = SessionConfig::default();
    let session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    state.start_session(session);
    assert!(state.has_active_session());
    assert!(state.current_session_id().is_some());

    state.end_session();
    // Session should still exist but be marked as completed
    assert!(state.has_active_session()); // Still has a session
    let session_guard = state.session.read().unwrap();
    assert_eq!(session_guard.as_ref().unwrap().status, SessionStatus::Completed);
}

#[test]
fn test_cluster_operations() {
    let mut cluster = Cluster::new(
        "Backend Team".to_string(),
        ClusterType::Backend,
        Topology::Hierarchical,
    );

    let agent_id = uuid::Uuid::new_v4();
    cluster.add_member(agent_id);

    assert_eq!(cluster.member_count(), 1);
    assert!(cluster.contains_member(&agent_id));

    cluster.remove_member(&agent_id);
    assert_eq!(cluster.member_count(), 0);
}

#[test]
fn test_priority_ordering() {
    assert!(Priority::Critical > Priority::High);
    assert!(Priority::High > Priority::Medium);
    assert!(Priority::Medium > Priority::Low);

    let mut priorities = vec![Priority::Low, Priority::Critical, Priority::Medium, Priority::High];
    priorities.sort();
    assert_eq!(priorities, vec![Priority::Low, Priority::Medium, Priority::High, Priority::Critical]);
}

#[test]
fn test_task_dependencies() {
    let agent_id = uuid::Uuid::new_v4();
    let mut task1 = Task::new(
        "Task 1".to_string(),
        TaskType::Planning,
        agent_id,
        Priority::High,
    );
    let task2_id = uuid::Uuid::new_v4();

    task1.add_dependency(task2_id);
    assert_eq!(task1.dependencies.len(), 1);
    assert!(!task1.can_start(&vec![]));
    assert!(task1.can_start(&vec![task2_id]));
}
