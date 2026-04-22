/// Task state unit tests following London School TDD approach
///
/// Tests verify task lifecycle, status transitions, dependency management,
/// and error handling through behavior verification.

use chrono::Utc;
use flow_orchestrator_tui::state::{
    Priority, Task, TaskError, TaskStatus, TaskType,
};
use uuid::Uuid;

// ============================================================================
// Task Creation and Initialization Tests
// ============================================================================

#[test]
fn test_task_new_creates_with_correct_defaults() {
    let agent_id = Uuid::new_v4();
    let task = Task::new(
        "Test task".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    assert_eq!(task.description, "Test task");
    assert_eq!(task.task_type, TaskType::CodeGeneration);
    assert_eq!(task.assigned_agent, agent_id);
    assert_eq!(task.priority, Priority::High);
    assert_eq!(task.status, TaskStatus::Pending);
    assert_eq!(task.progress, 0);
    assert!(task.dependencies.is_empty());
    assert!(task.parent.is_none());
    assert!(task.subtasks.is_empty());
    assert!(task.milestone.is_none());
    assert!(task.estimated_duration.is_none());
    assert!(task.actual_duration.is_none());
    assert!(task.result.is_none());
    assert!(task.error.is_none());
    assert!(task.started_at.is_none());
    assert!(task.completed_at.is_none());
}

#[test]
fn test_task_new_generates_unique_ids() {
    let agent_id = Uuid::new_v4();
    let task1 = Task::new(
        "Task 1".to_string(),
        TaskType::Research,
        agent_id,
        Priority::Medium,
    );
    let task2 = Task::new(
        "Task 2".to_string(),
        TaskType::Research,
        agent_id,
        Priority::Medium,
    );

    assert_ne!(task1.id, task2.id);
}

#[test]
fn test_task_new_sets_creation_timestamp() {
    let agent_id = Uuid::new_v4();
    let before = Utc::now();
    let task = Task::new(
        "Test".to_string(),
        TaskType::Testing,
        agent_id,
        Priority::Low,
    );
    let after = Utc::now();

    assert!(task.created_at >= before && task.created_at <= after);
}

// ============================================================================
// Task Lifecycle Tests
// ============================================================================

#[test]
fn test_start_sets_status_to_in_progress() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    task.start();

    assert_eq!(task.status, TaskStatus::InProgress);
}

#[test]
fn test_start_sets_started_timestamp() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    let before = Utc::now();
    task.start();
    let after = Utc::now();

    assert!(task.started_at.is_some());
    let started = task.started_at.unwrap();
    assert!(started >= before && started <= after);
}

#[test]
fn test_start_preserves_first_start_time() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    task.start();
    let first_start = task.started_at;

    std::thread::sleep(std::time::Duration::from_millis(10));
    task.start();

    assert_eq!(task.started_at, first_start);
}

#[test]
fn test_update_progress_sets_progress() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    task.update_progress(50);

    assert_eq!(task.progress, 50);
}

#[test]
fn test_update_progress_caps_at_100() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    task.update_progress(150);

    assert_eq!(task.progress, 100);
}

#[test]
fn test_complete_sets_status_to_completed() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    task.start();

    task.complete(None);

    assert_eq!(task.status, TaskStatus::Completed);
}

#[test]
fn test_complete_sets_progress_to_100() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    task.start();

    task.complete(None);

    assert_eq!(task.progress, 100);
}

#[test]
fn test_complete_sets_completion_timestamp() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    task.start();

    let before = Utc::now();
    task.complete(None);
    let after = Utc::now();

    assert!(task.completed_at.is_some());
    let completed = task.completed_at.unwrap();
    assert!(completed >= before && completed <= after);
}

#[test]
fn test_complete_stores_result() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    task.start();

    let result = serde_json::json!({"code": "fn main() {}"});
    task.complete(Some(result.clone()));

    assert_eq!(task.result, Some(result));
}

#[test]
fn test_complete_calculates_actual_duration() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    task.start();
    std::thread::sleep(std::time::Duration::from_millis(100));
    task.complete(None);

    assert!(task.actual_duration.is_some());
    assert!(task.actual_duration.unwrap() >= 0);
}

#[test]
fn test_fail_sets_status_to_failed() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    task.start();

    let error = TaskError::new("TestError", "Test error message");
    task.fail(error);

    assert_eq!(task.status, TaskStatus::Failed);
}

#[test]
fn test_fail_stores_error() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    task.start();

    let error = TaskError::new("TestError", "Test error message");
    task.fail(error.clone());

    assert_eq!(task.error, Some(error));
}

#[test]
fn test_fail_sets_completion_timestamp() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    task.start();

    let error = TaskError::new("TestError", "Test error message");
    task.fail(error);

    assert!(task.completed_at.is_some());
}

#[test]
fn test_fail_calculates_actual_duration() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    task.start();
    std::thread::sleep(std::time::Duration::from_millis(100));

    let error = TaskError::new("TestError", "Test error message");
    task.fail(error);

    assert!(task.actual_duration.is_some());
    assert!(task.actual_duration.unwrap() >= 0);
}

// ============================================================================
// Dependency Management Tests
// ============================================================================

#[test]
fn test_add_dependency_appends_task_id() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    let dep_id = Uuid::new_v4();

    task.add_dependency(dep_id);

    assert_eq!(task.dependencies.len(), 1);
    assert!(task.dependencies.contains(&dep_id));
}

#[test]
fn test_add_dependency_prevents_duplicates() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    let dep_id = Uuid::new_v4();

    task.add_dependency(dep_id);
    task.add_dependency(dep_id);
    task.add_dependency(dep_id);

    assert_eq!(task.dependencies.len(), 1);
}

#[test]
fn test_can_start_returns_true_when_no_dependencies() {
    let agent_id = Uuid::new_v4();
    let task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    assert!(task.can_start(&[]));
}

#[test]
fn test_can_start_returns_false_when_dependencies_not_met() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    let dep_id = Uuid::new_v4();
    task.add_dependency(dep_id);

    assert!(!task.can_start(&[]));
}

#[test]
fn test_can_start_returns_true_when_all_dependencies_completed() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    let dep1 = Uuid::new_v4();
    let dep2 = Uuid::new_v4();
    task.add_dependency(dep1);
    task.add_dependency(dep2);

    let completed = vec![dep1, dep2];
    assert!(task.can_start(&completed));
}

#[test]
fn test_can_start_returns_false_when_status_not_pending() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    task.start();

    assert!(!task.can_start(&[]));
}

// ============================================================================
// Subtask Management Tests
// ============================================================================

#[test]
fn test_add_subtask_appends_task_id() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    let subtask_id = Uuid::new_v4();

    task.add_subtask(subtask_id);

    assert_eq!(task.subtasks.len(), 1);
    assert!(task.subtasks.contains(&subtask_id));
}

#[test]
fn test_add_subtask_prevents_duplicates() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    let subtask_id = Uuid::new_v4();

    task.add_subtask(subtask_id);
    task.add_subtask(subtask_id);

    assert_eq!(task.subtasks.len(), 1);
}

#[test]
fn test_is_root_returns_true_when_no_parent() {
    let agent_id = Uuid::new_v4();
    let task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    assert!(task.is_root());
}

#[test]
fn test_is_root_returns_false_when_has_parent() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    task.parent = Some(Uuid::new_v4());

    assert!(!task.is_root());
}

// ============================================================================
// Timing and Duration Tests
// ============================================================================

#[test]
fn test_elapsed_seconds_returns_none_when_not_started() {
    let agent_id = Uuid::new_v4();
    let task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    assert!(task.elapsed_seconds().is_none());
}

#[test]
fn test_elapsed_seconds_returns_time_since_start() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    task.start();
    std::thread::sleep(std::time::Duration::from_millis(100));

    let elapsed = task.elapsed_seconds();
    assert!(elapsed.is_some());
    assert!(elapsed.unwrap() >= 0);
}

// ============================================================================
// Status Query Tests
// ============================================================================

#[test]
fn test_is_terminal_returns_true_for_terminal_states() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    task.status = TaskStatus::Completed;
    assert!(task.is_terminal());

    task.status = TaskStatus::Failed;
    assert!(task.is_terminal());

    task.status = TaskStatus::Cancelled;
    assert!(task.is_terminal());
}

#[test]
fn test_is_terminal_returns_false_for_active_states() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    assert!(!task.is_terminal()); // Pending

    task.status = TaskStatus::Queued;
    assert!(!task.is_terminal());

    task.status = TaskStatus::InProgress;
    assert!(!task.is_terminal());

    task.status = TaskStatus::Paused;
    assert!(!task.is_terminal());
}

// ============================================================================
// TaskStatus Tests
// ============================================================================

#[test]
fn test_task_status_is_active() {
    assert!(TaskStatus::Queued.is_active());
    assert!(TaskStatus::InProgress.is_active());
    assert!(!TaskStatus::Pending.is_active());
    assert!(!TaskStatus::Paused.is_active());
    assert!(!TaskStatus::Completed.is_active());
}

#[test]
fn test_task_status_is_terminal() {
    assert!(TaskStatus::Completed.is_terminal());
    assert!(TaskStatus::Failed.is_terminal());
    assert!(TaskStatus::Cancelled.is_terminal());
    assert!(!TaskStatus::Pending.is_terminal());
    assert!(!TaskStatus::InProgress.is_terminal());
}

#[test]
fn test_task_status_serialization() {
    let status = TaskStatus::InProgress;
    let json = serde_json::to_string(&status).unwrap();
    assert_eq!(json, "\"IN_PROGRESS\"");
}

#[test]
fn test_task_status_ordering() {
    assert!(TaskStatus::Pending < TaskStatus::Queued);
    assert!(TaskStatus::Queued < TaskStatus::InProgress);
    assert!(TaskStatus::InProgress < TaskStatus::Completed);
}

// ============================================================================
// TaskType Tests
// ============================================================================

#[test]
fn test_task_type_display_names() {
    assert_eq!(TaskType::Research.display_name(), "Research");
    assert_eq!(TaskType::CodeGeneration.display_name(), "Code Generation");
    assert_eq!(TaskType::CodeReview.display_name(), "Code Review");
    assert_eq!(TaskType::Testing.display_name(), "Testing");
    assert_eq!(
        TaskType::Custom("MyTask".to_string()).display_name(),
        "MyTask"
    );
}

#[test]
fn test_task_type_serialization() {
    let task_type = TaskType::CodeGeneration;
    let json = serde_json::to_string(&task_type).unwrap();
    assert_eq!(json, "\"code_generation\"");
}

// ============================================================================
// Priority Tests
// ============================================================================

#[test]
fn test_priority_values() {
    assert_eq!(Priority::Low.value(), 1);
    assert_eq!(Priority::Medium.value(), 2);
    assert_eq!(Priority::High.value(), 3);
    assert_eq!(Priority::Critical.value(), 4);
}

#[test]
fn test_priority_ordering() {
    assert!(Priority::Low < Priority::Medium);
    assert!(Priority::Medium < Priority::High);
    assert!(Priority::High < Priority::Critical);
}

#[test]
fn test_priority_display_names() {
    assert_eq!(Priority::Low.display_name(), "Low");
    assert_eq!(Priority::Medium.display_name(), "Medium");
    assert_eq!(Priority::High.display_name(), "High");
    assert_eq!(Priority::Critical.display_name(), "Critical");
}

#[test]
fn test_priority_serialization() {
    let priority = Priority::High;
    let json = serde_json::to_string(&priority).unwrap();
    assert_eq!(json, "\"HIGH\"");
}

// ============================================================================
// TaskError Tests
// ============================================================================

#[test]
fn test_task_error_new() {
    let error = TaskError::new("TypeError", "Invalid type");

    assert_eq!(error.error_type, "TypeError");
    assert_eq!(error.message, "Invalid type");
    assert!(error.stack_trace.is_none());
    assert!(error.recovery_action.is_none());
}

#[test]
fn test_task_error_with_stack_trace() {
    let error = TaskError::new("Error", "Message")
        .with_stack_trace("at line 42");

    assert_eq!(error.stack_trace, Some("at line 42".to_string()));
}

#[test]
fn test_task_error_with_recovery_action() {
    let error = TaskError::new("Error", "Message")
        .with_recovery_action("Retry task");

    assert_eq!(error.recovery_action, Some("Retry task".to_string()));
}

#[test]
fn test_task_error_builder_chain() {
    let error = TaskError::new("Error", "Message")
        .with_stack_trace("stack")
        .with_recovery_action("action");

    assert_eq!(error.stack_trace, Some("stack".to_string()));
    assert_eq!(error.recovery_action, Some("action".to_string()));
}

// ============================================================================
// Serialization Tests
// ============================================================================

#[test]
fn test_task_serialization_roundtrip() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test task".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );
    task.add_dependency(Uuid::new_v4());
    task.start();

    let json = serde_json::to_string(&task).unwrap();
    let deserialized: Task = serde_json::from_str(&json).unwrap();

    assert_eq!(task.id, deserialized.id);
    assert_eq!(task.description, deserialized.description);
    assert_eq!(task.status, deserialized.status);
    assert_eq!(task.dependencies.len(), deserialized.dependencies.len());
}

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

#[test]
fn test_task_lifecycle_full_workflow() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Complete workflow".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    // Start
    task.start();
    assert_eq!(task.status, TaskStatus::InProgress);
    assert!(task.started_at.is_some());

    // Progress
    task.update_progress(50);
    assert_eq!(task.progress, 50);

    // Complete
    let result = serde_json::json!({"success": true});
    task.complete(Some(result));
    assert_eq!(task.status, TaskStatus::Completed);
    assert_eq!(task.progress, 100);
    assert!(task.completed_at.is_some());
    assert!(task.actual_duration.is_some());
}

#[test]
fn test_complex_dependency_chain() {
    let agent_id = Uuid::new_v4();
    let mut task = Task::new(
        "Test".to_string(),
        TaskType::CodeGeneration,
        agent_id,
        Priority::High,
    );

    let dep1 = Uuid::new_v4();
    let dep2 = Uuid::new_v4();
    let dep3 = Uuid::new_v4();

    task.add_dependency(dep1);
    task.add_dependency(dep2);
    task.add_dependency(dep3);

    assert!(!task.can_start(&vec![dep1]));
    assert!(!task.can_start(&vec![dep1, dep2]));
    assert!(task.can_start(&vec![dep1, dep2, dep3]));
}

#[test]
fn test_task_with_empty_description() {
    let agent_id = Uuid::new_v4();
    let task = Task::new(
        String::new(),
        TaskType::Research,
        agent_id,
        Priority::Low,
    );

    assert_eq!(task.description, "");
}
