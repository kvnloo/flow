//! OAuth PKCE (Proof Key for Code Exchange) implementation
//!
//! This module handles the OAuth PKCE flow for OpenRouter authentication.
//! PKCE is designed for public clients (like CLI/TUI apps) that cannot
//! securely store client secrets.

use anyhow::{Context, Result};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::Rng;
use sha2::{Digest, Sha256};

const OPENROUTER_AUTH_URL: &str = "https://openrouter.ai/auth";
const CALLBACK_URL: &str = "http://localhost:8080/callback";

/// Generate PKCE parameters (code_verifier and code_challenge)
///
/// # PKCE Flow
/// 1. Generate random `code_verifier` (128 characters)
/// 2. Create `code_challenge` = BASE64URL(SHA256(code_verifier))
/// 3. Send `code_challenge` to authorization server
/// 4. Receive authorization code
/// 5. Send `code_verifier` to exchange code for token
///
/// This prevents authorization code interception attacks.
pub fn generate_pkce_params() -> Result<(String, String)> {
    // Generate random code_verifier (128 bytes = sufficient entropy)
    let code_verifier: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(128)
        .map(char::from)
        .collect();

    // Generate code_challenge (SHA256 hash of code_verifier, base64-encoded)
    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let hash = hasher.finalize();
    let code_challenge = URL_SAFE_NO_PAD.encode(hash);

    tracing::debug!(
        "Generated PKCE params - verifier length: {}, challenge length: {}",
        code_verifier.len(),
        code_challenge.len()
    );

    Ok((code_verifier, code_challenge))
}

/// Build the authorization URL for OpenRouter OAuth
///
/// # Parameters
/// - `code_challenge`: Base64-encoded SHA256 hash of code_verifier
///
/// # Returns
/// Full authorization URL to open in browser
pub fn build_auth_url(code_challenge: &str) -> Result<String> {
    let url = format!(
        "{}?callback_url={}&code_challenge={}&code_challenge_method=S256",
        OPENROUTER_AUTH_URL,
        urlencoding::encode(CALLBACK_URL),
        urlencoding::encode(code_challenge)
    );

    Ok(url)
}

/// Verify PKCE challenge matches verifier
///
/// This is used for testing purposes to ensure our PKCE implementation is correct.
#[cfg(test)]
pub fn verify_pkce(code_verifier: &str, code_challenge: &str) -> bool {
    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let hash = hasher.finalize();
    let computed_challenge = URL_SAFE_NO_PAD.encode(hash);

    computed_challenge == code_challenge
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_pkce_params() {
        let (verifier, challenge) = generate_pkce_params().unwrap();

        // Verify verifier is 128 characters
        assert_eq!(verifier.len(), 128);
        assert!(verifier.chars().all(|c| c.is_alphanumeric()));

        // Verify challenge is valid base64 (no padding)
        assert!(!challenge.is_empty());
        assert!(!challenge.contains('='));
        assert!(challenge.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_'));
    }

    #[test]
    fn test_pkce_verification() {
        let (verifier, challenge) = generate_pkce_params().unwrap();
        assert!(verify_pkce(&verifier, &challenge));

        // Test with wrong verifier
        assert!(!verify_pkce("wrong_verifier", &challenge));
    }

    #[test]
    fn test_build_auth_url() {
        let challenge = "test_challenge_123";
        let url = build_auth_url(challenge).unwrap();

        assert!(url.starts_with(OPENROUTER_AUTH_URL));
        assert!(url.contains("callback_url="));
        assert!(url.contains("code_challenge="));
        assert!(url.contains("code_challenge_method=S256"));
    }

    #[test]
    fn test_pkce_deterministic() {
        // Same verifier should always produce same challenge
        let verifier = "test_verifier_123";

        let mut hasher1 = Sha256::new();
        hasher1.update(verifier.as_bytes());
        let challenge1 = URL_SAFE_NO_PAD.encode(hasher1.finalize());

        let mut hasher2 = Sha256::new();
        hasher2.update(verifier.as_bytes());
        let challenge2 = URL_SAFE_NO_PAD.encode(hasher2.finalize());

        assert_eq!(challenge1, challenge2);
    }
}
