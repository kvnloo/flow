/// Session domain model and related types

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use super::{Agent, AgentId, MetricsSnapshot, Task, TaskId};

/// Unique identifier for a session
pub type SessionId = Uuid;

/// Represents an orchestration session
///
/// A session is a complete execution context that contains all agents,
/// tasks, configuration, and accumulated metrics for a workflow.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Session {
    /// Unique identifier
    pub id: SessionId,

    /// Human-readable session name
    pub name: String,

    /// Session type/purpose
    pub session_type: SessionType,

    /// Current session status
    pub status: SessionStatus,

    /// All agents in this session
    pub agents: HashMap<AgentId, Agent>,

    /// All tasks in this session
    pub tasks: HashMap<TaskId, Task>,

    /// Session configuration
    pub config: SessionConfig,

    /// Accumulated session metrics
    pub metrics: MetricsSnapshot,

    /// Session start timestamp
    pub started_at: DateTime<Utc>,

    /// Session end timestamp (if completed)
    pub ended_at: Option<DateTime<Utc>>,
}

impl Session {
    /// Create a new session with the given name and configuration
    pub fn new(name: String, session_type: SessionType, config: SessionConfig) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name,
            session_type,
            status: SessionStatus::Active,
            agents: HashMap::new(),
            tasks: HashMap::new(),
            config,
            metrics: MetricsSnapshot::new(now),
            started_at: now,
            ended_at: None,
        }
    }

    /// Get the number of agents in this session
    pub fn agent_count(&self) -> usize {
        self.agents.len()
    }

    /// Get the number of tasks in this session
    pub fn task_count(&self) -> usize {
        self.tasks.len()
    }

    /// Get the session duration in seconds
    pub fn duration_seconds(&self) -> i64 {
        let end = self.ended_at.unwrap_or_else(Utc::now);
        end.signed_duration_since(self.started_at).num_seconds()
    }

    /// Check if the session is active
    pub fn is_active(&self) -> bool {
        self.status == SessionStatus::Active
    }

    /// Check if the session is complete
    pub fn is_complete(&self) -> bool {
        matches!(
            self.status,
            SessionStatus::Completed | SessionStatus::Failed | SessionStatus::Terminated
        )
    }

    /// Pause the session
    pub fn pause(&mut self) {
        if self.status == SessionStatus::Active {
            self.status = SessionStatus::Paused;
        }
    }

    /// Resume the session
    pub fn resume(&mut self) {
        if self.status == SessionStatus::Paused {
            self.status = SessionStatus::Active;
        }
    }

    /// End the session
    pub fn end(&mut self, status: SessionStatus) {
        self.status = status;
        self.ended_at = Some(Utc::now());
        self.metrics.end_time = Utc::now();
    }

    /// Get all active agents
    pub fn active_agents(&self) -> Vec<&Agent> {
        self.agents.values().filter(|a| a.is_active()).collect()
    }

    /// Get all active tasks
    pub fn active_tasks(&self) -> Vec<&Task> {
        self.tasks.values().filter(|t| t.status.is_active()).collect()
    }

    /// Check if cost limit has been exceeded
    pub fn is_over_cost_limit(&self) -> bool {
        if let Some(limit) = self.config.cost_limit {
            self.metrics.total_cost >= limit
        } else {
            false
        }
    }

    /// Check if time limit has been exceeded
    pub fn is_over_time_limit(&self) -> bool {
        if let Some(limit) = self.config.time_limit {
            self.duration_seconds() >= limit as i64
        } else {
            false
        }
    }
}

/// Session type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SessionType {
    Development,
    Research,
    Testing,
    Orchestration,
    Custom(String),
}

impl SessionType {
    /// Get a display name for the session type
    pub fn display_name(&self) -> &str {
        match self {
            Self::Development => "Development",
            Self::Research => "Research",
            Self::Testing => "Testing",
            Self::Orchestration => "Orchestration",
            Self::Custom(name) => name,
        }
    }
}

/// Session status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SessionStatus {
    /// Session is actively running
    Active,

    /// Session is temporarily paused
    Paused,

    /// Session completed successfully
    Completed,

    /// Session ended due to failure
    Failed,

    /// Session was explicitly terminated
    Terminated,
}

impl SessionStatus {
    /// Check if the status represents an active state
    pub fn is_active(&self) -> bool {
        matches!(self, Self::Active | Self::Paused)
    }

    /// Check if the status represents a terminal state
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Failed | Self::Terminated)
    }
}

/// Session configuration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SessionConfig {
    /// Model to use for LLM calls
    pub model: String,

    /// Maximum number of agents allowed
    pub max_agents: usize,

    /// Cost limit in USD (None = unlimited)
    pub cost_limit: Option<f64>,

    /// Time limit in seconds (None = unlimited)
    pub time_limit: Option<u64>,

    /// Auto-save interval in seconds
    pub autosave_interval: u64,

    /// Additional custom settings
    pub settings: HashMap<String, serde_json::Value>,
}

impl SessionConfig {
    /// Create a new configuration with default values
    pub fn new(model: String) -> Self {
        Self {
            model,
            max_agents: 10,
            cost_limit: None,
            time_limit: None,
            autosave_interval: 300, // 5 minutes
            settings: HashMap::new(),
        }
    }

    /// Set the maximum number of agents
    pub fn with_max_agents(mut self, max: usize) -> Self {
        self.max_agents = max;
        self
    }

    /// Set the cost limit
    pub fn with_cost_limit(mut self, limit: f64) -> Self {
        self.cost_limit = Some(limit);
        self
    }

    /// Set the time limit
    pub fn with_time_limit(mut self, limit: u64) -> Self {
        self.time_limit = Some(limit);
        self
    }

    /// Set the auto-save interval
    pub fn with_autosave_interval(mut self, interval: u64) -> Self {
        self.autosave_interval = interval;
        self
    }

    /// Add a custom setting
    pub fn with_setting(mut self, key: String, value: serde_json::Value) -> Self {
        self.settings.insert(key, value);
        self
    }
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self::new("claude-3-5-sonnet-20241022".to_string())
    }
}
