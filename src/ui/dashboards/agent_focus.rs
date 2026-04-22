/// Agent Focus Dashboard - Deep Inspection View
///
/// Purpose: Single agent detail inspector with local graph context
/// Shows code view, local graph, thoughts log, and controls

use super::{Dashboard, DashboardId, DashboardData};
use crate::ui::theme::{FlowTheme, StyleGuide};
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, List, ListItem, Paragraph, Widget},
};
use crossterm::event::{KeyCode, KeyEvent};

/// Agent Detail Inspector Dashboard
pub struct AgentFocusDashboard {
    data: Option<DashboardData>,
    theme: FlowTheme,
    style_guide: StyleGuide,
    focused_agent_id: Option<String>,
    scroll_offset: usize,
}

impl AgentFocusDashboard {
    pub fn new() -> Self {
        let theme = FlowTheme::default();
        let style_guide = StyleGuide::new(&theme);
        Self {
            data: None,
            theme: theme.clone(),
            style_guide,
            focused_agent_id: Some("A05".to_string()),
            scroll_offset: 0,
        }
    }

    pub fn with_theme(theme: FlowTheme) -> Self {
        let style_guide = StyleGuide::new(&theme);
        Self {
            data: None,
            theme: theme.clone(),
            style_guide,
            focused_agent_id: Some("A05".to_string()),
            scroll_offset: 0,
        }
    }

    pub fn set_focused_agent(&mut self, agent_id: String) {
        self.focused_agent_id = Some(agent_id);
    }

    fn get_focused_agent(&self) -> Option<&super::AgentInfo> {
        let data = self.data.as_ref()?;
        let agent_id = self.focused_agent_id.as_ref()?;
        data.agents.iter().find(|a| &a.id == agent_id)
    }

    fn render_header(&self, frame: &mut Frame, area: Rect) {
        let agent = match self.get_focused_agent() {
            Some(a) => a,
            None => {
                Paragraph::new("No agent selected")
                    .block(Block::default().borders(Borders::BOTTOM))
                    .render(area, frame.buffer_mut());
                return;
            }
        };

        let header_text = vec![
            Line::from(vec![
                Span::styled(
                    format!("Agent {} {}", agent.id, agent.name),
                    Style::default().fg(self.theme.accent_primary).add_modifier(Modifier::BOLD),
                ),
                Span::raw("                     "),
                Span::raw("status: "),
                Span::styled(
                    format!("{:?}", agent.status).to_uppercase(),
                    Style::default().fg(agent.status.color()).add_modifier(Modifier::BOLD),
                ),
                Span::raw("   role: "),
                Span::styled(&agent.role, Style::default().fg(self.theme.warning)),
            ]),
            Line::from(vec![
                Span::raw(format!("Parent: A01 PM   Cluster: Backend        Neighbors: A03 A07 A10")),
            ]),
        ];

        Paragraph::new(header_text)
            .block(Block::default().borders(Borders::BOTTOM))
            .render(area, frame.buffer_mut());
    }

    fn render_code_view(&self, frame: &mut Frame, area: Rect) {
        let code_lines = vec![
            "Path: services/auth/service.rs",
            "",
            " impl AuthService {",
            "     pub async fn refresh(...) {",
            "         // patch v3",
            "         // per-device nonce",
            "         // idempotent retries",
            "         ...",
            "     }",
            " }",
        ];

        let items: Vec<ListItem> = code_lines.iter()
            .map(|line| {
                let style = if line.contains("//") {
                    Style::default().fg(self.theme.fg_secondary)
                } else if line.contains("pub") || line.contains("async") {
                    Style::default().fg(self.theme.accent_secondary)
                } else {
                    Style::default()
                };
                ListItem::new(line.to_string()).style(style)
            })
            .collect();

        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .title(" CODE VIEW ");

        let block_inner = block.inner(area);

        let list = List::new(items)
            .block(block);

        frame.render_widget(list, area);

        // Controls at bottom
        let controls_area = Rect {
            y: block_inner.y + block_inner.height.saturating_sub(2),
            height: 1,
            ..block_inner
        };

        Paragraph::new(Line::from(vec![
            Span::styled("[↑↓]", Style::default().fg(self.theme.warning)),
            Span::raw(" scroll   "),
            Span::styled("[D]", Style::default().fg(self.theme.warning)),
            Span::raw(" view diff       "),
            Span::styled("[O]", Style::default().fg(self.theme.warning)),
            Span::raw(" open in $EDITOR"),
        ]))
        .render(controls_area, frame.buffer_mut());
    }

    fn render_local_graph(&self, frame: &mut Frame, area: Rect) {
        let graph_text = vec![
            "",
            "       [A03] Research_web",
            "           █",
            "            ╲",
            "             ███ A05 Dev_backend",
            "            ╱",
            "       [A07] Tester      [A10] Tool_run",
            "           █               █",
            "",
            "   Traffic heat (last 2 min):",
            "      A03 → A05  ▓▓▓▓▓▓▓▓",
            "      A07 → A05  ▓▓▓▓",
            "      A05 → A10  ▓▓▓",
        ];

        let items: Vec<ListItem> = graph_text.iter()
            .map(|line| ListItem::new(line.to_string()))
            .collect();

        let list = List::new(items)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .title(" LOCAL GRAPH / CONTEXT "));

        frame.render_widget(list, area);
    }

    fn render_thoughts(&self, frame: &mut Frame, area: Rect) {
        let thoughts = vec![
            "01:23:18  Considering Redis TTL for nonce per device",
            "01:23:22  Need compatibility with mobile client v1.4",
            "01:23:28  Using pattern suggested in RFC 6749 security considerations",
            "01:23:34  Plan: add regression tests for multi device refresh",
        ];

        let items: Vec<ListItem> = thoughts.iter()
            .map(|thought| ListItem::new(thought.to_string()))
            .collect();

        let list = List::new(items)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .title(" THOUGHTS / MONOLOGUE "));

        frame.render_widget(list, area);
    }

    fn render_related_tasks(&self, frame: &mut Frame, area: Rect) {
        let agent = match self.get_focused_agent() {
            Some(a) => a,
            None => {
                Paragraph::new("No agent selected")
                    .block(Block::default()
                        .borders(Borders::ALL)
                        .title(" RELATED TASKS "))
                    .render(area, frame.buffer_mut());
                return;
            }
        };

        let task_text = if let Some(ref task) = agent.current_task {
            vec![
                Line::from(vec![
                    Span::styled("Current: ", Style::default().add_modifier(Modifier::BOLD)),
                    Span::raw(task),
                ]),
                Line::from(""),
                Line::from("Related:"),
                Line::from("  • Test refresh token rotation"),
                Line::from("  • Document security approach"),
            ]
        } else {
            vec![Line::from("No active task")]
        };

        Paragraph::new(task_text)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .title(" RELATED TASKS "))
            .render(area, frame.buffer_mut());
    }

    fn render_controls(&self, frame: &mut Frame, area: Rect) {
        let agent = match self.get_focused_agent() {
            Some(a) => a,
            None => {
                Paragraph::new("No agent selected")
                    .block(Block::default()
                        .borders(Borders::ALL)
                        .title(" CONTROLS / STATUS "))
                    .render(area, frame.buffer_mut());
                return;
            }
        };

        let control_text = vec![
            Line::from(vec![
                Span::raw("Local metrics: "),
                Span::raw(format!("tokens {:.1}k  ", agent.tokens as f32 / 1000.0)),
                Span::raw(format!("cost ${:.2}  ", agent.cost)),
                Span::raw(format!("last response {:.1}s", agent.latency)),
            ]),
            Line::from(""),
            Line::from(vec![
                Span::raw("CMD: "),
                Span::styled(
                    "/coach A05 \"Explain tradeoffs of this nonce design in 3 bullet points\"",
                    Style::default().fg(self.theme.accent_primary),
                ),
            ]),
            Line::from(""),
            Line::from(vec![
                Span::styled("[B]", Style::default().fg(self.theme.warning)),
                Span::raw(" back to overview   "),
                Span::styled("[N]", Style::default().fg(self.theme.warning)),
                Span::raw(" next agent in cluster   "),
                Span::styled("[P]", Style::default().fg(self.theme.warning)),
                Span::raw(" previous agent"),
            ]),
        ];

        Paragraph::new(control_text)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .title(" CONTROLS / STATUS "))
            .render(area, frame.buffer_mut());
    }
}

impl Dashboard for AgentFocusDashboard {
    fn id(&self) -> DashboardId {
        DashboardId::AgentFocus
    }

    fn name(&self) -> &str {
        "Agent Focus"
    }

    fn hotkey(&self) -> Option<char> {
        Some('a')
    }

    fn render(&mut self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3),    // Header
                Constraint::Min(10),      // Main content
                Constraint::Length(7),    // Controls
            ])
            .split(area);

        self.render_header(frame, chunks[0]);

        // Main content: Code + Graph | Thoughts + Tasks
        let main_rows = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage(60),  // Code view + Graph
                Constraint::Percentage(40),  // Thoughts + Tasks
            ])
            .split(chunks[1]);

        // Top row: Code | Graph
        let top_cols = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(60),
                Constraint::Percentage(40),
            ])
            .split(main_rows[0]);

        self.render_code_view(frame, top_cols[0]);
        self.render_local_graph(frame, top_cols[1]);

        // Bottom row: Thoughts | Tasks
        let bottom_cols = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(60),
                Constraint::Percentage(40),
            ])
            .split(main_rows[1]);

        self.render_thoughts(frame, bottom_cols[0]);
        self.render_related_tasks(frame, bottom_cols[1]);

        self.render_controls(frame, chunks[2]);
    }

    fn handle_key(&mut self, key: KeyEvent) -> bool {
        match key.code {
            KeyCode::Up => {
                self.scroll_offset = self.scroll_offset.saturating_sub(1);
                true
            }
            KeyCode::Down => {
                self.scroll_offset = self.scroll_offset.saturating_add(1);
                true
            }
            KeyCode::Char('n') => {
                // Next agent
                true
            }
            KeyCode::Char('p') => {
                // Previous agent
                true
            }
            KeyCode::Char('b') => {
                // Back to overview
                true
            }
            KeyCode::Char('d') => {
                // View diff
                true
            }
            KeyCode::Char('o') => {
                // Open in editor
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

impl Default for AgentFocusDashboard {
    fn default() -> Self {
        Self::new()
    }
}
