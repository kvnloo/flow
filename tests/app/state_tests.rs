//! AppState integration tests
//!
//! Tests for application state management, mode transitions, and state mutations.

use flow_orchestrator_tui::app::state::{
    AppState, Mode, Dashboard, EventFilters, HistoryDirection
};
use uuid::Uuid;

#[test]
fn test_app_state_initialization() {
    let state = AppState::new();

    assert_eq!(state.mode, Mode::Normal);
    assert_eq!(state.dashboard, Dashboard::Overview);
    assert!(state.selected_agent.is_none());
    assert!(state.selected_task.is_none());
    assert_eq!(state.terminal_size, (0, 0));
    assert!(state.running);
    assert!(state.error.is_none());
    assert!(state.status.is_none());
    assert!(state.command_buffer.is_empty());
    assert!(state.command_history.is_empty());
    assert_eq!(state.history_cursor, 0);
}

#[test]
fn test_mode_transitions() {
    let mut state = AppState::new();

    // Normal -> Command
    state.set_mode(Mode::Command);
    assert_eq!(state.mode, Mode::Command);

    // Command -> Normal (should clear buffer)
    state.command_buffer = "test".to_string();
    state.set_mode(Mode::Normal);
    assert_eq!(state.mode, Mode::Normal);
    assert!(state.command_buffer.is_empty());

    // Normal -> Insert
    state.set_mode(Mode::Insert);
    assert_eq!(state.mode, Mode::Insert);

    // Insert -> Normal
    state.set_mode(Mode::Normal);
    assert_eq!(state.mode, Mode::Normal);

    // Normal -> Visual
    state.set_mode(Mode::Visual);
    assert_eq!(state.mode, Mode::Visual);
}

#[test]
fn test_dashboard_switching() {
    let mut state = AppState::new();

    for dashboard in Dashboard::all() {
        state.switch_dashboard(dashboard);
        assert_eq!(state.dashboard, dashboard);
        assert!(state.error.is_none()); // Switching clears errors
    }
}

#[test]
fn test_error_status_interaction() {
    let mut state = AppState::new();

    // Set status
    state.set_status("Processing...");
    assert_eq!(state.status, Some("Processing...".to_string()));
    assert!(state.error.is_none());

    // Set error (should clear status)
    state.set_error("Something failed");
    assert_eq!(state.error, Some("Something failed".to_string()));
    assert!(state.status.is_none());

    // Set status again (should clear error)
    state.set_status("Success");
    assert_eq!(state.status, Some("Success".to_string()));
    assert!(state.error.is_none());
}

#[test]
fn test_error_clearing() {
    let mut state = AppState::new();

    state.set_error("Test error");
    assert!(state.error.is_some());

    state.clear_error();
    assert!(state.error.is_none());
}

#[test]
fn test_status_clearing() {
    let mut state = AppState::new();

    state.set_status("Test status");
    assert!(state.status.is_some());

    state.clear_status();
    assert!(state.status.is_none());
}

#[test]
fn test_shutdown_lifecycle() {
    let mut state = AppState::new();

    assert!(state.is_running());

    state.shutdown();

    assert!(!state.is_running());
    assert!(!state.running);
}

#[test]
fn test_scroll_positions() {
    let mut state = AppState::new();

    // Initially no scroll positions
    assert_eq!(state.get_scroll("main"), 0);
    assert_eq!(state.get_scroll("sidebar"), 0);

    // Set scroll positions
    state.set_scroll("main", 10);
    state.set_scroll("sidebar", 5);

    assert_eq!(state.get_scroll("main"), 10);
    assert_eq!(state.get_scroll("sidebar"), 5);

    // Scroll down
    state.scroll_down("main", 3);
    assert_eq!(state.get_scroll("main"), 13);

    // Scroll up
    state.scroll_up("main", 5);
    assert_eq!(state.get_scroll("main"), 8);

    // Scroll up with saturation (shouldn't go negative)
    state.scroll_up("main", 100);
    assert_eq!(state.get_scroll("main"), 0);
}

#[test]
fn test_command_history() {
    let mut state = AppState::new();

    // Add commands
    state.add_command_to_history("help".to_string());
    state.add_command_to_history("quit".to_string());
    state.add_command_to_history("status".to_string());

    assert_eq!(state.command_history.len(), 3);
    assert_eq!(state.history_cursor, 3);

    // Navigate up
    let cmd = state.navigate_history(HistoryDirection::Up);
    assert_eq!(cmd, Some("status".to_string()));
    assert_eq!(state.history_cursor, 2);

    let cmd = state.navigate_history(HistoryDirection::Up);
    assert_eq!(cmd, Some("quit".to_string()));
    assert_eq!(state.history_cursor, 1);

    let cmd = state.navigate_history(HistoryDirection::Up);
    assert_eq!(cmd, Some("help".to_string()));
    assert_eq!(state.history_cursor, 0);

    // Can't go further up
    let cmd = state.navigate_history(HistoryDirection::Up);
    assert!(cmd.is_none());
    assert_eq!(state.history_cursor, 0);

    // Navigate down
    let cmd = state.navigate_history(HistoryDirection::Down);
    assert_eq!(cmd, Some("quit".to_string()));
    assert_eq!(state.history_cursor, 1);

    let cmd = state.navigate_history(HistoryDirection::Down);
    assert_eq!(cmd, Some("status".to_string()));
    assert_eq!(state.history_cursor, 2);

    // Navigate to end
    let cmd = state.navigate_history(HistoryDirection::Down);
    assert_eq!(cmd, Some(String::new()));
    assert_eq!(state.history_cursor, 3);
}

#[test]
fn test_empty_command_history() {
    let mut state = AppState::new();

    let cmd = state.navigate_history(HistoryDirection::Up);
    assert!(cmd.is_none());

    let cmd = state.navigate_history(HistoryDirection::Down);
    assert!(cmd.is_none());
}

#[test]
fn test_empty_commands_not_added() {
    let mut state = AppState::new();

    state.add_command_to_history("".to_string());
    assert_eq!(state.command_history.len(), 0);

    state.add_command_to_history("valid".to_string());
    assert_eq!(state.command_history.len(), 1);
}

#[test]
fn test_mode_display_names() {
    assert_eq!(Mode::Normal.as_str(), "NORMAL");
    assert_eq!(Mode::Insert.as_str(), "INSERT");
    assert_eq!(Mode::Command.as_str(), "COMMAND");
    assert_eq!(Mode::Visual.as_str(), "VISUAL");
}

#[test]
fn test_dashboard_display_names() {
    assert_eq!(Dashboard::Overview.as_str(), "Overview");
    assert_eq!(Dashboard::Flow.as_str(), "Flow");
    assert_eq!(Dashboard::Research.as_str(), "Research");
    assert_eq!(Dashboard::Tasks.as_str(), "Tasks");
    assert_eq!(Dashboard::Logs.as_str(), "Logs");
    assert_eq!(Dashboard::Metrics.as_str(), "Metrics");
    assert_eq!(Dashboard::Settings.as_str(), "Settings");
}

#[test]
fn test_dashboard_hotkeys() {
    assert_eq!(Dashboard::Overview.hotkey(), Some('1'));
    assert_eq!(Dashboard::Flow.hotkey(), Some('2'));
    assert_eq!(Dashboard::Research.hotkey(), Some('3'));
    assert_eq!(Dashboard::Tasks.hotkey(), Some('4'));
    assert_eq!(Dashboard::Logs.hotkey(), Some('5'));
    assert_eq!(Dashboard::Metrics.hotkey(), Some('6'));
    assert_eq!(Dashboard::Settings.hotkey(), Some('7'));
}

#[test]
fn test_dashboard_all() {
    let all = Dashboard::all();
    assert_eq!(all.len(), 7);
    assert_eq!(all[0], Dashboard::Overview);
    assert_eq!(all[6], Dashboard::Settings);
}

#[test]
fn test_event_filters() {
    let filters = EventFilters::default();

    assert!(filters.frameworks.is_empty());
    assert!(filters.event_types.is_empty());
    assert!(filters.severities.is_empty());
    assert!(filters.agent_id.is_none());
    assert!(filters.task_id.is_none());
    assert!(filters.time_range.is_none());
    assert!(filters.search_query.is_none());
}

#[test]
fn test_event_filters_with_values() {
    let agent_id = Uuid::new_v4();
    let task_id = Uuid::new_v4();

    let mut state = AppState::new();
    state.filters.frameworks = vec!["claude-flow".to_string()];
    state.filters.event_types = vec!["agent_spawned".to_string()];
    state.filters.severities = vec!["info".to_string(), "error".to_string()];
    state.filters.agent_id = Some(agent_id);
    state.filters.task_id = Some(task_id);
    state.filters.time_range = Some(("2024-01-01".to_string(), "2024-12-31".to_string()));
    state.filters.search_query = Some("search term".to_string());

    assert_eq!(state.filters.frameworks.len(), 1);
    assert_eq!(state.filters.event_types.len(), 1);
    assert_eq!(state.filters.severities.len(), 2);
    assert_eq!(state.filters.agent_id, Some(agent_id));
    assert_eq!(state.filters.task_id, Some(task_id));
    assert!(state.filters.time_range.is_some());
    assert!(state.filters.search_query.is_some());
}

#[test]
fn test_agent_task_selection() {
    let mut state = AppState::new();

    let agent_id = Uuid::new_v4();
    let task_id = Uuid::new_v4();

    assert!(state.selected_agent.is_none());
    assert!(state.selected_task.is_none());

    state.selected_agent = Some(agent_id);
    state.selected_task = Some(task_id);

    assert_eq!(state.selected_agent, Some(agent_id));
    assert_eq!(state.selected_task, Some(task_id));
}

#[test]
fn test_terminal_size_tracking() {
    let mut state = AppState::new();

    assert_eq!(state.terminal_size, (0, 0));

    state.terminal_size = (120, 40);
    assert_eq!(state.terminal_size, (120, 40));

    state.terminal_size = (80, 24);
    assert_eq!(state.terminal_size, (80, 24));
}

#[test]
fn test_state_clone() {
    let mut state = AppState::new();
    state.set_mode(Mode::Command);
    state.switch_dashboard(Dashboard::Flow);
    state.set_status("Test");

    let cloned = state.clone();

    assert_eq!(cloned.mode, state.mode);
    assert_eq!(cloned.dashboard, state.dashboard);
    assert_eq!(cloned.status, state.status);
}
