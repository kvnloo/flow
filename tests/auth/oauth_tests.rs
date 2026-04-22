//! OAuth PKCE flow tests
//!
//! Tests for OAuth PKCE (Proof Key for Code Exchange) implementation including:
//! - Code verifier generation
//! - Code challenge generation
//! - Authorization URL building
//! - PKCE verification

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use sha2::{Digest, Sha256};

// Import from source modules
// Note: These tests are in tests/ directory, so we use the crate name
use flow_orchestrator_tui::auth::oauth::{build_auth_url, generate_pkce_params};

// Helper function to verify PKCE challenge (duplicated from source)
fn verify_pkce_local(code_verifier: &str, code_challenge: &str) -> bool {
    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let hash = hasher.finalize();
    let computed_challenge = URL_SAFE_NO_PAD.encode(hash);
    computed_challenge == code_challenge
}

#[test]
fn test_pkce_params_generation_produces_valid_lengths() {
    let (verifier, challenge) = generate_pkce_params().unwrap();

    // RFC 7636: code_verifier must be 43-128 characters
    assert_eq!(verifier.len(), 128);

    // Challenge should be base64-encoded SHA256 (43 chars without padding)
    assert_eq!(challenge.len(), 43);
}

#[test]
fn test_pkce_verifier_is_alphanumeric() {
    let (verifier, _) = generate_pkce_params().unwrap();

    // RFC 7636: code_verifier must be [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
    // Our implementation uses alphanumeric only
    for ch in verifier.chars() {
        assert!(
            ch.is_alphanumeric(),
            "Character '{}' is not alphanumeric",
            ch
        );
    }
}

#[test]
fn test_pkce_challenge_is_url_safe_base64() {
    let (_, challenge) = generate_pkce_params().unwrap();

    // URL-safe base64 (no padding): [A-Za-z0-9_-]
    for ch in challenge.chars() {
        assert!(
            ch.is_alphanumeric() || ch == '-' || ch == '_',
            "Character '{}' is not URL-safe base64",
            ch
        );
    }

    // Should not contain padding
    assert!(!challenge.contains('='));
}

#[test]
fn test_pkce_challenge_is_sha256_of_verifier() {
    let (verifier, challenge) = generate_pkce_params().unwrap();

    // Manually compute expected challenge
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    let expected_challenge = URL_SAFE_NO_PAD.encode(hash);

    assert_eq!(challenge, expected_challenge);
}

#[test]
fn test_pkce_verification_succeeds_with_matching_pair() {
    let (verifier, challenge) = generate_pkce_params().unwrap();
    assert!(verify_pkce_local(&verifier, &challenge));
}

#[test]
fn test_pkce_verification_fails_with_wrong_verifier() {
    let (_, challenge) = generate_pkce_params().unwrap();
    let wrong_verifier = "wrong_verifier_that_doesnt_match";

    assert!(!verify_pkce_local(wrong_verifier, &challenge));
}

#[test]
fn test_pkce_verification_fails_with_wrong_challenge() {
    let (verifier, _) = generate_pkce_params().unwrap();
    let wrong_challenge = "wrong_challenge_base64_encoded";

    assert!(!verify_pkce_local(&verifier, wrong_challenge));
}

#[test]
fn test_pkce_params_are_unique_per_generation() {
    let (verifier1, challenge1) = generate_pkce_params().unwrap();
    let (verifier2, challenge2) = generate_pkce_params().unwrap();

    // Each generation should produce unique values
    assert_ne!(verifier1, verifier2);
    assert_ne!(challenge1, challenge2);
}

#[test]
fn test_pkce_is_deterministic_for_same_verifier() {
    let test_verifier = "test_verifier_for_determinism_check_123456789";

    let mut hasher1 = Sha256::new();
    hasher1.update(test_verifier.as_bytes());
    let challenge1 = URL_SAFE_NO_PAD.encode(hasher1.finalize());

    let mut hasher2 = Sha256::new();
    hasher2.update(test_verifier.as_bytes());
    let challenge2 = URL_SAFE_NO_PAD.encode(hasher2.finalize());

    assert_eq!(challenge1, challenge2);
}

#[test]
fn test_build_auth_url_contains_required_parameters() {
    let challenge = "test_challenge_abc123";
    let url = build_auth_url(challenge).unwrap();

    // URL should start with OpenRouter auth endpoint
    assert!(url.starts_with("https://openrouter.ai/auth"));

    // Should contain all required parameters
    assert!(url.contains("callback_url="));
    assert!(url.contains("code_challenge="));
    assert!(url.contains("code_challenge_method=S256"));
}

#[test]
fn test_build_auth_url_encodes_challenge() {
    let challenge = "challenge+with/special=chars";
    let url = build_auth_url(challenge).unwrap();

    // Challenge should be URL-encoded
    assert!(url.contains("code_challenge="));
    // Should not contain unencoded special characters in the challenge portion
    let challenge_part = url.split("code_challenge=").nth(1).unwrap();
    let encoded_challenge = challenge_part.split('&').next().unwrap();

    // The encoded version should not equal the original if it had special chars
    assert_ne!(encoded_challenge, challenge);
}

#[test]
fn test_build_auth_url_specifies_pkce_method() {
    let challenge = "test_challenge";
    let url = build_auth_url(challenge).unwrap();

    // Must specify S256 (SHA-256) as the challenge method
    assert!(url.contains("code_challenge_method=S256"));
}

#[test]
fn test_build_auth_url_includes_localhost_callback() {
    let challenge = "test_challenge";
    let url = build_auth_url(challenge).unwrap();

    // Should include localhost:8080 callback
    assert!(url.contains("localhost"));
    assert!(url.contains("8080"));
    assert!(url.contains("callback"));
}

#[test]
fn test_multiple_pkce_generations_all_valid() {
    // Generate multiple PKCE pairs to ensure consistency
    for _ in 0..10 {
        let (verifier, challenge) = generate_pkce_params().unwrap();

        assert_eq!(verifier.len(), 128);
        assert_eq!(challenge.len(), 43);
        assert!(verify_pkce_local(&verifier, &challenge));
    }
}

#[test]
fn test_pkce_challenge_cannot_be_reversed() {
    let (verifier, challenge) = generate_pkce_params().unwrap();

    // SHA-256 is one-way; cannot recover verifier from challenge
    // This is a conceptual test showing the security property
    assert_ne!(verifier, challenge);
    assert!(challenge.len() < verifier.len());
}

#[test]
fn test_empty_challenge_fails_verification() {
    let (verifier, _) = generate_pkce_params().unwrap();
    assert!(!verify_pkce_local(&verifier, ""));
}

#[test]
fn test_empty_verifier_fails_verification() {
    let (_, challenge) = generate_pkce_params().unwrap();
    assert!(!verify_pkce_local("", &challenge));
}

#[test]
fn test_build_auth_url_with_empty_challenge() {
    // Should still build URL but won't work in practice
    let url = build_auth_url("").unwrap();
    assert!(url.contains("code_challenge="));
}

#[test]
fn test_pkce_security_properties() {
    let (verifier, challenge) = generate_pkce_params().unwrap();

    // 1. Verifier has sufficient entropy (128 chars = 768 bits for alphanumeric)
    assert!(verifier.len() >= 43); // RFC 7636 minimum

    // 2. Challenge is irreversible (one-way SHA-256)
    assert_ne!(verifier, challenge);

    // 3. Challenge is consistent
    assert!(verify_pkce_local(&verifier, &challenge));

    // 4. Small changes in verifier produce completely different challenge
    let modified_verifier = format!("{}X", &verifier[..127]);
    assert!(!verify_pkce_local(&modified_verifier, &challenge));
}
