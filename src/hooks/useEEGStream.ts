import { useState, useEffect, useRef, useCallback } from 'react';
import { MuseConnector } from '@/lib/eeg/museConnector';
import { SignalProcessor } from '@/lib/eeg/signalProcessor';
import type { EEGReading, ProcessedEEG } from '@/types/eeg';

interface EEGStats {
  samplesPerSecond: number;
  latencyMs: number;
  droppedSamples: number;
  bufferSize: number;
}

interface UseEEGStreamReturn {
  eegData: EEGReading | null;
  processedData: ProcessedEEG | null;
  stats: EEGStats;
  isProcessing: boolean;
  error: Error | null;
}

const BUFFER_SIZE = 256;
const STATS_UPDATE_INTERVAL = 1000; // Update stats every second

export function useEEGStream(connector: MuseConnector | null): UseEEGStreamReturn {
  const [eegData, setEegData] = useState<EEGReading | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedEEG | null>(null);
  const [stats, setStats] = useState<EEGStats>({
    samplesPerSecond: 0,
    latencyMs: 0,
    droppedSamples: 0,
    bufferSize: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for managing processing state
  const processorRef = useRef<SignalProcessor | null>(null);
  const bufferRef = useRef<EEGReading[]>([]);
  const sampleCountRef = useRef(0);
  const lastStatsUpdateRef = useRef(Date.now());
  const droppedSamplesRef = useRef(0);
  const processingRef = useRef(false);

  // Initialize signal processor
  useEffect(() => {
    processorRef.current = new SignalProcessor();

    return () => {
      processorRef.current = null;
      bufferRef.current = [];
    };
  }, []);

  // Process buffered data
  const processBuffer = useCallback(async () => {
    if (processingRef.current || !processorRef.current || bufferRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const buffer = [...bufferRef.current];
      bufferRef.current = [];

      // Process each sample
      for (const reading of buffer) {
        const processed = await processorRef.current.process(reading);
        setProcessedData(processed);
      }

      // Update latest raw data
      if (buffer.length > 0) {
        setEegData(buffer[buffer.length - 1]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Processing error'));
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  // Update statistics
  const updateStats = useCallback(() => {
    const now = Date.now();
    const elapsed = (now - lastStatsUpdateRef.current) / 1000;

    if (elapsed >= STATS_UPDATE_INTERVAL / 1000) {
      const samplesPerSecond = sampleCountRef.current / elapsed;

      setStats({
        samplesPerSecond: Math.round(samplesPerSecond),
        latencyMs: bufferRef.current.length > 0
          ? Math.round((now - bufferRef.current[0].timestamp) / bufferRef.current.length)
          : 0,
        droppedSamples: droppedSamplesRef.current,
        bufferSize: bufferRef.current.length,
      });

      sampleCountRef.current = 0;
      lastStatsUpdateRef.current = now;
    }
  }, []);

  // Handle incoming EEG data
  const handleEEGData = useCallback((reading: EEGReading) => {
    // Check buffer overflow
    if (bufferRef.current.length >= BUFFER_SIZE) {
      droppedSamplesRef.current++;
      bufferRef.current.shift(); // Remove oldest sample
    }

    // Add to buffer
    bufferRef.current.push(reading);
    sampleCountRef.current++;

    // Update stats
    updateStats();

    // Trigger processing
    processBuffer();
  }, [processBuffer, updateStats]);

  // Subscribe to EEG stream
  useEffect(() => {
    if (!connector) {
      return;
    }

    let mounted = true;

    const subscribe = async () => {
      try {
        await connector.subscribe((reading) => {
          if (mounted) {
            handleEEGData(reading);
          }
        });
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Subscription error'));
        }
      }
    };

    subscribe();

    return () => {
      mounted = false;
      connector.unsubscribe();

      // Clean up buffers and state
      bufferRef.current = [];
      sampleCountRef.current = 0;
      droppedSamplesRef.current = 0;
      setEegData(null);
      setProcessedData(null);
      setIsProcessing(false);
    };
  }, [connector, handleEEGData]);

  // Periodic stats update
  useEffect(() => {
    const interval = setInterval(() => {
      updateStats();
    }, STATS_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [updateStats]);

  return {
    eegData,
    processedData,
    stats,
    isProcessing,
    error,
  };
}
