/// Agent domain model and related types

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use super::ClusterId;

/// Unique identifier for an agent
pub type AgentId = Uuid;

/// Represents an AI agent in the orchestration system
///
/// An agent is an autonomous entity that can execute tasks, communicate
/// with other agents, and maintain its own state. Agents can be organized
/// hierarchically (parent-child) or in clusters.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Agent {
    /// Unique identifier
    pub id: AgentId,

    /// Agent role/type (determines capabilities)
    pub role: AgentRole,

    /// Human-readable name
    pub name: String,

    /// Current execution status
    pub status: AgentStatus,

    /// Framework this agent belongs to
    pub framework: Framework,

    /// List of agent capabilities
    pub capabilities: Vec<String>,

    /// Parent agent ID (for hierarchical topologies)
    pub parent: Option<AgentId>,

    /// Child agent IDs
    pub children: Vec<AgentId>,

    /// Cluster/group membership
    pub cluster: Option<ClusterId>,

    /// Performance metrics
    pub metrics: AgentMetrics,

    /// Configuration key-value pairs
    pub config: HashMap<String, serde_json::Value>,

    /// Creation timestamp
    pub created_at: DateTime<Utc>,

    /// Last activity timestamp
    pub updated_at: DateTime<Utc>,
}

impl Agent {
    /// Create a new agent with the given role and name
    pub fn new(role: AgentRole, name: String, framework: Framework) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            role,
            name,
            status: AgentStatus::Idle,
            framework,
            capabilities: Vec::new(),
            parent: None,
            children: Vec::new(),
            cluster: None,
            metrics: AgentMetrics::default(),
            config: HashMap::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Add a capability to this agent
    pub fn add_capability(&mut self, capability: impl Into<String>) {
        self.capabilities.push(capability.into());
    }

    /// Check if agent has a specific capability
    pub fn has_capability(&self, capability: &str) -> bool {
        self.capabilities.iter().any(|c| c == capability)
    }

    /// Set the parent agent
    pub fn set_parent(&mut self, parent_id: AgentId) {
        self.parent = Some(parent_id);
    }

    /// Add a child agent
    pub fn add_child(&mut self, child_id: AgentId) {
        if !self.children.contains(&child_id) {
            self.children.push(child_id);
        }
    }

    /// Update the agent's status
    pub fn set_status(&mut self, status: AgentStatus) {
        self.status = status;
        self.updated_at = Utc::now();
    }

    /// Check if the agent is currently active
    pub fn is_active(&self) -> bool {
        matches!(self.status, AgentStatus::Running | AgentStatus::Waiting)
    }

    /// Check if the agent is a root agent (no parent)
    pub fn is_root(&self) -> bool {
        self.parent.is_none()
    }

    /// Check if the agent has children
    pub fn has_children(&self) -> bool {
        !self.children.is_empty()
    }
}

/// Agent role/type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum AgentRole {
    // Core coordination roles
    Coordinator,
    Planner,
    Monitor,

    // Development roles
    Researcher,
    Coder,
    Tester,
    Reviewer,

    // Specialized roles
    Architect,
    Optimizer,
    Summarizer,
    Guardrails,
    Memory,

    // Framework-specific or custom roles
    Custom(String),
}

impl AgentRole {
    /// Get a display name for the role
    pub fn display_name(&self) -> &str {
        match self {
            Self::Coordinator => "Coordinator",
            Self::Planner => "Planner",
            Self::Monitor => "Monitor",
            Self::Researcher => "Researcher",
            Self::Coder => "Coder",
            Self::Tester => "Tester",
            Self::Reviewer => "Reviewer",
            Self::Architect => "Architect",
            Self::Optimizer => "Optimizer",
            Self::Summarizer => "Summarizer",
            Self::Guardrails => "Guardrails",
            Self::Memory => "Memory",
            Self::Custom(name) => name,
        }
    }
}

/// Agent execution status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AgentStatus {
    /// Agent is idle, waiting for tasks
    Idle,

    /// Agent is actively executing a task
    Running,

    /// Agent is waiting for dependencies or resources
    Waiting,

    /// Agent is temporarily paused
    Paused,

    /// Agent has completed all assigned tasks
    Completed,

    /// Agent encountered an error and stopped
    Failed,

    /// Agent was explicitly terminated
    Terminated,
}

impl AgentStatus {
    /// Check if the status represents an active state
    pub fn is_active(&self) -> bool {
        matches!(self, Self::Running | Self::Waiting)
    }

    /// Check if the status represents a terminal state
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Failed | Self::Terminated)
    }
}

/// Framework identifier
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "kebab-case")]
pub enum Framework {
    ClaudeFlow,
    AutoGen,
    LangGraph,
    CrewAI,
    OpenCode,
    Custom(String),
}

impl Framework {
    /// Get a display name for the framework
    pub fn display_name(&self) -> &str {
        match self {
            Self::ClaudeFlow => "Claude Flow",
            Self::AutoGen => "AutoGen",
            Self::LangGraph => "LangGraph",
            Self::CrewAI => "CrewAI",
            Self::OpenCode => "OpenCode",
            Self::Custom(name) => name,
        }
    }
}

/// Agent performance metrics
///
/// Tracks various performance indicators for an agent including
/// resource usage, task completion, and activity levels.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AgentMetrics {
    /// Total tokens consumed by this agent
    pub tokens_used: u64,

    /// Estimated cost in USD
    pub cost: f64,

    /// Average response latency in milliseconds
    pub avg_latency_ms: f64,

    /// Number of tasks successfully completed
    pub tasks_completed: u32,

    /// Number of tasks that failed
    pub tasks_failed: u32,

    /// Current number of tasks in queue
    pub queue_depth: usize,

    /// Total error count
    pub errors: u32,

    /// "Heat" score representing activity intensity (0-100)
    pub heat: u8,

    /// Experience points (for gamification)
    pub xp: u64,
}

impl AgentMetrics {
    /// Create new metrics with all values at zero
    pub fn new() -> Self {
        Self::default()
    }

    /// Calculate success rate (0.0 to 1.0)
    pub fn success_rate(&self) -> f64 {
        let total = self.tasks_completed + self.tasks_failed;
        if total == 0 {
            1.0
        } else {
            self.tasks_completed as f64 / total as f64
        }
    }

    /// Record a completed task
    pub fn record_completion(&mut self, tokens: u64, latency_ms: f64, cost: f64) {
        self.tasks_completed += 1;
        self.tokens_used += tokens;
        self.cost += cost;

        // Update running average for latency
        let total_tasks = self.tasks_completed + self.tasks_failed;
        self.avg_latency_ms = (self.avg_latency_ms * (total_tasks - 1) as f64 + latency_ms)
            / total_tasks as f64;

        // Update heat based on activity
        self.heat = (self.heat as f64 * 0.9 + 10.0).min(100.0) as u8;

        // Award XP
        self.xp += (tokens / 100) + 10; // Base 10 XP + bonus for tokens
    }

    /// Record a failed task
    pub fn record_failure(&mut self) {
        self.tasks_failed += 1;
        self.errors += 1;
        self.heat = (self.heat as f64 * 0.95 + 5.0).min(100.0) as u8;
    }

    /// Decay heat over time (call periodically)
    pub fn decay_heat(&mut self) {
        self.heat = (self.heat as f64 * 0.95).max(0.0) as u8;
    }
}

impl Default for AgentMetrics {
    fn default() -> Self {
        Self {
            tokens_used: 0,
            cost: 0.0,
            avg_latency_ms: 0.0,
            tasks_completed: 0,
            tasks_failed: 0,
            queue_depth: 0,
            errors: 0,
            heat: 0,
            xp: 0,
        }
    }
}
