# EEG API Reference

## Core EEG Processing Classes

### MuseConnector

**Description**: Manages connection to Muse EEG headband via Web Bluetooth API.

```typescript
class MuseConnector {
  constructor(config?: MuseConnectionConfig)
  connect(): Promise<void>
  disconnect(): Promise<void>
  getStatus(): ConnectionStatus
  addEventListener(event: MuseEvent, handler: EventHandler): void
  removeEventListener(event: MuseEvent, handler: EventHandler): void
}
```

#### Configuration

```typescript
interface MuseConnectionConfig {
  /** Auto-reconnect on disconnection */
  autoReconnect?: boolean;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Enable debug logging */
  debug?: boolean;
}
```

#### Methods

##### `connect()`

Initiates Bluetooth connection to Muse device.

**Returns**: `Promise<void>`

**Throws**:
- `BluetoothError` - Bluetooth not available or user denied permission
- `DeviceNotFoundError` - No Muse device found
- `ConnectionError` - Failed to establish connection

**Example**:
```typescript
const muse = new MuseConnector({
  autoReconnect: true,
  reconnectDelay: 5000,
  maxReconnectAttempts: 3
});

try {
  await muse.connect();
  console.log('Connected to Muse device');
} catch (error) {
  console.error('Connection failed:', error);
}
```

##### `disconnect()`

Disconnects from Muse device and cleans up resources.

**Returns**: `Promise<void>`

**Example**:
```typescript
await muse.disconnect();
```

##### `getStatus()`

Gets current connection status.

**Returns**: `ConnectionStatus`

```typescript
enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}
```

**Example**:
```typescript
const status = muse.getStatus();
if (status === ConnectionStatus.CONNECTED) {
  console.log('Device is connected');
}
```

##### `addEventListener()`

Registers event listener for Muse events.

**Parameters**:
- `event: MuseEvent` - Event type to listen for
- `handler: EventHandler` - Callback function

**Example**:
```typescript
muse.addEventListener('eeg', (data: EEGReading) => {
  console.log('EEG data received:', data);
});

muse.addEventListener('battery', (level: number) => {
  console.log('Battery level:', level);
});
```

#### Events

```typescript
enum MuseEvent {
  EEG = 'eeg',
  BATTERY = 'battery',
  STATUS = 'status',
  ERROR = 'error',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected'
}
```

---

### SignalProcessor

**Description**: Processes raw EEG signals with filtering and artifact removal.

```typescript
class SignalProcessor {
  constructor(config?: SignalProcessingConfig)
  process(readings: EEGReading[]): ProcessedSignal
  setConfig(config: Partial<SignalProcessingConfig>): void
  reset(): void
}
```

#### Configuration

```typescript
interface SignalProcessingConfig {
  /** Sampling rate in Hz */
  samplingRate: number;
  /** Enable notch filter for 50/60Hz noise */
  notchFilter: boolean;
  /** Notch filter frequency (50 or 60 Hz) */
  notchFrequency: 50 | 60;
  /** Bandpass filter low cutoff (Hz) */
  lowCutoff: number;
  /** Bandpass filter high cutoff (Hz) */
  highCutoff: number;
  /** Enable artifact removal */
  artifactRemoval: boolean;
  /** Artifact threshold (μV) */
  artifactThreshold: number;
}
```

**Default Configuration**:
```typescript
{
  samplingRate: 256,
  notchFilter: true,
  notchFrequency: 60,
  lowCutoff: 1,
  highCutoff: 50,
  artifactRemoval: true,
  artifactThreshold: 100
}
```

#### Methods

##### `process()`

Processes raw EEG readings through filter pipeline.

**Parameters**:
- `readings: EEGReading[]` - Array of raw EEG readings

**Returns**: `ProcessedSignal`

```typescript
interface ProcessedSignal {
  /** Processed channel data */
  channels: {
    TP9: number[];
    AF7: number[];
    AF8: number[];
    TP10: number[];
  };
  /** Timestamp of first sample */
  timestamp: number;
  /** Quality indicators per channel */
  quality: {
    TP9: SignalQuality;
    AF7: SignalQuality;
    AF8: SignalQuality;
    TP10: SignalQuality;
  };
  /** Artifact flags */
  artifacts: boolean[];
}

enum SignalQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}
```

**Example**:
```typescript
const processor = new SignalProcessor({
  samplingRate: 256,
  notchFilter: true,
  lowCutoff: 1,
  highCutoff: 50
});

const processedSignal = processor.process(rawReadings);
console.log('Signal quality:', processedSignal.quality.AF7);
```

##### `setConfig()`

Updates processing configuration.

**Parameters**:
- `config: Partial<SignalProcessingConfig>` - Configuration updates

**Example**:
```typescript
processor.setConfig({
  notchFrequency: 50,
  artifactThreshold: 150
});
```

##### `reset()`

Resets internal filter state.

**Example**:
```typescript
processor.reset();
```

---

### FeatureExtractor

**Description**: Extracts frequency band features from processed EEG signals.

```typescript
class FeatureExtractor {
  constructor(config?: FeatureExtractionConfig)
  extract(signal: ProcessedSignal): FeatureSet
  getBandPower(signal: ProcessedSignal, band: FrequencyBand): BandPower
  getAsymmetry(features: FeatureSet): AsymmetryMetrics
}
```

#### Configuration

```typescript
interface FeatureExtractionConfig {
  /** FFT window size (power of 2) */
  windowSize: number;
  /** Window overlap ratio (0-1) */
  overlap: number;
  /** Window function type */
  windowFunction: 'hanning' | 'hamming' | 'blackman';
  /** Frequency bands to extract */
  bands: FrequencyBand[];
}

enum FrequencyBand {
  DELTA = 'delta',     // 1-4 Hz
  THETA = 'theta',     // 4-8 Hz
  ALPHA = 'alpha',     // 8-13 Hz
  BETA = 'beta',       // 13-30 Hz
  GAMMA = 'gamma'      // 30-50 Hz
}
```

#### Methods

##### `extract()`

Extracts frequency band features from processed signal.

**Parameters**:
- `signal: ProcessedSignal` - Filtered EEG signal

**Returns**: `FeatureSet`

```typescript
interface FeatureSet {
  /** Power spectral density per band per channel */
  bandPowers: {
    TP9: BandPowerMap;
    AF7: BandPowerMap;
    AF8: BandPowerMap;
    TP10: BandPowerMap;
  };
  /** Relative band powers (normalized) */
  relativePowers: {
    TP9: BandPowerMap;
    AF7: BandPowerMap;
    AF8: BandPowerMap;
    TP10: BandPowerMap;
  };
  /** Timestamp */
  timestamp: number;
}

type BandPowerMap = {
  [K in FrequencyBand]: number;
}
```

**Example**:
```typescript
const extractor = new FeatureExtractor({
  windowSize: 512,
  overlap: 0.5,
  windowFunction: 'hanning',
  bands: [
    FrequencyBand.ALPHA,
    FrequencyBand.BETA,
    FrequencyBand.THETA
  ]
});

const features = extractor.extract(processedSignal);
console.log('Alpha power (AF7):', features.bandPowers.AF7.alpha);
```

##### `getBandPower()`

Gets power for specific frequency band.

**Parameters**:
- `signal: ProcessedSignal` - Processed EEG signal
- `band: FrequencyBand` - Target frequency band

**Returns**: `BandPower`

```typescript
interface BandPower {
  /** Absolute power (μV²/Hz) */
  absolute: number;
  /** Relative power (0-1) */
  relative: number;
  /** Peak frequency in band (Hz) */
  peakFrequency: number;
}
```

**Example**:
```typescript
const alphaPower = extractor.getBandPower(signal, FrequencyBand.ALPHA);
console.log('Alpha peak at', alphaPower.peakFrequency, 'Hz');
```

##### `getAsymmetry()`

Calculates hemispheric asymmetry metrics.

**Parameters**:
- `features: FeatureSet` - Extracted features

**Returns**: `AsymmetryMetrics`

```typescript
interface AsymmetryMetrics {
  /** Frontal alpha asymmetry (AF8 - AF7) */
  frontalAlpha: number;
  /** Temporal alpha asymmetry (TP10 - TP9) */
  temporalAlpha: number;
  /** Overall laterality index */
  lateralityIndex: number;
}
```

**Example**:
```typescript
const asymmetry = extractor.getAsymmetry(features);
if (asymmetry.frontalAlpha > 0) {
  console.log('Greater left frontal activity');
}
```

---

### FlowClassifier

**Description**: Classifies flow state from EEG features using trained model.

```typescript
class FlowClassifier {
  constructor(modelPath?: string)
  loadModel(path: string): Promise<void>
  predict(features: FeatureSet): FlowPrediction
  getProbabilities(features: FeatureSet): FlowProbabilities
  calibrate(sessions: CalibrationSession[]): Promise<void>
}
```

#### Methods

##### `loadModel()`

Loads pre-trained classification model.

**Parameters**:
- `path: string` - Model file path or URL

**Returns**: `Promise<void>`

**Throws**: `ModelLoadError` - Failed to load model

**Example**:
```typescript
const classifier = new FlowClassifier();
await classifier.loadModel('/models/flow-classifier-v1.json');
```

##### `predict()`

Predicts flow state from features.

**Parameters**:
- `features: FeatureSet` - Extracted EEG features

**Returns**: `FlowPrediction`

```typescript
interface FlowPrediction {
  /** Predicted flow state */
  state: FlowState;
  /** Confidence score (0-1) */
  confidence: number;
  /** Flow intensity (0-1) */
  intensity: number;
  /** Contributing factors */
  factors: {
    engagement: number;
    focus: number;
    relaxation: number;
  };
}

enum FlowState {
  DEEP_FLOW = 'deep_flow',
  FLOW = 'flow',
  FOCUSED = 'focused',
  RELAXED = 'relaxed',
  NEUTRAL = 'neutral',
  DISTRACTED = 'distracted',
  STRESSED = 'stressed'
}
```

**Example**:
```typescript
const prediction = classifier.predict(features);
console.log('Flow state:', prediction.state);
console.log('Confidence:', prediction.confidence);

if (prediction.state === FlowState.FLOW && prediction.confidence > 0.8) {
  console.log('High-confidence flow detected!');
}
```

##### `getProbabilities()`

Gets probability distribution over all states.

**Parameters**:
- `features: FeatureSet` - EEG features

**Returns**: `FlowProbabilities`

```typescript
type FlowProbabilities = {
  [K in FlowState]: number;
}
```

**Example**:
```typescript
const probs = classifier.getProbabilities(features);
console.log('Flow probability:', probs.flow);
console.log('Deep flow probability:', probs.deep_flow);
```

##### `calibrate()`

Personalizes model with user calibration data.

**Parameters**:
- `sessions: CalibrationSession[]` - Calibration session data

**Returns**: `Promise<void>`

```typescript
interface CalibrationSession {
  /** Session features */
  features: FeatureSet[];
  /** User-reported flow state */
  reportedState: FlowState;
  /** Session metadata */
  metadata: {
    duration: number;
    activity: string;
    timestamp: number;
  };
}
```

**Example**:
```typescript
await classifier.calibrate([
  {
    features: sessionFeatures,
    reportedState: FlowState.FLOW,
    metadata: {
      duration: 1800000,
      activity: 'coding',
      timestamp: Date.now()
    }
  }
]);
```

---

## Data Types

### EEGReading

```typescript
interface EEGReading {
  /** Channel data (μV) */
  channels: {
    TP9: number;
    AF7: number;
    AF8: number;
    TP10: number;
  };
  /** Timestamp (ms) */
  timestamp: number;
  /** Sample index */
  index: number;
}
```

### EEGMetadata

```typescript
interface EEGMetadata {
  /** Device serial number */
  deviceId: string;
  /** Firmware version */
  firmwareVersion: string;
  /** Battery level (0-100) */
  batteryLevel: number;
  /** Connection quality per channel */
  connectionQuality: {
    TP9: number;
    AF7: number;
    AF8: number;
    TP10: number;
  };
}
```

---

## Error Types

```typescript
class BluetoothError extends Error {}
class DeviceNotFoundError extends Error {}
class ConnectionError extends Error {}
class SignalProcessingError extends Error {}
class ModelLoadError extends Error {}
```

---

## See Also

- [Hooks API](./hooks.md#useeegstream) - React hooks for EEG data
- [Store API](./store.md#sessionstore) - State management
- [Storage API](./storage.md#sessiondb) - Persisting EEG data
