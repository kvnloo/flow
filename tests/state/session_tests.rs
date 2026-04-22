/// Session state unit tests following London School TDD approach
///
/// Tests verify session lifecycle, configuration, metrics integration,
/// and limit enforcement through behavior contracts.

use chrono::Utc;
use flow_orchestrator_tui::state::{
    Agent, AgentRole, AgentStatus, Session, SessionConfig,
    SessionStatus, SessionType, Task, TaskStatus, TaskType, Priority,
    agent::Framework,
};
use uuid::Uuid;

// ============================================================================
// Session Creation and Initialization Tests
// ============================================================================

#[test]
fn test_session_new_creates_with_correct_defaults() {
    let config = SessionConfig::default();
    let session = Session::new(
        "Test Session".to_string(),
        SessionType::Development,
        config.clone(),
    );

    assert_eq!(session.name, "Test Session");
    assert_eq!(session.session_type, SessionType::Development);
    assert_eq!(session.status, SessionStatus::Active);
    assert!(session.agents.is_empty());
    assert!(session.tasks.is_empty());
    assert_eq!(session.config.model, config.model);
    assert!(session.ended_at.is_none());
}

#[test]
fn test_session_new_generates_unique_ids() {
    let config = SessionConfig::default();
    let session1 = Session::new(
        "Session 1".to_string(),
        SessionType::Development,
        config.clone(),
    );
    let session2 = Session::new(
        "Session 2".to_string(),
        SessionType::Development,
        config,
    );

    assert_ne!(session1.id, session2.id);
}

#[test]
fn test_session_new_sets_start_timestamp() {
    let config = SessionConfig::default();
    let before = Utc::now();
    let session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );
    let after = Utc::now();

    assert!(session.started_at >= before && session.started_at <= after);
}

// ============================================================================
// Session Counting and Queries Tests
// ============================================================================

#[test]
fn test_agent_count_returns_correct_count() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    assert_eq!(session.agent_count(), 0);

    let agent1 = Agent::new(
        AgentRole::Coder,
        "Agent 1".to_string(),
        Framework::ClaudeFlow,
    );
    let agent2 = Agent::new(
        AgentRole::Tester,
        "Agent 2".to_string(),
        Framework::ClaudeFlow,
    );

    session.agents.insert(agent1.id, agent1);
    session.agents.insert(agent2.id, agent2);

    assert_eq!(session.agent_count(), 2);
}

#[test]
fn test_task_count_returns_correct_count() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    assert_eq!(session.task_count(), 0);

    let agent_id = Uuid::new_v4();
    let task1 = Task::new(
        "Task 1".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    let task2 = Task::new(
        "Task 2".to_string(),
        TaskType::Testing,
        agent_id,
        Priority::Medium,
    );

    session.tasks.insert(task1.id, task1);
    session.tasks.insert(task2.id, task2);

    assert_eq!(session.task_count(), 2);
}

#[test]
fn test_duration_seconds_calculates_from_start() {
    let config = SessionConfig::default();
    let session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    std::thread::sleep(std::time::Duration::from_millis(100));
    let duration = session.duration_seconds();

    assert!(duration >= 0);
}

#[test]
fn test_duration_seconds_uses_end_time_when_ended() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    std::thread::sleep(std::time::Duration::from_millis(100));
    session.end(SessionStatus::Completed);

    let duration1 = session.duration_seconds();
    std::thread::sleep(std::time::Duration::from_millis(100));
    let duration2 = session.duration_seconds();

    // Duration should not change after end
    assert_eq!(duration1, duration2);
}

// ============================================================================
// Session Status Management Tests
// ============================================================================

#[test]
fn test_is_active_returns_true_for_active_status() {
    let config = SessionConfig::default();
    let session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    assert!(session.is_active());
}

#[test]
fn test_is_active_returns_false_for_completed() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    session.end(SessionStatus::Completed);

    assert!(!session.is_active());
}

#[test]
fn test_is_complete_returns_true_for_terminal_states() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config.clone(),
    );

    session.status = SessionStatus::Completed;
    assert!(session.is_complete());

    session.status = SessionStatus::Failed;
    assert!(session.is_complete());

    session.status = SessionStatus::Terminated;
    assert!(session.is_complete());
}

#[test]
fn test_is_complete_returns_false_for_active_states() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    assert!(!session.is_complete());

    session.status = SessionStatus::Paused;
    assert!(!session.is_complete());
}

#[test]
fn test_pause_transitions_from_active() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    session.pause();

    assert_eq!(session.status, SessionStatus::Paused);
}

#[test]
fn test_pause_does_not_change_non_active_status() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    session.status = SessionStatus::Completed;
    session.pause();

    assert_eq!(session.status, SessionStatus::Completed);
}

#[test]
fn test_resume_transitions_from_paused() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    session.pause();
    session.resume();

    assert_eq!(session.status, SessionStatus::Active);
}

#[test]
fn test_resume_does_not_change_non_paused_status() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    session.status = SessionStatus::Completed;
    session.resume();

    assert_eq!(session.status, SessionStatus::Completed);
}

#[test]
fn test_end_sets_status() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    session.end(SessionStatus::Completed);

    assert_eq!(session.status, SessionStatus::Completed);
}

#[test]
fn test_end_sets_end_timestamp() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    let before = Utc::now();
    session.end(SessionStatus::Completed);
    let after = Utc::now();

    assert!(session.ended_at.is_some());
    let ended = session.ended_at.unwrap();
    assert!(ended >= before && ended <= after);
}

// ============================================================================
// Active Items Query Tests
// ============================================================================

#[test]
fn test_active_agents_returns_only_active() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    let mut agent1 = Agent::new(
        AgentRole::Coder,
        "Active 1".to_string(),
        Framework::ClaudeFlow,
    );
    agent1.set_status(AgentStatus::Running);

    let mut agent2 = Agent::new(
        AgentRole::Tester,
        "Active 2".to_string(),
        Framework::ClaudeFlow,
    );
    agent2.set_status(AgentStatus::Waiting);

    let agent3 = Agent::new(
        AgentRole::Reviewer,
        "Inactive".to_string(),
        Framework::ClaudeFlow,
    );

    session.agents.insert(agent1.id, agent1);
    session.agents.insert(agent2.id, agent2);
    session.agents.insert(agent3.id, agent3);

    let active = session.active_agents();
    assert_eq!(active.len(), 2);
}

#[test]
fn test_active_tasks_returns_only_active() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    let agent_id = Uuid::new_v4();

    let mut task1 = Task::new(
        "Task 1".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    task1.status = TaskStatus::InProgress;

    let mut task2 = Task::new(
        "Task 2".to_string(),
        TaskType::Testing,
        agent_id,
        Priority::Medium,
    );
    task2.status = TaskStatus::Queued;

    let task3 = Task::new(
        "Task 3".to_string(),
        TaskType::Research,
        agent_id,
        Priority::Low,
    );

    session.tasks.insert(task1.id, task1);
    session.tasks.insert(task2.id, task2);
    session.tasks.insert(task3.id, task3);

    let active = session.active_tasks();
    assert_eq!(active.len(), 2);
}

// ============================================================================
// Limit Checking Tests
// ============================================================================

#[test]
fn test_is_over_cost_limit_returns_false_with_no_limit() {
    let config = SessionConfig::new("test-model".to_string());
    let session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    assert!(!session.is_over_cost_limit());
}

#[test]
fn test_is_over_cost_limit_returns_false_under_limit() {
    let config = SessionConfig::new("test-model".to_string())
        .with_cost_limit(10.0);
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    session.metrics.total_cost = 5.0;

    assert!(!session.is_over_cost_limit());
}

#[test]
fn test_is_over_cost_limit_returns_true_over_limit() {
    let config = SessionConfig::new("test-model".to_string())
        .with_cost_limit(10.0);
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    session.metrics.total_cost = 15.0;

    assert!(session.is_over_cost_limit());
}

#[test]
fn test_is_over_time_limit_returns_false_with_no_limit() {
    let config = SessionConfig::new("test-model".to_string());
    let session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    assert!(!session.is_over_time_limit());
}

#[test]
fn test_is_over_time_limit_returns_true_over_limit() {
    let config = SessionConfig::new("test-model".to_string())
        .with_time_limit(1); // 1 second
    let session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    std::thread::sleep(std::time::Duration::from_secs(2));

    assert!(session.is_over_time_limit());
}

// ============================================================================
// SessionType Tests
// ============================================================================

#[test]
fn test_session_type_display_names() {
    assert_eq!(SessionType::Development.display_name(), "Development");
    assert_eq!(SessionType::Research.display_name(), "Research");
    assert_eq!(SessionType::Testing.display_name(), "Testing");
    assert_eq!(
        SessionType::Custom("MyType".to_string()).display_name(),
        "MyType"
    );
}

#[test]
fn test_session_type_serialization() {
    let session_type = SessionType::Development;
    let json = serde_json::to_string(&session_type).unwrap();
    assert_eq!(json, "\"development\"");
}

// ============================================================================
// SessionStatus Tests
// ============================================================================

#[test]
fn test_session_status_is_active() {
    assert!(SessionStatus::Active.is_active());
    assert!(SessionStatus::Paused.is_active());
    assert!(!SessionStatus::Completed.is_active());
    assert!(!SessionStatus::Failed.is_active());
}

#[test]
fn test_session_status_is_terminal() {
    assert!(SessionStatus::Completed.is_terminal());
    assert!(SessionStatus::Failed.is_terminal());
    assert!(SessionStatus::Terminated.is_terminal());
    assert!(!SessionStatus::Active.is_terminal());
    assert!(!SessionStatus::Paused.is_terminal());
}

#[test]
fn test_session_status_serialization() {
    let status = SessionStatus::Active;
    let json = serde_json::to_string(&status).unwrap();
    assert_eq!(json, "\"ACTIVE\"");
}

// ============================================================================
// SessionConfig Tests
// ============================================================================

#[test]
fn test_session_config_new() {
    let config = SessionConfig::new("claude-3-5-sonnet".to_string());

    assert_eq!(config.model, "claude-3-5-sonnet");
    assert_eq!(config.max_agents, 10);
    assert!(config.cost_limit.is_none());
    assert!(config.time_limit.is_none());
    assert_eq!(config.autosave_interval, 300);
    assert!(config.settings.is_empty());
}

#[test]
fn test_session_config_default() {
    let config = SessionConfig::default();

    assert_eq!(config.model, "claude-3-5-sonnet-20241022");
    assert_eq!(config.max_agents, 10);
}

#[test]
fn test_session_config_with_max_agents() {
    let config = SessionConfig::new("model".to_string())
        .with_max_agents(20);

    assert_eq!(config.max_agents, 20);
}

#[test]
fn test_session_config_with_cost_limit() {
    let config = SessionConfig::new("model".to_string())
        .with_cost_limit(50.0);

    assert_eq!(config.cost_limit, Some(50.0));
}

#[test]
fn test_session_config_with_time_limit() {
    let config = SessionConfig::new("model".to_string())
        .with_time_limit(3600);

    assert_eq!(config.time_limit, Some(3600));
}

#[test]
fn test_session_config_with_autosave_interval() {
    let config = SessionConfig::new("model".to_string())
        .with_autosave_interval(600);

    assert_eq!(config.autosave_interval, 600);
}

#[test]
fn test_session_config_with_setting() {
    let config = SessionConfig::new("model".to_string())
        .with_setting("key".to_string(), serde_json::json!("value"));

    assert_eq!(config.settings.get("key"), Some(&serde_json::json!("value")));
}

#[test]
fn test_session_config_builder_chain() {
    let config = SessionConfig::new("model".to_string())
        .with_max_agents(15)
        .with_cost_limit(100.0)
        .with_time_limit(7200)
        .with_autosave_interval(600)
        .with_setting("debug".to_string(), serde_json::json!(true));

    assert_eq!(config.max_agents, 15);
    assert_eq!(config.cost_limit, Some(100.0));
    assert_eq!(config.time_limit, Some(7200));
    assert_eq!(config.autosave_interval, 600);
    assert_eq!(config.settings.len(), 1);
}

// ============================================================================
// Serialization Tests
// ============================================================================

#[test]
fn test_session_serialization_roundtrip() {
    let config = SessionConfig::default();
    let session = Session::new(
        "Test Session".to_string(),
        SessionType::Development,
        config,
    );

    let json = serde_json::to_string(&session).unwrap();
    let deserialized: Session = serde_json::from_str(&json).unwrap();

    assert_eq!(session.id, deserialized.id);
    assert_eq!(session.name, deserialized.name);
    assert_eq!(session.status, deserialized.status);
}

#[test]
fn test_session_config_serialization_roundtrip() {
    let config = SessionConfig::new("model".to_string())
        .with_max_agents(20)
        .with_cost_limit(50.0);

    let json = serde_json::to_string(&config).unwrap();
    let deserialized: SessionConfig = serde_json::from_str(&json).unwrap();

    assert_eq!(config.model, deserialized.model);
    assert_eq!(config.max_agents, deserialized.max_agents);
    assert_eq!(config.cost_limit, deserialized.cost_limit);
}

// ============================================================================
// Integration and Edge Cases
// ============================================================================

#[test]
fn test_session_full_lifecycle() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Test".to_string(),
        SessionType::Development,
        config,
    );

    // Start active
    assert_eq!(session.status, SessionStatus::Active);
    assert!(session.is_active());
    assert!(!session.is_complete());

    // Pause
    session.pause();
    assert_eq!(session.status, SessionStatus::Paused);

    // Resume
    session.resume();
    assert_eq!(session.status, SessionStatus::Active);

    // End
    session.end(SessionStatus::Completed);
    assert!(!session.is_active());
    assert!(session.is_complete());
    assert!(session.ended_at.is_some());
}

#[test]
fn test_session_with_empty_name() {
    let config = SessionConfig::default();
    let session = Session::new(
        String::new(),
        SessionType::Development,
        config,
    );

    assert_eq!(session.name, "");
}

#[test]
fn test_session_with_complex_agents_and_tasks() {
    let config = SessionConfig::default();
    let mut session = Session::new(
        "Complex".to_string(),
        SessionType::Orchestration,
        config,
    );

    // Add multiple agents
    for i in 0..5 {
        let agent = Agent::new(
            AgentRole::Coder,
            format!("Agent {}", i),
            Framework::ClaudeFlow,
        );
        session.agents.insert(agent.id, agent);
    }

    // Add multiple tasks
    let agent_id = session.agents.values().next().unwrap().id;
    for i in 0..10 {
        let task = Task::new(
            format!("Task {}", i),
            TaskType::CodeGeneration,
            agent_id,
            Priority::Medium,
        );
        session.tasks.insert(task.id, task);
    }

    assert_eq!(session.agent_count(), 5);
    assert_eq!(session.task_count(), 10);
}
