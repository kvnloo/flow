// Agent Card Widget
//
// Displays agent information with status, metrics, and progress in a compact card format.

use ratatui::{
    buffer::Buffer,
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style, Stylize},
    text::{Line, Span},
    widgets::{Block, Borders, Gauge, Paragraph, Widget},
};

/// Agent status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AgentStatus {
    Idle,
    Active,
    Blocked,
    Error,
}

impl AgentStatus {
    /// Get status icon
    pub fn icon(&self) -> &str {
        match self {
            Self::Idle => "○",
            Self::Active => "●",
            Self::Blocked => "◐",
            Self::Error => "◉",
        }
    }

    /// Get status color
    pub fn color(&self) -> Color {
        match self {
            Self::Idle => Color::DarkGray,
            Self::Active => Color::Green,
            Self::Blocked => Color::Yellow,
            Self::Error => Color::Red,
        }
    }

    /// Get status label
    pub fn label(&self) -> &str {
        match self {
            Self::Idle => "IDLE",
            Self::Active => "ACTIVE",
            Self::Blocked => "BLOCKED",
            Self::Error => "ERROR",
        }
    }
}

/// Agent data structure
#[derive(Debug, Clone)]
pub struct Agent {
    pub id: String,
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

impl Agent {
    /// Create a new agent with default values
    pub fn new(id: String, name: String) -> Self {
        Self {
            id,
            name,
            status: AgentStatus::Idle,
            role: "worker".to_string(),
            level: 1,
            tokens: 0,
            cost: 0.0,
            latency: 0.0,
            queue_len: 0,
            current_task: None,
            progress: 0,
        }
    }
}

/// Agent Card widget properties
pub struct AgentCard {
    pub agent: Agent,
    pub expanded: bool,
    pub show_metrics: bool,
}

impl AgentCard {
    /// Create new agent card
    pub fn new(agent: Agent) -> Self {
        Self {
            agent,
            expanded: false,
            show_metrics: true,
        }
    }

    /// Set expanded state
    pub fn expanded(mut self, expanded: bool) -> Self {
        self.expanded = expanded;
        self
    }

    /// Set show metrics flag
    pub fn show_metrics(mut self, show: bool) -> Self {
        self.show_metrics = show;
        self
    }

    /// Format number with K/M suffix
    fn format_number(n: u32) -> String {
        if n >= 1_000_000 {
            format!("{:.1}M", n as f32 / 1_000_000.0)
        } else if n >= 1000 {
            format!("{:.1}k", n as f32 / 1000.0)
        } else {
            n.to_string()
        }
    }
}

impl Widget for AgentCard {
    fn render(self, area: Rect, buf: &mut Buffer) {
        // Create border block with title
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(ratatui::widgets::BorderType::Rounded)
            .title(format!(" {} {} ", self.agent.id, self.agent.name))
            .title_style(Style::default().fg(Color::Cyan).bold());

        let inner = block.inner(area);
        block.render(area, buf);

        // Layout sections
        if self.expanded {
            let sections = Layout::vertical([
                Constraint::Length(1), // Status line
                Constraint::Length(1), // Separator
                Constraint::Length(2), // Metrics
                Constraint::Length(1), // Separator
                Constraint::Min(2),    // Task info + progress
            ])
            .split(inner);

            // Render status line
            self.render_status_line(sections[0], buf);

            // Render separator
            let sep = "─".repeat(inner.width as usize);
            buf.set_string(sections[1].x, sections[1].y, &sep, Style::default().fg(Color::DarkGray));

            // Render metrics
            if self.show_metrics {
                self.render_metrics(sections[2], buf);
            }

            // Render separator
            buf.set_string(sections[3].x, sections[3].y, &sep, Style::default().fg(Color::DarkGray));

            // Render task info
            self.render_task_info(sections[4], buf);
        } else {
            // Compact mode
            let sections = Layout::vertical([
                Constraint::Length(1), // Status line
                Constraint::Length(1), // Compact metrics
            ])
            .split(inner);

            self.render_status_line(sections[0], buf);
            if self.show_metrics {
                self.render_compact_metrics(sections[1], buf);
            }
        }
    }
}

impl AgentCard {
    /// Render status line
    fn render_status_line(&self, area: Rect, buf: &mut Buffer) {
        let status_line = Line::from(vec![
            Span::styled(
                self.agent.status.icon(),
                Style::default().fg(self.agent.status.color()),
            ),
            Span::raw(" "),
            Span::styled(
                self.agent.status.label(),
                Style::default()
                    .fg(self.agent.status.color())
                    .add_modifier(Modifier::BOLD),
            ),
            Span::raw(format!(
                "  lvl {}  role: {}",
                self.agent.level, self.agent.role
            )),
        ]);

        Paragraph::new(status_line).render(area, buf);
    }

    /// Render detailed metrics
    fn render_metrics(&self, area: Rect, buf: &mut Buffer) {
        let metrics = vec![
            Line::from(format!(
                "Tokens: {:>6}    Cost: ${:.2}",
                Self::format_number(self.agent.tokens),
                self.agent.cost
            )),
            Line::from(format!(
                "Latency: {:>4.1}s    Queue: {}",
                self.agent.latency, self.agent.queue_len
            )),
        ];

        Paragraph::new(metrics).render(area, buf);
    }

    /// Render compact metrics
    fn render_compact_metrics(&self, area: Rect, buf: &mut Buffer) {
        let compact = Line::from(format!(
            "📊 {}  💰 ${:.2}  ⏱️ {:.1}s",
            Self::format_number(self.agent.tokens),
            self.agent.cost,
            self.agent.latency
        ));

        Paragraph::new(compact).render(area, buf);
    }

    /// Render task information with progress
    fn render_task_info(&self, area: Rect, buf: &mut Buffer) {
        if let Some(ref task) = self.agent.current_task {
            // Task text
            let task_text = Line::from(format!("Task: {}", task));
            let task_area = Rect {
                height: 1,
                ..area
            };
            Paragraph::new(task_text).render(task_area, buf);

            // Progress gauge
            if area.height > 1 {
                let gauge_area = Rect {
                    y: area.y + 1,
                    height: 1,
                    ..area
                };

                let progress_label = format!("{}%", self.agent.progress);
                Gauge::default()
                    .gauge_style(Style::default().fg(Color::Green))
                    .percent(self.agent.progress as u16)
                    .label(progress_label)
                    .render(gauge_area, buf);
            }
        } else {
            let idle_text = Line::from("No active task").italic();
            Paragraph::new(idle_text)
                .style(Style::default().fg(Color::DarkGray))
                .render(area, buf);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_creation() {
        let agent = Agent::new("A01".to_string(), "TestAgent".to_string());
        assert_eq!(agent.id, "A01");
        assert_eq!(agent.status, AgentStatus::Idle);
    }

    #[test]
    fn test_status_icons() {
        assert_eq!(AgentStatus::Idle.icon(), "○");
        assert_eq!(AgentStatus::Active.icon(), "●");
        assert_eq!(AgentStatus::Blocked.icon(), "◐");
        assert_eq!(AgentStatus::Error.icon(), "◉");
    }

    #[test]
    fn test_number_formatting() {
        assert_eq!(AgentCard::format_number(500), "500");
        assert_eq!(AgentCard::format_number(5000), "5.0k");
        assert_eq!(AgentCard::format_number(5_000_000), "5.0M");
    }
}
