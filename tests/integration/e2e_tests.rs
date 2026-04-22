//! End-to-end integration tests
//!
//! Tests that verify complete workflows across all components.

use flow_orchestrator_tui::{
    app::{config::AppConfig, state::{AppState, Mode, Dashboard, HistoryDirection}},
    error::{FlowError, Result},
};
use std::env;

#[test]
fn test_full_config_to_state_flow() {
    // Load configuration
    let config = AppConfig::load();
    assert!(config.is_ok());
    let config = config.unwrap();

    // Create app state
    let mut state = AppState::new();

    // Verify initial state matches expectations
    assert_eq!(state.mode, Mode::Normal);
    assert_eq!(state.dashboard, Dashboard::Overview);
    assert!(state.running);

    // Simulate mode transitions
    state.set_mode(Mode::Command);
    assert_eq!(state.mode, Mode::Command);

    // Simulate dashboard switches
    state.switch_dashboard(Dashboard::Flow);
    assert_eq!(state.dashboard, Dashboard::Flow);

    // Verify config values
    assert_eq!(config.app.log_level, "info");
    assert_eq!(config.ui.update_interval, 16);
}

#[test]
fn test_error_propagation_chain() {
    fn level_3() -> Result<String> {
        Err(FlowError::state("Database connection failed"))
    }

    fn level_2() -> Result<String> {
        level_3()?;
        Ok("success".to_string())
    }

    fn level_1() -> Result<String> {
        level_2()?;
        Ok("success".to_string())
    }

    let result = level_1();
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Database connection failed"));
}

#[test]
fn test_state_mode_command_workflow() {
    let mut state = AppState::new();

    // Start in Normal mode
    assert_eq!(state.mode, Mode::Normal);

    // Switch to Command mode
    state.set_mode(Mode::Command);
    assert_eq!(state.mode, Mode::Command);

    // Type command
    state.command_buffer = "help".to_string();
    assert_eq!(state.command_buffer, "help");

    // Add to history
    state.add_command_to_history(state.command_buffer.clone());
    assert_eq!(state.command_history.len(), 1);

    // Return to Normal mode (should clear buffer)
    state.set_mode(Mode::Normal);
    assert!(state.command_buffer.is_empty());

    // History should persist
    assert_eq!(state.command_history.len(), 1);
}

#[test]
fn test_multi_dashboard_navigation() {
    let mut state = AppState::new();

    let dashboards = vec![
        Dashboard::Overview,
        Dashboard::Flow,
        Dashboard::Research,
        Dashboard::Tasks,
        Dashboard::Logs,
        Dashboard::Metrics,
        Dashboard::Settings,
    ];

    for dashboard in dashboards {
        state.switch_dashboard(dashboard);
        assert_eq!(state.dashboard, dashboard);

        // Verify error is cleared on switch
        state.set_error("Previous error");
        state.switch_dashboard(dashboard);
        assert!(state.error.is_none());
    }
}

#[test]
fn test_scroll_and_state_interaction() {
    let mut state = AppState::new();

    // Multiple panels with independent scroll
    state.set_scroll("main", 10);
    state.set_scroll("sidebar", 5);
    state.set_scroll("footer", 0);

    assert_eq!(state.get_scroll("main"), 10);
    assert_eq!(state.get_scroll("sidebar"), 5);
    assert_eq!(state.get_scroll("footer"), 0);

    // Scroll operations
    state.scroll_down("main", 5);
    assert_eq!(state.get_scroll("main"), 15);

    state.scroll_up("sidebar", 2);
    assert_eq!(state.get_scroll("sidebar"), 3);

    // Other panels unaffected
    assert_eq!(state.get_scroll("footer"), 0);
}

#[test]
fn test_error_status_message_flow() {
    let mut state = AppState::new();

    // Status message flow
    state.set_status("Loading...");
    assert!(state.status.is_some());
    assert!(state.error.is_none());

    // Error replaces status
    state.set_error("Load failed");
    assert!(state.error.is_some());
    assert!(state.status.is_none());

    // Status replaces error
    state.set_status("Retrying...");
    assert!(state.status.is_some());
    assert!(state.error.is_none());

    // Success clears both
    state.clear_status();
    state.clear_error();
    assert!(state.status.is_none());
    assert!(state.error.is_none());
}

#[test]
fn test_command_history_navigation_workflow() {
    let mut state = AppState::new();

    // Build history
    let commands = vec!["help", "status", "quit", "list"];
    for cmd in &commands {
        state.add_command_to_history(cmd.to_string());
    }

    // Navigate up through history
    assert_eq!(state.navigate_history(HistoryDirection::Up), Some("list".to_string()));
    assert_eq!(state.navigate_history(HistoryDirection::Up), Some("quit".to_string()));
    assert_eq!(state.navigate_history(HistoryDirection::Up), Some("status".to_string()));
    assert_eq!(state.navigate_history(HistoryDirection::Up), Some("help".to_string()));

    // Can't go past start
    assert_eq!(state.navigate_history(HistoryDirection::Up), None);

    // Navigate down
    assert_eq!(state.navigate_history(HistoryDirection::Down), Some("status".to_string()));
    assert_eq!(state.navigate_history(HistoryDirection::Down), Some("quit".to_string()));
}

#[test]
fn test_full_mode_cycle() {
    let mut state = AppState::new();

    // Normal -> Command -> Normal
    assert_eq!(state.mode, Mode::Normal);
    state.set_mode(Mode::Command);
    assert_eq!(state.mode, Mode::Command);
    state.set_mode(Mode::Normal);
    assert_eq!(state.mode, Mode::Normal);

    // Normal -> Insert -> Normal
    state.set_mode(Mode::Insert);
    assert_eq!(state.mode, Mode::Insert);
    state.set_mode(Mode::Normal);
    assert_eq!(state.mode, Mode::Normal);

    // Normal -> Visual -> Normal
    state.set_mode(Mode::Visual);
    assert_eq!(state.mode, Mode::Visual);
    state.set_mode(Mode::Normal);
    assert_eq!(state.mode, Mode::Normal);
}

#[test]
fn test_config_env_state_integration() {
    // Clean up first
    env::remove_var("FLOW_APP_LOG_LEVEL");
    env::remove_var("FLOW_APP_METRICS_ENABLED");
    env::remove_var("FLOW_UI_VIM_MODE");
    env::remove_var("FLOW_UI_UPDATE_INTERVAL");

    // Set environment variable
    env::set_var("FLOW_UI_THEME", "custom");

    // Load config with env override
    let config = AppConfig::load().unwrap();
    assert_eq!(config.ui.theme, "custom");

    // Create state
    let state = AppState::new();
    assert!(state.running);

    // Clean up
    env::remove_var("FLOW_UI_THEME");
}

#[test]
fn test_shutdown_cleanup_workflow() {
    let mut state = AppState::new();

    // Active state
    assert!(state.is_running());

    // Set various state
    state.set_mode(Mode::Command);
    state.set_status("Active");
    state.set_scroll("main", 50);
    state.add_command_to_history("test".to_string());

    // Shutdown
    state.shutdown();

    // Verify shutdown
    assert!(!state.is_running());

    // State should still be accessible for cleanup
    assert_eq!(state.mode, Mode::Command);
    assert_eq!(state.get_scroll("main"), 50);
    assert_eq!(state.command_history.len(), 1);
}

#[test]
fn test_dashboard_state_persistence() {
    let mut state = AppState::new();

    // Set state on Overview
    state.set_scroll("main", 10);
    state.set_status("Overview active");

    // Switch to Flow
    state.switch_dashboard(Dashboard::Flow);
    state.set_scroll("main", 20);

    // Scroll positions are independent
    assert_eq!(state.get_scroll("main"), 20);

    // Switch back to Overview
    state.switch_dashboard(Dashboard::Overview);

    // Scroll position persists
    assert_eq!(state.get_scroll("main"), 20);
}

#[test]
fn test_complete_user_workflow() {
    let mut state = AppState::new();

    // 1. Start application (Normal mode, Overview dashboard)
    assert_eq!(state.mode, Mode::Normal);
    assert_eq!(state.dashboard, Dashboard::Overview);

    // 2. Navigate to Flow dashboard (press '2')
    state.switch_dashboard(Dashboard::Flow);
    assert_eq!(state.dashboard, Dashboard::Flow);

    // 3. Scroll through content (press 'j' multiple times)
    state.scroll_down("main", 1);
    state.scroll_down("main", 1);
    state.scroll_down("main", 1);
    assert_eq!(state.get_scroll("main"), 3);

    // 4. Enter command mode (press ':')
    state.set_mode(Mode::Command);
    assert_eq!(state.mode, Mode::Command);

    // 5. Type command
    state.command_buffer = "help".to_string();

    // 6. Execute command (press Enter)
    state.add_command_to_history(state.command_buffer.clone());
    state.set_mode(Mode::Normal);

    // 7. Command executed, back in Normal mode
    assert_eq!(state.mode, Mode::Normal);
    assert!(state.command_buffer.is_empty());
    assert_eq!(state.command_history.len(), 1);

    // 8. Quit application
    state.shutdown();
    assert!(!state.is_running());
}
