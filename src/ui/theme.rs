// Theme and style definitions for Flow Orchestrator TUI
//
// Provides consistent color palette, typography hierarchy, and styling
// across all UI components.

use ratatui::style::{Color, Modifier, Style};

/// Flow Orchestrator color theme
#[derive(Debug, Clone)]
pub struct FlowTheme {
    // Background colors
    pub bg_primary: Color,
    pub bg_secondary: Color,
    pub bg_highlight: Color,

    // Foreground colors
    pub fg_primary: Color,
    pub fg_secondary: Color,
    pub fg_emphasis: Color,

    // Status colors
    pub success: Color,
    pub warning: Color,
    pub error: Color,
    pub info: Color,

    // Agent status colors
    pub agent_idle: Color,
    pub agent_active: Color,
    pub agent_blocked: Color,
    pub agent_error: Color,

    // Accent colors
    pub accent_primary: Color,
    pub accent_secondary: Color,
}

impl Default for FlowTheme {
    fn default() -> Self {
        Self {
            // Dark theme backgrounds
            bg_primary: Color::Rgb(20, 20, 20),
            bg_secondary: Color::Rgb(30, 30, 30),
            bg_highlight: Color::Rgb(50, 50, 60),

            // Light text on dark background
            fg_primary: Color::Rgb(220, 220, 220),
            fg_secondary: Color::Rgb(150, 150, 150),
            fg_emphasis: Color::Rgb(255, 255, 255),

            // Status colors (standard)
            success: Color::Rgb(80, 250, 123),   // Green
            warning: Color::Rgb(255, 184, 108),  // Orange
            error: Color::Rgb(255, 85, 85),      // Red
            info: Color::Rgb(139, 233, 253),     // Cyan

            // Agent-specific status colors
            agent_idle: Color::Rgb(100, 100, 100),      // Gray
            agent_active: Color::Rgb(80, 250, 123),     // Green
            agent_blocked: Color::Rgb(255, 184, 108),   // Orange
            agent_error: Color::Rgb(255, 85, 85),       // Red

            // Accent colors for highlights
            accent_primary: Color::Rgb(139, 233, 253),   // Cyan
            accent_secondary: Color::Rgb(255, 121, 198), // Magenta
        }
    }
}

impl FlowTheme {
    /// Create a light theme variant
    pub fn light() -> Self {
        Self {
            bg_primary: Color::Rgb(250, 250, 250),
            bg_secondary: Color::Rgb(240, 240, 240),
            bg_highlight: Color::Rgb(220, 220, 230),

            fg_primary: Color::Rgb(40, 40, 40),
            fg_secondary: Color::Rgb(100, 100, 100),
            fg_emphasis: Color::Rgb(0, 0, 0),

            // Keep status colors similar but adjusted for light bg
            success: Color::Rgb(34, 139, 34),
            warning: Color::Rgb(218, 112, 0),
            error: Color::Rgb(220, 20, 60),
            info: Color::Rgb(0, 128, 255),

            agent_idle: Color::Rgb(128, 128, 128),
            agent_active: Color::Rgb(34, 139, 34),
            agent_blocked: Color::Rgb(218, 112, 0),
            agent_error: Color::Rgb(220, 20, 60),

            accent_primary: Color::Rgb(0, 128, 255),
            accent_secondary: Color::Rgb(138, 43, 226),
        }
    }

    /// Get style for agent status
    pub fn agent_status_style(&self, status: &str) -> Style {
        let color = match status.to_lowercase().as_str() {
            "idle" => self.agent_idle,
            "active" => self.agent_active,
            "blocked" => self.agent_blocked,
            "error" => self.agent_error,
            _ => self.fg_secondary,
        };
        Style::default().fg(color)
    }
}

/// Typography and text style hierarchy
pub struct StyleGuide {
    pub heading_1: Style,
    pub heading_2: Style,
    pub heading_3: Style,
    pub body: Style,
    pub code: Style,
    pub muted: Style,
    pub emphasis: Style,
}

impl StyleGuide {
    /// Create style guide from theme
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

            body: Style::default().fg(theme.fg_primary),

            code: Style::default()
                .fg(theme.accent_primary)
                .bg(theme.bg_secondary),

            muted: Style::default().fg(theme.fg_secondary),

            emphasis: Style::default()
                .fg(theme.fg_emphasis)
                .add_modifier(Modifier::BOLD),
        }
    }
}

/// Border style variants
#[derive(Debug, Clone, Copy)]
pub enum BorderStyle {
    Solid,
    Rounded,
    Double,
    Thick,
}

impl BorderStyle {
    /// Convert to Ratatui border type
    pub fn to_ratatui(&self) -> ratatui::widgets::BorderType {
        match self {
            Self::Solid => ratatui::widgets::BorderType::Plain,
            Self::Rounded => ratatui::widgets::BorderType::Rounded,
            Self::Double => ratatui::widgets::BorderType::Double,
            Self::Thick => ratatui::widgets::BorderType::Thick,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_theme() {
        let theme = FlowTheme::default();
        assert_eq!(theme.bg_primary, Color::Rgb(20, 20, 20));
    }

    #[test]
    fn test_light_theme() {
        let theme = FlowTheme::light();
        assert_eq!(theme.bg_primary, Color::Rgb(250, 250, 250));
    }

    #[test]
    fn test_agent_status_style() {
        let theme = FlowTheme::default();
        let style = theme.agent_status_style("active");
        assert_eq!(style.fg, Some(theme.agent_active));
    }
}
