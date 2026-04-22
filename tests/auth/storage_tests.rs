//! Secure token storage tests
//!
//! Tests for platform-independent keyring storage including:
//! - Token storage and retrieval
//! - Token deletion
//! - Storage verification
//! - Error handling

use flow_orchestrator_tui::auth::storage::{
    delete_token, get_stored_token, has_stored_token, store_token, update_token,
};
use flow_orchestrator_tui::auth::token::Token;

// Helper to create test token
fn create_test_token(suffix: &str) -> Token {
    Token::new(format!("sk-or-v1-test-key-{}", suffix))
}

// Cleanup helper to ensure clean state
fn cleanup_storage() {
    let _ = delete_token();
}

#[test]
fn test_store_and_retrieve_token() {
    cleanup_storage();

    let original = create_test_token("store-retrieve");
    store_token(&original).expect("Failed to store token");

    let retrieved = get_stored_token().expect("Failed to retrieve token");

    assert_eq!(retrieved.access_token, original.access_token);
    assert_eq!(retrieved.token_type, original.token_type);

    cleanup_storage();
}

#[test]
fn test_store_token_with_expiry() {
    cleanup_storage();

    let original = Token::with_expiry("sk-or-v1-expiry-test".to_string(), 3600);
    store_token(&original).expect("Failed to store token with expiry");

    let retrieved = get_stored_token().expect("Failed to retrieve token");

    assert_eq!(retrieved.access_token, original.access_token);
    assert!(retrieved.expires_at.is_some());

    cleanup_storage();
}

#[test]
fn test_store_token_with_refresh() {
    cleanup_storage();

    let original = Token::with_refresh(
        "sk-or-v1-refresh-test".to_string(),
        "refresh_token_abc".to_string(),
        7200,
    );
    store_token(&original).expect("Failed to store token with refresh");

    let retrieved = get_stored_token().expect("Failed to retrieve token");

    assert_eq!(retrieved.access_token, original.access_token);
    assert_eq!(retrieved.refresh_token, original.refresh_token);
    assert!(retrieved.expires_at.is_some());

    cleanup_storage();
}

#[test]
fn test_has_stored_token_after_store() {
    cleanup_storage();

    assert!(!has_stored_token());

    let token = create_test_token("has-check");
    store_token(&token).expect("Failed to store token");

    assert!(has_stored_token());

    cleanup_storage();
}

#[test]
fn test_has_stored_token_after_delete() {
    cleanup_storage();

    let token = create_test_token("delete-check");
    store_token(&token).expect("Failed to store token");
    assert!(has_stored_token());

    delete_token().expect("Failed to delete token");
    assert!(!has_stored_token());
}

#[test]
fn test_delete_token_removes_from_keyring() {
    cleanup_storage();

    let token = create_test_token("delete-test");
    store_token(&token).expect("Failed to store token");
    assert!(has_stored_token());

    delete_token().expect("Failed to delete token");

    // Should fail to retrieve after deletion
    assert!(get_stored_token().is_err());
}

#[test]
fn test_delete_nonexistent_token_fails() {
    cleanup_storage();

    let result = delete_token();
    assert!(result.is_err());
}

#[test]
fn test_get_stored_token_fails_when_none() {
    cleanup_storage();

    let result = get_stored_token();
    assert!(result.is_err());
}

#[test]
fn test_update_token_replaces_existing() {
    cleanup_storage();

    let first = create_test_token("first");
    store_token(&first).expect("Failed to store first token");

    let second = create_test_token("second");
    update_token(&second).expect("Failed to update token");

    let retrieved = get_stored_token().expect("Failed to retrieve updated token");
    assert_eq!(retrieved.access_token, second.access_token);
    assert_ne!(retrieved.access_token, first.access_token);

    cleanup_storage();
}

#[test]
fn test_update_token_when_none_exists() {
    cleanup_storage();

    let token = create_test_token("update-new");
    update_token(&token).expect("Failed to update (create) token");

    assert!(has_stored_token());

    let retrieved = get_stored_token().expect("Failed to retrieve token");
    assert_eq!(retrieved.access_token, token.access_token);

    cleanup_storage();
}

#[test]
fn test_multiple_store_operations_overwrites() {
    cleanup_storage();

    let token1 = create_test_token("multi-1");
    store_token(&token1).expect("Failed to store token1");

    let token2 = create_test_token("multi-2");
    store_token(&token2).expect("Failed to store token2");

    // Last stored should be retrieved
    let retrieved = get_stored_token().expect("Failed to retrieve token");
    assert_eq!(retrieved.access_token, token2.access_token);

    cleanup_storage();
}

#[test]
fn test_token_persistence_across_reads() {
    cleanup_storage();

    let original = create_test_token("persistence");
    store_token(&original).expect("Failed to store token");

    // Multiple reads should return same token
    let read1 = get_stored_token().expect("Failed first read");
    let read2 = get_stored_token().expect("Failed second read");
    let read3 = get_stored_token().expect("Failed third read");

    assert_eq!(read1.access_token, original.access_token);
    assert_eq!(read2.access_token, original.access_token);
    assert_eq!(read3.access_token, original.access_token);

    cleanup_storage();
}

#[test]
fn test_storage_preserves_all_token_fields() {
    cleanup_storage();

    let original = Token::with_refresh(
        "sk-or-v1-complete-token".to_string(),
        "refresh_complete".to_string(),
        3600,
    );

    store_token(&original).expect("Failed to store complete token");
    let retrieved = get_stored_token().expect("Failed to retrieve complete token");

    assert_eq!(retrieved.access_token, original.access_token);
    assert_eq!(retrieved.refresh_token, original.refresh_token);
    assert_eq!(retrieved.token_type, original.token_type);
    assert!(retrieved.expires_at.is_some());

    cleanup_storage();
}

#[test]
fn test_storage_roundtrip_preserves_expiry_time() {
    cleanup_storage();

    let original = Token::with_expiry("sk-or-v1-expiry-roundtrip".to_string(), 7200);
    let original_expiry = original.expires_at.unwrap();

    store_token(&original).expect("Failed to store token");
    let retrieved = get_stored_token().expect("Failed to retrieve token");

    let retrieved_expiry = retrieved.expires_at.unwrap();

    // Expiry times should be within 1 second
    let diff = (retrieved_expiry - original_expiry)
        .num_seconds()
        .abs();
    assert!(diff <= 1);

    cleanup_storage();
}

#[test]
fn test_storage_handles_empty_refresh_token() {
    cleanup_storage();

    let token = Token::new("sk-or-v1-no-refresh".to_string());
    assert!(token.refresh_token.is_none());

    store_token(&token).expect("Failed to store token without refresh");
    let retrieved = get_stored_token().expect("Failed to retrieve token");

    assert!(retrieved.refresh_token.is_none());

    cleanup_storage();
}

#[test]
fn test_delete_after_update() {
    cleanup_storage();

    let token1 = create_test_token("update-delete-1");
    store_token(&token1).expect("Failed to store token1");

    let token2 = create_test_token("update-delete-2");
    update_token(&token2).expect("Failed to update token");

    delete_token().expect("Failed to delete after update");
    assert!(!has_stored_token());
}

#[test]
fn test_has_stored_token_is_consistent() {
    cleanup_storage();

    // Initially no token
    assert!(!has_stored_token());

    // Store token
    let token = create_test_token("consistency");
    store_token(&token).expect("Failed to store token");
    assert!(has_stored_token());

    // Retrieve doesn't affect has_stored_token
    let _ = get_stored_token().expect("Failed to retrieve");
    assert!(has_stored_token());

    // Delete removes token
    delete_token().expect("Failed to delete token");
    assert!(!has_stored_token());

    // Multiple checks after deletion
    assert!(!has_stored_token());
    assert!(!has_stored_token());
}

#[test]
fn test_storage_error_handling_corrupted_data() {
    cleanup_storage();

    // This test documents behavior but may not be able to simulate corruption
    // The actual implementation should handle JSON parse errors gracefully
    let token = create_test_token("corruption-test");
    store_token(&token).expect("Failed to store token");

    // Normal retrieval should work
    assert!(get_stored_token().is_ok());

    cleanup_storage();
}

#[test]
fn test_concurrent_storage_operations() {
    cleanup_storage();

    // Store, check, retrieve in sequence
    let token = create_test_token("concurrent");
    store_token(&token).expect("Failed to store");

    assert!(has_stored_token());

    let retrieved = get_stored_token().expect("Failed to retrieve");
    assert_eq!(retrieved.access_token, token.access_token);

    cleanup_storage();
}

#[test]
fn test_update_preserves_newer_token_properties() {
    cleanup_storage();

    // Store old token without refresh
    let old_token = Token::new("sk-or-v1-old-no-refresh".to_string());
    store_token(&old_token).expect("Failed to store old token");

    // Update with new token that has refresh capability
    let new_token = Token::with_refresh(
        "sk-or-v1-new-with-refresh".to_string(),
        "refresh_new".to_string(),
        3600,
    );
    update_token(&new_token).expect("Failed to update token");

    let retrieved = get_stored_token().expect("Failed to retrieve");
    assert_eq!(retrieved.access_token, new_token.access_token);
    assert!(retrieved.can_refresh());

    cleanup_storage();
}
