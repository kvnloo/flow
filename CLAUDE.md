# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`flow-orchestrator-tui` — a Ratatui-based terminal UI for observing and controlling multi-agent orchestration frameworks (Claude Flow, AutoGen, LangGraph, CrewAI, OpenCode). Binary crate with a library (`src/lib.rs`) that re-exports the public API; `src/main.rs` is a thin CLI wrapper. The workspace is self-contained (`[workspace] members = ["."]`).

**Rust edition 2021, MSRV 1.80.** A stale `rust-toolchain.toml.bak` pins 1.75 — ignore it; `Cargo.toml`'s `rust-version = "1.80.0"` is authoritative.

## Common commands

```bash
# Build / run
cargo build                           # dev build
cargo build --release                 # release
cargo run -- --log-level debug        # run with debug logs
cargo run -- --no-auth                # skip OAuth (local dev)
cargo run -- --config path/to.toml    # override config

# Tests
cargo test                            # everything
cargo test --test error_tests         # single integration test file
cargo test --test mod app::           # subset via test harness in tests/mod.rs
cargo test test_name -- --nocapture   # single test with stdout
RUST_LOG=debug cargo test -- --nocapture

# Lint / format (CI expects both clean)
cargo fmt --check
cargo clippy -- -D warnings

# Examples
cargo run --example event_system_basic

# Docs
cargo doc --open
```

**Features:** `default = ["tls-native"]`. Alternatives: `tls-rustls`, `animations` (enables tachyonfx), `integration-tests`, `bench`. Benchmarks are declared-commented-out in `Cargo.toml` — don't re-enable without providing `benches/`.

## Architecture

Three layers connected by an **event bus**. Understanding the layering is essential because the current wiring is partial (see "Known gaps" below).

### Layer 1 — Framework adapters (`src/adapters/`)
Each adapter implements `FrameworkAdapter` (async trait in `adapters/mod.rs`) to translate a specific agent framework's protocol into internal `Event`s published to `EventBus`. `AdapterFactory::create` dispatches by `FrameworkType`. Protocols: Claude Flow/OpenCode use MCP, AutoGen/CrewAI use WebSocket, LangGraph uses SSE.

### Layer 2 — Event system (`src/events/`)
Pub/sub bus decouples adapters from UI. `EventBus::new()` returns `(EventBus, EventBusRunner)` — you **must** `tokio::spawn(runner.run())` or nothing is delivered. Subscribers get filtered `tokio::sync::mpsc` receivers via `EventBus::subscribe(Option<EventFilter>)`. The schema in `events/schema.rs` is framework-agnostic: `Event { source, event_type, category, severity, payload: serde_json::Value, metadata }`. Framework-specific payloads go in the opaque `payload`; everything else is normalized.

### Layer 3 — State + UI

Two distinct state structs — don't conflate them:

- **`state::StateManager`** (`src/state/mod.rs`): global domain state (sessions, agents, tasks, metrics, graph topology) wrapped in `Arc<RwLock<T>>`. Intended to be consumed by dashboards and mutated by event handlers.
- **`app::state::AppState`** (`src/app/state.rs`): UI-local state (Vim mode, active dashboard, scroll positions, command buffer/history). Owned by `App`, not shared.

UI follows TEA: immutable updates via `AppEvent` messages through an `mpsc::unbounded_channel`. The event loop in `App::run` awaits `AppEvent`s, mutates `AppState`, and re-renders via `self.terminal.draw(...)`.

### Known gaps (important)

- **`Dashboard` is defined twice** and they don't agree. `app::state::Dashboard` has 7 variants (Overview/Flow/Research/Tasks/Logs/Metrics/Settings, hotkeys `1`–`7`). `ui::dashboards::DashboardId` has 4 variants (Overview/FlowView/Metrics/AgentFocus) behind a `Dashboard` trait. The `ui::dashboards::*` implementations (`overview.rs`, `flow_view.rs`, etc.) are **not wired into `App::render`** — `App::render` in `src/app/mod.rs` draws a placeholder. Bridging these is real in-progress work, not a cleanup task.
- **Adapter event streams are stubs.** `ClaudeFlowAdapter` etc. implement the trait but do not actually stream MCP/WS/SSE events into the bus yet.
- **Widget re-exports are commented out** in `src/ui/mod.rs` because widget API is still settling; `src/ui/widgets/mod.rs` only exports a `Placeholder`. Individual widget files (`agent_card.rs`, `log_viewer.rs`, `progress_gauge.rs`, `sparkline_widget.rs`) exist but aren't plumbed through.
- **OAuth callback port is inconsistent** across the repo: `README.md` says 8080, default config (`app/config.rs::DEFAULT_CONFIG`) says 3000, `AUTH_MODULE.md` says 8080. Check `auth/callback.rs` for ground truth before changing either.

## Auth flow

`auth::AuthManager::authenticate()` is the entry point. Order:
1. Try `storage::get_stored_token()` — uses `keyring` (macOS Keychain / Windows Credential Manager / Linux Secret Service). Service name: `flow-orchestrator`.
2. If expired/invalid, generate PKCE pair (`oauth::generate_pkce_params`, SHA-256), spawn the local callback server (`callback::start_server`), open the browser (`open`/`xdg-open`/`cmd start`), wait up to 5 min (`AUTH_TIMEOUT`).
3. Exchange code for token via `openrouter::exchange_code`, store, construct `OpenRouterClient`.

Running `cargo run -- --no-auth` bypasses all of this for local TUI iteration.

## Error handling

`src/error.rs` defines `FlowError` (top-level) with `AuthError` and `AdapterError` as sub-enums. `pub type Result<T> = std::result::Result<T, FlowError>` is re-exported from `lib.rs` — prefer it over `anyhow::Result` in library code. `anyhow` is still used inside `auth/` and `events/bus.rs`; don't mix them in new code.

## Test layout

Integration tests live in `tests/` with **two conventions**:

- **Umbrella harness** — `tests/mod.rs` declares `pub mod app; pub mod integration;` and pulls in `tests/app/*.rs` and `tests/integration/*.rs`. Run with `cargo test --test mod`.
- **Direct harnesses** — files like `tests/error_tests.rs`, `tests/event_bus_tests.rs`, `tests/auth_integration.rs` compile as standalone binaries. `tests/state_unit_tests.rs` is a shim that uses `#[path = "state/agent_tests.rs"]` etc. to pull submodules into one test binary — don't try to `cargo test --test agent_tests` directly, it doesn't exist.

**Known test-isolation issue** (see `TEST_SUMMARY.md`): ~5 config tests mutate env vars and leak between tests in the same process. Run them serially or use `serial_test` if you touch config tests.

## Conventions

- Module docs use `//!` at the top; public items use `///`. This is enforced socially, not by `#![deny(missing_docs)]`.
- Async code uses Tokio; spawn background tasks with `tokio::spawn`, communicate via `mpsc`/`broadcast`. Don't use `std::thread` for anything touching the bus or UI.
- Thread-safe state is `Arc<RwLock<T>>` (std `RwLock` in `state::StateManager`; `tokio::sync::RwLock` in `events::bus` — they're not interchangeable).
- Vim modality: the TUI is always in exactly one of `Mode::{Normal, Insert, Command, Visual}`. Key handlers in `app::mod.rs` dispatch by mode; follow that pattern when adding keybindings.
- Logging goes to both console and a daily-rolling file at `$TMPDIR/flow-tui/flow-tui.log` (set up in `main::setup_logging`). Use `tracing::{info,debug,warn,error}`; don't `println!` outside examples.
