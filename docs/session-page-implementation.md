# Session Page Implementation

## Overview
Main neurofeedback training page at `/app/session/page.tsx` integrating all Phase 3 components and hooks.

## Components Created

### 1. FlowMeter Component (`/components/metrics/FlowMeter.tsx`)
Real-time flow state metrics display with:
- **Primary Flow Score**: Large gauge with color-coded progress (red/yellow/green)
- **Flow State Labels**: Low Flow → Emerging Flow → Moderate Flow → High Flow → Deep Flow
- **Component Metrics Grid**:
  - Cognitive Load (optimal 40-60%)
  - Attention (frontal theta activity)
  - Relaxation (alpha power)
  - Signal Quality (confidence indicator)
- **Dynamic Tips**: Context-aware suggestions when flow score < 50%
- **Visual Design**: Gradient cards, animated progress bars, icon indicators

### 2. Session Page (`/app/session/page.tsx`)
Full-featured neurofeedback training interface with:

#### Layout Structure (3-Column Grid)
```
┌──────────────────────────────────────────────────────┐
│              Connection Status Bar                    │
├──────────────┬─────────────────┬─────────────────────┤
│              │                 │                     │
│ Left Column  │ Center Column   │  Right Column       │
│ Visualizations│  Metrics       │   Controls          │
│              │                 │                     │
│ - Particles  │  FlowMeter      │  SessionControls    │
│ - Mandala    │  (Flow Score,   │  (Start/Pause/Stop) │
│ - Waterfall  │   Components)   │                     │
│              │                 │  Settings Panel     │
└──────────────┴─────────────────┴─────────────────────┘
```

#### Integrated Hooks
- **useMuseConnection**: Device connection, auto-reconnect, signal quality
- **useEEGStream**: Real-time EEG data processing, buffering, stats
- **useFlowState**: Flow classification, calibration, metrics history
- **useAudioFeedback**: Binaural beats, ambient synthesis, volume control

#### Features Implemented

**1. Real-time EEG Processing Pipeline**
- EEG stream → Signal processor → Flow classifier → Visualizations
- 256 Hz sampling rate with buffer management
- Automatic calibration progress tracking
- Signal quality monitoring per electrode

**2. Session State Management**
```typescript
type SessionState = 'idle' | 'running' | 'paused'
```
- Idle: Not started, calibration only
- Running: Active neurofeedback with all visualizations
- Paused: Timer paused, visualizations frozen

**3. Auto-save Every 30 Seconds**
- Saves to `localStorage` as `flow-sessions`
- Tracks: flowScores, cognitiveLoad, attention, relaxation
- Session metadata: startTime, endTime, duration

**4. Connection Status Display**
- Top status bar with device name
- Signal quality icon (WifiOff, SignalLow, Medium, High)
- Real-time stats: sampling rate, latency
- Calibration progress indicator

**5. Keyboard Shortcuts**
- **Space**: Pause/Resume session
- **Esc**: Stop session
- Only active when connected and calibrated

**6. Responsive Design**
- Desktop: 3-column grid (5-4-3 proportion)
- Mobile: Stacked vertical layout
- All sections independently scrollable

## Phase 3 Component Integration

### Visualizations (Left Column)

**FlowParticleSystem**
- 5,000 particles driven by flow metrics
- Color mapping: Beta (yellow), Alpha (green), Theta (blue)
- Turbulence inversely proportional to flow score
- Alpha coherence affects center pull force

**MandalaGeometry**
- Sacred geometry (flower-of-life pattern)
- Rotation speed from alpha frequency (8-12 Hz)
- Fractal depth from flow score (1-5 levels)
- Dynamic color from brain state

**SpectralWaterfall**
- Real-time frequency spectrum (0.1-50 Hz)
- 60-second scrolling time window
- Logarithmic frequency scale
- Jet colormap (blue→cyan→green→yellow→red)

### Metrics (Center Column)

**FlowMeter**
- Primary flow score with gradient bar
- 4 component metrics with individual progress bars
- Tips for flow enhancement based on current state
- Confidence indicator when signal quality low

### Controls (Right Column)

**SessionControls**
- Connection status indicator
- Session timer (MM:SS format)
- Context-aware buttons:
  - Not calibrated: "Calibrate" button
  - Idle: "Start Session" button
  - Running: "Pause" + "Stop" buttons
  - Paused: "Resume" + "Stop" buttons
- Keyboard shortcuts hints

**SettingsPanel**
- Audio settings (binaural, ambient, nature, master volume)
- Visual settings (color scheme, particle count, speed, glow)
- Calibration settings (baseline, rest, task durations)
- Session preferences (duration, break intervals, auto-start)
- Import/Export settings
- Reset to defaults

## Data Flow

```
Muse Device (Bluetooth)
    ↓
useMuseConnection (WebBluetooth API)
    ↓
useEEGStream (256Hz buffering, processing)
    ↓
useFlowState (Flow classification, calibration)
    ↓
┌──────────────┬────────────────┬─────────────────┐
│              │                │                 │
Visualizations  FlowMeter       useAudioFeedback
(Particles,     (Metrics)       (Binaural beats,
 Mandala,                        Ambient synthesis)
 Waterfall)
```

## Session Lifecycle

1. **Connection**: User clicks "Calibrate" → Bluetooth pairing
2. **Calibration**: 2-minute baseline collection (30+ samples)
3. **Ready**: Session controls enabled, "Start Session" available
4. **Running**:
   - Timer starts
   - EEG processing active
   - Visualizations animate
   - Audio feedback plays
   - Metrics update in real-time
5. **Pause**: State frozen, timer paused, can resume
6. **Stop**: Save session data, reset state, stop audio

## Auto-save System

**Trigger**: Every 30 seconds during active session
**Storage**: localStorage key `flow-sessions`
**Data Structure**:
```typescript
{
  startTime: number,
  endTime?: number,
  flowScores: number[],
  cognitiveLoadScores: number[],
  attentionScores: number[],
  relaxationScores: number[]
}
```

## Error Handling

- Connection errors displayed in bottom-right toast
- Stream errors displayed in bottom-right toast
- Calibration failures trigger retry or reset
- Auto-reconnect on disconnect (3 attempts)

## Performance Optimizations

- Canvas components in separate mounting contexts
- useCallback for all event handlers
- Ref-based access to mutable state (no re-renders)
- Conditional rendering based on connection state
- Lazy loading of 3D geometries

## Keyboard Shortcuts

| Key | Action | Condition |
|-----|--------|-----------|
| Space | Pause/Resume | Connected + Calibrated |
| Esc | Stop Session | Session active |

## Dependencies

- `@react-three/fiber`: 3D canvas rendering
- `@react-three/drei`: Camera, controls helpers
- `lucide-react`: Icon library
- Custom hooks: useMuseConnection, useEEGStream, useFlowState, useAudioFeedback
- Custom components: All Phase 3 visualization and control components

## Next Steps (Future Enhancements)

1. Session history visualization (charts, trends)
2. Export session data as CSV/JSON
3. Multi-user profiles
4. Flow state goals and achievements
5. Social sharing of flow milestones
6. Integration with external services (calendar, productivity apps)
7. Advanced analytics dashboard

## Testing Checklist

- [ ] Connection to Muse device
- [ ] Calibration completion (2 min baseline)
- [ ] Session start/pause/stop flow
- [ ] Keyboard shortcuts (Space, Esc)
- [ ] Auto-save every 30 seconds
- [ ] Signal quality indicators
- [ ] All visualizations rendering
- [ ] Audio feedback playing
- [ ] Settings panel persistence
- [ ] Error handling for disconnects
- [ ] Responsive layout (mobile/desktop)
- [ ] Browser back button behavior
