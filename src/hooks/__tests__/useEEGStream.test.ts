/**
 * @vitest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEEGStream } from '../useEEGStream';
import { MuseConnector } from '@/lib/eeg/museConnector';
import { SignalProcessor } from '@/lib/eeg/signalProcessor';
import type { EEGReading, ProcessedEEG } from '@/types/eeg';

// Mock dependencies
vi.mock('@/lib/eeg/signalProcessor', () => {
  return {
    SignalProcessor: vi.fn().mockImplementation(() => ({
      process: vi.fn(),
    })),
  };
});

describe('useEEGStream', () => {
  let mockConnector: any;
  let mockProcessor: any;
  let subscribeCallback: ((reading: EEGReading) => void) | null = null;

  const createMockReading = (overrides?: Partial<EEGReading>): EEGReading => ({
    timestamp: Date.now(),
    channels: {
      TP9: [0.5, 0.6, 0.7],
      AF7: [0.3, 0.4, 0.5],
      AF8: [0.2, 0.3, 0.4],
      TP10: [0.4, 0.5, 0.6],
      AUX: [0.1, 0.2, 0.3],
    },
    ...overrides,
  });

  const createMockProcessed = (overrides?: Partial<ProcessedEEG>): ProcessedEEG => ({
    timestamp: Date.now(),
    bands: {
      delta: [1, 2, 3],
      theta: [2, 3, 4],
      alpha: [3, 4, 5],
      beta: [4, 5, 6],
      gamma: [5, 6, 7],
    },
    quality: 0.9,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    subscribeCallback = null;

    mockConnector = {
      subscribe: vi.fn((callback) => {
        subscribeCallback = callback;
        return Promise.resolve();
      }),
      unsubscribe: vi.fn(),
    };

    mockProcessor = new SignalProcessor();
    mockProcessor.process.mockResolvedValue(createMockProcessed());
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with null data and zero stats', () => {
      const { result } = renderHook(() => useEEGStream(null));

      expect(result.current.eegData).toBeNull();
      expect(result.current.processedData).toBeNull();
      expect(result.current.stats).toEqual({
        samplesPerSecond: 0,
        latencyMs: 0,
        droppedSamples: 0,
        bufferSize: 0,
      });
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should create SignalProcessor instance', () => {
      renderHook(() => useEEGStream(null));

      expect(SignalProcessor).toHaveBeenCalledTimes(1);
    });

    it('should not subscribe without connector', () => {
      renderHook(() => useEEGStream(null));

      expect(mockConnector.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('Data Streaming', () => {
    it('should subscribe to connector when provided', async () => {
      renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(mockConnector.subscribe).toHaveBeenCalledTimes(1);
        expect(subscribeCallback).toBeInstanceOf(Function);
      });
    });

    it('should process incoming EEG data', async () => {
      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      const mockReading = createMockReading();

      await act(async () => {
        subscribeCallback!(mockReading);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.eegData).toEqual(mockReading);
        expect(mockProcessor.process).toHaveBeenCalledWith(mockReading);
      });
    });

    it('should update processed data', async () => {
      const mockProcessed = createMockProcessed();
      mockProcessor.process.mockResolvedValue(mockProcessed);

      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      await act(async () => {
        subscribeCallback!(createMockReading());
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.processedData).toEqual(mockProcessed);
      });
    });

    it('should buffer multiple readings', async () => {
      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      const readings = [
        createMockReading({ timestamp: 1000 }),
        createMockReading({ timestamp: 2000 }),
        createMockReading({ timestamp: 3000 }),
      ];

      await act(async () => {
        readings.forEach(reading => subscribeCallback!(reading));
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await waitFor(() => {
        expect(mockProcessor.process).toHaveBeenCalledTimes(3);
        expect(result.current.eegData).toEqual(readings[2]);
      });
    });

    it('should handle buffer overflow', async () => {
      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      // Send more than BUFFER_SIZE (256) samples
      await act(async () => {
        for (let i = 0; i < 300; i++) {
          subscribeCallback!(createMockReading({ timestamp: i }));
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(result.current.stats.droppedSamples).toBeGreaterThan(0);
      });
    });
  });

  describe('Processing State', () => {
    it('should set isProcessing flag during processing', async () => {
      let resolveProcess: any;
      mockProcessor.process.mockReturnValue(
        new Promise(resolve => {
          resolveProcess = resolve;
        })
      );

      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      await act(async () => {
        subscribeCallback!(createMockReading());
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.isProcessing).toBe(true);

      await act(async () => {
        resolveProcess(createMockProcessed());
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });
    });

    it('should not start new processing while busy', async () => {
      let resolveProcess: any;
      mockProcessor.process.mockReturnValue(
        new Promise(resolve => {
          resolveProcess = resolve;
        })
      );

      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      await act(async () => {
        subscribeCallback!(createMockReading());
        subscribeCallback!(createMockReading());
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(mockProcessor.process).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveProcess(createMockProcessed());
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(mockProcessor.process).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate samples per second', async () => {
      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      // Send samples
      await act(async () => {
        for (let i = 0; i < 256; i++) {
          subscribeCallback!(createMockReading());
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Advance timer to trigger stats update
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.stats.samplesPerSecond).toBeGreaterThan(0);
      });
    });

    it('should track buffer size', async () => {
      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      await act(async () => {
        for (let i = 0; i < 10; i++) {
          subscribeCallback!(createMockReading());
        }
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.stats.bufferSize).toBeGreaterThanOrEqual(0);
      });
    });

    it('should update stats periodically', async () => {
      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      const initialStats = result.current.stats;

      await act(async () => {
        for (let i = 0; i < 50; i++) {
          subscribeCallback!(createMockReading());
        }
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.stats).not.toEqual(initialStats);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle subscription errors', async () => {
      const error = new Error('Subscription failed');
      mockConnector.subscribe.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(result.current.error?.message).toBe('Subscription failed');
      });
    });

    it('should handle processing errors', async () => {
      const error = new Error('Processing failed');
      mockProcessor.process.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      await act(async () => {
        subscribeCallback!(createMockReading());
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.error?.message).toBe('Processing failed');
        expect(result.current.isProcessing).toBe(false);
      });
    });

    it('should continue processing after error', async () => {
      mockProcessor.process
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(createMockProcessed());

      const { result } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      // First reading - error
      await act(async () => {
        subscribeCallback!(createMockReading());
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second reading - success
      await act(async () => {
        subscribeCallback!(createMockReading());
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.processedData).not.toBeNull();
      });
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useEEGStream(mockConnector));

      unmount();

      expect(mockConnector.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should clear buffers on unmount', async () => {
      const { result, unmount } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      await act(async () => {
        subscribeCallback!(createMockReading());
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      unmount();

      // State should be cleared
      expect(result.current.eegData).toBeNull();
      expect(result.current.processedData).toBeNull();
      expect(result.current.isProcessing).toBe(false);
    });

    it('should not process data after unmount', async () => {
      const { unmount } = renderHook(() => useEEGStream(mockConnector));

      await waitFor(() => {
        expect(subscribeCallback).not.toBeNull();
      });

      const callbackRef = subscribeCallback;
      unmount();

      // Try to send data after unmount
      await act(async () => {
        callbackRef!(createMockReading());
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should not process
      expect(mockProcessor.process).not.toHaveBeenCalled();
    });

    it('should clear stats interval on unmount', () => {
      vi.useFakeTimers();

      const { unmount } = renderHook(() => useEEGStream(mockConnector));

      unmount();

      // Stats should not update after unmount
      vi.advanceTimersByTime(2000);

      expect(mockConnector.subscribe).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Connector Changes', () => {
    it('should handle connector becoming available', async () => {
      const { result, rerender } = renderHook(
        ({ connector }) => useEEGStream(connector),
        { initialProps: { connector: null } }
      );

      expect(result.current.eegData).toBeNull();

      rerender({ connector: mockConnector });

      await waitFor(() => {
        expect(mockConnector.subscribe).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle connector changing', async () => {
      const mockConnector2 = {
        subscribe: vi.fn().mockResolvedValue(undefined),
        unsubscribe: vi.fn(),
      };

      const { rerender } = renderHook(
        ({ connector }) => useEEGStream(connector),
        { initialProps: { connector: mockConnector } }
      );

      await waitFor(() => {
        expect(mockConnector.subscribe).toHaveBeenCalled();
      });

      rerender({ connector: mockConnector2 });

      await waitFor(() => {
        expect(mockConnector.unsubscribe).toHaveBeenCalled();
        expect(mockConnector2.subscribe).toHaveBeenCalled();
      });
    });

    it('should handle connector becoming null', async () => {
      const { rerender } = renderHook(
        ({ connector }) => useEEGStream(connector),
        { initialProps: { connector: mockConnector } }
      );

      await waitFor(() => {
        expect(mockConnector.subscribe).toHaveBeenCalled();
      });

      rerender({ connector: null });

      expect(mockConnector.unsubscribe).toHaveBeenCalled();
    });
  });
});
