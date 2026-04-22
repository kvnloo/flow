//! Application state management
//!
//! This module defines the core application state, dashboard modes,
//! and view modes following the TEA (The Elm Architecture) pattern.

use std::collections::HashMap;
use uuid::Uuid;

/// Application state container
#[derive(Debug, Clone)]
pub struct AppState {
    /// Current operational mode
    pub mode: Mode,

    /// Current dashboard view
    pub dashboard: Dashboard,

    /// Selected agent ID (if any)
    pub selected_agent: Option<Uuid>,

    /// Selected task ID (if any)
    pub selected_task: Option<Uuid>,

    /// Event filters
    pub filters: EventFilters,

    /// Scroll positions for various panels
    pub scroll_positions: HashMap<String, usize>,

    /// Terminal dimensions (width, height)
    pub terminal_size: (u16, u16),

    /// Whether the app is running
    pub running: bool,

    /// Current error message (if any)
    pub error: Option<String>,

    /// Status message (transient)
    pub status: Option<String>,

    /// Command input buffer (for Command mode)
    pub command_buffer: String,

    /// Command history
    pub command_history: Vec<String>,

    /// Command history cursor position
    pub history_cursor: usize,
}

/// Application operational modes (Vim-style)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    /// Normal mode - navigation and viewing
    Normal,

    /// Insert mode - text input
    Insert,

    /// Command mode - execute commands
    Command,

    /// Visual mode - selection and bulk operations
    Visual,
}

/// Dashboard view types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dashboard {
    /// Overview dashboard - system status and metrics
    Overview,

    /// Flow dashboard - agent network visualization
    Flow,

    /// Research dashboard - research tree and progress
    Research,

    /// Tasks dashboard - task management and tracking
    Tasks,

    /// Logs dashboard - event log viewer
    Logs,

    /// Metrics dashboard - performance and cost metrics
    Metrics,

    /// Settings dashboard - configuration
    Settings,
}

/// Event filtering configuration
#[derive(Debug, Clone, Default)]
pub struct EventFilters {
    /// Framework filters (empty = all)
    pub frameworks: Vec<String>,

    /// Event type filters (empty = all)
    pub event_types: Vec<String>,

    /// Severity filters (empty = all)
    pub severities: Vec<String>,

    /// Agent ID filter
    pub agent_id: Option<Uuid>,

    /// Task ID filter
    pub task_id: Option<Uuid>,

    /// Time range filter (ISO8601 start, end)
    pub time_range: Option<(String, String)>,

    /// Search query
    pub search_query: Option<String>,
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

impl AppState {
    /// Create new application state with defaults
    pub fn new() -> Self {
        Self {
            mode: Mode::Normal,
            dashboard: Dashboard::Overview,
            selected_agent: None,
            selected_task: None,
            filters: EventFilters::default(),
            scroll_positions: HashMap::new(),
            terminal_size: (0, 0),
            running: true,
            error: None,
            status: None,
            command_buffer: String::new(),
            command_history: Vec::new(),
            history_cursor: 0,
        }
    }

    /// Set the current mode
    pub fn set_mode(&mut self, mode: Mode) {
        self.mode = mode;

        // Clear command buffer when leaving command mode
        if mode != Mode::Command {
            self.command_buffer.clear();
        }
    }

    /// Switch to dashboard
    pub fn switch_dashboard(&mut self, dashboard: Dashboard) {
        self.dashboard = dashboard;
        self.clear_error();
    }

    /// Set error message
    pub fn set_error(&mut self, error: impl Into<String>) {
        self.error = Some(error.into());
        self.status = None;
    }

    /// Set status message
    pub fn set_status(&mut self, status: impl Into<String>) {
        self.status = Some(status.into());
        self.error = None;
    }

    /// Clear error message
    pub fn clear_error(&mut self) {
        self.error = None;
    }

    /// Clear status message
    pub fn clear_status(&mut self) {
        self.status = None;
    }

    /// Request shutdown
    pub fn shutdown(&mut self) {
        self.running = false;
    }

    /// Check if app is running
    pub fn is_running(&self) -> bool {
        self.running
    }

    /// Get scroll position for panel
    pub fn get_scroll(&self, panel: &str) -> usize {
        self.scroll_positions.get(panel).copied().unwrap_or(0)
    }

    /// Set scroll position for panel
    pub fn set_scroll(&mut self, panel: impl Into<String>, position: usize) {
        self.scroll_positions.insert(panel.into(), position);
    }

    /// Scroll panel down
    pub fn scroll_down(&mut self, panel: &str, amount: usize) {
        let current = self.get_scroll(panel);
        self.set_scroll(panel, current.saturating_add(amount));
    }

    /// Scroll panel up
    pub fn scroll_up(&mut self, panel: &str, amount: usize) {
        let current = self.get_scroll(panel);
        self.set_scroll(panel, current.saturating_sub(amount));
    }

    /// Add command to history
    pub fn add_command_to_history(&mut self, command: String) {
        if !command.is_empty() {
            self.command_history.push(command);
            self.history_cursor = self.command_history.len();
        }
    }

    /// Navigate command history (up/down)
    pub fn navigate_history(&mut self, direction: HistoryDirection) -> Option<String> {
        if self.command_history.is_empty() {
            return None;
        }

        match direction {
            HistoryDirection::Up => {
                if self.history_cursor > 0 {
                    self.history_cursor -= 1;
                    Some(self.command_history[self.history_cursor].clone())
                } else {
                    None
                }
            }
            HistoryDirection::Down => {
                if self.history_cursor < self.command_history.len() - 1 {
                    self.history_cursor += 1;
                    Some(self.command_history[self.history_cursor].clone())
                } else {
                    self.history_cursor = self.command_history.len();
                    Some(String::new())
                }
            }
        }
    }
}

/// Command history navigation direction
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HistoryDirection {
    Up,
    Down,
}

impl Mode {
    /// Get mode display name
    pub fn as_str(&self) -> &'static str {
        match self {
            Mode::Normal => "NORMAL",
            Mode::Insert => "INSERT",
            Mode::Command => "COMMAND",
            Mode::Visual => "VISUAL",
        }
    }
}

impl Dashboard {
    /// Get dashboard display name
    pub fn as_str(&self) -> &'static str {
        match self {
            Dashboard::Overview => "Overview",
            Dashboard::Flow => "Flow",
            Dashboard::Research => "Research",
            Dashboard::Tasks => "Tasks",
            Dashboard::Logs => "Logs",
            Dashboard::Metrics => "Metrics",
            Dashboard::Settings => "Settings",
        }
    }

    /// Get dashboard hotkey
    pub fn hotkey(&self) -> Option<char> {
        match self {
            Dashboard::Overview => Some('1'),
            Dashboard::Flow => Some('2'),
            Dashboard::Research => Some('3'),
            Dashboard::Tasks => Some('4'),
            Dashboard::Logs => Some('5'),
            Dashboard::Metrics => Some('6'),
            Dashboard::Settings => Some('7'),
        }
    }

    /// Get all dashboards
    pub fn all() -> Vec<Dashboard> {
        vec![
            Dashboard::Overview,
            Dashboard::Flow,
            Dashboard::Research,
            Dashboard::Tasks,
            Dashboard::Logs,
            Dashboard::Metrics,
            Dashboard::Settings,
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_new() {
        let state = AppState::new();
        assert_eq!(state.mode, Mode::Normal);
        assert_eq!(state.dashboard, Dashboard::Overview);
        assert!(state.running);
    }

    #[test]
    fn test_mode_switching() {
        let mut state = AppState::new();
        state.set_mode(Mode::Command);
        assert_eq!(state.mode, Mode::Command);

        state.set_mode(Mode::Normal);
        assert_eq!(state.mode, Mode::Normal);
        assert!(state.command_buffer.is_empty());
    }

    #[test]
    fn test_dashboard_switching() {
        let mut state = AppState::new();
        state.switch_dashboard(Dashboard::Flow);
        assert_eq!(state.dashboard, Dashboard::Flow);
    }

    #[test]
    fn test_error_and_status() {
        let mut state = AppState::new();

        state.set_error("Test error");
        assert_eq!(state.error, Some("Test error".to_string()));
        assert_eq!(state.status, None);

        state.set_status("Test status");
        assert_eq!(state.status, Some("Test status".to_string()));
        assert_eq!(state.error, None);
    }

    #[test]
    fn test_scroll_positions() {
        let mut state = AppState::new();

        state.set_scroll("panel1", 10);
        assert_eq!(state.get_scroll("panel1"), 10);

        state.scroll_down("panel1", 5);
        assert_eq!(state.get_scroll("panel1"), 15);

        state.scroll_up("panel1", 3);
        assert_eq!(state.get_scroll("panel1"), 12);
    }

    #[test]
    fn test_command_history() {
        let mut state = AppState::new();

        state.add_command_to_history("cmd1".to_string());
        state.add_command_to_history("cmd2".to_string());

        let cmd = state.navigate_history(HistoryDirection::Up);
        assert_eq!(cmd, Some("cmd2".to_string()));

        let cmd = state.navigate_history(HistoryDirection::Up);
        assert_eq!(cmd, Some("cmd1".to_string()));

        let cmd = state.navigate_history(HistoryDirection::Down);
        assert_eq!(cmd, Some("cmd2".to_string()));
    }
}
