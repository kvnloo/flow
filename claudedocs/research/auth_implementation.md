# OpenRouter Authentication Implementation Guide
## OAuth Flow with PKCE for Flow Orchestrator TUI

**Research Date:** 2025-11-25
**Project:** Flow Orchestrator TUI
**Language:** Rust
**Authentication Provider:** OpenRouter

---

## 1. OpenRouter API Overview

### Authentication Mechanisms

OpenRouter supports two primary authentication methods:

1. **Direct API Keys** - Simple Bearer token authentication
2. **OAuth PKCE Flow** - Browser-based user authorization (recommended for CLI/TUI apps)

### Why PKCE for CLI/TUI Applications

PKCE (Proof Key for Code Exchange) is specifically designed for **public clients** that cannot securely store client secrets:
- Mobile applications
- Single-Page Applications (SPAs)
- **CLI/TUI applications** (our use case)

The PKCE flow provides single sign-on (SSO) experience where users authenticate via their browser and are redirected back to the application with an authorization code that can be exchanged for an API key.

**Source:** [OpenRouter OAuth PKCE Documentation](https://openrouter.ai/docs/use-cases/oauth-pkce)

### API Rate Limits and Pricing

#### Free Models
- **Base limit:** 20 requests/minute, 200 requests/day for free models (models ending in `:free`)
- **Enhanced limit:** 1000 requests/day if you've purchased at least 10 credits
- **Without credits:** 50 free model requests/day

#### Paid Models
- **No per-model markup:** OpenRouter passes through provider pricing without markup
- **Platform fee:** 5.5% ($0.80 minimum) when purchasing credits
- **Pricing model:** Per-token pricing (separate rates for input/output tokens)
- **BYOK option:** First 1M requests free/month with your own provider keys, then 5% fee

#### Model Variants for Optimization
- `:free` - Always free with low rate limits
- `:nitro` - Sorted by throughput for faster response times
- `:floor` - Sorted by price for most cost-effective options

**Sources:**
- [OpenRouter Rate Limits](https://openrouter.ai/docs/limits)
- [OpenRouter Pricing](https://openrouter.ai/pricing)

### Model Availability

OpenRouter provides unified access to multiple AI model providers:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus/Haiku)
- Google (Gemini Pro)
- Meta (Llama 2, Llama 3)
- Mistral AI
- And many more

View current models: [OpenRouter Models](https://openrouter.ai/models)

---

## 2. OAuth PKCE Flow Specification

### Flow Overview

```
┌─────────┐                                           ┌─────────────┐
│   CLI   │                                           │  OpenRouter │
│   TUI   │                                           │             │
└────┬────┘                                           └──────┬──────┘
     │                                                        │
     │  1. Generate code_verifier & code_challenge           │
     │                                                        │
     │  2. Open browser: /auth?callback_url=...&code_challenge=...
     │─────────────────────────────────────────────────────> │
     │                                                        │
     │                                              3. User logs in
     │                                              & authorizes app
     │                                                        │
     │  4. Browser redirect: callback_url?code=AUTH_CODE     │
     │ <─────────────────────────────────────────────────────│
     │                                                        │
     │  5. Local server receives callback                    │
     │                                                        │
     │  6. POST /api/v1/auth/keys                            │
     │     { code, code_verifier }                           │
     │─────────────────────────────────────────────────────> │
     │                                                        │
     │  7. Response: { key: "sk-or-v1-..." }                 │
     │ <─────────────────────────────────────────────────────│
     │                                                        │
     │  8. Store key securely (keyring)                      │
     │                                                        │
```

### Step-by-Step Implementation

#### Step 1: Generate PKCE Parameters

Generate a `code_verifier` (random string, up to 256 characters) and `code_challenge`:

```rust
use rand::Rng;
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};

fn generate_pkce_params() -> (String, String) {
    // Generate random code_verifier (128 bytes = 256 hex chars)
    let code_verifier: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(128)
        .map(char::from)
        .collect();

    // Generate code_challenge (SHA256 hash, base64-encoded)
    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let hash = hasher.finalize();
    let code_challenge = URL_SAFE_NO_PAD.encode(&hash);

    (code_verifier, code_challenge)
}
```

#### Step 2: Initiate Authorization

Construct the authorization URL and open it in the user's browser:

```
https://openrouter.ai/auth?callback_url=http://localhost:8080/callback&code_challenge={code_challenge}&code_challenge_method=S256
```

**Parameters:**
- `callback_url`: Your local server URL (e.g., `http://localhost:8080/callback`)
- `code_challenge`: Base64-encoded SHA256 hash of `code_verifier`
- `code_challenge_method`: Must be `S256` for SHA256 hashing

**For local development:** Use `http://localhost:8080` as both callback and referrer URLs.

#### Step 3: Handle Callback

Start a local HTTP server to receive the authorization code:

```rust
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

async fn start_callback_server() -> Result<String, Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;

    loop {
        let (mut socket, _) = listener.accept().await?;
        let mut buffer = [0; 1024];

        socket.read(&mut buffer).await?;
        let request = String::from_utf8_lossy(&buffer);

        // Extract authorization code from query params
        if let Some(code) = extract_code_from_request(&request) {
            // Send success response to browser
            let response = "HTTP/1.1 200 OK\r\n\r\n<html><body><h1>Authentication successful!</h1><p>You can close this window.</p></body></html>";
            socket.write_all(response.as_bytes()).await?;

            return Ok(code);
        }
    }
}

fn extract_code_from_request(request: &str) -> Option<String> {
    // Parse HTTP request and extract 'code' query parameter
    request
        .lines()
        .next()?
        .split_whitespace()
        .nth(1)?
        .split('?')
        .nth(1)?
        .split('&')
        .find(|param| param.starts_with("code="))?
        .strip_prefix("code=")
        .map(|s| s.to_string())
}
```

#### Step 4: Exchange Code for API Key

Make a POST request to exchange the authorization code for an API key:

```rust
use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct TokenRequest {
    code: String,
    code_verifier: String,
}

#[derive(Deserialize)]
struct TokenResponse {
    key: String,
}

async fn exchange_code_for_key(
    code: String,
    code_verifier: String,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();

    let request = TokenRequest {
        code,
        code_verifier,
    };

    let response = client
        .post("https://openrouter.ai/api/v1/auth/keys")
        .json(&request)
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(format!("Token exchange failed: {}", error_text).into());
    }

    let token_response: TokenResponse = response.json().await?;
    Ok(token_response.key)
}
```

#### Common Errors

**400 - Invalid code_challenge_method:**
- Ensure you use `S256` consistently in Step 1 and Step 2
- Verify the code_challenge is base64-encoded SHA256 hash

**403 - Invalid code or code_verifier:**
- User must be logged in to OpenRouter
- `code_verifier` must match the original value used to generate `code_challenge`
- Authorization codes are single-use and expire quickly

**Sources:** [OpenRouter PKCE Documentation](https://openrouter.ai/docs/use-cases/oauth-pkce)

---

## 3. Rust Implementation Guide

### Dependencies (Cargo.toml)

```toml
[dependencies]
# HTTP client for API requests
reqwest = { version = "0.12", features = ["json", "stream"] }

# Async runtime
tokio = { version = "1.0", features = ["full"] }

# OAuth2 implementation with PKCE support
oauth2 = "4.4"

# Secure credential storage
keyring = "2.3"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Cryptography for PKCE
sha2 = "0.10"
base64 = "0.22"
rand = "0.8"

# TUI framework (existing)
ratatui = "0.26"
crossterm = "0.27"

# Error handling
anyhow = "1.0"
thiserror = "1.0"
```

### Project Structure

```
flow/
├── src/
│   ├── auth/
│   │   ├── mod.rs          # Public auth interface
│   │   ├── pkce.rs         # PKCE implementation
│   │   ├── callback.rs     # Local server for OAuth callback
│   │   ├── storage.rs      # Secure token storage
│   │   └── openrouter.rs   # OpenRouter API client
│   ├── config/
│   │   └── mod.rs          # Configuration management
│   ├── tui/
│   │   └── ...             # Existing TUI code
│   └── main.rs
```

### Core Authentication Module (auth/mod.rs)

```rust
use anyhow::Result;
use keyring::Entry;

pub mod pkce;
pub mod callback;
pub mod storage;
pub mod openrouter;

pub use openrouter::OpenRouterClient;

const SERVICE_NAME: &str = "flow-orchestrator";
const KEYRING_USER: &str = "openrouter-api-key";

/// Main authentication flow for OpenRouter
pub async fn authenticate() -> Result<String> {
    // Check if we already have a stored API key
    if let Ok(key) = storage::get_stored_key() {
        // Validate the key is still valid
        if openrouter::validate_key(&key).await? {
            return Ok(key);
        }
    }

    // Start OAuth PKCE flow
    println!("Starting OpenRouter authentication...");

    // Generate PKCE parameters
    let (code_verifier, code_challenge) = pkce::generate_params()?;

    // Start local callback server
    let callback_handle = tokio::spawn(callback::start_server());

    // Open browser for authorization
    let auth_url = format!(
        "https://openrouter.ai/auth?callback_url=http://localhost:8080/callback&code_challenge={}&code_challenge_method=S256",
        code_challenge
    );

    println!("Opening browser for authentication...");
    open::that(&auth_url)?;

    // Wait for callback with authorization code
    let code = callback_handle.await??;

    // Exchange code for API key
    let api_key = openrouter::exchange_code(code, code_verifier).await?;

    // Store key securely
    storage::store_key(&api_key)?;

    println!("✓ Authentication successful!");
    Ok(api_key)
}

/// Logout - remove stored credentials
pub fn logout() -> Result<()> {
    storage::delete_key()?;
    println!("✓ Logged out successfully");
    Ok(())
}
```

### PKCE Implementation (auth/pkce.rs)

```rust
use anyhow::Result;
use rand::Rng;
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};

/// Generate PKCE code_verifier and code_challenge
pub fn generate_params() -> Result<(String, String)> {
    // Generate random code_verifier (128 characters)
    let code_verifier: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(128)
        .map(char::from)
        .collect();

    // Generate code_challenge (SHA256 hash of code_verifier, base64-encoded)
    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let hash = hasher.finalize();
    let code_challenge = URL_SAFE_NO_PAD.encode(&hash);

    Ok((code_verifier, code_challenge))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_params() {
        let (verifier, challenge) = generate_params().unwrap();

        // Verify verifier is 128 characters
        assert_eq!(verifier.len(), 128);

        // Verify challenge is valid base64
        assert!(!challenge.is_empty());
        assert!(!challenge.contains('='));  // URL_SAFE_NO_PAD
    }
}
```

### Callback Server (auth/callback.rs)

```rust
use anyhow::{Result, Context};
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

const SUCCESS_HTML: &str = r#"
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Successful</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .card {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        }
        h1 { color: #2d3748; margin-top: 0; }
        p { color: #4a5568; }
    </style>
</head>
<body>
    <div class="card">
        <h1>✓ Authentication Successful</h1>
        <p>You can close this window and return to the terminal.</p>
    </div>
</body>
</html>
"#;

const ERROR_HTML: &str = r#"
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Error</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .card {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        }
        h1 { color: #c53030; margin-top: 0; }
        p { color: #4a5568; }
    </style>
</head>
<body>
    <div class="card">
        <h1>✗ Authentication Failed</h1>
        <p>Please check the terminal for error details.</p>
    </div>
</body>
</html>
"#;

/// Start local HTTP server to receive OAuth callback
pub async fn start_server() -> Result<String> {
    let listener = TcpListener::bind("127.0.0.1:8080")
        .await
        .context("Failed to bind to localhost:8080")?;

    println!("Waiting for authentication callback...");

    // Accept single connection
    let (mut socket, _) = listener.accept().await?;

    // Read HTTP request
    let mut buffer = vec![0; 4096];
    let n = socket.read(&mut buffer).await?;
    let request = String::from_utf8_lossy(&buffer[..n]);

    // Extract authorization code
    match extract_code(&request) {
        Some(code) => {
            // Send success response
            send_response(&mut socket, 200, SUCCESS_HTML).await?;
            Ok(code)
        }
        None => {
            // Send error response
            send_response(&mut socket, 400, ERROR_HTML).await?;
            Err(anyhow::anyhow!("No authorization code found in callback"))
        }
    }
}

/// Extract authorization code from HTTP request
fn extract_code(request: &str) -> Option<String> {
    let request_line = request.lines().next()?;
    let path = request_line.split_whitespace().nth(1)?;

    // Parse query parameters
    let query = path.split('?').nth(1)?;

    for param in query.split('&') {
        if let Some(value) = param.strip_prefix("code=") {
            return Some(url_decode(value));
        }
    }

    None
}

/// Send HTTP response
async fn send_response(
    socket: &mut tokio::net::TcpStream,
    status: u16,
    body: &str,
) -> Result<()> {
    let status_text = match status {
        200 => "OK",
        400 => "Bad Request",
        _ => "Unknown",
    };

    let response = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
        status, status_text, body.len(), body
    );

    socket.write_all(response.as_bytes()).await?;
    socket.flush().await?;

    Ok(())
}

/// Simple URL decode for query parameters
fn url_decode(s: &str) -> String {
    s.replace("%20", " ")
        .replace("%2F", "/")
        .replace("%3D", "=")
        // Add more replacements as needed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_code() {
        let request = "GET /callback?code=test_auth_code&state=xyz HTTP/1.1\r\n";
        assert_eq!(extract_code(request), Some("test_auth_code".to_string()));
    }

    #[test]
    fn test_extract_code_missing() {
        let request = "GET /callback?state=xyz HTTP/1.1\r\n";
        assert_eq!(extract_code(request), None);
    }
}
```

### Secure Storage (auth/storage.rs)

```rust
use anyhow::{Result, Context};
use keyring::Entry;

const SERVICE_NAME: &str = "flow-orchestrator";
const KEYRING_USER: &str = "openrouter-api-key";

/// Store API key securely in system keyring
pub fn store_key(api_key: &str) -> Result<()> {
    let entry = Entry::new(SERVICE_NAME, KEYRING_USER)
        .context("Failed to create keyring entry")?;

    entry.set_password(api_key)
        .context("Failed to store API key in keyring")?;

    Ok(())
}

/// Retrieve API key from system keyring
pub fn get_stored_key() -> Result<String> {
    let entry = Entry::new(SERVICE_NAME, KEYRING_USER)
        .context("Failed to create keyring entry")?;

    entry.get_password()
        .context("No stored API key found")
}

/// Delete API key from system keyring
pub fn delete_key() -> Result<()> {
    let entry = Entry::new(SERVICE_NAME, KEYRING_USER)
        .context("Failed to create keyring entry")?;

    entry.delete_credential()
        .context("Failed to delete API key from keyring")?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_store_and_retrieve() {
        let test_key = "sk-or-v1-test-key";

        store_key(test_key).unwrap();
        let retrieved = get_stored_key().unwrap();
        assert_eq!(retrieved, test_key);

        delete_key().unwrap();
    }
}
```

### OpenRouter Client (auth/openrouter.rs)

```rust
use anyhow::{Result, Context};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const OPENROUTER_API_BASE: &str = "https://openrouter.ai/api/v1";

#[derive(Serialize)]
struct TokenRequest {
    code: String,
    code_verifier: String,
}

#[derive(Deserialize)]
struct TokenResponse {
    key: String,
}

#[derive(Deserialize)]
struct KeyInfoResponse {
    data: KeyInfo,
}

#[derive(Deserialize)]
struct KeyInfo {
    label: String,
    limit: Option<f64>,
    usage: f64,
    rate_limit: RateLimit,
}

#[derive(Deserialize)]
struct RateLimit {
    requests: u32,
    interval: String,
}

/// Exchange authorization code for API key
pub async fn exchange_code(code: String, code_verifier: String) -> Result<String> {
    let client = Client::new();

    let request = TokenRequest {
        code,
        code_verifier,
    };

    let response = client
        .post(format!("{}/auth/keys", OPENROUTER_API_BASE))
        .json(&request)
        .send()
        .await
        .context("Failed to send token exchange request")?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "Token exchange failed ({}): {}",
            status,
            error_text
        ));
    }

    let token_response: TokenResponse = response
        .json()
        .await
        .context("Failed to parse token response")?;

    Ok(token_response.key)
}

/// Validate API key by checking account info
pub async fn validate_key(api_key: &str) -> Result<bool> {
    let client = Client::new();

    let response = client
        .get(format!("{}/key", OPENROUTER_API_BASE))
        .bearer_auth(api_key)
        .send()
        .await
        .context("Failed to validate API key")?;

    Ok(response.status().is_success())
}

/// Get API key information (rate limits, usage, etc.)
pub async fn get_key_info(api_key: &str) -> Result<KeyInfo> {
    let client = Client::new();

    let response = client
        .get(format!("{}/key", OPENROUTER_API_BASE))
        .bearer_auth(api_key)
        .send()
        .await
        .context("Failed to fetch key info")?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "Failed to get key info: {}",
            response.status()
        ));
    }

    let info: KeyInfoResponse = response
        .json()
        .await
        .context("Failed to parse key info response")?;

    Ok(info.data)
}

/// OpenRouter API client for making model requests
pub struct OpenRouterClient {
    client: Client,
    api_key: String,
}

impl OpenRouterClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }

    /// Make a chat completion request
    pub async fn chat_completion(
        &self,
        model: &str,
        messages: Vec<ChatMessage>,
    ) -> Result<ChatResponse> {
        let request = ChatRequest {
            model: model.to_string(),
            messages,
        };

        let response = self.client
            .post(format!("{}/chat/completions", OPENROUTER_API_BASE))
            .bearer_auth(&self.api_key)
            .json(&request)
            .send()
            .await
            .context("Failed to send chat request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!(
                "Chat request failed ({}): {}",
                status,
                error_text
            ));
        }

        response
            .json()
            .await
            .context("Failed to parse chat response")
    }
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
}

#[derive(Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub model: String,
    pub choices: Vec<Choice>,
}

#[derive(Deserialize)]
pub struct Choice {
    pub message: ChatMessage,
    pub finish_reason: String,
}
```

---

## 4. Security Considerations

### Token Storage Security

**Platform-Specific Secure Storage:**

The `keyring` crate uses OS-native secure storage:
- **macOS:** Keychain
- **Windows:** Credential Manager
- **Linux:** Secret Service API (GNOME Keyring, KWallet) or keyutils

**Best Practices:**
1. **Never store tokens in plain text** (files, environment variables, logs)
2. **Use keyring for persistent storage** of API keys
3. **Memory safety:** Clear sensitive data from memory after use
4. **Avoid hardcoding:** No client secrets in source code (PKCE doesn't need them)

**Source:** [Keyring-rs Documentation](https://docs.rs/keyring)

### PKCE Security Benefits

1. **Protection Against Interception:** Even if authorization code is intercepted, attacker cannot exchange it without `code_verifier`
2. **No Client Secret Required:** Safe for public clients (CLI/TUI apps)
3. **Single-Use Codes:** Authorization codes expire after one use
4. **Dynamic Verification:** Each authentication flow uses unique PKCE parameters

**Source:** [OAuth Best Practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)

### Network Security

```rust
use reqwest::Client;
use std::time::Duration;

fn create_secure_client() -> Result<Client> {
    Client::builder()
        // Enforce HTTPS
        .https_only(true)
        // Disable redirect following (SSRF protection)
        .redirect(reqwest::redirect::Policy::none())
        // Set reasonable timeout
        .timeout(Duration::from_secs(30))
        // Connection timeout
        .connect_timeout(Duration::from_secs(10))
        .build()
        .context("Failed to create HTTP client")
}
```

### Token Refresh and Expiration

OpenRouter API keys created via OAuth PKCE:
- **Do not expire automatically**
- **Can be revoked by user** in OpenRouter dashboard
- **Should be validated periodically** before use

**Handling Invalid/Expired Keys:**

```rust
pub async fn ensure_valid_key() -> Result<String> {
    match storage::get_stored_key() {
        Ok(key) => {
            // Validate key is still valid
            if openrouter::validate_key(&key).await? {
                return Ok(key);
            }

            // Key is invalid, re-authenticate
            println!("API key is no longer valid. Re-authenticating...");
            storage::delete_key()?;
        }
        Err(_) => {
            // No stored key
        }
    }

    // Start new authentication flow
    authenticate().await
}
```

### Rate Limit Handling

```rust
use std::time::{Duration, Instant};
use tokio::time::sleep;

pub struct RateLimiter {
    requests_per_minute: u32,
    requests: Vec<Instant>,
}

impl RateLimiter {
    pub fn new(requests_per_minute: u32) -> Self {
        Self {
            requests_per_minute,
            requests: Vec::new(),
        }
    }

    pub async fn acquire(&mut self) {
        let now = Instant::now();
        let minute_ago = now - Duration::from_secs(60);

        // Remove requests older than 1 minute
        self.requests.retain(|&instant| instant > minute_ago);

        // Check if we're at the limit
        if self.requests.len() >= self.requests_per_minute as usize {
            // Calculate wait time
            let oldest = self.requests[0];
            let wait_until = oldest + Duration::from_secs(60);
            let wait_duration = wait_until.duration_since(now);

            println!("Rate limit reached. Waiting {:?}...", wait_duration);
            sleep(wait_duration).await;
        }

        self.requests.push(now);
    }
}
```

### Error Information Disclosure

**DO NOT expose sensitive information in error messages:**

```rust
// ❌ BAD: Exposes internal details
Err(format!("Auth failed: code={}, verifier={}", code, verifier))

// ✅ GOOD: Generic error message
Err("Authentication failed. Please try again.")
```

**Sources:**
- [OAuth Security Best Practices](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)
- [OWASP OAuth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)

---

## 5. Code Examples

### Complete Authentication Flow

```rust
use anyhow::Result;
use flow::auth;

#[tokio::main]
async fn main() -> Result<()> {
    // Authenticate with OpenRouter
    let api_key = auth::authenticate().await?;

    // Create API client
    let client = auth::OpenRouterClient::new(api_key);

    // Get key information
    let key_info = auth::openrouter::get_key_info(&client.api_key).await?;
    println!("API Key Info:");
    println!("  Label: {}", key_info.label);
    println!("  Usage: ${:.2}", key_info.usage);
    println!("  Rate Limit: {} requests per {}",
        key_info.rate_limit.requests,
        key_info.rate_limit.interval
    );

    // Make a chat request
    let messages = vec![
        auth::openrouter::ChatMessage {
            role: "user".to_string(),
            content: "Hello! How are you?".to_string(),
        },
    ];

    let response = client
        .chat_completion("anthropic/claude-3.5-sonnet", messages)
        .await?;

    println!("\nModel: {}", response.model);
    println!("Response: {}", response.choices[0].message.content);

    Ok(())
}
```

### TUI Integration Example

```rust
use ratatui::{
    backend::CrosstermBackend,
    Terminal,
    widgets::{Block, Borders, Paragraph},
    layout::{Layout, Constraint, Direction},
};
use crossterm::{
    terminal::{enable_raw_mode, disable_raw_mode},
    event::{self, Event, KeyCode},
};

pub struct App {
    client: Option<auth::OpenRouterClient>,
    status: String,
}

impl App {
    pub fn new() -> Self {
        Self {
            client: None,
            status: "Not authenticated".to_string(),
        }
    }

    pub async fn authenticate(&mut self) -> Result<()> {
        self.status = "Authenticating...".to_string();

        match auth::authenticate().await {
            Ok(api_key) => {
                self.client = Some(auth::OpenRouterClient::new(api_key));
                self.status = "✓ Authenticated".to_string();
                Ok(())
            }
            Err(e) => {
                self.status = format!("✗ Authentication failed: {}", e);
                Err(e)
            }
        }
    }

    pub async fn run(&mut self) -> Result<()> {
        // Setup terminal
        enable_raw_mode()?;
        let mut stdout = std::io::stdout();
        let backend = CrosstermBackend::new(stdout);
        let mut terminal = Terminal::new(backend)?;

        loop {
            // Draw UI
            terminal.draw(|f| {
                let chunks = Layout::default()
                    .direction(Direction::Vertical)
                    .constraints([
                        Constraint::Length(3),
                        Constraint::Min(0),
                    ])
                    .split(f.size());

                let status_block = Block::default()
                    .title("Status")
                    .borders(Borders::ALL);

                let status_text = Paragraph::new(self.status.clone())
                    .block(status_block);

                f.render_widget(status_text, chunks[0]);
            })?;

            // Handle events
            if event::poll(std::time::Duration::from_millis(100))? {
                if let Event::Key(key) = event::read()? {
                    match key.code {
                        KeyCode::Char('q') => break,
                        KeyCode::Char('a') => {
                            // Start authentication
                            self.authenticate().await?;
                        }
                        _ => {}
                    }
                }
            }
        }

        // Cleanup
        disable_raw_mode()?;
        Ok(())
    }
}
```

### Configuration Management

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use anyhow::{Result, Context};

#[derive(Serialize, Deserialize, Default)]
pub struct Config {
    pub openrouter: OpenRouterConfig,
}

#[derive(Serialize, Deserialize)]
pub struct OpenRouterConfig {
    pub default_model: String,
    pub max_tokens: u32,
    pub temperature: f32,
}

impl Default for OpenRouterConfig {
    fn default() -> Self {
        Self {
            default_model: "anthropic/claude-3.5-sonnet".to_string(),
            max_tokens: 1024,
            temperature: 0.7,
        }
    }
}

pub fn config_path() -> Result<PathBuf> {
    let config_dir = dirs::config_dir()
        .context("Failed to get config directory")?;

    Ok(config_dir.join("flow-orchestrator").join("config.toml"))
}

pub fn load_config() -> Result<Config> {
    let path = config_path()?;

    if !path.exists() {
        // Create default config
        let config = Config::default();
        save_config(&config)?;
        return Ok(config);
    }

    let contents = std::fs::read_to_string(&path)
        .context("Failed to read config file")?;

    toml::from_str(&contents)
        .context("Failed to parse config file")
}

pub fn save_config(config: &Config) -> Result<()> {
    let path = config_path()?;

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let contents = toml::to_string_pretty(config)
        .context("Failed to serialize config")?;

    std::fs::write(&path, contents)
        .context("Failed to write config file")?;

    Ok(())
}
```

---

## 6. Error Handling

### Structured Error Types

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AuthError {
    #[error("PKCE parameter generation failed: {0}")]
    PkceGenerationError(String),

    #[error("OAuth callback timeout after {0}s")]
    CallbackTimeout(u64),

    #[error("Invalid authorization code")]
    InvalidAuthCode,

    #[error("Token exchange failed: {0}")]
    TokenExchangeError(String),

    #[error("Keyring access failed: {0}")]
    KeyringError(String),

    #[error("API key validation failed")]
    InvalidApiKey,

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

pub type AuthResult<T> = Result<T, AuthError>;
```

### User-Friendly Error Messages

```rust
pub fn handle_auth_error(error: &AuthError) {
    match error {
        AuthError::CallbackTimeout(_) => {
            eprintln!("❌ Authentication timeout");
            eprintln!("   The browser window may have been closed.");
            eprintln!("   Please try again with: flow auth login");
        }

        AuthError::TokenExchangeError(msg) => {
            eprintln!("❌ Authentication failed");
            eprintln!("   {}", msg);
            eprintln!("   Please check your OpenRouter account and try again.");
        }

        AuthError::KeyringError(_) => {
            eprintln!("❌ Unable to store credentials securely");
            eprintln!("   Please ensure your system keyring is available.");
            eprintln!("   Linux users: Install gnome-keyring or kwallet");
        }

        AuthError::InvalidApiKey => {
            eprintln!("❌ API key is no longer valid");
            eprintln!("   Please re-authenticate with: flow auth login");
        }

        AuthError::NetworkError(e) => {
            eprintln!("❌ Network error: {}", e);
            eprintln!("   Please check your internet connection.");
        }

        _ => {
            eprintln!("❌ Authentication error: {}", error);
        }
    }
}
```

### Retry Logic with Exponential Backoff

```rust
use std::time::Duration;
use tokio::time::sleep;

pub async fn retry_with_backoff<F, T, E>(
    mut operation: F,
    max_retries: u32,
) -> Result<T, E>
where
    F: FnMut() -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<T, E>>>>,
    E: std::fmt::Display,
{
    let mut attempts = 0;

    loop {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(error) => {
                attempts += 1;

                if attempts >= max_retries {
                    return Err(error);
                }

                let delay = Duration::from_secs(2u64.pow(attempts));
                println!("Attempt {} failed: {}. Retrying in {:?}...",
                    attempts, error, delay);

                sleep(delay).await;
            }
        }
    }
}

// Usage example
async fn fetch_with_retry() -> Result<String> {
    retry_with_backoff(
        || Box::pin(auth::openrouter::validate_key("key")),
        3,
    ).await
}
```

---

## 7. Testing Strategy

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pkce_params_generation() {
        let (verifier, challenge) = pkce::generate_params().unwrap();

        // Verify verifier length
        assert_eq!(verifier.len(), 128);

        // Verify challenge is base64
        assert!(challenge.chars().all(|c|
            c.is_alphanumeric() || c == '-' || c == '_'
        ));
    }

    #[test]
    fn test_code_extraction() {
        let request = "GET /callback?code=abc123&state=xyz HTTP/1.1\r\n";
        let code = callback::extract_code(request);
        assert_eq!(code, Some("abc123".to_string()));
    }

    #[tokio::test]
    async fn test_keyring_storage() {
        let test_key = "sk-or-v1-test";

        storage::store_key(test_key).unwrap();
        let retrieved = storage::get_stored_key().unwrap();
        assert_eq!(retrieved, test_key);

        storage::delete_key().unwrap();
        assert!(storage::get_stored_key().is_err());
    }
}
```

### Integration Tests

```rust
// tests/integration_test.rs
use flow::auth;

#[tokio::test]
#[ignore] // Run manually with --ignored flag
async fn test_full_auth_flow() {
    // This test requires manual interaction
    let api_key = auth::authenticate().await.unwrap();
    assert!(api_key.starts_with("sk-or-v1-"));

    // Validate key
    let is_valid = auth::openrouter::validate_key(&api_key).await.unwrap();
    assert!(is_valid);

    // Test API call
    let client = auth::OpenRouterClient::new(api_key);
    let messages = vec![
        auth::openrouter::ChatMessage {
            role: "user".to_string(),
            content: "Say hello".to_string(),
        },
    ];

    let response = client
        .chat_completion("anthropic/claude-3.5-sonnet", messages)
        .await
        .unwrap();

    assert!(!response.choices.is_empty());
}
```

### Mock Server for Testing

```rust
use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path};

#[tokio::test]
async fn test_token_exchange_with_mock() {
    // Start mock server
    let mock_server = MockServer::start().await;

    // Setup mock endpoint
    Mock::given(method("POST"))
        .and(path("/api/v1/auth/keys"))
        .respond_with(ResponseTemplate::new(200).set_body_json(
            serde_json::json!({
                "key": "sk-or-v1-mock-key-12345"
            })
        ))
        .mount(&mock_server)
        .await;

    // Test exchange function (modify to accept custom base URL)
    let api_key = exchange_code_with_url(
        "test_code".to_string(),
        "test_verifier".to_string(),
        &mock_server.uri(),
    ).await.unwrap();

    assert_eq!(api_key, "sk-or-v1-mock-key-12345");
}
```

### Manual Testing Checklist

```markdown
## Authentication Flow Testing

- [ ] Run `flow auth login` from command line
- [ ] Verify browser opens to OpenRouter authorization page
- [ ] Complete authorization in browser
- [ ] Verify success message in terminal
- [ ] Verify API key stored in keyring
- [ ] Test `flow auth status` shows authenticated
- [ ] Test `flow auth logout` removes credentials
- [ ] Test re-authentication after logout

## Error Scenario Testing

- [ ] Cancel authorization in browser (should handle gracefully)
- [ ] Close browser before completing auth (should timeout)
- [ ] Revoke API key in OpenRouter dashboard (should detect invalid key)
- [ ] Test with no internet connection (should show network error)
- [ ] Test on Linux without keyring (should show keyring error)

## API Request Testing

- [ ] Make chat completion request with valid key
- [ ] Test rate limiting behavior
- [ ] Test with free model (check rate limits)
- [ ] Test with paid model (check credit deduction)
- [ ] Test streaming responses
- [ ] Test different model providers

## Cross-Platform Testing

- [ ] Test on macOS (Keychain)
- [ ] Test on Windows (Credential Manager)
- [ ] Test on Linux (GNOME Keyring)
- [ ] Test on Linux (KWallet)
```

---

## 8. Implementation Roadmap

### Phase 1: Core Authentication (Week 1)
1. ✅ Implement PKCE parameter generation
2. ✅ Create callback server
3. ✅ Implement token exchange
4. ✅ Add keyring storage
5. ✅ Create basic CLI commands

### Phase 2: Integration (Week 2)
1. Integrate with existing TUI
2. Add authentication status display
3. Implement automatic re-authentication
4. Add configuration management
5. Create user documentation

### Phase 3: API Client (Week 3)
1. Implement OpenRouter API client
2. Add streaming support
3. Implement rate limiting
4. Add model selection
5. Create usage tracking

### Phase 4: Polish & Testing (Week 4)
1. Comprehensive error handling
2. Write unit and integration tests
3. Add logging and telemetry
4. Performance optimization
5. Security audit

---

## 9. Additional Resources

### Official Documentation
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [OpenRouter OAuth PKCE](https://openrouter.ai/docs/use-cases/oauth-pkce)
- [OpenRouter API Reference](https://openrouter.ai/docs/api/reference/overview)
- [OpenRouter Rate Limits](https://openrouter.ai/docs/limits)
- [OpenRouter Pricing](https://openrouter.ai/pricing)

### OAuth & PKCE Resources
- [OAuth 2.0 from Command Line - Okta](https://developer.okta.com/blog/2018/07/16/oauth-2-command-line)
- [How to OAuth from CLI - DEV Community](https://dev.to/lauravuo/how-to-oauth-from-the-command-line-47j0)
- [OAuth Best Practices - Google](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- [OWASP OAuth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [Refresh Token Best Practices - Auth0](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)

### Rust Crates Documentation
- [oauth2 crate](https://docs.rs/oauth2/latest/oauth2/)
- [reqwest crate](https://docs.rs/reqwest/latest/reqwest/)
- [keyring crate](https://docs.rs/keyring/latest/keyring/)
- [tokio runtime](https://tokio.rs/)
- [serde JSON](https://docs.rs/serde_json/latest/serde_json/)

### Community Examples
- [GitHub CLI OAuth Implementation](https://github.com/cli/oauth)
- [OAuth2-RS Examples](https://github.com/ramosbugs/oauth2-rs/tree/main/examples)
- [Simple Async HTTP Server for OAuth2 - Rust Forum](https://users.rust-lang.org/t/simple-async-http-server-for-oauth2/130620)

---

## 10. Summary & Next Steps

### Key Takeaways

1. **PKCE is Perfect for CLI/TUI:** No client secret needed, browser-based auth, secure token exchange
2. **Keyring for Storage:** Use OS-native secure storage for API keys
3. **Tokio for Async:** Async HTTP server for OAuth callback, async API requests
4. **Rate Limiting:** Implement client-side rate limiting to respect OpenRouter limits
5. **Error Handling:** Comprehensive error types with user-friendly messages

### Immediate Next Steps

1. **Add Dependencies:** Update `Cargo.toml` with required crates
2. **Create Module Structure:** Set up `src/auth/` directory structure
3. **Implement PKCE:** Start with `pkce.rs` and test PKCE parameter generation
4. **Build Callback Server:** Implement `callback.rs` with async HTTP server
5. **Test Token Exchange:** Implement and test `openrouter.rs` token exchange
6. **Add Keyring Storage:** Implement `storage.rs` with platform-specific keyring
7. **Create CLI Commands:** Add `flow auth login`, `flow auth status`, `flow auth logout`
8. **Integrate with TUI:** Update TUI to show authentication status

### Success Criteria

- ✅ User can authenticate via browser with `flow auth login`
- ✅ API key stored securely in system keyring
- ✅ API key automatically used for OpenRouter requests
- ✅ Rate limiting prevents exceeding OpenRouter limits
- ✅ Clear error messages for authentication failures
- ✅ Automatic re-authentication when key becomes invalid
- ✅ Cross-platform support (macOS, Linux, Windows)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-25
**Author:** Research Agent (Flow Orchestrator Project)
