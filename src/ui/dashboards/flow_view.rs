/// Flow View Dashboard - Gamified Development HUD
///
/// Purpose: Default view optimized for active development flow
/// Features: Roadmap/questline, active stage, agent squad, feed, XP bar

use super::{Dashboard, DashboardId, DashboardData};
use crate::ui::theme::{FlowTheme, StyleGuide};
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, Gauge, List, ListItem, Paragraph, Widget},
};
use crossterm::event::{KeyCode, KeyEvent};

/// Flow View Dashboard - Game-like HUD for product development
pub struct FlowViewDashboard {
    data: Option<DashboardData>,
    theme: FlowTheme,
    style_guide: StyleGuide,
    selected_milestone: Option<usize>,
    focused_panel: FocusPanel,
    scroll_offset: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FocusPanel {
    Roadmap,
    ActiveStage,
    AgentSquad,
    TeamFeed,
    Log,
}

impl FlowViewDashboard {
    pub fn new() -> Self {
        let theme = FlowTheme::default();
        let style_guide = StyleGuide::new(&theme);
        Self {
            data: None,
            theme: theme.clone(),
            style_guide,
            selected_milestone: Some(0),
            focused_panel: FocusPanel::Roadmap,
            scroll_offset: 0,
        }
    }

    pub fn with_theme(theme: FlowTheme) -> Self {
        let style_guide = StyleGuide::new(&theme);
        Self {
            data: None,
            theme: theme.clone(),
            style_guide,
            selected_milestone: Some(0),
            focused_panel: FocusPanel::Roadmap,
            scroll_offset: 0,
        }
    }

    fn render_header(&self, frame: &mut Frame, area: Rect) {
        let header_text = vec![
            Line::from(vec![
                Span::styled("FLOW VIEW", Style::default().fg(self.theme.accent_primary).add_modifier(Modifier::BOLD)),
                Span::raw(" – PRODUCT RUN: "),
                Span::styled("api_todo_v1", Style::default().fg(self.theme.success)),
                Span::raw("               "),
                Span::styled("[lvl 7]", Style::default().fg(self.theme.warning)),
                Span::raw(" "),
                Span::styled("[flow: 82%]", Style::default().fg(self.theme.success)),
            ]),
            Line::from(vec![
                Span::raw("Current milestone: "),
                Span::styled("\"Auth + User Profiles\"", Style::default().fg(self.theme.accent_primary)),
                Span::raw("      ETA: 03h12m   Risk: "),
                Span::styled("MEDIUM", Style::default().fg(self.theme.warning)),
            ]),
        ];

        Paragraph::new(header_text)
            .block(Block::default().borders(Borders::BOTTOM))
            .render(area, frame.buffer_mut());
    }

    fn render_roadmap(&self, frame: &mut Frame, area: Rect) {
        let milestones = vec![
            ("[M1] Bootstrap skeleton", MilestoneStatus::Complete),
            ("[M2] Auth + profiles", MilestoneStatus::Active),
            ("     ├─ M2.1 Login + signup", MilestoneStatus::Complete),
            ("     ├─ M2.2 Session cookies", MilestoneStatus::Complete),
            ("     └─ M2.3 Refresh flow", MilestoneStatus::Focus),
            ("[M3] Sharing + lists", MilestoneStatus::Pending),
            ("[M4] Polishing & docs", MilestoneStatus::Pending),
        ];

        let items: Vec<ListItem> = milestones.iter().enumerate().map(|(i, (text, status))| {
            let color = match status {
                MilestoneStatus::Complete => self.theme.success,
                MilestoneStatus::Active => self.theme.accent_primary,
                MilestoneStatus::Focus => self.theme.warning,
                MilestoneStatus::Pending => self.theme.fg_secondary,
            };

            let (icon, _) = match status {
                MilestoneStatus::Complete => ("✓", ()),
                MilestoneStatus::Active => ("▶", ()),
                MilestoneStatus::Focus => ("⚑", ()),
                MilestoneStatus::Pending => ("…", ()),
            };

            let style = if Some(i) == self.selected_milestone {
                Style::default().bg(self.theme.bg_highlight).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(color)
            };

            ListItem::new(format!("{} {}", text, icon)).style(style)
        }).collect();

        let border_style = if self.focused_panel == FocusPanel::Roadmap {
            Style::default().fg(self.theme.accent_primary).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(self.theme.fg_secondary)
        };

        let list = List::new(items)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(border_style)
                .title(" ROADMAP / QUESTLINE "));

        let footer = Paragraph::new(vec![
            Line::from(""),
            Line::from(vec![
                Span::raw("Combo: "),
                Span::styled("4 tasks cleared in a row", Style::default().fg(self.theme.success)),
            ]),
            Line::from(vec![
                Span::raw("Streak: "),
                Span::styled("2 days without broken main", Style::default().fg(self.theme.warning)),
            ]),
        ]);

        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Min(7),
                Constraint::Length(3),
            ])
            .split(area);

        frame.render_widget(list, chunks[0]);
        frame.render_widget(footer, chunks[1]);
    }

    fn render_active_stage(&self, frame: &mut Frame, area: Rect) {
        let border_style = if self.focused_panel == FocusPanel::ActiveStage {
            Style::default().fg(self.theme.accent_primary).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(self.theme.fg_secondary)
        };

        let content = vec![
            Line::from(vec![
                Span::styled("Stage: M2.3  ", Style::default().add_modifier(Modifier::BOLD)),
                Span::styled("\"Secure refresh\"", Style::default().fg(self.theme.accent_primary)),
            ]),
            Line::from("Outcome goal:"),
            Line::from("  • Rotating refresh tokens"),
            Line::from("  • Device bound revocation"),
            Line::from("  • Tests passing for 4 paths"),
            Line::from(""),
            Line::from("Progress this stage:"),
        ];

        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(border_style)
            .title(" ACTIVE STAGE ");

        let inner = block.inner(area);
        block.render(area, frame.buffer_mut());

        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(7),
                Constraint::Length(2),
                Constraint::Min(0),
            ])
            .split(inner);

        Paragraph::new(content).render(chunks[0], frame.buffer_mut());

        // Progress gauge
        Gauge::default()
            .block(Block::default())
            .gauge_style(Style::default().fg(self.theme.success))
            .percent(68)
            .label("68%")
            .render(chunks[1], frame.buffer_mut());

        // Blockers
        let blockers = vec![
            Line::from(""),
            Line::from("Top blockers:"),
            Line::from("  1) Rate limits on /refresh"),
            Line::from("  2) Flaky end-to-end test e2e_07"),
        ];
        Paragraph::new(blockers).render(chunks[2], frame.buffer_mut());
    }

    fn render_agent_squad(&self, frame: &mut Frame, area: Rect) {
        let border_style = if self.focused_panel == FocusPanel::AgentSquad {
            Style::default().fg(self.theme.accent_primary).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(self.theme.fg_secondary)
        };

        let squad_tree = vec![
            "Squad lead: A01 PM  [morale: ▓▓▓▓▓▓▓▓░░]",
            "",
            "A01 PM / Orchestrator   lvl 6  role: squad_lead",
            " ├─ A02 Planner          lvl 5  role: planner",
            " │    ├─ A03 Research_web lvl 4  role: researcher",
            " │    └─ A04 Research_api lvl 4  role: researcher",
            " ├─ A05 Dev_backend      lvl 7  role: core_dev",
            " │    └─ A07 Tester      lvl 5  role: qa",
            " └─ A06 Dev_frontend     lvl 6  role: ui_dev",
            "",
            "Focus agents for this stage:",
            "  • A02 Planner        [energy ▓▓▓▓▓▓▓░░] [xp +12]",
            "  • A03 Research_web   [energy ▓▓▓▓▓▓░░░] [xp +9 ]",
            "  • A05 Dev_backend    [energy ▓▓▓▓▓▓▓▓▓] [xp +18]",
        ];

        let items: Vec<ListItem> = squad_tree.iter()
            .map(|line| ListItem::new(line.to_string()))
            .collect();

        let list = List::new(items)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(border_style)
                .title(" AGENT SQUAD / HIERARCHY "));

        frame.render_widget(list, area);
    }

    fn render_team_feed(&self, frame: &mut Frame, area: Rect) {
        let border_style = if self.focused_panel == FocusPanel::TeamFeed {
            Style::default().fg(self.theme.accent_primary).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(self.theme.fg_secondary)
        };

        let data = match &self.data {
            Some(d) => d,
            None => {
                let placeholder = Paragraph::new("No feed data")
                    .block(Block::default()
                        .borders(Borders::ALL)
                        .border_style(border_style)
                        .title(" TEAM FEED "));
                placeholder.render(area, frame.buffer_mut());
                return;
            }
        };

        let events: Vec<ListItem> = data.events.iter().take(10).map(|event| {
            let content = Line::from(vec![
                Span::raw(format!("{}  ", event.timestamp)),
                Span::styled(
                    format!("[{}] ", event.agent_id),
                    Style::default().fg(event.level.color()).add_modifier(Modifier::BOLD),
                ),
                Span::raw(event.message.clone()),
            ]);
            ListItem::new(content)
        }).collect();

        let list = List::new(events)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(border_style)
                .title(" TEAM FEED "));

        frame.render_widget(list, area);
    }

    fn render_log_and_xp(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Min(5),
                Constraint::Length(4),
            ])
            .split(area);

        // Moment-to-moment log
        self.render_log(frame, chunks[0]);

        // Flow/XP bar
        self.render_xp_bar(frame, chunks[1]);
    }

    fn render_log(&self, frame: &mut Frame, area: Rect) {
        let border_style = if self.focused_panel == FocusPanel::Log {
            Style::default().fg(self.theme.accent_primary).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(self.theme.fg_secondary)
        };

        let log_entries = vec![
            "14:01  [A02] Planned 3 sub-tasks for M2.3",
            "14:03  [A03] Found RFC 6749 section on refresh compromise",
            "14:05  [A05] Implemented per-device refresh nonce",
            "14:07  [A07] e2e_07 failed: concurrent refresh from 2 devices",
            "14:09  [A05] Patch v2 applied, rerunning e2e_07",
            "14:11  [A12 Summarizer] Stage digest updated (press [D] to view)",
        ];

        let items: Vec<ListItem> = log_entries.iter()
            .map(|entry| ListItem::new(entry.to_string()))
            .collect();

        let list = List::new(items)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(border_style)
                .title(" MOMENT-TO-MOMENT LOG "));

        frame.render_widget(list, area);
    }

    fn render_xp_bar(&self, frame: &mut Frame, area: Rect) {
        let content = vec![
            Line::from(vec![
                Span::raw("Stage XP: "),
            ]),
            Line::from(""),
            Line::from("Flow hints:"),
            Line::from("  • You have 1 unresolved blocker, consider nudging Research_web"),
        ];

        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .title(" FLOW / XP BAR ");

        let inner = block.inner(area);
        block.render(area, frame.buffer_mut());

        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(1),
                Constraint::Min(0),
            ])
            .split(inner);

        // XP gauge
        Gauge::default()
            .gauge_style(Style::default().fg(self.theme.success))
            .percent(65)
            .label("lvl 3")
            .render(chunks[0], frame.buffer_mut());

        Paragraph::new(content).render(chunks[1], frame.buffer_mut());
    }
}

impl Dashboard for FlowViewDashboard {
    fn id(&self) -> DashboardId {
        DashboardId::FlowView
    }

    fn name(&self) -> &str {
        "Flow View"
    }

    fn hotkey(&self) -> Option<char> {
        Some('f')
    }

    fn render(&mut self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3),    // Header
                Constraint::Min(0),       // Main content
            ])
            .split(area);

        self.render_header(frame, chunks[0]);

        // Main content: 3 rows
        let rows = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage(30),  // Row 1: Roadmap + Active Stage
                Constraint::Percentage(50),  // Row 2: Agent Squad + Team Feed
                Constraint::Percentage(20),  // Row 3: Log + XP
            ])
            .split(chunks[1]);

        // Row 1: Roadmap | Active Stage
        let row1 = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(45),
                Constraint::Percentage(55),
            ])
            .split(rows[0]);

        self.render_roadmap(frame, row1[0]);
        self.render_active_stage(frame, row1[1]);

        // Row 2: Agent Squad | Team Feed
        let row2 = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(55),
                Constraint::Percentage(45),
            ])
            .split(rows[1]);

        self.render_agent_squad(frame, row2[0]);
        self.render_team_feed(frame, row2[1]);

        // Row 3: Log + XP
        self.render_log_and_xp(frame, rows[2]);
    }

    fn handle_key(&mut self, key: KeyEvent) -> bool {
        match key.code {
            KeyCode::Tab => {
                self.focused_panel = match self.focused_panel {
                    FocusPanel::Roadmap => FocusPanel::ActiveStage,
                    FocusPanel::ActiveStage => FocusPanel::AgentSquad,
                    FocusPanel::AgentSquad => FocusPanel::TeamFeed,
                    FocusPanel::TeamFeed => FocusPanel::Log,
                    FocusPanel::Log => FocusPanel::Roadmap,
                };
                true
            }
            KeyCode::Up if self.focused_panel == FocusPanel::Roadmap => {
                if let Some(sel) = self.selected_milestone {
                    self.selected_milestone = if sel > 0 { Some(sel - 1) } else { Some(0) };
                }
                true
            }
            KeyCode::Down if self.focused_panel == FocusPanel::Roadmap => {
                if let Some(sel) = self.selected_milestone {
                    self.selected_milestone = Some((sel + 1).min(6));
                }
                true
            }
            KeyCode::Enter => {
                // Drill into selected milestone
                true
            }
            KeyCode::Char('d') => {
                // View stage digest
                true
            }
            KeyCode::Char('l') => {
                // Follow stage-related events
                true
            }
            _ => false,
        }
    }

    fn update(&mut self, data: DashboardData) {
        self.data = Some(data);
    }

    fn set_theme(&mut self, theme: FlowTheme) {
        self.style_guide = StyleGuide::new(&theme);
        self.theme = theme;
    }
}

impl Default for FlowViewDashboard {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Copy)]
enum MilestoneStatus {
    Complete,
    Active,
    Focus,
    Pending,
}
