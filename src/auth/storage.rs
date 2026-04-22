//! Secure token storage using system keyring
//!
//! This module provides platform-independent secure storage for OAuth tokens
//! using the system keyring (Keychain on macOS, Credential Manager on Windows,
//! Secret Service on Linux).

use anyhow::{Context, Result};
use keyring::Entry;
use serde::{Deserialize, Serialize};

use super::token::Token;

const SERVICE_NAME: &str = "flow-orchestrator";
const TOKEN_KEY: &str = "openrouter-token";

/// Stored token data (serialized to JSON)
#[derive(Debug, Serialize, Deserialize)]
struct StoredToken {
    access_token: String,
    refresh_token: Option<String>,
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
    token_type: String,
}

impl From<&Token> for StoredToken {
    fn from(token: &Token) -> Self {
        Self {
            access_token: token.access_token.clone(),
            refresh_token: token.refresh_token.clone(),
            expires_at: token.expires_at,
            token_type: token.token_type.clone(),
        }
    }
}

impl From<StoredToken> for Token {
    fn from(stored: StoredToken) -> Self {
        Self {
            access_token: stored.access_token,
            refresh_token: stored.refresh_token,
            expires_at: stored.expires_at,
            token_type: stored.token_type,
        }
    }
}

/// Store token securely in system keyring
///
/// # Platform-Specific Storage
/// - **macOS**: Keychain
/// - **Windows**: Credential Manager
/// - **Linux**: Secret Service API (GNOME Keyring, KWallet) or keyutils
///
/// # Security
/// Tokens are encrypted by the OS and protected by user authentication.
pub fn store_token(token: &Token) -> Result<()> {
    let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)
        .context("Failed to create keyring entry")?;

    let stored = StoredToken::from(token);
    let json = serde_json::to_string(&stored)
        .context("Failed to serialize token")?;

    entry
        .set_password(&json)
        .context("Failed to store token in keyring. On Linux, ensure gnome-keyring or kwallet is installed.")?;

    tracing::info!("Token stored securely in system keyring");
    Ok(())
}

/// Retrieve token from system keyring
///
/// # Errors
/// Returns error if:
/// - No token is stored
/// - Keyring is inaccessible
/// - Stored data is corrupted
pub fn get_stored_token() -> Result<Token> {
    let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)
        .context("Failed to create keyring entry")?;

    let json = entry
        .get_password()
        .context("No stored token found in keyring")?;

    let stored: StoredToken = serde_json::from_str(&json)
        .context("Failed to parse stored token (corrupted data)")?;

    Ok(stored.into())
}

/// Delete token from system keyring
///
/// This is called during logout or when the token becomes invalid.
pub fn delete_token() -> Result<()> {
    let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)
        .context("Failed to create keyring entry")?;

    entry
        .delete_password()
        .context("Failed to delete token from keyring")?;

    tracing::info!("Token deleted from system keyring");
    Ok(())
}

/// Check if a token is stored in the keyring
pub fn has_stored_token() -> bool {
    let Ok(entry) = Entry::new(SERVICE_NAME, TOKEN_KEY) else {
        return false;
    };

    entry.get_password().is_ok()
}

/// Update existing token in keyring
///
/// This is a convenience function that combines delete and store operations.
pub fn update_token(token: &Token) -> Result<()> {
    // Delete old token if it exists (ignore errors)
    let _ = delete_token();

    // Store new token
    store_token(token)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_token() -> Token {
        Token::new("sk-or-v1-test-key-for-unit-tests".to_string())
    }

    fn cleanup() {
        let _ = delete_token();
    }

    #[test]
    fn test_store_and_retrieve() {
        cleanup();

        let token = test_token();
        store_token(&token).unwrap();

        let retrieved = get_stored_token().unwrap();
        assert_eq!(retrieved.access_token, token.access_token);
        assert_eq!(retrieved.token_type, token.token_type);

        cleanup();
    }

    #[test]
    fn test_has_stored_token() {
        cleanup();

        assert!(!has_stored_token());

        let token = test_token();
        store_token(&token).unwrap();

        assert!(has_stored_token());

        cleanup();
    }

    #[test]
    fn test_delete_token() {
        cleanup();

        let token = test_token();
        store_token(&token).unwrap();
        assert!(has_stored_token());

        delete_token().unwrap();
        assert!(!has_stored_token());
    }

    #[test]
    fn test_update_token() {
        cleanup();

        let token1 = Token::new("sk-or-v1-first-token".to_string());
        store_token(&token1).unwrap();

        let token2 = Token::new("sk-or-v1-second-token".to_string());
        update_token(&token2).unwrap();

        let retrieved = get_stored_token().unwrap();
        assert_eq!(retrieved.access_token, "sk-or-v1-second-token");

        cleanup();
    }

    #[test]
    fn test_token_with_expiry_roundtrip() {
        cleanup();

        let token = Token::with_expiry("sk-or-v1-test".to_string(), 3600);
        store_token(&token).unwrap();

        let retrieved = get_stored_token().unwrap();
        assert_eq!(retrieved.access_token, token.access_token);
        assert!(retrieved.expires_at.is_some());

        cleanup();
    }
}
