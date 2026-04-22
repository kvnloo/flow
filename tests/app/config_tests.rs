//! Configuration loading integration tests
//!
//! Tests for configuration loading, environment variables, and TOML parsing.

use flow_orchestrator_tui::app::config::{AppConfig, AdapterConfig};
use std::env;

#[test]
fn test_load_default_config() {
    // Clean up any environment variables that might interfere
    env::remove_var("FLOW_UI_THEME");
    env::remove_var("FLOW_APP_LOG_LEVEL");

    let config = AppConfig::load();
    assert!(config.is_ok(), "Should load default config");

    let config = config.unwrap();
    assert_eq!(config.app.log_level, "info");
    assert_eq!(config.ui.theme, "dark");
    assert_eq!(config.ui.update_interval, 16);
    assert!(config.ui.vim_mode);
    assert_eq!(config.auth.provider, "openrouter");
    assert_eq!(config.auth.callback_port, 3000);
}

#[test]
fn test_app_settings_defaults() {
    let config = AppConfig::load().unwrap();

    assert_eq!(config.app.log_level, "info");
    assert!(config.app.metrics_enabled);
    assert!(config.app.auto_save);
    assert_eq!(config.app.save_interval, 30);
    assert!(config.app.data_dir.to_string_lossy().contains("flow-tui"));
}

#[test]
fn test_ui_settings() {
    // Clean env vars
    env::remove_var("FLOW_UI_THEME");
    env::remove_var("FLOW_UI_UPDATE_INTERVAL");

    let config = AppConfig::load().unwrap();

    assert_eq!(config.ui.theme, "dark");
    assert_eq!(config.ui.update_interval, 16); // 60fps
    assert!(config.ui.animation_enabled);
    assert!(config.ui.vim_mode);
    assert_eq!(config.ui.layouts.default, "overview");
    assert_eq!(config.ui.layouts.startup_layout, "last_used");
}

#[test]
fn test_auth_settings() {
    let config = AppConfig::load().unwrap();

    assert_eq!(config.auth.provider, "openrouter");
    assert!(config.auth.auto_refresh);
    assert_eq!(config.auth.callback_port, 3000);
    assert_eq!(config.auth.timeout_secs, 300);
}

#[test]
fn test_metrics_settings() {
    let config = AppConfig::load().unwrap();

    assert!(config.metrics.cost_tracking);
    assert!(config.metrics.token_tracking);
    assert_eq!(config.metrics.budget_warning, 1.0);
    assert_eq!(config.metrics.retention_secs, 3600);
}

#[test]
fn test_logging_settings() {
    let config = AppConfig::load().unwrap();

    assert_eq!(config.logging.format, "json");
    assert_eq!(config.logging.max_size_mb, 100);
}

#[test]
fn test_adapter_configs() {
    let config = AppConfig::load().unwrap();

    // All adapters should be None in default config
    assert!(config.adapters.claude_flow.is_none());
    assert!(config.adapters.autogen.is_none());
    assert!(config.adapters.langgraph.is_none());
    assert!(config.adapters.crewai.is_none());
    assert!(config.adapters.opencode.is_none());
}

#[test]
fn test_config_serialization() {
    let config = AppConfig::load().unwrap();

    let serialized = toml::to_string_pretty(&config);
    assert!(serialized.is_ok(), "Should serialize config to TOML");

    let toml_str = serialized.unwrap();
    assert!(toml_str.contains("[app]"));
    assert!(toml_str.contains("[ui]"));
    assert!(toml_str.contains("[auth]"));
    assert!(toml_str.contains("[metrics]"));
}

#[test]
fn test_environment_override() {
    // Clean any existing vars first
    env::remove_var("FLOW_UI_THEME");
    env::remove_var("FLOW_APP_METRICS_ENABLED");
    env::remove_var("FLOW_UI_VIM_MODE");
    env::remove_var("FLOW_UI_UPDATE_INTERVAL");

    // Set environment variable
    env::set_var("FLOW_APP_LOG_LEVEL", "debug");

    let config = AppConfig::load().unwrap();
    assert_eq!(config.app.log_level, "debug");

    // Clean up
    env::remove_var("FLOW_APP_LOG_LEVEL");
}

#[test]
fn test_environment_nested_override() {
    // Clean any existing vars first
    env::remove_var("FLOW_APP_LOG_LEVEL");
    env::remove_var("FLOW_APP_METRICS_ENABLED");
    env::remove_var("FLOW_UI_VIM_MODE");

    env::set_var("FLOW_UI_THEME", "light");
    env::set_var("FLOW_UI_UPDATE_INTERVAL", "32");

    let config = AppConfig::load().unwrap();
    assert_eq!(config.ui.theme, "light");
    assert_eq!(config.ui.update_interval, 32);

    // Clean up
    env::remove_var("FLOW_UI_THEME");
    env::remove_var("FLOW_UI_UPDATE_INTERVAL");
}

#[test]
fn test_environment_bool_override() {
    // Clean any existing vars first
    env::remove_var("FLOW_APP_LOG_LEVEL");
    env::remove_var("FLOW_UI_THEME");
    env::remove_var("FLOW_UI_UPDATE_INTERVAL");

    env::set_var("FLOW_APP_METRICS_ENABLED", "false");
    env::set_var("FLOW_UI_VIM_MODE", "false");

    let config = AppConfig::load().unwrap();
    assert!(!config.app.metrics_enabled);
    assert!(!config.ui.vim_mode);

    // Clean up
    env::remove_var("FLOW_APP_METRICS_ENABLED");
    env::remove_var("FLOW_UI_VIM_MODE");
}

#[test]
fn test_config_save_and_load() {
    use tempfile::tempdir;
    use std::path::PathBuf;

    let dir = tempdir().unwrap();
    let config_path = dir.path().join("config.toml");

    // Create a config
    let mut config = AppConfig::load().unwrap();
    config.app.log_level = "trace".to_string();
    config.ui.theme = "custom".to_string();

    // Serialize to file
    let toml_str = toml::to_string_pretty(&config).unwrap();
    std::fs::write(&config_path, toml_str).unwrap();

    // Load from file
    let loaded_config: AppConfig = toml::from_str(
        &std::fs::read_to_string(&config_path).unwrap()
    ).unwrap();

    assert_eq!(loaded_config.app.log_level, "trace");
    assert_eq!(loaded_config.ui.theme, "custom");
}

#[test]
fn test_adapter_config_structure() {
    let adapter = AdapterConfig {
        enabled: true,
        connection: "stdio".to_string(),
        url: None,
        command: Some(vec!["npx".to_string(), "claude-flow".to_string()]),
        reconnect: true,
        settings: std::collections::HashMap::new(),
    };

    assert!(adapter.enabled);
    assert_eq!(adapter.connection, "stdio");
    assert!(adapter.url.is_none());
    assert_eq!(adapter.command.as_ref().unwrap()[0], "npx");
    assert!(adapter.reconnect);
}

#[test]
fn test_config_with_adapter() {
    let config_str = r#"
        [app]
        log_level = "info"

        [ui]
        theme = "dark"
        update_interval = 16
        animation_enabled = true
        vim_mode = true

        [ui.layouts]
        default = "overview"
        startup_layout = "last_used"

        [auth]
        provider = "openrouter"
        auto_refresh = true
        callback_port = 3000
        timeout_secs = 300

        [metrics]
        cost_tracking = true
        token_tracking = true
        budget_warning = 1.0
        retention_secs = 3600

        [logging]
        file = "/tmp/flow-tui.log"
        format = "json"
        max_size_mb = 100

        [adapters.claude_flow]
        enabled = true
        connection = "stdio"
        command = ["npx", "claude-flow@alpha", "mcp", "start"]
        reconnect = true
    "#;

    let config: AppConfig = toml::from_str(config_str).unwrap();

    assert!(config.adapters.claude_flow.is_some());
    let adapter = config.adapters.claude_flow.unwrap();
    assert!(adapter.enabled);
    assert_eq!(adapter.connection, "stdio");
    assert_eq!(adapter.command.unwrap()[0], "npx");
}

#[test]
fn test_partial_config_with_defaults() {
    let partial_config = r#"
        [app]
        log_level = "warn"

        [ui]
        theme = "light"
    "#;

    // This would normally merge with defaults via the config builder
    let config: Result<AppConfig, _> = toml::from_str(partial_config);
    // Partial configs without all required fields will fail direct deserialization
    assert!(config.is_err());
}

#[test]
fn test_invalid_config_handling() {
    let invalid_config = r#"
        [app]
        log_level = 12345  # Should be string
    "#;

    let result: Result<AppConfig, _> = toml::from_str(invalid_config);
    assert!(result.is_err());
}
