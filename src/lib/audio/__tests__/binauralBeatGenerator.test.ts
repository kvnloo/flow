/**
 * BinauralBeatGenerator Unit Tests
 *
 * Comprehensive test suite for binaural beat generation with Web Audio API mocking.
 * Tests cover:
 * - AudioContext initialization and lifecycle
 * - Binaural beat frequency generation (200Hz ± beat frequency)
 * - Smooth exponential frequency transitions
 * - Volume control and ramping
 * - Start/stop lifecycle and cleanup
 * - Multiple simultaneous beats
 * - Edge cases (negative frequencies, invalid volumes)
 * - Proper node disconnection and memory management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BinauralBeatGenerator } from '../binauralBeatGenerator';

// Mock Web Audio API
class MockAudioParam {
  value = 0;
  setValueAtTime = vi.fn().mockReturnThis();
  linearRampToValueAtTime = vi.fn().mockReturnThis();
  exponentialRampToValueAtTime = vi.fn().mockReturnThis();
  setTargetAtTime = vi.fn().mockReturnThis();
  cancelScheduledValues = vi.fn().mockReturnThis();
}

class MockOscillatorNode {
  type: OscillatorType = 'sine';
  frequency = new MockAudioParam();
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

class MockGainNode {
  gain = new MockAudioParam();
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockChannelMergerNode {
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockAudioDestinationNode {
  maxChannelCount = 2;
  channelCount = 2;
}

class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  sampleRate = 48000;
  destination = new MockAudioDestinationNode();

  createOscillator = vi.fn(() => new MockOscillatorNode());
  createGain = vi.fn(() => new MockGainNode());
  createChannelMerger = vi.fn(() => new MockChannelMergerNode());
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

describe('BinauralBeatGenerator', () => {
  let generator: BinauralBeatGenerator;
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    // Setup fresh mock for each test
    mockAudioContext = new MockAudioContext();

    // Mock global AudioContext
    global.AudioContext = vi.fn(() => mockAudioContext as any);

    generator = new BinauralBeatGenerator();
  });

  afterEach(() => {
    // Cleanup
    if (generator.playing) {
      generator.stop();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create AudioContext on first start', async () => {
      await generator.start(200, 10);

      expect(global.AudioContext).toHaveBeenCalledWith({
        latencyHint: 'interactive',
        sampleRate: 48000,
      });
    });

    it('should resume suspended AudioContext', async () => {
      mockAudioContext.state = 'suspended';

      await generator.start(200, 10);

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should create channel merger for stereo output', async () => {
      await generator.start(200, 10);

      expect(mockAudioContext.createChannelMerger).toHaveBeenCalledWith(2);
    });

    it('should create master gain node', async () => {
      await generator.start(200, 10);

      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should not reinitialize AudioContext on multiple starts', async () => {
      await generator.start(200, 10);
      generator.stop();

      await generator.start(200, 8);

      // Should only call constructor once
      expect(global.AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Binaural Beat Generation', () => {
    it('should generate 200Hz base frequency correctly', async () => {
      await generator.start(200, 10);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;
      const rightOsc = mockAudioContext.createOscillator.mock.results[1].value;

      expect(leftOsc.frequency.setValueAtTime).toHaveBeenCalledWith(200, expect.any(Number));
      expect(rightOsc.frequency.setValueAtTime).toHaveBeenCalledWith(210, expect.any(Number));
    });

    it('should create binaural beat with correct frequency difference', async () => {
      const baseFreq = 200;
      const beatFreq = 10;

      await generator.start(baseFreq, beatFreq);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;
      const rightOsc = mockAudioContext.createOscillator.mock.results[1].value;

      // Left ear: base frequency
      expect(leftOsc.frequency.setValueAtTime).toHaveBeenCalledWith(baseFreq, expect.any(Number));

      // Right ear: base + beat frequency
      expect(rightOsc.frequency.setValueAtTime).toHaveBeenCalledWith(baseFreq + beatFreq, expect.any(Number));
    });

    it('should use sine wave oscillators', async () => {
      await generator.start(200, 10);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;
      const rightOsc = mockAudioContext.createOscillator.mock.results[1].value;

      expect(leftOsc.type).toBe('sine');
      expect(rightOsc.type).toBe('sine');
    });

    it('should start oscillators immediately', async () => {
      await generator.start(200, 10);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;
      const rightOsc = mockAudioContext.createOscillator.mock.results[1].value;

      expect(leftOsc.start).toHaveBeenCalledWith(expect.any(Number));
      expect(rightOsc.start).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should connect oscillators to stereo channels correctly', async () => {
      await generator.start(200, 10);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;
      const rightOsc = mockAudioContext.createOscillator.mock.results[1].value;
      const leftGain = mockAudioContext.createGain.mock.results[1].value;
      const rightGain = mockAudioContext.createGain.mock.results[2].value;
      const merger = mockAudioContext.createChannelMerger.mock.results[0].value;

      // Left channel: oscillator -> gain -> merger(channel 0)
      expect(leftOsc.connect).toHaveBeenCalledWith(leftGain);
      expect(leftGain.connect).toHaveBeenCalledWith(merger, 0, 0);

      // Right channel: oscillator -> gain -> merger(channel 1)
      expect(rightOsc.connect).toHaveBeenCalledWith(rightGain);
      expect(rightGain.connect).toHaveBeenCalledWith(merger, 0, 1);
    });
  });

  describe('Frequency Transitions', () => {
    it('should transition frequencies smoothly with exponential ramp', async () => {
      await generator.start(200, 10);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;
      const rightOsc = mockAudioContext.createOscillator.mock.results[1].value;

      await generator.setFrequency(200, 8, 2.0);

      // Should cancel scheduled values
      expect(leftOsc.frequency.cancelScheduledValues).toHaveBeenCalled();
      expect(rightOsc.frequency.cancelScheduledValues).toHaveBeenCalled();

      // Should use exponential ramp for smooth transitions
      expect(leftOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalled();
      expect(rightOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalled();
    });

    it('should use default ramp duration of 2 seconds', async () => {
      await generator.start(200, 10);
      mockAudioContext.currentTime = 1.0;

      await generator.setFrequency(200, 8);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;

      // Should ramp to time = currentTime + 2.0
      expect(leftOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        expect.any(Number),
        3.0 // 1.0 + 2.0
      );
    });

    it('should use custom ramp duration when provided', async () => {
      await generator.start(200, 10);
      mockAudioContext.currentTime = 0;

      await generator.setFrequency(200, 5, 0.5);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;

      expect(leftOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        expect.any(Number),
        0.5 // custom duration
      );
    });

    it('should throw error when setting frequency while not playing', async () => {
      await expect(
        generator.setFrequency(200, 8)
      ).rejects.toThrow('Cannot set frequency: generator not playing');
    });

    it('should maintain stereo separation during transition', async () => {
      await generator.start(200, 10);

      await generator.setFrequency(200, 6);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;
      const rightOsc = mockAudioContext.createOscillator.mock.results[1].value;

      // Left should ramp to base frequency
      const leftTargetCall = leftOsc.frequency.exponentialRampToValueAtTime.mock.calls[0];
      expect(leftTargetCall[0]).toBe(200);

      // Right should ramp to base + beat frequency
      const rightTargetCall = rightOsc.frequency.exponentialRampToValueAtTime.mock.calls[0];
      expect(rightTargetCall[0]).toBe(206); // 200 + 6
    });
  });

  describe('Volume Control', () => {
    it('should clamp volume to 0-1 range', async () => {
      await generator.start(200, 10, 1.5);

      const state = generator.getState();
      expect(state.volume).toBe(1.0);
    });

    it('should handle negative volume values', async () => {
      await generator.start(200, 10, -0.5);

      const state = generator.getState();
      expect(state.volume).toBe(0);
    });

    it('should use default volume of 0.3', async () => {
      await generator.start(200, 10);

      const state = generator.getState();
      expect(state.volume).toBe(0.3);
    });

    it('should fade in volume smoothly on start', async () => {
      await generator.start(200, 10, 0.5);

      const masterGain = mockAudioContext.createGain.mock.results[0].value;

      // Should start at 0
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));

      // Should ramp to target volume
      expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        0.5,
        expect.any(Number)
      );
    });

    it('should adjust volume with smooth ramping', async () => {
      await generator.start(200, 10, 0.3);
      mockAudioContext.currentTime = 1.0;

      generator.setVolume(0.7);

      const masterGain = mockAudioContext.createGain.mock.results[0].value;

      expect(masterGain.gain.cancelScheduledValues).toHaveBeenCalled();
      expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.7, expect.any(Number));
    });

    it('should throw error when setting volume while not playing', () => {
      expect(() => {
        generator.setVolume(0.5);
      }).toThrow('Cannot set volume: generator not playing');
    });

    it('should clamp setVolume to valid range', async () => {
      await generator.start(200, 10);

      generator.setVolume(2.0);
      expect(generator.getState().volume).toBe(1.0);

      generator.setVolume(-1.0);
      expect(generator.getState().volume).toBe(0);
    });
  });

  describe('Start/Stop Lifecycle', () => {
    it('should mark as playing after start', async () => {
      await generator.start(200, 10);

      expect(generator.playing).toBe(true);
      expect(generator.getState().isPlaying).toBe(true);
    });

    it('should stop previous instance when starting while already playing', async () => {
      await generator.start(200, 10);
      const firstLeftOsc = mockAudioContext.createOscillator.mock.results[0].value;

      await generator.start(200, 8);

      expect(firstLeftOsc.stop).toHaveBeenCalled();
    });

    it('should fade out volume on stop', () => {
      generator.start(200, 10);
      mockAudioContext.currentTime = 1.0;

      generator.stop();

      const masterGain = mockAudioContext.createGain.mock.results[0].value;

      expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
    });

    it('should mark as not playing after stop', async () => {
      await generator.start(200, 10);
      generator.stop();

      expect(generator.playing).toBe(false);
    });

    it('should handle multiple stop calls gracefully', async () => {
      await generator.start(200, 10);

      generator.stop();
      generator.stop();

      // Should not throw
      expect(generator.playing).toBe(false);
    });
  });

  describe('Node Cleanup', () => {
    it('should disconnect all oscillators on cleanup', async () => {
      await generator.start(200, 10);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;
      const rightOsc = mockAudioContext.createOscillator.mock.results[1].value;

      generator.stop();

      // Wait for cleanup timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(leftOsc.stop).toHaveBeenCalled();
      expect(leftOsc.disconnect).toHaveBeenCalled();
      expect(rightOsc.stop).toHaveBeenCalled();
      expect(rightOsc.disconnect).toHaveBeenCalled();
    });

    it('should disconnect all gain nodes on cleanup', async () => {
      await generator.start(200, 10);

      const leftGain = mockAudioContext.createGain.mock.results[1].value;
      const rightGain = mockAudioContext.createGain.mock.results[2].value;

      generator.stop();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(leftGain.disconnect).toHaveBeenCalled();
      expect(rightGain.disconnect).toHaveBeenCalled();
    });

    it('should dispose all resources including AudioContext', async () => {
      await generator.start(200, 10);

      await generator.dispose();

      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      await generator.start(200, 10);

      const leftOsc = mockAudioContext.createOscillator.mock.results[0].value;
      leftOsc.disconnect.mockImplementation(() => {
        throw new Error('Disconnect failed');
      });

      // Should not throw
      generator.stop();
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Multiple Simultaneous Beats', () => {
    it('should allow creating multiple independent generators', async () => {
      const generator1 = new BinauralBeatGenerator();
      const generator2 = new BinauralBeatGenerator();

      await generator1.start(200, 10);
      await generator2.start(300, 5);

      expect(generator1.playing).toBe(true);
      expect(generator2.playing).toBe(true);

      generator1.stop();
      generator2.stop();
    });

    it('should maintain independent state for multiple generators', async () => {
      const generator1 = new BinauralBeatGenerator();
      const generator2 = new BinauralBeatGenerator();

      await generator1.start(200, 10, 0.3);
      await generator2.start(300, 5, 0.7);

      const state1 = generator1.getState();
      const state2 = generator2.getState();

      expect(state1.baseFrequency).toBe(200);
      expect(state1.beatFrequency).toBe(10);
      expect(state1.volume).toBe(0.3);

      expect(state2.baseFrequency).toBe(300);
      expect(state2.beatFrequency).toBe(5);
      expect(state2.volume).toBe(0.7);

      generator1.stop();
      generator2.stop();
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should reject base frequency below 20Hz', async () => {
      await expect(
        generator.start(10, 5)
      ).rejects.toThrow('Base frequency 10Hz out of range');
    });

    it('should reject base frequency above 20000Hz', async () => {
      await expect(
        generator.start(25000, 5)
      ).rejects.toThrow('Base frequency 25000Hz out of range');
    });

    it('should reject beat frequency below 0.5Hz', async () => {
      await expect(
        generator.start(200, 0.1)
      ).rejects.toThrow('Beat frequency 0.1Hz out of range');
    });

    it('should reject beat frequency above 40Hz', async () => {
      await expect(
        generator.start(200, 50)
      ).rejects.toThrow('Beat frequency 50Hz out of range');
    });

    it('should accept minimum valid frequencies', async () => {
      await generator.start(20, 0.5);

      const state = generator.getState();
      expect(state.baseFrequency).toBe(20);
      expect(state.beatFrequency).toBe(0.5);
    });

    it('should accept maximum valid frequencies', async () => {
      await generator.start(20000, 40);

      const state = generator.getState();
      expect(state.baseFrequency).toBe(20000);
      expect(state.beatFrequency).toBe(40);
    });

    it('should handle zero volume', async () => {
      await generator.start(200, 10, 0);

      const state = generator.getState();
      expect(state.volume).toBe(0);
    });

    it('should validate frequencies on setFrequency', async () => {
      await generator.start(200, 10);

      await expect(
        generator.setFrequency(10, 5)
      ).rejects.toThrow('Base frequency 10Hz out of range');
    });
  });

  describe('State Management', () => {
    it('should return complete state information', async () => {
      await generator.start(200, 10, 0.5);

      const state = generator.getState();

      expect(state).toEqual({
        isPlaying: true,
        baseFrequency: 200,
        beatFrequency: 10,
        volume: 0.5,
        leftFrequency: 200,
        rightFrequency: 210,
        audioContextState: 'running',
      });
    });

    it('should update state after frequency change', async () => {
      await generator.start(200, 10);
      await generator.setFrequency(200, 8);

      const state = generator.getState();

      expect(state.beatFrequency).toBe(8);
      expect(state.rightFrequency).toBe(208);
    });

    it('should update state after volume change', async () => {
      await generator.start(200, 10, 0.3);
      generator.setVolume(0.7);

      const state = generator.getState();

      expect(state.volume).toBe(0.7);
    });

    it('should reflect stopped state correctly', async () => {
      await generator.start(200, 10);
      generator.stop();

      const state = generator.getState();

      expect(state.isPlaying).toBe(false);
    });
  });

  describe('Memory Management', () => {
    it('should not leak references after dispose', async () => {
      await generator.start(200, 10);
      await generator.dispose();

      const state = generator.getState();
      expect(state.audioContextState).toBe('closed');
    });

    it('should allow restart after dispose', async () => {
      await generator.start(200, 10);
      await generator.dispose();

      // Should create new context
      await generator.start(200, 8);

      expect(generator.playing).toBe(true);
    });
  });
});
