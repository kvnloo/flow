/// Metrics Dashboard - Cost/Performance Analytics
///
/// Purpose: Quantify and debug long autonomous runs
/// Shows token/cost tables, latency metrics, sparklines, timeline

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

/// Cost, Performance, Timeline Dashboard
pub struct MetricsDashboard {
    data: Option<DashboardData>,
    theme: FlowTheme,
    style_guide: StyleGuide,
    time_window: TimeWindow,
    scroll_offset: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TimeWindow {
    Last10Min,
    Last30Min,
    Last60Min,
    Last24H,
}

impl MetricsDashboard {
    pub fn new() -> Self {
        let theme = FlowTheme::default();
        let style_guide = StyleGuide::new(&theme);
        Self {
            data: None,
            theme: theme.clone(),
            style_guide,
            time_window: TimeWindow::Last60Min,
            scroll_offset: 0,
        }
    }

    pub fn with_theme(theme: FlowTheme) -> Self {
        let style_guide = StyleGuide::new(&theme);
        Self {
            data: None,
            theme: theme.clone(),
            style_guide,
            time_window: TimeWindow::Last60Min,
            scroll_offset: 0,
        }
    }

    fn render_header(&self, frame: &mut Frame, area: Rect) {
        let header_text = vec![
            Line::from(vec![
                Span::styled(
                    "Metrics session: ",
                    Style::default().add_modifier(Modifier::BOLD),
                ),
                Span::styled("overnight_research_001", Style::default().fg(self.theme.accent_primary)),
            ]),
            Line::from(vec![
                Span::raw("Window: "),
                Span::styled(
                    format!("{:?}", self.time_window).replace("Last", "last "),
                    Style::default().fg(self.theme.warning),
                ),
                Span::raw("            "),
                Span::styled("[← earlier]", Style::default().fg(self.theme.fg_secondary)),
                Span::raw("  "),
                Span::styled("[→ later]", Style::default().fg(self.theme.fg_secondary)),
            ]),
        ];

        Paragraph::new(header_text)
            .block(Block::default().borders(Borders::BOTTOM))
            .render(area, frame.buffer_mut());
    }

    fn render_token_cost_table(&self, frame: &mut Frame, area: Rect) {
        let header_cells = ["Minute", "Tokens", "Est cost"]
            .iter()
            .map(|h| {
                ratatui::widgets::Cell::from(*h)
                    .style(Style::default().fg(self.theme.warning).add_modifier(Modifier::BOLD))
            });
        let header = Row::new(header_cells).height(1);

        // Sample data
        let data_rows = vec![
            ("01:20", "3.4k", "$0.06"),
            ("01:21", "4.1k", "$0.07"),
            ("01:22", "2.9k", "$0.05"),
            ("01:23", "6.5k", "$0.11"),
            ("01:24", "5.2k", "$0.09"),
            ("01:25", "1.7k", "$0.03"),
        ];

        let rows = data_rows.iter().map(|(min, tok, cost)| {
            Row::new(vec![
                ratatui::widgets::Cell::from(min.to_string()),
                ratatui::widgets::Cell::from(tok.to_string()),
                ratatui::widgets::Cell::from(cost.to_string()),
            ])
            .height(1)
        });

        let widths = [
            Constraint::Length(10),
            Constraint::Length(10),
            Constraint::Length(12),
        ];

        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .title(" TOKENS / COST ");

        let inner = block.inner(area);

        let table = Table::new(rows, widths)
            .header(header)
            .block(block)
            .column_spacing(2);

        frame.render_widget(table, area);

        // Total at bottom
        let total_area = Rect {
            y: inner.y + inner.height.saturating_sub(2),
            height: 1,
            ..inner
        };

        Paragraph::new(Line::from(vec![
            Span::raw("                       "),
            Span::styled("Total: $0.84", Style::default().fg(self.theme.success).add_modifier(Modifier::BOLD)),
        ]))
        .render(total_area, frame.buffer_mut());
    }

    fn render_latency_queue_table(&self, frame: &mut Frame, area: Rect) {
        let data = match &self.data {
            Some(d) => d,
            None => {
                let placeholder = Paragraph::new("No latency data")
                    .block(Block::default()
                        .borders(Borders::ALL)
                        .title(" LATENCY / QUEUES "));
                placeholder.render(area, frame.buffer_mut());
                return;
            }
        };

        let header_cells = ["Agent", "Avg latency", "Queue len", "Errors"]
            .iter()
            .map(|h| {
                ratatui::widgets::Cell::from(*h)
                    .style(Style::default().fg(self.theme.warning).add_modifier(Modifier::BOLD))
            });
        let header = Row::new(header_cells).height(1);

        let rows = data.agents.iter().take(6).map(|agent| {
            Row::new(vec![
                ratatui::widgets::Cell::from(format!("{} {}", agent.id, agent.role)),
                ratatui::widgets::Cell::from(format!("{:.1} s", agent.latency)),
                ratatui::widgets::Cell::from(agent.queue_len.to_string()),
                ratatui::widgets::Cell::from("0"),
            ])
            .height(1)
        });

        let widths = [
            Constraint::Length(20),
            Constraint::Length(12),
            Constraint::Length(10),
            Constraint::Length(8),
        ];

        let table = Table::new(rows, widths)
            .header(header)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .title(" LATENCY / QUEUES "))
            .column_spacing(2);

        frame.render_widget(table, area);
    }

    fn render_sparklines(&self, frame: &mut Frame, area: Rect) {
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .title(" SPARKLINES ");

        let inner = block.inner(area);
        block.render(area, frame.buffer_mut());

        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3),
                Constraint::Length(3),
                Constraint::Length(3),
            ])
            .split(inner);

        // Tokens sparkline
        let _tokens_data = &[2, 4, 5, 7, 9, 6, 4, 2, 1, 1];
        Paragraph::new(vec![
            Line::from(vec![
                Span::raw("Tokens:   "),
                Span::styled("▓▄▅▇█▆▄▂▁▁", Style::default().fg(self.theme.success)),
            ]),
        ])
        .render(chunks[0], frame.buffer_mut());

        // Latency sparkline
        Paragraph::new(vec![
            Line::from(vec![
                Span::raw("Latency:  "),
                Span::styled("▁▄█▄▆▄▃▁▁▁", Style::default().fg(self.theme.warning)),
            ]),
        ])
        .render(chunks[1], frame.buffer_mut());

        // Errors sparkline
        Paragraph::new(vec![
            Line::from(vec![
                Span::raw("Errors:   "),
                Span::styled("▁▁▁▁▂▁▁▁▁▁", Style::default().fg(self.theme.error)),
            ]),
        ])
        .render(chunks[2], frame.buffer_mut());
    }

    fn render_event_timeline(&self, frame: &mut Frame, area: Rect) {
        let data = match &self.data {
            Some(d) => d,
            None => {
                let placeholder = Paragraph::new("No events")
                    .block(Block::default()
                        .borders(Borders::ALL)
                        .title(" EVENT TIMELINE "));
                placeholder.render(area, frame.buffer_mut());
                return;
            }
        };

        let events: Vec<ListItem> = data.events.iter().map(|event| {
            let content = Line::from(vec![
                Span::raw(format!("{}  ", event.timestamp)),
                Span::styled(
                    format!("[{}] ", event.agent_id),
                    Style::default().fg(event.level.color()),
                ),
                Span::raw(event.message.clone()),
            ]);
            ListItem::new(content)
        }).collect();

        let list = List::new(events)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .title(" EVENT TIMELINE "));

        frame.render_widget(list, area);
    }

    fn render_summary(&self, frame: &mut Frame, area: Rect) {
        let summary_text = vec![
            Line::from(vec![
                Span::styled("Hotspots: ", Style::default().add_modifier(Modifier::BOLD)),
                Span::raw("A03 Research latency high, A07 Tester queue long"),
            ]),
            Line::from(vec![
                Span::styled("Recommendation: ", Style::default().fg(self.theme.warning).add_modifier(Modifier::BOLD)),
                Span::raw("add secondary researcher for RFCs, schedule tests later"),
            ]),
            Line::from(""),
            Line::from(vec![
                Span::raw("CMD: "),
                Span::styled(
                    "/spawn Research_pdf \"parallelize RFC 6749 annex analysis\"",
                    Style::default().fg(self.theme.accent_primary),
                ),
            ]),
        ];

        Paragraph::new(summary_text)
            .block(Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .title(" SUMMARY / CONTROLS "))
            .render(area, frame.buffer_mut());
    }
}

impl Dashboard for MetricsDashboard {
    fn id(&self) -> DashboardId {
        DashboardId::Metrics
    }

    fn name(&self) -> &str {
        "Metrics"
    }

    fn hotkey(&self) -> Option<char> {
        Some('m')
    }

    fn render(&mut self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3),    // Header
                Constraint::Min(10),      // Main content
                Constraint::Length(5),    // Summary
            ])
            .split(area);

        self.render_header(frame, chunks[0]);

        // Main content: 2x2 grid
        let main_rows = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage(40),  // Token/cost + Latency
                Constraint::Percentage(60),  // Sparklines + Timeline
            ])
            .split(chunks[1]);

        // Top row: Token/Cost | Latency
        let top_cols = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(50),
                Constraint::Percentage(50),
            ])
            .split(main_rows[0]);

        self.render_token_cost_table(frame, top_cols[0]);
        self.render_latency_queue_table(frame, top_cols[1]);

        // Bottom row: Sparklines | Timeline
        let bottom_cols = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(40),
                Constraint::Percentage(60),
            ])
            .split(main_rows[1]);

        self.render_sparklines(frame, bottom_cols[0]);
        self.render_event_timeline(frame, bottom_cols[1]);

        self.render_summary(frame, chunks[2]);
    }

    fn handle_key(&mut self, key: KeyEvent) -> bool {
        match key.code {
            KeyCode::Left => {
                self.time_window = match self.time_window {
                    TimeWindow::Last10Min => TimeWindow::Last10Min,
                    TimeWindow::Last30Min => TimeWindow::Last10Min,
                    TimeWindow::Last60Min => TimeWindow::Last30Min,
                    TimeWindow::Last24H => TimeWindow::Last60Min,
                };
                true
            }
            KeyCode::Right => {
                self.time_window = match self.time_window {
                    TimeWindow::Last10Min => TimeWindow::Last30Min,
                    TimeWindow::Last30Min => TimeWindow::Last60Min,
                    TimeWindow::Last60Min => TimeWindow::Last24H,
                    TimeWindow::Last24H => TimeWindow::Last24H,
                };
                true
            }
            KeyCode::Char('t') => {
                // Plot tokens
                true
            }
            KeyCode::Char('c') => {
                // Plot cost
                true
            }
            KeyCode::Char('f') => {
                // Filter by agent
                true
            }
            KeyCode::Char('e') => {
                // Show only errors
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

impl Default for MetricsDashboard {
    fn default() -> Self {
        Self::new()
    }
}
