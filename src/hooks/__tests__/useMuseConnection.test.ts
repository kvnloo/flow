/**
 * @vitest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMuseConnection } from '../useMuseConnection';
import { MuseConnector } from '@/lib/eeg/museConnector';

// Mock MuseConnector
vi.mock('@/lib/eeg/museConnector', () => {
  return {
    MuseConnector: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      getDeviceInfo: vi.fn(),
      onDisconnect: null,
      onError: null,
      onStreamStart: null,
    })),
  };
});

describe('useMuseConnection', () => {
  let mockConnector: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnector = new MuseConnector();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useMuseConnection());

      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.deviceInfo).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should create MuseConnector instance', () => {
      renderHook(() => useMuseConnection());

      expect(MuseConnector).toHaveBeenCalledTimes(1);
    });

    it('should accept custom options', () => {
      const options = {
        autoReconnect: false,
        maxReconnectAttempts: 5,
        reconnectDelay: 3000,
      };

      const { result } = renderHook(() => useMuseConnection(options));

      expect(result.current.connectionState).toBe('disconnected');
    });
  });

  describe('Connection', () => {
    it('should connect to Muse device successfully', async () => {
      const deviceInfo = { name: 'Muse-S-123', id: 'test-id' };
      mockConnector.connect.mockResolvedValueOnce(undefined);
      mockConnector.getDeviceInfo.mockReturnValueOnce(deviceInfo);

      const { result } = renderHook(() => useMuseConnection());

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.connectionState).toBe('connected');
      expect(result.current.deviceInfo).toEqual(deviceInfo);
      expect(result.current.error).toBeNull();
      expect(mockConnector.connect).toHaveBeenCalledTimes(1);
    });

    it('should update state during connection', async () => {
      mockConnector.connect.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useMuseConnection());

      const connectPromise = act(async () => {
        await result.current.connect();
      });

      // State should be 'connecting' while promise is pending
      expect(result.current.connectionState).toBe('connecting');

      await connectPromise;
    });

    it('should handle connection errors', async () => {
      const error = new Error('Bluetooth not available');
      mockConnector.connect.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useMuseConnection());

      await act(async () => {
        try {
          await result.current.connect();
        } catch (err) {
          // Expected error
        }
      });

      expect(result.current.connectionState).toBe('error');
      expect(result.current.error).toEqual(error);
      expect(result.current.deviceInfo).toBeNull();
    });

    it('should set up disconnect handler', async () => {
      mockConnector.connect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMuseConnection());

      await act(async () => {
        await result.current.connect();
      });

      expect(mockConnector.onDisconnect).toBeInstanceOf(Function);
      expect(mockConnector.onError).toBeInstanceOf(Function);
      expect(mockConnector.onStreamStart).toBeInstanceOf(Function);
    });

    it('should transition to streaming state', async () => {
      mockConnector.connect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMuseConnection());

      await act(async () => {
        await result.current.connect();
      });

      // Trigger stream start
      act(() => {
        mockConnector.onStreamStart();
      });

      expect(result.current.connectionState).toBe('streaming');
    });
  });

  describe('Disconnection', () => {
    it('should disconnect successfully', async () => {
      mockConnector.connect.mockResolvedValueOnce(undefined);
      mockConnector.disconnect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMuseConnection());

      await act(async () => {
        await result.current.connect();
      });

      await act(async () => {
        await result.current.disconnect();
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.deviceInfo).toBeNull();
      expect(result.current.error).toBeNull();
      expect(mockConnector.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnect errors', async () => {
      const error = new Error('Disconnect failed');
      mockConnector.disconnect.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useMuseConnection());

      await act(async () => {
        try {
          await result.current.disconnect();
        } catch (err) {
          // Expected error
        }
      });

      expect(result.current.connectionState).toBe('error');
      expect(result.current.error).toEqual(error);
    });

    it('should handle device disconnect event', async () => {
      mockConnector.connect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMuseConnection());

      await act(async () => {
        await result.current.connect();
      });

      // Trigger disconnect event
      act(() => {
        mockConnector.onDisconnect();
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.deviceInfo).toBeNull();
    });
  });

  describe('Auto-reconnect', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto-reconnect on disconnect when enabled', async () => {
      mockConnector.connect.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useMuseConnection({ autoReconnect: true, reconnectDelay: 2000 })
      );

      await act(async () => {
        await result.current.connect();
      });

      // Trigger disconnect
      act(() => {
        mockConnector.onDisconnect();
      });

      expect(result.current.connectionState).toBe('disconnected');

      // Fast-forward to trigger reconnect
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await vi.runAllTimersAsync();
      });

      expect(result.current.connectionState).toBe('connecting');
      expect(mockConnector.connect).toHaveBeenCalledTimes(2);
    });

    it('should not auto-reconnect when disabled', async () => {
      mockConnector.connect.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useMuseConnection({ autoReconnect: false })
      );

      await act(async () => {
        await result.current.connect();
      });

      // Trigger disconnect
      act(() => {
        mockConnector.onDisconnect();
      });

      // Fast-forward time
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockConnector.connect).toHaveBeenCalledTimes(1);
    });

    it('should respect max reconnect attempts', async () => {
      mockConnector.connect.mockRejectedValue(new Error('Connection failed'));

      const { result } = renderHook(() =>
        useMuseConnection({
          autoReconnect: true,
          maxReconnectAttempts: 3,
          reconnectDelay: 1000,
        })
      );

      // Initial connection attempt
      await act(async () => {
        try {
          await result.current.connect();
        } catch (err) {
          // Expected
        }
      });

      // Attempt 1
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      // Attempt 2
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      // Attempt 3
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      // Should not attempt again
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.connectionState).toBe('error');
      expect(result.current.error?.message).toContain('Failed to reconnect after 3 attempts');
    });

    it('should reset reconnect attempts on successful connection', async () => {
      mockConnector.connect
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useMuseConnection({ autoReconnect: true, reconnectDelay: 1000 })
      );

      // Initial failed connection
      await act(async () => {
        try {
          await result.current.connect();
        } catch (err) {
          // Expected
        }
      });

      // Successful reconnection
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      expect(result.current.connectionState).toBe('connected');
      expect(result.current.error).toBeNull();
    });

    it('should clear reconnect timeout on manual disconnect', async () => {
      mockConnector.connect.mockResolvedValue(undefined);
      mockConnector.disconnect.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useMuseConnection({ autoReconnect: true, reconnectDelay: 2000 })
      );

      await act(async () => {
        await result.current.connect();
      });

      // Trigger auto-disconnect
      act(() => {
        mockConnector.onDisconnect();
      });

      // Manually disconnect before reconnect
      await act(async () => {
        await result.current.disconnect();
      });

      // Fast-forward time
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // Should only have initial connect call, no reconnect
      expect(mockConnector.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during connection', async () => {
      const error = new Error('Connection timeout');
      mockConnector.connect.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useMuseConnection({ autoReconnect: false }));

      await act(async () => {
        try {
          await result.current.connect();
        } catch (err) {
          // Expected
        }
      });

      expect(result.current.connectionState).toBe('error');
      expect(result.current.error).toEqual(error);
    });

    it('should handle error events from connector', async () => {
      mockConnector.connect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMuseConnection({ autoReconnect: false }));

      await act(async () => {
        await result.current.connect();
      });

      const error = new Error('Stream error');
      act(() => {
        mockConnector.onError(error);
      });

      expect(result.current.connectionState).toBe('error');
      expect(result.current.error).toEqual(error);
    });

    it('should trigger reconnect on error when enabled', async () => {
      vi.useFakeTimers();

      mockConnector.connect.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useMuseConnection({ autoReconnect: true, reconnectDelay: 1000 })
      );

      await act(async () => {
        await result.current.connect();
      });

      const error = new Error('Stream error');
      act(() => {
        mockConnector.onError(error);
      });

      expect(result.current.connectionState).toBe('error');

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      expect(result.current.connectionState).toBe('connecting');

      vi.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should disconnect on unmount', async () => {
      mockConnector.connect.mockResolvedValueOnce(undefined);
      mockConnector.disconnect.mockResolvedValueOnce(undefined);

      const { result, unmount } = renderHook(() => useMuseConnection());

      await act(async () => {
        await result.current.connect();
      });

      unmount();

      expect(mockConnector.disconnect).toHaveBeenCalled();
    });

    it('should clear reconnect timeout on unmount', async () => {
      vi.useFakeTimers();

      mockConnector.connect.mockResolvedValue(undefined);

      const { result, unmount } = renderHook(() =>
        useMuseConnection({ autoReconnect: true })
      );

      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        mockConnector.onDisconnect();
      });

      unmount();

      // Should not attempt reconnect after unmount
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockConnector.connect).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should not update state after unmount', async () => {
      mockConnector.connect.mockResolvedValueOnce(undefined);

      const { result, unmount } = renderHook(() => useMuseConnection());

      await act(async () => {
        await result.current.connect();
      });

      unmount();

      // Try to trigger state updates after unmount
      act(() => {
        mockConnector.onDisconnect?.();
        mockConnector.onError?.(new Error('Test'));
        mockConnector.onStreamStart?.();
      });

      // Should not throw errors
    });
  });

  describe('Edge Cases', () => {
    it('should handle connect called while already connecting', async () => {
      mockConnector.connect.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useMuseConnection());

      const promise1 = act(async () => {
        await result.current.connect();
      });

      const promise2 = act(async () => {
        await result.current.connect();
      });

      await Promise.all([promise1, promise2]);

      expect(mockConnector.connect).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid connect/disconnect cycles', async () => {
      mockConnector.connect.mockResolvedValue(undefined);
      mockConnector.disconnect.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMuseConnection());

      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.connect();
        });

        await act(async () => {
          await result.current.disconnect();
        });
      }

      expect(result.current.connectionState).toBe('disconnected');
      expect(mockConnector.connect).toHaveBeenCalledTimes(5);
      expect(mockConnector.disconnect).toHaveBeenCalledTimes(5);
    });

    it('should handle missing MuseConnector gracefully', async () => {
      // Create a new mock that returns null
      const nullConnector = vi.fn().mockImplementation(() => null);
      vi.mocked(MuseConnector).mockImplementationOnce(nullConnector as any);

      const { result } = renderHook(() => useMuseConnection());

      await act(async () => {
        try {
          await result.current.connect();
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
          expect((err as Error).message).toContain('not initialized');
        }
      });
    });
  });
});
