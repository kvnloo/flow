//! OpenRouter API client
//!
//! This module provides the API client for interacting with OpenRouter's
//! chat completion and authentication endpoints.

use anyhow::{Context, Result};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::time::Duration;

use super::token::Token;

const OPENROUTER_API_BASE: &str = "https://openrouter.ai/api/v1";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// OpenRouter API client
pub struct OpenRouterClient {
    client: Client,
    token: Token,
}

impl OpenRouterClient {
    /// Create a new API client with the given token
    pub fn new(token: Token) -> Self {
        let client = Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .connect_timeout(CONNECT_TIMEOUT)
            .https_only(true)
            .build()
            .expect("Failed to create HTTP client");

        Self { client, token }
    }

    /// Get the current token
    pub fn token(&self) -> &Token {
        &self.token
    }

    /// Update the token (e.g., after refresh)
    pub fn set_token(&mut self, token: Token) {
        self.token = token;
    }

    /// Make a chat completion request
    ///
    /// # Arguments
    /// - `model`: Model identifier (e.g., "anthropic/claude-3.5-sonnet")
    /// - `messages`: Conversation messages
    ///
    /// # Returns
    /// Chat completion response with generated text
    pub async fn chat_completion(
        &self,
        model: &str,
        messages: Vec<ChatMessage>,
    ) -> Result<ChatResponse> {
        let request = ChatRequest {
            model: model.to_string(),
            messages,
        };

        let response = self
            .client
            .post(format!("{}/chat/completions", OPENROUTER_API_BASE))
            .header("Authorization", self.token.auth_header())
            .json(&request)
            .send()
            .await
            .context("Failed to send chat request")?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());

            return Err(anyhow::anyhow!(
                "Chat request failed with status {}: {}",
                status,
                error_text
            ));
        }

        response
            .json()
            .await
            .context("Failed to parse chat response")
    }

    /// List available models
    pub async fn list_models(&self) -> Result<Vec<Model>> {
        let response = self
            .client
            .get(format!("{}/models", OPENROUTER_API_BASE))
            .header("Authorization", self.token.auth_header())
            .send()
            .await
            .context("Failed to fetch models")?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Failed to fetch models: {}",
                response.status()
            ));
        }

        let models_response: ModelsResponse = response
            .json()
            .await
            .context("Failed to parse models response")?;

        Ok(models_response.data)
    }

    /// Get API key information (rate limits, usage, etc.)
    pub async fn get_key_info(&self) -> Result<KeyInfo> {
        let response = self
            .client
            .get(format!("{}/auth/key", OPENROUTER_API_BASE))
            .header("Authorization", self.token.auth_header())
            .send()
            .await
            .context("Failed to fetch key info")?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Failed to get key info: {}",
                response.status()
            ));
        }

        let key_response: KeyInfoResponse = response
            .json()
            .await
            .context("Failed to parse key info")?;

        Ok(key_response.data)
    }
}

/// Exchange authorization code for access token
///
/// This is called after receiving the OAuth callback with the authorization code.
pub async fn exchange_code(code: &str, code_verifier: &str) -> Result<Token> {
    let client = Client::new();

    let request = TokenRequest {
        code: code.to_string(),
        code_verifier: code_verifier.to_string(),
    };

    let response = client
        .post(format!("{}/auth/keys", OPENROUTER_API_BASE))
        .json(&request)
        .send()
        .await
        .context("Failed to exchange code for token")?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());

        return Err(anyhow::anyhow!(
            "Token exchange failed with status {}: {}",
            status,
            error_text
        ));
    }

    let token_response: TokenResponse = response
        .json()
        .await
        .context("Failed to parse token response")?;

    Ok(Token::new(token_response.key))
}

/// Validate if a token is still valid
pub async fn validate_token(access_token: &str) -> Result<bool> {
    let client = Client::new();

    let response = client
        .get(format!("{}/auth/key", OPENROUTER_API_BASE))
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .context("Failed to validate token")?;

    Ok(response.status() == StatusCode::OK)
}

// === Request/Response Types ===

#[derive(Serialize)]
struct TokenRequest {
    code: String,
    code_verifier: String,
}

#[derive(Deserialize)]
struct TokenResponse {
    key: String,
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
}

/// Chat message in a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

impl ChatMessage {
    /// Create a user message
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: "user".to_string(),
            content: content.into(),
        }
    }

    /// Create an assistant message
    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: "assistant".to_string(),
            content: content.into(),
        }
    }

    /// Create a system message
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: "system".to_string(),
            content: content.into(),
        }
    }
}

/// Chat completion response
#[derive(Debug, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub model: String,
    pub choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
pub struct Choice {
    pub message: ChatMessage,
    pub finish_reason: String,
}

/// Model information
#[derive(Debug, Deserialize)]
pub struct Model {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub pricing: Pricing,
}

#[derive(Debug, Deserialize)]
pub struct Pricing {
    pub prompt: String,
    pub completion: String,
}

#[derive(Deserialize)]
struct ModelsResponse {
    data: Vec<Model>,
}

/// API key information
#[derive(Debug, Deserialize)]
pub struct KeyInfo {
    pub label: String,
    pub usage: f64,
    pub limit: Option<f64>,
    pub is_free_tier: bool,
    pub rate_limit: RateLimit,
}

#[derive(Debug, Deserialize)]
pub struct RateLimit {
    pub requests: u32,
    pub interval: String,
}

#[derive(Deserialize)]
struct KeyInfoResponse {
    data: KeyInfo,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chat_message_constructors() {
        let user_msg = ChatMessage::user("Hello");
        assert_eq!(user_msg.role, "user");
        assert_eq!(user_msg.content, "Hello");

        let assistant_msg = ChatMessage::assistant("Hi there");
        assert_eq!(assistant_msg.role, "assistant");

        let system_msg = ChatMessage::system("You are helpful");
        assert_eq!(system_msg.role, "system");
    }

    #[test]
    fn test_token_auth_header() {
        let token = Token::new("sk-or-v1-test".to_string());
        assert_eq!(token.auth_header(), "Bearer sk-or-v1-test");
    }
}
