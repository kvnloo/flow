/**
 * Digital Signal Processing Utilities
 *
 * Provides IIR filtering, notch filters, bandpass filters, and windowing functions
 * for audio and sensor data processing.
 */

/**
 * IIR (Infinite Impulse Response) Filter
 * Implements a biquad filter structure for efficient signal processing
 */
export class IIRFilter {
  private b: number[]; // Feedforward coefficients
  private a: number[]; // Feedback coefficients
  private x: number[]; // Input history
  private y: number[]; // Output history

  /**
   * Create an IIR filter
   * @param b Feedforward coefficients [b0, b1, b2, ...]
   * @param a Feedback coefficients [a0, a1, a2, ...]
   */
  constructor(b: number[], a: number[]) {
    if (b.length === 0 || a.length === 0) {
      throw new Error('Filter coefficients cannot be empty');
    }
    if (a[0] === 0) {
      throw new Error('First feedback coefficient (a[0]) cannot be zero');
    }

    // Normalize coefficients by a[0]
    const a0 = a[0];
    this.b = b.map(coef => coef / a0);
    this.a = a.map(coef => coef / a0);

    // Initialize history buffers
    this.x = new Array(b.length).fill(0);
    this.y = new Array(a.length - 1).fill(0);
  }

  /**
   * Process a single sample through the filter
   * @param input Input sample
   * @returns Filtered output sample
   */
  process(input: number): number {
    // Shift input history
    this.x.unshift(input);
    this.x.pop();

    // Calculate output using difference equation:
    // y[n] = b0*x[n] + b1*x[n-1] + ... - a1*y[n-1] - a2*y[n-2] - ...
    let output = 0;

    // Feedforward path
    for (let i = 0; i < this.b.length; i++) {
      output += this.b[i] * this.x[i];
    }

    // Feedback path (skip a[0] since it's normalized to 1)
    for (let i = 1; i < this.a.length; i++) {
      output -= this.a[i] * this.y[i - 1];
    }

    // Shift output history
    this.y.unshift(output);
    this.y.pop();

    return output;
  }

  /**
   * Process an array of samples
   * @param input Array of input samples
   * @returns Array of filtered output samples
   */
  processBlock(input: number[]): number[] {
    return input.map(sample => this.process(sample));
  }

  /**
   * Reset filter state (clear history buffers)
   */
  reset(): void {
    this.x.fill(0);
    this.y.fill(0);
  }
}

/**
 * Create a notch filter to remove a specific frequency
 * Uses a biquad notch filter design
 *
 * @param sampleRate Sample rate in Hz
 * @param frequency Frequency to notch out in Hz
 * @param qFactor Q factor (bandwidth), higher = narrower notch (default: 10)
 * @returns IIRFilter configured as notch filter
 */
export function createNotchFilter(
  sampleRate: number,
  frequency: number,
  qFactor: number = 10
): IIRFilter {
  if (frequency <= 0 || frequency >= sampleRate / 2) {
    throw new Error('Frequency must be between 0 and Nyquist frequency');
  }
  if (qFactor <= 0) {
    throw new Error('Q factor must be positive');
  }

  // Calculate angular frequency
  const w0 = (2 * Math.PI * frequency) / sampleRate;
  const alpha = Math.sin(w0) / (2 * qFactor);

  // Biquad notch filter coefficients
  const b0 = 1;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

  return new IIRFilter([b0, b1, b2], [a0, a1, a2]);
}

/**
 * Create a bandpass filter to isolate a frequency band
 * Uses a biquad bandpass filter design
 *
 * @param sampleRate Sample rate in Hz
 * @param centerFreq Center frequency of the band in Hz
 * @param qFactor Q factor (bandwidth), higher = narrower band (default: 5)
 * @returns IIRFilter configured as bandpass filter
 */
export function createBandpassFilter(
  sampleRate: number,
  centerFreq: number,
  qFactor: number = 5
): IIRFilter {
  if (centerFreq <= 0 || centerFreq >= sampleRate / 2) {
    throw new Error('Center frequency must be between 0 and Nyquist frequency');
  }
  if (qFactor <= 0) {
    throw new Error('Q factor must be positive');
  }

  // Calculate angular frequency
  const w0 = (2 * Math.PI * centerFreq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * qFactor);

  // Biquad bandpass filter coefficients (constant skirt gain)
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

  return new IIRFilter([b0, b1, b2], [a0, a1, a2]);
}

/**
 * Create a lowpass filter
 * Uses a biquad lowpass filter design
 *
 * @param sampleRate Sample rate in Hz
 * @param cutoffFreq Cutoff frequency in Hz
 * @param qFactor Q factor (resonance), typical: 0.707 for Butterworth (default)
 * @returns IIRFilter configured as lowpass filter
 */
export function createLowpassFilter(
  sampleRate: number,
  cutoffFreq: number,
  qFactor: number = 0.707
): IIRFilter {
  if (cutoffFreq <= 0 || cutoffFreq >= sampleRate / 2) {
    throw new Error('Cutoff frequency must be between 0 and Nyquist frequency');
  }
  if (qFactor <= 0) {
    throw new Error('Q factor must be positive');
  }

  const w0 = (2 * Math.PI * cutoffFreq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * qFactor);

  const b0 = (1 - Math.cos(w0)) / 2;
  const b1 = 1 - Math.cos(w0);
  const b2 = (1 - Math.cos(w0)) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

  return new IIRFilter([b0, b1, b2], [a0, a1, a2]);
}

/**
 * Create a highpass filter
 * Uses a biquad highpass filter design
 *
 * @param sampleRate Sample rate in Hz
 * @param cutoffFreq Cutoff frequency in Hz
 * @param qFactor Q factor (resonance), typical: 0.707 for Butterworth (default)
 * @returns IIRFilter configured as highpass filter
 */
export function createHighpassFilter(
  sampleRate: number,
  cutoffFreq: number,
  qFactor: number = 0.707
): IIRFilter {
  if (cutoffFreq <= 0 || cutoffFreq >= sampleRate / 2) {
    throw new Error('Cutoff frequency must be between 0 and Nyquist frequency');
  }
  if (qFactor <= 0) {
    throw new Error('Q factor must be positive');
  }

  const w0 = (2 * Math.PI * cutoffFreq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * qFactor);

  const b0 = (1 + Math.cos(w0)) / 2;
  const b1 = -(1 + Math.cos(w0));
  const b2 = (1 + Math.cos(w0)) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

  return new IIRFilter([b0, b1, b2], [a0, a1, a2]);
}

/**
 * Generate a Hamming window function
 * Used for windowing signals before FFT to reduce spectral leakage
 *
 * @param length Window length (number of samples)
 * @returns Array of window coefficients
 */
export function hammingWindow(length: number): number[] {
  if (length <= 0) {
    throw new Error('Window length must be positive');
  }

  const window: number[] = [];
  for (let n = 0; n < length; n++) {
    // Hamming window: w(n) = 0.54 - 0.46 * cos(2πn / (N-1))
    window.push(0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (length - 1)));
  }
  return window;
}

/**
 * Apply a window function to a signal
 *
 * @param signal Input signal
 * @param window Window function (same length as signal)
 * @returns Windowed signal
 */
export function applyWindow(signal: number[], window: number[]): number[] {
  if (signal.length !== window.length) {
    throw new Error('Signal and window must have the same length');
  }
  return signal.map((sample, i) => sample * window[i]);
}

/**
 * Calculate RMS (Root Mean Square) of a signal
 * Useful for measuring signal power/amplitude
 *
 * @param signal Input signal
 * @returns RMS value
 */
export function rms(signal: number[]): number {
  if (signal.length === 0) {
    return 0;
  }
  const sumSquares = signal.reduce((sum, sample) => sum + sample * sample, 0);
  return Math.sqrt(sumSquares / signal.length);
}

/**
 * Normalize a signal to range [-1, 1]
 *
 * @param signal Input signal
 * @returns Normalized signal
 */
export function normalize(signal: number[]): number[] {
  if (signal.length === 0) {
    return [];
  }
  const max = Math.max(...signal.map(Math.abs));
  if (max === 0) {
    return signal;
  }
  return signal.map(sample => sample / max);
}
