//! Keyboard Event Tests
//!
//! Tests for modal-aware keyboard input handling.

use crossterm::event::{KeyCode, KeyEvent as CrosstermKeyEvent, KeyModifiers};
use flow_orchestrator_tui::events::{
    InputMode, KeyBinding, KeyEvent, KeyHandler, ModifierKeys,
};

#[test]
fn test_modifier_keys_constants() {
    assert!(ModifierKeys::NONE.is_empty());
    assert!(ModifierKeys::CTRL.ctrl);
    assert!(!ModifierKeys::CTRL.alt);
    assert!(ModifierKeys::ALT.alt);
    assert!(!ModifierKeys::ALT.ctrl);
    assert!(ModifierKeys::SHIFT.shift);
    assert!(!ModifierKeys::SHIFT.ctrl);
}

#[test]
fn test_modifier_keys_from_crossterm() {
    let crossterm_mods = KeyModifiers::CONTROL | KeyModifiers::SHIFT;
    let mods = ModifierKeys::from_crossterm(crossterm_mods);

    assert!(mods.ctrl);
    assert!(mods.shift);
    assert!(!mods.alt);
    assert!(!mods.super_key);
}

#[test]
fn test_modifier_keys_is_empty() {
    let empty = ModifierKeys::NONE;
    assert!(empty.is_empty());

    let ctrl = ModifierKeys::CTRL;
    assert!(!ctrl.is_empty());

    let multiple = ModifierKeys {
        ctrl: true,
        alt: true,
        shift: false,
        super_key: false,
    };
    assert!(!multiple.is_empty());
}

#[test]
fn test_modifier_keys_equality() {
    let mods1 = ModifierKeys::CTRL;
    let mods2 = ModifierKeys {
        ctrl: true,
        alt: false,
        shift: false,
        super_key: false,
    };
    assert_eq!(mods1, mods2);
}

#[test]
fn test_input_mode_default() {
    assert_eq!(InputMode::default(), InputMode::Normal);
}

#[test]
fn test_key_event_creation() {
    let event = KeyEvent::new(
        KeyCode::Char('h'),
        ModifierKeys::NONE,
        InputMode::Normal,
    );

    assert_eq!(event.code, KeyCode::Char('h'));
    assert_eq!(event.modifiers, ModifierKeys::NONE);
    assert_eq!(event.mode, InputMode::Normal);
}

#[test]
fn test_key_event_from_crossterm() {
    let crossterm_event = CrosstermKeyEvent::new(
        KeyCode::Char('j'),
        KeyModifiers::CONTROL,
    );

    let event = KeyEvent::from_crossterm(crossterm_event, InputMode::Normal);

    assert_eq!(event.code, KeyCode::Char('j'));
    assert!(event.modifiers.ctrl);
    assert_eq!(event.mode, InputMode::Normal);
}

#[test]
fn test_key_binding_creation() {
    let binding = KeyBinding::new(
        KeyCode::Char('q'),
        ModifierKeys::NONE,
        "quit",
        "Quit application",
    );

    assert_eq!(binding.key, KeyCode::Char('q'));
    assert_eq!(binding.modifiers, ModifierKeys::NONE);
    assert_eq!(binding.action, "quit");
    assert_eq!(binding.description, "Quit application");
    assert!(binding.mode.is_none());
}

#[test]
fn test_key_binding_with_mode() {
    let binding = KeyBinding::new(
        KeyCode::Char('i'),
        ModifierKeys::NONE,
        "insert",
        "Enter insert mode",
    )
    .mode(InputMode::Normal);

    assert_eq!(binding.mode, Some(InputMode::Normal));
}

#[test]
fn test_key_event_matches_binding() {
    let binding = KeyBinding::new(
        KeyCode::Char('h'),
        ModifierKeys::NONE,
        "move_left",
        "Move left",
    )
    .mode(InputMode::Normal);

    // Exact match
    let event = KeyEvent::new(
        KeyCode::Char('h'),
        ModifierKeys::NONE,
        InputMode::Normal,
    );
    assert!(event.matches(&binding));

    // Wrong key
    let wrong_key = KeyEvent::new(
        KeyCode::Char('j'),
        ModifierKeys::NONE,
        InputMode::Normal,
    );
    assert!(!wrong_key.matches(&binding));

    // Wrong modifier
    let wrong_mod = KeyEvent::new(
        KeyCode::Char('h'),
        ModifierKeys::CTRL,
        InputMode::Normal,
    );
    assert!(!wrong_mod.matches(&binding));

    // Wrong mode
    let wrong_mode = KeyEvent::new(
        KeyCode::Char('h'),
        ModifierKeys::NONE,
        InputMode::Insert,
    );
    assert!(!wrong_mode.matches(&binding));
}

#[test]
fn test_key_event_matches_binding_no_mode_restriction() {
    let binding = KeyBinding::new(
        KeyCode::Esc,
        ModifierKeys::NONE,
        "escape",
        "Escape",
    );
    // No mode set, should match in any mode

    let normal = KeyEvent::new(KeyCode::Esc, ModifierKeys::NONE, InputMode::Normal);
    assert!(normal.matches(&binding));

    let insert = KeyEvent::new(KeyCode::Esc, ModifierKeys::NONE, InputMode::Insert);
    assert!(insert.matches(&binding));

    let visual = KeyEvent::new(KeyCode::Esc, ModifierKeys::NONE, InputMode::Visual);
    assert!(visual.matches(&binding));
}

#[test]
fn test_key_handler_creation() {
    let handler = KeyHandler::new();
    assert_eq!(handler.mode(), InputMode::Normal);
}

#[test]
fn test_key_handler_set_mode() {
    let mut handler = KeyHandler::new();
    handler.set_mode(InputMode::Insert);
    assert_eq!(handler.mode(), InputMode::Insert);
}

#[test]
fn test_key_handler_register() {
    let mut handler = KeyHandler::new();

    let binding = KeyBinding::new(
        KeyCode::Char('q'),
        ModifierKeys::NONE,
        "quit",
        "Quit",
    );
    handler.register(binding);

    let event = KeyEvent::new(KeyCode::Char('q'), ModifierKeys::NONE, InputMode::Normal);
    let action = handler.handle(event);
    assert_eq!(action, Some("quit".to_string()));
}

#[test]
fn test_key_handler_no_match() {
    let handler = KeyHandler::new();

    let event = KeyEvent::new(KeyCode::Char('z'), ModifierKeys::NONE, InputMode::Normal);
    let action = handler.handle(event);
    assert_eq!(action, None);
}

#[test]
fn test_key_handler_multiple_bindings() {
    let mut handler = KeyHandler::new();

    handler.register(KeyBinding::new(
        KeyCode::Char('q'),
        ModifierKeys::NONE,
        "quit",
        "Quit",
    ));
    handler.register(KeyBinding::new(
        KeyCode::Char('s'),
        ModifierKeys::CTRL,
        "save",
        "Save",
    ));

    let event1 = KeyEvent::new(KeyCode::Char('q'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(event1), Some("quit".to_string()));

    let event2 = KeyEvent::new(KeyCode::Char('s'), ModifierKeys::CTRL, InputMode::Normal);
    assert_eq!(handler.handle(event2), Some("save".to_string()));
}

#[test]
fn test_key_handler_mode_specific_bindings() {
    let mut handler = KeyHandler::new();

    handler.register(
        KeyBinding::new(KeyCode::Char('i'), ModifierKeys::NONE, "insert", "Insert")
            .mode(InputMode::Normal),
    );

    // Should match in Normal mode
    let normal_event = KeyEvent::new(
        KeyCode::Char('i'),
        ModifierKeys::NONE,
        InputMode::Normal,
    );
    assert_eq!(handler.handle(normal_event), Some("insert".to_string()));

    // Should not match in Insert mode
    let insert_event = KeyEvent::new(
        KeyCode::Char('i'),
        ModifierKeys::NONE,
        InputMode::Insert,
    );
    assert_eq!(handler.handle(insert_event), None);
}

#[test]
fn test_key_handler_bindings_for_mode() {
    let mut handler = KeyHandler::new();

    handler.register(
        KeyBinding::new(KeyCode::Char('h'), ModifierKeys::NONE, "left", "Left")
            .mode(InputMode::Normal),
    );
    handler.register(
        KeyBinding::new(KeyCode::Char('i'), ModifierKeys::NONE, "insert", "Insert")
            .mode(InputMode::Normal),
    );
    handler.register(KeyBinding::new(
        KeyCode::Esc,
        ModifierKeys::NONE,
        "escape",
        "Escape",
    )); // All modes

    let normal_bindings = handler.bindings_for_mode(InputMode::Normal);
    assert_eq!(normal_bindings.len(), 3); // h, i, Esc

    let insert_bindings = handler.bindings_for_mode(InputMode::Insert);
    assert_eq!(insert_bindings.len(), 1); // Only Esc
}

#[test]
fn test_key_handler_vim_bindings() {
    let mut handler = KeyHandler::new();
    handler.load_vim_bindings();

    // Navigation
    let h = KeyEvent::new(KeyCode::Char('h'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(h), Some("move_left".to_string()));

    let j = KeyEvent::new(KeyCode::Char('j'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(j), Some("move_down".to_string()));

    let k = KeyEvent::new(KeyCode::Char('k'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(k), Some("move_up".to_string()));

    let l = KeyEvent::new(KeyCode::Char('l'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(l), Some("move_right".to_string()));

    // Mode switching
    let i = KeyEvent::new(KeyCode::Char('i'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(i), Some("enter_insert".to_string()));

    let v = KeyEvent::new(KeyCode::Char('v'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(v), Some("enter_visual".to_string()));

    let colon = KeyEvent::new(KeyCode::Char(':'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(colon), Some("enter_command".to_string()));

    // Global bindings
    let esc = KeyEvent::new(KeyCode::Esc, ModifierKeys::NONE, InputMode::Insert);
    assert_eq!(handler.handle(esc), Some("enter_normal".to_string()));

    let ctrl_c = KeyEvent::new(KeyCode::Char('c'), ModifierKeys::CTRL, InputMode::Normal);
    assert_eq!(handler.handle(ctrl_c), Some("interrupt".to_string()));
}

#[test]
fn test_key_handler_default_loads_vim() {
    let handler = KeyHandler::default();

    let j = KeyEvent::new(KeyCode::Char('j'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(j), Some("move_down".to_string()));
}

#[test]
fn test_key_handler_register_all() {
    let mut handler = KeyHandler::new();

    let bindings = vec![
        KeyBinding::new(KeyCode::Char('a'), ModifierKeys::NONE, "a", "A"),
        KeyBinding::new(KeyCode::Char('b'), ModifierKeys::NONE, "b", "B"),
        KeyBinding::new(KeyCode::Char('c'), ModifierKeys::NONE, "c", "C"),
    ];

    handler.register_all(bindings);

    let event_a = KeyEvent::new(KeyCode::Char('a'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(event_a), Some("a".to_string()));

    let event_b = KeyEvent::new(KeyCode::Char('b'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(event_b), Some("b".to_string()));

    let event_c = KeyEvent::new(KeyCode::Char('c'), ModifierKeys::NONE, InputMode::Normal);
    assert_eq!(handler.handle(event_c), Some("c".to_string()));
}

#[test]
fn test_shift_modifier_key_binding() {
    let binding = KeyBinding::new(
        KeyCode::Char('G'),
        ModifierKeys::SHIFT,
        "goto_bottom",
        "Go to bottom",
    );

    let event = KeyEvent::new(KeyCode::Char('G'), ModifierKeys::SHIFT, InputMode::Normal);
    assert!(event.matches(&binding));

    // Without shift should not match
    let no_shift = KeyEvent::new(KeyCode::Char('G'), ModifierKeys::NONE, InputMode::Normal);
    assert!(!no_shift.matches(&binding));
}

#[test]
fn test_complex_modifier_combinations() {
    let binding = KeyBinding::new(
        KeyCode::Char('s'),
        ModifierKeys {
            ctrl: true,
            shift: true,
            alt: false,
            super_key: false,
        },
        "save_all",
        "Save all",
    );

    let event = KeyEvent::new(
        KeyCode::Char('s'),
        ModifierKeys {
            ctrl: true,
            shift: true,
            alt: false,
            super_key: false,
        },
        InputMode::Normal,
    );
    assert!(event.matches(&binding));

    // Missing shift
    let missing_shift = KeyEvent::new(
        KeyCode::Char('s'),
        ModifierKeys::CTRL,
        InputMode::Normal,
    );
    assert!(!missing_shift.matches(&binding));
}
