//! Configuration management for Flow Orchestrator TUI
//!
//! This module handles loading and managing application configuration
//! from TOML files, environment variables, and defaults.

use config::{Config as ConfigLoader, Environment, File};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use crate::error::{FlowError, Result};

/// Main application configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AppConfig {
    /// Application-level settings
    pub app: AppSettings,

    /// UI configuration
    pub ui: UiSettings,

    /// Authentication configuration
    pub auth: AuthSettings,

    /// Framework adapter configurations
    pub adapters: AdapterConfigs,

    /// Metrics configuration
    pub metrics: MetricsSettings,

    /// Logging configuration
    pub logging: LoggingSettings,
}

/// Application-level settings
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AppSettings {
    /// Log level (trace, debug, info, warn, error)
    #[serde(default = "default_log_level")]
    pub log_level: String,

    /// Enable metrics collection
    #[serde(default = "default_true")]
    pub metrics_enabled: bool,

    /// Enable auto-save
    #[serde(default = "default_true")]
    pub auto_save: bool,

    /// Auto-save interval in seconds
    #[serde(default = "default_save_interval")]
    pub save_interval: u64,

    /// Data directory for state persistence
    #[serde(default = "default_data_dir")]
    pub data_dir: PathBuf,
}

/// UI settings
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UiSettings {
    /// Theme name (dark, light, custom)
    #[serde(default = "default_theme")]
    pub theme: String,

    /// UI update interval in milliseconds (16ms = 60fps)
    #[serde(default = "default_update_interval")]
    pub update_interval: u64,

    /// Enable animations
    #[serde(default = "default_true")]
    pub animation_enabled: bool,

    /// Enable Vim-style modal editing
    #[serde(default = "default_true")]
    pub vim_mode: bool,

    /// Layout configuration
    pub layouts: LayoutSettings,
}

/// Layout settings
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LayoutSettings {
    /// Default layout name
    #[serde(default = "default_layout")]
    pub default: String,

    /// Startup layout (last_used, default, or specific name)
    #[serde(default = "default_startup_layout")]
    pub startup_layout: String,
}

/// Authentication settings
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AuthSettings {
    /// Authentication provider
    #[serde(default = "default_auth_provider")]
    pub provider: String,

    /// Enable automatic token refresh
    #[serde(default = "default_true")]
    pub auto_refresh: bool,

    /// OAuth callback port
    #[serde(default = "default_callback_port")]
    pub callback_port: u16,

    /// OAuth timeout in seconds
    #[serde(default = "default_auth_timeout")]
    pub timeout_secs: u64,
}

/// Framework adapter configurations
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AdapterConfigs {
    /// Claude Flow adapter config
    pub claude_flow: Option<AdapterConfig>,

    /// AutoGen adapter config
    pub autogen: Option<AdapterConfig>,

    /// LangGraph adapter config
    pub langgraph: Option<AdapterConfig>,

    /// CrewAI adapter config
    pub crewai: Option<AdapterConfig>,

    /// OpenCode adapter config
    pub opencode: Option<AdapterConfig>,
}

/// Individual adapter configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AdapterConfig {
    /// Whether adapter is enabled
    #[serde(default = "default_false")]
    pub enabled: bool,

    /// Connection type (stdio, websocket, sse, http)
    pub connection: String,

    /// Connection URL (for network-based adapters)
    pub url: Option<String>,

    /// Command to run (for stdio adapters)
    pub command: Option<Vec<String>>,

    /// Enable automatic reconnection
    #[serde(default = "default_true")]
    pub reconnect: bool,

    /// Additional adapter-specific settings
    #[serde(default)]
    pub settings: HashMap<String, serde_json::Value>,
}

/// Metrics settings
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MetricsSettings {
    /// Enable cost tracking
    #[serde(default = "default_true")]
    pub cost_tracking: bool,

    /// Enable token tracking
    #[serde(default = "default_true")]
    pub token_tracking: bool,

    /// Budget warning threshold in USD
    #[serde(default = "default_budget_warning")]
    pub budget_warning: f64,

    /// Metrics retention duration in seconds
    #[serde(default = "default_metrics_retention")]
    pub retention_secs: u64,
}

/// Logging settings
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LoggingSettings {
    /// Log file path
    #[serde(default = "default_log_file")]
    pub file: PathBuf,

    /// Log format (json, pretty, compact)
    #[serde(default = "default_log_format")]
    pub format: String,

    /// Maximum log file size in MB
    #[serde(default = "default_log_max_size")]
    pub max_size_mb: u64,
}

// Default value functions
fn default_log_level() -> String {
    "info".to_string()
}

fn default_true() -> bool {
    true
}

fn default_false() -> bool {
    false
}

fn default_save_interval() -> u64 {
    30 // seconds
}

fn default_data_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("flow-tui")
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_update_interval() -> u64 {
    16 // 60fps
}

fn default_layout() -> String {
    "overview".to_string()
}

fn default_startup_layout() -> String {
    "last_used".to_string()
}

fn default_auth_provider() -> String {
    "openrouter".to_string()
}

fn default_callback_port() -> u16 {
    3000
}

fn default_auth_timeout() -> u64 {
    300 // 5 minutes
}

fn default_budget_warning() -> f64 {
    1.0 // $1 USD
}

fn default_metrics_retention() -> u64 {
    3600 // 1 hour
}

fn default_log_file() -> PathBuf {
    PathBuf::from("/tmp/flow-tui.log")
}

fn default_log_format() -> String {
    "json".to_string()
}

fn default_log_max_size() -> u64 {
    100 // MB
}

impl AppConfig {
    /// Load configuration from default locations
    ///
    /// Priority order:
    /// 1. Environment variables (FLOW_*)
    /// 2. User config file (~/.config/flow-tui/config.toml)
    /// 3. Default values
    pub fn load() -> Result<Self> {
        let config_path = Self::config_path()?;

        let config = ConfigLoader::builder()
            // Load defaults
            .add_source(File::from_str(DEFAULT_CONFIG, config::FileFormat::Toml))
            // Load user config (optional)
            .add_source(File::with_name(&config_path).required(false))
            // Environment overrides (FLOW_APP_LOG_LEVEL, etc.)
            .add_source(Environment::with_prefix("FLOW").separator("_"))
            .build()
            .map_err(|e| FlowError::Config(e.to_string()))?;

        config
            .try_deserialize()
            .map_err(|e| FlowError::Config(e.to_string()))
    }

    /// Get config file path
    fn config_path() -> Result<String> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| FlowError::Config("config directory not found".to_string()))?;

        Ok(config_dir
            .join("flow-tui")
            .join("config.toml")
            .to_string_lossy()
            .to_string())
    }

    /// Save current configuration to file
    pub fn save(&self) -> Result<()> {
        let config_path = Self::config_path()?;
        let config_dir = PathBuf::from(&config_path).parent().unwrap().to_path_buf();

        // Create config directory if it doesn't exist
        std::fs::create_dir_all(&config_dir)?;

        // Serialize to TOML
        let toml_string = toml::to_string_pretty(self)
            .map_err(|e| FlowError::Generic(format!("Failed to serialize config: {}", e)))?;

        // Write to file
        std::fs::write(&config_path, toml_string)?;

        Ok(())
    }
}

/// Default configuration (embedded)
const DEFAULT_CONFIG: &str = r#"
[app]
log_level = "info"
metrics_enabled = true
auto_save = true
save_interval = 30

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

[adapters]

[metrics]
cost_tracking = true
token_tracking = true
budget_warning = 1.0
retention_secs = 3600

[logging]
file = "/tmp/flow-tui.log"
format = "json"
max_size_mb = 100
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AppConfig::load();
        assert!(config.is_ok(), "Should load default config");
    }

    #[test]
    fn test_config_serialization() {
        let config = AppConfig::load().unwrap();
        let serialized = toml::to_string_pretty(&config);
        assert!(serialized.is_ok(), "Should serialize config");
    }
}
