import { useState, useCallback, useEffect, useRef } from 'react';
import { MuseConnector } from '@/lib/eeg/museConnector';
import type { MuseDeviceInfo } from '@/types/eeg';

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'streaming'
  | 'error';

interface UseMuseConnectionReturn {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  deviceInfo: MuseDeviceInfo | null;
  connectionState: ConnectionState;
  error: Error | null;
}

interface UseMuseConnectionOptions {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useMuseConnection(
  options: UseMuseConnectionOptions = {}
): UseMuseConnectionReturn {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 3,
    reconnectDelay = 2000,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [deviceInfo, setDeviceInfo] = useState<MuseDeviceInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const museConnectorRef = useRef<MuseConnector | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Initialize MuseConnector
  useEffect(() => {
    museConnectorRef.current = new MuseConnector();
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  // Clear reconnect timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  // Auto-reconnect logic
  const scheduleReconnect = useCallback(() => {
    if (!autoReconnect || isUnmountedRef.current) return;
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setError(new Error(`Failed to reconnect after ${maxReconnectAttempts} attempts`));
      setConnectionState('error');
      return;
    }

    reconnectAttemptsRef.current += 1;
    setConnectionState('connecting');

    reconnectTimeoutRef.current = setTimeout(async () => {
      if (isUnmountedRef.current) return;

      try {
        await connect();
      } catch (err) {
        // Will be handled by connect() error handling
        console.error('Reconnection attempt failed:', err);
      }
    }, reconnectDelay);
  }, [autoReconnect, maxReconnectAttempts, reconnectDelay]);

  // Connect to Muse device
  const connect = useCallback(async () => {
    if (isUnmountedRef.current) return;

    const connector = museConnectorRef.current;
    if (!connector) {
      const err = new Error('MuseConnector not initialized');
      setError(err);
      setConnectionState('error');
      throw err;
    }

    try {
      setConnectionState('connecting');
      setError(null);

      await connector.connect();

      if (isUnmountedRef.current) {
        await connector.disconnect();
        return;
      }

      const info = connector.getDeviceInfo();
      setDeviceInfo(info);
      setConnectionState('connected');
      reconnectAttemptsRef.current = 0;

      // Setup disconnect handler
      connector.onDisconnect = () => {
        if (isUnmountedRef.current) return;

        setConnectionState('disconnected');
        setDeviceInfo(null);

        if (autoReconnect) {
          scheduleReconnect();
        }
      };

      // Setup error handler
      connector.onError = (err: Error) => {
        if (isUnmountedRef.current) return;

        setError(err);
        setConnectionState('error');

        if (autoReconnect) {
          scheduleReconnect();
        }
      };

      // When streaming starts
      connector.onStreamStart = () => {
        if (isUnmountedRef.current) return;
        setConnectionState('streaming');
      };

    } catch (err) {
      if (isUnmountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Failed to connect to Muse device');
      setError(error);
      setConnectionState('error');

      if (autoReconnect) {
        scheduleReconnect();
      }

      throw error;
    }
  }, [autoReconnect, scheduleReconnect]);

  // Disconnect from Muse device
  const disconnect = useCallback(async () => {
    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;

    const connector = museConnectorRef.current;
    if (!connector) return;

    try {
      await connector.disconnect();

      if (!isUnmountedRef.current) {
        setConnectionState('disconnected');
        setDeviceInfo(null);
        setError(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to disconnect from Muse device');

      if (!isUnmountedRef.current) {
        setError(error);
        setConnectionState('error');
      }

      throw error;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      const connector = museConnectorRef.current;
      if (connector) {
        connector.disconnect().catch(console.error);
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    deviceInfo,
    connectionState,
    error,
  };
}
