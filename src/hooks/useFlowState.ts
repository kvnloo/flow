import { useState, useEffect, useCallback, useRef } from 'react';
import { FlowClassifier } from '@/lib/eeg/flowClassifier';
import type { ProcessedEEGData } from '@/lib/eeg/types';

/**
 * Flow metrics state
 */
export interface FlowMetrics {
  flowScore: number;
  cognitiveLoad: number;
  attention: number;
  relaxation: number;
  timestamp: number;
}

/**
 * Calibration state
 */
export interface CalibrationState {
  isCalibrated: boolean;
  progress: number;
  samplesCollected: number;
  samplesRequired: number;
}

/**
 * Flow state history entry
 */
export interface FlowHistoryEntry extends FlowMetrics {
  id: string;
}

/**
 * Hook return type
 */
export interface UseFlowStateReturn {
  flowMetrics: FlowMetrics | null;
  isCalibrated: boolean;
  calibrationProgress: number;
  history: FlowHistoryEntry[];
  startCalibration: () => void;
  updateFlowState: (eegData: ProcessedEEGData) => void;
  resetCalibration: () => void;
  clearHistory: () => void;
}

/**
 * Default flow metrics
 */
const DEFAULT_METRICS: FlowMetrics = {
  flowScore: 0,
  cognitiveLoad: 0,
  attention: 0,
  relaxation: 0,
  timestamp: Date.now(),
};

/**
 * Maximum history entries to keep
 */
const MAX_HISTORY_ENTRIES = 1000;

/**
 * React hook for managing flow state detection and calibration
 *
 * Features:
 * - Calibration management and progress tracking
 * - Flow state classification from processed EEG data
 * - Real-time flow metrics (flowScore, cognitiveLoad, attention, relaxation)
 * - Historical tracking for trend analysis
 * - Integration with FlowClassifier
 *
 * @returns Flow state management interface
 *
 * @example
 * ```tsx
 * function FlowMonitor() {
 *   const {
 *     flowMetrics,
 *     isCalibrated,
 *     calibrationProgress,
 *     startCalibration,
 *     updateFlowState
 *   } = useFlowState();
 *
 *   useEffect(() => {
 *     if (!isCalibrated) {
 *       startCalibration();
 *     }
 *   }, [isCalibrated]);
 *
 *   return (
 *     <div>
 *       {!isCalibrated ? (
 *         <CalibrationProgress progress={calibrationProgress} />
 *       ) : (
 *         <FlowMetrics metrics={flowMetrics} />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFlowState(): UseFlowStateReturn {
  // Core state
  const [flowMetrics, setFlowMetrics] = useState<FlowMetrics | null>(null);
  const [calibrationState, setCalibrationState] = useState<CalibrationState>({
    isCalibrated: false,
    progress: 0,
    samplesCollected: 0,
    samplesRequired: 0,
  });
  const [history, setHistory] = useState<FlowHistoryEntry[]>([]);

  // FlowClassifier instance (persistent across renders)
  const classifierRef = useRef<FlowClassifier | null>(null);
  const isCalibrating = useRef(false);

  /**
   * Initialize FlowClassifier on mount
   */
  useEffect(() => {
    if (!classifierRef.current) {
      classifierRef.current = new FlowClassifier();
    }
  }, []);

  /**
   * Start calibration process
   */
  const startCalibration = useCallback(() => {
    const classifier = classifierRef.current;
    if (!classifier) return;

    isCalibrating.current = true;
    classifier.startCalibration();

    setCalibrationState({
      isCalibrated: false,
      progress: 0,
      samplesCollected: 0,
      samplesRequired: 100, // Default from FlowClassifier
    });
  }, []);

  /**
   * Reset calibration and clear state
   */
  const resetCalibration = useCallback(() => {
    const classifier = classifierRef.current;
    if (!classifier) return;

    classifier.resetCalibration();
    isCalibrating.current = false;

    setCalibrationState({
      isCalibrated: false,
      progress: 0,
      samplesCollected: 0,
      samplesRequired: 0,
    });
    setFlowMetrics(null);
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  /**
   * Update flow state with new EEG data
   */
  const updateFlowState = useCallback((eegData: ProcessedEEGData) => {
    const classifier = classifierRef.current;
    if (!classifier) return;

    // Update calibration if in progress
    if (isCalibrating.current) {
      classifier.calibrate(eegData);

      const calibrationStatus = classifier.getCalibrationStatus();
      const progress = calibrationStatus.samplesCollected / calibrationStatus.samplesRequired;

      setCalibrationState({
        isCalibrated: calibrationStatus.isCalibrated,
        progress,
        samplesCollected: calibrationStatus.samplesCollected,
        samplesRequired: calibrationStatus.samplesRequired,
      });

      // Calibration complete
      if (calibrationStatus.isCalibrated) {
        isCalibrating.current = false;
      }
    }

    // Classify flow state if calibrated
    if (classifier.getCalibrationStatus().isCalibrated) {
      const flowState = classifier.classifyFlowState(eegData);

      const metrics: FlowMetrics = {
        flowScore: flowState.flowScore,
        cognitiveLoad: flowState.cognitiveLoad,
        attention: flowState.attention,
        relaxation: flowState.relaxation,
        timestamp: Date.now(),
      };

      setFlowMetrics(metrics);

      // Add to history
      setHistory(prev => {
        const newEntry: FlowHistoryEntry = {
          ...metrics,
          id: `${metrics.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        };

        const updated = [...prev, newEntry];

        // Limit history size
        if (updated.length > MAX_HISTORY_ENTRIES) {
          return updated.slice(-MAX_HISTORY_ENTRIES);
        }

        return updated;
      });
    }
  }, []);

  return {
    flowMetrics,
    isCalibrated: calibrationState.isCalibrated,
    calibrationProgress: calibrationState.progress,
    history,
    startCalibration,
    updateFlowState,
    resetCalibration,
    clearHistory,
  };
}

/**
 * Hook for accessing flow metrics without calibration management
 * Useful for display-only components
 */
export function useFlowMetrics() {
  const { flowMetrics, isCalibrated } = useFlowState();
  return { flowMetrics, isCalibrated };
}

/**
 * Hook for accessing flow history
 * Useful for analytics and visualization components
 */
export function useFlowHistory() {
  const { history, clearHistory } = useFlowState();
  return { history, clearHistory };
}
