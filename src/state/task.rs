/// Task domain model and related types

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::AgentId;

/// Unique identifier for a task
pub type TaskId = Uuid;

/// Unique identifier for a milestone
pub type MilestoneId = Uuid;

/// Represents a task assigned to an agent
///
/// Tasks are units of work that agents execute. They can have dependencies
/// on other tasks, be organized into subtasks, and belong to milestones.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Task {
    /// Unique identifier
    pub id: TaskId,

    /// Human-readable description
    pub description: String,

    /// Task type/category
    pub task_type: TaskType,

    /// Current execution status
    pub status: TaskStatus,

    /// Progress percentage (0-100)
    pub progress: u8,

    /// Agent assigned to this task
    pub assigned_agent: AgentId,

    /// Priority level
    pub priority: Priority,

    /// Task IDs this task depends on
    pub dependencies: Vec<TaskId>,

    /// Parent task ID (for subtasks)
    pub parent: Option<TaskId>,

    /// Subtask IDs
    pub subtasks: Vec<TaskId>,

    /// Milestone this task belongs to
    pub milestone: Option<MilestoneId>,

    /// Estimated duration in seconds
    pub estimated_duration: Option<u64>,

    /// Actual duration in seconds (when completed)
    pub actual_duration: Option<u64>,

    /// Result data (populated on completion)
    pub result: Option<serde_json::Value>,

    /// Error details (populated on failure)
    pub error: Option<TaskError>,

    /// Creation timestamp
    pub created_at: DateTime<Utc>,

    /// Start timestamp (when execution began)
    pub started_at: Option<DateTime<Utc>>,

    /// Completion timestamp
    pub completed_at: Option<DateTime<Utc>>,
}

impl Task {
    /// Create a new task with the given description and assigned agent
    pub fn new(
        description: String,
        task_type: TaskType,
        assigned_agent: AgentId,
        priority: Priority,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            description,
            task_type,
            status: TaskStatus::Pending,
            progress: 0,
            assigned_agent,
            priority,
            dependencies: Vec::new(),
            parent: None,
            subtasks: Vec::new(),
            milestone: None,
            estimated_duration: None,
            actual_duration: None,
            result: None,
            error: None,
            created_at: Utc::now(),
            started_at: None,
            completed_at: None,
        }
    }

    /// Start the task execution
    pub fn start(&mut self) {
        if self.started_at.is_none() {
            self.started_at = Some(Utc::now());
        }
        self.status = TaskStatus::InProgress;
    }

    /// Update task progress
    pub fn update_progress(&mut self, progress: u8) {
        self.progress = progress.min(100);
    }

    /// Complete the task successfully
    pub fn complete(&mut self, result: Option<serde_json::Value>) {
        let now = Utc::now();
        self.status = TaskStatus::Completed;
        self.progress = 100;
        self.completed_at = Some(now);
        self.result = result;

        // Calculate actual duration
        if let Some(started) = self.started_at {
            let duration = now.signed_duration_since(started);
            self.actual_duration = Some(duration.num_seconds() as u64);
        }
    }

    /// Mark the task as failed
    pub fn fail(&mut self, error: TaskError) {
        let now = Utc::now();
        self.status = TaskStatus::Failed;
        self.completed_at = Some(now);
        self.error = Some(error);

        // Calculate actual duration
        if let Some(started) = self.started_at {
            let duration = now.signed_duration_since(started);
            self.actual_duration = Some(duration.num_seconds() as u64);
        }
    }

    /// Check if the task is in a terminal state
    pub fn is_terminal(&self) -> bool {
        self.status.is_terminal()
    }

    /// Check if the task can be started (all dependencies met)
    pub fn can_start(&self, completed_tasks: &[TaskId]) -> bool {
        self.status == TaskStatus::Pending
            && self.dependencies.iter().all(|dep| completed_tasks.contains(dep))
    }

    /// Add a dependency
    pub fn add_dependency(&mut self, task_id: TaskId) {
        if !self.dependencies.contains(&task_id) {
            self.dependencies.push(task_id);
        }
    }

    /// Add a subtask
    pub fn add_subtask(&mut self, task_id: TaskId) {
        if !self.subtasks.contains(&task_id) {
            self.subtasks.push(task_id);
        }
    }

    /// Check if this is a root task (no parent)
    pub fn is_root(&self) -> bool {
        self.parent.is_none()
    }

    /// Get elapsed time since task started (if running)
    pub fn elapsed_seconds(&self) -> Option<i64> {
        self.started_at.map(|started| {
            Utc::now().signed_duration_since(started).num_seconds()
        })
    }
}

/// Task type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum TaskType {
    Research,
    CodeGeneration,
    CodeReview,
    Testing,
    Planning,
    Analysis,
    Optimization,
    Documentation,
    Custom(String),
}

impl TaskType {
    /// Get a display name for the task type
    pub fn display_name(&self) -> &str {
        match self {
            Self::Research => "Research",
            Self::CodeGeneration => "Code Generation",
            Self::CodeReview => "Code Review",
            Self::Testing => "Testing",
            Self::Planning => "Planning",
            Self::Analysis => "Analysis",
            Self::Optimization => "Optimization",
            Self::Documentation => "Documentation",
            Self::Custom(name) => name,
        }
    }
}

/// Task execution status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskStatus {
    /// Task is pending, waiting to be queued
    Pending,

    /// Task is queued for execution
    Queued,

    /// Task is currently being executed
    InProgress,

    /// Task execution is paused
    Paused,

    /// Task completed successfully
    Completed,

    /// Task failed with an error
    Failed,

    /// Task was cancelled
    Cancelled,
}

impl TaskStatus {
    /// Check if the status represents an active state
    pub fn is_active(&self) -> bool {
        matches!(self, Self::Queued | Self::InProgress)
    }

    /// Check if the status represents a terminal state
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Failed | Self::Cancelled)
    }
}

/// Task priority levels
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

impl Priority {
    /// Get a numeric value for the priority (higher = more important)
    pub fn value(&self) -> u8 {
        match self {
            Self::Low => 1,
            Self::Medium => 2,
            Self::High => 3,
            Self::Critical => 4,
        }
    }

    /// Get a display name for the priority
    pub fn display_name(&self) -> &str {
        match self {
            Self::Low => "Low",
            Self::Medium => "Medium",
            Self::High => "High",
            Self::Critical => "Critical",
        }
    }
}

/// Error information for failed tasks
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TaskError {
    /// Error type/category
    pub error_type: String,

    /// Error message
    pub message: String,

    /// Optional stack trace
    pub stack_trace: Option<String>,

    /// Suggested recovery action
    pub recovery_action: Option<String>,
}

impl TaskError {
    /// Create a new task error
    pub fn new(error_type: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            error_type: error_type.into(),
            message: message.into(),
            stack_trace: None,
            recovery_action: None,
        }
    }

    /// Add a stack trace
    pub fn with_stack_trace(mut self, stack_trace: impl Into<String>) -> Self {
        self.stack_trace = Some(stack_trace.into());
        self
    }

    /// Add a recovery action
    pub fn with_recovery_action(mut self, action: impl Into<String>) -> Self {
        self.recovery_action = Some(action.into());
        self
    }
}
