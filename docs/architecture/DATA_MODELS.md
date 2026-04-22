# Data Models & State Management Architecture

**Project**: Flow Orchestrator TUI
**Version**: 1.0.0
**Date**: 2025-11-25

## Table of Contents

1. [Domain Model Overview](#domain-model-overview)
2. [Core Domain Models](#core-domain-models)
3. [State Management](#state-management)
4. [Event System](#event-system)
5. [Serialization Schema](#serialization-schema)
6. [Database Schema](#database-schema)
7. [Type Relationships](#type-relationships)

---

## Domain Model Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application State                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Session   │  │ Dashboard  │  │   Config   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Agent Domain │   │ Task Domain  │   │  Event Bus   │
│              │   │              │   │              │
│ • Agent      │   │ • Task       │   │ • Event      │
│ • AgentTree  │   │ • TaskGraph  │   │ • EventLog   │
│ • Cluster    │   │ • Dependency │   │ • Filter     │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                    ┌──────────────┐
                    │   Metrics    │
                    │              │
                    │ • Tokens     │
                    │ • Cost       │
                    │ • Latency    │
                    │ • Performance│
                    └──────────────┘
```

---

## Core Domain Models

### 1. Agent

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Represents an AI agent in the orchestration system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Agent {
    /// Unique identifier
    pub id: AgentId,

    /// Agent type/role
    pub agent_type: AgentType,

    /// Human-readable name
    pub name: String,

    /// Current status
    pub status: AgentStatus,

    /// Framework this agent belongs to
    pub framework: Framework,

    /// Agent capabilities
    pub capabilities: Vec<String>,

    /// Parent agent (for hierarchical topologies)
    pub parent: Option<AgentId>,

    /// Child agents
    pub children: Vec<AgentId>,

    /// Cluster/group membership
    pub cluster: Option<ClusterId>,

    /// Performance metrics
    pub metrics: AgentMetrics,

    /// Configuration
    pub config: HashMap<String, serde_json::Value>,

    /// Creation timestamp
    pub created_at: DateTime<Utc>,

    /// Last activity timestamp
    pub updated_at: DateTime<Utc>,
}

/// Agent identifier (UUID)
pub type AgentId = Uuid;

/// Agent type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum AgentType {
    // Core roles
    Coordinator,
    Planner,
    Researcher,
    Coder,
    Tester,
    Reviewer,

    // Specialized roles
    Architect,
    Optimizer,
    Monitor,
    Summarizer,
    Guardrails,
    Memory,

    // Framework-specific
    Custom(String),
}

/// Agent status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AgentStatus {
    Idle,
    Running,
    Waiting,
    Paused,
    Completed,
    Failed,
    Terminated,
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

/// Agent performance metrics
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AgentMetrics {
    /// Total tokens consumed
    pub tokens_used: u64,

    /// Estimated cost in USD
    pub cost: f64,

    /// Average response latency (ms)
    pub avg_latency_ms: f64,

    /// Number of tasks completed
    pub tasks_completed: u32,

    /// Number of tasks failed
    pub tasks_failed: u32,

    /// Current queue depth
    pub queue_depth: usize,

    /// Error count
    pub errors: u32,

    /// "Heat" score (activity intensity 0-100)
    pub heat: u8,

    /// Experience points (for gamification)
    pub xp: u64,
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
```

### 2. Task

```rust
/// Represents a task assigned to an agent
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Task {
    /// Unique identifier
    pub id: TaskId,

    /// Human-readable description
    pub description: String,

    /// Task type/category
    pub task_type: TaskType,

    /// Current status
    pub status: TaskStatus,

    /// Progress percentage (0-100)
    pub progress: u8,

    /// Assigned agent
    pub assigned_agent: AgentId,

    /// Priority level
    pub priority: Priority,

    /// Task dependencies
    pub dependencies: Vec<TaskId>,

    /// Parent task (for subtasks)
    pub parent: Option<TaskId>,

    /// Subtasks
    pub subtasks: Vec<TaskId>,

    /// Milestone/stage this belongs to
    pub milestone: Option<MilestoneId>,

    /// Estimated duration (seconds)
    pub estimated_duration: Option<u64>,

    /// Actual duration (seconds)
    pub actual_duration: Option<u64>,

    /// Result data (when completed)
    pub result: Option<serde_json::Value>,

    /// Error details (when failed)
    pub error: Option<TaskError>,

    /// Creation timestamp
    pub created_at: DateTime<Utc>,

    /// Started timestamp
    pub started_at: Option<DateTime<Utc>>,

    /// Completed timestamp
    pub completed_at: Option<DateTime<Utc>>,
}

pub type TaskId = Uuid;
pub type MilestoneId = Uuid;

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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskStatus {
    Pending,
    Queued,
    InProgress,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TaskError {
    pub error_type: String,
    pub message: String,
    pub stack_trace: Option<String>,
    pub recovery_action: Option<String>,
}
```

### 3. Message

```rust
/// Message passed between agents or from system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Message {
    /// Unique identifier
    pub id: MessageId,

    /// Sender agent (None for system messages)
    pub from: Option<AgentId>,

    /// Recipient agent (None for broadcast)
    pub to: Option<AgentId>,

    /// Message type
    pub message_type: MessageType,

    /// Message content
    pub content: MessageContent,

    /// Related task (if applicable)
    pub task_id: Option<TaskId>,

    /// Timestamp
    pub timestamp: DateTime<Utc>,

    /// Trace ID for distributed tracing
    pub trace_id: Option<String>,
}

pub type MessageId = Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    TaskAssignment,
    TaskResult,
    Query,
    Response,
    Notification,
    HandoffRequest,
    HandoffAccept,
    Error,
    Status,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum MessageContent {
    Text(String),
    Structured(serde_json::Value),
}
```

### 4. Metric

```rust
/// Time-series metric data point
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MetricPoint {
    /// Timestamp
    pub timestamp: DateTime<Utc>,

    /// Metric type
    pub metric_type: MetricType,

    /// Value
    pub value: f64,

    /// Agent this metric belongs to (None for system-wide)
    pub agent_id: Option<AgentId>,

    /// Additional labels
    pub labels: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum MetricType {
    TokensUsed,
    Cost,
    Latency,
    QueueDepth,
    ErrorRate,
    TaskCompletionRate,
    Heat,
    Custom(String),
}

/// Aggregated metrics for a time window
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MetricsSnapshot {
    /// Start of time window
    pub start_time: DateTime<Utc>,

    /// End of time window
    pub end_time: DateTime<Utc>,

    /// Total tokens across all agents
    pub total_tokens: u64,

    /// Total cost
    pub total_cost: f64,

    /// Average latency
    pub avg_latency_ms: f64,

    /// Peak queue depth
    pub peak_queue_depth: usize,

    /// Per-agent metrics
    pub agent_metrics: HashMap<AgentId, AgentMetrics>,

    /// Error count
    pub total_errors: u32,
}
```

### 5. Session

```rust
/// Orchestration session
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Session {
    /// Unique identifier
    pub id: SessionId,

    /// Human-readable name
    pub name: String,

    /// Session type/purpose
    pub session_type: SessionType,

    /// Current status
    pub status: SessionStatus,

    /// All agents in this session
    pub agents: HashMap<AgentId, Agent>,

    /// All tasks in this session
    pub tasks: HashMap<TaskId, Task>,

    /// All milestones/stages
    pub milestones: Vec<Milestone>,

    /// Current active milestone
    pub active_milestone: Option<MilestoneId>,

    /// Session configuration
    pub config: SessionConfig,

    /// Accumulated metrics
    pub metrics: MetricsSnapshot,

    /// Start time
    pub started_at: DateTime<Utc>,

    /// End time (if completed)
    pub ended_at: Option<DateTime<Utc>>,
}

pub type SessionId = Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SessionType {
    Development,
    Research,
    Testing,
    Orchestration,
    Custom(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SessionStatus {
    Active,
    Paused,
    Completed,
    Failed,
    Terminated,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SessionConfig {
    /// Model to use
    pub model: String,

    /// Maximum agents
    pub max_agents: usize,

    /// Cost limit (USD)
    pub cost_limit: Option<f64>,

    /// Time limit (seconds)
    pub time_limit: Option<u64>,

    /// Auto-save interval (seconds)
    pub autosave_interval: u64,

    /// Additional settings
    pub settings: HashMap<String, serde_json::Value>,
}
```

### 6. Milestone

```rust
/// Project milestone or stage
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Milestone {
    /// Unique identifier
    pub id: MilestoneId,

    /// Human-readable name
    pub name: String,

    /// Description/goals
    pub description: String,

    /// Status
    pub status: MilestoneStatus,

    /// Progress (0-100)
    pub progress: u8,

    /// Associated tasks
    pub tasks: Vec<TaskId>,

    /// Dependencies (other milestones)
    pub dependencies: Vec<MilestoneId>,

    /// Parent milestone (for sub-stages)
    pub parent: Option<MilestoneId>,

    /// Sub-milestones
    pub substages: Vec<MilestoneId>,

    /// Estimated time to completion
    pub eta: Option<Duration>,

    /// Risk level
    pub risk: RiskLevel,

    /// Blockers
    pub blockers: Vec<String>,

    /// Creation timestamp
    pub created_at: DateTime<Utc>,

    /// Completion timestamp
    pub completed_at: Option<DateTime<Utc>>,
}

use std::time::Duration;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MilestoneStatus {
    Pending,
    InProgress,
    OnHold,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}
```

### 7. Cluster

```rust
/// Agent cluster/group
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Cluster {
    /// Unique identifier
    pub id: ClusterId,

    /// Cluster name
    pub name: String,

    /// Cluster type
    pub cluster_type: ClusterType,

    /// Member agents
    pub members: Vec<AgentId>,

    /// Topology within cluster
    pub topology: Topology,

    /// Cluster metadata
    pub metadata: HashMap<String, String>,
}

pub type ClusterId = Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ClusterType {
    Backend,
    Frontend,
    Research,
    Testing,
    Custom(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Topology {
    Hierarchical,
    Mesh,
    Ring,
    Star,
    Adaptive,
}
```

---

## State Management

### Application State

```rust
use std::sync::{Arc, RwLock};

/// Global application state
#[derive(Debug)]
pub struct AppState {
    /// Current session
    pub session: Arc<RwLock<Option<Session>>>,

    /// Dashboard state
    pub dashboard: Arc<RwLock<DashboardState>>,

    /// Agent graph/tree
    pub agent_graph: Arc<RwLock<AgentGraph>>,

    /// Event log buffer
    pub event_log: Arc<RwLock<EventLog>>,

    /// Metrics history
    pub metrics_history: Arc<RwLock<MetricsHistory>>,

    /// UI configuration
    pub ui_config: Arc<RwLock<UiConfig>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            session: Arc::new(RwLock::new(None)),
            dashboard: Arc::new(RwLock::new(DashboardState::default())),
            agent_graph: Arc::new(RwLock::new(AgentGraph::new())),
            event_log: Arc::new(RwLock::new(EventLog::new())),
            metrics_history: Arc::new(RwLock::new(MetricsHistory::new())),
            ui_config: Arc::new(RwLock::new(UiConfig::default())),
        }
    }
}
```

### Dashboard State

```rust
/// TUI dashboard state
#[derive(Debug, Clone, Default)]
pub struct DashboardState {
    /// Currently focused view
    pub active_view: DashboardView,

    /// Selected agent (for detail view)
    pub selected_agent: Option<AgentId>,

    /// Selected task (for detail view)
    pub selected_task: Option<TaskId>,

    /// Active filters
    pub filters: EventFilters,

    /// Scroll positions for various panels
    pub scroll_positions: HashMap<PanelId, usize>,

    /// Panel visibility
    pub visible_panels: Vec<PanelId>,

    /// Terminal dimensions
    pub terminal_size: (u16, u16), // (width, height)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DashboardView {
    FlowView,          // Default gamified view
    GlobalOverview,    // Agent grid + graph
    AgentFocus,        // Single agent deep dive
    ResearchMonitor,   // Research-specific view
    MetricsDashboard,  // Cost/performance view
}

impl Default for DashboardView {
    fn default() -> Self {
        Self::FlowView
    }
}

pub type PanelId = String;

#[derive(Debug, Clone, Default)]
pub struct EventFilters {
    /// Framework filters
    pub frameworks: Vec<Framework>,

    /// Event type filters
    pub event_types: Vec<EventType>,

    /// Severity filters
    pub severities: Vec<Severity>,

    /// Agent filter
    pub agent_id: Option<AgentId>,

    /// Task filter
    pub task_id: Option<TaskId>,

    /// Time range
    pub time_range: Option<TimeRange>,
}

#[derive(Debug, Clone, Copy)]
pub struct TimeRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}
```

### Agent Graph

```rust
use std::collections::{HashMap, HashSet};

/// Graph representation of agent network
#[derive(Debug, Clone)]
pub struct AgentGraph {
    /// Nodes (agents)
    nodes: HashMap<AgentId, Agent>,

    /// Edges (communication/hierarchy relationships)
    edges: HashMap<AgentId, HashSet<AgentId>>,

    /// Clusters
    clusters: HashMap<ClusterId, Cluster>,

    /// Root agents (no parents)
    roots: Vec<AgentId>,
}

impl AgentGraph {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
            edges: HashMap::new(),
            clusters: HashMap::new(),
            roots: Vec::new(),
        }
    }

    pub fn add_agent(&mut self, agent: Agent) {
        let id = agent.id;
        let is_root = agent.parent.is_none();

        self.nodes.insert(id, agent);
        self.edges.insert(id, HashSet::new());

        if is_root {
            self.roots.push(id);
        }
    }

    pub fn add_edge(&mut self, from: AgentId, to: AgentId) {
        self.edges.entry(from).or_default().insert(to);
    }

    pub fn get_agent(&self, id: &AgentId) -> Option<&Agent> {
        self.nodes.get(id)
    }

    pub fn get_children(&self, id: &AgentId) -> Vec<AgentId> {
        self.edges.get(id).map(|set| set.iter().copied().collect()).unwrap_or_default()
    }

    pub fn get_cluster_members(&self, cluster_id: &ClusterId) -> Vec<AgentId> {
        self.clusters.get(cluster_id).map(|c| c.members.clone()).unwrap_or_default()
    }
}
```

### Event Log

```rust
use std::collections::VecDeque;

/// Ring buffer for event log
#[derive(Debug, Clone)]
pub struct EventLog {
    /// Maximum capacity
    capacity: usize,

    /// Events buffer (FIFO)
    buffer: VecDeque<Event>,

    /// Total events processed (for stats)
    total_count: u64,
}

impl EventLog {
    pub fn new() -> Self {
        Self::with_capacity(10_000)
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            capacity,
            buffer: VecDeque::with_capacity(capacity),
            total_count: 0,
        }
    }

    pub fn push(&mut self, event: Event) {
        if self.buffer.len() >= self.capacity {
            self.buffer.pop_front();
        }
        self.buffer.push_back(event);
        self.total_count += 1;
    }

    pub fn iter(&self) -> impl Iterator<Item = &Event> {
        self.buffer.iter()
    }

    pub fn filter<F>(&self, predicate: F) -> Vec<&Event>
    where
        F: Fn(&Event) -> bool,
    {
        self.buffer.iter().filter(|e| predicate(e)).collect()
    }
}
```

### Metrics History

```rust
/// Time-series metrics storage
#[derive(Debug, Clone)]
pub struct MetricsHistory {
    /// Metric points (time-series)
    points: VecDeque<MetricPoint>,

    /// Maximum capacity
    capacity: usize,

    /// Retention duration
    retention: Duration,
}

impl MetricsHistory {
    pub fn new() -> Self {
        Self::with_retention(Duration::from_secs(3600))
    }

    pub fn with_retention(retention: Duration) -> Self {
        Self {
            points: VecDeque::new(),
            capacity: 100_000,
            retention,
        }
    }

    pub fn record(&mut self, point: MetricPoint) {
        // Remove expired points
        let cutoff = Utc::now() - chrono::Duration::from_std(self.retention).unwrap();
        while let Some(front) = self.points.front() {
            if front.timestamp < cutoff {
                self.points.pop_front();
            } else {
                break;
            }
        }

        // Add new point
        if self.points.len() >= self.capacity {
            self.points.pop_front();
        }
        self.points.push_back(point);
    }

    pub fn query(
        &self,
        metric_type: MetricType,
        agent_id: Option<AgentId>,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    ) -> Vec<&MetricPoint> {
        self.points
            .iter()
            .filter(|p| {
                p.metric_type == metric_type
                    && p.timestamp >= start
                    && p.timestamp <= end
                    && (agent_id.is_none() || p.agent_id == agent_id)
            })
            .collect()
    }
}
```

---

## Event System

### Event Schema

```rust
/// Common event schema (unified across frameworks)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Event {
    /// Schema version
    pub schema_version: String,

    /// Unique event ID
    pub event_id: Uuid,

    /// Timestamp
    pub timestamp: DateTime<Utc>,

    /// Event source
    pub source: EventSource,

    /// Event type
    pub event_type: EventType,

    /// Event category
    pub category: EventCategory,

    /// Severity
    pub severity: Severity,

    /// Event payload (framework-specific data)
    pub payload: serde_json::Value,

    /// Metadata
    pub metadata: EventMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventSource {
    /// Framework
    pub framework: Framework,

    /// Agent ID
    pub agent_id: Option<AgentId>,

    /// Agent type
    pub agent_type: Option<AgentType>,

    /// Session ID
    pub session_id: SessionId,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum EventType {
    // Lifecycle events
    AgentStarted,
    AgentCompleted,
    AgentFailed,
    AgentPaused,
    AgentResumed,
    AgentTerminated,

    // Task events
    TaskAssigned,
    TaskStarted,
    TaskProgress,
    TaskCompleted,
    TaskFailed,
    TaskCancelled,

    // Communication events
    MessageSent,
    MessageReceived,
    HandoffInitiated,
    HandoffCompleted,

    // Tool events
    ToolCalled,
    ToolResult,

    // State events
    StateUpdated,
    CheckpointCreated,

    // Session events
    SessionStarted,
    SessionPaused,
    SessionResumed,
    SessionEnded,

    // Error events
    ErrorOccurred,

    // Custom
    Custom(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EventCategory {
    Lifecycle,
    Communication,
    Execution,
    Error,
    State,
    System,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Debug,
    Info,
    Warning,
    Error,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventMetadata {
    /// Trace ID for distributed tracing
    pub trace_id: Option<String>,

    /// Parent event ID
    pub parent_event_id: Option<Uuid>,

    /// Tags
    pub tags: Vec<String>,

    /// Additional custom metadata
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}
```

### Event Bus

```rust
use tokio::sync::mpsc;

/// Event bus for publishing/subscribing to events
#[derive(Debug)]
pub struct EventBus {
    /// Event channel sender
    tx: mpsc::UnboundedSender<Event>,

    /// Event channel receiver
    rx: Arc<RwLock<mpsc::UnboundedReceiver<Event>>>,

    /// Subscribers
    subscribers: Arc<RwLock<Vec<EventSubscriber>>>,
}

pub type EventSubscriber = mpsc::UnboundedSender<Event>;

impl EventBus {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::unbounded_channel();
        Self {
            tx,
            rx: Arc::new(RwLock::new(rx)),
            subscribers: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub fn publish(&self, event: Event) -> Result<(), EventBusError> {
        self.tx.send(event).map_err(|_| EventBusError::SendFailed)
    }

    pub fn subscribe(&self) -> mpsc::UnboundedReceiver<Event> {
        let (tx, rx) = mpsc::unbounded_channel();
        self.subscribers.write().unwrap().push(tx);
        rx
    }

    pub async fn run(&self) {
        let mut rx = self.rx.write().unwrap();
        while let Some(event) = rx.recv().await {
            let subscribers = self.subscribers.read().unwrap();
            for subscriber in subscribers.iter() {
                let _ = subscriber.send(event.clone());
            }
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum EventBusError {
    #[error("Failed to send event")]
    SendFailed,
}
```

---

## Serialization Schema

### JSON Schema Example

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Flow Orchestrator Event",
  "type": "object",
  "required": [
    "schema_version",
    "event_id",
    "timestamp",
    "source",
    "event_type"
  ],
  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "event_id": {
      "type": "string",
      "format": "uuid"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "source": {
      "type": "object",
      "required": ["framework", "session_id"],
      "properties": {
        "framework": {
          "type": "string",
          "enum": [
            "claude-flow",
            "autogen",
            "langgraph",
            "crewai",
            "opencode"
          ]
        },
        "agent_id": {
          "type": "string",
          "format": "uuid"
        },
        "agent_type": {
          "type": "string"
        },
        "session_id": {
          "type": "string",
          "format": "uuid"
        }
      }
    },
    "event_type": {
      "type": "string",
      "enum": [
        "agent_started",
        "agent_completed",
        "task_assigned",
        "message_sent"
      ]
    },
    "category": {
      "type": "string",
      "enum": [
        "lifecycle",
        "communication",
        "execution",
        "error",
        "state"
      ]
    },
    "severity": {
      "type": "string",
      "enum": ["debug", "info", "warning", "error", "critical"]
    },
    "payload": {
      "type": "object"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "trace_id": {
          "type": "string"
        },
        "parent_event_id": {
          "type": "string",
          "format": "uuid"
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

### Serialization Examples

```rust
// Agent serialization
let agent = Agent {
    id: Uuid::new_v4(),
    agent_type: AgentType::Coder,
    name: "Backend Developer".to_string(),
    status: AgentStatus::Running,
    framework: Framework::ClaudeFlow,
    capabilities: vec!["code_generation".to_string(), "code_review".to_string()],
    parent: None,
    children: vec![],
    cluster: Some(Uuid::new_v4()),
    metrics: AgentMetrics::default(),
    config: HashMap::new(),
    created_at: Utc::now(),
    updated_at: Utc::now(),
};

// Serialize to JSON
let json = serde_json::to_string_pretty(&agent).unwrap();
println!("{}", json);

// Event serialization
let event = Event {
    schema_version: "1.0.0".to_string(),
    event_id: Uuid::new_v4(),
    timestamp: Utc::now(),
    source: EventSource {
        framework: Framework::ClaudeFlow,
        agent_id: Some(agent.id),
        agent_type: Some(AgentType::Coder),
        session_id: Uuid::new_v4(),
    },
    event_type: EventType::AgentStarted,
    category: EventCategory::Lifecycle,
    severity: Severity::Info,
    payload: serde_json::json!({
        "capabilities": ["code_generation", "code_review"],
        "config": {}
    }),
    metadata: EventMetadata {
        trace_id: Some("trace-123".to_string()),
        parent_event_id: None,
        tags: vec!["backend".to_string()],
        extra: HashMap::new(),
    },
};

// Serialize to JSON
let json = serde_json::to_string_pretty(&event).unwrap();
println!("{}", json);
```

---

## Database Schema

### SQLite Schema (Optional Persistence)

```sql
-- Schema version
CREATE TABLE schema_version (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_version (version) VALUES ('1.0.0');

-- Sessions
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    session_type TEXT NOT NULL,
    status TEXT NOT NULL,
    config TEXT NOT NULL, -- JSON
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);

-- Agents
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    framework TEXT NOT NULL,
    capabilities TEXT NOT NULL, -- JSON array
    parent_id TEXT,
    cluster_id TEXT,
    metrics TEXT NOT NULL, -- JSON
    config TEXT NOT NULL, -- JSON
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE INDEX idx_agents_session_id ON agents(session_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(agent_type);
CREATE INDEX idx_agents_parent_id ON agents(parent_id);

-- Tasks
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    description TEXT NOT NULL,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    assigned_agent TEXT NOT NULL,
    priority TEXT NOT NULL,
    parent_id TEXT,
    milestone_id TEXT,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    result TEXT, -- JSON
    error TEXT, -- JSON
    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_agent) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_session_id ON tasks(session_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_agent ON tasks(assigned_agent);
CREATE INDEX idx_tasks_milestone ON tasks(milestone_id);

-- Task dependencies
CREATE TABLE task_dependencies (
    task_id TEXT NOT NULL,
    depends_on TEXT NOT NULL,
    PRIMARY KEY (task_id, depends_on),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Messages
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    from_agent TEXT,
    to_agent TEXT,
    message_type TEXT NOT NULL,
    content TEXT NOT NULL, -- JSON
    task_id TEXT,
    timestamp TIMESTAMP NOT NULL,
    trace_id TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (from_agent) REFERENCES agents(id) ON DELETE SET NULL,
    FOREIGN KEY (to_agent) REFERENCES agents(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_from_agent ON messages(from_agent);
CREATE INDEX idx_messages_to_agent ON messages(to_agent);

-- Events
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    source TEXT NOT NULL, -- JSON
    event_type TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON
    metadata TEXT NOT NULL, -- JSON
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_severity ON events(severity);

-- Metrics
CREATE TABLE metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    metric_type TEXT NOT NULL,
    value REAL NOT NULL,
    agent_id TEXT,
    labels TEXT, -- JSON
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE INDEX idx_metrics_session_id ON metrics(session_id);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp DESC);
CREATE INDEX idx_metrics_type ON metrics(metric_type);
CREATE INDEX idx_metrics_agent ON metrics(agent_id);

-- Milestones
CREATE TABLE milestones (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    parent_id TEXT,
    risk TEXT NOT NULL,
    eta INTEGER, -- seconds
    created_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES milestones(id) ON DELETE SET NULL
);

CREATE INDEX idx_milestones_session_id ON milestones(session_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_parent_id ON milestones(parent_id);

-- Clusters
CREATE TABLE clusters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    cluster_type TEXT NOT NULL,
    topology TEXT NOT NULL,
    metadata TEXT, -- JSON
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_clusters_session_id ON clusters(session_id);

-- Cluster members
CREATE TABLE cluster_members (
    cluster_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    PRIMARY KEY (cluster_id, agent_id),
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
```

---

## Type Relationships

### Domain Model Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────┐
│                          Session                             │
│  • id, name, type, status                                   │
│  • config, metrics                                          │
│  • started_at, ended_at                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
         ┌────────┼────────┬─────────────┐
         ▼        ▼        ▼             ▼
    ┌────────┐ ┌──────┐ ┌───────────┐ ┌──────────┐
    │ Agent  │ │ Task │ │ Milestone │ │ Cluster  │
    └────┬───┘ └───┬──┘ └─────┬─────┘ └────┬─────┘
         │         │          │             │
         │    ┌────┴──────────┴─────┐       │
         │    │                      │       │
         ▼    ▼                      ▼       ▼
    ┌─────────────┐           ┌─────────────────┐
    │  Metrics    │           │  AgentGraph     │
    │  • tokens   │           │  • nodes        │
    │  • cost     │           │  • edges        │
    │  • latency  │           │  • clusters     │
    └─────────────┘           └─────────────────┘
         │
         ▼
    ┌─────────────┐
    │ MetricPoint │
    │  • timestamp│
    │  • type     │
    │  • value    │
    └─────────────┘

         Event System
    ┌─────────────────────┐
    │      Event          │
    │  • id, timestamp    │
    │  • source, type     │
    │  • payload, metadata│
    └──────────┬──────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
    ┌──────────┐  ┌──────────┐
    │EventLog  │  │EventBus  │
    │(Buffer)  │  │(PubSub)  │
    └──────────┘  └──────────┘

         State Management
    ┌─────────────────────────┐
    │      AppState           │
    │  • session              │
    │  • dashboard            │
    │  • agent_graph          │
    │  • event_log            │
    │  • metrics_history      │
    └─────────────────────────┘
```

### Relationships Summary

1. **Session → Agents** (1:N)
   - A session contains multiple agents
   - Agents belong to one session

2. **Session → Tasks** (1:N)
   - A session contains multiple tasks
   - Tasks belong to one session

3. **Agent → Agent** (Parent-Child)
   - Hierarchical structure
   - Tree topology for coordination

4. **Agent → Task** (1:N)
   - One agent handles multiple tasks
   - Tasks assigned to one agent

5. **Agent → Cluster** (M:N)
   - Agents can be in multiple clusters
   - Clusters contain multiple agents

6. **Task → Task** (Dependencies)
   - Tasks can depend on other tasks
   - Forms a directed acyclic graph (DAG)

7. **Milestone → Tasks** (1:N)
   - Milestones contain multiple tasks
   - Tasks belong to milestones

8. **Event → Agent/Task** (References)
   - Events reference agents and tasks
   - Loosely coupled via IDs

9. **MetricPoint → Agent** (N:1)
   - Many metrics per agent
   - Agent-specific and system-wide metrics

---

## Implementation Guidelines

### Memory Management

1. **Ring Buffers**: Use fixed-size ring buffers for event logs to prevent unbounded memory growth
2. **Metric Retention**: Implement time-based retention policies for metrics
3. **Arc + RwLock**: Use for shared state with concurrent access
4. **Weak References**: Consider weak references for parent-child relationships to avoid cycles

### Performance Considerations

1. **Indexing**: Index frequently queried fields (agent_id, task_id, timestamp)
2. **Batching**: Batch metric updates to reduce write overhead
3. **Caching**: Cache frequently accessed agent/task states
4. **Lazy Loading**: Load full task/agent details only when needed

### Error Handling

1. **Result Types**: Use `Result<T, E>` for all fallible operations
2. **Custom Errors**: Define domain-specific error types with `thiserror`
3. **Error Context**: Include context in errors for debugging
4. **Graceful Degradation**: Continue operation even if some subsystems fail

### Testing Strategy

1. **Unit Tests**: Test individual models and state management functions
2. **Property Tests**: Use `proptest` for model invariants
3. **Integration Tests**: Test event flow and state transitions
4. **Mock Framework Adapters**: Test with simulated framework events

---

## Example Usage

```rust
use chrono::Utc;
use uuid::Uuid;

fn main() {
    // Create application state
    let app_state = AppState::new();

    // Create a session
    let session = Session {
        id: Uuid::new_v4(),
        name: "Development Session".to_string(),
        session_type: SessionType::Development,
        status: SessionStatus::Active,
        agents: HashMap::new(),
        tasks: HashMap::new(),
        milestones: Vec::new(),
        active_milestone: None,
        config: SessionConfig {
            model: "claude-3-5-sonnet-20241022".to_string(),
            max_agents: 10,
            cost_limit: Some(10.0),
            time_limit: None,
            autosave_interval: 300,
            settings: HashMap::new(),
        },
        metrics: MetricsSnapshot {
            start_time: Utc::now(),
            end_time: Utc::now(),
            total_tokens: 0,
            total_cost: 0.0,
            avg_latency_ms: 0.0,
            peak_queue_depth: 0,
            agent_metrics: HashMap::new(),
            total_errors: 0,
        },
        started_at: Utc::now(),
        ended_at: None,
    };

    // Store session
    *app_state.session.write().unwrap() = Some(session);

    // Create an agent
    let agent = Agent {
        id: Uuid::new_v4(),
        agent_type: AgentType::Coder,
        name: "Backend Developer".to_string(),
        status: AgentStatus::Running,
        framework: Framework::ClaudeFlow,
        capabilities: vec!["code_generation".to_string()],
        parent: None,
        children: Vec::new(),
        cluster: None,
        metrics: AgentMetrics::default(),
        config: HashMap::new(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    // Add to agent graph
    app_state.agent_graph.write().unwrap().add_agent(agent.clone());

    // Create an event
    let event = Event {
        schema_version: "1.0.0".to_string(),
        event_id: Uuid::new_v4(),
        timestamp: Utc::now(),
        source: EventSource {
            framework: Framework::ClaudeFlow,
            agent_id: Some(agent.id),
            agent_type: Some(AgentType::Coder),
            session_id: session.id,
        },
        event_type: EventType::AgentStarted,
        category: EventCategory::Lifecycle,
        severity: Severity::Info,
        payload: serde_json::json!({}),
        metadata: EventMetadata {
            trace_id: None,
            parent_event_id: None,
            tags: Vec::new(),
            extra: HashMap::new(),
        },
    };

    // Push to event log
    app_state.event_log.write().unwrap().push(event.clone());

    println!("✅ Session created: {}", session.name);
    println!("✅ Agent spawned: {}", agent.name);
    println!("✅ Event logged: {:?}", event.event_type);
}
```

---

## Conclusion

This data model architecture provides:

1. **Comprehensive Domain Models**: Covers agents, tasks, messages, metrics, sessions, milestones, and clusters
2. **Robust State Management**: Thread-safe state with `Arc<RwLock<T>>` patterns
3. **Flexible Event System**: Unified event schema with pub/sub bus
4. **Efficient Storage**: Ring buffers, time-series metrics, and optional SQLite persistence
5. **Extensibility**: Serde serialization, custom types, and framework adapters
6. **Performance**: Indexed queries, batching, and memory-bounded structures

This foundation supports all dashboard views (Flow View, Global Overview, Agent Focus, Research Monitor, Metrics Dashboard) with real-time updates and historical analysis capabilities.
