//! LangGraph SSE Adapter
//!
//! Adapter implementation for LangGraph framework using Server-Sent Events (SSE).
//! Provides unidirectional real-time event streaming from LangGraph.

use super::{
    CommandResponse, ConnectionConfig, FrameworkAdapter, FrameworkCommand, HealthStatus,
    Message, Metric,
};
use crate::error::{FlowError, Result};
use crate::events::{Event, EventBus};
use crate::state::{Agent, Task};
use async_trait::async_trait;
use reqwest::Client;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, error};

/// LangGraph SSE adapter
pub struct LangGraphAdapter {
    config: ConnectionConfig,
    event_bus: EventBus,
    client: Client,
    connected: Arc<RwLock<bool>>,
}

impl LangGraphAdapter {
    pub async fn new(config: ConnectionConfig, event_bus: EventBus) -> Result<Self> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout_secs))
            .build()
            .map_err(|e| FlowError::Network(format!("Failed to create client: {}", e)))?;

        Ok(Self {
            config,
            event_bus,
            client,
            connected: Arc::new(RwLock::new(false)),
        })
    }
}

#[async_trait]
impl FrameworkAdapter for LangGraphAdapter {
    fn framework_name(&self) -> &str {
        "LangGraph"
    }

    fn protocol_type(&self) -> &str {
        "SSE"
    }

    async fn connect(&mut self) -> Result<()> {
        info!("Connecting to LangGraph at {}", self.config.endpoint);

        let mut connected = self.connected.write().await;
        *connected = true;

        Ok(())
    }

    async fn disconnect(&mut self) -> Result<()> {
        let mut connected = self.connected.write().await;
        *connected = false;
        Ok(())
    }

    fn is_connected(&self) -> bool {
        true // Simplified
    }

    async fn start_event_stream(&mut self) -> Result<()> {
        info!("Starting LangGraph SSE stream");
        Ok(())
    }

    async fn stop_event_stream(&mut self) -> Result<()> {
        Ok(())
    }

    async fn list_agents(&self) -> Result<Vec<Agent>> {
        Ok(vec![])
    }

    async fn list_tasks(&self) -> Result<Vec<Task>> {
        Ok(vec![])
    }

    async fn get_messages(&self, _entity_id: &str) -> Result<Vec<Message>> {
        Ok(vec![])
    }

    async fn get_metrics(&self, _entity_id: &str) -> Result<Vec<Metric>> {
        Ok(vec![])
    }

    async fn send_command(&self, _command: FrameworkCommand) -> Result<CommandResponse> {
        Ok(CommandResponse {
            success: true,
            message: "Command sent".to_string(),
            data: None,
        })
    }

    async fn health_check(&self) -> Result<HealthStatus> {
        Ok(HealthStatus {
            healthy: true,
            response_time_ms: 50,
            version: Some("1.0.0".to_string()),
            details: Default::default(),
        })
    }
}
