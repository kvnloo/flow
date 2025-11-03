/**
 * EEG Processing Performance Tests
 *
 * Requirements from architecture.md:
 * - Maintain 256Hz sampling rate with <50ms latency
 * - FFT computation for 512 samples <10ms
 * - Process 4 EEG channels + reference + 2 aux channels
 * - Real-time feature extraction without blocking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignalProcessor } from '@/lib/eeg/signalProcessor';
import { FeatureExtractor } from '@/lib/eeg/featureExtractor';
import { FlowClassifier } from '@/lib/eeg/flowClassifier';

// Performance budget thresholds
const PERFORMANCE_BUDGETS = {
  SAMPLING_RATE: 256, // Hz
  MAX_LATENCY: 50, // ms
  FFT_COMPUTE_TIME: 10, // ms (512 samples)
  FEATURE_EXTRACTION_TIME: 20, // ms
  FLOW_CLASSIFICATION_TIME: 5, // ms
  BUFFER_PROCESSING_TIME: 30, // ms (full cycle)
  MEMORY_LEAK_THRESHOLD: 10, // MB over 30min
  THROUGHPUT_MIN: 240, // samples/sec (allowing 6% headroom)
};

// Test data generators
function generateEEGSample(channels = 4): number[] {
  // Simulate realistic EEG signal (10-50 µV with noise)
  return Array.from({ length: channels }, () =>
    Math.random() * 40 + 10 + (Math.random() - 0.5) * 5
  );
}

function generateEEGBuffer(samples: number, channels = 4): number[][] {
  return Array.from({ length: samples }, () => generateEEGSample(channels));
}

// Memory tracking helper
class MemoryTracker {
  private baseline: number = 0;
  private measurements: number[] = [];

  start() {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      this.baseline = (performance as any).memory.usedJSHeapSize;
    }
  }

  measure() {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const current = (performance as any).memory.usedJSHeapSize;
      this.measurements.push((current - this.baseline) / 1024 / 1024); // MB
    }
  }

  getMaxIncrease(): number {
    return this.measurements.length > 0 ? Math.max(...this.measurements) : 0;
  }

  reset() {
    this.baseline = 0;
    this.measurements = [];
  }
}

// Performance reporter
class PerformanceReporter {
  private results: Array<{
    test: string;
    metric: string;
    value: number;
    budget: number;
    passed: boolean;
  }> = [];

  addResult(test: string, metric: string, value: number, budget: number) {
    this.results.push({
      test,
      metric,
      value,
      budget,
      passed: value <= budget,
    });
  }

  generateReport(): string {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = ((passed / total) * 100).toFixed(1);

    let report = '\n\n=== EEG PROCESSING PERFORMANCE REPORT ===\n\n';
    report += `Overall: ${passed}/${total} tests passed (${passRate}%)\n\n`;

    this.results.forEach(r => {
      const status = r.passed ? '✅ PASS' : '❌ FAIL';
      const percentage = ((r.value / r.budget) * 100).toFixed(1);
      report += `${status} ${r.test} - ${r.metric}\n`;
      report += `  Value: ${r.value.toFixed(2)} | Budget: ${r.budget} (${percentage}%)\n\n`;
    });

    return report;
  }
}

describe('EEG Processing Performance Tests', () => {
  let signalProcessor: SignalProcessor;
  let featureExtractor: FeatureExtractor;
  let flowClassifier: FlowClassifier;
  let reporter: PerformanceReporter;
  let memoryTracker: MemoryTracker;

  beforeEach(() => {
    signalProcessor = new SignalProcessor({
      samplingRate: PERFORMANCE_BUDGETS.SAMPLING_RATE,
      notchFrequency: 60,
      bandpassLow: 0.5,
      bandpassHigh: 50,
    });

    featureExtractor = new FeatureExtractor({
      samplingRate: PERFORMANCE_BUDGETS.SAMPLING_RATE,
      windowSize: 512,
      overlap: 0.5,
    });

    flowClassifier = new FlowClassifier({
      targetFlowScore: 0.7,
      adaptiveDifficulty: true,
    });

    reporter = new PerformanceReporter();
    memoryTracker = new MemoryTracker();
  });

  afterEach(() => {
    console.log(reporter.generateReport());
    memoryTracker.reset();
  });

  describe('FFT Computation Performance', () => {
    it('should compute FFT for 512 samples in <10ms', () => {
      const samples = generateEEGBuffer(512, 1);
      const iterations = 100;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        signalProcessor.computeFFT(samples.map(s => s[0]));
        const duration = performance.now() - start;
        timings.push(duration);
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / iterations;
      const p95Time = timings.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

      reporter.addResult(
        'FFT Computation',
        'Average Time (ms)',
        avgTime,
        PERFORMANCE_BUDGETS.FFT_COMPUTE_TIME
      );

      reporter.addResult(
        'FFT Computation',
        'P95 Time (ms)',
        p95Time,
        PERFORMANCE_BUDGETS.FFT_COMPUTE_TIME * 1.5
      );

      expect(avgTime).toBeLessThan(PERFORMANCE_BUDGETS.FFT_COMPUTE_TIME);
      expect(p95Time).toBeLessThan(PERFORMANCE_BUDGETS.FFT_COMPUTE_TIME * 1.5);
    });

    it('should handle different window sizes efficiently', () => {
      const windowSizes = [128, 256, 512, 1024, 2048];
      const results: Record<number, number> = {};

      windowSizes.forEach(size => {
        const samples = generateEEGBuffer(size, 1);
        const start = performance.now();

        for (let i = 0; i < 50; i++) {
          signalProcessor.computeFFT(samples.map(s => s[0]));
        }

        const avgTime = (performance.now() - start) / 50;
        results[size] = avgTime;

        reporter.addResult(
          `FFT Window ${size}`,
          'Average Time (ms)',
          avgTime,
          size <= 512 ? PERFORMANCE_BUDGETS.FFT_COMPUTE_TIME :
                        PERFORMANCE_BUDGETS.FFT_COMPUTE_TIME * (size / 512)
        );
      });

      // Verify scaling is approximately O(n log n)
      const ratio2048_512 = results[2048] / results[512];
      expect(ratio2048_512).toBeLessThan(8); // Should be ~4 for O(n log n)
    });
  });

  describe('Throughput Performance', () => {
    it('should maintain 256Hz sampling rate with <50ms latency', async () => {
      const durationSeconds = 5;
      const expectedSamples = PERFORMANCE_BUDGETS.SAMPLING_RATE * durationSeconds;
      const samples = generateEEGBuffer(expectedSamples, 4);

      const latencies: number[] = [];
      let processedCount = 0;

      const startTime = performance.now();

      for (const sample of samples) {
        const processingStart = performance.now();

        // Simulate full processing pipeline
        const filtered = signalProcessor.applyFilters(sample);
        const features = featureExtractor.extractFeatures([filtered]);
        flowClassifier.classify(features);

        const latency = performance.now() - processingStart;
        latencies.push(latency);
        processedCount++;

        // Simulate real-time streaming (maintain 256Hz rate)
        await new Promise(resolve => setTimeout(resolve, 1000 / PERFORMANCE_BUDGETS.SAMPLING_RATE));
      }

      const totalDuration = performance.now() - startTime;
      const actualThroughput = processedCount / (totalDuration / 1000);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
      const maxLatency = Math.max(...latencies);

      reporter.addResult(
        'Throughput',
        'Samples/Second',
        actualThroughput,
        PERFORMANCE_BUDGETS.THROUGHPUT_MIN
      );

      reporter.addResult(
        'Throughput',
        'Average Latency (ms)',
        avgLatency,
        PERFORMANCE_BUDGETS.MAX_LATENCY
      );

      reporter.addResult(
        'Throughput',
        'P95 Latency (ms)',
        p95Latency,
        PERFORMANCE_BUDGETS.MAX_LATENCY * 1.2
      );

      reporter.addResult(
        'Throughput',
        'Max Latency (ms)',
        maxLatency,
        PERFORMANCE_BUDGETS.MAX_LATENCY * 2
      );

      expect(actualThroughput).toBeGreaterThan(PERFORMANCE_BUDGETS.THROUGHPUT_MIN);
      expect(avgLatency).toBeLessThan(PERFORMANCE_BUDGETS.MAX_LATENCY);
      expect(p95Latency).toBeLessThan(PERFORMANCE_BUDGETS.MAX_LATENCY * 1.2);
    });

    it('should process multi-channel data efficiently', () => {
      const channels = [1, 2, 4, 6, 8]; // Test scaling with channel count
      const sampleCount = 1000;

      channels.forEach(channelCount => {
        const samples = generateEEGBuffer(sampleCount, channelCount);
        const timings: number[] = [];

        samples.forEach(sample => {
          const start = performance.now();
          signalProcessor.applyFilters(sample);
          timings.push(performance.now() - start);
        });

        const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
        const budget = PERFORMANCE_BUDGETS.BUFFER_PROCESSING_TIME * (channelCount / 4);

        reporter.addResult(
          `Multi-channel (${channelCount})`,
          'Average Time (ms)',
          avgTime,
          budget
        );

        expect(avgTime).toBeLessThan(budget);
      });
    });
  });

  describe('Feature Extraction Performance', () => {
    it('should extract features in <20ms', () => {
      const windowSize = 512;
      const samples = generateEEGBuffer(windowSize, 4);
      const iterations = 100;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        featureExtractor.extractFeatures(samples);
        const duration = performance.now() - start;
        timings.push(duration);
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...timings);

      reporter.addResult(
        'Feature Extraction',
        'Average Time (ms)',
        avgTime,
        PERFORMANCE_BUDGETS.FEATURE_EXTRACTION_TIME
      );

      reporter.addResult(
        'Feature Extraction',
        'Max Time (ms)',
        maxTime,
        PERFORMANCE_BUDGETS.FEATURE_EXTRACTION_TIME * 2
      );

      expect(avgTime).toBeLessThan(PERFORMANCE_BUDGETS.FEATURE_EXTRACTION_TIME);
    });

    it('should extract all band powers efficiently', () => {
      const windowSize = 512;
      const samples = generateEEGBuffer(windowSize, 4);

      const start = performance.now();
      const features = featureExtractor.extractFeatures(samples);
      const duration = performance.now() - start;

      // Verify all expected features are extracted
      expect(features).toHaveProperty('delta');
      expect(features).toHaveProperty('theta');
      expect(features).toHaveProperty('alpha');
      expect(features).toHaveProperty('beta');
      expect(features).toHaveProperty('gamma');
      expect(features).toHaveProperty('alphaAsymmetry');
      expect(features).toHaveProperty('thetaBetaRatio');

      reporter.addResult(
        'Band Power Extraction',
        'Total Time (ms)',
        duration,
        PERFORMANCE_BUDGETS.FEATURE_EXTRACTION_TIME
      );

      expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.FEATURE_EXTRACTION_TIME);
    });
  });

  describe('Flow Classification Performance', () => {
    it('should classify flow state in <5ms', () => {
      const features = {
        delta: 15,
        theta: 25,
        alpha: 30,
        beta: 20,
        gamma: 10,
        alphaAsymmetry: 0.05,
        thetaBetaRatio: 1.25,
      };

      const iterations = 1000;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        flowClassifier.classify(features);
        const duration = performance.now() - start;
        timings.push(duration);
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / iterations;
      const p95Time = timings.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

      reporter.addResult(
        'Flow Classification',
        'Average Time (ms)',
        avgTime,
        PERFORMANCE_BUDGETS.FLOW_CLASSIFICATION_TIME
      );

      reporter.addResult(
        'Flow Classification',
        'P95 Time (ms)',
        p95Time,
        PERFORMANCE_BUDGETS.FLOW_CLASSIFICATION_TIME * 1.5
      );

      expect(avgTime).toBeLessThan(PERFORMANCE_BUDGETS.FLOW_CLASSIFICATION_TIME);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory over 30-minute simulation', async () => {
      memoryTracker.start();

      const durationMinutes = 0.5; // 30 seconds for test speed
      const samplesPerSecond = PERFORMANCE_BUDGETS.SAMPLING_RATE;
      const totalSamples = samplesPerSecond * 60 * durationMinutes;
      const measureInterval = 1000; // Measure every 1000 samples

      for (let i = 0; i < totalSamples; i++) {
        const sample = generateEEGSample(4);

        // Full processing pipeline
        const filtered = signalProcessor.applyFilters(sample);

        if (i % 512 === 0) {
          const buffer = generateEEGBuffer(512, 4);
          const features = featureExtractor.extractFeatures(buffer);
          flowClassifier.classify(features);
        }

        if (i % measureInterval === 0) {
          memoryTracker.measure();
        }
      }

      const memoryIncrease = memoryTracker.getMaxIncrease();
      const scaledIncrease = memoryIncrease * (30 / durationMinutes); // Scale to 30min

      reporter.addResult(
        'Memory Leak Test',
        'Memory Increase (MB)',
        scaledIncrease,
        PERFORMANCE_BUDGETS.MEMORY_LEAK_THRESHOLD
      );

      expect(scaledIncrease).toBeLessThan(PERFORMANCE_BUDGETS.MEMORY_LEAK_THRESHOLD);
    });
  });

  describe('End-to-End Pipeline Performance', () => {
    it('should complete full processing cycle in budget', () => {
      const testDurations = [1, 10, 60]; // 1min, 10min, 60min worth of data

      testDurations.forEach(minutes => {
        const samples = PERFORMANCE_BUDGETS.SAMPLING_RATE * 60 * minutes;
        const buffer = generateEEGBuffer(samples, 4);

        const start = performance.now();
        let processedSamples = 0;

        buffer.forEach((sample, idx) => {
          const filtered = signalProcessor.applyFilters(sample);

          if (idx % 512 === 0 && idx > 0) {
            const windowBuffer = buffer.slice(idx - 512, idx);
            const features = featureExtractor.extractFeatures(windowBuffer);
            flowClassifier.classify(features);
          }

          processedSamples++;
        });

        const duration = performance.now() - start;
        const throughput = processedSamples / (duration / 1000);
        const avgLatency = duration / processedSamples;

        reporter.addResult(
          `E2E Pipeline (${minutes}min)`,
          'Throughput (samples/s)',
          throughput,
          PERFORMANCE_BUDGETS.THROUGHPUT_MIN
        );

        reporter.addResult(
          `E2E Pipeline (${minutes}min)`,
          'Average Latency (ms)',
          avgLatency,
          PERFORMANCE_BUDGETS.MAX_LATENCY
        );

        expect(throughput).toBeGreaterThan(PERFORMANCE_BUDGETS.THROUGHPUT_MIN);
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle burst processing without degradation', () => {
      const burstSize = 1000;
      const bursts = 10;
      const timings: number[] = [];

      for (let burst = 0; burst < bursts; burst++) {
        const samples = generateEEGBuffer(burstSize, 4);
        const start = performance.now();

        samples.forEach(sample => {
          signalProcessor.applyFilters(sample);
        });

        timings.push(performance.now() - start);
      }

      // Check that later bursts aren't significantly slower (no degradation)
      const firstHalf = timings.slice(0, bursts / 2);
      const secondHalf = timings.slice(bursts / 2);

      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const degradation = ((avgSecond - avgFirst) / avgFirst) * 100;

      reporter.addResult(
        'Burst Stress Test',
        'Performance Degradation (%)',
        Math.abs(degradation),
        10 // Max 10% degradation allowed
      );

      expect(Math.abs(degradation)).toBeLessThan(10);
    });

    it('should recover from processing spikes', () => {
      const normalLoad = 100;
      const spikeLoad = 1000;

      // Normal processing
      const normalSamples = generateEEGBuffer(normalLoad, 4);
      const normalStart = performance.now();
      normalSamples.forEach(s => signalProcessor.applyFilters(s));
      const normalTime = performance.now() - normalStart;

      // Spike processing
      const spikeSamples = generateEEGBuffer(spikeLoad, 4);
      const spikeStart = performance.now();
      spikeSamples.forEach(s => signalProcessor.applyFilters(s));
      const spikeTime = performance.now() - spikeStart;

      // Recovery processing
      const recoverySamples = generateEEGBuffer(normalLoad, 4);
      const recoveryStart = performance.now();
      recoverySamples.forEach(s => signalProcessor.applyFilters(s));
      const recoveryTime = performance.now() - recoveryStart;

      const normalAvg = normalTime / normalLoad;
      const recoveryAvg = recoveryTime / normalLoad;
      const recoveryDiff = ((recoveryAvg - normalAvg) / normalAvg) * 100;

      reporter.addResult(
        'Recovery Test',
        'Post-Spike Overhead (%)',
        Math.abs(recoveryDiff),
        15 // Max 15% overhead after spike
      );

      expect(Math.abs(recoveryDiff)).toBeLessThan(15);
    });
  });
});
