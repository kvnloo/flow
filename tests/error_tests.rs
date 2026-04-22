//! Error type integration tests
//!
//! Tests for error types, error propagation, and error context.

use flow_orchestrator_tui::error::{FlowError, AuthError, AdapterError, Result, ErrorContext};

#[test]
fn test_error_creation() {
    let err = FlowError::state("Invalid state transition");
    assert!(err.to_string().contains("State error"));
    assert!(err.to_string().contains("Invalid state transition"));

    let err = FlowError::ui("Render failed");
    assert!(err.to_string().contains("UI error"));

    let err = FlowError::event("Event dispatch failed");
    assert!(err.to_string().contains("Event error"));

    let err = FlowError::generic("Something went wrong");
    assert!(err.to_string().contains("Something went wrong"));
}

#[test]
fn test_adapter_error_creation() {
    let err = FlowError::adapter("claude-flow", "Connection refused");
    assert!(err.to_string().contains("claude-flow"));
    assert!(err.to_string().contains("Connection refused"));
}

#[test]
fn test_auth_error_types() {
    let err = AuthError::PkceGeneration;
    assert!(err.to_string().contains("PKCE"));

    let err = AuthError::CallbackTimeout { timeout_secs: 300 };
    assert!(err.to_string().contains("300 seconds"));

    let err = AuthError::TokenExchange("Invalid grant".to_string());
    assert!(err.to_string().contains("Token exchange"));
    assert!(err.to_string().contains("Invalid grant"));

    let err = AuthError::Keyring("Access denied".to_string());
    assert!(err.to_string().contains("Keyring"));

    let err = AuthError::InvalidApiKey("Malformed key".to_string());
    assert!(err.to_string().contains("API key validation"));

    let err = AuthError::MissingCredentials;
    assert!(err.to_string().contains("Missing credentials"));
}

#[test]
fn test_adapter_error_types() {
    let err = AdapterError::ConnectionFailed("Network unreachable".to_string());
    assert!(err.to_string().contains("Connection failed"));

    let err = AdapterError::InitializationFailed("Invalid config".to_string());
    assert!(err.to_string().contains("Initialization failed"));

    let err = AdapterError::StreamClosed;
    assert!(err.to_string().contains("Event stream closed"));

    let err = AdapterError::ProtocolError("Invalid message format".to_string());
    assert!(err.to_string().contains("Protocol error"));

    let err = AdapterError::Timeout { timeout_ms: 5000 };
    assert!(err.to_string().contains("5000ms"));
}

#[test]
fn test_error_conversion() {
    // IO error conversion
    let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "File not found");
    let flow_err: FlowError = io_err.into();
    assert!(flow_err.to_string().contains("IO error"));

    // Auth error conversion
    let auth_err = AuthError::MissingCredentials;
    let flow_err: FlowError = auth_err.into();
    assert!(flow_err.to_string().contains("Authentication error"));
}

#[test]
fn test_error_context_trait() {
    let result: std::result::Result<(), std::io::Error> =
        Err(std::io::Error::new(std::io::ErrorKind::NotFound, "config.toml"));

    let contexted: Result<()> = result.context("Failed to load configuration");

    assert!(contexted.is_err());
    let err = contexted.unwrap_err();
    assert!(err.to_string().contains("Failed to load configuration"));
    assert!(err.to_string().contains("config.toml"));
}

#[test]
fn test_error_propagation() {
    fn inner_fn() -> Result<String> {
        Err(FlowError::state("Invalid state"))
    }

    fn outer_fn() -> Result<String> {
        inner_fn()?;
        Ok("success".to_string())
    }

    let result = outer_fn();
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Invalid state"));
}

#[test]
fn test_error_matching() {
    let err = FlowError::state("test");

    match err {
        FlowError::State(_) => {
            // Expected
        }
        _ => panic!("Wrong error type"),
    }
}

#[test]
fn test_error_chain() {
    let io_err = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "Access denied");
    let result: std::result::Result<(), _> = Err(io_err);

    let flow_result: Result<()> = result
        .context("Failed to write file")
        .context("Configuration save failed");

    assert!(flow_result.is_err());
    let err_msg = flow_result.unwrap_err().to_string();
    assert!(err_msg.contains("Configuration save failed"));
    assert!(err_msg.contains("Failed to write file"));
}

#[test]
fn test_serialization_error_conversion() {
    let json_err = serde_json::from_str::<serde_json::Value>("invalid json");
    assert!(json_err.is_err());

    let flow_err: FlowError = json_err.unwrap_err().into();
    assert!(flow_err.to_string().contains("Serialization error"));
}

#[cfg(feature = "reqwest")]
#[test]
fn test_network_error_conversion() {
    // Network errors require an actual network call, so we test the type exists
    let _ = FlowError::Network;
}
