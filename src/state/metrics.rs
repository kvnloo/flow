/// Metrics collection and aggregation

use chrono::{DateTime, Duration as ChronoDuration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

use super::AgentId;

/// Time-series metric data point
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MetricPoint {
    /// Timestamp when the metric was recorded
    pub timestamp: DateTime<Utc>,

    /// Type of metric
    pub metric_type: MetricType,

    /// Metric value
    pub value: f64,

    /// Agent this metric belongs to (None for system-wide metrics)
    pub agent_id: Option<AgentId>,

    /// Additional labels for filtering/grouping
    pub labels: HashMap<String, String>,
}

impl MetricPoint {
    /// Create a new metric point
    pub fn new(metric_type: MetricType, value: f64) -> Self {
        Self {
            timestamp: Utc::now(),
            metric_type,
            value,
            agent_id: None,
            labels: HashMap::new(),
        }
    }

    /// Set the agent ID
    pub fn with_agent(mut self, agent_id: AgentId) -> Self {
        self.agent_id = Some(agent_id);
        self
    }

    /// Add a label
    pub fn with_label(mut self, key: String, value: String) -> Self {
        self.labels.insert(key, value);
        self
    }
}

/// Metric type enumeration
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

impl MetricType {
    /// Get a display name for the metric type
    pub fn display_name(&self) -> &str {
        match self {
            Self::TokensUsed => "Tokens Used",
            Self::Cost => "Cost",
            Self::Latency => "Latency",
            Self::QueueDepth => "Queue Depth",
            Self::ErrorRate => "Error Rate",
            Self::TaskCompletionRate => "Task Completion Rate",
            Self::Heat => "Heat",
            Self::Custom(name) => name,
        }
    }

    /// Get the unit for this metric type
    pub fn unit(&self) -> &str {
        match self {
            Self::TokensUsed => "tokens",
            Self::Cost => "USD",
            Self::Latency => "ms",
            Self::QueueDepth => "tasks",
            Self::ErrorRate => "%",
            Self::TaskCompletionRate => "%",
            Self::Heat => "score",
            Self::Custom(_) => "",
        }
    }
}

/// Time-series metrics storage with automatic retention management
#[derive(Debug, Clone)]
pub struct MetricsHistory {
    /// Metric data points stored in chronological order
    points: VecDeque<MetricPoint>,

    /// Maximum number of points to retain
    capacity: usize,

    /// How long to retain metrics
    retention: ChronoDuration,
}

impl MetricsHistory {
    /// Create a new metrics history with default 1-hour retention
    pub fn new() -> Self {
        Self::with_retention(ChronoDuration::hours(1))
    }

    /// Create a new metrics history with custom retention period
    pub fn with_retention(retention: ChronoDuration) -> Self {
        Self {
            points: VecDeque::new(),
            capacity: 100_000, // Max 100k points
            retention,
        }
    }

    /// Record a new metric point
    pub fn record(&mut self, point: MetricPoint) {
        // Remove expired points
        self.prune_expired();

        // Add new point
        if self.points.len() >= self.capacity {
            self.points.pop_front();
        }
        self.points.push_back(point);
    }

    /// Remove expired metric points based on retention policy
    fn prune_expired(&mut self) {
        let cutoff = Utc::now() - self.retention;
        while let Some(front) = self.points.front() {
            if front.timestamp < cutoff {
                self.points.pop_front();
            } else {
                break;
            }
        }
    }

    /// Query metrics by type, agent, and time range
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

    /// Get all metrics for a specific agent
    pub fn agent_metrics(&self, agent_id: AgentId) -> Vec<&MetricPoint> {
        self.points
            .iter()
            .filter(|p| p.agent_id == Some(agent_id))
            .collect()
    }

    /// Get the most recent metric of a specific type
    pub fn latest(&self, metric_type: MetricType, agent_id: Option<AgentId>) -> Option<&MetricPoint> {
        self.points
            .iter()
            .rev()
            .find(|p| p.metric_type == metric_type && (agent_id.is_none() || p.agent_id == agent_id))
    }

    /// Calculate the average value for a metric type in a time range
    pub fn average(
        &self,
        metric_type: MetricType,
        agent_id: Option<AgentId>,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    ) -> Option<f64> {
        let points = self.query(metric_type, agent_id, start, end);
        if points.is_empty() {
            None
        } else {
            let sum: f64 = points.iter().map(|p| p.value).sum();
            Some(sum / points.len() as f64)
        }
    }

    /// Calculate the sum of values for a metric type in a time range
    pub fn sum(
        &self,
        metric_type: MetricType,
        agent_id: Option<AgentId>,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    ) -> f64 {
        self.query(metric_type, agent_id, start, end)
            .iter()
            .map(|p| p.value)
            .sum()
    }

    /// Get the number of metric points stored
    pub fn len(&self) -> usize {
        self.points.len()
    }

    /// Check if the history is empty
    pub fn is_empty(&self) -> bool {
        self.points.is_empty()
    }

    /// Clear all metric points
    pub fn clear(&mut self) {
        self.points.clear();
    }
}

impl Default for MetricsHistory {
    fn default() -> Self {
        Self::new()
    }
}

/// Aggregated metrics snapshot for a time window
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MetricsSnapshot {
    /// Start of the time window
    pub start_time: DateTime<Utc>,

    /// End of the time window
    pub end_time: DateTime<Utc>,

    /// Total tokens consumed across all agents
    pub total_tokens: u64,

    /// Total cost in USD
    pub total_cost: f64,

    /// Average latency in milliseconds
    pub avg_latency_ms: f64,

    /// Peak queue depth observed
    pub peak_queue_depth: usize,

    /// Per-agent metrics
    pub agent_metrics: HashMap<AgentId, super::AgentMetrics>,

    /// Total error count
    pub total_errors: u32,
}

impl MetricsSnapshot {
    /// Create a new snapshot starting at the given time
    pub fn new(start_time: DateTime<Utc>) -> Self {
        Self {
            start_time,
            end_time: start_time,
            total_tokens: 0,
            total_cost: 0.0,
            avg_latency_ms: 0.0,
            peak_queue_depth: 0,
            agent_metrics: HashMap::new(),
            total_errors: 0,
        }
    }

    /// Update the snapshot with metrics from an agent
    pub fn update_from_agent(&mut self, agent_id: AgentId, metrics: super::AgentMetrics) {
        self.total_tokens += metrics.tokens_used;
        self.total_cost += metrics.cost;
        self.peak_queue_depth = self.peak_queue_depth.max(metrics.queue_depth);
        self.total_errors += metrics.errors;

        // Update running average for latency
        let agent_count = self.agent_metrics.len() as f64;
        if agent_count > 0.0 {
            self.avg_latency_ms = (self.avg_latency_ms * agent_count + metrics.avg_latency_ms)
                / (agent_count + 1.0);
        } else {
            self.avg_latency_ms = metrics.avg_latency_ms;
        }

        self.agent_metrics.insert(agent_id, metrics);
        self.end_time = Utc::now();
    }

    /// Get the duration of this snapshot in seconds
    pub fn duration_seconds(&self) -> i64 {
        self.end_time
            .signed_duration_since(self.start_time)
            .num_seconds()
    }

    /// Get the total number of tasks completed across all agents
    pub fn total_tasks_completed(&self) -> u32 {
        self.agent_metrics.values().map(|m| m.tasks_completed).sum()
    }

    /// Get the total number of tasks failed across all agents
    pub fn total_tasks_failed(&self) -> u32 {
        self.agent_metrics.values().map(|m| m.tasks_failed).sum()
    }

    /// Calculate the overall success rate
    pub fn success_rate(&self) -> f64 {
        let completed = self.total_tasks_completed();
        let failed = self.total_tasks_failed();
        let total = completed + failed;

        if total == 0 {
            1.0
        } else {
            completed as f64 / total as f64
        }
    }

    /// Get the cost per token (if any tokens used)
    pub fn cost_per_token(&self) -> f64 {
        if self.total_tokens > 0 {
            self.total_cost / self.total_tokens as f64
        } else {
            0.0
        }
    }
}
