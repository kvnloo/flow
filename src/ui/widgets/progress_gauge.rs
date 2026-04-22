// Progress Gauge Widget
//
// XP-style progress bar with customizable colors and animation support.

use ratatui::{
    buffer::Buffer,
    layout::Rect,
    style::{Color, Style},
    widgets::{Block, Gauge, Widget},
};

/// Color scheme for progress gauge
#[derive(Debug, Clone, Copy)]
pub enum ColorScheme {
    /// Bright green (XP style)
    XP,
    /// Yellow/orange (warning)
    Warning,
    /// Red (danger/critical)
    Danger,
    /// Cyan (info)
    Info,
    /// Custom RGB colors
    Custom { fg: Color, bg: Color },
}

impl ColorScheme {
    /// Get foreground color
    pub fn fg_color(&self) -> Color {
        match self {
            Self::XP => Color::Rgb(50, 255, 50),
            Self::Warning => Color::Rgb(255, 200, 50),
            Self::Danger => Color::Rgb(255, 50, 50),
            Self::Info => Color::Rgb(100, 200, 255),
            Self::Custom { fg, .. } => *fg,
        }
    }

    /// Get background color
    pub fn bg_color(&self) -> Color {
        match self {
            Self::XP => Color::Rgb(20, 20, 20),
            Self::Warning => Color::Rgb(40, 30, 0),
            Self::Danger => Color::Rgb(40, 0, 0),
            Self::Info => Color::Rgb(0, 20, 40),
            Self::Custom { bg, .. } => *bg,
        }
    }
}

/// Progress Gauge widget
pub struct ProgressGauge {
    current: u32,
    total: u32,
    label: String,
    color_scheme: ColorScheme,
    show_percentage: bool,
    show_label: bool,
    block: Option<Block<'static>>,
}

impl ProgressGauge {
    /// Create new progress gauge
    pub fn new(current: u32, total: u32) -> Self {
        Self {
            current,
            total,
            label: String::new(),
            color_scheme: ColorScheme::XP,
            show_percentage: true,
            show_label: false,
            block: None,
        }
    }

    /// Set label text
    pub fn label<S: Into<String>>(mut self, label: S) -> Self {
        self.label = label.into();
        self.show_label = true;
        self
    }

    /// Set color scheme
    pub fn color_scheme(mut self, scheme: ColorScheme) -> Self {
        self.color_scheme = scheme;
        self
    }

    /// Set whether to show percentage
    pub fn show_percentage(mut self, show: bool) -> Self {
        self.show_percentage = show;
        self
    }

    /// Set border block
    pub fn block(mut self, block: Block<'static>) -> Self {
        self.block = Some(block);
        self
    }

    /// Calculate percentage
    fn percentage(&self) -> u16 {
        if self.total == 0 {
            0
        } else {
            ((self.current as f64 / self.total as f64) * 100.0) as u16
        }
    }

    /// Generate gauge label
    fn gauge_label(&self) -> String {
        let pct = self.percentage();

        if self.show_label && !self.label.is_empty() {
            if self.show_percentage {
                format!("{} - {}% ({}/{})", self.label, pct, self.current, self.total)
            } else {
                format!("{} ({}/{})", self.label, self.current, self.total)
            }
        } else if self.show_percentage {
            format!("{}% ({}/{})", pct, self.current, self.total)
        } else {
            format!("{}/{}", self.current, self.total)
        }
    }
}

impl Widget for ProgressGauge {
    fn render(self, area: Rect, buf: &mut Buffer) {
        let percentage = self.percentage();
        let label = self.gauge_label();

        let gauge_style = Style::default()
            .fg(self.color_scheme.fg_color())
            .bg(self.color_scheme.bg_color());

        let mut gauge = Gauge::default()
            .gauge_style(gauge_style)
            .percent(percentage)
            .label(label);

        if let Some(block) = self.block {
            gauge = gauge.block(block);
        }

        gauge.render(area, buf);
    }
}

/// Builder for creating multiple progress gauges
pub struct ProgressGaugeBuilder {
    color_scheme: ColorScheme,
    show_percentage: bool,
}

impl ProgressGaugeBuilder {
    /// Create new builder with default settings
    pub fn new() -> Self {
        Self {
            color_scheme: ColorScheme::XP,
            show_percentage: true,
        }
    }

    /// Set default color scheme
    pub fn color_scheme(mut self, scheme: ColorScheme) -> Self {
        self.color_scheme = scheme;
        self
    }

    /// Set default show percentage
    pub fn show_percentage(mut self, show: bool) -> Self {
        self.show_percentage = show;
        self
    }

    /// Build a gauge with these defaults
    pub fn build(&self, current: u32, total: u32) -> ProgressGauge {
        ProgressGauge::new(current, total)
            .color_scheme(self.color_scheme)
            .show_percentage(self.show_percentage)
    }
}

impl Default for ProgressGaugeBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_percentage_calculation() {
        let gauge = ProgressGauge::new(75, 100);
        assert_eq!(gauge.percentage(), 75);
    }

    #[test]
    fn test_percentage_zero_total() {
        let gauge = ProgressGauge::new(0, 0);
        assert_eq!(gauge.percentage(), 0);
    }

    #[test]
    fn test_color_schemes() {
        assert_eq!(ColorScheme::XP.fg_color(), Color::Rgb(50, 255, 50));
        assert_eq!(ColorScheme::Warning.fg_color(), Color::Rgb(255, 200, 50));
        assert_eq!(ColorScheme::Danger.fg_color(), Color::Rgb(255, 50, 50));
    }

    #[test]
    fn test_label_generation() {
        let gauge = ProgressGauge::new(50, 100).label("Loading");
        let label = gauge.gauge_label();
        assert!(label.contains("Loading"));
        assert!(label.contains("50%"));
    }
}
