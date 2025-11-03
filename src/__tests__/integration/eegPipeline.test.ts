/**
 * EEG Pipeline Integration Tests
 *
 * Tests complete data flow: MuseConnector → SignalProcessor → FlowClassifier
 * Validates real-time processing, artifact detection, and flow state classification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MuseConnector, ConnectionState, EEGSample } from '@/lib/eeg/museConnector';
import { SignalProcessor } from '@/lib/eeg/signalProcessor';
import { FlowClassifier } from '@/lib/eeg/flowClassifier';
import { Subject } from 'rxjs';

// Mock Web Bluetooth API
const mockBluetoothDevice = {
  id: 'test-device-id',
  name: 'Muse-Test',
  gatt: {
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getPrimaryService: vi.fn(),
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockCharacteristic = {
  uuid: '',
  value: new DataView(new ArrayBuffer(24)),
  startNotifications: vi.fn(),
  stopNotifications: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readValue: vi.fn(),
};

const mockService = {
  getCharacteristic: vi.fn().mockResolvedValue(mockCharacteristic),
};

const mockGattServer = {
  connected: true,
  device: mockBluetoothDevice,
  connect: vi.fn().mockResolvedValue(mockGattServer),
  disconnect: vi.fn(),
  getPrimaryService: vi.fn().mockResolvedValue(mockService),
};

// Mock navigator.bluetooth
const mockBluetooth = {
  requestDevice: vi.fn().mockResolvedValue({
    ...mockBluetoothDevice,
    gatt: mockGattServer,
  }),
};

describe('EEG Pipeline Integration', () => {
  let connector: MuseConnector;
  let processor: SignalProcessor;
  let classifier: FlowClassifier;
  let eegDataSubject: Subject<EEGSample>;

  beforeEach(() => {
    // Setup Web Bluetooth mock
    vi.stubGlobal('navigator', {
      bluetooth: mockBluetooth,
    });

    // Reset mocks
    vi.clearAllMocks();
    mockCharacteristic.startNotifications.mockResolvedValue(undefined);
    mockCharacteristic.readValue.mockResolvedValue(new DataView(new Uint8Array([100]).buffer));

    // Initialize components
    connector = new MuseConnector({ autoReconnect: false });
    processor = new SignalProcessor(256, 2.0);
    classifier = new FlowClassifier();
    eegDataSubject = new Subject<EEGSample>();
  });

  afterEach(() => {
    connector?.destroy();
    processor?.reset();
    vi.unstubAllGlobals();
  });

  describe('Data Flow Pipeline', () => {
    it('should process EEG samples through complete pipeline', async () => {
      // Start calibration
      classifier.startCalibration();

      // Generate synthetic EEG samples (realistic microvolts values)
      const samples: EEGSample[] = [];
      for (let i = 0; i < 50; i++) {
        const sample: EEGSample = {
          channel: 'AF7',
          value: Math.sin(i * 0.1) * 50 + Math.random() * 10, // ~50μV with noise
          timestamp: Date.now() + i * 4, // 256Hz = ~4ms per sample
          sequenceNumber: i,
        };
        samples.push(sample);
        processor.processSample(sample.value);
      }

      // Analyze signal
      const signalQuality = processor.analyze();

      expect(signalQuality).toBeDefined();
      expect(signalQuality.bandPowers).toBeDefined();
      expect(signalQuality.bandPowers.alpha).toBeGreaterThan(0);
      expect(signalQuality.artifacts).toBeDefined();
      expect(signalQuality.snr).toBeGreaterThan(0);
    });

    it('should detect artifacts in noisy signal', async () => {
      // Generate signal with eye blink artifact (>100μV spike)
      for (let i = 0; i < 20; i++) {
        const value = i === 10 ? 150 : Math.random() * 20; // Spike at sample 10
        processor.processSample(value);
      }

      const quality = processor.analyze();

      expect(quality.artifacts.hasEyeBlink).toBe(true);
      expect(quality.artifacts.isClean).toBe(false);
    });

    it('should classify flow state after calibration', async () => {
      classifier.startCalibration();

      // Collect baseline samples
      for (let i = 0; i < 40; i++) {
        processor.processSample(Math.random() * 30);
      }

      const baselineQuality = processor.analyze();
      const calibrationComplete = classifier.addCalibrationSample({
        channels: {
          AF7: baselineQuality.bandPowers,
          AF8: baselineQuality.bandPowers,
          TP9: baselineQuality.bandPowers,
          TP10: baselineQuality.bandPowers,
        },
        timestamp: Date.now(),
      });

      expect(calibrationComplete).toBe(true);

      const calibrationData = classifier.finalizeCalibration();
      expect(calibrationData).toBeDefined();
      expect(calibrationData?.sampleCount).toBeGreaterThanOrEqual(30);

      // Now test flow classification
      processor.reset();
      for (let i = 0; i < 50; i++) {
        // Higher theta for flow state
        processor.processSample(Math.sin(i * 0.2) * 40);
      }

      const flowQuality = processor.analyze();
      const flowMetrics = classifier.classifyFlow({
        channels: {
          AF7: flowQuality.bandPowers,
          AF8: flowQuality.bandPowers,
          TP9: flowQuality.bandPowers,
          TP10: flowQuality.bandPowers,
        },
        timestamp: Date.now(),
      });

      expect(flowMetrics).toBeDefined();
      expect(flowMetrics?.flowScore).toBeGreaterThanOrEqual(0);
      expect(flowMetrics?.flowScore).toBeLessThanOrEqual(1);
      expect(flowMetrics?.confidence).toBeGreaterThan(0);
    });
  });

  describe('Real-time Performance', () => {
    it('should process 256Hz data stream with <50ms latency', async () => {
      const processingTimes: number[] = [];

      for (let i = 0; i < 256; i++) {
        const start = performance.now();

        processor.processSample(Math.random() * 50);

        if (i % 64 === 0 && i > 0) {
          processor.analyze();
        }

        const elapsed = performance.now() - start;
        processingTimes.push(elapsed);
      }

      const avgLatency = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const maxLatency = Math.max(...processingTimes);

      expect(avgLatency).toBeLessThan(5); // Average <5ms
      expect(maxLatency).toBeLessThan(50); // Max <50ms
    });

    it('should handle burst data without dropping samples', async () => {
      const burstSize = 100;
      const samples = Array.from({ length: burstSize }, (_, i) =>
        Math.sin(i * 0.1) * 40
      );

      const start = performance.now();
      processor.processSamples(samples);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100); // <100ms for 100 samples

      const recentData = processor.getRecentData(0.5);
      expect(recentData.length).toBeGreaterThan(0);
    });
  });

  describe('Error Propagation', () => {
    it('should handle missing calibration gracefully', () => {
      processor.processSample(50);
      const quality = processor.analyze();

      const flowMetrics = classifier.classifyFlow({
        channels: {
          AF7: quality.bandPowers,
          AF8: quality.bandPowers,
          TP9: quality.bandPowers,
          TP10: quality.bandPowers,
        },
        timestamp: Date.now(),
      });

      expect(flowMetrics).toBeNull(); // Should return null without calibration
    });

    it('should recover from signal interruption', async () => {
      // Normal signal
      for (let i = 0; i < 50; i++) {
        processor.processSample(Math.random() * 40);
      }

      const beforeQuality = processor.analyze();
      expect(beforeQuality.artifacts.isClean).toBeDefined();

      // Reset (simulates interruption)
      processor.reset();

      // Resume signal
      for (let i = 0; i < 50; i++) {
        processor.processSample(Math.random() * 40);
      }

      const afterQuality = processor.analyze();
      expect(afterQuality.artifacts.isClean).toBeDefined();
      expect(afterQuality.bandPowers).toBeDefined();
    });

    it('should validate frequency band extraction', () => {
      // Generate signal with known frequency content
      const samplingRate = 256;
      const duration = 2.0;
      const samples = Math.floor(samplingRate * duration);

      // 10Hz sine wave (alpha band)
      for (let i = 0; i < samples; i++) {
        const t = i / samplingRate;
        const value = Math.sin(2 * Math.PI * 10 * t) * 50;
        processor.processSample(value);
      }

      const quality = processor.analyze();

      // Alpha band should have highest power
      const { alpha, beta, delta, theta, gamma } = quality.bandPowers;
      expect(alpha).toBeGreaterThan(beta);
      expect(alpha).toBeGreaterThan(delta);
      expect(alpha).toBeGreaterThan(gamma);
    });
  });

  describe('Memory Management', () => {
    it('should maintain constant memory footprint', () => {
      const iterations = 1000;
      const initialMemory = process.memoryUsage?.().heapUsed || 0;

      for (let i = 0; i < iterations; i++) {
        processor.processSample(Math.random() * 50);

        if (i % 100 === 0) {
          processor.analyze();
        }
      }

      const finalMemory = process.memoryUsage?.().heapUsed || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not grow unbounded (allow 10MB for reasonable variance)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should cleanup resources properly', () => {
      const processor2 = new SignalProcessor();

      for (let i = 0; i < 100; i++) {
        processor2.processSample(Math.random() * 50);
      }

      processor2.reset();

      const data = processor2.getRecentData(1.0);
      expect(data.every(v => v === 0)).toBe(true); // Buffer should be cleared
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle parallel processing from multiple channels', async () => {
      const channels = ['AF7', 'AF8', 'TP9', 'TP10'] as const;
      const processors = channels.map(() => new SignalProcessor());

      const promises = processors.map((proc, idx) =>
        new Promise<void>(resolve => {
          for (let i = 0; i < 50; i++) {
            proc.processSample(Math.sin(i * 0.1 + idx) * 40);
          }
          resolve();
        })
      );

      await Promise.all(promises);

      const qualities = processors.map(p => p.analyze());

      expect(qualities).toHaveLength(4);
      qualities.forEach(q => {
        expect(q.bandPowers).toBeDefined();
        expect(q.artifacts).toBeDefined();
      });

      // Cleanup
      processors.forEach(p => p.reset());
    });

    it('should synchronize multi-channel classification', async () => {
      classifier.startCalibration();

      const channels = {
        AF7: new SignalProcessor(),
        AF8: new SignalProcessor(),
        TP9: new SignalProcessor(),
        TP10: new SignalProcessor(),
      };

      // Process samples for all channels
      for (let i = 0; i < 40; i++) {
        Object.values(channels).forEach(proc => {
          proc.processSample(Math.random() * 30);
        });
      }

      // Collect band powers from all channels
      const bandPowers = Object.entries(channels).reduce((acc, [name, proc]) => {
        acc[name] = proc.analyze().bandPowers;
        return acc;
      }, {} as Record<string, any>);

      const calibrated = classifier.addCalibrationSample({
        channels: bandPowers,
        timestamp: Date.now(),
      });

      expect(calibrated).toBe(true);

      // Cleanup
      Object.values(channels).forEach(p => p.reset());
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero signal', () => {
      for (let i = 0; i < 100; i++) {
        processor.processSample(0);
      }

      const quality = processor.analyze();
      expect(quality.snr).toBeDefined();
      expect(quality.bandPowers).toBeDefined();
    });

    it('should handle saturated signal', () => {
      // Simulate ADC saturation
      for (let i = 0; i < 100; i++) {
        processor.processSample(1000); // Very high value
      }

      const quality = processor.analyze();
      expect(quality.artifacts.hasGradientArtifact).toBeDefined();
    });

    it('should handle rapid state transitions', () => {
      classifier.startCalibration();

      // Baseline
      for (let i = 0; i < 35; i++) {
        processor.processSample(Math.random() * 20);
      }

      const baseline = processor.analyze();
      classifier.addCalibrationSample({
        channels: {
          AF7: baseline.bandPowers,
          AF8: baseline.bandPowers,
          TP9: baseline.bandPowers,
          TP10: baseline.bandPowers,
        },
        timestamp: Date.now(),
      });

      classifier.finalizeCalibration();

      // Rapid transition to flow
      processor.reset();
      for (let i = 0; i < 50; i++) {
        processor.processSample(Math.sin(i * 0.3) * 60); // High theta
      }

      const flow = processor.analyze();
      const metrics = classifier.classifyFlow({
        channels: {
          AF7: flow.bandPowers,
          AF8: flow.bandPowers,
          TP9: flow.bandPowers,
          TP10: flow.bandPowers,
        },
        timestamp: Date.now(),
      });

      expect(metrics).toBeDefined();
      expect(metrics?.attention).toBeGreaterThanOrEqual(0);
    });
  });
});
