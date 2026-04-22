# TUI Examples and Design Pattern Analysis

**Research Date**: 2025-11-25
**Project**: Flow Orchestrator TUI
**Purpose**: Analyze state-of-the-art TUI applications and design patterns for building effective terminal interfaces

---

## Table of Contents

1. [Application Analysis (Top 10 TUIs)](#1-application-analysis-top-10-tuis)
2. [Design Pattern Catalog](#2-design-pattern-catalog)
3. [Ratatui Example Breakdown](#3-ratatui-example-breakdown)
4. [Best Practices Compilation](#4-best-practices-compilation)
5. [Anti-patterns to Avoid](#5-anti-patterns-to-avoid)
6. [Feature Inspiration Matrix](#6-feature-inspiration-matrix)
7. [Recommendations for Flow Orchestrator](#7-recommendations-for-flow-orchestrator)

---

## 1. Application Analysis (Top 10 TUIs)

### 1.1 btop++ (System Monitor)

**Project**: [GitHub - aristocratos/btop](https://github.com/aristocratos/btop)

**Key Features**:
- Multi-panel dashboard (CPU, memory, disk, network, processes)
- Real-time graphical representations of system metrics
- Full mouse support with clickable buttons
- Keyboard-centric navigation with Vim-style keybindings

**UI Design Highlights**:
- Uses colors and border boxes for visual separation
- Keyboard hints visible in interface for discoverability
- Graphed data for at-a-glance performance assessment
- Resource panes can be toggled on/off with single key press

**Navigation System**:
```
(Esc, m)  - Main menu
(F2, o)   - Options
(F1, h)   - Help screen
(Ctrl-C, q) - Quit
(+, -)    - Adjust update timer
(J, K)    - Navigate process list (Vim-style)
(H, L)    - Switch between process views (sorting modes)
(D)       - Toggle disk monitor pane
(3)       - Toggle network monitor pane
(P)       - Cycle through layout presets
(t)       - Terminate selected process
(s)       - Send signal to process
```

**Layout Pattern**:
```
┌─────────────────────────────────────────────────────────┐
│ [CPU] [Memory] [Network] [Disk]     (keyboard hints)    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CPU Graph ████████░░░░░░  65%                         │
│  Memory ███████████░░  75%                              │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  PID    Process Name       CPU%   MEM%   Status        │
│  1234   firefox            12.5   8.3    Running       │
│  5678   chrome             8.2    15.1   Running       │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**Key Takeaways**:
- Multiple keyboard shortcut conventions (Vim-style + function keys + single keys)
- Pane toggling for focus on specific areas
- Full mouse support as alternative to keyboard
- Layout presets for different monitoring needs
- Keyboard hints for discoverability

**Sources**:
- [btop++ GitHub Repository](https://github.com/aristocratos/btop)
- [Here's why btop++ became my favorite Linux terminal resource monitor](https://currently.att.yahoo.com/att/heres-why-btop-became-favorite-151514637.html)
- [btop: The Ultimate Real-Time System Monitoring Tool](https://www.tecmint.com/btop-system-monitoring-tool-for-linux/)

---

### 1.2 lazygit (Git Interface)

**Project**: [GitHub - jesseduffield/lazygit](https://github.com/jesseduffield/lazygit)

**Key Features**:
- Multi-panel view with Files, Branches, Commits, Stash, Preview/Diff
- Keyboard-driven single-key shortcuts for Git operations
- Consistent visual organization with always-visible views
- Interactive menus for complex operations

**UI Design Philosophy**:
- Strong consistency across all views
- Deliberate visualizations for Git state
- Flat action menu for discoverability
- GUI-like rigid structures to convey state
- Clear focus indication on active pane

**Panel Structure**:
```
┌─────────────┬────────────────────────────────────────┐
│  SIDEBAR    │ ☰      HEADER BAR                  +   │
│ ┌─────────┐ ├────────────────────────────────────────┤
│ │ Chat 1  │ │                                        │
│ │ Chat 2  │ │ ┌──────────────────────────────┐       │
│ │ Chat 3  │ │ │   AI Message Bubble          │       │
│ │ + New   │ │ └──────────────────────────────┘       │
│ └─────────┘ │                                        │
│             │     ┌──────────────────────────────┐   │
│             │     │   User Message Bubble        │   │
│             │     └──────────────────────────────┘   │
│             │                                        │
│             │          [CHAT AREA]                   │
│             │                                        │
│             ├────────────────────────────────────────┤
│             │ [Text Input Field]            [Send]  │
└─────────────┴────────────────────────────────────────┘
```

**Navigation**:
```
Arrow keys (← →)  - Navigate between panels
1-5              - Jump to specific panel
↑ ↓              - Select items within panel
?                - Quick keybinding reference
```

**Key Design Principles**:
1. **Consistency**: Views behave predictably across operations
2. **Visibility**: Most views always visible unless zoomed
3. **Discoverability**: Help accessible via `?` key
4. **Simplicity**: Flat action menu reduces cognitive load
5. **Speed**: Single keystrokes replace multi-word commands

**Key Takeaways**:
- Always-visible panels reduce context switching
- Footer displays available keybindings
- Consistent view behavior across operations
- Interactive menus for complex operations
- TUI enables discoverability (vs pure CLI)

**Sources**:
- [Supercharge Your Git Workflow with Lazygit](https://masri.blog/Blog/Coding/Git/Lazygit-A-TUI-Approach)
- [The (lazy) Git UI You Didn't Know You Need](https://www.bwplotka.dev/2025/lazygit/)
- [Lazygit Turns 5: Musings on Git, TUIs, and Open Source](https://jesseduffield.com/Lazygit-5-Years-On/)

---

### 1.3 k9s (Kubernetes Dashboard)

**Project**: [k9scli.io](https://k9scli.io/) | [GitHub - derailed/k9s](https://github.com/derailed/k9s)

**Key Features**:
- Context-aware navigation for Kubernetes resources
- Real-time monitoring with auto-refreshing views
- Built-in log viewer with filtering
- Hotkeys for quick actions and debugging
- Multi-cluster support with seamless switching

**UI Pattern**:
- Resource-centric navigation using `:` command
- XRay mode for visualizing resource dependencies
- Custom views configurable via YAML
- JSON parse expressions for rendering customization

**Navigation System**:
```
:                  - Enter resource type (e.g., :pods, :deployments)
Ctrl-a             - List all available resource types
:xray deployments  - Dependency visualization
/                  - Search within current list
Enter              - Drill down into resource
```

**Dashboard Views**:
1. **Pulses**: Top-level cluster state dashboard
2. **XRay**: Resource dependency visualization
3. **Pods**: Status and resource consumption
4. **Logs**: Container log viewing and interaction
5. **RBAC**: Authorization overview (who/what/how)

**Key Philosophy**:
- Designed as "Vim of Kubernetes"
- Keyboard-controlled exclusively
- Shortcuts for everything (search, filter, port-forward, scale, restart)
- Context-aware operations with clear cluster indication

**Advanced Features**:
- Advanced metrics views with graphical representations
- Improved log visualization with formatting/filtering
- Custom Resource Display for CRDs
- Unified interface across multiple clusters

**Key Takeaways**:
- Resource-centric navigation (`:resource-type` pattern)
- Context awareness crucial for multi-entity systems
- XRay visualization for complex dependencies
- Customizable views via configuration files
- Clear indication of current context (cluster/namespace)

**Sources**:
- [K9s - Manage Your Kubernetes Clusters In Style](https://k9scli.io/)
- [K9s - Transforming Kubernetes Cluster Management](https://www.edstem.com/blog/k9s-kubernetes-cluster-management/)
- [k9s - Terminal Trove](https://terminaltrove.com/k9s/)

---

### 1.4 helix (Modal Editor)

**Project**: [helix-editor.com](https://helix-editor.com/) | [GitHub - helix-editor/helix](https://github.com/helix-editor/helix)

**Key Features**:
- Modal editing inspired by Vim and Kakoune
- Multiple cursors as core primitive
- Tree-sitter for robust syntax highlighting
- Built-in LSP support (no configuration needed)
- Intuitive modal dialogs for mode discovery

**Modal Design**:
```
Normal Mode   - Default navigation and command mode
Insert Mode   - Text editing (Esc to exit)
Select Mode   - v: Extend selections rather than replace
View Mode     - Z: Persistent scrolling (Esc to exit)
Goto Mode     - g: Jump to various locations
Window Mode   - Ctrl-w: Window management
Space Mode    - Space: Pickers and commands
```

**Key Innovation - Discoverability**:
- Modal dialogs open for each mode showing available commands
- Command palette for discovering keybindings
- Smaller codebase than Vim with modern defaults
- Less config fiddling required for new users

**Multiple Cursor System**:
- Commands manipulate selections (not just cursor position)
- Concurrent code editing across multiple locations
- Inspired by Kakoune's selection-first philosophy

**Tree-sitter Integration**:
- Error-tolerant syntax trees
- Better syntax highlighting than regex-based
- Navigate/select functions, classes, comments
- Select syntax tree nodes instead of plain text

**Key Takeaways**:
- Modal dialogs make keybindings discoverable
- Command palette crucial for learning
- Modern defaults reduce configuration burden
- Multiple cursors enable powerful concurrent editing
- Tree-sitter provides structured code navigation

**Sources**:
- [Helix Keymap Documentation](https://docs.helix-editor.com/keymap.html)
- [Helix Editor - Fast, Modern & Efficient Modal Editor](https://helixeditor.com/)
- [Helix: a post-modern modal text editor | Hacker News](https://news.ycombinator.com/item?id=27358479)

---

### 1.5 broot (File Manager)

**Project**: [GitHub - Canop/broot](https://github.com/Canop/broot) | [dystroy.org/broot](https://dystroy.org/broot/navigation/)

**Key Features**:
- Tree view + fuzzy search hybrid navigation
- Regex support for advanced filtering
- Git integration showing file status
- Multi-panel support (Ctrl→ to open second panel)
- Custom commands and extensive configurability

**Navigation Philosophy**:
- "Filtering the tree" as primary navigation method
- Fuzzy matching while typing
- Auto-selection of best match
- Tab/arrow keys for manual match selection

**Fuzzy Search Pattern**:
```
Type any letters → Files fuzzy filtered by pathname
/pattern/        → Regex mode (case-sensitive)
/pattern/i       → Regex mode (case-insensitive)
Esc              → Clear current pattern
Ctrl-S           → Deep search (all files, not just matches)
```

**Interface Structure**:
```
┌─────────────────────────────────────────────┐
│ 📁 project/                                 │
│   ├─ 📁 src/        [type to filter]       │
│   │  ├─ 📄 main.rs                         │
│   │  └─ 📄 lib.rs                          │
│   ├─ 📁 tests/                             │
│   └─ 📄 Cargo.toml                         │
│                                             │
│ Type pattern: "mai"                         │
│ Match: src/main.rs  ✓                      │
└─────────────────────────────────────────────┘
```

**Git Integration**:
- Shows untracked, modified, committed status
- Visual indicators for Git state
- Integration with repository workflow

**Key Takeaways**:
- Fuzzy search as primary navigation is very effective
- Tree view provides context while searching
- Auto-selection of best match reduces friction
- Regex support for power users
- Multi-panel for cross-directory operations

**Sources**:
- [GitHub - Canop/broot](https://github.com/Canop/broot)
- [Search and Navigate - Broot](https://dystroy.org/broot/navigation/)
- [broot: Interactive directory navigation](https://www.linuxbash.sh/post/broot-interactive-directory-navigation)

---

### 1.6 posting (HTTP/API Client)

**Note**: Limited specific information on "posting" TUI application found. Research reveals general Rust TUI HTTP client patterns.

**Alternative Found - CuTE**:
**Project**: [GitHub - PThorpe92/CuTE](https://github.com/PThorpe92/CuTE)

**Key Features**:
- HTTP client/libcurl front-end in Rust using Ratatui
- Request + API key storage
- Support for GET, POST, PUT, PATCH, HEAD, DELETE, custom requests
- API Key Management (add, edit, delete, assign to profiles)
- Response display in readable format within TUI
- History of past requests for reuse

**Architecture Pattern**:
```rust
struct App {
    // Contains all relevant information about current app
    // Stores data between frame updates
}

fn run_app() {
    // Main loop: update terminal and handle user input
}

fn ui() {
    // Handles everything related to drawing UI
}
```

**Backend**: Uses Crossterm (most common for Ratatui projects)

**Key Takeaways**:
- API key management crucial for HTTP clients
- Request history important for productivity
- Response formatting needs careful consideration
- Ratatui + Crossterm is standard Rust TUI stack

**Sources**:
- [GitHub - PThorpe92/CuTE](https://github.com/PThorpe92/CuTE)
- [Rust and TUI: Building a command-line interface](https://blog.logrocket.com/rust-and-tui-building-a-command-line-interface-in-rust/)
- [Creating Terminal UI in Rust](https://dev.to/praxtube/creating-great-terminal-ui-in-rust-8d3)

---

### 1.7 Ratatui Example Applications

**Official Resources**:
- [Ratatui App Showcase](https://ratatui.rs/showcase/apps/)
- [Awesome Ratatui](https://github.com/ratatui/awesome-ratatui)

**Notable Applications**:

1. **Codex** - Terminal-native coding agent
   - Generates, edits, and runs applications from shell
   - Multi-agent workflow integration

2. **Oatmeal** - Terminal UI chat application
   - LLM integration (ChatGPT, Ollama)
   - Slash commands
   - Fancy chat bubbles
   - Agnostic backends for privacy

3. **Yōzefu** - Kafka cluster explorer
   - Interactive TUI for Kafka data
   - Alternative to AKHQ, Redpanda Console

4. **dua** - Disk usage analyzer
   - Parallel processing for speed
   - Detailed disk usage information

**Ratatui Widgets & Libraries**:

- **ratatui-image**: Image widget (sixels, unicode-halfblocks)
- **ratatui-textarea**: Simple yet powerful editor widget
- **ratatui-code-editor**: Code editor with Tree-sitter syntax highlighting
- **egui-ratatui**: Ratatui backend as egui widget (WebAssembly support)
- **ratzilla**: Terminal-themed web applications with Ratatui + WebAssembly

**Key Takeaways**:
- Strong ecosystem of reusable widgets
- WebAssembly support for web deployment
- LLM integration becoming common pattern
- Community showcase demonstrates diverse applications

**Sources**:
- [Ratatui App Showcase](https://ratatui.rs/showcase/apps/)
- [GitHub - awesome-ratatui](https://github.com/ratatui/awesome-ratatui)
- [Ratatui Overview and Examples](https://best-of-web.builder.io/library/ratatui/ratatui)

---

### 1.8 Terminal Emulator Pane Management Patterns

**Windows Terminal**:

**Split Operations**:
```
Alt+Shift++  - New vertical pane
Alt+Shift+-  - New horizontal pane
Alt+Arrows   - Switch focus between panes
Alt+Shift+Arrows - Resize focused pane
Shift+Cmd+D  - Close pane
```

**Focus Navigation**:
- `moveFocus` command with `direction`: down, left, right, up
- `direction`: previous (last used pane)
- `direction`: previousInOrder, nextInOrder (tree order navigation)
- `direction`: first (first pane)

**Pane Swapping**:
- `swapPane` command with same directions as `moveFocus`
- Swaps positions of focused pane and neighbor

**Advanced Features**:
- Pane zoom (temporarily full-screen a pane)
- Visual focus indicators (colorized separators)
- Scriptable workspaces (e.g., WezTerm with Lua)

**tmux Integration**:
```
Ctrl+B then %  - Vertical split
Ctrl+B then "  - Horizontal split
```

**Key Takeaways**:
- Consistent keyboard shortcuts across panes
- Clear focus indicators essential
- Pane zoom useful for temporary focus
- Scriptable layouts for complex setups

**Sources**:
- [Windows Terminal Panes Documentation](https://learn.microsoft.com/en-us/windows/terminal/panes)
- [How to use, open, resize, and split Panes in Windows Terminal](https://www.hanselman.com/blog/how-to-use-open-resize-and-split-panes-in-the-windows-terminal)

---

### 1.9 WTF (Personal Dashboard)

**Project**: [wtfutil.com](https://wtfutil.com/)

**Key Features**:
- Personal information dashboard for terminal
- Monitors systems, services, and important information
- Integration with multiple services:
  - OpsGenie schedules
  - Google Calendar
  - Git and GitHub repositories
  - New Relic deployments
  - BambooHR (who's away)
  - Jira tickets
  - World clocks

**Dashboard Philosophy**:
- Widget-based layout
- Customizable information panels
- Real-time updates from various sources
- All information in one terminal view

**Key Takeaways**:
- Dashboard aggregation of multiple data sources
- Widget-based architecture for flexibility
- Real-time monitoring crucial for dashboards
- Integration with common dev tools

**Sources**:
- [WTF - the terminal dashboard](https://wtfutil.com/)

---

### 1.10 Additional Notable TUIs

**gitui** - [GitHub - gitui-org/gitui](https://github.com/gitui-org/gitui)
- Blazing fast terminal UI for Git written in Rust
- Alternative to lazygit with different design philosophy

**Bandwhich** - Network bandwidth monitor
- Real-time network activity by process and connection

**Zenith** - System monitor with graphical metrics
- GPU monitoring support
- Modern visualization

**Spotify TUI** - Spotify client for terminal
- Full playback control
- Playlist management
- Search functionality

---

## 2. Design Pattern Catalog

### 2.1 Layout Patterns

#### Multi-Panel Dashboard Layout
```
┌────────────────────────────────────────────────────────┐
│                    Header/Status Bar                   │
├──────────────┬─────────────────────────────────────────┤
│              │                                         │
│   Sidebar    │          Main Content Area             │
│  (Navigation)│                                         │
│              │                                         │
├──────────────┼─────────────────────────────────────────┤
│              │                                         │
│   Details    │          Secondary Content             │
│              │                                         │
└──────────────┴─────────────────────────────────────────┘
```

**Characteristics**:
- Fixed header for status/context
- Sidebar for navigation/entity list
- Main area for primary content
- Optional detail/preview pane

**Examples**: lazygit, k9s, broot

---

#### Tabbed Interface
```
┌────────────────────────────────────────────────────────┐
│ [Tab 1] [Tab 2*] [Tab 3]                    [Help] [×] │
├────────────────────────────────────────────────────────┤
│                                                        │
│                  Tab 2 Content                         │
│                                                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Characteristics**:
- Horizontal tab bar
- Active tab indicator
- Content area below tabs
- Tab-specific actions

**Examples**: btop++, terminal emulators

---

#### Stacked Panels (Vertical Split)
```
┌────────────────────────────────────────────────────────┐
│                    Top Panel (40%)                     │
│                                                        │
├────────────────────────────────────────────────────────┤
│                   Middle Panel (30%)                   │
├────────────────────────────────────────────────────────┤
│                   Bottom Panel (30%)                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Characteristics**:
- Vertical splits with adjustable heights
- Each panel can scroll independently
- Clear visual separators
- Responsive to terminal resize

**Examples**: System monitors, log viewers

---

#### Tree + Detail View
```
┌──────────────┬──────────────────────────────────────────┐
│ 📁 project/  │  main.rs                                │
│   ├─ src/    │  ┌──────────────────────────────────┐   │
│   │  ├─ main │  │ fn main() {                      │   │
│   │  └─ lib  │  │     println!("Hello!");          │   │
│   ├─ tests/  │  │ }                                │   │
│   └─ docs/   │  └──────────────────────────────────┘   │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Characteristics**:
- Left: Hierarchical tree structure
- Right: Detail/preview of selected item
- Tree can be expanded/collapsed
- Detail syncs with tree selection

**Examples**: broot, file managers

---

### 2.2 Navigation Patterns

#### Vim-Style Navigation
```
h, j, k, l    - Left, down, up, right
gg, G         - Go to top, bottom
Ctrl-d/u      - Page down/up
/             - Search
n, N          - Next, previous match
```

**Advantages**:
- No leaving home row
- Efficient for power users
- Widely known convention

**Examples**: btop++, helix, many TUIs

---

#### Mode-Based Navigation
```
Normal Mode → i → Insert Mode → Esc → Normal Mode
Normal Mode → v → Visual/Select Mode → Esc → Normal Mode
Normal Mode → : → Command Mode → Enter/Esc → Normal Mode
```

**Characteristics**:
- Different modes for different operations
- Clear mode indicators
- Mode-specific key mappings

**Examples**: helix, Vim-inspired TUIs

---

#### Tab Navigation
```
Tab          - Next item/panel
Shift+Tab    - Previous item/panel
Ctrl+Tab     - Next major section
```

**Characteristics**:
- Progressive tab order
- Circular navigation (wraps around)
- Works with screen readers

**Accessibility note**: Critical for accessibility

---

#### Command Palette Navigation
```
:resource      - Go to resource type
:pods          - Show pods
Ctrl+p / Ctrl+k - Open command palette
/              - Search in current view
```

**Characteristics**:
- Text-based command entry
- Autocomplete suggestions
- Fuzzy matching
- Command history

**Examples**: k9s, modern editors

---

#### Panel Focus System
```
Current Focus: Highlighted with border/color
Alt+Arrows    - Move focus between panels
Alt+[1-9]     - Jump to specific panel number
Ctrl+w h/j/k/l - Vim-style panel navigation
```

**Characteristics**:
- Clear visual focus indicator
- Multiple navigation methods
- Consistent across application
- Mouse support optional

---

### 2.3 Information Display Patterns

#### Real-Time Metrics
```
CPU  ████████████████░░░░  75.3%  ↑
MEM  ████████████░░░░░░░░  60.1%  →
DISK ██░░░░░░░░░░░░░░░░░░  8.5%   ↓
NET  ████████████████████  95.0%  ↑

Update: 1000ms
```

**Characteristics**:
- Progress bars for percentages
- Trend indicators (↑ ↓ →)
- Update frequency indicator
- Color coding for severity

**Examples**: btop++, system monitors

---

#### List/Table View
```
┌─────┬──────────────┬────────┬─────────┬──────────┐
│ PID │ NAME         │ CPU%   │ MEM%    │ STATUS   │
├─────┼──────────────┼────────┼─────────┼──────────┤
│ 123 │ firefox      │ 12.5   │ 8.3     │ Running  │
│ 456 │ chrome       │ 8.2    │ 15.1    │ Running  │
│ 789 │ code         │ 5.1    │ 12.0    │ Running  │
└─────┴──────────────┴────────┴─────────┴──────────┘
      ↑ Sort by column
```

**Characteristics**:
- Column headers (sortable)
- Row selection indicator
- Alternating row colors optional
- Fixed-width or flexible columns

**Examples**: Process lists, file managers

---

#### Tree View
```
📁 project/
├─ 📁 src/
│  ├─ 📄 main.rs
│  ├─ 📄 lib.rs
│  └─ 📁 components/
│     └─ 📄 button.rs
├─ 📁 tests/
└─ 📄 Cargo.toml
```

**Characteristics**:
- Hierarchical structure
- Expand/collapse indicators
- Icons for file types
- Indentation for depth

**Examples**: File browsers, Git status

---

#### Status Bar/Footer
```
┌────────────────────────────────────────────────────────┐
│                    Main Content                        │
└────────────────────────────────────────────────────────┘
 [Normal] main.rs:45:12  UTF-8  LF  Rust  ●  [?] Help
```

**Characteristics**:
- Always visible at bottom
- Current mode/state
- Position/context information
- Quick help reminder

**Examples**: Editors, most TUIs

---

#### Popup/Modal Dialogs
```
        ┌─────────────────────────┐
        │  Confirm Action         │
        ├─────────────────────────┤
        │  Delete 5 files?        │
        │                         │
        │  [Yes] [No]             │
        └─────────────────────────┘
```

**Characteristics**:
- Centered overlay
- Dim background
- Clear action buttons
- Escapable (Esc key)

**Examples**: Confirmation dialogs, help screens

---

### 2.4 Interaction Patterns

#### Single-Key Commands
```
r - Refresh
q - Quit
? - Help
/ - Search
d - Delete
e - Edit
```

**Advantages**:
- Fast execution
- No modifier keys
- Easy to remember (mnemonic)

**Disadvantages**:
- Limited key space
- Can conflict with text entry

**Examples**: btop++, lazygit

---

#### Chord Commands (Two-Key Sequences)
```
g g - Go to top
g e - Go to end
d d - Delete line
y y - Yank/copy line
```

**Advantages**:
- Expands available commands
- Logical grouping (g for "go")
- Familiar to Vim users

**Examples**: helix, Vim-inspired TUIs

---

#### Modal Keybindings
```
Normal Mode:
  j/k   - Move down/up
  d     - Delete

Insert Mode:
  Any key - Insert text
  Esc     - Return to Normal
```

**Advantages**:
- Context-dependent bindings
- Avoids key conflicts
- More commands available

**Examples**: helix, modal editors

---

#### Command Line Interface
```
:pods                  - Show pods
:xray deployments      - Visualize dependencies
:set theme=dark        - Change setting
```

**Advantages**:
- Discoverable via autocomplete
- Supports complex arguments
- Command history

**Examples**: k9s, Vim-style apps

---

#### Mouse Support
```
Click - Select item
Scroll - Navigate list
Drag - Resize panels
Double-click - Execute default action
```

**Characteristics**:
- Optional alternative to keyboard
- Clickable buttons/links
- Scroll wheel support
- Panel resizing

**Examples**: btop++, modern TUIs

---

### 2.5 Help & Discoverability Patterns

#### Persistent Key Hints
```
┌────────────────────────────────────────────────────────┐
│                    Main Content                        │
└────────────────────────────────────────────────────────┘
 F1:Help F2:Options F3:Filter F9:Menu F10:Quit
```

**Characteristics**:
- Always visible in header/footer
- Shows most common actions
- Function key mapping
- Quick reference

**Examples**: btop++, traditional TUIs

---

#### Modal Help Screen
```
┌────────────────────────────────────────────────────────┐
│                    HELP                                │
├────────────────────────────────────────────────────────┤
│  Navigation:                                           │
│    ↑/k      - Move up                                  │
│    ↓/j      - Move down                                │
│    Enter    - Select                                   │
│                                                        │
│  Actions:                                              │
│    d        - Delete                                   │
│    e        - Edit                                     │
│                                                        │
│  Press ? to toggle this help                           │
└────────────────────────────────────────────────────────┘
```

**Characteristics**:
- Full-screen or overlay
- Organized by category
- Searchable (optional)
- Toggleable (? key common)

**Examples**: Most TUIs

---

#### Context-Sensitive Help
```
When in Insert Mode:
  Footer shows: "Esc:Normal  Ctrl+S:Save  Ctrl+C:Cancel"

When in Normal Mode:
  Footer shows: "i:Insert  v:Select  ::Command  ?:Help"
```

**Characteristics**:
- Help changes based on mode/context
- Shows relevant actions only
- Reduces cognitive load

**Examples**: Modal editors

---

#### Command Palette
```
┌────────────────────────────────────────────────────────┐
│ > delete                                               │
├────────────────────────────────────────────────────────┤
│ ► Delete File                               (d)        │
│   Delete Line                               (d d)      │
│   Delete to End                             (d $)      │
│   Delete All                                (d a)      │
└────────────────────────────────────────────────────────┘
```

**Characteristics**:
- Fuzzy search for commands
- Shows keyboard shortcuts
- Command history
- Discoverable without memorization

**Examples**: Modern code editors, helix

---

#### Inline Tooltips
```
[Save]  ← Press Ctrl+S to save
 ↑
Hover shows shortcut
```

**Characteristics**:
- Appears on hover or focus
- Brief description
- Keyboard shortcut hint

**Examples**: Mouse-enabled TUIs

---

### 2.6 Theming & Visual Design Patterns

#### Color Coding by Semantic Meaning
```
✓ Success - Green
⚠ Warning - Yellow
✗ Error - Red
ℹ Info - Blue
● Running - Green
○ Stopped - Gray
```

**Accessibility Considerations**:
- Don't rely on color alone
- Use symbols + color
- Support high contrast themes
- Consider color blindness (8% of men)

**Examples**: All TUIs with status indicators

---

#### Focus Indicators
```
┌─────────────────┐  ┏━━━━━━━━━━━━━━━━━┓
│  Unfocused      │  ┃  Focused        ┃
│  Panel          │  ┃  Panel          ┃
└─────────────────┘  ┗━━━━━━━━━━━━━━━━━┛

Border style changes or:
- Border color brightens
- Background color changes
- Title bar highlights
```

**Characteristics**:
- Visually distinct from unfocused
- Works in monochrome
- Multiple visual cues

**Examples**: Multi-panel applications

---

#### Responsive Layout
```
Wide Terminal (>120 cols):
┌──────────┬──────────────┬──────────┐
│ Sidebar  │  Main        │ Details  │
└──────────┴──────────────┴──────────┘

Narrow Terminal (<80 cols):
┌────────────────────────────────────┐
│ Main (Sidebar collapsed)           │
└────────────────────────────────────┘
```

**Characteristics**:
- Panels collapse/hide on narrow terminals
- Layout adjusts to terminal size
- Minimum supported size defined
- Graceful degradation

**Examples**: Modern TUIs

---

#### Theme Configuration
```
# config.toml
[theme]
background = "#1e1e1e"
foreground = "#d4d4d4"
focused_border = "#007acc"
error = "#f44747"
success = "#4ec9b0"
```

**Characteristics**:
- User-customizable colors
- Preset themes available
- Support for 256 colors / true color
- High contrast options

**Examples**: Configurable TUIs

---

## 3. Ratatui Example Breakdown

### 3.1 Ratatui Architecture

**Core Structure**:
```rust
use ratatui::{
    backend::CrosstermBackend,
    Terminal,
    widgets::{Block, Borders, Paragraph},
    layout::{Layout, Constraint, Direction},
};

struct App {
    // Application state
    counter: u32,
    selected: usize,
}

fn main() -> Result<()> {
    // 1. Setup terminal
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout()))?;

    // 2. Create app state
    let mut app = App::default();

    // 3. Main loop
    loop {
        // 4. Draw UI
        terminal.draw(|f| ui(f, &app))?;

        // 5. Handle events
        if event::poll(Duration::from_millis(100))? {
            match event::read()? {
                Event::Key(key) => handle_key(key, &mut app),
                Event::Resize(..) => {},
                _ => {}
            }
        }

        // 6. Exit condition
        if app.should_quit {
            break;
        }
    }

    // 7. Restore terminal
    terminal.show_cursor()?;
    Ok(())
}

fn ui(f: &mut Frame, app: &App) {
    // Layout and widget rendering
}

fn handle_key(key: KeyEvent, app: &mut App) {
    // Event handling
}
```

---

### 3.2 Layout System

**Basic Constraints**:
```rust
// Vertical layout
let chunks = Layout::default()
    .direction(Direction::Vertical)
    .constraints([
        Constraint::Length(3),      // Fixed height
        Constraint::Min(0),          // Fill remaining
        Constraint::Percentage(20),  // 20% of height
    ])
    .split(f.area());
```

**Nested Layouts**:
```rust
// Split into columns first
let columns = Layout::default()
    .direction(Direction::Horizontal)
    .constraints([
        Constraint::Percentage(30),
        Constraint::Percentage(70),
    ])
    .split(f.area());

// Then split right column into rows
let rows = Layout::default()
    .direction(Direction::Vertical)
    .constraints([
        Constraint::Percentage(50),
        Constraint::Percentage(50),
    ])
    .split(columns[1]);
```

**Result**:
```
┌──────────┬──────────────────┐
│          │                  │
│  30%     │      70%         │
│          ├──────────────────┤
│          │                  │
│          │                  │
└──────────┴──────────────────┘
```

---

### 3.3 Common Widgets

#### Block (Container)
```rust
use ratatui::widgets::{Block, Borders};

let block = Block::default()
    .title("Title")
    .borders(Borders::ALL)
    .border_style(Style::default().fg(Color::Cyan));

f.render_widget(block, area);
```

---

#### Paragraph (Text Display)
```rust
use ratatui::widgets::Paragraph;

let text = vec![
    Line::from("Line 1"),
    Line::from(Span::styled("Bold", Style::default().add_modifier(Modifier::BOLD))),
];

let paragraph = Paragraph::new(text)
    .block(Block::default().title("Logs").borders(Borders::ALL))
    .wrap(Wrap { trim: true });

f.render_widget(paragraph, area);
```

---

#### List (Selectable Items)
```rust
use ratatui::widgets::{List, ListItem, ListState};

let items: Vec<ListItem> = vec![
    ListItem::new("Item 1"),
    ListItem::new("Item 2"),
    ListItem::new("Item 3"),
];

let list = List::new(items)
    .block(Block::default().title("List").borders(Borders::ALL))
    .highlight_style(Style::default().bg(Color::DarkGray));

let mut state = ListState::default();
state.select(Some(0));

f.render_stateful_widget(list, area, &mut state);
```

---

#### Table (Grid Data)
```rust
use ratatui::widgets::{Table, Row, Cell};

let rows = vec![
    Row::new(vec!["Cell 1", "Cell 2", "Cell 3"]),
    Row::new(vec!["Cell 4", "Cell 5", "Cell 6"]),
];

let table = Table::new(rows, [
    Constraint::Percentage(33),
    Constraint::Percentage(33),
    Constraint::Percentage(34),
])
.header(Row::new(vec!["Col 1", "Col 2", "Col 3"]))
.block(Block::default().title("Table").borders(Borders::ALL));

f.render_widget(table, area);
```

---

#### Gauge (Progress Bar)
```rust
use ratatui::widgets::Gauge;

let gauge = Gauge::default()
    .block(Block::default().title("Progress").borders(Borders::ALL))
    .gauge_style(Style::default().fg(Color::Green))
    .percent(75);

f.render_widget(gauge, area);
```

---

### 3.4 Async Pattern (Official Template)

**Project**: [ratatui/async-template](https://github.com/ratatui/async-template)

**Architecture**:
```rust
use tokio::sync::mpsc;

enum Event {
    Tick,
    Render,
    Input(KeyEvent),
}

#[tokio::main]
async fn main() -> Result<()> {
    let (tx, mut rx) = mpsc::channel(100);

    // Spawn tick task
    let tick_tx = tx.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_millis(250)).await;
            tick_tx.send(Event::Tick).await.ok();
        }
    });

    // Spawn input task
    let input_tx = tx.clone();
    tokio::spawn(async move {
        loop {
            if let Ok(key) = event::read() {
                input_tx.send(Event::Input(key)).await.ok();
            }
        }
    });

    // Main event loop
    while let Some(event) = rx.recv().await {
        match event {
            Event::Tick => app.on_tick(),
            Event::Input(key) => app.on_key(key),
            Event::Render => terminal.draw(|f| ui(f, &app))?,
        }
    }

    Ok(())
}
```

**Key Concepts**:
- Separate async tasks for different event sources
- Channel-based communication
- Non-blocking event handling
- Immediate-mode rendering triggered by events

---

### 3.5 Real-Time Updates Pattern

**Example**: GitHub API Integration
```rust
use tokio::sync::watch;

struct App {
    data: watch::Receiver<Vec<Repo>>,
}

async fn fetch_repos(tx: watch::Sender<Vec<Repo>>) {
    loop {
        match github_api::fetch_repos().await {
            Ok(repos) => tx.send(repos).ok(),
            Err(e) => eprintln!("Error: {}", e),
        }
        tokio::time::sleep(Duration::from_secs(60)).await;
    }
}

fn ui(f: &mut Frame, app: &App) {
    let repos = app.data.borrow();
    // Render repos
}
```

**Pattern**:
- Background task fetches data periodically
- Watch channel broadcasts updates to UI
- UI re-renders when data changes
- No blocking in main loop

---

### 3.6 Component Pattern

**From**: [Component Template](https://ratatui.rs/templates/component/)

```rust
trait Component {
    fn register_action_handler(&mut self, handler: Box<dyn Fn(Action)>);
    fn register_config_handler(&mut self, handler: Box<dyn Fn(Config)>);
    fn init(&mut self) -> Result<()>;
    fn handle_events(&mut self, event: Event) -> Result<()>;
    fn update(&mut self, action: Action) -> Result<()>;
    fn draw(&mut self, f: &mut Frame, area: Rect);
}

struct Dashboard {
    cpu_monitor: CpuComponent,
    memory_monitor: MemoryComponent,
    process_list: ProcessComponent,
}

impl Component for Dashboard {
    fn draw(&mut self, f: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage(25),
                Constraint::Percentage(25),
                Constraint::Percentage(50),
            ])
            .split(area);

        self.cpu_monitor.draw(f, chunks[0]);
        self.memory_monitor.draw(f, chunks[1]);
        self.process_list.draw(f, chunks[2]);
    }
}
```

**Advantages**:
- Composable UI components
- Encapsulated state
- Reusable across projects
- Clear separation of concerns

---

### 3.7 Ratatui Examples from Repository

**Key Examples**:

1. **Dashboard** (`examples/dashboard.rs`)
   - Multi-panel layout
   - Real-time metrics
   - Progress bars and sparklines

2. **Flex Layout** (`examples/flex.rs`)
   - Demonstrates flexible layouts
   - Responsive to terminal size

3. **List** (`examples/list.rs`)
   - Scrollable list with selection
   - Keyboard navigation
   - Stateful rendering

4. **Table** (`examples/table.rs`)
   - Sortable columns
   - Row selection
   - Fixed vs scrolling headers

5. **Tabs** (`examples/tabs.rs`)
   - Tab navigation
   - Per-tab content rendering

6. **Popup** (`examples/popup.rs`)
   - Modal overlays
   - Dimmed background
   - Centered dialog

**Resources**:
- [Ratatui Examples README](https://github.com/ratatui/ratatui/blob/main/examples/README.md)
- [Simple Template](https://github.com/ratatui/templates/tree/main/simple)
- [Async Template](https://github.com/ratatui/templates/tree/main/simple-async)

---

## 4. Best Practices Compilation

### 4.1 Accessibility Best Practices

**From**: [Accessibility of Command Line Interfaces (ACM)](https://dl.acm.org/doi/fullHtml/10.1145/3411764.3445544)

#### Key Findings:

1. **Provide HTML Documentation**
   - Screen reader users don't use `--help` or `man` pages
   - They rely on HTML/online documentation
   - CLI reference docs should be available on web

2. **Allow Exporting Output**
   - Scrolling in terminal is difficult with screen readers
   - Export to text/HTML for better navigation
   - Enable users to search/navigate efficiently

3. **Document Output Structure**
   - Users need to know output format before running command
   - Provide structure documentation
   - Explain table formats, sections

4. **Translate Tables to Accessible Formats**
   - CLI tables are just visually formatted text
   - Unstructured for screen readers
   - Provide alternative structured formats

---

#### WCAG Compliance Levels:

**Level A (Minimum)**:
- Keyboard accessibility
- Text alternatives for images
- Time-based media alternatives

**Level AA (Recommended)**:
- Contrast requirements (4.5:1 for normal text)
- Error identification and suggestions
- Consistent navigation
- Focus indicators (3:1 contrast minimum)

**Level AAA (Enhanced)**:
- Higher contrast (7:1 for normal text)
- No time limits
- Enhanced error prevention

**WCAG 2.2 Additions**:
- Focus appearance (clearly visible keyboard focus)
- Dragging movements have accessible alternatives
- Consistent help mechanisms

---

#### Keyboard Navigation Standards:

**Essential Keys**:
```
Tab / Shift+Tab     - Navigate between controls
Arrow keys          - Navigate within controls
Page Up/Down        - Large movements
Home/End            - First/last items
Enter/Space         - Activate/select
Esc                 - Cancel/close
```

**Principles**:
1. Tab order must be logical and follow visual flow
2. Focus indicators must be clearly visible (3:1 contrast)
3. Skip links for bypassing repetitive navigation
4. All functions accessible via keyboard alone

---

#### Color and Contrast:

**Accessible Color Schemes**:
- Normal text: 4.5:1 contrast ratio (WCAG AA)
- Large text: 3:1 contrast ratio (WCAG AA)
- Enhanced: 7:1 contrast ratio (WCAG AAA)

**Color Blindness Considerations**:
- 8% of men, 0.5% of women have CVD
- Don't rely on color alone
- Use symbols + color
- Provide alternative color schemes

**Example**: Bloomberg Terminal
- Switched from red/green to blue/red for CVD users
- Maintained amber for non-semantic information
- Statistically significant improvement in accuracy

**Tools**:
- **Gogh**: Collection of accessible terminal color schemes
- **Vargula**: Python library for WCAG-compliant themes
- **Modus Themes**: Emacs themes with WCAG AAA compliance

**Sources**:
- [Accessibility of Command Line Interfaces (ACM)](https://dl.acm.org/doi/fullHtml/10.1145/3411764.3445544)
- [WebAIM: Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
- [Designing the Terminal for Color Accessibility (Bloomberg)](https://www.bloomberg.com/company/stories/designing-the-terminal-for-color-accessibility/)

---

### 4.2 Performance Best Practices

#### Rendering Optimization:

**Immediate-Mode Rendering**:
```rust
// ❌ Don't: Store rendered widgets
struct App {
    paragraph: Paragraph<'static>,  // Anti-pattern
}

// ✅ Do: Rebuild widgets each frame
fn ui(f: &mut Frame, app: &App) {
    let paragraph = Paragraph::new(app.text.clone());
    f.render_widget(paragraph, area);
}
```

**Rationale**: Ratatui uses immediate-mode rendering with intermediate buffers. Storing widgets wastes memory and complicates lifecycle.

---

#### Efficient Updates:

**Rate Limiting**:
```rust
// Don't re-render on every tiny event
let mut last_render = Instant::now();
const RENDER_INTERVAL: Duration = Duration::from_millis(16); // 60 FPS

loop {
    // Handle events
    if event::poll(Duration::from_millis(100))? {
        match event::read()? {
            Event::Key(key) => handle_key(key, &mut app),
            _ => {}
        }
    }

    // Render throttling
    if last_render.elapsed() >= RENDER_INTERVAL {
        terminal.draw(|f| ui(f, &app))?;
        last_render = Instant::now();
    }
}
```

---

#### Async for I/O:

**Pattern**:
- Use `tokio` or `async-std` for async runtime
- Separate tasks for different I/O sources
- Channel-based communication with main loop
- Non-blocking event handling

```rust
// Background data fetching
tokio::spawn(async move {
    loop {
        let data = fetch_data().await;
        tx.send(Event::DataUpdated(data)).await.ok();
        tokio::time::sleep(Duration::from_secs(5)).await;
    }
});
```

---

### 4.3 User Experience Best Practices

#### Consistency:

**Key Principle**: "Boring is good"

- Consistent keybindings across views
- Predictable behavior in similar contexts
- Follow conventions (Vim-style if using h/j/k/l)
- Maintain visual consistency

---

#### Discoverability:

**Multiple Discovery Mechanisms**:

1. **Inline Help**
   - Footer with common keys
   - `?` key for help overlay

2. **Command Palette**
   - Fuzzy search for commands
   - Shows shortcuts next to commands

3. **Progressive Disclosure**
   - Show common actions first
   - Advanced features in menus/help

4. **Contextual Help**
   - Help changes based on mode/state
   - Only show relevant actions

**Example (from helix)**:
- Modal dialogs open when entering modes
- Shows available commands for that mode
- Command palette accessible via `Ctrl+K`

---

#### Error Handling:

**User-Friendly Errors**:
```rust
// ❌ Don't: Generic errors
eprintln!("Error: {:?}", e);

// ✅ Do: Actionable error messages
eprintln!("❌ Failed to connect to server");
eprintln!("   Reason: Connection timeout after 30s");
eprintln!("   Fix: Check if server is running at localhost:8080");
eprintln!("        Or use --host flag to specify different address");
```

**In-App Error Display**:
- Red color for errors
- Yellow for warnings
- Clear error messages in dedicated area
- Suggested fixes where possible

---

#### Feedback:

**Immediate Feedback**:
- Visual confirmation for actions
- Progress indicators for long operations
- Status bar updates
- Toast/notification for background events

**Examples**:
```
✓ File saved successfully
⚠ Network latency high (500ms)
● Processing... 45% complete
✗ Failed to delete: Permission denied
```

---

### 4.4 Code Organization Best Practices

#### Separation of Concerns:

**Pattern**:
```rust
// State
struct App {
    state: AppState,
}

// Events
enum AppEvent {
    KeyPress(KeyEvent),
    Tick,
    DataUpdate(Data),
}

// Actions
impl App {
    fn handle_event(&mut self, event: AppEvent) {
        // Update state
    }
}

// UI (Pure function of state)
fn ui(f: &mut Frame, app: &App) {
    // Render based on app.state
}
```

**Benefits**:
- Testable state management
- Pure UI functions
- Clear event flow
- Easy to reason about

---

#### Component Architecture:

**When to Use Components**:
- Reusable UI elements (e.g., status bar)
- Complex subsections (e.g., file browser)
- Self-contained features (e.g., log viewer)

**Component Trait**:
```rust
trait Component {
    fn init(&mut self) -> Result<()>;
    fn handle_event(&mut self, event: Event) -> Result<Option<Action>>;
    fn update(&mut self, action: Action) -> Result<()>;
    fn draw(&mut self, f: &mut Frame, area: Rect);
}
```

**Composition**:
```rust
struct Dashboard {
    components: Vec<Box<dyn Component>>,
}

impl Dashboard {
    fn draw(&mut self, f: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .constraints(self.component_constraints())
            .split(area);

        for (component, chunk) in self.components.iter_mut().zip(chunks.iter()) {
            component.draw(f, *chunk);
        }
    }
}
```

---

### 4.5 Terminal Compatibility

#### Testing on Multiple Terminals:

**Common Terminals**:
- **Linux**: gnome-terminal, konsole, xterm, alacritty
- **macOS**: Terminal.app, iTerm2, Alacritty
- **Windows**: Windows Terminal, ConEmu, Alacritty

**Issues to Test**:
- Color support (16, 256, true color)
- Unicode rendering
- Mouse support
- Resize handling
- Alt/Ctrl key combinations

---

#### Backend Selection:

**Crossterm** (Recommended):
- Cross-platform (Windows, Linux, macOS)
- Wide terminal support
- Active maintenance
- Part of Ratatui ecosystem

**Termion** (Alternative):
- Unix-only
- Lightweight
- Good for simple TUIs

---

#### Graceful Degradation:

```rust
// Check color support
if terminal.colors().unwrap_or(16) < 256 {
    // Use 16-color palette
} else {
    // Use 256 or true color
}

// Handle narrow terminals
if terminal.width() < 80 {
    // Simplified layout
} else {
    // Full layout
}
```

---

## 5. Anti-patterns to Avoid

### 5.1 UI Design Anti-patterns

#### Hide and Hover

**Description**: Actions only visible on hover/focus

**Why it's bad**:
- Requires exploration to discover actions
- No affordance for available operations
- Doesn't work in keyboard-only mode
- Frustrating for users

**Example**:
```
❌ Bad: Edit/delete buttons only appear on hover
✅ Good: Always show action buttons or use consistent keybindings
```

---

#### Small Click Targets

**Description**: Interactive elements too small to easily click/select

**Why it's bad**:
- Requires precision
- Slows down interaction
- Mental energy wasted on targeting

**Example**:
```
❌ Bad: [x] (1 character close button)
✅ Good: [X Close] (larger target with text)
```

---

#### Ambiguous Labels

**Description**: Unclear what an action will do

**Why it's bad**:
- Confuses users
- Requires experimentation
- May cause unintended actions

**Example**:
```
❌ Bad: "Click here" "OK" "Submit"
✅ Good: "Delete file" "Save changes" "Confirm deletion"
```

---

#### Inconsistent Navigation

**Description**: Navigation behaves differently in different contexts

**Why it's bad**:
- Users must relearn navigation
- Breaks muscle memory
- Increases cognitive load

**Example**:
```
❌ Bad: j/k in one view, arrow keys in another
✅ Good: Consistent j/k OR arrows everywhere
```

---

#### Insufficient Feedback

**Description**: No confirmation that action succeeded/failed

**Why it's bad**:
- Uncertainty leads to repeated actions
- Potential for duplicate operations
- User anxiety

**Example**:
```
❌ Bad: File saved (no indication)
✅ Good: ✓ File saved successfully [timestamp]
```

---

#### Forcing Users Through Dialogs

**Description**: Wizards/dialogs that must be completed or can't be cancelled

**Why it's bad**:
- Frustrating if entered by mistake
- Removes user control
- Creates feeling of being trapped

**Example**:
```
❌ Bad: Setup wizard with no way to skip/cancel
✅ Good: Wizard with "Skip" and "Cancel" options
```

---

### 5.2 Performance Anti-patterns

#### Blocking the Main Thread

**Description**: Long-running operations block UI updates

**Why it's bad**:
- UI becomes unresponsive
- No progress feedback
- Appears frozen

**Example**:
```rust
❌ Bad:
fn handle_key(&mut self, key: KeyCode) {
    if key == KeyCode::Char('l') {
        let data = fetch_data_from_api(); // Blocks!
        self.data = data;
    }
}

✅ Good:
fn handle_key(&mut self, key: KeyCode) {
    if key == KeyCode::Char('l') {
        self.tx.send(Event::FetchData).await.ok();
    }
}

// In async task:
async fn fetch_task(tx: mpsc::Sender<Event>) {
    let data = fetch_data_from_api().await;
    tx.send(Event::DataReady(data)).await.ok();
}
```

---

#### Excessive Re-rendering

**Description**: Re-drawing UI when nothing changed

**Why it's bad**:
- Wastes CPU
- Reduces battery life
- Can cause flicker

**Example**:
```rust
❌ Bad:
loop {
    terminal.draw(|f| ui(f, &app))?; // Every loop iteration!
    // ...
}

✅ Good:
loop {
    if has_changes {
        terminal.draw(|f| ui(f, &app))?;
        has_changes = false;
    }
    // ...
}
```

---

#### Not Throttling Updates

**Description**: Updating UI on every event without rate limiting

**Why it's bad**:
- Overwhelms rendering system
- Wastes resources
- May cause lag

**Example**:
```rust
❌ Bad:
// Mouse move events fire constantly
Event::MouseMove(x, y) => {
    app.mouse_pos = (x, y);
    // Render after every mouse move!
}

✅ Good:
// Rate limit to 60 FPS
if last_render.elapsed() >= Duration::from_millis(16) {
    terminal.draw(|f| ui(f, &app))?;
    last_render = Instant::now();
}
```

---

### 5.3 Code Organization Anti-patterns

#### God Object

**Description**: Single struct containing all application state and logic

**Why it's bad**:
- Hard to understand
- Difficult to test
- Poor separation of concerns
- Becomes unmaintainable

**Example**:
```rust
❌ Bad:
struct App {
    // Hundreds of fields
    counter: u32,
    files: Vec<File>,
    network_status: Status,
    db_connection: Connection,
    // ... 50+ more fields

    // Hundreds of methods
    fn increment(&mut self) { }
    fn fetch_files(&mut self) { }
    fn connect_db(&mut self) { }
    // ... 50+ more methods
}

✅ Good:
struct App {
    counter: Counter,
    file_browser: FileBrowser,
    network: NetworkMonitor,
    database: DatabaseManager,
}
```

---

#### Tight Coupling to Ratatui

**Description**: Business logic mixed with rendering code

**Why it's bad**:
- Can't test logic without Ratatui
- Hard to change rendering
- Difficult to reuse logic

**Example**:
```rust
❌ Bad:
fn ui(f: &mut Frame, app: &App) {
    let result = perform_calculation(); // Business logic in UI!
    let text = format!("Result: {}", result);
    f.render_widget(Paragraph::new(text), area);
}

✅ Good:
fn update(app: &mut App) {
    app.result = perform_calculation(); // Logic separate
}

fn ui(f: &mut Frame, app: &App) {
    let text = format!("Result: {}", app.result);
    f.render_widget(Paragraph::new(text), area);
}
```

---

#### Global Mutable State

**Description**: Using global variables for state

**Why it's bad**:
- Hard to reason about
- Thread-safety issues
- Testing difficulties
- Hidden dependencies

**Example**:
```rust
❌ Bad:
static mut COUNTER: u32 = 0;

fn increment() {
    unsafe { COUNTER += 1; }
}

✅ Good:
struct App {
    counter: u32,
}

impl App {
    fn increment(&mut self) {
        self.counter += 1;
    }
}
```

---

### 5.4 User Experience Anti-patterns

#### No Way to Exit

**Description**: Unclear or missing exit mechanism

**Why it's bad**:
- Users feel trapped
- May kill terminal
- Poor user experience

**Example**:
```
❌ Bad: No visible exit option, Ctrl+C doesn't work
✅ Good: "q - Quit" in footer, Ctrl+C and Esc both work
```

---

#### Cryptic Error Messages

**Description**: Technical errors without context or solutions

**Why it's bad**:
- User doesn't know what went wrong
- No way to fix the issue
- Frustrating experience

**Example**:
```
❌ Bad: "Error: ECONNREFUSED"
✅ Good: "Cannot connect to server at localhost:8080
        Please check that the server is running
        or use --host to specify a different address"
```

---

#### Too Many Keybindings

**Description**: Overwhelming number of keyboard shortcuts

**Why it's bad**:
- Hard to remember
- Cognitive overload
- Conflicts with each other

**Example**:
```
❌ Bad: 50+ single-key shortcuts
✅ Good: Core shortcuts + command palette for rare actions
```

---

#### No Undo/Confirmation

**Description**: Destructive actions without confirmation

**Why it's bad**:
- Accidental data loss
- User anxiety
- Reduces trust

**Example**:
```
❌ Bad: "d" immediately deletes file
✅ Good: "d" opens dialog: "Delete file.txt? [y/N]"
```

---

#### Overuse of Color

**Description**: Every element has different colors

**Why it's bad**:
- Visual noise
- Hard to focus
- Accessibility issues

**Example**:
```
❌ Bad: Rainbow of colors everywhere
✅ Good: Semantic colors (red=error, green=success, blue=info)
        with mostly neutral palette
```

---

### 5.5 Terminal-Specific Anti-patterns

#### Assuming 256 Colors

**Description**: Using colors that don't exist in 16-color mode

**Why it's bad**:
- Broken on some terminals
- Poor fallback
- Accessibility issues

**Example**:
```rust
❌ Bad:
Color::Rgb(0x1e, 0x1e, 0x2e) // Assumes true color

✅ Good:
if supports_truecolor() {
    Color::Rgb(0x1e, 0x1e, 0x2e)
} else {
    Color::DarkGray
}
```

---

#### Hardcoded Terminal Size

**Description**: Assuming specific terminal dimensions

**Why it's bad**:
- Breaks on different sizes
- Not responsive
- Poor UX on small/large terminals

**Example**:
```rust
❌ Bad:
const WIDTH: u16 = 120; // What if terminal is 80 cols?

✅ Good:
let width = terminal.size()?.width;
```

---

#### Not Restoring Terminal State

**Description**: Leaving terminal in raw mode or with hidden cursor

**Why it's bad**:
- Terminal unusable after crash
- User must reset terminal
- Very frustrating

**Example**:
```rust
❌ Bad:
fn main() {
    enable_raw_mode()?;
    // ... app runs ...
    // Crash! Terminal left in raw mode
}

✅ Good:
fn main() {
    enable_raw_mode()?;
    let result = run_app();
    disable_raw_mode()?; // Always restore
    result
}

// Even better: Use RAII guard
struct TerminalGuard;
impl Drop for TerminalGuard {
    fn drop(&mut self) {
        disable_raw_mode().ok();
    }
}
```

---

#### Ignoring Resize Events

**Description**: Not responding to terminal resize

**Why it's bad**:
- Layout breaks
- Content cut off
- Poor UX

**Example**:
```rust
❌ Bad:
Event::Resize(_, _) => {} // Ignored

✅ Good:
Event::Resize(w, h) => {
    app.terminal_size = (w, h);
    app.needs_redraw = true;
}
```

---

## 6. Feature Inspiration Matrix

Matrix of features observed across different TUI applications that could inspire Flow Orchestrator design.

| Feature | btop++ | lazygit | k9s | helix | broot | Applicable to Flow? |
|---------|---------|---------|-----|-------|-------|---------------------|
| **Layout** |
| Multi-panel dashboard | ✓ | ✓ | ✓ | | | ✓✓✓ |
| Collapsible panels | ✓ | | ✓ | | | ✓✓ |
| Tabbed interface | | | | | | ✓ |
| Split panes | | | ✓ | ✓ | ✓ | ✓✓ |
| **Navigation** |
| Vim-style (hjkl) | ✓ | | | ✓ | | ✓✓✓ |
| Tab/Shift+Tab | | ✓ | | | | ✓✓✓ |
| Number keys (1-9) | ✓ | ✓ | | | | ✓✓ |
| Command palette | | | ✓ | ✓ | | ✓✓✓ |
| Fuzzy search | | | | | ✓ | ✓✓✓ |
| **Information Display** |
| Real-time metrics | ✓ | | ✓ | | | ✓✓✓ |
| Progress bars | ✓ | | | | | ✓✓✓ |
| Tree view | | ✓ | | | ✓ | ✓✓ |
| Tables with sorting | ✓ | | ✓ | | | ✓✓✓ |
| Graphs/sparklines | ✓ | | ✓ | | | ✓✓ |
| Status bar | ✓ | ✓ | ✓ | ✓ | | ✓✓✓ |
| **Interaction** |
| Single-key commands | ✓ | ✓ | ✓ | | | ✓✓✓ |
| Modal keybindings | | | | ✓ | | ✓ |
| Mouse support | ✓ | | | | | ✓ |
| Keyboard hints | ✓ | ✓ | | | | ✓✓✓ |
| **Help System** |
| ? key help overlay | ✓ | ✓ | | ✓ | | ✓✓✓ |
| F1 help screen | ✓ | | | | | ✓ |
| Command palette help | | | ✓ | ✓ | | ✓✓✓ |
| Footer key hints | ✓ | ✓ | | | | ✓✓✓ |
| Context-sensitive help | | | ✓ | ✓ | | ✓✓ |
| **Configuration** |
| Customizable keybindings | ✓ | | | ✓ | | ✓✓ |
| Theme support | ✓ | | ✓ | ✓ | | ✓✓ |
| Layout presets | ✓ | | | | | ✓ |
| Custom views/filters | | | ✓ | | | ✓✓ |
| **Advanced Features** |
| XRay visualization | | | ✓ | | | ✓✓✓ |
| Multi-cursor editing | | | | ✓ | | ✗ |
| Git integration | | ✓ | | | ✓ | ✗ |
| Log viewing | | | ✓ | | | ✓✓✓ |
| Tree-sitter integration | | | | ✓ | | ✗ |
| Async data fetching | | | ✓ | | | ✓✓✓ |

**Legend**:
- ✓✓✓ = Highly applicable, should implement
- ✓✓ = Moderately applicable, consider implementing
- ✓ = Somewhat applicable, optional
- ✗ = Not applicable to Flow Orchestrator

---

### Feature Analysis for Flow Orchestrator

#### Must-Have Features:

1. **Multi-panel dashboard**
   - Core to orchestration visualization
   - Show agents, tasks, logs simultaneously
   - Inspired by: btop++, lazygit, k9s

2. **Real-time metrics**
   - Agent status, task progress, system load
   - Update without blocking
   - Inspired by: btop++, k9s

3. **Command palette**
   - Discover orchestration commands
   - Fuzzy search for actions
   - Inspired by: k9s, helix

4. **Keyboard-centric navigation**
   - Vim-style movement
   - Single-key common actions
   - Tab between panels
   - Inspired by: btop++, lazygit, helix

5. **Help system**
   - ? key overlay
   - Footer hints
   - Context-sensitive help
   - Inspired by: All TUIs reviewed

6. **Log viewing**
   - Real-time agent logs
   - Filtering and search
   - Inspired by: k9s

---

#### Should-Have Features:

1. **XRay visualization**
   - Agent dependency graph
   - Task flow visualization
   - Inspired by: k9s

2. **Fuzzy search**
   - Find agents, tasks quickly
   - Filter large lists
   - Inspired by: broot, helix

3. **Tables with sorting**
   - Agent list, task queue
   - Sort by various columns
   - Inspired by: btop++, k9s

4. **Collapsible panels**
   - Focus on specific areas
   - Maximize important views
   - Inspired by: btop++

5. **Theme support**
   - User customization
   - Accessibility (high contrast)
   - Inspired by: helix, k9s

---

#### Optional Features:

1. **Mouse support**
   - Alternative to keyboard
   - Click to select
   - Inspired by: btop++

2. **Custom layouts**
   - Save/load panel configurations
   - Presets for different workflows
   - Inspired by: btop++

3. **Keybinding customization**
   - Power user flexibility
   - Inspired by: helix, btop++

---

## 7. Recommendations for Flow Orchestrator

### 7.1 Architecture Recommendations

#### Use Async Architecture

**Recommended**: [Ratatui Async Template](https://github.com/ratatui/async-template)

**Rationale**:
- Flow Orchestrator needs real-time updates from multiple sources
- Agents, tasks, logs all update asynchronously
- Non-blocking UI crucial for responsive experience

**Structure**:
```rust
enum Event {
    Tick,                          // Regular updates (e.g., 250ms)
    Input(KeyEvent),               // User input
    AgentStatusUpdate(AgentId, Status),
    TaskProgress(TaskId, f32),
    LogMessage(AgentId, String),
}

async fn main() {
    let (tx, mut rx) = mpsc::channel(100);

    // Spawn tasks for each event source
    spawn_tick_task(tx.clone());
    spawn_input_task(tx.clone());
    spawn_orchestrator_monitor_task(tx.clone());

    // Main event loop
    while let Some(event) = rx.recv().await {
        match event {
            Event::Input(key) => handle_key(&mut app, key),
            Event::AgentStatusUpdate(id, status) => {
                app.agents.get_mut(&id).status = status;
            }
            Event::TaskProgress(id, progress) => {
                app.tasks.get_mut(&id).progress = progress;
            }
            Event::LogMessage(id, msg) => {
                app.logs.push(LogEntry { agent: id, message: msg });
            }
            _ => {}
        }

        // Re-render
        terminal.draw(|f| ui(f, &app))?;
    }
}
```

---

#### Component-Based UI

**Rationale**:
- Flow Orchestrator has distinct UI sections (agents, tasks, logs, metrics)
- Components enable reusability and testing
- Clear separation of concerns

**Recommended Components**:
```rust
trait Component {
    fn init(&mut self) -> Result<()>;
    fn handle_event(&mut self, event: Event) -> Result<Option<Action>>;
    fn update(&mut self, action: Action) -> Result<()>;
    fn draw(&mut self, f: &mut Frame, area: Rect);
}

struct Dashboard {
    agent_panel: AgentListComponent,
    task_panel: TaskQueueComponent,
    log_panel: LogViewerComponent,
    metrics_panel: MetricsComponent,
    focused: PanelId,
}

struct AgentListComponent {
    agents: Vec<Agent>,
    selected: usize,
    filter: String,
}

struct TaskQueueComponent {
    tasks: Vec<Task>,
    sort_by: SortColumn,
}

struct LogViewerComponent {
    logs: Vec<LogEntry>,
    filter: Option<AgentId>,
    auto_scroll: bool,
}

struct MetricsComponent {
    cpu_history: VecDeque<f32>,
    memory_history: VecDeque<f32>,
    update_rate: Duration,
}
```

---

### 7.2 Layout Recommendations

#### Recommended Main Layout:

```
┌────────────────────────────────────────────────────────────┐
│ Flow Orchestrator v1.0.0          [Connected] [?] Help    │
├────────────────────┬───────────────────────────────────────┤
│ AGENTS (5)         │ TASKS (12)                            │
│ ┌────────────────┐ │ ┌─────────────────────────────────┐   │
│ │ ● worker-1 ✓   │ │ │ ID  Task         Status  Progress│   │
│ │ ● worker-2 ⚙   │ │ │ 1   Build API    Running ▬▬▬░░ │   │
│ │ ○ worker-3 ✗   │ │ │ 2   Run Tests    Pending      │   │
│ │ ● worker-4 ✓   │ │ │ 3   Deploy      Pending      │   │
│ │ ● worker-5 ⚙   │ │ └─────────────────────────────────┘   │
│ └────────────────┘ │                                       │
│                    │ METRICS                               │
│ [Filter: _____]    │ CPU  ▬▬▬▬▬▬▬▬░░░░ 65%                 │
│                    │ MEM  ▬▬▬▬▬▬▬░░░░░░ 58%                 │
├────────────────────┴───────────────────────────────────────┤
│ LOGS [agent: all] [level: info]                   ↓ Scroll│
│ 12:34:56 [worker-1] Task started: Build API                │
│ 12:34:57 [worker-2] Compiling source files...              │
│ 12:34:58 [worker-1] ✓ Build completed successfully         │
└────────────────────────────────────────────────────────────┘
 j/k: Navigate  Enter: Details  f: Filter  x: XRay  q: Quit
```

**Layout Proportions**:
- Header: 3 rows (fixed)
- Main area: 70% height
  - Left panel (agents): 30% width
  - Right panels: 70% width
    - Tasks: 60% of right area height
    - Metrics: 40% of right area height
- Logs: 30% height (resizable)
- Footer: 1 row (fixed)

---

#### Alternative: Tabbed Layout

```
┌────────────────────────────────────────────────────────────┐
│ [Dashboard*] [Agents] [Tasks] [Logs] [Settings]     [?]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                Tab-specific content                        │
│                                                            │
│                                                            │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
 Tab/Shift+Tab: Switch tabs  q: Quit
```

**Tabs**:
1. **Dashboard**: Multi-panel overview (as shown above)
2. **Agents**: Detailed agent list and management
3. **Tasks**: Task queue with advanced filtering/sorting
4. **Logs**: Full-screen log viewer with advanced search
5. **Settings**: Configuration and preferences

**Recommendation**: Start with multi-panel, add tabs if complexity grows.

---

### 7.3 Navigation Recommendations

#### Keyboard Shortcuts:

**Global**:
```
q, Ctrl+C       - Quit
?               - Toggle help overlay
:               - Command palette
Esc             - Cancel/back
Tab             - Next panel
Shift+Tab       - Previous panel
1-5             - Jump to specific panel
```

**Panel Navigation**:
```
h, j, k, l      - Navigate (Vim-style)
↑, ↓, ←, →      - Navigate (arrow keys)
g, G            - Top, bottom
Ctrl+d, Ctrl+u  - Page down, up
/               - Search/filter in current panel
n, N            - Next, previous search result
```

**Actions**:
```
Enter           - View details / drill down
Space           - Select/deselect (multi-select)
a               - Select all
d               - Delete/remove
e               - Edit
r               - Refresh
x               - XRay visualization
```

**Panel-Specific**:
```
Agents Panel:
  s - Start agent
  k - Kill agent
  l - View logs (filter log panel)

Tasks Panel:
  c - Cancel task
  p - Pause task
  r - Resume task

Logs Panel:
  f - Filter by agent
  L - Change log level
  Ctrl+l - Clear logs
  End - Scroll to bottom (toggle auto-scroll)
```

---

### 7.4 Visual Design Recommendations

#### Color Scheme:

**Semantic Colors**:
```rust
// Status colors
const SUCCESS: Color = Color::Green;
const WARNING: Color = Color::Yellow;
const ERROR: Color = Color::Red;
const INFO: Color = Color::Blue;
const RUNNING: Color = Color::Cyan;

// UI colors
const BORDER_FOCUSED: Color = Color::Cyan;
const BORDER_UNFOCUSED: Color = Color::DarkGray;
const BACKGROUND: Color = Color::Black;
const FOREGROUND: Color = Color::White;
const SELECTED: Color = Color::DarkGray; // Background for selected item
const HIGHLIGHT: Color = Color::Yellow;
```

**Accessibility**:
- Provide high-contrast theme option
- Use symbols + color (not color alone)
- Support 16-color, 256-color, and true color
- Test with color blindness simulators

---

#### Status Indicators:

```
● - Active/running (Green)
○ - Inactive/stopped (Gray)
✓ - Success/completed (Green)
✗ - Error/failed (Red)
⚠ - Warning (Yellow)
⚙ - Working/processing (Cyan)
◐ - Pending/queued (Yellow)
⏸ - Paused (Yellow)
```

---

#### Progress Bars:

```
▬▬▬▬▬▬▬▬░░░░ 65%  - Standard progress bar
████████░░░░ 65%  - Alternative style
▓▓▓▓▓▓▓▓▒▒▒▒ 65%  - Gradient style
```

---

### 7.5 Feature Prioritization

#### Phase 1: MVP (Weeks 1-2)

**Core Functionality**:
- [x] Basic multi-panel layout (agents, tasks, logs)
- [x] Real-time status updates via async channels
- [x] Agent list with status indicators
- [x] Task queue with progress
- [x] Log viewer with auto-scroll
- [x] Basic keyboard navigation (hjkl, Tab, Enter, q)

**UI**:
- [x] Panel focus indication
- [x] Status bar with key hints
- [x] Color-coded status

---

#### Phase 2: Enhanced UX (Weeks 3-4)

**Navigation**:
- [ ] Command palette (`:` key)
- [ ] Fuzzy search in lists
- [ ] Help overlay (`?` key)
- [ ] Context-sensitive shortcuts

**Interaction**:
- [ ] Single-key actions (start, kill, cancel)
- [ ] Multi-select for batch operations
- [ ] Filtering and sorting
- [ ] Detail view for agents/tasks

---

#### Phase 3: Advanced Features (Weeks 5-6)

**Visualization**:
- [ ] XRay dependency graph
- [ ] Metrics with historical data
- [ ] Sparklines for trends

**Customization**:
- [ ] Theme selection
- [ ] Layout presets
- [ ] Keybinding customization
- [ ] Config file support

---

#### Phase 4: Polish (Week 7+)

**User Experience**:
- [ ] Mouse support
- [ ] Collapsible panels
- [ ] Tabbed interface option
- [ ] Session persistence (remember layout)

**Advanced**:
- [ ] Export logs
- [ ] Screenshot/recording
- [ ] Plugin system for custom panels

---

### 7.6 Testing Recommendations

#### Unit Tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn agent_list_navigation() {
        let mut component = AgentListComponent::new();
        component.agents = vec![agent1, agent2, agent3];

        assert_eq!(component.selected, 0);
        component.next();
        assert_eq!(component.selected, 1);
        component.next();
        assert_eq!(component.selected, 2);
        component.next(); // Should wrap
        assert_eq!(component.selected, 0);
    }

    #[test]
    fn task_filtering() {
        let mut component = TaskQueueComponent::new();
        component.tasks = vec![task1, task2, task3];

        component.set_filter("build");
        let filtered = component.filtered_tasks();
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].name, "Build API");
    }
}
```

---

#### Integration Tests:

```rust
#[tokio::test]
async fn async_event_handling() {
    let (tx, mut rx) = mpsc::channel(10);

    // Simulate agent status update
    tx.send(Event::AgentStatusUpdate(
        AgentId(1),
        AgentStatus::Running
    )).await.unwrap();

    // Receive and verify
    let event = rx.recv().await.unwrap();
    match event {
        Event::AgentStatusUpdate(id, status) => {
            assert_eq!(id, AgentId(1));
            assert_eq!(status, AgentStatus::Running);
        }
        _ => panic!("Wrong event type"),
    }
}
```

---

#### Manual Testing:

**Test Matrix**:

| Test | Linux | macOS | Windows |
|------|-------|-------|---------|
| Colors (16) | [ ] | [ ] | [ ] |
| Colors (256) | [ ] | [ ] | [ ] |
| Colors (True) | [ ] | [ ] | [ ] |
| Resize handling | [ ] | [ ] | [ ] |
| Mouse support | [ ] | [ ] | [ ] |
| Vim keys | [ ] | [ ] | [ ] |
| Alt/Ctrl keys | [ ] | [ ] | [ ] |
| Large dataset (100+ agents) | [ ] | [ ] | [ ] |
| Long-running (24h+) | [ ] | [ ] | [ ] |

---

### 7.7 Performance Optimization

#### Rendering Optimization:

```rust
struct App {
    needs_redraw: bool,
    last_render: Instant,
}

impl App {
    fn should_render(&self) -> bool {
        self.needs_redraw &&
        self.last_render.elapsed() >= Duration::from_millis(16) // 60 FPS max
    }

    fn mark_dirty(&mut self) {
        self.needs_redraw = true;
    }
}

// In main loop:
if app.should_render() {
    terminal.draw(|f| ui(f, &app))?;
    app.needs_redraw = false;
    app.last_render = Instant::now();
}
```

---

#### Data Structure Optimization:

```rust
// Use efficient data structures
use std::collections::{HashMap, VecDeque};

struct App {
    agents: HashMap<AgentId, Agent>,        // O(1) lookup by ID
    agent_order: Vec<AgentId>,              // Ordered list for display

    tasks: VecDeque<Task>,                  // Efficient push/pop
    task_index: HashMap<TaskId, usize>,     // O(1) lookup

    logs: VecDeque<LogEntry>,               // Ring buffer for logs
    log_max_size: usize,                    // Limit memory usage
}

impl App {
    fn add_log(&mut self, entry: LogEntry) {
        if self.logs.len() >= self.log_max_size {
            self.logs.pop_front();
        }
        self.logs.push_back(entry);
    }
}
```

---

#### Memory Management:

```rust
// Limit historical data
const MAX_METRICS_HISTORY: usize = 100;  // ~100 data points
const MAX_LOGS: usize = 1000;            // Last 1000 log entries

// Periodic cleanup
impl App {
    fn cleanup(&mut self) {
        // Remove completed tasks older than 1 hour
        let cutoff = Instant::now() - Duration::from_secs(3600);
        self.tasks.retain(|t| {
            t.status != TaskStatus::Completed || t.completed_at > cutoff
        });

        // Trim metric history
        while self.cpu_history.len() > MAX_METRICS_HISTORY {
            self.cpu_history.pop_front();
        }
    }
}
```

---

### 7.8 Accessibility Recommendations

#### Keyboard Accessibility:

- [x] All features accessible via keyboard
- [x] Logical tab order (left to right, top to bottom)
- [x] Clear focus indicators
- [ ] Skip links for long lists (e.g., 'gg' to top, 'G' to bottom)

---

#### Screen Reader Support:

- [ ] Provide HTML documentation (not just `--help`)
- [ ] Export functionality for logs and reports
- [ ] Document output structure in user guide
- [ ] Consider TTS-friendly error messages

---

#### Visual Accessibility:

- [x] High contrast theme option
- [x] Don't rely on color alone (use symbols)
- [x] Configurable color scheme
- [ ] Large text mode (wider panels, bigger fonts)
- [ ] Support for terminal font scaling

---

#### Color Blindness:

- [x] Test with Coblis color blindness simulator
- [x] Use distinct symbols for status (not just colors)
- [x] Provide alternative color schemes (e.g., blue/yellow instead of red/green)

---

### 7.9 Documentation Recommendations

#### User Documentation:

1. **Quick Start Guide**
   - Installation
   - First run
   - Basic navigation
   - Common tasks

2. **Keyboard Shortcuts Reference**
   - Organized by category
   - Searchable
   - Both HTML and in-app (`?` key)

3. **Configuration Guide**
   - Config file format
   - Theme customization
   - Keybinding customization
   - Layout presets

4. **Troubleshooting**
   - Common issues
   - Terminal compatibility
   - Performance tuning

---

#### Developer Documentation:

1. **Architecture Overview**
   - Component structure
   - Event flow
   - State management
   - Async patterns

2. **Contributing Guide**
   - Code style
   - Testing requirements
   - PR process
   - Component guidelines

3. **API Reference**
   - Component trait
   - Event types
   - Configuration structs

---

### 7.10 Next Steps

#### Immediate Actions:

1. **Setup Project Structure**
   ```
   flow-tui/
   ├── src/
   │   ├── main.rs
   │   ├── app.rs           # App state and event handling
   │   ├── ui/
   │   │   ├── mod.rs
   │   │   ├── dashboard.rs # Main dashboard layout
   │   │   ├── components/
   │   │   │   ├── agent_list.rs
   │   │   │   ├── task_queue.rs
   │   │   │   ├── log_viewer.rs
   │   │   │   └── metrics.rs
   │   ├── events.rs        # Event types and handlers
   │   └── orchestrator.rs  # Orchestrator integration
   ├── Cargo.toml
   └── README.md
   ```

2. **Setup Dependencies**
   ```toml
   [dependencies]
   ratatui = "0.28"
   crossterm = "0.28"
   tokio = { version = "1", features = ["full"] }
   serde = { version = "1", features = ["derive"] }
   toml = "0.8"
   ```

3. **Implement MVP Dashboard**
   - Basic layout with agent list, task queue, logs
   - Async event handling
   - Keyboard navigation (hjkl, Tab)
   - Status indicators

4. **Add Help System**
   - Footer with key hints
   - `?` key help overlay
   - Organized by context

5. **Implement Command Palette**
   - `:` key to open
   - Fuzzy search
   - Show shortcuts

---

## Sources

This research compiled information from the following sources:

### Application Analysis:
- [btop++ GitHub Repository](https://github.com/aristocratos/btop)
- [btop++ - Yahoo News](https://currently.att.yahoo.com/att/heres-why-btop-became-favorite-151514637.html)
- [btop: The Ultimate System Monitoring Tool - TecMint](https://www.tecmint.com/btop-system-monitoring-tool-for-linux/)
- [Supercharge Your Git Workflow with Lazygit](https://masri.blog/Blog/Coding/Git/Lazygit-A-TUI-Approach)
- [The (lazy) Git UI You Didn't Know You Need](https://www.bwplotka.dev/2025/lazygit/)
- [Lazygit Turns 5: Musings on Git, TUIs, and Open Source](https://jesseduffield.com/Lazygit-5-Years-On/)
- [k9s.io - Official Website](https://k9scli.io/)
- [K9s - Transforming Kubernetes Cluster Management](https://www.edstem.com/blog/k9s-kubernetes-cluster-management/)
- [k9s - Terminal Trove](https://terminaltrove.com/k9s/)
- [Helix Keymap Documentation](https://docs.helix-editor.com/keymap.html)
- [Helix Editor Official Site](https://helixeditor.com/)
- [GitHub - Canop/broot](https://github.com/Canop/broot)
- [Search and Navigate - Broot](https://dystroy.org/broot/navigation/)
- [GitHub - PThorpe92/CuTE](https://github.com/PThorpe92/CuTE)
- [Rust and TUI: Building a CLI - LogRocket](https://blog.logrocket.com/rust-and-tui-building-a-command-line-interface-in-rust/)

### Ratatui Resources:
- [Ratatui Official Website](https://ratatui.rs/)
- [Ratatui App Showcase](https://ratatui.rs/showcase/apps/)
- [Ratatui Layout Documentation](https://ratatui.rs/concepts/layout/)
- [GitHub - ratatui/ratatui](https://github.com/ratatui/ratatui)
- [GitHub - ratatui/async-template](https://github.com/ratatui/async-template)
- [GitHub - awesome-ratatui](https://github.com/ratatui/awesome-ratatui)
- [Ratatui Component Template](https://ratatui.rs/templates/component/)
- [Creating a TUI in Rust - Ray Suliteanu](https://raysuliteanu.medium.com/creating-a-tui-in-rust-e284d31983b3)

### Accessibility:
- [Accessibility of Command Line Interfaces - ACM](https://dl.acm.org/doi/fullHtml/10.1145/3411764.3445544)
- [WebAIM: Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
- [Designing the Terminal for Color Accessibility - Bloomberg](https://www.bloomberg.com/company/stories/designing-the-terminal-for-color-accessibility/)
- [Gogh - Terminal Color Schemes](https://gogh-co.github.io/Gogh/)
- [High-contrast terminal color schemes - Markus Weimar](https://www.markusweimar.de/en/color-schemes/)

### UI Patterns:
- [User Interface Anti-Patterns](https://ui-patterns.com/blog/User-Interface-AntiPatterns)
- [Anti-Patterns of User Experience Design - ICS](https://www.ics.com/blog/anti-patterns-user-experience-design)
- [Windows Terminal Panes Documentation](https://learn.microsoft.com/en-us/windows/terminal/panes)
- [How to use Panes in Windows Terminal - Scott Hanselman](https://www.hanselman.com/blog/how-to-use-open-resize-and-split-panes-in-the-windows-terminal)

### TUI Tools and Dashboards:
- [GitHub - awesome-tuis](https://github.com/rothgar/awesome-tuis)
- [TUI Terminal Tools - Terminal Trove](https://terminaltrove.com/categories/tui/)
- [WTF - the terminal dashboard](https://wtfutil.com/)

---

**End of Research Document**

*This document is intended to guide the design and implementation of the Flow Orchestrator TUI by providing comprehensive analysis of state-of-the-art terminal applications, design patterns, and best practices.*