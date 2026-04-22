//! Keyboard Event Handling
//!
//! Modal-aware keyboard input processing for vim-style navigation.

use crossterm::event::{KeyCode, KeyEvent as CrosstermKeyEvent, KeyModifiers};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Keyboard event with modal awareness
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct KeyEvent {
    /// The key code
    pub code: KeyCode,
    /// Modifier keys (Ctrl, Alt, Shift)
    pub modifiers: ModifierKeys,
    /// Current modal context
    pub mode: InputMode,
}

impl KeyEvent {
    /// Create a new keyboard event
    pub fn new(code: KeyCode, modifiers: ModifierKeys, mode: InputMode) -> Self {
        Self {
            code,
            modifiers,
            mode,
        }
    }

    /// Create from crossterm event
    pub fn from_crossterm(event: CrosstermKeyEvent, mode: InputMode) -> Self {
        Self {
            code: event.code,
            modifiers: ModifierKeys::from_crossterm(event.modifiers),
            mode,
        }
    }

    /// Check if key matches a binding
    pub fn matches(&self, binding: &KeyBinding) -> bool {
        self.code == binding.key
            && self.modifiers == binding.modifiers
            && (binding.mode.is_none() || binding.mode == Some(self.mode))
    }
}

/// Modifier keys state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
pub struct ModifierKeys {
    /// Control key
    pub ctrl: bool,
    /// Alt/Option key
    pub alt: bool,
    /// Shift key
    pub shift: bool,
    /// Super/Command key
    pub super_key: bool,
}

impl ModifierKeys {
    /// No modifiers
    pub const NONE: Self = Self {
        ctrl: false,
        alt: false,
        shift: false,
        super_key: false,
    };

    /// Only Ctrl
    pub const CTRL: Self = Self {
        ctrl: true,
        alt: false,
        shift: false,
        super_key: false,
    };

    /// Only Alt
    pub const ALT: Self = Self {
        ctrl: false,
        alt: true,
        shift: false,
        super_key: false,
    };

    /// Only Shift
    pub const SHIFT: Self = Self {
        ctrl: false,
        alt: false,
        shift: true,
        super_key: false,
    };

    /// Create from crossterm modifiers
    pub fn from_crossterm(mods: KeyModifiers) -> Self {
        Self {
            ctrl: mods.contains(KeyModifiers::CONTROL),
            alt: mods.contains(KeyModifiers::ALT),
            shift: mods.contains(KeyModifiers::SHIFT),
            super_key: mods.contains(KeyModifiers::SUPER),
        }
    }

    /// Check if any modifier is pressed
    pub fn is_empty(&self) -> bool {
        !self.ctrl && !self.alt && !self.shift && !self.super_key
    }
}

/// Input mode (vim-style modal editing)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum InputMode {
    /// Normal mode (navigation, commands)
    Normal,
    /// Insert mode (text input)
    Insert,
    /// Visual mode (selection)
    Visual,
    /// Command mode (ex-style commands)
    Command,
}

impl Default for InputMode {
    fn default() -> Self {
        Self::Normal
    }
}

/// Key binding configuration
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KeyBinding {
    /// Key code
    pub key: KeyCode,
    /// Required modifiers
    pub modifiers: ModifierKeys,
    /// Active in specific mode (None = all modes)
    pub mode: Option<InputMode>,
    /// Action identifier
    pub action: String,
    /// Human-readable description
    pub description: String,
}

impl KeyBinding {
    /// Create a new key binding
    pub fn new(
        key: KeyCode,
        modifiers: ModifierKeys,
        action: impl Into<String>,
        description: impl Into<String>,
    ) -> Self {
        Self {
            key,
            modifiers,
            mode: None,
            action: action.into(),
            description: description.into(),
        }
    }

    /// Set mode restriction
    pub fn mode(mut self, mode: InputMode) -> Self {
        self.mode = Some(mode);
        self
    }
}

/// Key handler for processing keyboard events
pub struct KeyHandler {
    /// Registered key bindings
    bindings: HashMap<String, KeyBinding>,
    /// Current input mode
    mode: InputMode,
}

impl KeyHandler {
    /// Create a new key handler
    pub fn new() -> Self {
        Self {
            bindings: HashMap::new(),
            mode: InputMode::Normal,
        }
    }

    /// Register a key binding
    pub fn register(&mut self, binding: KeyBinding) {
        self.bindings.insert(binding.action.clone(), binding);
    }

    /// Register multiple bindings
    pub fn register_all(&mut self, bindings: impl IntoIterator<Item = KeyBinding>) {
        for binding in bindings {
            self.register(binding);
        }
    }

    /// Get current input mode
    pub fn mode(&self) -> InputMode {
        self.mode
    }

    /// Set input mode
    pub fn set_mode(&mut self, mode: InputMode) {
        self.mode = mode;
    }

    /// Process a key event and return matched action
    pub fn handle(&self, event: KeyEvent) -> Option<String> {
        self.bindings
            .values()
            .find(|binding| event.matches(binding))
            .map(|binding| binding.action.clone())
    }

    /// Get all bindings for current mode
    pub fn bindings_for_mode(&self, mode: InputMode) -> Vec<&KeyBinding> {
        self.bindings
            .values()
            .filter(|b| b.mode.is_none() || b.mode == Some(mode))
            .collect()
    }

    /// Load default vim-style bindings
    pub fn load_vim_bindings(&mut self) {
        use KeyCode::*;

        // Normal mode navigation
        let nav_bindings = vec![
            KeyBinding::new(Char('h'), ModifierKeys::NONE, "move_left", "Move left")
                .mode(InputMode::Normal),
            KeyBinding::new(Char('j'), ModifierKeys::NONE, "move_down", "Move down")
                .mode(InputMode::Normal),
            KeyBinding::new(Char('k'), ModifierKeys::NONE, "move_up", "Move up")
                .mode(InputMode::Normal),
            KeyBinding::new(Char('l'), ModifierKeys::NONE, "move_right", "Move right")
                .mode(InputMode::Normal),
            KeyBinding::new(Char('g'), ModifierKeys::NONE, "goto_top", "Go to top")
                .mode(InputMode::Normal),
            KeyBinding::new(Char('G'), ModifierKeys::SHIFT, "goto_bottom", "Go to bottom")
                .mode(InputMode::Normal),
        ];

        // Mode switching
        let mode_bindings = vec![
            KeyBinding::new(Char('i'), ModifierKeys::NONE, "enter_insert", "Enter insert mode")
                .mode(InputMode::Normal),
            KeyBinding::new(Char('v'), ModifierKeys::NONE, "enter_visual", "Enter visual mode")
                .mode(InputMode::Normal),
            KeyBinding::new(Char(':'), ModifierKeys::NONE, "enter_command", "Enter command mode")
                .mode(InputMode::Normal),
            KeyBinding::new(Esc, ModifierKeys::NONE, "enter_normal", "Enter normal mode"),
        ];

        // Global actions
        let global_bindings = vec![
            KeyBinding::new(Char('q'), ModifierKeys::NONE, "quit", "Quit")
                .mode(InputMode::Normal),
            KeyBinding::new(Char('c'), ModifierKeys::CTRL, "interrupt", "Interrupt"),
            KeyBinding::new(Char('d'), ModifierKeys::CTRL, "page_down", "Page down"),
            KeyBinding::new(Char('u'), ModifierKeys::CTRL, "page_up", "Page up"),
        ];

        self.register_all(nav_bindings);
        self.register_all(mode_bindings);
        self.register_all(global_bindings);
    }
}

impl Default for KeyHandler {
    fn default() -> Self {
        let mut handler = Self::new();
        handler.load_vim_bindings();
        handler
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_modifier_keys() {
        let none = ModifierKeys::NONE;
        assert!(none.is_empty());

        let ctrl = ModifierKeys::CTRL;
        assert!(ctrl.ctrl);
        assert!(!ctrl.is_empty());
    }

    #[test]
    fn test_key_binding_match() {
        let binding = KeyBinding::new(
            KeyCode::Char('h'),
            ModifierKeys::NONE,
            "move_left",
            "Move left",
        )
        .mode(InputMode::Normal);

        let event = KeyEvent::new(KeyCode::Char('h'), ModifierKeys::NONE, InputMode::Normal);
        assert!(event.matches(&binding));

        let wrong_mode = KeyEvent::new(KeyCode::Char('h'), ModifierKeys::NONE, InputMode::Insert);
        assert!(!wrong_mode.matches(&binding));
    }

    #[test]
    fn test_key_handler() {
        let mut handler = KeyHandler::new();
        let binding = KeyBinding::new(
            KeyCode::Char('q'),
            ModifierKeys::NONE,
            "quit",
            "Quit application",
        );
        handler.register(binding);

        let event = KeyEvent::new(KeyCode::Char('q'), ModifierKeys::NONE, InputMode::Normal);
        let action = handler.handle(event);
        assert_eq!(action, Some("quit".to_string()));
    }

    #[test]
    fn test_vim_bindings() {
        let handler = KeyHandler::default();
        let event = KeyEvent::new(KeyCode::Char('j'), ModifierKeys::NONE, InputMode::Normal);
        let action = handler.handle(event);
        assert_eq!(action, Some("move_down".to_string()));
    }
}
