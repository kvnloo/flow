//! Token management and validation
//!
//! This module handles OAuth tokens including access tokens, refresh tokens,
//! expiration tracking, and automatic refresh logic.

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

/// OAuth token with expiration tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Token {
    /// Access token for API requests (starts with "sk-or-v1-")
    pub access_token: String,

    /// Optional refresh token for obtaining new access tokens
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,

    /// Token expiration timestamp (None = never expires)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,

    /// Token type (usually "Bearer")
    #[serde(default = "default_token_type")]
    pub token_type: String,
}

fn default_token_type() -> String {
    "Bearer".to_string()
}

impl Token {
    /// Create a new token with access token only
    pub fn new(access_token: String) -> Self {
        Self {
            access_token,
            refresh_token: None,
            expires_at: None,
            token_type: "Bearer".to_string(),
        }
    }

    /// Create a new token with expiration
    pub fn with_expiry(access_token: String, expires_in: i64) -> Self {
        let expires_at = Utc::now() + Duration::seconds(expires_in);

        Self {
            access_token,
            refresh_token: None,
            expires_at: Some(expires_at),
            token_type: "Bearer".to_string(),
        }
    }

    /// Create a new token with refresh capability
    pub fn with_refresh(
        access_token: String,
        refresh_token: String,
        expires_in: i64,
    ) -> Self {
        let expires_at = Utc::now() + Duration::seconds(expires_in);

        Self {
            access_token,
            refresh_token: Some(refresh_token),
            expires_at: Some(expires_at),
            token_type: "Bearer".to_string(),
        }
    }

    /// Check if token is expired
    pub fn is_expired(&self) -> bool {
        match self.expires_at {
            Some(expiry) => Utc::now() >= expiry,
            None => false, // No expiration = never expires
        }
    }

    /// Check if token is about to expire (within 5 minutes)
    pub fn is_expiring_soon(&self) -> bool {
        match self.expires_at {
            Some(expiry) => {
                let threshold = Utc::now() + Duration::minutes(5);
                threshold >= expiry
            }
            None => false,
        }
    }

    /// Get time until expiration
    pub fn time_until_expiry(&self) -> Option<Duration> {
        self.expires_at.map(|expiry| expiry - Utc::now())
    }

    /// Check if token has refresh capability
    pub fn can_refresh(&self) -> bool {
        self.refresh_token.is_some()
    }

    /// Validate token format (OpenRouter API keys start with "sk-or-v1-")
    pub fn is_valid_format(&self) -> bool {
        self.access_token.starts_with("sk-or-v1-")
            && self.access_token.len() > 20
    }

    /// Get authorization header value
    pub fn auth_header(&self) -> String {
        format!("{} {}", self.token_type, self.access_token)
    }
}

/// Token refresh response from API
#[derive(Debug, Deserialize)]
pub struct TokenRefreshResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,
}

impl From<TokenRefreshResponse> for Token {
    fn from(response: TokenRefreshResponse) -> Self {
        let expires_at = Utc::now() + Duration::seconds(response.expires_in);

        Self {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            expires_at: Some(expires_at),
            token_type: response.token_type,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_creation() {
        let token = Token::new("sk-or-v1-test-key-12345".to_string());

        assert_eq!(token.access_token, "sk-or-v1-test-key-12345");
        assert_eq!(token.token_type, "Bearer");
        assert!(token.refresh_token.is_none());
        assert!(token.expires_at.is_none());
    }

    #[test]
    fn test_token_with_expiry() {
        let token = Token::with_expiry("sk-or-v1-test".to_string(), 3600);

        assert!(!token.is_expired());
        assert!(token.expires_at.is_some());

        let time_left = token.time_until_expiry().unwrap();
        assert!(time_left.num_seconds() > 3500 && time_left.num_seconds() <= 3600);
    }

    #[test]
    fn test_token_expired() {
        let token = Token::with_expiry("sk-or-v1-test".to_string(), -10);
        assert!(token.is_expired());
    }

    #[test]
    fn test_token_expiring_soon() {
        let token = Token::with_expiry("sk-or-v1-test".to_string(), 120); // 2 minutes
        assert!(token.is_expiring_soon());

        let token = Token::with_expiry("sk-or-v1-test".to_string(), 600); // 10 minutes
        assert!(!token.is_expiring_soon());
    }

    #[test]
    fn test_token_valid_format() {
        let valid = Token::new("sk-or-v1-abc123def456ghi789".to_string());
        assert!(valid.is_valid_format());

        let invalid = Token::new("invalid-key".to_string());
        assert!(!invalid.is_valid_format());
    }

    #[test]
    fn test_token_auth_header() {
        let token = Token::new("sk-or-v1-test".to_string());
        assert_eq!(token.auth_header(), "Bearer sk-or-v1-test");
    }

    #[test]
    fn test_token_can_refresh() {
        let token = Token::new("sk-or-v1-test".to_string());
        assert!(!token.can_refresh());

        let token = Token::with_refresh(
            "sk-or-v1-test".to_string(),
            "refresh_token".to_string(),
            3600,
        );
        assert!(token.can_refresh());
    }

    #[test]
    fn test_token_serialization() {
        let token = Token::with_expiry("sk-or-v1-test".to_string(), 3600);

        let json = serde_json::to_string(&token).unwrap();
        let deserialized: Token = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.access_token, token.access_token);
        assert_eq!(deserialized.token_type, token.token_type);
    }
}
