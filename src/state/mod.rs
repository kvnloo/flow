/// State management module for Flow Orchestrator TUI
///
/// This module provides thread-safe state management for:
/// - Agents and their hierarchical relationships
/// - Tasks and their dependency graphs
/// - Sessions and their lifecycle
/// - Metrics and performance tracking
/// - Agent network topology

pub mod agent;
pub mod graph;
pub mod metrics;
pub mod session;
pub mod task;

use std::sync::{Arc, RwLock};

pub use agent::{Agent, AgentId, AgentMetrics, AgentRole, AgentStatus};
pub use graph::{AgentGraph, Cluster, ClusterId, ClusterType, Topology};
pub use metrics::{MetricPoint, MetricType, MetricsHistory, MetricsSnapshot};
pub use session::{Session, SessionConfig, SessionId, SessionStatus, SessionType};
pub use task::{Priority, Task, TaskError, TaskId, TaskStatus, TaskType};

use chrono::Utc;

/// Global application state manager
///
/// This is the central state container that holds all application state
/// in thread-safe wrappers (`Arc<RwLock<T>>`). Components can clone the
/// Arc pointers to access state from different threads.
#[derive(Debug, Clone)]
pub struct StateManager {
    /// Current active session
    pub session: Arc<RwLock<Option<Session>>>,

    /// Agent network graph
    pub agent_graph: Arc<RwLock<AgentGraph>>,

    /// Metrics history (time-series data)
    pub metrics_history: Arc<RwLock<MetricsHistory>>,
}

impl StateManager {
    /// Create a new state manager with empty state
    pub fn new() -> Self {
        Self {
            session: Arc::new(RwLock::new(None)),
            agent_graph: Arc::new(RwLock::new(AgentGraph::new())),
            metrics_history: Arc::new(RwLock::new(MetricsHistory::new())),
        }
    }

    /// Initialize a new session
    pub fn start_session(&self, session: Session) {
        *self.session.write().unwrap() = Some(session);
    }

    /// Get the current session ID if there is an active session
    pub fn current_session_id(&self) -> Option<SessionId> {
        self.session.read().unwrap().as_ref().map(|s| s.id)
    }

    /// Check if there is an active session
    pub fn has_active_session(&self) -> bool {
        self.session.read().unwrap().is_some()
    }

    /// End the current session
    pub fn end_session(&self) {
        if let Some(session) = self.session.write().unwrap().as_mut() {
            session.ended_at = Some(Utc::now());
            session.status = SessionStatus::Completed;
        }
    }

    /// Add an agent to the current session and agent graph
    pub fn add_agent(&self, agent: Agent) -> Result<(), StateError> {
        // Add to agent graph
        self.agent_graph.write().unwrap().add_agent(agent.clone());

        // Add to session
        if let Some(session) = self.session.write().unwrap().as_mut() {
            session.agents.insert(agent.id, agent);
            Ok(())
        } else {
            Err(StateError::NoActiveSession)
        }
    }

    /// Add a task to the current session
    pub fn add_task(&self, task: Task) -> Result<(), StateError> {
        if let Some(session) = self.session.write().unwrap().as_mut() {
            session.tasks.insert(task.id, task);
            Ok(())
        } else {
            Err(StateError::NoActiveSession)
        }
    }

    /// Update an agent's status
    pub fn update_agent_status(
        &self,
        agent_id: AgentId,
        status: AgentStatus,
    ) -> Result<(), StateError> {
        if let Some(session) = self.session.write().unwrap().as_mut() {
            if let Some(agent) = session.agents.get_mut(&agent_id) {
                agent.status = status;
                agent.updated_at = Utc::now();
                Ok(())
            } else {
                Err(StateError::AgentNotFound(agent_id))
            }
        } else {
            Err(StateError::NoActiveSession)
        }
    }

    /// Update a task's progress
    pub fn update_task_progress(
        &self,
        task_id: TaskId,
        progress: u8,
        status: TaskStatus,
    ) -> Result<(), StateError> {
        if let Some(session) = self.session.write().unwrap().as_mut() {
            if let Some(task) = session.tasks.get_mut(&task_id) {
                task.progress = progress.min(100);
                task.status = status;

                // Set timestamps based on status
                match status {
                    TaskStatus::InProgress if task.started_at.is_none() => {
                        task.started_at = Some(Utc::now());
                    }
                    TaskStatus::Completed | TaskStatus::Failed | TaskStatus::Cancelled => {
                        task.completed_at = Some(Utc::now());
                    }
                    _ => {}
                }

                Ok(())
            } else {
                Err(StateError::TaskNotFound(task_id))
            }
        } else {
            Err(StateError::NoActiveSession)
        }
    }

    /// Record a metric point
    pub fn record_metric(&self, point: MetricPoint) {
        self.metrics_history.write().unwrap().record(point);
    }

    /// Get a snapshot of current metrics
    pub fn get_metrics_snapshot(&self) -> Option<MetricsSnapshot> {
        self.session
            .read()
            .unwrap()
            .as_ref()
            .map(|s| s.metrics.clone())
    }
}

impl Default for StateManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Errors that can occur during state operations
#[derive(Debug, thiserror::Error)]
pub enum StateError {
    #[error("No active session")]
    NoActiveSession,

    #[error("Agent not found: {0}")]
    AgentNotFound(AgentId),

    #[error("Task not found: {0}")]
    TaskNotFound(TaskId),

    #[error("Invalid state transition")]
    InvalidStateTransition,
}
