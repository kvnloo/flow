//! Token management tests
//!
//! Tests for token creation, validation, expiration tracking, and refresh logic

use chrono::Utc;
use flow_orchestrator_tui::auth::token::Token;

#[test]
fn test_token_creation_basic() {
    let access_token = "sk-or-v1-test-key-123456789";
    let token = Token::new(access_token.to_string());

    assert_eq!(token.access_token, access_token);
    assert_eq!(token.token_type, "Bearer");
    assert!(token.refresh_token.is_none());
    assert!(token.expires_at.is_none());
}

#[test]
fn test_token_with_expiry() {
    let access_token = "sk-or-v1-test-key";
    let expires_in = 3600; // 1 hour

    let token = Token::with_expiry(access_token.to_string(), expires_in);

    assert_eq!(token.access_token, access_token);
    assert!(token.expires_at.is_some());

    // Should not be expired immediately
    assert!(!token.is_expired());

    // Time until expiry should be close to expires_in
    let time_left = token.time_until_expiry().unwrap();
    assert!(time_left.num_seconds() > 3500);
    assert!(time_left.num_seconds() <= 3600);
}

#[test]
fn test_token_with_refresh() {
    let access_token = "sk-or-v1-access";
    let refresh_token = "refresh_token_xyz";
    let expires_in = 7200; // 2 hours

    let token = Token::with_refresh(
        access_token.to_string(),
        refresh_token.to_string(),
        expires_in,
    );

    assert_eq!(token.access_token, access_token);
    assert_eq!(token.refresh_token, Some(refresh_token.to_string()));
    assert!(token.can_refresh());
    assert!(!token.is_expired());
}

#[test]
fn test_token_is_expired_past_expiry() {
    let token = Token::with_expiry("sk-or-v1-test".to_string(), -10); // Expired 10 seconds ago
    assert!(token.is_expired());
}

#[test]
fn test_token_never_expires_without_expiry() {
    let token = Token::new("sk-or-v1-test".to_string());
    assert!(!token.is_expired());
    assert!(token.time_until_expiry().is_none());
}

#[test]
fn test_token_is_expiring_soon_within_threshold() {
    // Token expires in 2 minutes (less than 5-minute threshold)
    let token = Token::with_expiry("sk-or-v1-test".to_string(), 120);
    assert!(token.is_expiring_soon());
}

#[test]
fn test_token_not_expiring_soon_beyond_threshold() {
    // Token expires in 10 minutes (beyond 5-minute threshold)
    let token = Token::with_expiry("sk-or-v1-test".to_string(), 600);
    assert!(!token.is_expiring_soon());
}

#[test]
fn test_token_expiring_soon_at_exact_threshold() {
    // Token expires in exactly 5 minutes (300 seconds)
    let token = Token::with_expiry("sk-or-v1-test".to_string(), 300);
    assert!(token.is_expiring_soon());
}

#[test]
fn test_token_time_until_expiry_calculation() {
    let expires_in = 1800; // 30 minutes
    let token = Token::with_expiry("sk-or-v1-test".to_string(), expires_in);

    let time_left = token.time_until_expiry().unwrap();
    assert!(time_left.num_seconds() > 1750);
    assert!(time_left.num_seconds() <= 1800);
}

#[test]
fn test_token_time_until_expiry_negative_when_expired() {
    let token = Token::with_expiry("sk-or-v1-test".to_string(), -60); // Expired 1 minute ago

    let time_left = token.time_until_expiry().unwrap();
    assert!(time_left.num_seconds() < 0);
}

#[test]
fn test_token_can_refresh_with_refresh_token() {
    let token = Token::with_refresh(
        "sk-or-v1-test".to_string(),
        "refresh_abc".to_string(),
        3600,
    );
    assert!(token.can_refresh());
}

#[test]
fn test_token_cannot_refresh_without_refresh_token() {
    let token = Token::new("sk-or-v1-test".to_string());
    assert!(!token.can_refresh());

    let token_with_expiry = Token::with_expiry("sk-or-v1-test".to_string(), 3600);
    assert!(!token_with_expiry.can_refresh());
}

#[test]
fn test_token_valid_format_openrouter_prefix() {
    let valid = Token::new("sk-or-v1-abc123def456ghi789".to_string());
    assert!(valid.is_valid_format());
}

#[test]
fn test_token_invalid_format_wrong_prefix() {
    let invalid = Token::new("sk-invalid-key-123".to_string());
    assert!(!invalid.is_valid_format());

    let empty = Token::new("".to_string());
    assert!(!empty.is_valid_format());
}

#[test]
fn test_token_invalid_format_too_short() {
    let too_short = Token::new("sk-or-v1-short".to_string());
    assert!(!too_short.is_valid_format());
}

#[test]
fn test_token_auth_header_format() {
    let token = Token::new("sk-or-v1-test-key".to_string());
    let header = token.auth_header();

    assert_eq!(header, "Bearer sk-or-v1-test-key");
    assert!(header.starts_with("Bearer "));
}

#[test]
fn test_token_serialization_roundtrip() {
    let original = Token::with_refresh(
        "sk-or-v1-test-access".to_string(),
        "refresh_xyz".to_string(),
        3600,
    );

    let json = serde_json::to_string(&original).unwrap();
    let deserialized: Token = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.access_token, original.access_token);
    assert_eq!(deserialized.refresh_token, original.refresh_token);
    assert_eq!(deserialized.token_type, original.token_type);
}

#[test]
fn test_token_serialization_omits_none_fields() {
    let token = Token::new("sk-or-v1-test".to_string());
    let json = serde_json::to_string(&token).unwrap();

    // None fields should be omitted from JSON
    assert!(!json.contains("refresh_token"));
    assert!(!json.contains("expires_at"));
}

#[test]
fn test_token_deserialization_with_missing_fields() {
    let json = r#"{"access_token":"sk-or-v1-test","token_type":"Bearer"}"#;
    let token: Token = serde_json::from_str(json).unwrap();

    assert_eq!(token.access_token, "sk-or-v1-test");
    assert_eq!(token.token_type, "Bearer");
    assert!(token.refresh_token.is_none());
    assert!(token.expires_at.is_none());
}

#[test]
fn test_token_clone() {
    let original = Token::with_refresh(
        "sk-or-v1-original".to_string(),
        "refresh_token".to_string(),
        3600,
    );

    let cloned = original.clone();

    assert_eq!(cloned.access_token, original.access_token);
    assert_eq!(cloned.refresh_token, original.refresh_token);
    assert_eq!(cloned.token_type, original.token_type);
}

#[test]
fn test_token_expiry_edge_cases() {
    // Expires in 1 second
    let token = Token::with_expiry("sk-or-v1-test".to_string(), 1);
    assert!(!token.is_expired());
    assert!(token.is_expiring_soon());

    // Expires in 0 seconds (boundary)
    let token = Token::with_expiry("sk-or-v1-test".to_string(), 0);
    // May or may not be expired depending on timing
    assert!(token.is_expiring_soon());

    // Very long expiry
    let token = Token::with_expiry("sk-or-v1-test".to_string(), 86400 * 365); // 1 year
    assert!(!token.is_expired());
    assert!(!token.is_expiring_soon());
}

#[test]
fn test_token_refresh_scenario() {
    // Simulate token refresh workflow
    let original = Token::with_refresh(
        "sk-or-v1-original".to_string(),
        "refresh_xyz".to_string(),
        120, // Short expiry
    );

    assert!(!original.is_expired());
    assert!(original.is_expiring_soon());
    assert!(original.can_refresh());

    // Simulate getting new token after refresh
    let refreshed = Token::with_refresh(
        "sk-or-v1-new-access".to_string(),
        "refresh_xyz".to_string(), // Same refresh token
        3600, // New longer expiry
    );

    assert!(!refreshed.is_expired());
    assert!(!refreshed.is_expiring_soon());
    assert_ne!(refreshed.access_token, original.access_token);
}

#[test]
fn test_token_default_type_is_bearer() {
    let token = Token::new("sk-or-v1-test".to_string());
    assert_eq!(token.token_type, "Bearer");
}

#[test]
fn test_token_expiry_precision() {
    let now = Utc::now();
    let expires_in = 3600;
    let token = Token::with_expiry("sk-or-v1-test".to_string(), expires_in);

    let expected_expiry = now + chrono::Duration::seconds(expires_in);
    let actual_expiry = token.expires_at.unwrap();

    // Should be within 1 second of expected
    let diff_secs = (expected_expiry.timestamp() - actual_expiry.timestamp()).abs();
    assert!(diff_secs <= 1);
}
