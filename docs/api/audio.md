# Audio API Reference

## Audio Generation and Synthesis Classes

### BinauralBeatGenerator

**Description**: Generates binaural beats synchronized with detected flow state.

```typescript
class BinauralBeatGenerator {
  constructor(config?: BinauralConfig)
  start(): void
  stop(): void
  setFrequency(baseFreq: number, beatFreq: number): void
  setVolume(volume: number): void
  fadeIn(duration: number): void
  fadeOut(duration: number): void
}
```

#### Configuration

```typescript
interface BinauralConfig {
  /** Base carrier frequency (Hz) */
  baseFrequency: number;
  /** Binaural beat frequency (Hz) */
  beatFrequency: number;
  /** Initial volume (0-1) */
  volume: number;
  /** Audio context sample rate */
  sampleRate: number;
  /** Enable stereo enhancement */
  stereoEnhancement: boolean;
}
```

**Default Configuration**:
```typescript
{
  baseFrequency: 200,
  beatFrequency: 10,
  volume: 0.3,
  sampleRate: 44100,
  stereoEnhancement: true
}
```

#### Flow State Frequency Mapping

```typescript
const FLOW_FREQUENCIES = {
  [FlowState.DEEP_FLOW]: { base: 200, beat: 7.83 },    // Theta (7.83 Hz - Schumann)
  [FlowState.FLOW]: { base: 200, beat: 10 },           // Alpha (10 Hz)
  [FlowState.FOCUSED]: { base: 200, beat: 15 },        // Beta (15 Hz)
  [FlowState.RELAXED]: { base: 200, beat: 8 },         // Alpha (8 Hz)
  [FlowState.NEUTRAL]: { base: 200, beat: 10 },        // Default alpha
  [FlowState.DISTRACTED]: { base: 200, beat: 18 },     // Beta (18 Hz)
  [FlowState.STRESSED]: { base: 200, beat: 12 }        // Alpha-beta (12 Hz)
};
```

#### Methods

##### `start()`

Starts binaural beat playback.

**Example**:
```typescript
const generator = new BinauralBeatGenerator({
  baseFrequency: 200,
  beatFrequency: 10,
  volume: 0.3
});

generator.start();
```

##### `stop()`

Stops binaural beat playback immediately.

**Example**:
```typescript
generator.stop();
```

##### `setFrequency()`

Updates binaural beat frequencies.

**Parameters**:
- `baseFreq: number` - Carrier frequency in Hz (100-500)
- `beatFreq: number` - Beat frequency in Hz (0.5-40)

**Example**:
```typescript
// Set to alpha range (10 Hz)
generator.setFrequency(200, 10);

// Transition to theta range (7.83 Hz)
generator.setFrequency(200, 7.83);
```

##### `setVolume()`

Sets output volume.

**Parameters**:
- `volume: number` - Volume level (0-1)

**Example**:
```typescript
generator.setVolume(0.5);
```

##### `fadeIn()`

Gradually increases volume from 0 to current level.

**Parameters**:
- `duration: number` - Fade duration in milliseconds

**Example**:
```typescript
generator.fadeIn(2000); // 2-second fade in
```

##### `fadeOut()`

Gradually decreases volume to 0.

**Parameters**:
- `duration: number` - Fade duration in milliseconds

**Example**:
```typescript
generator.fadeOut(1500); // 1.5-second fade out
```

---

### AmbientSynthesizer

**Description**: Generates adaptive ambient soundscapes responsive to flow state.

```typescript
class AmbientSynthesizer {
  constructor(config?: AmbientConfig)
  start(): void
  stop(): void
  setPreset(preset: AmbientPreset): void
  setFlowState(state: FlowState): void
  setParameter(param: SynthParameter, value: number): void
  crossfade(newPreset: AmbientPreset, duration: number): void
}
```

#### Configuration

```typescript
interface AmbientConfig {
  /** Initial preset */
  preset: AmbientPreset;
  /** Master volume (0-1) */
  volume: number;
  /** Reverb amount (0-1) */
  reverb: number;
  /** Delay amount (0-1) */
  delay: number;
  /** Low-pass filter cutoff (Hz) */
  filterCutoff: number;
  /** Enable adaptive modulation */
  adaptive: boolean;
}

enum AmbientPreset {
  FOREST = 'forest',
  OCEAN = 'ocean',
  RAIN = 'rain',
  WIND = 'wind',
  SPACE = 'space',
  MINIMAL = 'minimal',
  CUSTOM = 'custom'
}
```

#### Methods

##### `start()`

Starts ambient synthesis.

**Example**:
```typescript
const ambient = new AmbientSynthesizer({
  preset: AmbientPreset.OCEAN,
  volume: 0.4,
  reverb: 0.6,
  adaptive: true
});

ambient.start();
```

##### `setPreset()`

Changes ambient preset with immediate transition.

**Parameters**:
- `preset: AmbientPreset` - Target preset

**Example**:
```typescript
ambient.setPreset(AmbientPreset.FOREST);
```

##### `setFlowState()`

Adapts ambient parameters to flow state.

**Parameters**:
- `state: FlowState` - Current flow state

**Example**:
```typescript
ambient.setFlowState(FlowState.DEEP_FLOW);
// Automatically adjusts reverb, filter, modulation
```

##### `setParameter()`

Manually controls synthesis parameter.

**Parameters**:
- `param: SynthParameter` - Parameter to adjust
- `value: number` - Parameter value (range varies)

```typescript
enum SynthParameter {
  VOLUME = 'volume',           // 0-1
  REVERB = 'reverb',          // 0-1
  DELAY = 'delay',            // 0-1
  FILTER_CUTOFF = 'cutoff',   // 20-20000 Hz
  RESONANCE = 'resonance',    // 0-10
  MODULATION = 'modulation',  // 0-1
  DENSITY = 'density'         // 0-1
}
```

**Example**:
```typescript
ambient.setParameter(SynthParameter.REVERB, 0.8);
ambient.setParameter(SynthParameter.FILTER_CUTOFF, 2000);
```

##### `crossfade()`

Smoothly transitions between presets.

**Parameters**:
- `newPreset: AmbientPreset` - Target preset
- `duration: number` - Crossfade time in milliseconds

**Example**:
```typescript
ambient.crossfade(AmbientPreset.RAIN, 5000); // 5-second transition
```

---

### AudioManager

**Description**: Coordinates audio feedback and manages audio routing.

```typescript
class AudioManager {
  constructor(config?: AudioManagerConfig)
  initialize(): Promise<void>
  setFlowState(state: FlowState, intensity: number): void
  playTransition(fromState: FlowState, toState: FlowState): void
  playReward(rewardType: RewardType): void
  setMasterVolume(volume: number): void
  enableBinaural(enabled: boolean): void
  enableAmbient(enabled: boolean): void
  getAnalyzer(): AnalyserNode
}
```

#### Configuration

```typescript
interface AudioManagerConfig {
  /** Enable binaural beats */
  binauralEnabled: boolean;
  /** Enable ambient synthesis */
  ambientEnabled: boolean;
  /** Master volume (0-1) */
  masterVolume: number;
  /** Binaural configuration */
  binauralConfig?: BinauralConfig;
  /** Ambient configuration */
  ambientConfig?: AmbientConfig;
  /** Transition duration (ms) */
  transitionDuration: number;
}
```

**Default Configuration**:
```typescript
{
  binauralEnabled: true,
  ambientEnabled: true,
  masterVolume: 0.7,
  transitionDuration: 3000
}
```

#### Methods

##### `initialize()`

Initializes Web Audio API context.

**Returns**: `Promise<void>`

**Throws**: `AudioInitError` - Browser doesn't support Web Audio

**Example**:
```typescript
const audioManager = new AudioManager({
  binauralEnabled: true,
  ambientEnabled: true,
  masterVolume: 0.7
});

await audioManager.initialize();
```

##### `setFlowState()`

Updates audio feedback based on flow state.

**Parameters**:
- `state: FlowState` - Current flow state
- `intensity: number` - Flow intensity (0-1)

**Example**:
```typescript
audioManager.setFlowState(FlowState.FLOW, 0.85);
// Automatically adjusts binaural frequency and ambient parameters
```

##### `playTransition()`

Plays audio cue when transitioning between states.

**Parameters**:
- `fromState: FlowState` - Previous state
- `toState: FlowState` - New state

**Example**:
```typescript
audioManager.playTransition(FlowState.FOCUSED, FlowState.FLOW);
// Plays ascending tone for positive transition
```

##### `playReward()`

Plays reward sound effect.

**Parameters**:
- `rewardType: RewardType` - Type of reward earned

```typescript
enum RewardType {
  FLOW_ENTERED = 'flow_entered',
  FLOW_SUSTAINED = 'flow_sustained',
  DEEP_FLOW = 'deep_flow',
  MILESTONE = 'milestone',
  ACHIEVEMENT = 'achievement'
}
```

**Example**:
```typescript
audioManager.playReward(RewardType.FLOW_ENTERED);
```

##### `setMasterVolume()`

Sets overall output volume.

**Parameters**:
- `volume: number` - Volume level (0-1)

**Example**:
```typescript
audioManager.setMasterVolume(0.5);
```

##### `enableBinaural()`

Enables or disables binaural beats.

**Parameters**:
- `enabled: boolean` - Enable state

**Example**:
```typescript
audioManager.enableBinaural(false); // Disable binaural
```

##### `enableAmbient()`

Enables or disables ambient synthesis.

**Parameters**:
- `enabled: boolean` - Enable state

**Example**:
```typescript
audioManager.enableAmbient(true); // Enable ambient
```

##### `getAnalyzer()`

Gets audio analyzer for visualization.

**Returns**: `AnalyserNode`

**Example**:
```typescript
const analyzer = audioManager.getAnalyzer();
analyzer.fftSize = 2048;

const dataArray = new Uint8Array(analyzer.frequencyBinCount);
analyzer.getByteFrequencyData(dataArray);
// Use dataArray for visualization
```

---

## Audio Effects

### ReverbProcessor

```typescript
interface ReverbProcessor {
  /** Reverb decay time (seconds) */
  decayTime: number;
  /** Pre-delay time (milliseconds) */
  preDelay: number;
  /** Dry/wet mix (0-1) */
  mix: number;

  process(input: AudioBuffer): AudioBuffer;
}
```

### DelayProcessor

```typescript
interface DelayProcessor {
  /** Delay time (milliseconds) */
  delayTime: number;
  /** Feedback amount (0-1) */
  feedback: number;
  /** Dry/wet mix (0-1) */
  mix: number;

  process(input: AudioBuffer): AudioBuffer;
}
```

### FilterProcessor

```typescript
interface FilterProcessor {
  /** Filter type */
  type: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  /** Cutoff frequency (Hz) */
  frequency: number;
  /** Resonance/Q factor */
  Q: number;

  process(input: AudioBuffer): AudioBuffer;
}
```

---

## Audio Utilities

### AudioContextManager

Manages global Web Audio API context.

```typescript
class AudioContextManager {
  static getContext(): AudioContext
  static resumeContext(): Promise<void>
  static suspendContext(): Promise<void>
  static getState(): AudioContextState
}
```

**Example**:
```typescript
// Resume context after user interaction
document.addEventListener('click', async () => {
  await AudioContextManager.resumeContext();
});

const context = AudioContextManager.getContext();
console.log('Sample rate:', context.sampleRate);
```

### AudioBuffer Utilities

```typescript
/** Create silent buffer */
function createSilentBuffer(
  duration: number,
  sampleRate: number
): AudioBuffer

/** Normalize audio buffer */
function normalizeBuffer(buffer: AudioBuffer): AudioBuffer

/** Fade buffer in/out */
function fadeBuffer(
  buffer: AudioBuffer,
  fadeInSamples: number,
  fadeOutSamples: number
): AudioBuffer
```

---

## Audio Visualization

### SpectrumAnalyzer

```typescript
class SpectrumAnalyzer {
  constructor(analyzerNode: AnalyserNode)
  getFrequencyData(): Uint8Array
  getTimeDomainData(): Uint8Array
  getAverageFrequency(minHz: number, maxHz: number): number
}
```

**Example**:
```typescript
const analyzer = new SpectrumAnalyzer(audioManager.getAnalyzer());

function visualize() {
  const freqData = analyzer.getFrequencyData();
  const avgBass = analyzer.getAverageFrequency(20, 200);

  // Draw spectrum
  drawSpectrum(freqData);

  requestAnimationFrame(visualize);
}
```

---

## Error Types

```typescript
class AudioInitError extends Error {}
class AudioPlaybackError extends Error {}
class UnsupportedAudioError extends Error {}
```

---

## Audio Constants

```typescript
/** Brainwave frequency ranges */
const BRAINWAVE_RANGES = {
  DELTA: { min: 0.5, max: 4 },
  THETA: { min: 4, max: 8 },
  ALPHA: { min: 8, max: 13 },
  BETA: { min: 13, max: 30 },
  GAMMA: { min: 30, max: 50 }
};

/** Schumann resonance */
const SCHUMANN_FREQUENCY = 7.83;

/** Standard sample rates */
const SAMPLE_RATES = {
  CD_QUALITY: 44100,
  HIGH_QUALITY: 48000,
  STUDIO: 96000
};
```

---

## See Also

- [Feedback API](./feedback.md#audiointegration) - Audio reward integration
- [Hooks API](./hooks.md#useaudiofeedback) - React hooks for audio
- [Store API](./store.md#audiostate) - Audio state management
