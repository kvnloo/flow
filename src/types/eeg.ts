/**
 * EEG Type Definitions
 * Complete TypeScript interfaces for EEG data structures
 */

/**
 * Raw EEG sample from Muse device
 * Represents a single timestamped reading from all electrodes
 */
export interface EEGSample {
  /** Timestamp in milliseconds since epoch */
  timestamp: number;

  /** Raw electrode values in microvolts (μV) */
  electrodes: {
    /** Left temporal electrode (TP9) */
    TP9: number;
    /** Left frontal electrode (AF7) */
    AF7: number;
    /** Right frontal electrode (AF8) */
    AF8: number;
    /** Right temporal electrode (TP10) */
    TP10: number;
  };

  /** Optional auxiliary electrode (Muse 2+) */
  aux?: number;
}

/**
 * Muse device information and connection state
 */
export interface MuseDeviceInfo {
  /** Device name (e.g., "Muse-1A2B") */
  name: string;

  /** Bluetooth device ID */
  id: string;

  /** Device model identifier */
  model: 'muse-2' | 'muse-s' | 'muse-2016' | string;

  /** Connection state */
  connected: boolean;

  /** Battery level (0-100) if available */
  batteryLevel?: number;

  /** Signal quality per electrode (0-4, where 4 is best) */
  signalQuality?: {
    TP9: number;
    AF7: number;
    AF8: number;
    TP10: number;
  };
}

/**
 * Frequency bands extracted from EEG signals
 * Standard neurological frequency ranges
 */
export interface FrequencyBands {
  /** Delta waves (0.5-4 Hz) - deep sleep, unconscious processes */
  delta: number;

  /** Theta waves (4-8 Hz) - meditation, creativity, light sleep */
  theta: number;

  /** Alpha waves (8-13 Hz) - relaxed awareness, calm focus */
  alpha: number;

  /** Beta waves (13-30 Hz) - active thinking, focus, alertness */
  beta: number;

  /** Gamma waves (30-100 Hz) - peak concentration, cognitive processing */
  gamma: number;
}

/**
 * Processed EEG data with derived metrics
 * Result of signal processing and feature extraction
 */
export interface ProcessedEEG {
  /** Original timestamp from raw sample */
  timestamp: number;

  /** Frequency band power per electrode */
  bands: {
    TP9: FrequencyBands;
    AF7: FrequencyBands;
    AF8: FrequencyBands;
    TP10: FrequencyBands;
  };

  /** Average band power across all electrodes */
  averageBands: FrequencyBands;

  /** Derived mental state metrics (0-1 normalized) */
  metrics?: {
    /** Focus/attention level */
    focus?: number;

    /** Relaxation/calm level */
    relaxation?: number;

    /** Mental workload/stress */
    workload?: number;

    /** Engagement level */
    engagement?: number;
  };

  /** Signal quality indicator (0-1, where 1 is best) */
  quality: number;

  /** Processing metadata */
  processingInfo?: {
    /** Algorithm version */
    version: string;

    /** Processing latency in milliseconds */
    latency: number;

    /** Window size used for FFT */
    windowSize: number;
  };
}

/**
 * EEG recording session metadata
 */
export interface EEGSession {
  /** Unique session identifier */
  id: string;

  /** Session start timestamp */
  startTime: number;

  /** Session end timestamp (undefined if ongoing) */
  endTime?: number;

  /** Device used for recording */
  device: MuseDeviceInfo;

  /** Number of samples collected */
  sampleCount: number;

  /** Session tags/labels */
  tags?: string[];

  /** Session notes */
  notes?: string;
}

/**
 * Real-time EEG stream configuration
 */
export interface EEGStreamConfig {
  /** Sampling rate in Hz (default: 256 for Muse) */
  sampleRate: number;

  /** Buffer size for batch processing */
  bufferSize: number;

  /** Enable real-time processing */
  enableProcessing: boolean;

  /** Notch filter frequency (50Hz or 60Hz for power line) */
  notchFilter?: 50 | 60;

  /** Bandpass filter range */
  bandpassFilter?: {
    lowCut: number;
    highCut: number;
  };
}

/**
 * EEG data export format
 */
export interface EEGExport {
  /** Session metadata */
  session: EEGSession;

  /** Raw samples */
  samples: EEGSample[];

  /** Processed data if available */
  processed?: ProcessedEEG[];

  /** Export format version */
  version: string;

  /** Export timestamp */
  exportedAt: number;
}
