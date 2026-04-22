//! OAuth callback server
//!
//! This module implements a local HTTP server to receive the OAuth callback
//! after user authorization. It runs temporarily on localhost:8080 to capture
//! the authorization code.

use anyhow::{Context, Result};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

const BIND_ADDRESS: &str = "127.0.0.1:8080";

/// HTML response shown to user after successful authentication
const SUCCESS_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Successful</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .card {
            background: white;
            padding: 3rem;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
        }
        h1 {
            color: #2d3748;
            margin-bottom: 1rem;
            font-size: 2rem;
            font-weight: 600;
        }
        p {
            color: #4a5568;
            font-size: 1.1rem;
            line-height: 1.6;
        }
        .code {
            background: #f7fafc;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            color: #2d3748;
            margin-top: 1rem;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✓</div>
        <h1>Authentication Successful!</h1>
        <p>You have successfully authenticated with OpenRouter.</p>
        <p style="margin-top: 1.5rem;">You can now close this window and return to the terminal.</p>
    </div>
</body>
</html>"#;

/// HTML response shown when authentication fails
const ERROR_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Error</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 20px;
        }
        .card {
            background: white;
            padding: 3rem;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
        }
        h1 {
            color: #c53030;
            margin-bottom: 1rem;
            font-size: 2rem;
            font-weight: 600;
        }
        p {
            color: #4a5568;
            font-size: 1.1rem;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✗</div>
        <h1>Authentication Failed</h1>
        <p>We encountered an error during authentication.</p>
        <p style="margin-top: 1.5rem;">Please check the terminal for more details and try again.</p>
    </div>
</body>
</html>"#;

/// Start local HTTP server to receive OAuth callback
///
/// This server:
/// 1. Binds to localhost:8080
/// 2. Accepts a single HTTP request
/// 3. Extracts the authorization code from query parameters
/// 4. Responds with success/error HTML
/// 5. Shuts down immediately
///
/// # Returns
/// The authorization code from the OAuth callback
pub async fn start_server() -> Result<String> {
    let listener = TcpListener::bind(BIND_ADDRESS)
        .await
        .context(format!("Failed to bind to {}. Is port 8080 already in use?", BIND_ADDRESS))?;

    tracing::info!("Callback server listening on {}", BIND_ADDRESS);
    tracing::info!("Waiting for OAuth callback from browser...");

    // Accept a single connection
    let (mut socket, addr) = listener.accept().await?;
    tracing::debug!("Received connection from {}", addr);

    // Read HTTP request
    let mut buffer = vec![0; 4096];
    let n = socket
        .read(&mut buffer)
        .await
        .context("Failed to read callback request")?;

    let request = String::from_utf8_lossy(&buffer[..n]);
    tracing::debug!("Received request: {}", request.lines().next().unwrap_or(""));

    // Extract authorization code
    match extract_code(&request) {
        Some(code) => {
            tracing::info!("Successfully received authorization code");
            send_response(&mut socket, 200, SUCCESS_HTML).await?;
            Ok(code)
        }
        None => {
            tracing::error!("No authorization code found in callback");
            send_response(&mut socket, 400, ERROR_HTML).await?;
            anyhow::bail!("No authorization code found in OAuth callback")
        }
    }
}

/// Extract authorization code from HTTP request
///
/// Parses the query parameters from the request path and looks for the `code` parameter.
fn extract_code(request: &str) -> Option<String> {
    // Parse request line: GET /callback?code=xxx&state=yyy HTTP/1.1
    let request_line = request.lines().next()?;
    let parts: Vec<&str> = request_line.split_whitespace().collect();

    if parts.len() < 2 {
        return None;
    }

    let path = parts[1];

    // Parse query parameters
    let query = path.split('?').nth(1)?;

    for param in query.split('&') {
        if let Some(value) = param.strip_prefix("code=") {
            return Some(url_decode(value));
        }
    }

    None
}

/// Send HTTP response to browser
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
        "HTTP/1.1 {} {}\r\n\
         Content-Type: text/html; charset=utf-8\r\n\
         Content-Length: {}\r\n\
         Connection: close\r\n\
         \r\n\
         {}",
        status, status_text, body.len(), body
    );

    socket.write_all(response.as_bytes()).await?;
    socket.flush().await?;

    Ok(())
}

/// Simple URL decoder for query parameters
fn url_decode(s: &str) -> String {
    urlencoding::decode(s)
        .unwrap_or_else(|_| std::borrow::Cow::Borrowed(s))
        .into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_code_success() {
        let request = "GET /callback?code=test_auth_code_123&state=xyz HTTP/1.1\r\n\
                       Host: localhost:8080\r\n\
                       \r\n";

        let code = extract_code(request);
        assert_eq!(code, Some("test_auth_code_123".to_string()));
    }

    #[test]
    fn test_extract_code_url_encoded() {
        let request = "GET /callback?code=test%20code%2Fwith%2Bspecial&state=xyz HTTP/1.1\r\n";

        let code = extract_code(request);
        assert_eq!(code, Some("test code/with+special".to_string()));
    }

    #[test]
    fn test_extract_code_missing() {
        let request = "GET /callback?state=xyz&error=access_denied HTTP/1.1\r\n";

        let code = extract_code(request);
        assert_eq!(code, None);
    }

    #[test]
    fn test_extract_code_malformed() {
        let request = "INVALID REQUEST";

        let code = extract_code(request);
        assert_eq!(code, None);
    }

    #[test]
    fn test_url_decode() {
        assert_eq!(url_decode("hello%20world"), "hello world");
        assert_eq!(url_decode("test%2Fpath"), "test/path");
        assert_eq!(url_decode("simple"), "simple");
    }
}
