//! Application module
//!
//! This module contains the core application logic, including the main
//! App struct, event handling, and the application lifecycle.

pub mod config;
pub mod state;

use crossterm::event::{Event as CrosstermEvent, EventStream, KeyCode, KeyEvent, KeyModifiers};
use futures::StreamExt;
use ratatui::{backend::CrosstermBackend, Terminal};
use std::io::Stdout;
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

use crate::error::{FlowError, Result};
use config::AppConfig;
use state::{AppState, Dashboard, Mode};

/// Main application structure
pub struct App {
    /// Application state
    pub state: AppState,

    /// Application configuration
    pub config: AppConfig,

    /// Event sender channel
    event_tx: mpsc::UnboundedSender<AppEvent>,

    /// Event receiver channel
    event_rx: mpsc::UnboundedReceiver<AppEvent>,

    /// Terminal backend
    terminal: Terminal<CrosstermBackend<Stdout>>,
}

/// Application events
#[derive(Debug, Clone)]
pub enum AppEvent {
    /// Key press event
    Key(KeyEvent),

    /// Terminal resize event
    Resize(u16, u16),

    /// Tick event for animations
    Tick,

    /// Request shutdown
    Quit,

    /// Switch to dashboard
    SwitchDashboard(Dashboard),

    /// Change mode
    ChangeMode(Mode),

    /// Execute command
    ExecuteCommand(String),
}

impl App {
    /// Create new application instance
    pub async fn new() -> Result<Self> {
        info!("Initializing Flow Orchestrator TUI");

        // Load configuration
        let config = AppConfig::load()?;
        debug!("Configuration loaded: {:?}", config.app);

        // Create event channels
        let (event_tx, event_rx) = mpsc::unbounded_channel();

        // Initialize terminal
        let terminal = Self::setup_terminal()?;

        // Create application state
        let state = AppState::new();

        Ok(Self {
            state,
            config,
            event_tx,
            event_rx,
            terminal,
        })
    }

    /// Setup terminal for TUI
    fn setup_terminal() -> Result<Terminal<CrosstermBackend<Stdout>>> {
        crossterm::terminal::enable_raw_mode()?;
        let mut stdout = std::io::stdout();
        crossterm::execute!(
            stdout,
            crossterm::terminal::EnterAlternateScreen,
            crossterm::event::EnableMouseCapture
        )?;
        let backend = CrosstermBackend::new(stdout);
        let terminal = Terminal::new(backend)?;
        Ok(terminal)
    }

    /// Restore terminal to normal mode
    fn restore_terminal(&mut self) -> Result<()> {
        crossterm::terminal::disable_raw_mode()?;
        crossterm::execute!(
            self.terminal.backend_mut(),
            crossterm::terminal::LeaveAlternateScreen,
            crossterm::event::DisableMouseCapture
        )?;
        self.terminal.show_cursor()?;
        Ok(())
    }

    /// Run the application
    pub async fn run(&mut self) -> Result<()> {
        info!("Starting application main loop");

        // Spawn input handler
        self.spawn_input_handler();

        // Spawn tick handler for animations
        self.spawn_tick_handler();

        // Main event loop
        while self.state.is_running() {
            // Render UI
            self.render()?;

            // Handle events
            if let Some(event) = self.event_rx.recv().await {
                self.handle_event(event).await?;
            }
        }

        // Cleanup
        self.restore_terminal()?;
        info!("Application shutdown complete");

        Ok(())
    }

    /// Spawn input event handler
    fn spawn_input_handler(&self) {
        let event_tx = self.event_tx.clone();

        tokio::spawn(async move {
            let mut reader = EventStream::new();

            while let Some(Ok(event)) = reader.next().await {
                match event {
                    CrosstermEvent::Key(key) => {
                        if event_tx.send(AppEvent::Key(key)).is_err() {
                            break;
                        }
                    }
                    CrosstermEvent::Resize(w, h) => {
                        if event_tx.send(AppEvent::Resize(w, h)).is_err() {
                            break;
                        }
                    }
                    _ => {}
                }
            }
        });
    }

    /// Spawn tick handler for animations
    fn spawn_tick_handler(&self) {
        let event_tx = self.event_tx.clone();
        let interval = std::time::Duration::from_millis(self.config.ui.update_interval);

        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(interval);

            loop {
                ticker.tick().await;
                if event_tx.send(AppEvent::Tick).is_err() {
                    break;
                }
            }
        });
    }

    /// Handle application events
    async fn handle_event(&mut self, event: AppEvent) -> Result<()> {
        match event {
            AppEvent::Key(key) => self.handle_key(key)?,
            AppEvent::Resize(w, h) => {
                self.state.terminal_size = (w, h);
                debug!("Terminal resized to {}x{}", w, h);
            }
            AppEvent::Tick => {
                // Animation tick - currently no-op
            }
            AppEvent::Quit => {
                info!("Quit requested");
                self.state.shutdown();
            }
            AppEvent::SwitchDashboard(dashboard) => {
                self.state.switch_dashboard(dashboard);
                info!("Switched to {} dashboard", dashboard.as_str());
            }
            AppEvent::ChangeMode(mode) => {
                self.state.set_mode(mode);
                debug!("Changed to {} mode", mode.as_str());
            }
            AppEvent::ExecuteCommand(cmd) => {
                self.execute_command(&cmd).await?;
            }
        }

        Ok(())
    }

    /// Handle key press
    fn handle_key(&mut self, key: KeyEvent) -> Result<()> {
        match self.state.mode {
            Mode::Normal => self.handle_normal_mode_key(key),
            Mode::Insert => self.handle_insert_mode_key(key),
            Mode::Command => self.handle_command_mode_key(key),
            Mode::Visual => self.handle_visual_mode_key(key),
        }
    }

    /// Handle key in normal mode
    fn handle_normal_mode_key(&mut self, key: KeyEvent) -> Result<()> {
        match key.code {
            // Quit
            KeyCode::Char('q') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                self.event_tx.send(AppEvent::Quit).ok();
            }
            KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                self.event_tx.send(AppEvent::Quit).ok();
            }

            // Mode switches
            KeyCode::Char(':') => {
                self.state.set_mode(Mode::Command);
            }
            KeyCode::Char('i') => {
                self.state.set_mode(Mode::Insert);
            }
            KeyCode::Char('v') => {
                self.state.set_mode(Mode::Visual);
            }

            // Dashboard switches (1-7)
            KeyCode::Char(c @ '1'..='7') => {
                let dashboards = Dashboard::all();
                let index = c.to_digit(10).unwrap() as usize - 1;
                if let Some(dashboard) = dashboards.get(index) {
                    self.event_tx
                        .send(AppEvent::SwitchDashboard(*dashboard))
                        .ok();
                }
            }

            // Navigation
            KeyCode::Char('j') | KeyCode::Down => {
                self.state.scroll_down("main", 1);
            }
            KeyCode::Char('k') | KeyCode::Up => {
                self.state.scroll_up("main", 1);
            }
            KeyCode::Char('d') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                self.state.scroll_down("main", 10);
            }
            KeyCode::Char('u') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                self.state.scroll_up("main", 10);
            }

            _ => {}
        }

        Ok(())
    }

    /// Handle key in insert mode
    fn handle_insert_mode_key(&mut self, key: KeyEvent) -> Result<()> {
        match key.code {
            KeyCode::Esc => {
                self.state.set_mode(Mode::Normal);
            }
            _ => {
                // Handle text input in specific contexts
            }
        }

        Ok(())
    }

    /// Handle key in command mode
    fn handle_command_mode_key(&mut self, key: KeyEvent) -> Result<()> {
        match key.code {
            KeyCode::Esc => {
                self.state.set_mode(Mode::Normal);
            }
            KeyCode::Enter => {
                let cmd = self.state.command_buffer.clone();
                self.state.add_command_to_history(cmd.clone());
                self.state.set_mode(Mode::Normal);
                self.event_tx.send(AppEvent::ExecuteCommand(cmd)).ok();
            }
            KeyCode::Char(c) => {
                self.state.command_buffer.push(c);
            }
            KeyCode::Backspace => {
                self.state.command_buffer.pop();
            }
            KeyCode::Up => {
                if let Some(cmd) = self.state.navigate_history(state::HistoryDirection::Up) {
                    self.state.command_buffer = cmd;
                }
            }
            KeyCode::Down => {
                if let Some(cmd) = self.state.navigate_history(state::HistoryDirection::Down) {
                    self.state.command_buffer = cmd;
                }
            }
            _ => {}
        }

        Ok(())
    }

    /// Handle key in visual mode
    fn handle_visual_mode_key(&mut self, key: KeyEvent) -> Result<()> {
        match key.code {
            KeyCode::Esc => {
                self.state.set_mode(Mode::Normal);
            }
            _ => {
                // Handle visual mode operations
            }
        }

        Ok(())
    }

    /// Execute command
    async fn execute_command(&mut self, cmd: &str) -> Result<()> {
        let parts: Vec<&str> = cmd.trim().split_whitespace().collect();

        if parts.is_empty() {
            return Ok(());
        }

        match parts[0] {
            "q" | "quit" => {
                self.event_tx.send(AppEvent::Quit).ok();
            }
            "help" | "h" => {
                self.state.set_status("Available commands: quit, help");
            }
            _ => {
                self.state
                    .set_error(format!("Unknown command: {}", parts[0]));
            }
        }

        Ok(())
    }

    /// Render the UI
    fn render(&mut self) -> Result<()> {
        self.terminal.draw(|frame| {
            use ratatui::{
                layout::{Constraint, Direction, Layout},
                style::{Color, Modifier, Style},
                text::{Line, Span},
                widgets::{Block, Borders, Paragraph},
            };

            let size = frame.size();

            // Create main layout
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(3),  // Header
                    Constraint::Min(0),     // Main content
                    Constraint::Length(3),  // Footer/Status
                ])
                .split(size);

            // Render header
            let header = Paragraph::new(vec![Line::from(vec![
                Span::styled("Flow Orchestrator", Style::default().fg(Color::Cyan)),
                Span::raw(" | "),
                Span::styled(
                    self.state.dashboard.as_str(),
                    Style::default().fg(Color::Green),
                ),
            ])])
            .block(Block::default().borders(Borders::ALL));
            frame.render_widget(header, chunks[0]);

            // Render main content (placeholder)
            let content = Paragraph::new(format!(
                "Dashboard: {}\nMode: {}\n\nPress : for command mode\nPress q to quit",
                self.state.dashboard.as_str(),
                self.state.mode.as_str()
            ))
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title(self.state.dashboard.as_str()),
            );
            frame.render_widget(content, chunks[1]);

            // Render footer/status
            let footer_text = if self.state.mode == Mode::Command {
                format!(":{}", self.state.command_buffer)
            } else if let Some(error) = &self.state.error {
                format!("Error: {}", error)
            } else if let Some(status) = &self.state.status {
                status.clone()
            } else {
                format!("Mode: {}", self.state.mode.as_str())
            };

            let footer = Paragraph::new(footer_text).block(Block::default().borders(Borders::ALL));
            frame.render_widget(footer, chunks[2]);
        })?;

        Ok(())
    }
}
