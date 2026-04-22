//! Authentication module for Flow Orchestrator TUI
//!
//! This module handles OAuth PKCE authentication with OpenRouter,
//! secure token storage, and API client functionality.

pub mod callback;
pub mod oauth;
pub mod openrouter;
pub mod storage;
pub mod token;

use anyhow::{Context, Result};
use std::time::Duration;
use tokio::time::timeout;

pub use openrouter::{ChatMessage, ChatResponse, OpenRouterClient};
pub use token::Token;

const AUTH_TIMEOUT: Duration = Duration::from_secs(300); // 5 minutes
const SERVICE_NAME: &str = "flow-orchestrator";

/// Main authentication manager
pub struct AuthManager {
    client: Option<OpenRouterClient>,
}

impl AuthManager {
    /// Create a new authentication manager
    pub fn new() -> Self {
        Self { client: None }
    }

    /// Authenticate with OpenRouter using OAuth PKCE flow
    ///
    /// This will:
    /// 1. Check for stored credentials
    /// 2. If valid, return existing client
    /// 3. If not, initiate OAuth PKCE flow
    /// 4. Store credentials securely
    pub async fn authenticate(&mut self) -> Result<()> {
        // Try to load existing token
        if let Ok(token) = storage::get_stored_token() {
            if !token.is_expired() {
                // Validate token is still valid
                if openrouter::validate_token(&token.access_token).await? {
                    tracing::info!("Using existing valid token");
                    self.client = Some(OpenRouterClient::new(token));
                    return Ok(());
                }
            }
        }

        tracing::info!("Starting OAuth PKCE authentication flow");

        // Generate PKCE parameters
        let (code_verifier, code_challenge) = oauth::generate_pkce_params()?;

        // Start callback server in background
        let callback_handle = tokio::spawn(async move { callback::start_server().await });

        // Open browser for authorization
        let auth_url = oauth::build_auth_url(&code_challenge)?;
        tracing::info!("Opening browser for authorization: {}", auth_url);

        open_browser(&auth_url)?;

        // Wait for callback with timeout
        let auth_code = timeout(AUTH_TIMEOUT, callback_handle)
            .await
            .context("Authentication timeout - did you complete authorization in browser?")??
            .context("Failed to receive authorization code")?;

        tracing::info!("Received authorization code, exchanging for token");

        // Exchange code for token
        let token = openrouter::exchange_code(&auth_code, &code_verifier).await?;

        // Store token securely
        storage::store_token(&token)?;

        // Create client
        self.client = Some(OpenRouterClient::new(token));

        tracing::info!("✓ Authentication successful!");
        Ok(())
    }

    /// Get the API client (must authenticate first)
    pub fn client(&self) -> Result<&OpenRouterClient> {
        self.client
            .as_ref()
            .context("Not authenticated. Call authenticate() first.")
    }

    /// Check if currently authenticated
    pub fn is_authenticated(&self) -> bool {
        self.client.is_some()
    }

    /// Logout and clear stored credentials
    pub fn logout(&mut self) -> Result<()> {
        storage::delete_token()?;
        self.client = None;
        tracing::info!("✓ Logged out successfully");
        Ok(())
    }

    /// Get authentication status information
    pub async fn status(&self) -> Result<AuthStatus> {
        match &self.client {
            Some(client) => {
                let token = client.token();
                let is_valid = openrouter::validate_token(&token.access_token).await?;

                Ok(AuthStatus {
                    authenticated: true,
                    token_valid: is_valid,
                    expires_at: token.expires_at,
                })
            }
            None => Ok(AuthStatus {
                authenticated: false,
                token_valid: false,
                expires_at: None,
            }),
        }
    }
}

impl Default for AuthManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Authentication status information
#[derive(Debug, Clone)]
pub struct AuthStatus {
    pub authenticated: bool,
    pub token_valid: bool,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Open browser to URL
fn open_browser(url: &str) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .context("Failed to open browser")?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .context("Failed to open browser")?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/C", "start", url])
            .spawn()
            .context("Failed to open browser")?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_manager_creation() {
        let manager = AuthManager::new();
        assert!(!manager.is_authenticated());
    }

    #[tokio::test]
    async fn test_auth_status_unauthenticated() {
        let manager = AuthManager::new();
        let status = manager.status().await.unwrap();
        assert!(!status.authenticated);
        assert!(!status.token_valid);
    }
}
