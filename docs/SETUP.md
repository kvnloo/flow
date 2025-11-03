# Flow - Setup Guide

Complete installation and configuration guide for the Flow neurofeedback application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Muse S Headband Setup](#muse-s-headband-setup)
4. [Environment Configuration](#environment-configuration)
5. [Audio Equipment Setup](#audio-equipment-setup)
6. [Verification](#verification)
7. [Next Steps](#next-steps)

---

## Prerequisites

### System Requirements

**Minimum Specifications:**
- **Operating System**: macOS 10.15+, Windows 10+, or Linux (Ubuntu 20.04+)
- **Node.js**: v18.17.0 or higher
- **npm**: v9.0.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space

**Browser Requirements:**
- **Chrome/Edge**: v89+ (recommended for best Web Bluetooth support)
- **Firefox**: v90+ (experimental Web Bluetooth support)
- **Safari**: v15.4+ (limited Web Bluetooth support)

**Note**: Web Bluetooth API support is required for Muse S connectivity. Chrome/Chromium browsers provide the most reliable experience.

### Hardware Requirements

**EEG Device:**
- Muse S (Gen 2) headband or Muse 2
- Fully charged battery (minimum 50%)
- Updated firmware (use Muse app to check)

**Audio Equipment (Recommended):**
- High-quality headphones or IEMs for binaural beat perception
- Examples: Sennheiser HD800S, Focal Clear, Audeze LCD-X
- Closed-back headphones for better isolation
- Audio interface with low THD+N (< 0.001%) for optimal binaural beat clarity

### Dependencies

The application will automatically install all required dependencies during setup. Key dependencies include:

- **Next.js 14**: React framework
- **React 18**: UI library
- **Three.js**: 3D visualization
- **Tone.js**: Audio synthesis
- **RxJS**: Reactive data streams
- **Zustand**: State management

---

## Installation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/flow.git
cd flow

# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Manual Installation

If you prefer to install from source or need custom configuration:

```bash
# 1. Clone repository
git clone https://github.com/yourusername/flow.git
cd flow

# 2. Install dependencies
npm install

# 3. Build the application
npm run build

# 4. Start production server
npm start
```

### Development Setup

For development with hot-reload and debugging tools:

```bash
# Install development dependencies
npm install

# Run development server with debugging
npm run dev

# In separate terminal: Run type checking
npm run typecheck

# Run tests
npm test

# Run end-to-end tests
npm run test:e2e
```

---

## Muse S Headband Setup

### Initial Pairing

**Step 1: Prepare the Headband**

1. Ensure your Muse S is fully charged
2. Download the official Muse app (iOS/Android) if not already installed
3. Check firmware version and update if needed:
   - Open Muse app
   - Connect to headband
   - Navigate to Settings → Device Info
   - Update firmware if prompted

**Step 2: Electrode Contact**

Proper electrode contact is critical for signal quality:

1. **Clean scalp area**: Remove hair products, oils, or sweat
2. **Positioning**:
   - **AF7/AF8 (frontal)**: Just above eyebrows, centered over each eye
   - **TP9/TP10 (temporal)**: Behind ears at mastoid process
   - **Reference**: Center of forehead
3. **Fit check**: All electrodes should show green in Muse app (signal quality > 75%)

**Step 3: Browser Pairing**

1. Open Flow application in Chrome/Edge
2. Navigate to Calibration page
3. Click "Connect Muse Device"
4. In browser Bluetooth dialog, select your Muse device (e.g., "Muse-1A2B")
5. Click "Pair"

**Troubleshooting Pairing:**

If device doesn't appear:
```bash
# Check if Bluetooth is enabled
# macOS:
system_profiler SPBluetoothDataType

# Linux:
bluetoothctl show

# Ensure Muse is in pairing mode (LED flashing blue)
# Reset Muse: Hold power button 10 seconds until LED flashes white
```

### Signal Quality Verification

Before starting a session, verify signal quality:

1. Navigate to Calibration page
2. Connect Muse headband
3. Check real-time signal quality indicators:
   - **Green (4/4)**: Excellent - proceed with session
   - **Yellow (2-3/4)**: Fair - adjust electrode placement
   - **Red (0-1/4)**: Poor - reposition headband and check contact

**Improving Signal Quality:**

- Moisten electrode pads slightly with water or saline solution
- Ensure hair is not blocking electrode contact
- Adjust headband tightness (snug but not uncomfortable)
- Clean electrodes with isopropyl alcohol between sessions

---

## Environment Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Optional: Enable analytics tracking
NEXT_PUBLIC_ANALYTICS_ENABLED=false

# Optional: Supabase for cloud session sync (privacy-first local-only by default)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Custom audio base frequency (Hz)
NEXT_PUBLIC_AUDIO_BASE_FREQUENCY=200

# Optional: Default target brainwave frequency (Hz)
NEXT_PUBLIC_DEFAULT_TARGET_FREQUENCY=10
```

### Application Configuration

Edit `src/config/flowParameters.ts` to customize flow detection parameters:

```typescript
// Adjust target flow state thresholds
export const FLOW_PARAMETERS = {
  // Optimal challenge-skill balance range
  targetDifficulty: {
    min: 0.65,  // Too easy below this
    max: 0.75,  // Too hard above this
  },

  // Target brainwave frequencies
  targetBrainwaves: {
    alpha: 10,   // Hz - relaxed focus
    theta: 6,    // Hz - creative insight
    beta: 20,    // Hz - active concentration
  },

  // Audio feedback settings
  audio: {
    baseFrequency: 200,      // Hz - carrier frequency
    volume: 0.3,             // 0.0 to 1.0
    enableAmbient: true,     // Generative music layer
    enableNature: false,     // Nature soundscapes
  },
};
```

---

## Audio Equipment Setup

### Headphone Configuration

**For Binaural Beats:**

Binaural beats require accurate stereo separation and frequency response. Configure your audio setup:

1. **Volume Calibration**:
   - Start at 20-30% system volume
   - Adjust to comfortable listening level
   - Binaural beats should be subtle, not overpowering

2. **Audio Interface Settings** (if using external DAC):
   - Sample rate: 48kHz (matches Web Audio API)
   - Bit depth: 24-bit or higher
   - Disable DSP effects (EQ, compression, spatial audio)
   - Use direct monitoring mode

3. **Verify Stereo Separation**:
   - Play test tone: Left channel only should be heard in left ear
   - Right channel only should be heard in right ear
   - No crosstalk or bleed between channels

### Audio Quality Testing

Run the built-in audio test:

1. Navigate to Settings → Audio Test
2. Listen for smooth binaural beat (should sound like gentle pulsing)
3. Verify no clicks, pops, or distortion
4. Adjust volume if needed

**Expected Characteristics:**

- **200 Hz base tone**: Low hum, barely audible
- **10 Hz beat**: Gentle pulsing sensation at 10 times per second
- **Smooth transitions**: No audible frequency jumps

### Common Audio Issues

**Problem: Clicking/popping during frequency changes**
```typescript
// Solution: Increase ramp duration in binauralBeatGenerator.ts
const rampDuration = 3.0; // Seconds (default: 2.0)
```

**Problem: Beat not perceptible**
- Ensure headphones are properly positioned
- Increase volume slightly
- Verify stereo separation (swap L/R channels to test)
- Try closed-back headphones for better isolation

**Problem: Distortion at high volumes**
- Reduce system volume
- Check audio interface gain staging
- Disable any audio enhancements in OS

---

## Verification

### System Health Checks

Run the verification test suite:

```bash
# Run all verification tests
npm run verify

# Individual test suites
npm run test:bluetooth        # Bluetooth connectivity
npm run test:audio            # Audio system
npm run test:eeg             # EEG processing
npm run test:integration     # End-to-end
```

### Manual Verification Checklist

**1. Bluetooth Connectivity**
- [ ] Muse device appears in pairing dialog
- [ ] Connection establishes within 10 seconds
- [ ] Device info displays correctly (name, model, battery)
- [ ] Auto-reconnect works after disconnect

**2. EEG Signal Quality**
- [ ] All 4 channels (TP9, AF7, AF8, TP10) show green status
- [ ] Signal quality remains stable for 30+ seconds
- [ ] Real-time waveform displays without gaps
- [ ] Frequency spectrum shows expected peaks

**3. Audio Feedback**
- [ ] Binaural beats play smoothly without clicks
- [ ] Frequency transitions are smooth (no jumps)
- [ ] Volume control works correctly
- [ ] Audio stops cleanly when session ends

**4. Visual Feedback**
- [ ] Three.js scene renders without lag (60 FPS)
- [ ] Particles respond to EEG changes
- [ ] Mandala rotates smoothly
- [ ] Color transitions are fluid

**5. Session Management**
- [ ] Calibration completes successfully (2 minutes)
- [ ] Session starts and runs continuously
- [ ] Metrics update in real-time
- [ ] Session data saves to IndexedDB
- [ ] Export to CSV/JSON works

### Performance Benchmarks

Expected performance metrics:

| Metric | Target | Minimum |
|--------|--------|---------|
| EEG Sampling Rate | 256 Hz | 256 Hz |
| Processing Latency | < 50 ms | < 100 ms |
| Visual Frame Rate | 60 FPS | 30 FPS |
| Audio Latency | < 10 ms | < 50 ms |
| Memory Usage | < 500 MB | < 1 GB |
| CPU Usage | < 30% | < 50% |

---

## Next Steps

### First Session

1. **Complete Calibration** (5 minutes):
   - Navigate to `/calibration`
   - Connect Muse headband
   - Sit calmly for 2-minute baseline recording
   - Save calibration data

2. **Start Neurofeedback Session**:
   - Navigate to `/session`
   - Review session settings (duration, difficulty)
   - Click "Start Session"
   - Follow on-screen visual/audio feedback

3. **Review Analytics**:
   - Navigate to `/analytics` after session
   - Explore flow state timeline
   - Review brainwave patterns
   - Export data for external analysis

### Learning Resources

- **[API Reference](API.md)**: Developer documentation for customization
- **[Scientific Background](SCIENCE.md)**: Neuroscience principles and research citations
- **[Troubleshooting](TROUBLESHOOTING.md)**: Common issues and solutions
- **[Contributing Guide](CONTRIBUTING.md)**: How to contribute to the project

### Community & Support

- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time community support
- **Documentation**: Comprehensive guides and tutorials

---

## Advanced Configuration

### Custom Signal Processing

Modify DSP parameters in `src/lib/eeg/signalProcessor.ts`:

```typescript
// Notch filter for power line interference
const notchFrequency = 60; // Hz (use 50 for Europe)

// Bandpass filter range
const bandpassFilter = {
  lowCut: 0.5,   // Hz - remove DC offset and slow drift
  highCut: 50,   // Hz - remove muscle artifacts
};

// FFT window size (affects frequency resolution vs. time resolution)
const fftSize = 512; // Larger = better freq resolution, slower updates
```

### Custom Flow Detection

Adjust flow classification in `src/lib/eeg/flowClassifier.ts`:

```typescript
// Flow score weights (must sum to 1.0)
const flowWeights = {
  attention: 0.35,      // Frontal theta power
  relaxation: 0.25,     // Central alpha power
  cognitiveLoad: 0.25,  // Beta/alpha ratio
  balance: 0.15,        // Theta/alpha balance
};

// Flow state thresholds
const flowThresholds = {
  deep: 0.8,    // Deep flow state
  moderate: 0.6, // Flow channel
  light: 0.4,    // Focused state
};
```

---

## Security & Privacy

### Local-First Architecture

Flow is designed with privacy as a core principle:

- **No cloud dependency**: All data stored locally in IndexedDB
- **No telemetry**: No usage tracking or analytics by default
- **Offline-capable**: Full functionality without internet
- **Encrypted exports**: Optional AES-256 encryption for exported data

### Data Storage Locations

```bash
# Browser IndexedDB location (varies by OS):
# macOS:
~/Library/Application Support/Google/Chrome/Default/IndexedDB/

# Linux:
~/.config/google-chrome/Default/IndexedDB/

# Windows:
C:\Users\YourName\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\
```

### Clearing Data

To reset all session data:

1. Open browser DevTools (F12)
2. Navigate to Application → IndexedDB
3. Delete `flow-sessions` database
4. Refresh page

Or use the application:

1. Navigate to Settings → Privacy
2. Click "Clear All Session Data"
3. Confirm deletion

---

**Ready to begin? Proceed to [Calibration](http://localhost:3000/calibration) to start your first session.**
