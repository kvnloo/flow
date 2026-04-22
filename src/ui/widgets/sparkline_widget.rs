// Sparkline Widget
//
// Mini time-series chart for displaying metrics history in compact form.

use ratatui::{
    buffer::Buffer,
    layout::Rect,
    style::{Color, Style},
    widgets::{Block, Sparkline, Widget},
};

/// Sparkline widget wrapper with enhanced features
pub struct SparklineWidget {
    data: Vec<u64>,
    max_value: Option<u64>,
    color: Color,
    block: Option<Block<'static>>,
    show_max: bool,
}

impl SparklineWidget {
    /// Create new sparkline widget
    pub fn new(data: Vec<u64>) -> Self {
        Self {
            data,
            max_value: None,
            color: Color::Cyan,
            block: None,
            show_max: false,
        }
    }

    /// Set explicit max value for scaling
    pub fn max_value(mut self, max: u64) -> Self {
        self.max_value = Some(max);
        self
    }

    /// Set sparkline color
    pub fn color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    /// Set border block
    pub fn block(mut self, block: Block<'static>) -> Self {
        self.block = Some(block);
        self
    }

    /// Show max value indicator
    pub fn show_max(mut self, show: bool) -> Self {
        self.show_max = show;
        self
    }

    /// Calculate actual max value
    fn calculate_max(&self) -> u64 {
        if let Some(max) = self.max_value {
            max
        } else {
            self.data.iter().copied().max().unwrap_or(1)
        }
    }

    /// Get color based on value thresholds
    pub fn threshold_color(value: u64, max: u64) -> Color {
        let ratio = value as f64 / max as f64;
        if ratio >= 0.8 {
            Color::Red
        } else if ratio >= 0.6 {
            Color::Yellow
        } else if ratio >= 0.4 {
            Color::Green
        } else {
            Color::Cyan
        }
    }
}

impl Widget for SparklineWidget {
    fn render(self, area: Rect, buf: &mut Buffer) {
        let max = self.calculate_max();
        let style = Style::default().fg(self.color);

        let mut sparkline = Sparkline::default()
            .data(&self.data)
            .style(style);

        // Set max if specified
        if let Some(max_val) = self.max_value {
            sparkline = sparkline.max(max_val);
        }

        // Add block if specified
        if let Some(block) = self.block {
            sparkline = sparkline.block(block);
        }

        sparkline.render(area, buf);

        // Optionally show max value indicator
        if self.show_max && area.width > 8 {
            let max_text = format!("max: {}", max);
            let x = area.x + area.width - max_text.len() as u16 - 1;
            let y = area.y;
            buf.set_string(x, y, &max_text, Style::default().fg(Color::DarkGray));
        }
    }
}

/// Multi-sparkline widget for showing multiple series
pub struct MultiSparkline {
    series: Vec<(String, Vec<u64>, Color)>,
    max_value: Option<u64>,
    block: Option<Block<'static>>,
}

impl MultiSparkline {
    /// Create new multi-sparkline
    pub fn new() -> Self {
        Self {
            series: Vec::new(),
            max_value: None,
            block: None,
        }
    }

    /// Add a data series
    pub fn series<S: Into<String>>(mut self, label: S, data: Vec<u64>, color: Color) -> Self {
        self.series.push((label.into(), data, color));
        self
    }

    /// Set global max value
    pub fn max_value(mut self, max: u64) -> Self {
        self.max_value = Some(max);
        self
    }

    /// Set border block
    pub fn block(mut self, block: Block<'static>) -> Self {
        self.block = Some(block);
        self
    }

    /// Calculate global max from all series
    fn calculate_max(&self) -> u64 {
        if let Some(max) = self.max_value {
            max
        } else {
            self.series
                .iter()
                .flat_map(|(_, data, _)| data.iter())
                .copied()
                .max()
                .unwrap_or(1)
        }
    }
}

impl Default for MultiSparkline {
    fn default() -> Self {
        Self::new()
    }
}

impl Widget for MultiSparkline {
    fn render(self, area: Rect, buf: &mut Buffer) {
        use ratatui::layout::{Constraint, Layout};

        if self.series.is_empty() {
            return;
        }

        let max = self.calculate_max();

        // Split area for each series
        let series_count = self.series.len();
        let constraints = vec![Constraint::Ratio(1, series_count as u32); series_count];
        let chunks = Layout::vertical(constraints).split(area);

        // Render each series
        for (i, (label, data, color)) in self.series.into_iter().enumerate() {
            let sparkline = Sparkline::default()
                .data(&data)
                .max(max)
                .style(Style::default().fg(color))
                .block(Block::default().title(label));

            sparkline.render(chunks[i], buf);
        }
    }
}

/// Create common sparkline configurations
pub mod presets {
    use super::*;

    /// CPU usage sparkline (green to red gradient)
    pub fn cpu_usage(data: Vec<u64>) -> SparklineWidget {
        SparklineWidget::new(data)
            .max_value(100)
            .color(Color::Green)
            .show_max(true)
    }

    /// Memory usage sparkline
    pub fn memory_usage(data: Vec<u64>) -> SparklineWidget {
        SparklineWidget::new(data)
            .color(Color::Cyan)
            .show_max(true)
    }

    /// Network traffic sparkline
    pub fn network_traffic(data: Vec<u64>) -> SparklineWidget {
        SparklineWidget::new(data)
            .color(Color::Blue)
            .show_max(true)
    }

    /// Error rate sparkline (red)
    pub fn error_rate(data: Vec<u64>) -> SparklineWidget {
        SparklineWidget::new(data)
            .color(Color::Red)
            .show_max(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sparkline_max_calculation() {
        let data = vec![1, 5, 3, 8, 2];
        let widget = SparklineWidget::new(data);
        assert_eq!(widget.calculate_max(), 8);
    }

    #[test]
    fn test_sparkline_explicit_max() {
        let data = vec![1, 5, 3, 8, 2];
        let widget = SparklineWidget::new(data).max_value(100);
        assert_eq!(widget.calculate_max(), 100);
    }

    #[test]
    fn test_threshold_colors() {
        assert_eq!(
            SparklineWidget::threshold_color(90, 100),
            Color::Red
        );
        assert_eq!(
            SparklineWidget::threshold_color(70, 100),
            Color::Yellow
        );
        assert_eq!(
            SparklineWidget::threshold_color(50, 100),
            Color::Green
        );
        assert_eq!(
            SparklineWidget::threshold_color(30, 100),
            Color::Cyan
        );
    }

    #[test]
    fn test_multi_sparkline() {
        let multi = MultiSparkline::new()
            .series("CPU", vec![10, 20, 30], Color::Green)
            .series("Memory", vec![40, 50, 60], Color::Cyan);

        assert_eq!(multi.series.len(), 2);
        assert_eq!(multi.calculate_max(), 60);
    }
}
