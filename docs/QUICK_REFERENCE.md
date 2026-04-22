# Flow Orchestrator TUI - Quick Reference

Essential information for developers and users of Flow Orchestrator TUI.

## Quick Links

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [API Quick Reference](#api-quick-reference)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Installation

### Prerequisites
```bash
# Rust 1.80.0+
rustc --version

# Build and run
git clone https://github.com/kvnloo/evolve.git
cd evolve/repos/flow
cargo run --release
```

---

## Basic Usage

### Running the Application
```bash
# Default mode
cargo run --release

# With debug logging
cargo run --release -- --log-level debug

# Custom config
cargo run --release -- --config config.toml

# Skip authentication (development)
cargo run --release -- --no-auth
```

### Log Files
```
Linux/macOS: /tmp/flow-tui/flow-tui.log
Windows: %TEMP%\flow-tui\flow-tui.log
```

---

## Keyboard Shortcuts

### Global (Any Mode)
| Key | Action |
|-----|--------|
| `Ctrl+C` or `Ctrl+Q` | Quit application |

### Normal Mode
| Key | Action |
|-----|--------|
| `:` | Enter command mode |
| `i` | Enter insert mode |
| `v` | Enter visual mode |
| `1-7` | Switch dashboards (1=Overview, 2=Flow, 3=Metrics, etc.) |
| `j` or `↓` | Scroll down |
| `k` or `↑` | Scroll up |
| `Ctrl+D` | Scroll down (page) |
| `Ctrl+U` | Scroll up (page) |
| `g g` | Go to top |
| `G` | Go to bottom |

### Command Mode
| Key | Action |
|-----|--------|
| `Esc` | Return to normal mode |
| `Enter` | Execute command |
| `↑` | Previous command (history) |
| `↓` | Next command (history) |
| `Backspace` | Delete character |

### Commands
| Command | Action |
|---------|--------|
| `:q` or `:quit` | Quit application |
| `:h` or `:help` | Show help |

---

## API Quick Reference

### Creating an Application
```rust
use flow_orchestrator_tui::App;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut app = App::new().await?;
    app.run().await?;
    Ok(())
}
```

### Event Bus (Pub/Sub)
```rust
use flow_orchestrator_tui::events::{EventBus, Event};

// Create event bus
let event_bus = EventBus::new();

// Subscribe to events
let mut rx = event_bus.subscribe(None).await;

// Publish event
let event = Event::agent_started("agent-1");
event_bus.publish(event).await?;

// Receive events
while let Some(event) = rx.recv().await {
    println!("{:?}", event.event_type);
}
```

### State Management
```rust
use flow_orchestrator_tui::state::{
    StateManager, Session, SessionType,
    Agent, AgentRole, Task, TaskType, Priority,
};

// Initialize state
let state = StateManager::new();

// Start session
let session = Session::new(SessionType::Development);
state.start_session(session);

// Add agent
let agent = Agent::new("researcher-1", AgentRole::Researcher);
state.add_agent(agent)?;

// Add task
let task = Task::new("task-1", "Research", TaskType::Research, Priority::High);
state.add_task(task)?;

// Update agent status
state.update_agent_status(agent_id, AgentStatus::Running)?;
```

### Custom Event Handler
```rust
use flow_orchestrator_tui::events::{EventHandler, HandleResult, Event};
use async_trait::async_trait;

struct MyHandler;

#[async_trait]
impl EventHandler for MyHandler {
    async fn handle(&self, event: &Event) -> HandleResult {
        // Process event
        println!("Event: {:?}", event.event_type);
        HandleResult::Continue
    }
}
```

### Authentication (PKCE)
```rust
use flow_orchestrator_tui::auth::{generate_pkce_params, build_auth_url};

// Generate PKCE parameters
let (verifier, challenge) = generate_pkce_params()?;

// Build authorization URL
let auth_url = build_auth_url(&challenge)?;
println!("Open: {}", auth_url);
```

---

## Common Patterns

### Pattern 1: Initialize Application with Custom Config
```rust
use flow_orchestrator_tui::app::AppConfig;

// Load custom config
std::env::set_var("FLOW_CONFIG_PATH", "/path/to/config.toml");
let config = AppConfig::load()?;

// Create app with config
let mut app = App::new().await?;
app.run().await?;
```

### Pattern 2: Event Filtering
```rust
use flow_orchestrator_tui::events::{EventBus, EventFilter, EventCategory};

let event_bus = EventBus::new();

// Filter by category
let filter = EventFilter::category(EventCategory::Agent);
let mut rx = event_bus.subscribe(Some(filter)).await;
```

### Pattern 3: Task Progress Updates
```rust
use flow_orchestrator_tui::state::{StateManager, TaskStatus};

let state = StateManager::new();

// Update task progress
state.update_task_progress(
    task_id,
    50,  // 50% complete
    TaskStatus::InProgress
)?;
```

### Pattern 4: Recording Metrics
```rust
use flow_orchestrator_tui::state::{StateManager, MetricPoint, MetricType};

let state = StateManager::new();

// Record token usage
let metric = MetricPoint::new(MetricType::TokenUsage, 1500.0);
state.record_metric(metric);
```

### Pattern 5: Agent Graph Management
```rust
use flow_orchestrator_tui::state::{AgentGraph, Agent, AgentRole};

let mut graph = AgentGraph::new();

// Add agents
let agent1 = Agent::new("researcher-1", AgentRole::Researcher);
let agent2 = Agent::new("coder-1", AgentRole::Coder);

graph.add_agent(agent1.clone());
graph.add_agent(agent2.clone());

// Connect agents (researcher feeds data to coder)
graph.connect(agent1.id, agent2.id);

// Get neighbors
let neighbors = graph.get_neighbors(&agent1.id);
```

---

## Dashboards

| Number | Name | Purpose |
|--------|------|---------|
| 1 | Overview | High-level view of all agents and tasks |
| 2 | Flow View | Agent dependency graph and communication |
| 3 | Metrics | Real-time performance and resource usage |
| 4 | Agent Focus | Detailed view of individual agent |
| 5 | Logs | Streaming event logs with filtering |
| 6 | Tasks | Task management and progress |
| 7 | Config | Configuration and settings |

---

## Configuration

### Config File Format (TOML)
```toml
[app]
name = "Flow Orchestrator"
update_interval = 16  # milliseconds (60 FPS)

[ui]
theme = "dark"
border_style = "rounded"
show_help = true
update_interval = 16

[auth]
provider = "openrouter"
callback_port = 8080

[logging]
level = "info"
file = "/tmp/flow-tui/flow-tui.log"
```

### Config Locations (Priority Order)
1. Environment variable: `FLOW_CONFIG_PATH`
2. User config: `~/.config/flow-orchestrator/config.toml`
3. System config: `/etc/flow-orchestrator/config.toml`
4. Default values

### Environment Variables
```bash
FLOW_CONFIG_PATH=/path/to/config.toml
RUST_LOG=debug
OPENROUTER_API_KEY=your_key_here
```

---

## Troubleshooting

### Application Won't Start
```bash
# Check Rust version
rustc --version  # Should be 1.80.0+

# Check dependencies
cargo check

# Rebuild from scratch
cargo clean && cargo build --release
```

### Terminal Display Issues
```bash
# Ensure terminal supports true color
echo $TERM  # Should include "256color" or "truecolor"

# Try forcing color support
COLORTERM=truecolor cargo run --release
```

### Authentication Fails
```bash
# Check OpenRouter connectivity
curl https://openrouter.ai/auth

# Run without auth for testing
cargo run --release -- --no-auth

# Check environment variable
echo $OPENROUTER_API_KEY
```

### High Memory Usage
```bash
# Run with release optimizations
cargo run --release

# Check metrics in dashboard (press 3)

# Reduce update interval in config
# Set update_interval = 50  # 20 FPS instead of 60
```

### Logs Not Appearing
```bash
# Check log location
ls -la /tmp/flow-tui/

# Enable debug logging
RUST_LOG=debug cargo run -- --debug

# Check permissions
ls -la /tmp/flow-tui/flow-tui.log
```

### Build Errors
```bash
# Update Rust toolchain
rustup update

# Clean build artifacts
cargo clean

# Check for missing system dependencies
# On Ubuntu/Debian:
sudo apt-get install build-essential pkg-config libssl-dev
```

---

## Performance Tips

### Optimize Build
```bash
# Release build with LTO (slower compile, faster runtime)
cargo build --release

# Profile-guided optimization
RUSTFLAGS="-C target-cpu=native" cargo build --release
```

### Reduce Resource Usage
```toml
# In config.toml
[ui]
update_interval = 33  # 30 FPS instead of 60
```

### Enable Animations (Optional)
```bash
cargo build --release --features animations
```

---

## Development Quick Start

### Run Tests
```bash
cargo test                    # All tests
cargo test test_name         # Specific test
cargo test -- --nocapture    # With output
```

### Code Quality
```bash
cargo fmt                    # Format code
cargo clippy                 # Lint code
cargo clippy -- -D warnings  # Treat warnings as errors
```

### Documentation
```bash
cargo doc --open                        # Generate and open docs
cargo doc --document-private-items     # Include private items
```

### Watch Mode
```bash
cargo install cargo-watch
cargo watch -x check -x test
```

---

## Common Error Solutions

### Error: "No active session"
```rust
// Solution: Start a session before adding agents/tasks
let session = Session::new(SessionType::Development);
state.start_session(session);
```

### Error: "Agent not found"
```rust
// Solution: Verify agent was added to state
state.add_agent(agent)?;
// Then update status
state.update_agent_status(agent_id, status)?;
```

### Error: "Terminal initialization failed"
```bash
# Solution: Ensure terminal supports raw mode
# Try a different terminal emulator
# Or check terminal permissions
```

---

## Resources

- [Full Documentation](../README.md)
- [API Reference](API.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Source Code](https://github.com/kvnloo/evolve/tree/main/repos/flow)
- [Issue Tracker](https://github.com/kvnloo/evolve/issues)

---

**Last Updated**: 2025-11-25
**Version**: 0.1.0
