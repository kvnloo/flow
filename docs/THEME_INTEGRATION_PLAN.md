# Theme Integration Plan for Dashboard Implementations

**Date:** 2025-11-25
**Status:** 📋 Planning Phase
**Goal:** Replace hardcoded colors in dashboards with FlowTheme-based styling

## Current State Analysis

### ✅ Existing Theme System (`src/ui/theme.rs`)
- **FlowTheme** struct with comprehensive color palette
- **StyleGuide** for typography hierarchy
- **BorderStyle** variants
- Dark and Light theme variants
- Agent status color mappings

### ❌ Dashboard Color Usage (Hardcoded)
All 4 dashboards currently use direct `Color::*` constants:
- **overview.rs**: Cyan, Yellow, Green, DarkGray, Magenta
- **flow_view.rs**: Cyan, Green, Yellow, DarkGray
- **metrics.rs**: Cyan, Yellow, Green, DarkGray, Red
- **agent_focus.rs**: Cyan, Yellow, Magenta, DarkGray

## Integration Strategy

### Phase 1: Dashboard Struct Updates
Add `theme` field to each dashboard:
```rust
pub struct OverviewDashboard {
    data: Option<DashboardData>,
    theme: FlowTheme,
    style_guide: StyleGuide,
    // ... existing fields
}
```

### Phase 2: Constructor Updates
Initialize with default or custom theme:
```rust
impl OverviewDashboard {
    pub fn new() -> Self {
        let theme = FlowTheme::default();
        let style_guide = StyleGuide::new(&theme);
        Self {
            theme: theme.clone(),
            style_guide,
            // ... rest
        }
    }

    pub fn with_theme(theme: FlowTheme) -> Self {
        let style_guide = StyleGuide::new(&theme);
        Self {
            theme: theme.clone(),
            style_guide,
            // ...
        }
    }
}
```

### Phase 3: Color Replacement Mapping

#### Primary Colors
| Current Hardcoded | FlowTheme Field | Usage |
|-------------------|----------------|-------|
| `Color::Cyan` | `theme.accent_primary` | Headers, highlights, focused borders |
| `Color::Yellow` | `theme.warning` | Headers, warnings, hotkeys |
| `Color::Green` | `theme.success` | Success states, progress bars |
| `Color::Red` | `theme.error` | Error states, critical alerts |
| `Color::DarkGray` | `theme.fg_secondary` | Muted text, inactive elements |
| `Color::Magenta` | `theme.accent_secondary` | Special highlights |

#### Status Colors (Already Mapped!)
AgentStatus and EventLevel already use theme-compatible colors via their methods.

#### Text Styles
| Current Pattern | StyleGuide Field |
|----------------|------------------|
| Bold headers | `style_guide.heading_2` |
| Emphasized text | `style_guide.emphasis` |
| Body text | `style_guide.body` |
| Muted text | `style_guide.muted` |
| Code-like text | `style_guide.code` |

### Phase 4: Border Styling
Replace hardcoded `BorderType::Rounded` with theme-based selection:
```rust
.border_type(BorderStyle::Rounded.to_ratatui())
```

## Detailed File Changes

### 1. `overview.rs` Updates

**Before:**
```rust
Style::default().fg(Color::Cyan)
```

**After:**
```rust
Style::default().fg(self.theme.accent_primary)
```

**Locations:**
- Line 41: Session header model info → `theme.accent_primary`
- Line 76: Agent grid headers → `theme.warning` (yellow headers)
- Line 82: Selected row background → `theme.bg_highlight`
- Line 157-162: Topology legend → `theme.success`, `theme.accent_primary`, `theme.accent_secondary`
- Line 187: Event level colors → Already using `event.level.color()` ✅
- Line 214: Status bar success → `theme.success`
- Line 222: Command text → `theme.accent_primary`
- Line 225-229: Hotkey hints → `theme.warning`

### 2. `flow_view.rs` Updates

**Before:**
```rust
Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)
```

**After:**
```rust
self.style_guide.heading_1.fg(self.theme.accent_primary)
```

**Locations:**
- Line 46: FLOW VIEW title → `style_guide.heading_1`
- Line 48: Product run name → `theme.success`
- Line 50: Level badge → `theme.warning`
- Line 52: Flow percentage → `theme.success`
- Line 58: Milestone name → `theme.accent_primary`
- Line 62: Risk warning → `theme.warning`
- Line 80-84: Milestone status colors → Custom mapping below
- Line 87: Selected background → `theme.bg_highlight`
- Line 96: Focused border → `theme.accent_primary`
- Line 174-176: Progress gauge → `theme.success`
- Line 344: XP gauge → `theme.success`

**Milestone Status Mapping:**
```rust
let color = match status {
    MilestoneStatus::Complete => self.theme.success,
    MilestoneStatus::Active => self.theme.accent_primary,
    MilestoneStatus::Focus => self.theme.warning,
    MilestoneStatus::Pending => self.theme.fg_secondary,
};
```

### 3. `metrics.rs` Updates

**Locations:**
- Line 47: Session name → `theme.accent_primary`
- Line 53: Time window → `theme.warning`
- Line 72: Table headers → `theme.warning`
- Line 124: Total cost → `theme.success`
- Line 146: Latency headers → `theme.warning`
- Line 201: Sparklines → `theme.success`, `theme.warning`, `theme.error`
- Line 243: Event timeline → Already using `event.level.color()` ✅
- Line 266: Recommendation → `theme.warning`
- Line 274: Command text → `theme.accent_primary`

### 4. `agent_focus.rs` Updates

**Locations:**
- Line 57: Agent header → `theme.accent_primary`
- Line 63: Status → Already using `agent.status.color()` ✅
- Line 66: Role → `theme.warning`
- Line 95: Code comments → `theme.fg_secondary`
- Line 97: Keywords → `theme.accent_secondary`
- Line 125-130: Controls → `theme.warning`
- Line 239: Cost/tokens → `theme.fg_primary`
- Line 246: Command → `theme.accent_primary`
- Line 252-257: Hotkeys → `theme.warning`

## Implementation Checklist

### Core Infrastructure
- [x] Read and analyze all dashboard files
- [ ] Update `Dashboard` trait to support theme configuration
- [ ] Add theme fields to dashboard structs
- [ ] Implement `with_theme()` constructors

### Dashboard Updates
- [ ] `overview.rs` - 15 color replacements
- [ ] `flow_view.rs` - 18 color replacements + milestone mapping
- [ ] `metrics.rs` - 10 color replacements
- [ ] `agent_focus.rs` - 8 color replacements

### Testing
- [ ] Verify compilation with theme integration
- [ ] Test dark theme rendering
- [ ] Test light theme rendering
- [ ] Verify color consistency across dashboards

### Documentation
- [ ] Update rustdoc comments for theme usage
- [ ] Add theme customization examples
- [ ] Document color mapping decisions

## Benefits

1. **Consistency**: All dashboards use the same color palette
2. **Customization**: Easy theme switching (dark/light/custom)
3. **Maintainability**: Color changes in one place affect all dashboards
4. **Accessibility**: Theme system can support high-contrast variants
5. **Professional**: Cohesive visual identity across all views

## Next Steps

1. Implement core infrastructure (trait + struct updates)
2. Start with `overview.rs` as reference implementation
3. Apply pattern to remaining 3 dashboards
4. Run comprehensive testing
5. Update documentation

---

**Estimated LOC Changes**: ~200 lines across 5 files
**Complexity**: Low (find-and-replace with contextual mapping)
**Risk**: Low (purely visual changes, no logic impact)
