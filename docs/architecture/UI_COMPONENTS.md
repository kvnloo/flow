# Flow Orchestrator TUI - UI Components Architecture

**Version:** 1.0.0
**Date:** 2025-11-25
**Status:** Design Specification

---

## Table of Contents

1. [Component Tree Diagram](#component-tree-diagram)
2. [Widget Specifications](#widget-specifications)
3. [Layout Patterns](#layout-patterns)
4. [Theme & Style Guide](#theme--style-guide)
5. [Animation Specifications](#animation-specifications)
6. [Keyboard Navigation Map](#keyboard-navigation-map)
7. [Accessibility Guidelines](#accessibility-guidelines)
8. [Rust Trait Definitions](#rust-trait-definitions)

---

## 1. Component Tree Diagram

### Hierarchical Structure

```
FlowTUI (App Root)
├── Header (session info, status)
│   ├── SessionInfo (session name, elapsed time)
│   ├── ModelInfo (current LLM model)
│   └── QuickMetrics (agents/tokens/cost)
│
├── TabBar (dashboard navigation)
│   ├── Tab: Flow View
│   ├── Tab: Agent Graph
│   ├── Tab: Agent Metrics
│   ├── Tab: Log Console
│   ├── Tab: Research
│   └── Tab: Metrics
│
├── DashboardContainer (swappable views)
│   ├── FlowDashboard ⭐
│   │   ├── RoadmapPanel (milestone quest log)
│   │   ├── ActiveStagePanel (current stage focus)
│   │   ├── AgentSquadTree (hierarchical team view)
│   │   ├── TeamFeedLog (stage-relevant events)
│   │   └── FlowProgressBar (XP/stage progress)
│   │
│   ├── AgentGraphDashboard
│   │   ├── AgentCanvas (Ratatui Canvas)
│   │   │   ├── AgentNode (breathing circles)
│   │   │   ├── ConnectionEdge (animated links)
│   │   │   └── ClusterGroup (collapsible clusters)
│   │   ├── AgentGrid (tabular list)
│   │   └── LiveEventFeed (activity stream)
│   │
│   ├── AgentMetricsDashboard
│   │   ├── MetricsTable (tokens/cost/heat)
│   │   ├── PerformanceGraph (latency/throughput)
│   │   └── HealthIndicators (status badges)
│   │
│   ├── LogConsoleDashboard
│   │   ├── LogViewer (scrollable, filterable)
│   │   ├── LogControls (search, filter, tail)
│   │   └── ContextPanel (selected log details)
│   │
│   ├── ResearchDashboard
│   │   ├── ResearchTree (hierarchical exploration)
│   │   ├── FindingsStream (live discoveries)
│   │   └── AgentResearchGrid (researcher status)
│   │
│   └── MetricsDashboard
│       ├── TokenCostTable (time series)
│       ├── PerformanceSparklines (mini charts)
│       ├── EventTimeline (chronological view)
│       └── RecommendationPanel (actionable insights)
│
├── StatusBar (bottom persistent HUD)
│   ├── ProgressGauges (tasks/tests/milestones)
│   ├── CostTracker (real-time cost display)
│   ├── FocusIndicator (current focus agent/panel)
│   └── ModeIndicator (Normal/Insert/Visual/Command)
│
└── CommandPalette (modal overlay)
    ├── FuzzySearchInput (command search)
    ├── CommandSuggestions (ranked results)
    ├── RecentCommands (history)
    └── ContextualHelp (inline descriptions)
```

---

## 2. Widget Specifications

### 2.1 Custom Widgets

#### AgentGraph (Canvas-based Network)

**Purpose:** Visualize multi-agent orchestration as a living, breathing network.

**Props:**
```rust
pub struct AgentGraphProps {
    pub agents: Vec<Agent>,
    pub connections: Vec<(AgentId, AgentId)>,
    pub viewport: Rect,
    pub animation_time: f64,
    pub focused_agent: Option<AgentId>,
    pub collapsed_clusters: HashSet<ClusterId>,
}
```

**State:**
```rust
pub struct AgentGraphState {
    pub layout: ForceDirectedLayout,
    pub animation_phase: f64,
    pub hovered_node: Option<AgentId>,
    pub zoom_level: f32,
    pub pan_offset: (f64, f64),
}
```

**Rendering:**
```rust
impl Widget for AgentGraph {
    fn render(self, area: Rect, buf: &mut Buffer) {
        Canvas::default()
            .marker(Marker::Braille)
            .x_bounds([0.0, 100.0])
            .y_bounds([0.0, 100.0])
            .paint(|ctx| {
                // 1. Draw connections (edges)
                for (src, dst) in self.props.connections {
                    let intensity = self.get_traffic_intensity(src, dst);
                    let color = self.heat_color(intensity);
                    ctx.draw(&Line { /* ... */ });
                }

                // 2. Layer separation
                ctx.layer();

                // 3. Draw agent nodes with breathing animation
                for agent in &self.props.agents {
                    let radius = self.calculate_breathing_radius(
                        agent,
                        self.props.animation_time
                    );

                    // Outer glow
                    for r in (radius as i32 + 1)..(radius as i32 + 4) {
                        let alpha = 1.0 - (r as f64 - radius) / 3.0;
                        ctx.draw(&Circle {
                            x: agent.x,
                            y: agent.y,
                            radius: r as f64,
                            color: agent.color.with_alpha(alpha),
                        });
                    }

                    // Core node
                    ctx.fill(&Circle {
                        x: agent.x,
                        y: agent.y,
                        radius,
                        color: agent.status_color(),
                    });
                }
            })
            .render(area, buf);
    }
}
```

**Animation Formula:**
```rust
fn calculate_breathing_radius(&self, agent: &Agent, time: f64) -> f64 {
    let base = 3.0;
    let amplitude = match agent.status {
        AgentStatus::Idle => 0.3,
        AgentStatus::Active => 0.8,
        AgentStatus::Blocked => 0.5,
        AgentStatus::Error => 1.2,
    };

    let frequency = match agent.status {
        AgentStatus::Idle => 0.5,      // 2s period
        AgentStatus::Active => 1.0,    // 1s period
        AgentStatus::Blocked => 0.75,  // 1.33s period
        AgentStatus::Error => 3.0,     // 0.33s period
    };

    let phase = agent.id.hash() as f64; // Unique phase offset
    let pulse = ((time + phase) * frequency * 2.0 * PI).sin();

    base + amplitude * (pulse + 1.0) / 2.0
}
```

---

#### AgentCard (Compact Info Display)

**Purpose:** Show agent summary with status, metrics, and quick actions.

**Props:**
```rust
pub struct AgentCardProps {
    pub agent: Agent,
    pub expanded: bool,
    pub show_metrics: bool,
    pub interactive: bool,
}
```

**Rendering:**
```
┌─ A05 Dev_backend ──────────────┐
│ ● ACTIVE  lvl 7  role: coder   │
│ ─────────────────────────────  │
│ Tokens:  21.6k    Cost: $0.36  │
│ Latency: 2.1s     Queue: 2     │
│ ─────────────────────────────  │
│ Task: Implement refresh tokens │
│ Progress: [████████░░] 80%     │
│ ─────────────────────────────  │
│ [F] Focus  [K] Kill  [L] Logs  │
└────────────────────────────────┘
```

**Implementation:**
```rust
impl Widget for AgentCard {
    fn render(self, area: Rect, buf: &mut Buffer) {
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .title(format!(" {} ", self.agent.name))
            .title_style(self.status_style());

        let inner = block.inner(area);
        block.render(area, buf);

        let layout = Layout::vertical([
            Constraint::Length(1), // Status line
            Constraint::Length(1), // Separator
            Constraint::Length(2), // Metrics
            Constraint::Length(1), // Separator
            Constraint::Min(2),    // Task info
            Constraint::Length(1), // Actions
        ]).split(inner);

        self.render_status_line(layout[0], buf);
        self.render_metrics(layout[2], buf);
        self.render_task_info(layout[4], buf);

        if self.props.interactive {
            self.render_actions(layout[5], buf);
        }
    }
}
```

---

#### LogViewer (Filtered Scrollable Logs)

**Purpose:** Display agent logs with filtering, search, and context drilling.

**Props:**
```rust
pub struct LogViewerProps {
    pub entries: Vec<LogEntry>,
    pub filter: LogFilter,
    pub follow_tail: bool,
    pub focused_agent: Option<AgentId>,
    pub search_query: Option<String>,
}
```

**State:**
```rust
pub struct LogViewerState {
    pub scroll_offset: usize,
    pub selected_index: Option<usize>,
    pub collapsed_groups: HashSet<usize>,
    pub highlight_pattern: Option<Regex>,
}
```

**Features:**
- Auto-scroll on new entries (if `follow_tail`)
- Syntax highlighting for structured logs
- Expandable nested events
- Timestamp anchoring
- Agent badge coloring

**Rendering:**
```
┌─ LOGS (filtered: stage M2.3) ───────────────────────────────┐
│ 01:23:01  [A02] Planned 3 sub-tasks for M2.3                │
│ 01:23:05  [A03] Found RFC 6749 section on refresh           │
│ 01:23:12  [A05] Implemented /auth/refresh                   │
│ 01:23:18 ▼[A07] Test suite run failed ────────────────┐     │
│           │   Error: refresh_token race condition     │     │
│           │   Stack: test_concurrent_refresh:42       │     │
│           └───────────────────────────────────────────┘     │
│ 01:23:22  [A05] Applied patch v3, rerunning tests           │
│                                                              │
│ [L] follow tail  [/] search  [F] filter  [ENTER] expand     │
└──────────────────────────────────────────────────────────────┘
```

---

#### ProgressGauge (XP-Style Progress Bar)

**Purpose:** Visualize progress with gamification aesthetics.

**Props:**
```rust
pub struct ProgressGaugeProps {
    pub current: u32,
    pub total: u32,
    pub label: String,
    pub color_scheme: ColorScheme,
    pub show_percentage: bool,
    pub show_label: bool,
    pub animate_fill: bool,
}
```

**Rendering:**
```rust
impl Widget for ProgressGauge {
    fn render(self, area: Rect, buf: &mut Buffer) {
        let percentage = (self.props.current as f64 / self.props.total as f64) * 100.0;

        let gauge = Gauge::default()
            .block(Block::default())
            .gauge_style(self.gauge_style())
            .percent(percentage as u16)
            .label(if self.props.show_percentage {
                format!("{}% ({}/{})", percentage as u16, self.props.current, self.props.total)
            } else {
                format!("{}/{}", self.props.current, self.props.total)
            });

        // Apply animation effect if enabled
        if self.props.animate_fill {
            // Use tachyonfx for smooth fill transition
            self.apply_fill_animation(gauge, area, buf);
        } else {
            gauge.render(area, buf);
        }
    }

    fn gauge_style(&self) -> Style {
        match self.props.color_scheme {
            ColorScheme::XP => Style::default()
                .fg(Color::Rgb(50, 255, 50)) // Bright green
                .bg(Color::Rgb(20, 20, 20)),  // Dark bg
            ColorScheme::Warning => Style::default()
                .fg(Color::Rgb(255, 200, 50))
                .bg(Color::Rgb(40, 30, 0)),
            ColorScheme::Danger => Style::default()
                .fg(Color::Rgb(255, 50, 50))
                .bg(Color::Rgb(40, 0, 0)),
        }
    }
}
```

---

#### Sparkline (Mini Metric Chart)

**Purpose:** Compact time-series visualization for metrics.

**Usage:**
```rust
Sparkline::default()
    .block(Block::bordered().title("CPU History"))
    .data(&[2, 5, 8, 12, 15, 18, 20, 15, 10, 8])
    .style(Style::default().fg(Color::Cyan))
    .render(area, buf);
```

**Integration:**
- Use for token usage over time
- Latency trends
- Cost accumulation
- Queue depth history

---

#### TreeView (Hierarchical Task View)

**Purpose:** Display nested task/agent hierarchies.

**Props:**
```rust
pub struct TreeViewProps {
    pub root: TreeNode,
    pub expanded_nodes: HashSet<NodeId>,
    pub focused_node: Option<NodeId>,
    pub show_icons: bool,
}
```

**Rendering:**
```
┌─ AGENT SQUAD ──────────────────────┐
│ A01 PM / Orchestrator              │
│  ├─ A02 Planner                    │
│  │    ├─ A03 Research_web          │
│  │    └─ A04 Research_api          │
│  ├─ A05 Dev_backend                │
│  │    └─ A07 Tester                │
│  └─ A06 Dev_frontend               │
│                                    │
│ [←→] collapse/expand  [↑↓] navigate│
└────────────────────────────────────┘
```

**Implementation:**
```rust
impl Widget for TreeView {
    fn render(self, area: Rect, buf: &mut Buffer) {
        let lines = self.flatten_tree(&self.props.root, 0);

        let items: Vec<ListItem> = lines.into_iter().map(|(depth, node)| {
            let indent = "  ".repeat(depth);
            let icon = self.node_icon(&node);
            let label = node.label();

            let style = if Some(node.id) == self.props.focused_node {
                Style::default().bg(Color::DarkGray).bold()
            } else {
                Style::default()
            };

            ListItem::new(format!("{}{} {}", indent, icon, label))
                .style(style)
        }).collect();

        List::new(items)
            .block(Block::bordered().title("Tree"))
            .highlight_style(Style::default().bg(Color::DarkGray))
            .render(area, buf);
    }

    fn node_icon(&self, node: &TreeNode) -> &str {
        if node.has_children() {
            if self.props.expanded_nodes.contains(&node.id) {
                "├─"
            } else {
                "└─"
            }
        } else {
            "  "
        }
    }
}
```

---

#### HeatBar (Activity Heat Indicator)

**Purpose:** Show agent activity intensity over time.

**Props:**
```rust
pub struct HeatBarProps {
    pub history: Vec<f64>, // 0.0 to 1.0 intensity values
    pub time_window: Duration,
    pub color_map: HeatColorMap,
}
```

**Rendering:**
```
Activity: [▁▁▂▄▆█▆▄▂▁▁] (last 10 min)
```

**Color Mapping:**
```rust
fn heat_color(&self, intensity: f64) -> Color {
    match intensity {
        x if x < 0.2 => Color::DarkGray,
        x if x < 0.4 => Color::Blue,
        x if x < 0.6 => Color::Cyan,
        x if x < 0.8 => Color::Yellow,
        _ => Color::Red,
    }
}
```

---

### 2.2 Composite Widgets

#### RoadmapPanel (Quest Log)

**Purpose:** Display milestone progress in game-style quest format.

**Structure:**
```rust
pub struct RoadmapPanel {
    milestones: Vec<Milestone>,
    expanded_milestone: Option<MilestoneId>,
    scroll_offset: usize,
}

impl Component for RoadmapPanel {
    fn render(&mut self, frame: &mut Frame, area: Rect) {
        let items: Vec<ListItem> = self.milestones.iter().map(|m| {
            let status_icon = match m.status {
                MilestoneStatus::Complete => "✓",
                MilestoneStatus::Active => "▶",
                MilestoneStatus::Focus => "⚑",
                MilestoneStatus::Pending => "…",
            };

            let text = format!("[{}] {} {}", m.id, m.name, status_icon);

            let style = match m.status {
                MilestoneStatus::Complete => Style::default().fg(Color::Green),
                MilestoneStatus::Active => Style::default().fg(Color::Cyan).bold(),
                MilestoneStatus::Focus => Style::default().fg(Color::Yellow).bold(),
                MilestoneStatus::Pending => Style::default().fg(Color::DarkGray),
            };

            ListItem::new(text).style(style)
        }).collect();

        List::new(items)
            .block(Block::bordered().title("Roadmap / Questline"))
            .render(area, frame.buffer_mut());
    }
}
```

---

## 3. Layout Patterns

### 3.1 Responsive Layout System

**Core Layout Manager:**
```rust
pub struct LayoutManager {
    pub mode: LayoutMode,
    pub phase: WorkflowPhase,
    pub constraints: LayoutConstraints,
}

pub enum LayoutMode {
    Flow,         // Optimized for active development
    Overview,     // Global situational awareness
    Focus,        // Single agent deep dive
    Research,     // Research tree exploration
    Metrics,      // Performance/cost analysis
}

impl LayoutManager {
    pub fn compute(&self, area: Rect) -> LayoutAreas {
        match self.mode {
            LayoutMode::Flow => self.flow_layout(area),
            LayoutMode::Overview => self.overview_layout(area),
            LayoutMode::Focus => self.focus_layout(area),
            LayoutMode::Research => self.research_layout(area),
            LayoutMode::Metrics => self.metrics_layout(area),
        }
    }

    fn flow_layout(&self, area: Rect) -> LayoutAreas {
        // Vertical split: Header | Main | Status
        let main_layout = Layout::vertical([
            Constraint::Length(2),  // Header
            Constraint::Min(0),     // Main content
            Constraint::Length(4),  // Status bar
        ])
        .split(area);

        // Main content split: Roadmap+Stage | Squad+Feed | Log+XP
        let content_rows = Layout::vertical([
            Constraint::Percentage(30),  // Roadmap + Active Stage
            Constraint::Percentage(50),  // Agent Squad + Team Feed
            Constraint::Percentage(20),  // Log + Flow/XP Bar
        ])
        .split(main_layout[1]);

        // Row 1: Roadmap (left) | Active Stage (right)
        let row1_cols = Layout::horizontal([
            Constraint::Percentage(45),  // Roadmap
            Constraint::Percentage(55),  // Active Stage
        ])
        .split(content_rows[0]);

        // Row 2: Squad (left) | Team Feed (right)
        let row2_cols = Layout::horizontal([
            Constraint::Percentage(55),  // Squad tree
            Constraint::Percentage(45),  // Team feed
        ])
        .split(content_rows[1]);

        LayoutAreas {
            header: main_layout[0],
            roadmap: row1_cols[0],
            active_stage: row1_cols[1],
            agent_squad: row2_cols[0],
            team_feed: row2_cols[1],
            log: content_rows[2],
            status: main_layout[2],
        }
    }
}
```

---

### 3.2 Panel Focus Management

**Focus Navigation:**
```rust
pub struct FocusManager {
    panels: Vec<PanelId>,
    focused_index: usize,
    focus_history: Vec<PanelId>,
}

impl FocusManager {
    pub fn focus_next(&mut self) {
        self.focused_index = (self.focused_index + 1) % self.panels.len();
        self.record_focus();
    }

    pub fn focus_prev(&mut self) {
        self.focused_index = if self.focused_index == 0 {
            self.panels.len() - 1
        } else {
            self.focused_index - 1
        };
        self.record_focus();
    }

    pub fn focus_direction(&mut self, dir: Direction) {
        match dir {
            Direction::Up => self.focus_up(),
            Direction::Down => self.focus_down(),
            Direction::Left => self.focus_left(),
            Direction::Right => self.focus_right(),
        }
    }

    pub fn render_focus_indicator(&self, frame: &mut Frame, area: Rect) {
        let border_style = if self.is_focused(area) {
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default()
                .fg(Color::DarkGray)
        };

        // Render focus border
        Block::default()
            .borders(Borders::ALL)
            .border_style(border_style)
            .render(area, frame.buffer_mut());
    }
}
```

---

### 3.3 Mode-Specific Layouts

**Flow Layout (Default):**
```
┌─────────────────────────────────────┐
│          Header (2 rows)            │
├───────────┬─────────────────────────┤
│ Roadmap   │   Active Stage          │
│ (30%)     │   (70%)                 │
├───────────┴─────────────┬───────────┤
│ Agent Squad Tree         │ Team Feed │
│ (55%)                    │ (45%)     │
├──────────────────────────┴───────────┤
│ Log + Flow/XP Bar                    │
├──────────────────────────────────────┤
│          Status Bar (4 rows)         │
└──────────────────────────────────────┘
```

**Overview Layout:**
```
┌─────────────────────────────────────┐
│          Header                      │
├─────────────────┬───────────────────┤
│  Agent Grid     │  Swarm Graph      │
│  (40%)          │  (60%)            │
├─────────────────┴───────────────────┤
│  Live Event Feed                     │
│  (40%)                               │
├──────────────────────────────────────┤
│  Status + Command Bar                │
└──────────────────────────────────────┘
```

**Focus Layout (Agent Detail):**
```
┌─────────────────────────────────────┐
│          Agent Header                │
├─────────────────┬───────────────────┤
│  Code View      │  Local Graph      │
│  (60%)          │  + Context        │
│                 │  (40%)            │
├─────────────────┴───────────────────┤
│  Thoughts + Related Tasks            │
│  (30%)                               │
├──────────────────────────────────────┤
│  Controls + Status                   │
└──────────────────────────────────────┘
```

---

## 4. Theme & Style Guide

### 4.1 Color Palette

**Base Colors:**
```rust
pub struct FlowTheme {
    // Background
    pub bg_primary: Color,      // Main background
    pub bg_secondary: Color,    // Panel backgrounds
    pub bg_highlight: Color,    // Highlighted items

    // Foreground
    pub fg_primary: Color,      // Main text
    pub fg_secondary: Color,    // Muted text
    pub fg_emphasis: Color,     // Important text

    // Status Colors
    pub success: Color,         // Green
    pub warning: Color,         // Yellow
    pub error: Color,           // Red
    pub info: Color,            // Blue

    // Agent Status
    pub agent_idle: Color,      // Gray
    pub agent_active: Color,    // Green
    pub agent_blocked: Color,   // Yellow
    pub agent_error: Color,     // Red

    // Accent Colors
    pub accent_primary: Color,  // Cyan
    pub accent_secondary: Color,// Magenta
}

impl Default for FlowTheme {
    fn default() -> Self {
        Self {
            bg_primary: Color::Rgb(20, 20, 20),
            bg_secondary: Color::Rgb(30, 30, 30),
            bg_highlight: Color::Rgb(50, 50, 60),

            fg_primary: Color::Rgb(220, 220, 220),
            fg_secondary: Color::Rgb(150, 150, 150),
            fg_emphasis: Color::Rgb(255, 255, 255),

            success: Color::Rgb(80, 250, 123),
            warning: Color::Rgb(255, 184, 108),
            error: Color::Rgb(255, 85, 85),
            info: Color::Rgb(139, 233, 253),

            agent_idle: Color::Rgb(100, 100, 100),
            agent_active: Color::Rgb(80, 250, 123),
            agent_blocked: Color::Rgb(255, 184, 108),
            agent_error: Color::Rgb(255, 85, 85),

            accent_primary: Color::Rgb(139, 233, 253),
            accent_secondary: Color::Rgb(255, 121, 198),
        }
    }
}
```

---

### 4.2 Typography Hierarchy

**Style Definitions:**
```rust
pub struct StyleGuide {
    pub heading_1: Style,  // Dashboard titles
    pub heading_2: Style,  // Section headers
    pub heading_3: Style,  // Subsection headers
    pub body: Style,       // Normal text
    pub code: Style,       // Code/monospace
    pub muted: Style,      // Secondary info
    pub emphasis: Style,   // Important text
}

impl StyleGuide {
    pub fn new(theme: &FlowTheme) -> Self {
        Self {
            heading_1: Style::default()
                .fg(theme.fg_emphasis)
                .add_modifier(Modifier::BOLD),

            heading_2: Style::default()
                .fg(theme.fg_primary)
                .add_modifier(Modifier::BOLD),

            heading_3: Style::default()
                .fg(theme.fg_primary)
                .add_modifier(Modifier::UNDERLINED),

            body: Style::default()
                .fg(theme.fg_primary),

            code: Style::default()
                .fg(theme.accent_primary)
                .bg(theme.bg_secondary),

            muted: Style::default()
                .fg(theme.fg_secondary),

            emphasis: Style::default()
                .fg(theme.fg_emphasis)
                .add_modifier(Modifier::BOLD),
        }
    }
}
```

---

### 4.3 Border Styles

**Border Variations:**
```rust
pub enum BorderStyle {
    Solid,      // ─│┌┐└┘
    Rounded,    // ─│╭╮╰╯
    Double,     // ═║╔╗╚╝
    Thick,      // ━┃┏┓┗┛
    Dotted,     // ┄┆┌┐└┘
}

impl BorderStyle {
    pub fn to_border_type(&self) -> BorderType {
        match self {
            Self::Solid => BorderType::Plain,
            Self::Rounded => BorderType::Rounded,
            Self::Double => BorderType::Double,
            Self::Thick => BorderType::Thick,
            Self::Dotted => BorderType::Plain, // Custom rendering
        }
    }
}

// Usage
Block::default()
    .borders(Borders::ALL)
    .border_type(BorderStyle::Rounded.to_border_type())
    .border_style(Style::default().fg(theme.accent_primary))
```

---

### 4.4 Accessibility Guidelines

**Contrast Requirements:**
- **Minimum Contrast:** 4.5:1 for normal text
- **Enhanced Contrast:** 7:1 for small text
- **Focus Indicators:** Must be clearly visible (3:1 contrast)

**Color Independence:**
- Never rely solely on color to convey information
- Use icons, shapes, or text labels alongside colors
- Support monochrome terminals with shape/text fallbacks

**Screen Reader Support:**
- Provide text descriptions for visual elements
- Use semantic structure (headers, lists, tables)
- Announce state changes clearly

**Keyboard Navigation:**
- All actions accessible via keyboard
- Clear focus indicators
- Logical tab order
- Shortcuts displayed in help

---

## 5. Animation Specifications

### 5.1 Breathing Animation (Agent Nodes)

**Implementation:**
```rust
use tachyonfx::fx;
use std::f32::consts::PI;

fn breathing_effect(status: AgentStatus) -> Effect {
    let (amplitude, frequency) = match status {
        AgentStatus::Idle => (0.3, 0.5),      // Gentle
        AgentStatus::Active => (0.8, 1.0),    // Moderate
        AgentStatus::Blocked => (0.5, 0.75),  // Irregular
        AgentStatus::Error => (1.2, 3.0),     // Rapid
    };

    fx::effect_fn(Duration::from_secs(60), move |ctx, cells| {
        let breath = ((ctx.progress * frequency * 2.0 * PI).sin() + 1.0) / 2.0;
        let scale = 1.0 + amplitude * breath;

        for cell in cells {
            // Modulate brightness based on breath
            if let Color::Rgb(r, g, b) = cell.fg {
                cell.fg = Color::Rgb(
                    (r as f32 * scale) as u8,
                    (g as f32 * scale) as u8,
                    (b as f32 * scale) as u8,
                );
            }
        }
    })
    .repeat() // Loop infinitely
}
```

---

### 5.2 Layout Transitions

**Smooth Panel Reflow:**
```rust
fn transition_layout(
    from: LayoutAreas,
    to: LayoutAreas,
    duration: Duration,
) -> Effect {
    fx::effect_fn(duration, move |ctx, _cells| {
        let t = ease_out_cubic(ctx.progress);

        // Interpolate panel positions
        for panel in panels {
            let current_rect = from.get_rect(panel);
            let target_rect = to.get_rect(panel);

            let interpolated = Rect {
                x: lerp(current_rect.x, target_rect.x, t),
                y: lerp(current_rect.y, target_rect.y, t),
                width: lerp(current_rect.width, target_rect.width, t),
                height: lerp(current_rect.height, target_rect.height, t),
            };

            // Render panel at interpolated position
            panel.render_at(interpolated);
        }
    })
}

fn ease_out_cubic(t: f64) -> f64 {
    1.0 - (1.0 - t).powi(3)
}
```

---

### 5.3 Task Completion Celebration

**Particle Effect:**
```rust
fn celebrate_task_complete(area: Rect) -> Effect {
    fx::sequence(vec![
        // 1. Sparkle particles
        fx::effect_fn(Duration::from_millis(300), move |ctx, cells| {
            let num_particles = 20;
            for i in 0..num_particles {
                let x = area.x + (area.width as f64 * random()) as u16;
                let y = area.y + (area.height as f64 * random()) as u16;

                let cell = cells.get_mut(x, y);
                cell.set_char('✨');
                cell.fg = Color::Yellow;
            }
        }),

        // 2. Float-up "+XP" text
        fx::slide_in(Direction::BottomToTop, Duration::from_millis(500)),
        fx::fade_out(Duration::from_millis(500)),
    ])
}
```

---

### 5.4 Progress Bar Fill Animation

**Smooth Increment:**
```rust
fn animate_progress_fill(
    from_percent: u16,
    to_percent: u16,
    duration: Duration,
) -> Effect {
    fx::effect_fn(duration, move |ctx, cells| {
        let t = ease_out_quad(ctx.progress);
        let current = from_percent as f64 + (to_percent - from_percent) as f64 * t;

        // Update gauge fill
        let fill_width = (area.width as f64 * current / 100.0) as u16;

        for x in 0..fill_width {
            let cell = cells.get_mut(area.x + x, area.y);
            cell.set_char('█');
            cell.fg = Color::Green;
        }
    })
}
```

---

### 5.5 Message Flow Particles

**Animated Link Traffic:**
```rust
struct MessageParticle {
    position: f64,      // 0.0 to 1.0 along edge
    speed: f64,         // units per second
    color: Color,
    priority: Priority,
}

fn animate_message_flow(
    from: (f64, f64),
    to: (f64, f64),
    particle: MessageParticle,
) -> Effect {
    fx::effect_fn(Duration::from_millis(1000), move |ctx, cells| {
        // Calculate current position along path
        let t = particle.position + ctx.progress * particle.speed;

        if t <= 1.0 {
            let x = from.0 + (to.0 - from.0) * t;
            let y = from.1 + (to.1 - from.1) * t;

            // Draw particle
            let cell = cells.get_mut(x as u16, y as u16);
            cell.set_char(particle.icon());
            cell.fg = particle.color;
        }
    })
}
```

---

## 6. Keyboard Navigation Map

### 6.1 Mode-Based Bindings

**Normal Mode:**
```yaml
navigation:
  h: focus_left_panel
  j: scroll_down / focus_down_panel
  k: scroll_up / focus_up_panel
  l: focus_right_panel

  g g: jump_to_top
  G: jump_to_bottom

  1-9: jump_to_tab
  tab: cycle_focus_forward
  shift+tab: cycle_focus_backward

view_switching:
  f: flow_view
  o: overview_view
  a: agent_focus_view
  r: research_view
  m: metrics_view

actions:
  ENTER: drill_down / expand
  ESC: zoom_out / collapse
  /: search
  ?: context_menu
  ":": command_palette

agents:
  s: spawn_agent
  k: kill_agent
  p: pause_agent
  n: nudge_agent

mode_switching:
  i: insert_mode
  v: visual_mode
  ":": command_mode
```

**Insert Mode:**
```yaml
editing:
  ESC: return_to_normal
  TAB: auto_complete
  ENTER: submit_command

  Ctrl+W: delete_word
  Ctrl+U: clear_line
```

**Visual Mode:**
```yaml
selection:
  h j k l: extend_selection
  y: yank_selection
  d: delete_selection
  c: copy_to_clipboard
  ESC: return_to_normal
```

**Command Mode:**
```yaml
history:
  up_arrow: previous_command
  down_arrow: next_command

completion:
  TAB: complete_command

execution:
  ENTER: execute_command
  ESC: cancel
```

---

### 6.2 Context-Specific Shortcuts

**Agent Graph View:**
```yaml
navigation:
  +/-: zoom_in / zoom_out
  arrow_keys: pan_viewport
  SPACE: center_on_focused_agent

  c: collapse_cluster
  e: expand_cluster

selection:
  click / ENTER: select_agent
  1-9: select_agent_by_id
```

**Log Viewer:**
```yaml
filtering:
  f a: filter_by_agent
  f l: filter_by_level
  f t: filter_by_time_range

  /: search_pattern
  n: next_match
  N: previous_match

navigation:
  [: jump_to_previous_error
  ]: jump_to_next_error

actions:
  ENTER: expand_log_entry
  c: copy_log_line
  e: explain_log_entry
```

---

### 6.3 Global Shortcuts

**Always Available:**
```yaml
help:
  F1 / ?: show_help_overlay

quit:
  q: quit_current_view
  Ctrl+C: quit_application

clipboard:
  Ctrl+Shift+C: copy_selection
  Ctrl+Shift+V: paste_from_clipboard

panels:
  Ctrl+1-9: jump_to_panel_by_number
  Alt+H J K L: move_focus_by_direction
```

---

## 7. Rust Trait Definitions

### 7.1 Component Trait

**Base Interface:**
```rust
pub trait Component {
    type Message;
    type Props;
    type State;

    /// Initialize component state
    fn init(props: Self::Props) -> Self;

    /// Update component in response to message
    fn update(&mut self, msg: Self::Message) -> Result<()>;

    /// Render component to frame
    fn render(&mut self, frame: &mut Frame, area: Rect);

    /// Handle keyboard events
    fn handle_key(&mut self, key: KeyEvent) -> Option<Self::Message>;

    /// Handle mouse events (optional)
    fn handle_mouse(&mut self, event: MouseEvent) -> Option<Self::Message> {
        None
    }

    /// Lifecycle: called when component receives focus
    fn on_focus(&mut self) {}

    /// Lifecycle: called when component loses focus
    fn on_blur(&mut self) {}

    /// Lifecycle: called before component is destroyed
    fn on_destroy(&mut self) {}
}
```

---

### 7.2 Dashboard Trait

**Swappable Views:**
```rust
pub trait Dashboard: Component {
    /// Dashboard identifier
    fn id(&self) -> DashboardId;

    /// Dashboard display name
    fn name(&self) -> &str;

    /// Hotkey to switch to this dashboard
    fn hotkey(&self) -> Option<char>;

    /// Initialize dashboard with context
    fn initialize(&mut self, ctx: &AppContext) -> Result<()>;

    /// Called when dashboard becomes active
    fn activate(&mut self, ctx: &AppContext);

    /// Called when dashboard becomes inactive
    fn deactivate(&mut self);

    /// Update dashboard with new data
    fn refresh(&mut self, data: DashboardData) -> Result<()>;
}
```

---

### 7.3 Widget Trait Extensions

**Animated Widget:**
```rust
pub trait AnimatedWidget: Widget {
    /// Update animation state
    fn update_animation(&mut self, delta: Duration);

    /// Check if animation is active
    fn is_animating(&self) -> bool;

    /// Get current animation progress (0.0 to 1.0)
    fn animation_progress(&self) -> f64;

    /// Reset animation to start
    fn reset_animation(&mut self);
}
```

**Interactive Widget:**
```rust
pub trait InteractiveWidget: Widget {
    /// Handle keyboard input
    fn on_key(&mut self, key: KeyEvent) -> EventResult;

    /// Handle mouse input
    fn on_mouse(&mut self, event: MouseEvent) -> EventResult;

    /// Check if widget has focus
    fn is_focused(&self) -> bool;

    /// Set focus state
    fn set_focus(&mut self, focused: bool);

    /// Get interactive bounds
    fn interactive_area(&self) -> Rect;
}

pub enum EventResult {
    Handled,
    NotHandled,
    Propagate(Message),
}
```

---

### 7.4 Layout Manager Trait

**Responsive Layouts:**
```rust
pub trait LayoutStrategy {
    /// Compute layout areas for given screen size
    fn compute(&self, area: Rect) -> LayoutAreas;

    /// Get minimum required size
    fn min_size(&self) -> (u16, u16);

    /// Check if layout is valid for area
    fn is_valid_for(&self, area: Rect) -> bool {
        area.width >= self.min_size().0 && area.height >= self.min_size().1
    }

    /// Transition to another layout
    fn transition_to(&self, other: &dyn LayoutStrategy) -> Effect;
}
```

---

### 7.5 Theme Trait

**Customizable Styling:**
```rust
pub trait Theme: Send + Sync {
    /// Get style for element type
    fn style(&self, element: ElementType) -> Style;

    /// Get color by semantic name
    fn color(&self, name: ColorName) -> Color;

    /// Get border style
    fn border_style(&self, level: BorderLevel) -> BorderType;

    /// Serialize theme to TOML
    fn to_toml(&self) -> Result<String>;

    /// Deserialize theme from TOML
    fn from_toml(toml: &str) -> Result<Self> where Self: Sized;
}

pub enum ElementType {
    Header,
    Body,
    Code,
    Emphasis,
    Muted,
    Link,
}

pub enum ColorName {
    Primary,
    Secondary,
    Success,
    Warning,
    Error,
    Info,
}

pub enum BorderLevel {
    Subtle,
    Normal,
    Emphasized,
}
```

---

## 8. Example: Complete Widget Implementation

### AgentCard Widget

```rust
use ratatui::{
    buffer::Buffer,
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    widgets::{Block, Borders, Gauge, Paragraph, Widget},
    text::{Line, Span},
};

pub struct AgentCard {
    pub agent: Agent,
    pub expanded: bool,
    pub show_metrics: bool,
}

pub struct Agent {
    pub id: AgentId,
    pub name: String,
    pub status: AgentStatus,
    pub role: String,
    pub level: u8,
    pub tokens: u32,
    pub cost: f32,
    pub latency: f32,
    pub queue_len: usize,
    pub current_task: Option<String>,
    pub progress: u8,
}

pub enum AgentStatus {
    Idle,
    Active,
    Blocked,
    Error,
}

impl AgentStatus {
    fn icon(&self) -> &str {
        match self {
            Self::Idle => "○",
            Self::Active => "●",
            Self::Blocked => "◐",
            Self::Error => "◉",
        }
    }

    fn color(&self) -> Color {
        match self {
            Self::Idle => Color::DarkGray,
            Self::Active => Color::Green,
            Self::Blocked => Color::Yellow,
            Self::Error => Color::Red,
        }
    }
}

impl Widget for AgentCard {
    fn render(self, area: Rect, buf: &mut Buffer) {
        // Border block
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .title(format!(" {} ", self.agent.name))
            .title_style(Style::default().fg(Color::Cyan).bold());

        let inner = block.inner(area);
        block.render(area, buf);

        // Layout sections
        let sections = if self.expanded {
            Layout::vertical([
                Constraint::Length(1),  // Status line
                Constraint::Length(1),  // Separator
                Constraint::Length(2),  // Metrics
                Constraint::Length(1),  // Separator
                Constraint::Min(2),     // Task info + progress
                Constraint::Length(1),  // Separator
                Constraint::Length(1),  // Actions
            ])
            .split(inner)
        } else {
            Layout::vertical([
                Constraint::Length(1),  // Status line
                Constraint::Length(2),  // Compact metrics
            ])
            .split(inner)
        };

        // Render status line
        let status_line = Line::from(vec![
            Span::styled(
                self.agent.status.icon(),
                Style::default().fg(self.agent.status.color()),
            ),
            Span::raw(" "),
            Span::styled(
                format!("{:?}", self.agent.status).to_uppercase(),
                Style::default().fg(self.agent.status.color()).bold(),
            ),
            Span::raw(format!("  lvl {}  role: {}", self.agent.level, self.agent.role)),
        ]);

        Paragraph::new(status_line).render(sections[0], buf);

        if self.expanded {
            // Metrics section
            let metrics = vec![
                Line::from(format!(
                    "Tokens: {:>6}    Cost: ${:.2}",
                    format_number(self.agent.tokens),
                    self.agent.cost
                )),
                Line::from(format!(
                    "Latency: {:>4.1}s    Queue: {}",
                    self.agent.latency,
                    self.agent.queue_len
                )),
            ];

            Paragraph::new(metrics).render(sections[2], buf);

            // Task info
            if let Some(ref task) = self.agent.current_task {
                let task_text = vec![
                    Line::from(format!("Task: {}", task)),
                ];
                Paragraph::new(task_text).render(sections[4], buf);

                // Progress gauge
                let gauge_area = Rect {
                    y: sections[4].y + 1,
                    height: 1,
                    ..sections[4]
                };

                Gauge::default()
                    .gauge_style(Style::default().fg(Color::Green))
                    .percent(self.agent.progress as u16)
                    .render(gauge_area, buf);
            }

            // Actions
            let actions = Line::from(vec![
                Span::raw("["),
                Span::styled("F", Style::default().fg(Color::Yellow)),
                Span::raw("] Focus  ["),
                Span::styled("K", Style::default().fg(Color::Yellow)),
                Span::raw("] Kill  ["),
                Span::styled("L", Style::default().fg(Color::Yellow)),
                Span::raw("] Logs"),
            ]);

            Paragraph::new(actions).render(sections[6], buf);
        } else {
            // Compact metrics
            let compact = vec![
                Line::from(format!(
                    "📊 {}  💰 ${:.2}  ⏱️ {:.1}s",
                    format_number(self.agent.tokens),
                    self.agent.cost,
                    self.agent.latency
                )),
            ];

            Paragraph::new(compact).render(sections[1], buf);
        }
    }
}

fn format_number(n: u32) -> String {
    if n >= 1000 {
        format!("{:.1}k", n as f32 / 1000.0)
    } else {
        n.to_string()
    }
}
```

---

## Conclusion

This UI components architecture provides:

1. **Modular Design:** Reusable widgets with clear interfaces
2. **Responsive Layouts:** Adaptive to terminal size and workflow phase
3. **Rich Interactions:** Keyboard-driven with modal editing patterns
4. **Visual Polish:** Animations, themes, and accessibility support
5. **Performance:** Efficient rendering with Ratatui's differential updates
6. **Extensibility:** Trait-based system for custom components

**Next Steps:**
1. Implement core widget library
2. Build layout manager with mode support
3. Integrate tachyonfx animations
4. Create theme system with TOML config
5. Add comprehensive keyboard navigation
6. Test accessibility compliance

**References:**
- Ratatui: https://ratatui.rs/
- Tachyonfx: https://github.com/junkdog/tachyonfx
- Research docs: `claudedocs/research/`
