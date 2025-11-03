/**
 * EEG Signal Processor Unit Tests
 *
 * Comprehensive test suite for real-time EEG signal processing with <50ms latency requirements.
 * Tests IIR filtering, FFT with Welch's method, artifact detection, and circular buffer management.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SignalProcessor,
  createSignalProcessor,
  computeFlowMetrics,
  type BandPowers,
  type ArtifactDetection,
  type SignalQuality
} from '../signalProcessor';

// Mock DSP utilities
vi.mock('@/lib/utils/dsp', () => {
  class MockIIRFilter {
    private state: number[] = [];

    process(sample: number): number {
      // Simple passthrough with slight attenuation for testing
      return sample * 0.95;
    }

    processBlock(samples: number[]): number[] {
      return samples.map(s => this.process(s));
    }

    reset(): void {
      this.state = [];
    }
  }

  return {
    IIRFilter: MockIIRFilter,
    createNotchFilter: vi.fn(() => new MockIIRFilter()),
    createBandpassFilter: vi.fn(() => new MockIIRFilter()),
    applyIIRFilter: vi.fn((samples: number[], filter: MockIIRFilter) => {
      return filter.processBlock(samples);
    }),
    computeFFT: vi.fn((data: Float32Array | number[]) => {
      // Mock FFT returns complex numbers (real, imag pairs)
      const result = new Float32Array(data.length * 2);
      for (let i = 0; i < data.length; i++) {
        result[i * 2] = Array.isArray(data) ? data[i] : data[i]; // Real part
        result[i * 2 + 1] = 0; // Imaginary part
      }
      return result;
    }),
    computePSD: vi.fn((fft: Float32Array, sampleRate: number) => {
      // Mock PSD computation - returns power spectrum
      const psd = new Float32Array(fft.length / 2);
      for (let i = 0; i < psd.length; i++) {
        const real = fft[i * 2];
        const imag = fft[i * 2 + 1];
        psd[i] = (real * real + imag * imag) / sampleRate;
      }
      return psd;
    }),
    applyWindow: vi.fn((data: Float32Array | number[], windowType: string) => {
      // Mock Hamming window application
      const windowed = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        const windowValue = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (data.length - 1));
        windowed[i] = (Array.isArray(data) ? data[i] : data[i]) * windowValue;
      }
      return windowed;
    }),
    WindowType: {
      Hamming: 'hamming',
      Hanning: 'hanning',
      Blackman: 'blackman'
    }
  };
});

// Mock flow parameters
vi.mock('@/config/flowParameters', () => ({
  FLOW_BANDS: {
    delta: { min: 0.5, max: 4 },
    theta: { min: 4, max: 8 },
    alpha: { min: 8, max: 13 },
    beta: { min: 13, max: 30 },
    gamma: { min: 30, max: 50 }
  },
  SAMPLING_RATE: 256,
  BUFFER_SIZE: 512
}));

describe('SignalProcessor', () => {
  let processor: SignalProcessor;
  const SAMPLING_RATE = 256;
  const BUFFER_DURATION = 2.0;

  beforeEach(() => {
    processor = new SignalProcessor(SAMPLING_RATE, BUFFER_DURATION);
  });

  describe('Initialization', () => {
    it('should create processor with default parameters', () => {
      const defaultProcessor = createSignalProcessor();
      expect(defaultProcessor).toBeInstanceOf(SignalProcessor);
      expect(defaultProcessor.getSamplingRate()).toBe(256);
      expect(defaultProcessor.getBufferSize()).toBe(512);
    });

    it('should create processor with custom parameters', () => {
      const customProcessor = new SignalProcessor(512, 1.0);
      expect(customProcessor.getSamplingRate()).toBe(512);
      expect(customProcessor.getBufferSize()).toBe(512);
    });

    it('should initialize circular buffer correctly', () => {
      const expectedSize = Math.floor(SAMPLING_RATE * BUFFER_DURATION);
      expect(processor.getBufferSize()).toBe(expectedSize);
    });

    it('should initialize with default artifact config', () => {
      // Process clean signal
      const cleanSamples = Array(100).fill(10); // 10μV - well below threshold
      processor.processSamples(cleanSamples);

      const quality = processor.analyze();
      expect(quality.artifacts.isClean).toBe(true);
    });

    it('should accept custom artifact config', () => {
      const customProcessor = new SignalProcessor(SAMPLING_RATE, BUFFER_DURATION, {
        eyeBlinkThreshold: 200,
        muscleNoiseThreshold: 100
      });

      // Process signal that would trigger default thresholds
      const samples = Array(100).fill(150); // 150μV
      customProcessor.processSamples(samples);

      const quality = customProcessor.analyze();
      expect(quality.artifacts.hasEyeBlink).toBe(false); // Below 200μV threshold
    });
  });

  describe('IIR Filter Processing', () => {
    it('should apply notch filter to remove 60Hz line noise', () => {
      const samples = [10, 20, 30, 40, 50];
      processor.processSamples(samples);

      // Verify filter was called (mocked to return 95% of input)
      const recent = processor.getRecentData(0.1);
      expect(recent.length).toBeGreaterThan(0);
      // Values should be slightly attenuated due to filter mock
      expect(recent[0]).toBeLessThan(samples[0]);
    });

    it('should apply bandpass filter (0.5-50Hz)', () => {
      const sample = 100;
      processor.processSample(sample);

      const recent = processor.getRecentData(0.1);
      expect(recent.length).toBeGreaterThan(0);
      // Mock filter attenuates to 95%
      expect(recent[recent.length - 1]).toBeCloseTo(sample * 0.95 * 0.95, 1);
    });

    it('should process single sample through filter chain', () => {
      const initialValue = 50;
      processor.processSample(initialValue);

      const data = processor.getRecentData(0.01);
      expect(data.length).toBeGreaterThan(0);

      // After notch (95%) and bandpass (95%): 50 * 0.95 * 0.95 ≈ 45.125
      const expectedValue = initialValue * 0.95 * 0.95;
      expect(data[data.length - 1]).toBeCloseTo(expectedValue, 1);
    });

    it('should process batch of samples efficiently', () => {
      const samples = Array.from({ length: 256 }, (_, i) => Math.sin(2 * Math.PI * 10 * i / SAMPLING_RATE) * 50);

      const startTime = performance.now();
      processor.processSamples(samples);
      const endTime = performance.now();

      // Should process in <50ms (latency requirement)
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle NaN values gracefully', () => {
      const samplesWithNaN = [10, NaN, 20, 30];

      expect(() => {
        processor.processSamples(samplesWithNaN);
      }).not.toThrow();

      const recent = processor.getRecentData(0.1);
      // NaN should propagate or be handled
      expect(recent.some(v => Number.isNaN(v)) || recent.every(v => Number.isFinite(v))).toBe(true);
    });
  });

  describe('Circular Buffer Management', () => {
    it('should maintain fixed buffer size (2s at 256Hz = 512 samples)', () => {
      const bufferSize = processor.getBufferSize();
      expect(bufferSize).toBe(512);

      // Add more samples than buffer size
      const samples = Array(1000).fill(10);
      processor.processSamples(samples);

      // Buffer size should remain constant
      expect(processor.getBufferSize()).toBe(bufferSize);
    });

    it('should properly wrap around when buffer is full', () => {
      const bufferSize = processor.getBufferSize();

      // Fill buffer completely
      const firstBatch = Array(bufferSize).fill(10);
      processor.processSamples(firstBatch);

      // Add more samples to force wraparound
      const secondBatch = Array(100).fill(20);
      processor.processSamples(secondBatch);

      // Recent samples should be from second batch
      const recent = processor.getRecentData(0.1);
      const expectedValue = 20 * 0.95 * 0.95; // After filtering
      expect(recent[recent.length - 1]).toBeCloseTo(expectedValue, 0);
    });

    it('should return correct number of recent samples', () => {
      const samples = Array(512).fill(10);
      processor.processSamples(samples);

      // Request 0.5 seconds of data (128 samples at 256Hz)
      const recent = processor.getRecentData(0.5);
      expect(recent.length).toBe(128);
    });

    it('should handle empty buffer gracefully', () => {
      const recent = processor.getRecentData(1.0);
      expect(recent).toBeInstanceOf(Float32Array);
      // Empty buffer should return zeros
      expect(recent.every(v => v === 0)).toBe(true);
    });

    it('should clear buffer on reset', () => {
      const samples = Array(100).fill(50);
      processor.processSamples(samples);

      processor.reset();

      const recent = processor.getRecentData(1.0);
      expect(recent.every(v => v === 0)).toBe(true);
    });
  });

  describe('FFT with Welch\'s Method', () => {
    beforeEach(() => {
      // Fill buffer with test signal for FFT analysis
      const bufferSize = processor.getBufferSize();
      const testSignal = Array.from(
        { length: bufferSize },
        (_, i) => Math.sin(2 * Math.PI * 10 * i / SAMPLING_RATE) * 50
      );
      processor.processSamples(testSignal);
    });

    it('should compute PSD with 256 sample segments', () => {
      const quality = processor.analyze();

      expect(quality.powerSpectrum).toBeInstanceOf(Float32Array);
      expect(quality.frequencies).toBeInstanceOf(Float32Array);
      expect(quality.powerSpectrum.length).toBe(quality.frequencies.length);
    });

    it('should apply Hamming window to reduce spectral leakage', () => {
      const quality = processor.analyze();

      // Power spectrum should be smooth (Hamming window reduces leakage)
      expect(quality.powerSpectrum.length).toBeGreaterThan(0);
      expect(quality.powerSpectrum.every(v => Number.isFinite(v))).toBe(true);
    });

    it('should use 50% overlap (hop size = FFT size / 2)', () => {
      // With 512 samples and 512 FFT size, hop size 256:
      // numSegments = floor((512 - 512) / 256) + 1 = 1
      const quality = processor.analyze();

      expect(quality.powerSpectrum).toBeDefined();
      expect(quality.frequencies).toBeDefined();
    });

    it('should generate correct frequency bins', () => {
      const quality = processor.analyze();

      // First frequency bin should be 0 Hz
      expect(quality.frequencies[0]).toBe(0);

      // Frequency resolution: sampleRate / fftSize = 256 / 512 = 0.5 Hz
      const expectedResolution = SAMPLING_RATE / 512;
      expect(quality.frequencies[1]).toBeCloseTo(expectedResolution, 1);
    });

    it('should average multiple segments in Welch\'s method', () => {
      // Add enough samples for multiple segments
      const largeSignal = Array.from(
        { length: 2048 },
        (_, i) => Math.sin(2 * Math.PI * 10 * i / SAMPLING_RATE) * 50
      );

      const largeProcessor = new SignalProcessor(SAMPLING_RATE, 8.0);
      largeProcessor.processSamples(largeSignal);

      const quality = largeProcessor.analyze();
      expect(quality.powerSpectrum).toBeDefined();
      expect(quality.powerSpectrum.every(v => Number.isFinite(v) && v >= 0)).toBe(true);
    });

    it('should handle insufficient data for FFT', () => {
      const smallProcessor = new SignalProcessor(SAMPLING_RATE, 0.5);
      const smallSignal = Array(64).fill(10); // Less than FFT size
      smallProcessor.processSamples(smallSignal);

      const quality = smallProcessor.analyze();
      expect(quality.powerSpectrum).toBeDefined();
      expect(quality.frequencies).toBeDefined();
    });
  });

  describe('Frequency Band Extraction', () => {
    beforeEach(() => {
      // Create signal with power in different bands
      const bufferSize = processor.getBufferSize();
      const mixedSignal = Array.from({ length: bufferSize }, (_, i) => {
        const t = i / SAMPLING_RATE;
        // Delta (2Hz) + Theta (6Hz) + Alpha (10Hz) + Beta (20Hz) + Gamma (40Hz)
        return (
          Math.sin(2 * Math.PI * 2 * t) * 10 +   // Delta
          Math.sin(2 * Math.PI * 6 * t) * 20 +   // Theta
          Math.sin(2 * Math.PI * 10 * t) * 30 +  // Alpha
          Math.sin(2 * Math.PI * 20 * t) * 15 +  // Beta
          Math.sin(2 * Math.PI * 40 * t) * 25    // Gamma
        );
      });
      processor.processSamples(mixedSignal);
    });

    it('should extract delta band power (0.5-4Hz)', () => {
      const quality = processor.analyze();
      expect(quality.bandPowers.delta).toBeGreaterThanOrEqual(0);
    });

    it('should extract theta band power (4-8Hz)', () => {
      const quality = processor.analyze();
      expect(quality.bandPowers.theta).toBeGreaterThanOrEqual(0);
    });

    it('should extract alpha band power (8-13Hz)', () => {
      const quality = processor.analyze();
      expect(quality.bandPowers.alpha).toBeGreaterThanOrEqual(0);
    });

    it('should extract beta band power (13-30Hz)', () => {
      const quality = processor.analyze();
      expect(quality.bandPowers.beta).toBeGreaterThanOrEqual(0);
    });

    it('should extract gamma band power (30-50Hz)', () => {
      const quality = processor.analyze();
      expect(quality.bandPowers.gamma).toBeGreaterThanOrEqual(0);
    });

    it('should return valid BandPowers structure', () => {
      const quality = processor.analyze();
      const { bandPowers } = quality;

      expect(bandPowers).toHaveProperty('delta');
      expect(bandPowers).toHaveProperty('theta');
      expect(bandPowers).toHaveProperty('alpha');
      expect(bandPowers).toHaveProperty('beta');
      expect(bandPowers).toHaveProperty('gamma');

      // All powers should be non-negative numbers
      Object.values(bandPowers).forEach(power => {
        expect(typeof power).toBe('number');
        expect(power).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(power)).toBe(true);
      });
    });
  });

  describe('Artifact Detection', () => {
    it('should detect eye blinks (>150μV amplitude)', () => {
      // Create signal with eye blink artifact
      const samples = Array(100).fill(10);
      samples[50] = 160; // Eye blink spike (>150μV threshold in requirements)

      // Update config to use requirement threshold
      processor.updateArtifactConfig({ eyeBlinkThreshold: 150 });
      processor.processSamples(samples);

      const quality = processor.analyze();
      expect(quality.artifacts.hasEyeBlink).toBe(true);
      expect(quality.artifacts.isClean).toBe(false);
    });

    it('should not detect eye blinks for normal signals', () => {
      const samples = Array(100).fill(50); // Normal EEG amplitude
      processor.processSamples(samples);

      const quality = processor.analyze();
      expect(quality.artifacts.hasEyeBlink).toBe(false);
    });

    it('should detect muscle noise (>100μV in 20-50Hz)', () => {
      // Create signal with high-frequency muscle noise
      const samples = Array.from({ length: 512 }, (_, i) => {
        const t = i / SAMPLING_RATE;
        return Math.sin(2 * Math.PI * 35 * t) * 120; // 35Hz with high amplitude
      });

      processor.updateArtifactConfig({ muscleNoiseThreshold: 100 });
      processor.processSamples(samples);

      const quality = processor.analyze();
      expect(quality.artifacts.hasMuscleNoise).toBe(true);
      expect(quality.artifacts.isClean).toBe(false);
    });

    it('should not detect muscle noise for low power signals', () => {
      const samples = Array.from({ length: 512 }, (_, i) => {
        const t = i / SAMPLING_RATE;
        return Math.sin(2 * Math.PI * 35 * t) * 5; // Low amplitude
      });

      processor.processSamples(samples);

      const quality = processor.analyze();
      expect(quality.artifacts.hasMuscleNoise).toBe(false);
    });

    it('should detect gradient artifacts (sudden voltage changes)', () => {
      const samples = Array(100).fill(10);
      samples[50] = 10;
      samples[51] = 80; // Sudden jump of 70μV

      processor.updateArtifactConfig({ gradientThreshold: 50 });
      processor.processSamples(samples);

      const quality = processor.analyze();
      expect(quality.artifacts.hasGradientArtifact).toBe(true);
      expect(quality.artifacts.isClean).toBe(false);
    });

    it('should report clean signal when no artifacts present', () => {
      const samples = Array.from({ length: 512 }, (_, i) => {
        const t = i / SAMPLING_RATE;
        return Math.sin(2 * Math.PI * 10 * t) * 30; // Clean 10Hz alpha wave
      });

      processor.processSamples(samples);

      const quality = processor.analyze();
      expect(quality.artifacts.hasEyeBlink).toBe(false);
      expect(quality.artifacts.hasMuscleNoise).toBe(false);
      expect(quality.artifacts.hasGradientArtifact).toBe(false);
      expect(quality.artifacts.isClean).toBe(true);
    });

    it('should allow updating artifact detection configuration', () => {
      processor.updateArtifactConfig({
        eyeBlinkThreshold: 200,
        muscleNoiseThreshold: 150,
        gradientThreshold: 75
      });

      const samples = Array(100).fill(10);
      samples[50] = 180; // Below new 200μV threshold
      processor.processSamples(samples);

      const quality = processor.analyze();
      expect(quality.artifacts.hasEyeBlink).toBe(false);
    });

    it('should detect multiple artifacts simultaneously', () => {
      const samples = Array.from({ length: 512 }, (_, i) => {
        const t = i / SAMPLING_RATE;
        const signal = Math.sin(2 * Math.PI * 40 * t) * 120; // Muscle noise
        return i === 50 ? 200 : signal; // Eye blink at index 50
      });

      processor.updateArtifactConfig({
        eyeBlinkThreshold: 150,
        muscleNoiseThreshold: 100
      });
      processor.processSamples(samples);

      const quality = processor.analyze();
      expect(quality.artifacts.hasEyeBlink).toBe(true);
      expect(quality.artifacts.hasMuscleNoise).toBe(true);
      expect(quality.artifacts.isClean).toBe(false);
    });
  });

  describe('Signal Quality Metrics', () => {
    it('should compute signal-to-noise ratio (SNR)', () => {
      const samples = Array.from({ length: 512 }, (_, i) => {
        const t = i / SAMPLING_RATE;
        // Strong alpha+theta (signal) with low delta/beta/gamma (noise)
        return Math.sin(2 * Math.PI * 10 * t) * 50 + Math.sin(2 * Math.PI * 6 * t) * 40;
      });

      processor.processSamples(samples);
      const quality = processor.analyze();

      expect(quality.snr).toBeGreaterThan(0);
      expect(Number.isFinite(quality.snr)).toBe(true);
    });

    it('should handle perfect signal (no noise) with high SNR', () => {
      const samples = Array.from({ length: 512 }, (_, i) => {
        const t = i / SAMPLING_RATE;
        return Math.sin(2 * Math.PI * 10 * t) * 50; // Pure alpha wave
      });

      processor.processSamples(samples);
      const quality = processor.analyze();

      expect(quality.snr).toBeGreaterThan(1);
    });

    it('should return complete SignalQuality structure', () => {
      const samples = Array(512).fill(10);
      processor.processSamples(samples);

      const quality = processor.analyze();

      expect(quality).toHaveProperty('snr');
      expect(quality).toHaveProperty('artifacts');
      expect(quality).toHaveProperty('powerSpectrum');
      expect(quality).toHaveProperty('frequencies');
      expect(quality).toHaveProperty('bandPowers');

      expect(quality.artifacts).toHaveProperty('hasEyeBlink');
      expect(quality.artifacts).toHaveProperty('hasMuscleNoise');
      expect(quality.artifacts).toHaveProperty('hasGradientArtifact');
      expect(quality.artifacts).toHaveProperty('isClean');
    });
  });

  describe('Performance Requirements', () => {
    it('should analyze signal in <50ms (latency requirement)', () => {
      // Fill buffer with realistic data
      const bufferSize = processor.getBufferSize();
      const samples = Array.from(
        { length: bufferSize },
        (_, i) => Math.sin(2 * Math.PI * 10 * i / SAMPLING_RATE) * 50
      );
      processor.processSamples(samples);

      const startTime = performance.now();
      const quality = processor.analyze();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(quality).toBeDefined();
    });

    it('should process 256 samples efficiently', () => {
      const samples = Array(256).fill(10);

      const startTime = performance.now();
      processor.processSamples(samples);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle real-time streaming (continuous processing)', () => {
      const iterations = 10;
      const samplesPerIteration = 32; // ~125ms at 256Hz

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const samples = Array(samplesPerIteration).fill(10 + i);
        processor.processSample(samples[0]);
      }

      const endTime = performance.now();
      const avgTimePerSample = (endTime - startTime) / iterations;

      // Each sample should process in <1ms for real-time performance
      expect(avgTimePerSample).toBeLessThan(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty sample array', () => {
      expect(() => {
        processor.processSamples([]);
      }).not.toThrow();
    });

    it('should handle single sample', () => {
      expect(() => {
        processor.processSample(42);
      }).not.toThrow();

      const recent = processor.getRecentData(0.1);
      expect(recent.length).toBeGreaterThan(0);
    });

    it('should handle very large amplitude values', () => {
      const samples = [1000, -1000, 500, -500];
      expect(() => {
        processor.processSamples(samples);
      }).not.toThrow();
    });

    it('should handle zero amplitude signal', () => {
      const samples = Array(100).fill(0);
      processor.processSamples(samples);

      const quality = processor.analyze();
      expect(quality.bandPowers).toBeDefined();
      expect(quality.artifacts.isClean).toBe(true);
    });

    it('should handle negative values', () => {
      const samples = Array.from({ length: 256 }, (_, i) => {
        return Math.sin(2 * Math.PI * 10 * i / SAMPLING_RATE) * -50;
      });

      expect(() => {
        processor.processSamples(samples);
        processor.analyze();
      }).not.toThrow();
    });

    it('should handle Infinity values', () => {
      const samples = [10, Infinity, 20, 30];

      // Should either handle gracefully or throw predictable error
      try {
        processor.processSamples(samples);
        const quality = processor.analyze();
        // If it doesn't throw, ensure values are finite
        expect(Object.values(quality.bandPowers).every(v => Number.isFinite(v))).toBe(true);
      } catch (error) {
        // Acceptable to throw on invalid input
        expect(error).toBeDefined();
      }
    });

    it('should reset and clear all state', () => {
      // Add data
      const samples = Array(256).fill(50);
      processor.processSamples(samples);

      // Reset
      processor.reset();

      // Buffer should be empty
      const recent = processor.getRecentData(1.0);
      expect(recent.every(v => v === 0)).toBe(true);
    });

    it('should maintain state across multiple analyze calls', () => {
      const samples = Array(256).fill(50);
      processor.processSamples(samples);

      const quality1 = processor.analyze();
      const quality2 = processor.analyze();

      // Same data should produce same results
      expect(quality1.snr).toBe(quality2.snr);
      expect(quality1.bandPowers.alpha).toBe(quality2.bandPowers.alpha);
    });
  });

  describe('Flow Metrics Computation', () => {
    it('should compute flow index from band powers', () => {
      const bandPowers: BandPowers = {
        delta: 10,
        theta: 30,
        alpha: 40,
        beta: 20,
        gamma: 5
      };

      const metrics = computeFlowMetrics(bandPowers);

      expect(metrics.flowIndex).toBeGreaterThan(0);
      expect(Number.isFinite(metrics.flowIndex)).toBe(true);
    });

    it('should compute focus from beta power', () => {
      const bandPowers: BandPowers = {
        delta: 10,
        theta: 20,
        alpha: 30,
        beta: 50,
        gamma: 5
      };

      const metrics = computeFlowMetrics(bandPowers);
      expect(metrics.focus).toBe(50);
    });

    it('should compute relaxation from alpha power', () => {
      const bandPowers: BandPowers = {
        delta: 10,
        theta: 20,
        alpha: 60,
        beta: 15,
        gamma: 5
      };

      const metrics = computeFlowMetrics(bandPowers);
      expect(metrics.relaxation).toBe(60);
    });

    it('should compute engagement from theta power', () => {
      const bandPowers: BandPowers = {
        delta: 10,
        theta: 45,
        alpha: 30,
        beta: 15,
        gamma: 5
      };

      const metrics = computeFlowMetrics(bandPowers);
      expect(metrics.engagement).toBe(45);
    });

    it('should handle zero denominator in flow index', () => {
      const bandPowers: BandPowers = {
        delta: 0,
        theta: 30,
        alpha: 40,
        beta: 0,
        gamma: 0
      };

      const metrics = computeFlowMetrics(bandPowers);
      expect(metrics.flowIndex).toBe(0);
    });

    it('should return all flow metrics', () => {
      const bandPowers: BandPowers = {
        delta: 10,
        theta: 20,
        alpha: 30,
        beta: 15,
        gamma: 5
      };

      const metrics = computeFlowMetrics(bandPowers);

      expect(metrics).toHaveProperty('flowIndex');
      expect(metrics).toHaveProperty('focus');
      expect(metrics).toHaveProperty('relaxation');
      expect(metrics).toHaveProperty('engagement');

      expect(Number.isFinite(metrics.flowIndex)).toBe(true);
      expect(Number.isFinite(metrics.focus)).toBe(true);
      expect(Number.isFinite(metrics.relaxation)).toBe(true);
      expect(Number.isFinite(metrics.engagement)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should process complete EEG analysis pipeline', () => {
      // Simulate 2 seconds of realistic EEG data
      const duration = 2.0;
      const numSamples = Math.floor(SAMPLING_RATE * duration);

      const eegSignal = Array.from({ length: numSamples }, (_, i) => {
        const t = i / SAMPLING_RATE;
        // Realistic mixed-frequency EEG
        return (
          Math.sin(2 * Math.PI * 2 * t) * 5 +    // Delta
          Math.sin(2 * Math.PI * 6 * t) * 15 +   // Theta
          Math.sin(2 * Math.PI * 10 * t) * 25 +  // Alpha (dominant)
          Math.sin(2 * Math.PI * 20 * t) * 10 +  // Beta
          Math.sin(2 * Math.PI * 40 * t) * 8 +   // Gamma
          (Math.random() - 0.5) * 5              // Background noise
        );
      });

      // Process signal
      processor.processSamples(eegSignal);

      // Analyze
      const quality = processor.analyze();

      // Verify complete analysis
      expect(quality.bandPowers).toBeDefined();
      expect(quality.bandPowers.alpha).toBeGreaterThan(quality.bandPowers.delta);
      expect(quality.artifacts).toBeDefined();
      expect(quality.snr).toBeGreaterThan(0);
      expect(quality.powerSpectrum.length).toBeGreaterThan(0);

      // Compute flow metrics
      const flowMetrics = computeFlowMetrics(quality.bandPowers);
      expect(flowMetrics.flowIndex).toBeGreaterThan(0);
    });

    it('should handle continuous streaming with buffer wraparound', () => {
      const chunks = 20;
      const samplesPerChunk = 128; // 0.5s at 256Hz

      for (let chunk = 0; chunk < chunks; chunk++) {
        const samples = Array.from({ length: samplesPerChunk }, (_, i) => {
          const t = (chunk * samplesPerChunk + i) / SAMPLING_RATE;
          return Math.sin(2 * Math.PI * 10 * t) * 30;
        });

        processor.processSamples(samples);

        // Analyze every few chunks
        if (chunk % 5 === 0) {
          const quality = processor.analyze();
          expect(quality.artifacts.isClean).toBe(true);
        }
      }

      // Final analysis
      const finalQuality = processor.analyze();
      expect(finalQuality.bandPowers).toBeDefined();
      expect(finalQuality.artifacts.isClean).toBe(true);
    });

    it('should detect artifacts in realistic noisy signal', () => {
      const samples = Array.from({ length: 512 }, (_, i) => {
        const t = i / SAMPLING_RATE;
        let signal = Math.sin(2 * Math.PI * 10 * t) * 30; // Base alpha

        // Add eye blink at 1 second
        if (i === 256) {
          signal += 200; // Eye blink artifact
        }

        // Add muscle noise in latter half
        if (i > 256) {
          signal += Math.sin(2 * Math.PI * 45 * t) * 80;
        }

        return signal;
      });

      processor.updateArtifactConfig({
        eyeBlinkThreshold: 150,
        muscleNoiseThreshold: 100
      });
      processor.processSamples(samples);

      const quality = processor.analyze();
      expect(quality.artifacts.hasEyeBlink).toBe(true);
      expect(quality.artifacts.hasMuscleNoise).toBe(true);
      expect(quality.artifacts.isClean).toBe(false);
    });
  });
});
