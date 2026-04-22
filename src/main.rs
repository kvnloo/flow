//! Flow Orchestrator TUI - Main Entry Point
//!
//! This is the main entry point for the Flow Orchestrator terminal application.
//! It handles CLI argument parsing, logging setup, and application lifecycle.

use clap::Parser;
use flow_orchestrator_tui::{App, Result};
use tracing::{error, info};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// Flow Orchestrator TUI - Multi-agent orchestration dashboard
#[derive(Parser, Debug)]
#[command(
    name = "flow",
    version,
    about = "Terminal UI for Flow-Nexus orchestration and swarm management",
    long_about = None
)]
struct Args {
    /// Log level (trace, debug, info, warn, error)
    #[arg(short, long, default_value = "info")]
    log_level: String,

    /// Configuration file path
    #[arg(short, long)]
    config: Option<String>,

    /// Enable debug mode
    #[arg(short, long)]
    debug: bool,

    /// Skip authentication check
    #[arg(long)]
    no_auth: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Parse CLI arguments
    let args = Args::parse();

    // Setup logging
    setup_logging(&args)?;

    info!("Starting Flow Orchestrator TUI v{}", env!("CARGO_PKG_VERSION"));
    info!("Log level: {}", args.log_level);

    // Handle panic
    setup_panic_hook();

    // Run application
    let result = run_app(args).await;

    // Handle errors
    if let Err(e) = &result {
        error!("Application error: {}", e);
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }

    info!("Application terminated successfully");
    Ok(())
}

/// Setup logging with tracing
fn setup_logging(args: &Args) -> Result<()> {
    let log_level = if args.debug {
        "debug"
    } else {
        &args.log_level
    };

    let filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new(log_level))
        .unwrap();

    // Console logging
    let console_layer = fmt::layer()
        .with_target(false)
        .with_thread_ids(false)
        .with_file(true)
        .with_line_number(true);

    // File logging
    let log_dir = std::env::temp_dir().join("flow-tui");
    std::fs::create_dir_all(&log_dir)?;

    let file_appender = tracing_appender::rolling::daily(log_dir, "flow-tui.log");
    let file_layer = fmt::layer()
        .with_ansi(false)
        .with_writer(file_appender);

    tracing_subscriber::registry()
        .with(filter)
        .with(console_layer)
        .with(file_layer)
        .init();

    Ok(())
}

/// Setup panic hook for better error messages
fn setup_panic_hook() {
    let default_panic = std::panic::take_hook();

    std::panic::set_hook(Box::new(move |info| {
        // Restore terminal
        let _ = crossterm::terminal::disable_raw_mode();
        let _ = crossterm::execute!(
            std::io::stdout(),
            crossterm::terminal::LeaveAlternateScreen,
            crossterm::event::DisableMouseCapture
        );

        // Call default panic handler
        default_panic(info);
    }));
}

/// Run the application
async fn run_app(args: Args) -> Result<()> {
    // Override config file if provided
    if let Some(config_path) = args.config {
        std::env::set_var("FLOW_CONFIG_PATH", config_path);
    }

    // Create and run application
    let mut app = App::new().await?;
    app.run().await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_parsing() {
        let args = Args::parse_from(&["flow", "--log-level", "debug"]);
        assert_eq!(args.log_level, "debug");
    }

    #[test]
    fn test_debug_flag() {
        let args = Args::parse_from(&["flow", "--debug"]);
        assert!(args.debug);
    }
}
