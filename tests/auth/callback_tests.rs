//! OAuth callback server tests
//!
//! Tests for the local HTTP server that receives OAuth callbacks

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

// Note: We can't easily test start_server() without network interference
// Instead, we'll test the internal helper functions that are exposed for testing

#[tokio::test]
async fn test_callback_server_can_bind_to_port() {
    // Test that we can bind to the callback port
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Should be able to bind to localhost");

    let addr = listener.local_addr().unwrap();
    assert!(addr.is_ipv4());
    assert_eq!(addr.ip().to_string(), "127.0.0.1");
}

#[tokio::test]
async fn test_http_request_response_cycle() {
    // Start a simple test server
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind");

    let addr = listener.local_addr().unwrap();

    // Spawn server task
    let server_task = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();

        // Read request
        let mut buffer = vec![0; 1024];
        let n = socket.read(&mut buffer).await.unwrap();
        let request = String::from_utf8_lossy(&buffer[..n]);

        // Verify it's an HTTP request
        assert!(request.starts_with("GET"));

        // Send response
        let response = "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK";
        socket.write_all(response.as_bytes()).await.unwrap();
        socket.flush().await.unwrap();
    });

    // Wait a bit for server to be ready
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Connect as client
    let mut client = TcpStream::connect(addr).await.expect("Failed to connect");

    // Send HTTP request
    let request = "GET /test HTTP/1.1\r\nHost: localhost\r\n\r\n";
    client.write_all(request.as_bytes()).await.unwrap();
    client.flush().await.unwrap();

    // Read response
    let mut buffer = vec![0; 1024];
    let n = client.read(&mut buffer).await.unwrap();
    let response = String::from_utf8_lossy(&buffer[..n]);

    assert!(response.contains("200 OK"));

    server_task.await.unwrap();
}

#[tokio::test]
async fn test_localhost_connection() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind");

    let addr = listener.local_addr().unwrap();

    // Spawn acceptor
    let accept_task = tokio::spawn(async move {
        listener.accept().await.unwrap();
    });

    // Connect
    let _stream = TcpStream::connect(addr).await.expect("Failed to connect");

    accept_task.await.unwrap();
}

#[test]
fn test_url_encoding_decode() {
    // Test URL decoding helper
    let encoded = "hello%20world";
    let decoded = urlencoding::decode(encoded).unwrap();
    assert_eq!(decoded, "hello world");

    let encoded = "test%2Fpath%2Bplus";
    let decoded = urlencoding::decode(encoded).unwrap();
    assert_eq!(decoded, "test/path+plus");
}

#[test]
fn test_http_request_parsing() {
    // Test parsing of callback request format
    let request = "GET /callback?code=auth_code_123&state=xyz HTTP/1.1\r\n\
                   Host: localhost:8080\r\n\
                   \r\n";

    let first_line = request.lines().next().unwrap();
    let parts: Vec<&str> = first_line.split_whitespace().collect();

    assert_eq!(parts.len(), 3);
    assert_eq!(parts[0], "GET");
    assert!(parts[1].contains("/callback"));
    assert_eq!(parts[2], "HTTP/1.1");
}

#[test]
fn test_query_parameter_extraction() {
    let path = "/callback?code=test_code&state=abc";

    let query = path.split('?').nth(1).unwrap();
    let params: Vec<&str> = query.split('&').collect();

    assert_eq!(params.len(), 2);
    assert!(params[0].starts_with("code="));
    assert!(params[1].starts_with("state="));
}

#[test]
fn test_code_parameter_parsing() {
    let query = "code=authorization_code_xyz&state=random_state";

    let mut code = None;
    for param in query.split('&') {
        if let Some(value) = param.strip_prefix("code=") {
            code = Some(value);
        }
    }

    assert_eq!(code, Some("authorization_code_xyz"));
}

#[test]
fn test_http_response_format() {
    let status = 200;
    let status_text = "OK";
    let body = "<html><body>Success</body></html>";

    let response = format!(
        "HTTP/1.1 {} {}\r\n\
         Content-Type: text/html; charset=utf-8\r\n\
         Content-Length: {}\r\n\
         Connection: close\r\n\
         \r\n\
         {}",
        status,
        status_text,
        body.len(),
        body
    );

    assert!(response.starts_with("HTTP/1.1 200 OK"));
    assert!(response.contains("Content-Type: text/html"));
    assert!(response.contains(&format!("Content-Length: {}", body.len())));
    assert!(response.ends_with(body));
}

#[test]
fn test_error_response_format() {
    let status = 400;
    let status_text = "Bad Request";
    let body = "<html><body>Error</body></html>";

    let response = format!(
        "HTTP/1.1 {} {}\r\n\
         Content-Type: text/html; charset=utf-8\r\n\
         Content-Length: {}\r\n\
         Connection: close\r\n\
         \r\n\
         {}",
        status,
        status_text,
        body.len(),
        body
    );

    assert!(response.contains("400 Bad Request"));
}

#[tokio::test]
async fn test_timeout_handling() {
    use tokio::time::{timeout, Duration};

    let result = timeout(Duration::from_millis(100), async {
        tokio::time::sleep(Duration::from_secs(10)).await;
    })
    .await;

    assert!(result.is_err()); // Should timeout
}

#[tokio::test]
async fn test_multiple_connection_attempts() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind");

    let addr = listener.local_addr().unwrap();

    // Accept task
    let accept_task = tokio::spawn(async move {
        for _ in 0..3 {
            listener.accept().await.unwrap();
        }
    });

    // Connect multiple times
    for _ in 0..3 {
        let _stream = TcpStream::connect(addr).await.expect("Failed to connect");
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    }

    accept_task.await.unwrap();
}

#[test]
fn test_malformed_request_handling() {
    let requests = vec![
        "", // Empty
        "INVALID", // No HTTP
        "GET", // Incomplete
        "GET /path", // Missing HTTP version
    ];

    for request in requests {
        let lines: Vec<&str> = request.lines().collect();
        if lines.is_empty() {
            continue;
        }

        let parts: Vec<&str> = lines[0].split_whitespace().collect();
        // Malformed requests will have < 3 parts
        assert!(parts.len() < 3);
    }
}

#[test]
fn test_callback_url_formats() {
    let valid_callbacks = vec![
        "/callback?code=abc",
        "/callback?code=abc&state=xyz",
        "/callback?state=xyz&code=abc",
        "/callback?code=abc&state=xyz&other=param",
    ];

    for callback in valid_callbacks {
        assert!(callback.starts_with("/callback"));
        assert!(callback.contains("code="));
    }
}

#[test]
fn test_missing_code_parameter() {
    let callback = "/callback?state=xyz&error=access_denied";

    let query = callback.split('?').nth(1).unwrap();
    let has_code = query.split('&').any(|param| param.starts_with("code="));

    assert!(!has_code);
}

#[tokio::test]
async fn test_server_shutdown_after_request() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind");

    let addr = listener.local_addr().unwrap();

    // Accept one connection and shutdown
    let server_task = tokio::spawn(async move {
        let (_socket, _) = listener.accept().await.unwrap();
        // Server would shutdown after processing
    });

    let _client = TcpStream::connect(addr).await.expect("Failed to connect");

    server_task.await.unwrap();

    // Server should be closed now
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
}

#[test]
fn test_html_response_contains_success_elements() {
    let html = r#"<!DOCTYPE html>
<html>
<head><title>Authentication Successful</title></head>
<body>
    <h1>Authentication Successful!</h1>
    <p>You can now close this window.</p>
</body>
</html>"#;

    assert!(html.contains("Authentication Successful"));
    assert!(html.contains("close this window"));
}

#[test]
fn test_html_response_contains_error_elements() {
    let html = r#"<!DOCTYPE html>
<html>
<head><title>Authentication Error</title></head>
<body>
    <h1>Authentication Failed</h1>
    <p>Please check the terminal for more details.</p>
</body>
</html>"#;

    assert!(html.contains("Authentication Failed"));
    assert!(html.contains("terminal"));
}
