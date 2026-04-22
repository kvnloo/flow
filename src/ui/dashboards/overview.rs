/// Overview Dashboard - Global Orchestration Snapshot
///
/// Purpose: Fast situational awareness of entire swarm
/// Shows agent grid, swarm topology, and live event feed

use super::{Dashboard, DashboardId, DashboardData};
use crate::ui::theme::{FlowTheme, StyleGuide};
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, List, ListItem, Paragraph, Row, Table, Widget},
};
use crossterm::event::{KeyCode, KeyEvent};

/// Global Orchestration Overview Dashboard
pub struct OverviewDashboard {
    data: Option<DashboardData>,
    theme: FlowTheme,
    style_guide: StyleGuide,
    scroll_offset: usize,
    selected_agent: Option<usize>,
}

impl OverviewDashboard {
    pub fn new() -> Self {
        let theme = FlowTheme::default();
        let style_guide = StyleGuide::new(&theme);
        Self {
            data: None,
            theme: theme.clone(),
            style_guide,
            scroll_offset: 0,
            selected_agent: None,
        }
    }

    pub fn with_theme(theme: FlowTheme) -> Self {
        let style_guide = StyleGuide::new(&theme);
        Self {
            data: None,
            theme: theme.clone(),
            style_guide,
            scroll_offset: 0,
            selected_agent: None,
        }
    }

    fn render_header(&self, frame: &mut Frame, area: Rect) {
        let session = self.data.as_ref().and_then(|d| Some(&d.session));

        let header_text = if let Some(s) = session {
            vec![
                Line::from(vec![
                    Span::raw("@repos/flow  "),
                    Span::styled(
                        format!("[model: {}]", s.model),
                        Style::default().fg(self.theme.accent_primary),
                    ),
                ]),
                Line::from(vec![
                    Span::raw(format!("Session: {}  ", s.name)),
                    Span::raw(format!("Elapsed: {}  ", s.elapsed)),
                    Span::raw(format!("Agents: {}", s.agent_count)),
                ]),
            ]
        } else {
            vec![Line::from("Loading...")]
        };

        Paragraph::new(header_text)
            .block(Block::default().borders(Borders::BOTTOM))
            .render(area, frame.buffer_mut());
    }

    fn render_agent_grid(&self, frame: &mut Frame, area: Rect) {
        let data = match &self.data {
            Some(d) => d,
            None => {
                let placeholder = Paragraph::new("No agent data")
                    .block(Block::default()
                        .borders(Borders::ALL)
                        .title(" AGENT GRID "));
                placeholder.render(area, frame.buffer_mut());
                return;
            }
        };

        let header_cells = ["ID", "ROLE", "STATUS", "TASK", "TOKENS", "COST", "HEAT"]
            .iter()
            .map(|h| {
                ratatui::widgets::Cell::from(*h)
                    .style(Style::default().fg(self.theme.warning).add_modifier(Modifier::BOLD))
            });
        let header = Row::new(header_cells).height(1);

        let rows = data.agents.iter().enumerate().map(|(i, agent)| {
            let style = if Some(i) == self.selected_agent {
                Style::default().bg(self.theme.bg_highlight).add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };

            let heat_bar = self.render_heat(agent.tokens);
            let task_display = agent.current_task.as_deref().unwrap_or("-");

            Row::new(vec![
                ratatui::widgets::Cell::from(agent.id.clone()),
                ratatui::widgets::Cell::from(agent.role.clone()),
                ratatui::widgets::Cell::from(format!("{} {}",
                    agent.status.icon(),
                    format!("{:?}", agent.status).to_uppercase()
                )).style(Style::default().fg(agent.status.color())),
                ratatui::widgets::Cell::from(task_display),
                ratatui::widgets::Cell::from(format!("{:.1}k", agent.tokens as f32 / 1000.0)),
                ratatui::widgets::Cell::from(format!("${:.2}", agent.cost)),
                ratatui::widgets::Cell::from(heat_bar),
            ])
            .style(style)
            .height(1)
        });

        let widths = [
            Constraint::Length(4),   // ID
            Constraint::Length(15),  // ROLE
            Constraint::Length(12),  // STATUS
            Constraint::Min(20),     // TASK
            Constraint::Length(8),   // TOKENS
            Constraint::Length(7),   // COST
            Constraint::Length(12),  // HEAT
        ];

        let table = Table::new(rows, widths)
            .header(header)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .title(" AGENT GRID "))
            .column_spacing(1);

        frame.render_widget(table, area);
    }

    fn render_heat(&self, tokens: u32) -> String {
        let bars = (tokens / 3000).min(10);
        let filled = "▓".repeat(bars as usize);
        let empty = "░".repeat((10 - bars) as usize);
        format!("{}{}", filled, empty)
    }

    fn render_swarm_topology(&self, frame: &mut Frame, area: Rect) {
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .title(" SWARM TOPOLOGY ");

        let inner = block.inner(area);
        block.render(area, frame.buffer_mut());

        // Basic ASCII topology visualization
        let topology_text = vec![
            Line::from(""),
            Line::from("          A03      A04                      A06        A07"),
            Line::from("           █        █                        █          █"),
            Line::from("            ╲      ╱                          ╲        ╱"),
            Line::from("             ███████    A05 Dev_backend        ███████"),
            Line::from("           ╱   ║   ╲       ███████           ╱   ║   ╲"),
            Line::from("        A02    ║    A09         ║        A01   ║    A10"),
            Line::from("         ███████                 ║         ███████"),
            Line::from("             ║                   ║             ║"),
            Line::from("            A08 Architect  ███████ central bus  A11 Guardrails"),
            Line::from(""),
            Line::from(vec![
                Span::styled("  Backend: ", Style::default().fg(self.theme.success)),
                Span::styled("green nodes    ", Style::default().fg(self.theme.success)),
                Span::styled("Frontend: ", Style::default().fg(self.theme.accent_primary)),
                Span::styled("cyan nodes    ", Style::default().fg(self.theme.accent_primary)),
                Span::styled("Research: ", Style::default().fg(self.theme.accent_secondary)),
                Span::styled("magenta nodes", Style::default().fg(self.theme.accent_secondary)),
            ]),
        ];

        Paragraph::new(topology_text).render(inner, frame.buffer_mut());
    }

    fn render_event_feed(&self, frame: &mut Frame, area: Rect) {
        let data = match &self.data {
            Some(d) => d,
            None => {
                let placeholder = Paragraph::new("No events")
                    .block(Block::default()
                        .borders(Borders::ALL)
                        .title(" LIVE EVENT FEED "));
                placeholder.render(area, frame.buffer_mut());
                return;
            }
        };

        let events: Vec<ListItem> = data.events.iter().map(|event| {
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
                .title(" LIVE EVENT FEED "))
            .highlight_style(Style::default().bg(self.theme.bg_highlight));

        frame.render_widget(list, area);
    }

    fn render_status_bar(&self, frame: &mut Frame, area: Rect) {
        let metrics = self.data.as_ref().map(|d| &d.metrics);

        let status_text = if let Some(m) = metrics {
            vec![
                Line::from(vec![
                    Span::raw(format!("Tasks: {} / {}  ",
                        m.completed_tasks,
                        m.completed_tasks + m.pending_tasks)),
                    Span::raw(format!("Est cost: ${:.2}  ", m.total_cost)),
                    Span::styled("Autosave: ON", Style::default().fg(self.theme.success)),
                ]),
                Line::from(vec![
                    Span::raw("Focus: none"),
                ]),
                Line::from(vec![
                    Span::raw("CMD: "),
                    Span::styled("/ask A03 \"Check for PKCE best practices in latest RFCs\"",
                        Style::default().fg(self.theme.accent_primary)),
                ]),
                Line::from(vec![
                    Span::styled("[ESC]", Style::default().fg(self.theme.warning)),
                    Span::raw(" help   "),
                    Span::styled("[:]", Style::default().fg(self.theme.warning)),
                    Span::raw(" command palette   "),
                    Span::styled("[CTRL+C]", Style::default().fg(self.theme.warning)),
                    Span::raw(" quit safely"),
                ]),
            ]
        } else {
            vec![Line::from("Loading...")]
        };

        Paragraph::new(status_text)
            .block(Block::default().borders(Borders::TOP))
            .render(area, frame.buffer_mut());
    }
}

impl Dashboard for OverviewDashboard {
    fn id(&self) -> DashboardId {
        DashboardId::Overview
    }

    fn name(&self) -> &str {
        "Global Overview"
    }

    fn hotkey(&self) -> Option<char> {
        Some('o')
    }

    fn render(&mut self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3),    // Header
                Constraint::Min(10),      // Main content
                Constraint::Length(5),    // Status bar
            ])
            .split(area);

        self.render_header(frame, chunks[0]);

        // Main content split
        let main_chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(40),  // Agent grid
                Constraint::Percentage(60),  // Swarm + Events
            ])
            .split(chunks[1]);

        self.render_agent_grid(frame, main_chunks[0]);

        // Right side: topology + events
        let right_chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage(50),  // Topology
                Constraint::Percentage(50),  // Events
            ])
            .split(main_chunks[1]);

        self.render_swarm_topology(frame, right_chunks[0]);
        self.render_event_feed(frame, right_chunks[1]);

        self.render_status_bar(frame, chunks[2]);
    }

    fn handle_key(&mut self, key: KeyEvent) -> bool {
        match key.code {
            KeyCode::Up => {
                if let Some(sel) = self.selected_agent {
                    self.selected_agent = if sel > 0 { Some(sel - 1) } else { Some(0) };
                } else {
                    self.selected_agent = Some(0);
                }
                true
            }
            KeyCode::Down => {
                if let Some(d) = &self.data {
                    if let Some(sel) = self.selected_agent {
                        self.selected_agent = Some((sel + 1).min(d.agents.len().saturating_sub(1)));
                    } else {
                        self.selected_agent = Some(0);
                    }
                }
                true
            }
            KeyCode::Char('f') => {
                // Filter action
                true
            }
            KeyCode::Char('g') => {
                // Group by role
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

impl Default for OverviewDashboard {
    fn default() -> Self {
        Self::new()
    }
}
