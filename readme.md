# Flow Orchestrator TUI

**Flow Orchestrator TUI** is a cross-platform, immersive terminal user interface (TUI) built with [Ratatui](https://github.com/ratatui-org/ratatui), designed to visualize and control multi-agent orchestration frameworks like Claude Flow, OpenCode, Autogen, LangGraph, and more. Inspired by flow-state research, ultralearning, and memoryOS principles, it transforms complex agent workflows into a living, breathing dashboard for developers.

## 🌊 Purpose

Shift from traditional code-centric development to a conversation-first, research-driven, continuously adaptive programming experience. This project empowers programmers to manage swarms of autonomous agents—researchers, planners, coders, architects—through a reactive interface that adapts to their cognitive context and priorities.

## ✨ Features

- **OpenRouter Authentication**  
  Authenticate via browser using a secure `auth` command flow for accessing Claude, GPT, or any OpenRouter-backed LLM.

- **Agent Swarm Visualization**  
  Visual TUI graph of active agents, showing hierarchy, clustering, and real-time information sharing.

- **Organic Graph Animations**  
  Smooth "breathing" agent graph inspired by Obsidian’s dynamic link view, using canvas rendering and `tachyonfx`.

- **Live Logs and Thought Streaming**  
  Inspect each agent’s inner monologue and action trace in real time with colored logs, streaming updates, and structured panels.

- **Smart Dashboards**  
  Adaptive layouts showing task progress, token usage, system cost, completion gauges, and high-priority tasks in developer-friendly views.

- **Framework-Agnostic Integration**  
  Supports Claude Flow orchestration modes (e.g. analyzer, developer, PM), and adaptable to OpenCode, Autogen, LangGraph, CrewAI, and more via adapters.

- **Mode-Aware UI**  
  Switch seamlessly between Research, Development, Planning, and Output views. The interface adapts to what matters in each phase.

- **Ultra-Customizable**  
  Keyboard-driven controls, panel toggles, filterable agent lists, tabbed logs, collapsible clusters—fully scriptable interface.

- **Learning Amplifier**  
  Real-time memory compression, contextual bookmarking, meta-summaries of sessions, and reflective logs support metacognition and ultralearning.

## 📦 Installation

```bash
git clone https://github.com/your-org/flow-orchestrator-tui.git
cd flow-orchestrator-tui
cargo build --release
./target/release/flow-tui
```

## 🧠 Architecture

```
@repos/flow/
├── auth/              # Handles OpenRouter OAuth and session tokens
├── dashboard/         # Layouts, widgets, animations
├── graph/             # Agent clustering, network graph rendering
├── state/             # Agent orchestration adapters (Claude Flow, etc)
├── ui/                # Command router, keybindings, modes
└── main.rs            # Entry point
```

## 🧪 Supported Agent Frameworks

| Framework      | Supported Modes          | Integration Strategy     |
|----------------|--------------------------|---------------------------|
| Claude Flow    | analyzer, pm, coder      | Native log/event adapter |
| OpenCode       | planner, builder         | JSON pipe + CLI hook     |
| Autogen        | tool-agent, group-chat   | WebSocket/REST client    |
| LangGraph      | state-machine agents     | File watcher/log parser  |

## 🎯 Vision

We aim to build a samurai’s blade for developers—an extension of thought, curiosity, and flow. This interface is not just a monitor but a cognitive partner. It guides, learns, and grows alongside the developer, helping them ship better code and smarter systems faster.

## 🚧 Roadmap

- [ ] Real-time agent clustering via canvas graph
- [ ] Adaptive layout engine with dynamic panel resizing
- [ ] Summary agent logs with meta-synthesis
- [ ] React-based GUI and Flutter companion (phase 2)
- [ ] Real-time collaboration mode
- [ ] Plugin system for orchestration framework adapters

## 📄 License

MIT. See `LICENSE`.

## 🤝 Contributing

PRs, issue reports, and new orchestration adapters are welcome. This is a developer tool built by and for deep thinkers and builders.

---

> “Be water, my friend. Flow into the code, let the code flow through you.” – adapted from Bruce Lee
