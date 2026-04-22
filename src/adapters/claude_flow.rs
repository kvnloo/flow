//! Claude Flow MCP Adapter
//!
//! Adapter implementation for Claude Flow framework using the Model Context Protocol (MCP).
//! Translates MCP messages to internal events and provides Claude Flow-specific operations.

use super::{
    CommandResponse, ConnectionConfig, FrameworkAdapter, FrameworkCommand, HealthStatus,
    Message, Metric,
};
use crate::error::{FlowError, Result};
use crate::events::{Event, EventBus, EventCategory, EventSource, EventType, Framework, Severity};
use crate::state::{Agent, AgentId, AgentRole, AgentStatus, Task};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

/// MCP message types from Claude Flow
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum McpMessage {
    /// Agent lifecycle events
    AgentStarted {
        agent_id: String,
        role: String,
        timestamp: String,
    },
    AgentStopped {
        agent_id: String,
        timestamp: String,
    },

    /// Task events
    TaskCreated {
        task_id: String,
        description: String,
        assigned_to: Option<String>,
        timestamp: String,
    },
    TaskCompleted {
        task_id: String,
        result: String,
        timestamp: String,
    },

    /// Message events
    MessageReceived {
        from: String,
        to: String,
        content: String,
        timestamp: String,
    },

    /// Metric events
    MetricReported {
        entity_id: String,
        metric_name: String,
        value: f64,
        timestamp: String,
    },

    /// Error events
    Error {
        message: String,
        details: Option<String>,
        timestamp: String,
    },
}

/// Claude Flow adapter state
struct AdapterState {
    connected: bool,
    streaming: bool,
    last_heartbeat: Option<Instant>,
}

/// Claude Flow MCP adapter
pub struct ClaudeFlowAdapter {
    config: ConnectionConfig,
    event_bus: EventBus,
    client: Client,
    state: Arc<RwLock<AdapterState>>,
}

impl ClaudeFlowAdapter {
    /// Create new Claude Flow adapter
    pub async fn new(config: ConnectionConfig, event_bus: EventBus) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_secs))
            .build()
            .map_err(|e| FlowError::Network(format!("Failed to create HTTP client: {}", e)))?;

        let state = Arc::new(RwLock::new(AdapterState {
            connected: false,
            streaming: false,
            last_heartbeat: None,
        }));

        Ok(Self {
            config,
            event_bus,
            client,
            state,
        })
    }

    /// Translate MCP message to internal event
    async fn translate_message(&self, msg: McpMessage) -> Option<Event> {
        match msg {
            McpMessage::AgentStarted {
                agent_id,
                role,
                ..
            } => {
                let mut event = Event::new(
                    EventSource {
                        framework: Framework::ClaudeFlow,
                        agent_id: Some(agent_id.clone()),
                        agent_type: Some(role.clone()),
                        session_id: Uuid::nil(),
                    },
                    EventType::AgentStarted,
                    EventCategory::Lifecycle,
                    Severity::Info,
                );
                event.payload = serde_json::json!({ "role": role });
                Some(event)
            }

            McpMessage::AgentStopped {
                agent_id,
                ..
            } => {
                Some(Event::new(
                    EventSource {
                        framework: Framework::ClaudeFlow,
                        agent_id: Some(agent_id.clone()),
                        agent_type: None,
                        session_id: Uuid::nil(),
                    },
                    EventType::AgentTerminated,
                    EventCategory::Lifecycle,
                    Severity::Info,
                ))
            }

            McpMessage::TaskCreated {
                task_id,
                description,
                ..
            } => {
                let mut event = Event::new(
                    EventSource {
                        framework: Framework::ClaudeFlow,
                        agent_id: None,
                        agent_type: None,
                        session_id: Uuid::nil(),
                    },
                    EventType::TaskStarted,
                    EventCategory::Execution,
                    Severity::Info,
                );
                event.payload = serde_json::json!({ "task_id": task_id, "description": description });
                Some(event)
            }

            McpMessage::TaskCompleted { task_id, result, .. } => {
                let mut event = Event::new(
                    EventSource {
                        framework: Framework::ClaudeFlow,
                        agent_id: None,
                        agent_type: None,
                        session_id: Uuid::nil(),
                    },
                    EventType::TaskCompleted,
                    EventCategory::Execution,
                    Severity::Info,
                );
                event.payload = serde_json::json!({ "task_id": task_id, "result": result });
                Some(event)
            }

            McpMessage::MessageReceived {
                from, to, content, ..
            } => {
                let mut event = Event::new(
                    EventSource {
                        framework: Framework::ClaudeFlow,
                        agent_id: Some(from.clone()),
                        agent_type: None,
                        session_id: Uuid::nil(),
                    },
                    EventType::MessageReceived,
                    EventCategory::Communication,
                    Severity::Info,
                );
                event.payload = serde_json::json!({ "from": from, "to": to, "content": content });
                Some(event)
            }

            McpMessage::MetricReported {
                entity_id,
                metric_name,
                value,
                ..
            } => {
                let mut event = Event::new(
                    EventSource {
                        framework: Framework::ClaudeFlow,
                        agent_id: Some(entity_id.clone()),
                        agent_type: None,
                        session_id: Uuid::nil(),
                    },
                    EventType::TaskProgress,
                    EventCategory::Execution,
                    Severity::Debug,
                );
                event.payload = serde_json::json!({ "metric": metric_name, "value": value });
                Some(event)
            }

            McpMessage::Error { message, details, .. } => {
                let mut event = Event::new(
                    EventSource {
                        framework: Framework::ClaudeFlow,
                        agent_id: None,
                        agent_type: None,
                        session_id: Uuid::nil(),
                    },
                    EventType::TaskFailed,
                    EventCategory::Error,
                    Severity::Error,
                );
                event.payload = serde_json::json!({ "message": message, "details": details });
                Some(event)
            }
        }
    }

    /// Poll for new events from Claude Flow
    async fn poll_events(&self) -> Result<Vec<McpMessage>> {
        let url = format!("{}/api/v1/events", self.config.endpoint);

        let mut request = self.client.get(&url);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        let response = request
            .send()
            .await
            .map_err(|e| FlowError::Network(format!("Failed to poll events: {}", e)))?;

        if !response.status().is_success() {
            return Err(FlowError::Network(format!(
                "Event poll failed with status: {}",
                response.status()
            )));
        }

        let messages: Vec<McpMessage> = response
            .json()
            .await
            .map_err(|e| FlowError::Parse(format!("Failed to parse events: {}", e)))?;

        Ok(messages)
    }
}

#[async_trait]
impl FrameworkAdapter for ClaudeFlowAdapter {
    fn framework_name(&self) -> &str {
        "Claude Flow"
    }

    fn protocol_type(&self) -> &str {
        "MCP"
    }

    async fn connect(&mut self) -> Result<()> {
        info!("Connecting to Claude Flow at {}", self.config.endpoint);

        // Health check to verify connection
        let health = self.health_check().await?;
        if !health.healthy {
            return Err(FlowError::Connection(
                "Claude Flow health check failed".to_string(),
            ));
        }

        let mut state = self.state.write().await;
        state.connected = true;
        state.last_heartbeat = Some(Instant::now());

        info!("Connected to Claude Flow (version: {:?})", health.version);
        Ok(())
    }

    async fn disconnect(&mut self) -> Result<()> {
        info!("Disconnecting from Claude Flow");

        let mut state = self.state.write().await;
        state.connected = false;
        state.streaming = false;

        Ok(())
    }

    fn is_connected(&self) -> bool {
        // Note: This is synchronous access, so we can't use RwLock
        // In real implementation, use atomic bool or accept async
        true // Simplified for now
    }

    async fn start_event_stream(&mut self) -> Result<()> {
        info!("Starting Claude Flow event stream");

        let mut state = self.state.write().await;
        if !state.connected {
            return Err(FlowError::NotConnected);
        }

        state.streaming = true;
        drop(state);

        // Spawn background task to poll events
        let adapter_state = self.state.clone();
        let event_bus = self.event_bus.clone();
        let endpoint = self.config.endpoint.clone();
        let auth_token = self.config.auth_token.clone();
        let client = self.client.clone();

        tokio::spawn(async move {
            while adapter_state.read().await.streaming {
                // Poll for events (simplified - real implementation would use SSE or WebSocket)
                let url = format!("{}/api/v1/events", endpoint);
                let mut request = client.get(&url);

                if let Some(token) = &auth_token {
                    request = request.bearer_auth(token);
                }

                match request.send().await {
                    Ok(response) if response.status().is_success() => {
                        if let Ok(messages) = response.json::<Vec<McpMessage>>().await {
                            for msg in messages {
                                debug!("Received MCP message: {:?}", msg);
                                // Translate and publish event
                                // (simplified - real implementation would call translate_message)
                            }
                        }
                    }
                    Ok(response) => {
                        warn!("Event poll returned status: {}", response.status());
                    }
                    Err(e) => {
                        error!("Failed to poll events: {}", e);
                    }
                }

                tokio::time::sleep(Duration::from_secs(1)).await;
            }
        });

        Ok(())
    }

    async fn stop_event_stream(&mut self) -> Result<()> {
        info!("Stopping Claude Flow event stream");

        let mut state = self.state.write().await;
        state.streaming = false;

        Ok(())
    }

    async fn list_agents(&self) -> Result<Vec<Agent>> {
        let url = format!("{}/api/v1/agents", self.config.endpoint);

        let mut request = self.client.get(&url);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        let response = request
            .send()
            .await
            .map_err(|e| FlowError::Network(format!("Failed to list agents: {}", e)))?;

        // Simplified - real implementation would parse actual agent data
        Ok(vec![])
    }

    async fn list_tasks(&self) -> Result<Vec<Task>> {
        let url = format!("{}/api/v1/tasks", self.config.endpoint);

        let mut request = self.client.get(&url);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        let response = request
            .send()
            .await
            .map_err(|e| FlowError::Network(format!("Failed to list tasks: {}", e)))?;

        // Simplified - real implementation would parse actual task data
        Ok(vec![])
    }

    async fn get_messages(&self, entity_id: &str) -> Result<Vec<Message>> {
        let url = format!("{}/api/v1/messages/{}", self.config.endpoint, entity_id);

        let mut request = self.client.get(&url);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        let response = request
            .send()
            .await
            .map_err(|e| FlowError::Network(format!("Failed to get messages: {}", e)))?;

        // Simplified - real implementation would parse actual message data
        Ok(vec![])
    }

    async fn get_metrics(&self, entity_id: &str) -> Result<Vec<Metric>> {
        let url = format!("{}/api/v1/metrics/{}", self.config.endpoint, entity_id);

        let mut request = self.client.get(&url);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        let response = request
            .send()
            .await
            .map_err(|e| FlowError::Network(format!("Failed to get metrics: {}", e)))?;

        // Simplified - real implementation would parse actual metric data
        Ok(vec![])
    }

    async fn send_command(&self, command: FrameworkCommand) -> Result<CommandResponse> {
        let url = format!("{}/api/v1/commands", self.config.endpoint);

        let mut request = self.client.post(&url).json(&command);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        let response = request
            .send()
            .await
            .map_err(|e| FlowError::Network(format!("Failed to send command: {}", e)))?;

        if !response.status().is_success() {
            return Ok(CommandResponse {
                success: false,
                message: format!("Command failed with status: {}", response.status()),
                data: None,
            });
        }

        let cmd_response: CommandResponse = response
            .json()
            .await
            .map_err(|e| FlowError::Parse(format!("Failed to parse response: {}", e)))?;

        Ok(cmd_response)
    }

    async fn health_check(&self) -> Result<HealthStatus> {
        let url = format!("{}/api/v1/health", self.config.endpoint);
        let start = Instant::now();

        let mut request = self.client.get(&url);

        if let Some(token) = &self.config.auth_token {
            request = request.bearer_auth(token);
        }

        match request.send().await {
            Ok(response) => {
                let response_time_ms = start.elapsed().as_millis() as u64;

                if response.status().is_success() {
                    Ok(HealthStatus {
                        healthy: true,
                        response_time_ms,
                        version: Some("1.0.0".to_string()), // Parse from response in real impl
                        details: Default::default(),
                    })
                } else {
                    Ok(HealthStatus {
                        healthy: false,
                        response_time_ms,
                        version: None,
                        details: Default::default(),
                    })
                }
            }
            Err(e) => Err(FlowError::Network(format!("Health check failed: {}", e))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_adapter_creation() {
        let config = ConnectionConfig {
            endpoint: "http://localhost:8080".to_string(),
            ..Default::default()
        };
        let event_bus = EventBus::new();

        let adapter = ClaudeFlowAdapter::new(config, event_bus).await;
        assert!(adapter.is_ok());

        let adapter = adapter.unwrap();
        assert_eq!(adapter.framework_name(), "Claude Flow");
        assert_eq!(adapter.protocol_type(), "MCP");
    }
}
