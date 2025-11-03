/**
 * Export utilities for session data in multiple formats
 * Supports CSV and JSON exports for analytics and data portability
 */

import { Session, SessionEvent, FlowMetric, CalibrationData } from '../storage/sessionDB';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeMetrics?: boolean;
  includeEvents?: boolean;
  includeCalibrations?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Convert sessions to CSV format
 */
export function sessionsToCSV(sessions: Session[]): string {
  if (sessions.length === 0) {
    return 'No data to export';
  }

  // CSV headers
  const headers = [
    'Session ID',
    'User ID',
    'Start Time',
    'End Time',
    'Duration (min)',
    'Flow Score',
    'Mean Flow Score',
    'Peak Flow Score',
    'Total Interruptions',
    'Deep Work Minutes',
    'Tags',
    'Notes',
  ];

  // Convert sessions to CSV rows
  const rows = sessions.map(session => [
    session.id,
    session.userId,
    new Date(session.startTime).toISOString(),
    session.endTime ? new Date(session.endTime).toISOString() : '',
    session.duration?.toString() || '',
    session.flowScore?.toString() || '',
    session.meanFlowScore?.toString() || '',
    session.peakFlowScore?.toString() || '',
    session.totalInterruptions?.toString() || '',
    session.deepWorkMinutes?.toString() || '',
    session.tags?.join(';') || '',
    session.notes?.replace(/,/g, ';') || '', // Escape commas in notes
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Convert metrics to CSV format
 */
export function metricsToCSV(metrics: FlowMetric[]): string {
  if (metrics.length === 0) {
    return 'No metrics to export';
  }

  const headers = [
    'Metric ID',
    'Session ID',
    'Timestamp',
    'Flow Score',
    'Focus Level',
    'Productivity',
    'Cognitive Load',
    'Arousal',
    'Valence',
  ];

  const rows = metrics.map(metric => [
    metric.id,
    metric.sessionId,
    new Date(metric.timestamp).toISOString(),
    metric.flowScore.toString(),
    metric.focusLevel.toString(),
    metric.productivity.toString(),
    metric.cognitiveLoad.toString(),
    metric.arousal.toString(),
    metric.valence.toString(),
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
}

/**
 * Convert events to CSV format
 */
export function eventsToCSV(events: SessionEvent[]): string {
  if (events.length === 0) {
    return 'No events to export';
  }

  const headers = [
    'Event ID',
    'Session ID',
    'Type',
    'Timestamp',
    'Data',
  ];

  const rows = events.map(event => [
    event.id,
    event.sessionId,
    event.type,
    new Date(event.timestamp).toISOString(),
    JSON.stringify(event.data).replace(/,/g, ';'),
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
}

/**
 * Export sessions to JSON format
 */
export function sessionsToJSON(sessions: Session[]): string {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    sessionCount: sessions.length,
    sessions: sessions.map(session => ({
      ...session,
      startTime: new Date(session.startTime).toISOString(),
      endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
    })),
  }, null, 2);
}

/**
 * Export comprehensive data package
 */
export function exportComprehensiveJSON(data: {
  sessions: Session[];
  metrics?: FlowMetric[];
  events?: SessionEvent[];
  calibrations?: CalibrationData[];
}): string {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    version: '1.0',
    sessionCount: data.sessions.length,
    metricsCount: data.metrics?.length || 0,
    eventsCount: data.events?.length || 0,
    calibrationsCount: data.calibrations?.length || 0,
    sessions: data.sessions,
    metrics: data.metrics || [],
    events: data.events || [],
    calibrations: data.calibrations || [],
  }, null, 2);
}

/**
 * Download data as file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export sessions with options
 */
export async function exportSessions(
  sessions: Session[],
  options: ExportOptions,
  additionalData?: {
    metrics?: FlowMetric[];
    events?: SessionEvent[];
    calibrations?: CalibrationData[];
  }
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];

  if (options.format === 'csv') {
    // Export sessions CSV
    const sessionsCSV = sessionsToCSV(sessions);
    downloadFile(sessionsCSV, `flow-sessions-${timestamp}.csv`, 'text/csv');

    // Optionally export metrics CSV
    if (options.includeMetrics && additionalData?.metrics) {
      const metricsCSV = metricsToCSV(additionalData.metrics);
      downloadFile(metricsCSV, `flow-metrics-${timestamp}.csv`, 'text/csv');
    }

    // Optionally export events CSV
    if (options.includeEvents && additionalData?.events) {
      const eventsCSV = eventsToCSV(additionalData.events);
      downloadFile(eventsCSV, `flow-events-${timestamp}.csv`, 'text/csv');
    }
  } else {
    // Export JSON
    if (options.includeMetrics || options.includeEvents || options.includeCalibrations) {
      const comprehensiveJSON = exportComprehensiveJSON({
        sessions,
        metrics: additionalData?.metrics,
        events: additionalData?.events,
        calibrations: additionalData?.calibrations,
      });
      downloadFile(comprehensiveJSON, `flow-data-${timestamp}.json`, 'application/json');
    } else {
      const sessionsJSON = sessionsToJSON(sessions);
      downloadFile(sessionsJSON, `flow-sessions-${timestamp}.json`, 'application/json');
    }
  }
}

/**
 * Calculate statistics from sessions
 */
export function calculateStats(sessions: Session[]): {
  totalSessions: number;
  totalDuration: number;
  avgFlowScore: number;
  peakFlowScore: number;
  totalInterruptions: number;
  avgSessionDuration: number;
} {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalDuration: 0,
      avgFlowScore: 0,
      peakFlowScore: 0,
      totalInterruptions: 0,
      avgSessionDuration: 0,
    };
  }

  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalFlowScore = sessions.reduce((sum, s) => sum + (s.meanFlowScore || s.flowScore || 0), 0);
  const peakFlowScore = Math.max(...sessions.map(s => s.peakFlowScore || s.flowScore || 0));
  const totalInterruptions = sessions.reduce((sum, s) => sum + (s.totalInterruptions || 0), 0);

  return {
    totalSessions: sessions.length,
    totalDuration,
    avgFlowScore: totalFlowScore / sessions.length,
    peakFlowScore,
    totalInterruptions,
    avgSessionDuration: totalDuration / sessions.length,
  };
}

/**
 * Group sessions by date
 */
export function groupSessionsByDate(sessions: Session[]): Map<string, Session[]> {
  const grouped = new Map<string, Session[]>();

  sessions.forEach(session => {
    const date = new Date(session.startTime).toISOString().split('T')[0];
    const existing = grouped.get(date) || [];
    grouped.set(date, [...existing, session]);
  });

  return grouped;
}

/**
 * Filter sessions by date range
 */
export function filterSessionsByDateRange(
  sessions: Session[],
  startDate: Date,
  endDate: Date
): Session[] {
  const start = startDate.getTime();
  const end = endDate.getTime();

  return sessions.filter(session => {
    const sessionTime = session.startTime;
    return sessionTime >= start && sessionTime <= end;
  });
}

/**
 * Get sessions for current week
 */
export function getThisWeekSessions(sessions: Session[]): Session[] {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  return filterSessionsByDateRange(sessions, weekStart, now);
}

/**
 * Get sessions for last week
 */
export function getLastWeekSessions(sessions: Session[]): Session[] {
  const now = new Date();
  const lastWeekEnd = new Date(now);
  lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
  lastWeekStart.setHours(0, 0, 0, 0);

  return filterSessionsByDateRange(sessions, lastWeekStart, lastWeekEnd);
}
