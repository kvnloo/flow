//! Error types for Flow Orchestrator TUI
//!
//! This module defines all error types used throughout the application,
//! following Rust best practices with thiserror for error definitions.

use thiserror::Error;

/// Main result type used throughout the application
pub type Result<T> = std::result::Result<T, FlowError>;

/// Top-level error type for Flow Orchestrator
#[derive(Error, Debug)]
pub enum FlowError {
    /// Authentication-related errors
    #[error("Authentication error: {0}")]
    Auth(#[from] AuthError),

    /// Framework adapter errors
    #[error("Adapter error ({adapter}): {message}")]
    Adapter { adapter: String, message: String },

    /// Network communication errors
    #[error("Network error: {0}")]
    Network(String),

    /// Connection errors
    #[error("Connection error: {0}")]
    Connection(String),

    /// Parse errors
    #[error("Parse error: {0}")]
    Parse(String),

    /// Not connected to framework
    #[error("Not connected to framework")]
    NotConnected,

    /// State management errors
    #[error("State error: {0}")]
    State(String),

    /// UI rendering errors
    #[error("UI error: {0}")]
    Ui(String),

    /// Configuration errors
    #[error("Configuration error: {0}")]
    Config(String),

    /// I/O errors
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    /// Serialization errors
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// Event system errors
    #[error("Event error: {0}")]
    Event(String),

    /// Generic error with context
    #[error("{0}")]
    Generic(String),
}

/// Authentication-specific errors
#[derive(Error, Debug)]
pub enum AuthError {
    /// PKCE code generation failed
    #[error("PKCE generation failed")]
    PkceGeneration,

    /// OAuth callback server timeout
    #[error("OAuth callback timeout after {timeout_secs} seconds")]
    CallbackTimeout { timeout_secs: u64 },

    /// Token exchange with OAuth provider failed
    #[error("Token exchange failed: {0}")]
    TokenExchange(String),

    /// System keyring access failed
    #[error("Keyring access failed: {0}")]
    Keyring(String),

    /// API key validation failed
    #[error("API key validation failed: {0}")]
    InvalidApiKey(String),

    /// Missing credentials
    #[error("Missing credentials")]
    MissingCredentials,
}

/// Adapter-specific errors
#[derive(Error, Debug)]
pub enum AdapterError {
    /// Connection to framework failed
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    /// Framework initialization failed
    #[error("Initialization failed: {0}")]
    InitializationFailed(String),

    /// Event stream closed unexpectedly
    #[error("Event stream closed")]
    StreamClosed,

    /// Protocol error
    #[error("Protocol error: {0}")]
    ProtocolError(String),

    /// Timeout waiting for response
    #[error("Operation timeout after {timeout_ms}ms")]
    Timeout { timeout_ms: u64 },
}

impl FlowError {
    /// Create an adapter error
    pub fn adapter(adapter: impl Into<String>, message: impl Into<String>) -> Self {
        Self::Adapter {
            adapter: adapter.into(),
            message: message.into(),
        }
    }

    /// Create a state error
    pub fn state(message: impl Into<String>) -> Self {
        Self::State(message.into())
    }

    /// Create a UI error
    pub fn ui(message: impl Into<String>) -> Self {
        Self::Ui(message.into())
    }

    /// Create an event error
    pub fn event(message: impl Into<String>) -> Self {
        Self::Event(message.into())
    }

    /// Create a generic error
    pub fn generic(message: impl Into<String>) -> Self {
        Self::Generic(message.into())
    }

    /// Create a network error
    pub fn network(message: impl Into<String>) -> Self {
        Self::Network(message.into())
    }

    /// Create a connection error
    pub fn connection(message: impl Into<String>) -> Self {
        Self::Connection(message.into())
    }

    /// Create a parse error
    pub fn parse(message: impl Into<String>) -> Self {
        Self::Parse(message.into())
    }

    /// Create a config error from string
    pub fn config(message: impl Into<String>) -> Self {
        Self::Config(message.into())
    }
}

// Implement From for reqwest::Error to FlowError::Network
impl From<reqwest::Error> for FlowError {
    fn from(err: reqwest::Error) -> Self {
        Self::Network(err.to_string())
    }
}

// Implement From for config::ConfigError to FlowError::Config
impl From<config::ConfigError> for FlowError {
    fn from(err: config::ConfigError) -> Self {
        Self::Config(err.to_string())
    }
}

/// Helper trait for adding context to errors
pub trait ErrorContext<T> {
    /// Add context to an error
    fn context(self, context: impl Into<String>) -> Result<T>;
}

impl<T, E> ErrorContext<T> for std::result::Result<T, E>
where
    E: std::error::Error + Send + Sync + 'static,
{
    fn context(self, context: impl Into<String>) -> Result<T> {
        self.map_err(|e| FlowError::Generic(format!("{}: {}", context.into(), e)))
    }
}
