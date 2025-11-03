/**
 * EEG Feature Extraction
 *
 * Implements comprehensive feature extraction from processed EEG signals:
 * - Band power calculation for all frequency ranges
 * - Power spectral density using Welch's method
 * - Statistical features (mean, variance, skewness, kurtosis)
 * - Temporal features (rate of change, smoothing)
 * - Spatial features (electrode asymmetry, coherence)
 */

import type { ProcessedEEG, FrequencyBands } from '../../types/eeg';

/**
 * Configuration for feature extraction
 */
export interface FeatureExtractionConfig {
  /** Window size for Welch's method (in samples) */
  welchWindowSize: number;

  /** Overlap for Welch's method (0-1) */
  welchOverlap: number;

  /** Enable statistical features */
  enableStatistical: boolean;

  /** Enable temporal features */
  enableTemporal: boolean;

  /** Enable spatial features */
  enableSpatial: boolean;

  /** Smoothing window size for temporal features */
  smoothingWindow: number;
}

/**
 * Band power features for a single electrode
 */
export interface BandPowerFeatures {
  /** Absolute power in each band (μV²) */
  absolutePower: FrequencyBands;

  /** Relative power in each band (normalized 0-1) */
  relativePower: FrequencyBands;

  /** Total power across all bands */
  totalPower: number;

  /** Dominant frequency band */
  dominantBand: keyof FrequencyBands;

  /** Band power ratios for mental state indicators */
  ratios: {
    /** Theta/Beta ratio (TBR) - higher indicates more relaxation */
    thetaBeta: number;

    /** Alpha/Theta ratio - engagement indicator */
    alphaTheta: number;

    /** Beta/Alpha ratio - alertness indicator */
    betaAlpha: number;

    /** (Beta + Gamma) / (Alpha + Theta) - focus indicator */
    focusIndex: number;
  };
}

/**
 * Power spectral density result
 */
export interface PowerSpectralDensity {
  /** Frequency bins (Hz) */
  frequencies: number[];

  /** Power values (μV²/Hz) */
  power: number[];

  /** Peak frequency */
  peakFrequency: number;

  /** Peak power */
  peakPower: number;

  /** Spectral centroid (weighted mean frequency) */
  spectralCentroid: number;

  /** Spectral spread (standard deviation around centroid) */
  spectralSpread: number;
}

/**
 * Statistical features for electrode data
 */
export interface StatisticalFeatures {
  /** Mean value */
  mean: number;

  /** Standard deviation */
  stdDev: number;

  /** Variance */
  variance: number;

  /** Skewness (asymmetry of distribution) */
  skewness: number;

  /** Kurtosis (tailedness of distribution) */
  kurtosis: number;

  /** Median value */
  median: number;

  /** Interquartile range */
  iqr: number;

  /** Range (max - min) */
  range: number;
}

/**
 * Temporal features tracking changes over time
 */
export interface TemporalFeatures {
  /** Rate of change (first derivative) */
  rateOfChange: number;

  /** Acceleration (second derivative) */
  acceleration: number;

  /** Smoothed value (moving average) */
  smoothed: number;

  /** Trend direction (-1, 0, 1) */
  trend: number;

  /** Volatility (standard deviation of changes) */
  volatility: number;
}

/**
 * Spatial features analyzing relationships between electrodes
 */
export interface SpatialFeatures {
  /** Left-right asymmetry for each band */
  asymmetry: {
    /** Frontal asymmetry (AF7 vs AF8) */
    frontal: FrequencyBands;

    /** Temporal asymmetry (TP9 vs TP10) */
    temporal: FrequencyBands;

    /** Overall asymmetry index */
    overall: number;
  };

  /** Cross-electrode coherence (0-1) */
  coherence: {
    /** Frontal coherence (AF7-AF8) */
    frontal: number;

    /** Temporal coherence (TP9-TP10) */
    temporal: number;

    /** Left hemisphere coherence (TP9-AF7) */
    leftHemisphere: number;

    /** Right hemisphere coherence (AF8-TP10) */
    rightHemisphere: number;
  };
}

/**
 * Complete feature set extracted from EEG data
 */
export interface EEGFeatures {
  /** Timestamp of the feature extraction */
  timestamp: number;

  /** Band power features per electrode */
  bandPower: {
    TP9: BandPowerFeatures;
    AF7: BandPowerFeatures;
    AF8: BandPowerFeatures;
    TP10: BandPowerFeatures;
  };

  /** Average band power features */
  averageBandPower: BandPowerFeatures;

  /** Power spectral density per electrode */
  psd?: {
    TP9: PowerSpectralDensity;
    AF7: PowerSpectralDensity;
    AF8: PowerSpectralDensity;
    TP10: PowerSpectralDensity;
  };

  /** Statistical features per electrode */
  statistical?: {
    TP9: StatisticalFeatures;
    AF7: StatisticalFeatures;
    AF8: StatisticalFeatures;
    TP10: StatisticalFeatures;
  };

  /** Temporal features per electrode */
  temporal?: {
    TP9: TemporalFeatures;
    AF7: TemporalFeatures;
    AF8: TemporalFeatures;
    TP10: TemporalFeatures;
  };

  /** Spatial features across electrodes */
  spatial?: SpatialFeatures;
}

/**
 * Default configuration for feature extraction
 */
export const DEFAULT_FEATURE_CONFIG: FeatureExtractionConfig = {
  welchWindowSize: 256,
  welchOverlap: 0.5,
  enableStatistical: true,
  enableTemporal: true,
  enableSpatial: true,
  smoothingWindow: 10,
};

/**
 * Extract band power features from frequency bands
 */
export function extractBandPowerFeatures(bands: FrequencyBands): BandPowerFeatures {
  // Calculate total power
  const totalPower = bands.delta + bands.theta + bands.alpha + bands.beta + bands.gamma;

  // Calculate relative power (normalized)
  const relativePower: FrequencyBands = {
    delta: totalPower > 0 ? bands.delta / totalPower : 0,
    theta: totalPower > 0 ? bands.theta / totalPower : 0,
    alpha: totalPower > 0 ? bands.alpha / totalPower : 0,
    beta: totalPower > 0 ? bands.beta / totalPower : 0,
    gamma: totalPower > 0 ? bands.gamma / totalPower : 0,
  };

  // Find dominant band
  const bandEntries = Object.entries(bands) as [keyof FrequencyBands, number][];
  const dominantBand = bandEntries.reduce((max, entry) =>
    entry[1] > max[1] ? entry : max
  )[0];

  // Calculate band power ratios
  const thetaBeta = bands.beta > 0 ? bands.theta / bands.beta : 0;
  const alphaTheta = bands.theta > 0 ? bands.alpha / bands.theta : 0;
  const betaAlpha = bands.alpha > 0 ? bands.beta / bands.alpha : 0;
  const focusIndex = (bands.alpha + bands.theta) > 0
    ? (bands.beta + bands.gamma) / (bands.alpha + bands.theta)
    : 0;

  return {
    absolutePower: bands,
    relativePower,
    totalPower,
    dominantBand,
    ratios: {
      thetaBeta,
      alphaTheta,
      betaAlpha,
      focusIndex,
    },
  };
}

/**
 * Calculate power spectral density using Welch's method
 *
 * @param signal - Time series signal data
 * @param sampleRate - Sampling rate in Hz
 * @param config - Feature extraction configuration
 * @returns Power spectral density
 */
export function calculatePSD(
  signal: number[],
  sampleRate: number,
  config: FeatureExtractionConfig
): PowerSpectralDensity {
  const windowSize = config.welchWindowSize;
  const overlap = Math.floor(windowSize * config.welchOverlap);
  const step = windowSize - overlap;

  // Calculate number of windows
  const numWindows = Math.floor((signal.length - windowSize) / step) + 1;

  if (numWindows < 1) {
    // Not enough data, return empty PSD
    return {
      frequencies: [],
      power: [],
      peakFrequency: 0,
      peakPower: 0,
      spectralCentroid: 0,
      spectralSpread: 0,
    };
  }

  // Initialize accumulator for averaged periodogram
  const fftSize = windowSize;
  const powerSum = new Array(Math.floor(fftSize / 2) + 1).fill(0);

  // Apply Welch's method: average multiple windowed FFTs
  for (let i = 0; i < numWindows; i++) {
    const windowStart = i * step;
    const windowData = signal.slice(windowStart, windowStart + windowSize);

    // Apply Hann window to reduce spectral leakage
    const windowed = applyHannWindow(windowData);

    // Compute FFT (simplified - in production use a proper FFT library)
    const periodogram = computeSimplePeriodogram(windowed, sampleRate);

    // Accumulate power
    for (let j = 0; j < powerSum.length; j++) {
      powerSum[j] += periodogram.power[j];
    }
  }

  // Average the power
  const power = powerSum.map(p => p / numWindows);

  // Generate frequency bins
  const frequencies = Array.from(
    { length: power.length },
    (_, i) => (i * sampleRate) / fftSize
  );

  // Find peak
  let peakIdx = 0;
  let peakPower = power[0];
  for (let i = 1; i < power.length; i++) {
    if (power[i] > peakPower) {
      peakPower = power[i];
      peakIdx = i;
    }
  }
  const peakFrequency = frequencies[peakIdx];

  // Calculate spectral centroid (weighted mean frequency)
  let weightedSum = 0;
  let totalPower = 0;
  for (let i = 0; i < frequencies.length; i++) {
    weightedSum += frequencies[i] * power[i];
    totalPower += power[i];
  }
  const spectralCentroid = totalPower > 0 ? weightedSum / totalPower : 0;

  // Calculate spectral spread (standard deviation around centroid)
  let variance = 0;
  for (let i = 0; i < frequencies.length; i++) {
    const diff = frequencies[i] - spectralCentroid;
    variance += diff * diff * power[i];
  }
  const spectralSpread = totalPower > 0 ? Math.sqrt(variance / totalPower) : 0;

  return {
    frequencies,
    power,
    peakFrequency,
    peakPower,
    spectralCentroid,
    spectralSpread,
  };
}

/**
 * Apply Hann window to signal to reduce spectral leakage
 */
function applyHannWindow(signal: number[]): number[] {
  const n = signal.length;
  return signal.map((value, i) => {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    return value * window;
  });
}

/**
 * Compute simplified periodogram (magnitude squared of FFT)
 * Note: This is a simplified implementation. In production, use a proper FFT library.
 */
function computeSimplePeriodogram(
  signal: number[],
  sampleRate: number
): { frequencies: number[]; power: number[] } {
  const n = signal.length;
  const halfN = Math.floor(n / 2) + 1;

  // Simplified DFT for demonstration
  // In production, use an FFT library like fft.js or dsp.js
  const power: number[] = [];
  const frequencies: number[] = [];

  for (let k = 0; k < halfN; k++) {
    let real = 0;
    let imag = 0;

    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n;
      real += signal[t] * Math.cos(angle);
      imag += signal[t] * Math.sin(angle);
    }

    // Power = |X[k]|² / N
    power.push((real * real + imag * imag) / n);
    frequencies.push((k * sampleRate) / n);
  }

  return { frequencies, power };
}

/**
 * Calculate statistical features from a signal
 */
export function calculateStatisticalFeatures(signal: number[]): StatisticalFeatures {
  const n = signal.length;

  if (n === 0) {
    return {
      mean: 0,
      stdDev: 0,
      variance: 0,
      skewness: 0,
      kurtosis: 0,
      median: 0,
      iqr: 0,
      range: 0,
    };
  }

  // Mean
  const mean = signal.reduce((sum, val) => sum + val, 0) / n;

  // Variance and standard deviation
  const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Skewness (third moment)
  const skewness = stdDev > 0
    ? signal.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n
    : 0;

  // Kurtosis (fourth moment) - excess kurtosis (subtract 3 for normal distribution baseline)
  const kurtosis = stdDev > 0
    ? (signal.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / n) - 3
    : 0;

  // Median and IQR
  const sorted = [...signal].sort((a, b) => a - b);
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  // Range
  const range = sorted[n - 1] - sorted[0];

  return {
    mean,
    stdDev,
    variance,
    skewness,
    kurtosis,
    median,
    iqr,
    range,
  };
}

/**
 * Calculate temporal features from signal history
 */
export function calculateTemporalFeatures(
  currentValue: number,
  history: number[],
  config: FeatureExtractionConfig
): TemporalFeatures {
  const n = history.length;

  if (n === 0) {
    return {
      rateOfChange: 0,
      acceleration: 0,
      smoothed: currentValue,
      trend: 0,
      volatility: 0,
    };
  }

  // Rate of change (first derivative)
  const rateOfChange = n >= 1 ? currentValue - history[n - 1] : 0;

  // Acceleration (second derivative)
  const acceleration = n >= 2
    ? (currentValue - history[n - 1]) - (history[n - 1] - history[n - 2])
    : 0;

  // Smoothed value (moving average)
  const windowSize = Math.min(config.smoothingWindow, n);
  const recentHistory = history.slice(-windowSize);
  const smoothed = (recentHistory.reduce((sum, val) => sum + val, 0) + currentValue) / (windowSize + 1);

  // Trend detection (simple linear regression slope)
  let trend = 0;
  if (n >= 3) {
    const recent = [...history.slice(-10), currentValue];
    const x = Array.from({ length: recent.length }, (_, i) => i);
    const y = recent;

    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < x.length; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += Math.pow(x[i] - meanX, 2);
    }

    const slope = denominator > 0 ? numerator / denominator : 0;
    trend = slope > 0.1 ? 1 : (slope < -0.1 ? -1 : 0);
  }

  // Volatility (standard deviation of changes)
  const changes: number[] = [];
  for (let i = 1; i < history.length; i++) {
    changes.push(history[i] - history[i - 1]);
  }
  changes.push(currentValue - history[history.length - 1]);

  const meanChange = changes.reduce((sum, val) => sum + val, 0) / changes.length;
  const volatility = Math.sqrt(
    changes.reduce((sum, val) => sum + Math.pow(val - meanChange, 2), 0) / changes.length
  );

  return {
    rateOfChange,
    acceleration,
    smoothed,
    trend,
    volatility,
  };
}

/**
 * Calculate spatial features analyzing electrode relationships
 */
export function calculateSpatialFeatures(
  bands: {
    TP9: FrequencyBands;
    AF7: FrequencyBands;
    AF8: FrequencyBands;
    TP10: FrequencyBands;
  }
): SpatialFeatures {
  // Calculate asymmetry indices for each band
  const frontalAsymmetry: FrequencyBands = {
    delta: calculateAsymmetryIndex(bands.AF8.delta, bands.AF7.delta),
    theta: calculateAsymmetryIndex(bands.AF8.theta, bands.AF7.theta),
    alpha: calculateAsymmetryIndex(bands.AF8.alpha, bands.AF7.alpha),
    beta: calculateAsymmetryIndex(bands.AF8.beta, bands.AF7.beta),
    gamma: calculateAsymmetryIndex(bands.AF8.gamma, bands.AF7.gamma),
  };

  const temporalAsymmetry: FrequencyBands = {
    delta: calculateAsymmetryIndex(bands.TP10.delta, bands.TP9.delta),
    theta: calculateAsymmetryIndex(bands.TP10.theta, bands.TP9.theta),
    alpha: calculateAsymmetryIndex(bands.TP10.alpha, bands.TP9.alpha),
    beta: calculateAsymmetryIndex(bands.TP10.beta, bands.TP9.beta),
    gamma: calculateAsymmetryIndex(bands.TP10.gamma, bands.TP9.gamma),
  };

  // Overall asymmetry (average of absolute asymmetry values)
  const allAsymmetries = [
    ...Object.values(frontalAsymmetry),
    ...Object.values(temporalAsymmetry),
  ];
  const overall = allAsymmetries.reduce((sum, val) => sum + Math.abs(val), 0) / allAsymmetries.length;

  // Calculate coherence between electrode pairs
  const frontalCoherence = calculateCoherence(
    Object.values(bands.AF7),
    Object.values(bands.AF8)
  );

  const temporalCoherence = calculateCoherence(
    Object.values(bands.TP9),
    Object.values(bands.TP10)
  );

  const leftHemisphereCoherence = calculateCoherence(
    Object.values(bands.TP9),
    Object.values(bands.AF7)
  );

  const rightHemisphereCoherence = calculateCoherence(
    Object.values(bands.AF8),
    Object.values(bands.TP10)
  );

  return {
    asymmetry: {
      frontal: frontalAsymmetry,
      temporal: temporalAsymmetry,
      overall,
    },
    coherence: {
      frontal: frontalCoherence,
      temporal: temporalCoherence,
      leftHemisphere: leftHemisphereCoherence,
      rightHemisphere: rightHemisphereCoherence,
    },
  };
}

/**
 * Calculate asymmetry index between two electrodes
 * Returns (right - left) / (right + left), normalized to [-1, 1]
 */
function calculateAsymmetryIndex(right: number, left: number): number {
  const sum = right + left;
  return sum > 0 ? (right - left) / sum : 0;
}

/**
 * Calculate coherence between two signals (simplified correlation)
 */
function calculateCoherence(signal1: number[], signal2: number[]): number {
  const n = Math.min(signal1.length, signal2.length);

  if (n === 0) return 0;

  // Calculate means
  const mean1 = signal1.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
  const mean2 = signal2.slice(0, n).reduce((sum, val) => sum + val, 0) / n;

  // Calculate correlation coefficient
  let numerator = 0;
  let sumSq1 = 0;
  let sumSq2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = signal1[i] - mean1;
    const diff2 = signal2[i] - mean2;
    numerator += diff1 * diff2;
    sumSq1 += diff1 * diff1;
    sumSq2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(sumSq1 * sumSq2);
  return denominator > 0 ? Math.abs(numerator / denominator) : 0;
}

/**
 * Extract complete feature set from processed EEG data
 *
 * @param data - Processed EEG data
 * @param config - Feature extraction configuration
 * @returns Complete EEG features
 */
export function extractFeatures(
  data: ProcessedEEG,
  config: FeatureExtractionConfig = DEFAULT_FEATURE_CONFIG
): EEGFeatures {
  // Extract band power features for each electrode
  const bandPower = {
    TP9: extractBandPowerFeatures(data.bands.TP9),
    AF7: extractBandPowerFeatures(data.bands.AF7),
    AF8: extractBandPowerFeatures(data.bands.AF8),
    TP10: extractBandPowerFeatures(data.bands.TP10),
  };

  // Average band power features
  const averageBandPower = extractBandPowerFeatures(data.averageBands);

  // Spatial features
  const spatial = config.enableSpatial
    ? calculateSpatialFeatures(data.bands)
    : undefined;

  return {
    timestamp: data.timestamp,
    bandPower,
    averageBandPower,
    spatial,
    // PSD, statistical, and temporal features would be calculated from raw signal data
    // These require access to the raw time series, not just the processed bands
    // They would be added by a feature extraction pipeline that has the full signal history
  };
}

/**
 * Extract features from multiple processed EEG samples
 * Useful for batch processing and building feature history
 */
export function extractFeaturesFromBatch(
  samples: ProcessedEEG[],
  config: FeatureExtractionConfig = DEFAULT_FEATURE_CONFIG
): EEGFeatures[] {
  return samples.map(sample => extractFeatures(sample, config));
}

/**
 * Build feature history for temporal analysis
 * Maintains a rolling window of features for trend detection
 */
export class FeatureHistory {
  private history: EEGFeatures[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Add new features to history
   */
  add(features: EEGFeatures): void {
    this.history.push(features);

    // Maintain max size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
  }

  /**
   * Get most recent features
   */
  getLatest(): EEGFeatures | undefined {
    return this.history[this.history.length - 1];
  }

  /**
   * Get all features in history
   */
  getAll(): EEGFeatures[] {
    return [...this.history];
  }

  /**
   * Get features within a time range
   */
  getRange(startTime: number, endTime: number): EEGFeatures[] {
    return this.history.filter(
      f => f.timestamp >= startTime && f.timestamp <= endTime
    );
  }

  /**
   * Calculate temporal trends from history
   */
  getTrends(): {
    focusTrend: number;
    relaxationTrend: number;
    dominantBandChanges: Map<keyof FrequencyBands, number>;
  } {
    if (this.history.length < 2) {
      return {
        focusTrend: 0,
        relaxationTrend: 0,
        dominantBandChanges: new Map(),
      };
    }

    // Track focus index changes
    const focusValues = this.history.map(f => f.averageBandPower.ratios.focusIndex);
    const focusTrend = this.calculateTrend(focusValues);

    // Track theta/beta ratio changes (relaxation indicator)
    const relaxationValues = this.history.map(f => f.averageBandPower.ratios.thetaBeta);
    const relaxationTrend = this.calculateTrend(relaxationValues);

    // Track dominant band transitions
    const dominantBandChanges = new Map<keyof FrequencyBands, number>();
    for (let i = 1; i < this.history.length; i++) {
      const currentBand = this.history[i].averageBandPower.dominantBand;
      const previousBand = this.history[i - 1].averageBandPower.dominantBand;

      if (currentBand !== previousBand) {
        dominantBandChanges.set(
          currentBand,
          (dominantBandChanges.get(currentBand) || 0) + 1
        );
      }
    }

    return {
      focusTrend,
      relaxationTrend,
      dominantBandChanges,
    };
  }

  /**
   * Calculate linear trend from values (-1: decreasing, 0: stable, 1: increasing)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = values.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (values[i] - meanY);
      denominator += Math.pow(x[i] - meanX, 2);
    }

    const slope = denominator > 0 ? numerator / denominator : 0;

    // Normalize to -1, 0, 1
    return slope > 0.01 ? 1 : (slope < -0.01 ? -1 : 0);
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
  }
}
