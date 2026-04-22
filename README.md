# Flow Orchestrator TUI

[![Rust](https://img.shields.io/badge/rust-1.80%2B-orange.svg)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Flow Orchestrator TUI** is a cross-platform, immersive terminal user interface (TUI) for visualizing and controlling multi-agent orchestration frameworks. Built with [Ratatui](https://github.com/ratatui-org/ratatui), it transforms complex agent workflows into a living, breathing dashboard for developers.

## 🌊 Purpose

Shift from traditional code-centric development to a conversation-first, research-driven, continuously adaptive programming experience. Flow Orchestrator empowers developers to manage swarms of autonomous agents—researchers, planners, coders, architects—through a reactive interface that adapts to cognitive context and priorities.

## ✨ Features

### Core Capabilities

- **🔐 OpenRouter Authentication**: Secure OAuth PKCE flow for browser-based authentication with OpenRouter-backed LLMs (Claude, GPT, etc.)
- **👁️ Agent Swarm Visualization**: Real-time visual graph of active agents showing hierarchy, clustering, and information flow
- **📊 Smart Dashboards**: Adaptive layouts with task progress, token usage, cost tracking, and completion metrics
- **📝 Live Event Streaming**: Inspect agent events, logs, and thought streams in real-time with structured panels
- **🎨 Framework-Agnostic**: Supports Claude Flow, OpenCode, AutoGen, LangGraph, CrewAI via adapter pattern
- **⌨️ Vim-Inspired Controls**: Modal interface (Normal, Insert, Command, Visual) with efficient keyboard navigation
- **🎯 Mode-Aware UI**: Switch between Research, Development, Planning, and Output views

### Technical Features

- **Async Runtime**: Built on Tokio for efficient concurrent event handling
- **Type-Safe State**: Immutable state updates following The Elm Architecture (TEA)
- **Thread-Safe**: `Arc<RwLock<T>>` for safe concurrent state access
- **Event Bus**: Pub/sub pattern for framework-agnostic event distribution
- **Extensible**: Plugin architecture for custom orchestration adapters

## 📦 Installation

### Prerequisites

- Rust 1.80.0 or later
- Terminal with true color support (for best experience)
- OpenRouter API account (for authentication features)

### From Source

```bash
git clone https://github.com/kvnloo/evolve.git
cd evolve/repos/flow
cargo build --release
./target/release/flow-orchestrator-tui
```

### Quick Start

```bash
# Run with default configuration
cargo run --release

# Run with debug logging
cargo run --release -- --log-level debug

# Run with custom config file
cargo run --release -- --config /path/to/config.toml

# Skip authentication (for testing)
cargo run --release -- --no-auth
```

## 🎮 Usage

### Keyboard Controls

#### Normal Mode
- `q` or `Ctrl+C`: Quit application
- `:`: Enter command mode
- `i`: Enter insert mode
- `v`: Enter visual mode
- `1-7`: Switch between dashboards
- `j`/`↓`: Scroll down
- `k`/`↑`: Scroll up
- `Ctrl+d`: Scroll down (page)
- `Ctrl+u`: Scroll up (page)

#### Command Mode
- `:q` or `:quit`: Quit application
- `:h` or `:help`: Show help
- `Esc`: Return to normal mode
- `↑`/`↓`: Navigate command history

### Dashboards

1. **Overview**: High-level view of all agents and tasks
2. **Flow View**: Agent dependency graph and communication flow
3. **Metrics**: Real-time performance metrics and resource usage
4. **Agent Focus**: Detailed view of individual agent activity
5. **Logs**: Streaming event logs with filtering
6. **Tasks**: Task management and progress tracking
7. **Config**: Configuration and settings

## 🏗️ Architecture

```
flow-orchestrator-tui/
├── src/
│   ├── app/              # Application lifecycle and event loop
│   │   ├── mod.rs        # Main App struct and event handling
│   │   ├── config.rs     # Configuration management
│   │   └── state.rs      # Application state (dashboards, modes)
│   ├── auth/             # Authentication (OAuth PKCE)
│   │   └── oauth.rs      # OpenRouter authentication flow
│   ├── events/           # Event system
│   │   ├── agent.rs      # Agent lifecycle events
│   │   ├── bus.rs        # Event bus (pub/sub)
│   │   ├── handler.rs    # Event handler chain
│   │   ├── keyboard.rs   # Keyboard event handling
│   │   └── schema.rs     # Event type definitions
│   ├── state/            # State management
│   │   ├── agent.rs      # Agent types and status
│   │   ├── graph.rs      # Agent network topology
│   │   ├── metrics.rs    # Performance metrics
│   │   ├── session.rs    # Session lifecycle
│   │   └── task.rs       # Task management
│   ├── ui/               # User interface
│   │   ├── dashboards/   # Dashboard implementations
│   │   ├── theme.rs      # Color schemes and styling
│   │   └── widgets/      # Reusable UI components
│   ├── error.rs          # Error types
│   ├── lib.rs            # Library entry point
│   └── main.rs           # Binary entry point
├── docs/                 # Documentation
├── tests/                # Integration tests
└── Cargo.toml            # Dependencies and metadata
```

### Design Patterns

**The Elm Architecture (TEA)**
- Immutable state updates via message passing
- Unidirectional data flow
- Pure functional rendering

**Event-Driven Architecture**
- Event Bus for decoupled communication
- Handler chains for event processing
- Framework adapters publish events to bus

**State Management**
- Thread-safe state with `Arc<RwLock<T>>`
- Centralized `StateManager` for global state
- Local component state for UI concerns

## 🔌 Supported Frameworks

| Framework      | Status | Integration Method |
|----------------|--------|--------------------|
| Claude Flow    | ✅ Planned | Native adapter |
| OpenCode       | ✅ Planned | CLI hook |
| AutoGen        | 🔄 Future | WebSocket/REST |
| LangGraph      | 🔄 Future | File watcher |
| CrewAI         | 🔄 Future | REST API |

## 🧪 Development

### Building

```bash
# Development build
cargo build

# Release build (optimized)
cargo build --release

# Run tests
cargo test

# Run with all features
cargo build --all-features
```

### Testing

```bash
# Unit tests
cargo test

# Integration tests
cargo test --test '*'

# With logging
RUST_LOG=debug cargo test -- --nocapture
```

### Features

- `default`: Standard build with native TLS
- `tls-native`: Use native TLS implementation
- `tls-rustls`: Use Rustls for TLS
- `animations`: Enable advanced animations with tachyonfx
- `integration-tests`: Enable integration test suite
- `bench`: Enable benchmarking support

## 📝 Configuration

Configuration can be provided via:
1. Command-line arguments
2. Config file (TOML/JSON)
3. Environment variables

### Config File Example

```toml
[app]
name = "Flow Orchestrator"
update_interval = 16  # milliseconds (60 FPS)

[ui]
theme = "dark"
border_style = "rounded"
show_help = true

[auth]
provider = "openrouter"
callback_port = 8080

[logging]
level = "info"
file = "/tmp/flow-tui/flow-tui.log"
```

### Environment Variables

- `FLOW_CONFIG_PATH`: Path to config file
- `RUST_LOG`: Logging level (trace, debug, info, warn, error)
- `OPENROUTER_API_KEY`: OpenRouter API key (optional)

## 🎯 Roadmap

### Phase 1: Foundation (Current)
- [x] Core TUI framework with Ratatui
- [x] OAuth PKCE authentication
- [x] Event system architecture
- [x] State management with thread safety
- [x] Basic dashboard layouts
- [ ] Widget implementations
- [ ] Framework adapters

### Phase 2: Enhancement
- [ ] Real-time agent clustering with canvas graph
- [ ] Adaptive layout engine with dynamic panel resizing
- [ ] Advanced filtering and search
- [ ] Session recording and playback
- [ ] Metrics visualization (sparklines, gauges)

### Phase 3: Expansion
- [ ] Plugin system for custom adapters
- [ ] Multi-session support
- [ ] Collaborative mode (shared sessions)
- [ ] Web-based GUI companion
- [ ] Mobile companion app (Flutter)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run tests (`cargo test`)
6. Commit with clear messages
7. Push to your fork
8. Open a Pull Request

## 📚 Documentation

- [API Documentation](docs/API.md) - Public API reference
- [Contributing Guide](docs/CONTRIBUTING.md) - How to contribute
- [Architecture](docs/architecture/) - Design decisions
- [Implementation Guides](docs/implementation/) - Feature implementation details

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ratatui](https://github.com/ratatui-org/ratatui) - Terminal UI framework
- [Tokio](https://tokio.rs/) - Async runtime
- Inspired by flow-state research, ultralearning principles, and memoryOS

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/kvnloo/evolve/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/kvnloo/evolve/discussions)
- 📧 **Email**: [Contact maintainers](mailto:your-email@example.com)

---

> "Be water, my friend. Flow into the code, let the code flow through you." – adapted from Bruce Lee
