// UI module for Flow Orchestrator TUI
//
// This module contains reusable UI widgets and components for building
// the terminal interface. All widgets are built using Ratatui.

pub mod dashboards;
pub mod theme;
pub mod widgets;

// Re-export commonly used items
pub use dashboards::{
    Dashboard, DashboardId, DashboardData,
    OverviewDashboard, FlowViewDashboard, MetricsDashboard, AgentFocusDashboard,
};
pub use theme::{FlowTheme, StyleGuide};
// Widget re-exports commented until implementations are ready
// pub use widgets::{AgentCard, LogViewer, ProgressGauge, SparklineWidget};

/// UI module constants
pub mod constants {
    /// Animation frame duration (60 FPS)
    pub const FRAME_DURATION_MS: u64 = 16;

    /// Minimum terminal width
    pub const MIN_TERMINAL_WIDTH: u16 = 80;

    /// Minimum terminal height
    pub const MIN_TERMINAL_HEIGHT: u16 = 24;

    /// Default border character set
    pub const BORDER_CHARS: &str = "─│┌┐└┘";
}
