//! Adapter Factory
//!
//! Factory for creating framework adapters based on configuration.
//! Supports dynamic instantiation of adapters for different frameworks.

use super::{
    AutoGenAdapter, ClaudeFlowAdapter, ConnectionConfig, FrameworkAdapter, LangGraphAdapter,
};
use crate::error::{FlowError, Result};
use crate::events::EventBus;
use std::sync::Arc;

/// Supported framework types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FrameworkType {
    ClaudeFlow,
    AutoGen,
    LangGraph,
    CrewAI,
    OpenCode,
}

impl FrameworkType {
    /// Parse framework type from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "claude-flow" | "claudeflow" => Some(Self::ClaudeFlow),
            "autogen" => Some(Self::AutoGen),
            "langgraph" => Some(Self::LangGraph),
            "crewai" => Some(Self::CrewAI),
            "opencode" => Some(Self::OpenCode),
            _ => None,
        }
    }

    /// Get display name
    pub fn display_name(&self) -> &str {
        match self {
            Self::ClaudeFlow => "Claude Flow",
            Self::AutoGen => "AutoGen",
            Self::LangGraph => "LangGraph",
            Self::CrewAI => "CrewAI",
            Self::OpenCode => "OpenCode",
        }
    }
}

/// Adapter factory for creating framework adapters
pub struct AdapterFactory;

impl AdapterFactory {
    /// Create adapter for specified framework type
    pub async fn create(
        framework: FrameworkType,
        config: ConnectionConfig,
        event_bus: EventBus,
    ) -> Result<Arc<dyn FrameworkAdapter>> {
        match framework {
            FrameworkType::ClaudeFlow => {
                let adapter = ClaudeFlowAdapter::new(config, event_bus).await?;
                Ok(Arc::new(adapter) as Arc<dyn FrameworkAdapter>)
            }

            FrameworkType::AutoGen => {
                let adapter = AutoGenAdapter::new(config, event_bus).await?;
                Ok(Arc::new(adapter) as Arc<dyn FrameworkAdapter>)
            }

            FrameworkType::LangGraph => {
                let adapter = LangGraphAdapter::new(config, event_bus).await?;
                Ok(Arc::new(adapter) as Arc<dyn FrameworkAdapter>)
            }

            FrameworkType::CrewAI => {
                // CrewAI uses WebSocket like AutoGen
                let adapter = AutoGenAdapter::new(config, event_bus).await?;
                Ok(Arc::new(adapter) as Arc<dyn FrameworkAdapter>)
            }

            FrameworkType::OpenCode => {
                // OpenCode uses MCP like Claude Flow
                let adapter = ClaudeFlowAdapter::new(config, event_bus).await?;
                Ok(Arc::new(adapter) as Arc<dyn FrameworkAdapter>)
            }
        }
    }

    /// Create adapter from framework name string
    pub async fn create_from_name(
        framework_name: &str,
        config: ConnectionConfig,
        event_bus: EventBus,
    ) -> Result<Arc<dyn FrameworkAdapter>> {
        let framework_type = FrameworkType::from_str(framework_name).ok_or_else(|| {
            FlowError::Config(format!("Unknown framework type: {}", framework_name))
        })?;

        Self::create(framework_type, config, event_bus).await
    }

    /// Get list of supported frameworks
    pub fn supported_frameworks() -> Vec<FrameworkType> {
        vec![
            FrameworkType::ClaudeFlow,
            FrameworkType::AutoGen,
            FrameworkType::LangGraph,
            FrameworkType::CrewAI,
            FrameworkType::OpenCode,
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_framework_type_from_str() {
        assert_eq!(
            FrameworkType::from_str("claude-flow"),
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
        assert_eq!(FrameworkType::from_str("unknown"), None);
    }

    #[test]
    fn test_framework_display_name() {
        assert_eq!(FrameworkType::ClaudeFlow.display_name(), "Claude Flow");
        assert_eq!(FrameworkType::AutoGen.display_name(), "AutoGen");
        assert_eq!(FrameworkType::LangGraph.display_name(), "LangGraph");
    }

    #[tokio::test]
    async fn test_factory_create() {
        let config = ConnectionConfig::default();
        let event_bus = EventBus::new();

        let adapter = AdapterFactory::create(FrameworkType::ClaudeFlow, config, event_bus).await;
        assert!(adapter.is_ok());

        let adapter = adapter.unwrap();
        assert_eq!(adapter.framework_name(), "Claude Flow");
    }
}
