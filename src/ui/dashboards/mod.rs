/// Dashboard implementations for Flow Orchestrator TUI
pub mod overview;
pub mod flow_view;
pub mod metrics;
pub mod agent_focus;

use ratatui::{Frame, layout::Rect};
use crossterm::event::KeyEvent;
use crate::ui::theme::{FlowTheme, StyleGuide};

pub use overview::OverviewDashboard;
pub use flow_view::FlowViewDashboard;
pub use metrics::MetricsDashboard;
pub use agent_focus::AgentFocusDashboard;

/// Dashboard trait for swappable views in the TUI
///
/// Each dashboard represents a distinct view mode optimized for specific workflows:
/// - Overview: Global orchestration snapshot
/// - FlowView: Gamified development HUD (default)
/// - Metrics: Cost and performance analysis
/// - AgentFocus: Deep inspection of individual agents
pub trait Dashboard {
    /// Dashboard unique identifier
    fn id(&self) -> DashboardId;

    /// Display name shown in tab bar
    fn name(&self) -> &str;

    /// Keyboard hotkey to switch to this dashboard
    fn hotkey(&self) -> Option<char>;

    /// Render dashboard to terminal frame
    fn render(&mut self, frame: &mut Frame, area: Rect);

    /// Handle keyboard input
    /// Returns true if the event was handled
    fn handle_key(&mut self, key: KeyEvent) -> bool;

    /// Called when dashboard becomes active
    fn activate(&mut self) {}

    /// Called when dashboard becomes inactive
    fn deactivate(&mut self) {}

    /// Update dashboard with new data
    fn update(&mut self, _data: DashboardData) {}

    /// Apply a new theme to the dashboard
    fn set_theme(&mut self, _theme: FlowTheme) {}
}

/// Dashboard identifier enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DashboardId {
    Overview,
    FlowView,
    Metrics,
    AgentFocus,
}

impl std::fmt::Display for DashboardId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DashboardId::Overview => write!(f, "Overview"),
            DashboardId::FlowView => write!(f, "FlowView"),
            DashboardId::Metrics => write!(f, "Metrics"),
            DashboardId::AgentFocus => write!(f, "AgentFocus"),
        }
    }
}

/// Shared data structure for dashboard updates
#[derive(Debug, Clone)]
pub struct DashboardData {
    pub agents: Vec<AgentInfo>,
    pub events: Vec<EventInfo>,
    pub metrics: SystemMetrics,
    pub session: SessionInfo,
}

/// Agent information structure
#[derive(Debug, Clone)]
pub struct AgentInfo {
    pub id: String,
    pub name: String,
    pub status: AgentStatus,
    pub role: String,
    pub level: u8,
    pub tokens: u32,
    pub cost: f32,
    pub latency: f32,
    pub queue_len: usize,
    pub current_task: Option<String>,
    pub progress: u8,
}

/// Agent status enum
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AgentStatus {
    Idle,
    Run,
    Wait,
    Error,
}

impl AgentStatus {
    pub fn icon(&self) -> &str {
        match self {
            Self::Idle => "○",
            Self::Run => "●",
            Self::Wait => "◐",
            Self::Error => "◉",
        }
    }

    pub fn color(&self) -> ratatui::style::Color {
        match self {
            Self::Idle => ratatui::style::Color::DarkGray,
            Self::Run => ratatui::style::Color::Green,
            Self::Wait => ratatui::style::Color::Yellow,
            Self::Error => ratatui::style::Color::Red,
        }
    }
}

/// Event log entry
#[derive(Debug, Clone)]
pub struct EventInfo {
    pub timestamp: String,
    pub agent_id: String,
    pub message: String,
    pub level: EventLevel,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EventLevel {
    Info,
    Warning,
    Error,
    Success,
}

impl EventLevel {
    pub fn color(&self) -> ratatui::style::Color {
        match self {
            Self::Info => ratatui::style::Color::Cyan,
            Self::Warning => ratatui::style::Color::Yellow,
            Self::Error => ratatui::style::Color::Red,
            Self::Success => ratatui::style::Color::Green,
        }
    }
}

/// System-wide metrics
#[derive(Debug, Clone)]
pub struct SystemMetrics {
    pub total_tokens: u32,
    pub total_cost: f32,
    pub elapsed_time: String,
    pub active_agents: usize,
    pub completed_tasks: usize,
    pub pending_tasks: usize,
}

/// Session information
#[derive(Debug, Clone)]
pub struct SessionInfo {
    pub name: String,
    pub model: String,
    pub elapsed: String,
    pub agent_count: usize,
}
