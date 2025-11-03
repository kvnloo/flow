/**
 * EEG Signal Processor
 *
 * Real-time signal processing for EEG data with <50ms latency.
 * Implements filtering, FFT analysis, artifact detection, and power spectral density computation.
 */

import {
  createNotchFilter,
  createBandpassFilter,
  applyIIRFilter,
  computeFFT,
  computePSD,
  applyWindow,
  WindowType
} from '@/lib/utils/dsp';
import { FLOW_BANDS, SAMPLING_RATE, BUFFER_SIZE } from '@/config/flowParameters';

/**
 * Circular buffer for efficient real-time data storage
 */
class CircularBuffer {
  private buffer: Float32Array;
  private writeIndex: number = 0;
  private size: number;

  constructor(size: number) {
    this.size = size;
    this.buffer = new Float32Array(size);
  }

  /**
   * Add sample to buffer
   */
  push(value: number): void {
    this.buffer[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.size;
  }

  /**
   * Add multiple samples to buffer
   */
  pushMultiple(values: number[]): void {
    for (const value of values) {
      this.push(value);
    }
  }

  /**
   * Get buffer contents in chronological order
   */
  getData(): Float32Array {
    const data = new Float32Array(this.size);
    let readIndex = this.writeIndex;

    for (let i = 0; i < this.size; i++) {
      data[i] = this.buffer[readIndex];
      readIndex = (readIndex + 1) % this.size;
    }

    return data;
  }

  /**
   * Get most recent N samples
   */
  getRecent(n: number): Float32Array {
    if (n > this.size) n = this.size;

    const data = new Float32Array(n);
    let readIndex = (this.writeIndex - n + this.size) % this.size;

    for (let i = 0; i < n; i++) {
      data[i] = this.buffer[readIndex];
      readIndex = (readIndex + 1) % this.size;
    }

    return data;
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer.fill(0);
    this.writeIndex = 0;
  }

  /**
   * Get buffer size
   */
  getSize(): number {
    return this.size;
  }
}

/**
 * Artifact detection thresholds and parameters
 */
interface ArtifactConfig {
  eyeBlinkThreshold: number;      // Voltage threshold for eye blinks (μV)
  muscleNoiseThreshold: number;   // High-frequency power threshold
  muscleNoiseFreqMin: number;     // Minimum frequency for muscle noise (Hz)
  muscleNoiseFreqMax: number;     // Maximum frequency for muscle noise (Hz)
  gradientThreshold: number;      // Maximum allowed voltage gradient (μV/sample)
}

/**
 * Frequency band power results
 */
export interface BandPowers {
  delta: number;   // 0.5-4 Hz
  theta: number;   // 4-8 Hz
  alpha: number;   // 8-13 Hz
  beta: number;    // 13-30 Hz
  gamma: number;   // 30-50 Hz
}

/**
 * Artifact detection results
 */
export interface ArtifactDetection {
  hasEyeBlink: boolean;
  hasMuscleNoise: boolean;
  hasGradientArtifact: boolean;
  isClean: boolean;
}

/**
 * Signal quality metrics
 */
export interface SignalQuality {
  snr: number;              // Signal-to-noise ratio
  artifacts: ArtifactDetection;
  powerSpectrum: Float32Array;
  frequencies: Float32Array;
  bandPowers: BandPowers;
}

/**
 * Main SignalProcessor class
 */
export class SignalProcessor {
  private buffer: CircularBuffer;
  private samplingRate: number;
  private notchFilter: ReturnType<typeof createNotchFilter>;
  private bandpassFilter: ReturnType<typeof createBandpassFilter>;
  private artifactConfig: ArtifactConfig;
  private fftSize: number;
  private hopSize: number;

  constructor(
    samplingRate: number = SAMPLING_RATE,
    bufferDuration: number = 2.0,
    artifactConfig?: Partial<ArtifactConfig>
  ) {
    this.samplingRate = samplingRate;

    // Create circular buffer for 2 seconds of data
    const bufferSize = Math.floor(samplingRate * bufferDuration);
    this.buffer = new CircularBuffer(bufferSize);

    // Initialize filters
    this.notchFilter = createNotchFilter(60, samplingRate);
    this.bandpassFilter = createBandpassFilter(0.5, 50, samplingRate);

    // Artifact detection configuration
    this.artifactConfig = {
      eyeBlinkThreshold: 100,           // 100 μV
      muscleNoiseThreshold: 50,         // 50 μV^2
      muscleNoiseFreqMin: 20,           // 20 Hz
      muscleNoiseFreqMax: 50,           // 50 Hz
      gradientThreshold: 50,            // 50 μV/sample
      ...artifactConfig
    };

    // FFT parameters for Welch's method
    this.fftSize = 512;
    this.hopSize = this.fftSize / 2;  // 50% overlap
  }

  /**
   * Process incoming EEG sample(s)
   */
  processSample(sample: number): void {
    // Apply notch filter (remove 60Hz line noise)
    const notchFiltered = applyIIRFilter([sample], this.notchFilter)[0];

    // Apply bandpass filter (0.5-50 Hz)
    const bandpassFiltered = applyIIRFilter([notchFiltered], this.bandpassFilter)[0];

    // Add to buffer
    this.buffer.push(bandpassFiltered);
  }

  /**
   * Process multiple samples at once
   */
  processSamples(samples: number[]): void {
    // Apply filters to batch
    const notchFiltered = applyIIRFilter(samples, this.notchFilter);
    const bandpassFiltered = applyIIRFilter(notchFiltered, this.bandpassFilter);

    // Add to buffer
    this.buffer.pushMultiple(Array.from(bandpassFiltered));
  }

  /**
   * Compute power spectral density using Welch's method
   */
  private computePSDWelch(data: Float32Array): { psd: Float32Array; frequencies: Float32Array } {
    const numSegments = Math.floor((data.length - this.fftSize) / this.hopSize) + 1;

    if (numSegments < 1) {
      // Not enough data, return single FFT
      const windowed = applyWindow(data, WindowType.Hamming);
      const fft = computeFFT(windowed);
      const psd = computePSD(fft, this.samplingRate);

      const frequencies = new Float32Array(psd.length);
      for (let i = 0; i < frequencies.length; i++) {
        frequencies[i] = (i * this.samplingRate) / this.fftSize;
      }

      return { psd, frequencies };
    }

    // Initialize accumulated PSD
    let accumulatedPSD: Float32Array | null = null;

    // Process overlapping segments
    for (let i = 0; i < numSegments; i++) {
      const start = i * this.hopSize;
      const segment = data.slice(start, start + this.fftSize);

      // Apply Hamming window
      const windowed = applyWindow(segment, WindowType.Hamming);

      // Compute FFT
      const fft = computeFFT(windowed);

      // Compute PSD for this segment
      const segmentPSD = computePSD(fft, this.samplingRate);

      // Accumulate
      if (!accumulatedPSD) {
        accumulatedPSD = new Float32Array(segmentPSD.length);
      }

      for (let j = 0; j < segmentPSD.length; j++) {
        accumulatedPSD[j] += segmentPSD[j];
      }
    }

    // Average across segments
    if (accumulatedPSD) {
      for (let i = 0; i < accumulatedPSD.length; i++) {
        accumulatedPSD[i] /= numSegments;
      }
    }

    // Generate frequency bins
    const frequencies = new Float32Array(accumulatedPSD!.length);
    for (let i = 0; i < frequencies.length; i++) {
      frequencies[i] = (i * this.samplingRate) / this.fftSize;
    }

    return { psd: accumulatedPSD!, frequencies };
  }

  /**
   * Extract power in specific frequency bands
   */
  private extractBandPowers(psd: Float32Array, frequencies: Float32Array): BandPowers {
    const bands = {
      delta: { min: FLOW_BANDS.delta.min, max: FLOW_BANDS.delta.max },
      theta: { min: FLOW_BANDS.theta.min, max: FLOW_BANDS.theta.max },
      alpha: { min: FLOW_BANDS.alpha.min, max: FLOW_BANDS.alpha.max },
      beta: { min: FLOW_BANDS.beta.min, max: FLOW_BANDS.beta.max },
      gamma: { min: FLOW_BANDS.gamma.min, max: FLOW_BANDS.gamma.max }
    };

    const powers: BandPowers = {
      delta: 0,
      theta: 0,
      alpha: 0,
      beta: 0,
      gamma: 0
    };

    // Compute power in each band
    for (const [bandName, range] of Object.entries(bands)) {
      let power = 0;
      let count = 0;

      for (let i = 0; i < frequencies.length; i++) {
        if (frequencies[i] >= range.min && frequencies[i] < range.max) {
          power += psd[i];
          count++;
        }
      }

      if (count > 0) {
        powers[bandName as keyof BandPowers] = power / count;
      }
    }

    return powers;
  }

  /**
   * Detect artifacts in the signal
   */
  private detectArtifacts(data: Float32Array, psd: Float32Array, frequencies: Float32Array): ArtifactDetection {
    let hasEyeBlink = false;
    let hasMuscleNoise = false;
    let hasGradientArtifact = false;

    // Eye blink detection: sudden large amplitude changes
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > this.artifactConfig.eyeBlinkThreshold) {
        hasEyeBlink = true;
        break;
      }
    }

    // Muscle noise detection: excessive high-frequency power
    let muscleNoisePower = 0;
    let muscleNoiseCount = 0;

    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] >= this.artifactConfig.muscleNoiseFreqMin &&
          frequencies[i] <= this.artifactConfig.muscleNoiseFreqMax) {
        muscleNoisePower += psd[i];
        muscleNoiseCount++;
      }
    }

    if (muscleNoiseCount > 0) {
      const avgMusclePower = muscleNoisePower / muscleNoiseCount;
      if (avgMusclePower > this.artifactConfig.muscleNoiseThreshold) {
        hasMuscleNoise = true;
      }
    }

    // Gradient artifact detection: sudden changes between samples
    for (let i = 1; i < data.length; i++) {
      const gradient = Math.abs(data[i] - data[i - 1]);
      if (gradient > this.artifactConfig.gradientThreshold) {
        hasGradientArtifact = true;
        break;
      }
    }

    return {
      hasEyeBlink,
      hasMuscleNoise,
      hasGradientArtifact,
      isClean: !hasEyeBlink && !hasMuscleNoise && !hasGradientArtifact
    };
  }

  /**
   * Compute signal-to-noise ratio
   */
  private computeSNR(bandPowers: BandPowers): number {
    // Signal: alpha + theta power (typically associated with flow state)
    const signal = bandPowers.alpha + bandPowers.theta;

    // Noise: delta + high beta/gamma (artifacts and non-task-related activity)
    const noise = bandPowers.delta + (bandPowers.beta * 0.5) + (bandPowers.gamma * 0.8);

    if (noise === 0) return 100; // Perfect signal

    return signal / noise;
  }

  /**
   * Analyze current buffer and return signal quality metrics
   */
  analyze(): SignalQuality {
    const data = this.buffer.getData();

    // Compute power spectral density using Welch's method
    const { psd, frequencies } = this.computePSDWelch(data);

    // Extract band powers
    const bandPowers = this.extractBandPowers(psd, frequencies);

    // Detect artifacts
    const artifacts = this.detectArtifacts(data, psd, frequencies);

    // Compute SNR
    const snr = this.computeSNR(bandPowers);

    return {
      snr,
      artifacts,
      powerSpectrum: psd,
      frequencies,
      bandPowers
    };
  }

  /**
   * Get recent raw data (filtered)
   */
  getRecentData(duration: number = 1.0): Float32Array {
    const numSamples = Math.floor(duration * this.samplingRate);
    return this.buffer.getRecent(numSamples);
  }

  /**
   * Clear buffer and reset filters
   */
  reset(): void {
    this.buffer.clear();
    this.notchFilter = createNotchFilter(60, this.samplingRate);
    this.bandpassFilter = createBandpassFilter(0.5, 50, this.samplingRate);
  }

  /**
   * Update artifact detection configuration
   */
  updateArtifactConfig(config: Partial<ArtifactConfig>): void {
    this.artifactConfig = {
      ...this.artifactConfig,
      ...config
    };
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.buffer.getSize();
  }

  /**
   * Get sampling rate
   */
  getSamplingRate(): number {
    return this.samplingRate;
  }
}

/**
 * Create a new signal processor instance with default settings
 */
export function createSignalProcessor(
  samplingRate?: number,
  bufferDuration?: number
): SignalProcessor {
  return new SignalProcessor(samplingRate, bufferDuration);
}

/**
 * Compute flow state metrics from band powers
 */
export function computeFlowMetrics(bandPowers: BandPowers): {
  flowIndex: number;
  focus: number;
  relaxation: number;
  engagement: number;
} {
  // Flow index: ratio of alpha+theta to beta+delta
  const flowNumerator = bandPowers.alpha + bandPowers.theta;
  const flowDenominator = bandPowers.beta + bandPowers.delta;
  const flowIndex = flowDenominator > 0 ? flowNumerator / flowDenominator : 0;

  // Focus: beta power (cognitive engagement)
  const focus = bandPowers.beta;

  // Relaxation: alpha power (relaxed alertness)
  const relaxation = bandPowers.alpha;

  // Engagement: theta power (deep processing)
  const engagement = bandPowers.theta;

  return {
    flowIndex,
    focus,
    relaxation,
    engagement
  };
}

export default SignalProcessor;
