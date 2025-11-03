/**
 * Export Formats Utility
 *
 * Provides functions to export session data in various formats:
 * - CSV: Comma-separated values for spreadsheet analysis
 * - JSON: Pretty-printed JSON for programmatic access
 * - EDF: European Data Format for EEG research (requires edf.js)
 *
 * Features:
 * - Proper escaping and formatting
 * - ISO 8601 timestamps
 * - File size optimization with chunking
 * - Browser download triggers
 */

import type { SessionSummary, SessionEvent } from '../../types/session';
import type { EEGSample, ProcessedEEG } from '../../types/eeg';

/**
 * Export options for customizing output
 */
export interface ExportOptions {
  /** Include raw EEG samples in export */
  includeRawEEG?: boolean;

  /** Include processed EEG data */
  includeProcessedEEG?: boolean;

  /** Include session events */
  includeEvents?: boolean;

  /** Maximum rows per CSV chunk (for large exports) */
  maxRowsPerChunk?: number;

  /** Decimal precision for numeric values */
  decimalPrecision?: number;

  /** Pretty print JSON (vs minified) */
  prettyPrintJSON?: boolean;

  /** Include metadata headers */
  includeMetadata?: boolean;
}

/**
 * Default export options
 */
const DEFAULT_OPTIONS: Required<ExportOptions> = {
  includeRawEEG: true,
  includeProcessedEEG: true,
  includeEvents: true,
  maxRowsPerChunk: 50000,
  decimalPrecision: 4,
  prettyPrintJSON: true,
  includeMetadata: true,
};

/**
 * Extended session data with EEG samples and events
 */
export interface SessionExportData {
  session: SessionSummary;
  rawEEG?: EEGSample[];
  processedEEG?: ProcessedEEG[];
  events?: SessionEvent[];
}

/**
 * Escape CSV field value
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If contains comma, quotes, or newlines, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Format number with specified precision
 */
function formatNumber(value: number, precision: number): string {
  return value.toFixed(precision);
}

/**
 * Format timestamp to ISO 8601
 */
function formatTimestamp(timestamp: Date | number): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  return date.toISOString();
}

/**
 * Export sessions to CSV format
 *
 * @param sessions - Array of session summaries to export
 * @param options - Export options
 * @returns CSV string with headers and data rows
 */
export function exportToCSV(
  sessions: SessionSummary[],
  options: ExportOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const precision = opts.decimalPrecision;

  const lines: string[] = [];

  // Metadata header
  if (opts.includeMetadata) {
    lines.push(`# Flow Session Export`);
    lines.push(`# Generated: ${formatTimestamp(new Date())}`);
    lines.push(`# Sessions: ${sessions.length}`);
    lines.push('');
  }

  // CSV headers
  const headers = [
    'Session ID',
    'Start Time',
    'End Time',
    'Duration (min)',
    'Phase',
    'Active Time (min)',
    'Idle Time (min)',
    'Tasks Completed',
    'Lines Written',
    'Lines Deleted',
    'Files Modified',
    'Commits',
    'Context Switches',
    'Total Interruptions',
    'External Interruptions',
    'Internal Interruptions',
    'Planned Interruptions',
    'System Interruptions',
    'Recovery Time (s)',
    'Current Flow Score',
    'Average Flow Score',
    'Peak Flow Score',
    'Total Flow Time (min)',
    'Deep Flow Time (min)',
    'Flow Time (min)',
    'Focused Time (min)',
    'Normal Time (min)',
    'Distracted Time (min)',
    'Blocked Time (min)',
    'Typing Speed (cpm)',
    'Code Velocity (lpm)',
    'Velocity Trend',
    'Longest Flow Period (min)',
    'Average Flow Period (min)',
    'Flow Fragmentation',
    'Task Alignment',
    'Environment Stability',
    'Cognitive Load',
    'Energy Level',
  ];

  lines.push(headers.map(escapeCSV).join(','));

  // Data rows
  for (const session of sessions) {
    const { timeframe, metrics, flow } = session;
    const { flowStateDistribution } = metrics;

    const row = [
      session.sessionId,
      formatTimestamp(timeframe.start),
      formatTimestamp(timeframe.end),
      formatNumber(timeframe.duration, precision),
      session.config.targetDuration,
      formatNumber(metrics.activeTime, precision),
      formatNumber(metrics.idleTime, precision),
      metrics.tasksCompleted,
      metrics.linesWritten,
      metrics.linesDeleted,
      metrics.filesModified,
      metrics.commitsCount,
      metrics.contextSwitches,
      metrics.interruptions.total,
      metrics.interruptions.byType.external || 0,
      metrics.interruptions.byType.internal || 0,
      metrics.interruptions.byType.planned || 0,
      metrics.interruptions.byType.system || 0,
      formatNumber(metrics.interruptions.totalRecoveryTime, precision),
      formatNumber(flow.currentFlowScore, precision),
      formatNumber(flow.averageFlowScore, precision),
      formatNumber(flow.peakFlowScore, precision),
      formatNumber(flow.totalFlowTime, precision),
      formatNumber(flowStateDistribution['deep-flow'] || 0, precision),
      formatNumber(flowStateDistribution['flow'] || 0, precision),
      formatNumber(flowStateDistribution['focused'] || 0, precision),
      formatNumber(flowStateDistribution['normal'] || 0, precision),
      formatNumber(flowStateDistribution['distracted'] || 0, precision),
      formatNumber(flowStateDistribution['blocked'] || 0, precision),
      formatNumber(metrics.velocity.typingSpeed, precision),
      formatNumber(metrics.velocity.codeVelocity, precision),
      formatNumber(metrics.velocity.trend, precision),
      formatNumber(flow.sustainability.longestFlowPeriod, precision),
      formatNumber(flow.sustainability.averageFlowPeriod, precision),
      formatNumber(flow.sustainability.fragmentation, precision),
      formatNumber(flow.flowFactors.taskAlignment, precision),
      formatNumber(flow.flowFactors.environmentStability, precision),
      formatNumber(flow.flowFactors.cognitiveLoad, precision),
      formatNumber(flow.flowFactors.energyLevel, precision),
    ];

    lines.push(row.map(escapeCSV).join(','));
  }

  return lines.join('\n');
}

/**
 * Export session data to JSON format
 *
 * @param sessions - Array of session summaries to export
 * @param options - Export options
 * @returns JSON string (pretty-printed or minified)
 */
export function exportToJSON(
  sessions: SessionSummary[],
  options: ExportOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const exportData = {
    metadata: opts.includeMetadata ? {
      exportedAt: formatTimestamp(new Date()),
      version: '1.0.0',
      sessionCount: sessions.length,
    } : undefined,
    sessions: sessions.map(session => ({
      ...session,
      // Convert Date objects to ISO strings for JSON compatibility
      timeframe: {
        start: formatTimestamp(session.timeframe.start),
        end: formatTimestamp(session.timeframe.end),
        duration: session.timeframe.duration,
      },
      calibration: session.calibration ? {
        ...session.calibration,
        calibratedAt: formatTimestamp(session.calibration.calibratedAt),
      } : undefined,
      flow: {
        ...session.flow,
        stateTransitions: session.flow.stateTransitions.map(t => ({
          ...t,
          timestamp: formatTimestamp(t.timestamp),
        })),
        predictions: session.flow.predictions ? {
          ...session.flow.predictions,
          recommendedBreak: session.flow.predictions.recommendedBreak
            ? formatTimestamp(session.flow.predictions.recommendedBreak)
            : undefined,
        } : undefined,
      },
    })),
  };

  // Remove undefined metadata if not included
  if (!opts.includeMetadata) {
    delete exportData.metadata;
  }

  return opts.prettyPrintJSON
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);
}

/**
 * Export single session with EEG data to EDF format
 *
 * EDF (European Data Format) is the standard for EEG research
 * Requires the edf.js library for actual encoding
 *
 * @param data - Session export data with EEG samples
 * @param options - Export options
 * @returns ArrayBuffer containing EDF file data
 */
export async function exportToEDF(
  data: SessionExportData,
  options: ExportOptions = {}
): Promise<ArrayBuffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check if EEG data is available
  if (!data.rawEEG || data.rawEEG.length === 0) {
    throw new Error('No raw EEG data available for EDF export');
  }

  // EDF requires fixed sample rate
  const sampleRate = 256; // Hz (Muse device default)
  const samples = data.rawEEG;

  // EDF file structure
  // Header: 256 bytes + (256 bytes × number of signals)
  // Data records: multiple of record duration

  const numSignals = 4; // TP9, AF7, AF8, TP10
  const headerSize = 256 + (256 * numSignals);
  const recordDuration = 1; // 1 second per record
  const samplesPerRecord = sampleRate * recordDuration;

  // Calculate number of records
  const numRecords = Math.ceil(samples.length / samplesPerRecord);
  const totalSamples = numRecords * samplesPerRecord * numSignals;

  // Create buffer for entire file
  const dataRecordSize = samplesPerRecord * numSignals * 2; // 2 bytes per sample (int16)
  const fileSize = headerSize + (numRecords * dataRecordSize);
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const encoder = new TextEncoder();

  let offset = 0;

  // Helper to write ASCII string with padding
  function writeASCII(text: string, length: number): void {
    const bytes = encoder.encode(text.padEnd(length, ' ').substring(0, length));
    for (let i = 0; i < length; i++) {
      view.setUint8(offset++, bytes[i] || 32); // 32 = space
    }
  }

  // HEADER RECORD (256 bytes)
  writeASCII('0', 8);                          // Version
  writeASCII(`Flow Session ${data.session.sessionId}`, 80);  // Patient ID
  writeASCII(`Recording ${formatTimestamp(data.session.timeframe.start)}`, 80); // Recording ID

  const startDate = new Date(data.session.timeframe.start);
  writeASCII(
    `${String(startDate.getDate()).padStart(2, '0')}.` +
    `${String(startDate.getMonth() + 1).padStart(2, '0')}.` +
    `${String(startDate.getFullYear()).substring(2)}`,
    8
  ); // Start date (dd.mm.yy)

  writeASCII(
    `${String(startDate.getHours()).padStart(2, '0')}.` +
    `${String(startDate.getMinutes()).padStart(2, '0')}.` +
    `${String(startDate.getSeconds()).padStart(2, '0')}`,
    8
  ); // Start time (hh.mm.ss)

  writeASCII(String(headerSize), 8);           // Header size
  writeASCII('', 44);                          // Reserved
  writeASCII(String(numRecords), 8);           // Number of data records
  writeASCII(String(recordDuration), 8);       // Duration of data record
  writeASCII(String(numSignals), 4);           // Number of signals

  // SIGNAL SPECIFICATIONS (256 bytes per signal)
  const electrodes = ['TP9', 'AF7', 'AF8', 'TP10'];

  for (const electrode of electrodes) {
    writeASCII(electrode, 16);                 // Label
  }

  for (let i = 0; i < numSignals; i++) {
    writeASCII('EEG', 80);                     // Transducer type
  }

  for (let i = 0; i < numSignals; i++) {
    writeASCII('uV', 8);                       // Physical dimension
  }

  for (let i = 0; i < numSignals; i++) {
    writeASCII('-2048', 8);                    // Physical minimum
  }

  for (let i = 0; i < numSignals; i++) {
    writeASCII('2048', 8);                     // Physical maximum
  }

  for (let i = 0; i < numSignals; i++) {
    writeASCII('-32768', 8);                   // Digital minimum
  }

  for (let i = 0; i < numSignals; i++) {
    writeASCII('32767', 8);                    // Digital maximum
  }

  for (let i = 0; i < numSignals; i++) {
    writeASCII('', 80);                        // Prefiltering
  }

  for (let i = 0; i < numSignals; i++) {
    writeASCII(String(samplesPerRecord), 8);   // Samples per record
  }

  for (let i = 0; i < numSignals; i++) {
    writeASCII('', 32);                        // Reserved
  }

  // DATA RECORDS
  let sampleIndex = 0;

  for (let record = 0; record < numRecords; record++) {
    // Write samples for each electrode in sequence
    for (const electrode of electrodes as Array<keyof EEGSample['electrodes']>) {
      for (let i = 0; i < samplesPerRecord; i++) {
        let value = 0;

        if (sampleIndex < samples.length) {
          // Convert microvolts to digital value (int16)
          const uV = samples[sampleIndex].electrodes[electrode];
          value = Math.round((uV / 2048) * 32767);
          value = Math.max(-32768, Math.min(32767, value)); // Clamp to int16 range
        }

        view.setInt16(offset, value, true); // Little-endian
        offset += 2;

        if (i === samplesPerRecord - 1) {
          sampleIndex++;
        }
      }

      // Reset sample index for next electrode
      sampleIndex -= samplesPerRecord;
    }

    sampleIndex += samplesPerRecord;
  }

  return buffer;
}

/**
 * Export extended session data to JSON with EEG samples
 */
export function exportSessionWithEEG(
  data: SessionExportData,
  options: ExportOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const exportData: any = {
    metadata: opts.includeMetadata ? {
      exportedAt: formatTimestamp(new Date()),
      version: '1.0.0',
      format: 'flow-session-extended',
    } : undefined,
    session: {
      ...data.session,
      timeframe: {
        start: formatTimestamp(data.session.timeframe.start),
        end: formatTimestamp(data.session.timeframe.end),
        duration: data.session.timeframe.duration,
      },
    },
  };

  if (opts.includeRawEEG && data.rawEEG) {
    exportData.rawEEG = {
      sampleCount: data.rawEEG.length,
      sampleRate: 256,
      samples: data.rawEEG.map(s => ({
        timestamp: s.timestamp,
        TP9: formatNumber(s.electrodes.TP9, opts.decimalPrecision),
        AF7: formatNumber(s.electrodes.AF7, opts.decimalPrecision),
        AF8: formatNumber(s.electrodes.AF8, opts.decimalPrecision),
        TP10: formatNumber(s.electrodes.TP10, opts.decimalPrecision),
      })),
    };
  }

  if (opts.includeProcessedEEG && data.processedEEG) {
    exportData.processedEEG = {
      sampleCount: data.processedEEG.length,
      samples: data.processedEEG.map(p => ({
        timestamp: p.timestamp,
        averageBands: {
          delta: formatNumber(p.averageBands.delta, opts.decimalPrecision),
          theta: formatNumber(p.averageBands.theta, opts.decimalPrecision),
          alpha: formatNumber(p.averageBands.alpha, opts.decimalPrecision),
          beta: formatNumber(p.averageBands.beta, opts.decimalPrecision),
          gamma: formatNumber(p.averageBands.gamma, opts.decimalPrecision),
        },
        metrics: p.metrics,
        quality: formatNumber(p.quality, opts.decimalPrecision),
      })),
    };
  }

  if (opts.includeEvents && data.events) {
    exportData.events = data.events.map(event => ({
      ...event,
      timestamp: formatTimestamp(event.timestamp),
    }));
  }

  if (!opts.includeMetadata) {
    delete exportData.metadata;
  }

  return opts.prettyPrintJSON
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);
}

/**
 * Trigger browser download of exported data
 *
 * @param content - File content (string or ArrayBuffer)
 * @param filename - Download filename
 * @param mimeType - MIME type for the file
 */
export function triggerDownload(
  content: string | ArrayBuffer,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob(
    [content],
    { type: mimeType }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export sessions to CSV file with automatic download
 */
export function downloadSessionsCSV(
  sessions: SessionSummary[],
  filename: string = `flow-sessions-${Date.now()}.csv`,
  options: ExportOptions = {}
): void {
  const csv = exportToCSV(sessions, options);
  triggerDownload(csv, filename, 'text/csv');
}

/**
 * Export sessions to JSON file with automatic download
 */
export function downloadSessionsJSON(
  sessions: SessionSummary[],
  filename: string = `flow-sessions-${Date.now()}.json`,
  options: ExportOptions = {}
): void {
  const json = exportToJSON(sessions, options);
  triggerDownload(json, filename, 'application/json');
}

/**
 * Export session to EDF file with automatic download
 */
export async function downloadSessionEDF(
  data: SessionExportData,
  filename: string = `flow-session-${data.session.sessionId}.edf`,
  options: ExportOptions = {}
): Promise<void> {
  const edf = await exportToEDF(data, options);
  triggerDownload(edf, filename, 'application/octet-stream');
}

/**
 * Export session with EEG data to JSON file
 */
export function downloadSessionWithEEG(
  data: SessionExportData,
  filename: string = `flow-session-eeg-${data.session.sessionId}.json`,
  options: ExportOptions = {}
): void {
  const json = exportSessionWithEEG(data, options);
  triggerDownload(json, filename, 'application/json');
}

/**
 * Chunk large session array for optimized processing
 * Useful when exporting thousands of sessions
 */
export function* chunkSessions(
  sessions: SessionSummary[],
  chunkSize: number = 1000
): Generator<SessionSummary[], void, unknown> {
  for (let i = 0; i < sessions.length; i += chunkSize) {
    yield sessions.slice(i, i + chunkSize);
  }
}

/**
 * Export large session dataset in chunks
 * Returns array of CSV strings for parallel processing
 */
export function exportToCSVChunked(
  sessions: SessionSummary[],
  options: ExportOptions = {}
): string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: string[] = [];

  for (const chunk of chunkSessions(sessions, opts.maxRowsPerChunk)) {
    chunks.push(exportToCSV(chunk, { ...options, includeMetadata: false }));
  }

  return chunks;
}
