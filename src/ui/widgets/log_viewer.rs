// Log Viewer Widget
//
// Scrollable, filterable log viewer with level-based coloring and search support.

use ratatui::{
    buffer::Buffer,
    layout::Rect,
    style::{Color, Modifier, Style, Stylize},
    text::{Line, Span},
    widgets::{Block, List, ListItem, StatefulWidget, Widget},
};
use std::collections::VecDeque;

/// Log level enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

impl LogLevel {
    /// Get color for log level
    pub fn color(&self) -> Color {
        match self {
            Self::Trace => Color::DarkGray,
            Self::Debug => Color::Cyan,
            Self::Info => Color::Green,
            Self::Warn => Color::Yellow,
            Self::Error => Color::Red,
        }
    }

    /// Get label for log level
    pub fn label(&self) -> &str {
        match self {
            Self::Trace => "TRACE",
            Self::Debug => "DEBUG",
            Self::Info => "INFO ",
            Self::Warn => "WARN ",
            Self::Error => "ERROR",
        }
    }

    /// Get icon for log level
    pub fn icon(&self) -> &str {
        match self {
            Self::Trace => "·",
            Self::Debug => "›",
            Self::Info => "ℹ",
            Self::Warn => "⚠",
            Self::Error => "✗",
        }
    }
}

/// Log entry structure
#[derive(Debug, Clone)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: LogLevel,
    pub source: String,
    pub message: String,
    pub context: Option<String>,
}

impl LogEntry {
    /// Create new log entry
    pub fn new(level: LogLevel, source: String, message: String) -> Self {
        let timestamp = chrono::Local::now().format("%H:%M:%S").to_string();
        Self {
            timestamp,
            level,
            source,
            message,
            context: None,
        }
    }

    /// Create with timestamp
    pub fn with_timestamp(
        timestamp: String,
        level: LogLevel,
        source: String,
        message: String,
    ) -> Self {
        Self {
            timestamp,
            level,
            source,
            message,
            context: None,
        }
    }

    /// Add context information
    pub fn with_context(mut self, context: String) -> Self {
        self.context = Some(context);
        self
    }

    /// Format as single line
    pub fn format_line(&self) -> Line {
        let level_style = Style::default().fg(self.level.color()).bold();

        Line::from(vec![
            Span::styled(&self.timestamp, Style::default().fg(Color::DarkGray)),
            Span::raw("  "),
            Span::styled(self.level.icon(), level_style),
            Span::raw(" "),
            Span::styled(
                format!("[{}]", self.source),
                Style::default().fg(Color::Blue),
            ),
            Span::raw(" "),
            Span::raw(&self.message),
        ])
    }
}

/// Log viewer state
pub struct LogViewerState {
    pub scroll_offset: usize,
    pub selected_index: Option<usize>,
    pub follow_tail: bool,
}

impl LogViewerState {
    /// Create new state
    pub fn new() -> Self {
        Self {
            scroll_offset: 0,
            selected_index: None,
            follow_tail: true,
        }
    }

    /// Scroll up
    pub fn scroll_up(&mut self, lines: usize) {
        self.scroll_offset = self.scroll_offset.saturating_sub(lines);
        self.follow_tail = false;
    }

    /// Scroll down
    pub fn scroll_down(&mut self, lines: usize, max_entries: usize) {
        self.scroll_offset = (self.scroll_offset + lines).min(max_entries);
    }

    /// Jump to top
    pub fn jump_to_top(&mut self) {
        self.scroll_offset = 0;
        self.follow_tail = false;
    }

    /// Jump to bottom
    pub fn jump_to_bottom(&mut self, max_entries: usize) {
        self.scroll_offset = max_entries;
        self.follow_tail = true;
    }

    /// Select entry
    pub fn select(&mut self, index: Option<usize>) {
        self.selected_index = index;
    }
}

impl Default for LogViewerState {
    fn default() -> Self {
        Self::new()
    }
}

/// Log viewer filter
#[derive(Debug, Clone)]
pub struct LogFilter {
    pub min_level: LogLevel,
    pub sources: Option<Vec<String>>,
    pub search_query: Option<String>,
}

impl LogFilter {
    /// Create filter showing all logs
    pub fn all() -> Self {
        Self {
            min_level: LogLevel::Trace,
            sources: None,
            search_query: None,
        }
    }

    /// Filter by minimum level
    pub fn min_level(mut self, level: LogLevel) -> Self {
        self.min_level = level;
        self
    }

    /// Filter by sources
    pub fn sources(mut self, sources: Vec<String>) -> Self {
        self.sources = Some(sources);
        self
    }

    /// Filter by search query
    pub fn search(mut self, query: String) -> Self {
        self.search_query = Some(query);
        self
    }

    /// Check if entry passes filter
    pub fn matches(&self, entry: &LogEntry) -> bool {
        // Check level
        if entry.level < self.min_level {
            return false;
        }

        // Check source
        if let Some(ref sources) = self.sources {
            if !sources.contains(&entry.source) {
                return false;
            }
        }

        // Check search query
        if let Some(ref query) = self.search_query {
            let query_lower = query.to_lowercase();
            if !entry.message.to_lowercase().contains(&query_lower)
                && !entry.source.to_lowercase().contains(&query_lower)
            {
                return false;
            }
        }

        true
    }
}

/// Log Viewer widget
pub struct LogViewer {
    entries: VecDeque<LogEntry>,
    filter: LogFilter,
    max_entries: usize,
    block: Option<Block<'static>>,
}

impl LogViewer {
    /// Create new log viewer
    pub fn new() -> Self {
        Self {
            entries: VecDeque::new(),
            filter: LogFilter::all(),
            max_entries: 1000,
            block: None,
        }
    }

    /// Set entries
    pub fn entries(mut self, entries: VecDeque<LogEntry>) -> Self {
        self.entries = entries;
        self
    }

    /// Set filter
    pub fn filter(mut self, filter: LogFilter) -> Self {
        self.filter = filter;
        self
    }

    /// Set max entries
    pub fn max_entries(mut self, max: usize) -> Self {
        self.max_entries = max;
        self
    }

    /// Set border block
    pub fn block(mut self, block: Block<'static>) -> Self {
        self.block = Some(block);
        self
    }

    /// Add log entry
    pub fn add_entry(&mut self, entry: LogEntry) {
        self.entries.push_back(entry);
        if self.entries.len() > self.max_entries {
            self.entries.pop_front();
        }
    }

    /// Clear all entries
    pub fn clear(&mut self) {
        self.entries.clear();
    }

    /// Get filtered entries
    fn filtered_entries(&self) -> Vec<&LogEntry> {
        self.entries
            .iter()
            .filter(|entry| self.filter.matches(entry))
            .collect()
    }
}

impl Default for LogViewer {
    fn default() -> Self {
        Self::new()
    }
}

impl StatefulWidget for LogViewer {
    type State = LogViewerState;

    fn render(self, area: Rect, buf: &mut Buffer, state: &mut Self::State) {
        let filtered = self.filtered_entries();

        // Auto-scroll to bottom if following tail
        if state.follow_tail {
            let visible_height = if self.block.is_some() {
                area.height.saturating_sub(2) as usize
            } else {
                area.height as usize
            };
            state.scroll_offset = filtered.len().saturating_sub(visible_height);
        }

        // Create list items
        let items: Vec<ListItem> = filtered
            .iter()
            .skip(state.scroll_offset)
            .map(|entry| ListItem::new(entry.format_line()))
            .collect();

        // Create list widget
        let mut list = List::new(items);

        if let Some(block) = self.block {
            list = list.block(block);
        }

        if let Some(selected) = state.selected_index {
            list = list.highlight_style(
                Style::default()
                    .bg(Color::DarkGray)
                    .add_modifier(Modifier::BOLD),
            );
            list = list.highlight_symbol("▶ ");
        }

        Widget::render(list, area, buf);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_level_ordering() {
        assert!(LogLevel::Trace < LogLevel::Debug);
        assert!(LogLevel::Debug < LogLevel::Info);
        assert!(LogLevel::Info < LogLevel::Warn);
        assert!(LogLevel::Warn < LogLevel::Error);
    }

    #[test]
    fn test_log_filter() {
        let entry = LogEntry::new(LogLevel::Info, "test".to_string(), "message".to_string());

        let filter = LogFilter::all();
        assert!(filter.matches(&entry));

        let filter = LogFilter::all().min_level(LogLevel::Warn);
        assert!(!filter.matches(&entry));
    }

    #[test]
    fn test_log_viewer_max_entries() {
        let mut viewer = LogViewer::new().max_entries(3);
        viewer.add_entry(LogEntry::new(
            LogLevel::Info,
            "A".to_string(),
            "1".to_string(),
        ));
        viewer.add_entry(LogEntry::new(
            LogLevel::Info,
            "A".to_string(),
            "2".to_string(),
        ));
        viewer.add_entry(LogEntry::new(
            LogLevel::Info,
            "A".to_string(),
            "3".to_string(),
        ));
        viewer.add_entry(LogEntry::new(
            LogLevel::Info,
            "A".to_string(),
            "4".to_string(),
        ));

        assert_eq!(viewer.entries.len(), 3);
    }
}
