//! Adapter Integration Tests
//!
//! Tests for framework adapter implementations with mock servers.

use flow_orchestrator_tui::adapters::{
    AdapterFactory, ClaudeFlowAdapter, ConnectionConfig, FrameworkAdapter, FrameworkCommand,
    FrameworkType,
};
use flow_orchestrator_tui::events::EventBus;
use std::collections::HashMap;

#[tokio::test]
async fn test_claude_flow_adapter_creation() {
    let config = ConnectionConfig {
        endpoint: "http://localhost:8080".to_string(),
        auth_token: Some("test-token".to_string()),
        timeout_secs: 5,
        use_tls: false,
        options: HashMap::new(),
    };

    let event_bus = EventBus::new();
    let adapter = ClaudeFlowAdapter::new(config, event_bus).await;

    assert!(adapter.is_ok());
    let adapter = adapter.unwrap();
    assert_eq!(adapter.framework_name(), "Claude Flow");
    assert_eq!(adapter.protocol_type(), "MCP");
}

#[tokio::test]
async fn test_adapter_factory_create_claude_flow() {
    let config = ConnectionConfig {
        endpoint: "http://localhost:8080".to_string(),
        ..Default::default()
    };

    let event_bus = EventBus::new();
    let adapter = AdapterFactory::create(FrameworkType::ClaudeFlow, config, event_bus).await;

    assert!(adapter.is_ok());
    let adapter = adapter.unwrap();
    assert_eq!(adapter.framework_name(), "Claude Flow");
}

#[tokio::test]
async fn test_adapter_factory_create_autogen() {
    let config = ConnectionConfig {
        endpoint: "ws://localhost:8081".to_string(),
        ..Default::default()
    };

    let event_bus = EventBus::new();
    let adapter = AdapterFactory::create(FrameworkType::AutoGen, config, event_bus).await;

    assert!(adapter.is_ok());
    let adapter = adapter.unwrap();
    assert_eq!(adapter.framework_name(), "AutoGen");
    assert_eq!(adapter.protocol_type(), "WebSocket");
}

#[tokio::test]
async fn test_adapter_factory_create_langgraph() {
    let config = ConnectionConfig {
        endpoint: "http://localhost:8082".to_string(),
        ..Default::default()
    };

    let event_bus = EventBus::new();
    let adapter = AdapterFactory::create(FrameworkType::LangGraph, config, event_bus).await;

    assert!(adapter.is_ok());
    let adapter = adapter.unwrap();
    assert_eq!(adapter.framework_name(), "LangGraph");
    assert_eq!(adapter.protocol_type(), "SSE");
}

#[tokio::test]
async fn test_adapter_factory_from_name() {
    let config = ConnectionConfig {
        endpoint: "http://localhost:8080".to_string(),
        ..Default::default()
    };

    let event_bus = EventBus::new();

    // Test valid framework names
    let adapter = AdapterFactory::create_from_name("claude-flow", config.clone(), event_bus.clone()).await;
    assert!(adapter.is_ok());

    let adapter = AdapterFactory::create_from_name("autogen", config.clone(), event_bus.clone()).await;
    assert!(adapter.is_ok());

    let adapter = AdapterFactory::create_from_name("langgraph", config.clone(), event_bus.clone()).await;
    assert!(adapter.is_ok());

    // Test invalid framework name
    let adapter = AdapterFactory::create_from_name("invalid-framework", config, event_bus).await;
    assert!(adapter.is_err());
}

#[tokio::test]
async fn test_framework_type_parsing() {
    assert_eq!(
        FrameworkType::from_str("claude-flow"),
        Some(FrameworkType::ClaudeFlow)
    );
    assert_eq!(
        FrameworkType::from_str("ClaudeFlow"),
        Some(FrameworkType::ClaudeFlow)
    );
    assert_eq!(
        FrameworkType::from_str("autogen"),
        Some(FrameworkType::AutoGen)
    );
    assert_eq!(
        FrameworkType::from_str("langgraph"),
        Some(FrameworkType::LangGraph)
    );
    assert_eq!(
        FrameworkType::from_str("crewai"),
        Some(FrameworkType::CrewAI)
    );
    assert_eq!(
        FrameworkType::from_str("opencode"),
        Some(FrameworkType::OpenCode)
    );
    assert_eq!(FrameworkType::from_str("unknown"), None);
}

#[tokio::test]
async fn test_supported_frameworks() {
    let frameworks = AdapterFactory::supported_frameworks();
    assert_eq!(frameworks.len(), 5);
    assert!(frameworks.contains(&FrameworkType::ClaudeFlow));
    assert!(frameworks.contains(&FrameworkType::AutoGen));
    assert!(frameworks.contains(&FrameworkType::LangGraph));
    assert!(frameworks.contains(&FrameworkType::CrewAI));
    assert!(frameworks.contains(&FrameworkType::OpenCode));
}

#[tokio::test]
async fn test_command_serialization() {
    let cmd = FrameworkCommand::StartAgent {
        agent_id: "agent-1".to_string(),
        config: {
            let mut map = HashMap::new();
            map.insert("model".to_string(), "gpt-4".to_string());
            map
        },
    };

    let json = serde_json::to_string(&cmd).unwrap();
    assert!(json.contains("agent-1"));

    let deserialized: FrameworkCommand = serde_json::from_str(&json).unwrap();
    match deserialized {
        FrameworkCommand::StartAgent { agent_id, config } => {
            assert_eq!(agent_id, "agent-1");
            assert_eq!(config.get("model").unwrap(), "gpt-4");
        }
        _ => panic!("Wrong command type after deserialization"),
    }
}

#[tokio::test]
async fn test_connection_config_defaults() {
    let config = ConnectionConfig::default();
    assert_eq!(config.timeout_secs, 30);
    assert!(config.use_tls);
    assert!(config.options.is_empty());
    assert!(config.endpoint.is_empty());
    assert!(config.auth_token.is_none());
}

// Mock server tests would go here in a real implementation
// For now, we test the adapter interface without actual connections

#[tokio::test]
async fn test_adapter_lifecycle() {
    let config = ConnectionConfig {
        endpoint: "http://localhost:8080".to_string(),
        ..Default::default()
    };

    let event_bus = EventBus::new();
    let mut adapter = ClaudeFlowAdapter::new(config, event_bus).await.unwrap();

    // Note: These will fail without a real server, but test the interface
    // In production, use wiremock or similar for mock HTTP servers

    // Test disconnect (should work even without connection)
    let result = adapter.disconnect().await;
    assert!(result.is_ok());
}
