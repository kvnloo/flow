'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Download,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileJson,
  FileText,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
} from 'lucide-react';
import SessionChart from '@/components/analytics/SessionChart';
import FlowMetrics from '@/components/analytics/FlowMetrics';
import { sessionDB, Session, SessionQuery } from '@/lib/storage/sessionDB';
import {
  exportSessions,
  calculateStats,
  getThisWeekSessions,
  getLastWeekSessions,
  filterSessionsByDateRange,
} from '@/lib/utils/exportFormats';

const ITEMS_PER_PAGE = 10;

interface FilterState {
  startDate: string;
  endDate: string;
  minDuration: number;
  maxDuration: number;
  minFlowScore: number;
  maxFlowScore: number;
}

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [userId] = useState('default-user'); // TODO: Get from auth context

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    minDuration: 0,
    maxDuration: 1000,
    minFlowScore: 0,
    maxFlowScore: 100,
  });

  // Load sessions from IndexedDB
  useEffect(() => {
    loadSessions();
  }, [userId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const query: SessionQuery = {
        userId,
        minFlowScore: filters.minFlowScore,
        maxFlowScore: filters.maxFlowScore,
      };

      if (filters.startDate) {
        query.startDate = new Date(filters.startDate).getTime();
      }
      if (filters.endDate) {
        query.endDate = new Date(filters.endDate).getTime();
      }

      const allSessions = await sessionDB.querySessions(query);

      // Apply duration filter client-side
      const filtered = allSessions.filter(s => {
        const duration = s.duration || 0;
        return duration >= filters.minDuration && duration <= filters.maxDuration;
      });

      // Sort by start time descending (most recent first)
      filtered.sort((a, b) => b.startTime - a.startTime);

      setSessions(filtered);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load session data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    loadSessions();
  }, [filters]);

  // Calculate statistics
  const stats = useMemo(() => calculateStats(sessions), [sessions]);
  const thisWeekStats = useMemo(() => calculateStats(getThisWeekSessions(sessions)), [sessions]);
  const lastWeekStats = useMemo(() => calculateStats(getLastWeekSessions(sessions)), [sessions]);

  // Pagination
  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = sessions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Chart data preparation
  const chartData = useMemo(() => {
    return sessions.slice(0, 50).map(session => ({
      timestamp: session.startTime,
      flowScore: session.meanFlowScore || session.flowScore || 0,
      attention: (session.flowScore || 0) * 0.9, // Mock data
      relaxation: (session.flowScore || 0) * 0.7, // Mock data
      cognitiveLoad: (session.flowScore || 0) * 0.8, // Mock data
    }));
  }, [sessions]);

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      await exportSessions(sessions, {
        format,
        includeMetrics: true,
        includeEvents: true,
      });
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export data');
    }
  };

  // Handle delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (deleteConfirm !== sessionId) {
      setDeleteConfirm(sessionId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await sessionDB.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete session');
    }
  };

  // Format duration
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate week comparison
  const weekComparison = useMemo(() => {
    if (lastWeekStats.totalSessions === 0) {
      return {
        sessionsDelta: 0,
        flowScoreDelta: 0,
        durationDelta: 0,
      };
    }

    return {
      sessionsDelta: ((thisWeekStats.totalSessions - lastWeekStats.totalSessions) / lastWeekStats.totalSessions) * 100,
      flowScoreDelta: ((thisWeekStats.avgFlowScore - lastWeekStats.avgFlowScore) / lastWeekStats.avgFlowScore) * 100,
      durationDelta: ((thisWeekStats.totalDuration - lastWeekStats.totalDuration) / lastWeekStats.totalDuration) * 100,
    };
  }, [thisWeekStats, lastWeekStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your flow state progress and session history
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Overall Metrics */}
        <div className="mb-8">
          <FlowMetrics
            currentSession={{
              duration: stats.avgSessionDuration,
              avgFlowScore: stats.avgFlowScore,
              peakFlowScore: stats.peakFlowScore,
              sessionCount: stats.totalSessions,
            }}
            historicalData={{
              previousAvgScore: lastWeekStats.avgFlowScore,
              personalBest: stats.peakFlowScore,
              totalSessions: stats.totalSessions,
              progressToNextLevel: (stats.totalSessions % 10) * 10,
              nextLevelThreshold: Math.ceil(stats.totalSessions / 10) * 10,
            }}
            streak={0} // TODO: Calculate actual streak
          />
        </div>

        {/* Week Comparison */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Week-over-Week Comparison
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sessions</p>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {thisWeekStats.totalSessions}
                </p>
                <div className={`flex items-center text-sm font-medium ${
                  weekComparison.sessionsDelta >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp size={16} className={weekComparison.sessionsDelta < 0 ? 'rotate-180' : ''} />
                  <span>{Math.abs(weekComparison.sessionsDelta).toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                vs last week: {lastWeekStats.totalSessions}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="text-purple-600 dark:text-purple-400" size={20} />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Flow Score</p>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {thisWeekStats.avgFlowScore.toFixed(1)}
                </p>
                <div className={`flex items-center text-sm font-medium ${
                  weekComparison.flowScoreDelta >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp size={16} className={weekComparison.flowScoreDelta < 0 ? 'rotate-180' : ''} />
                  <span>{Math.abs(weekComparison.flowScoreDelta).toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                vs last week: {lastWeekStats.avgFlowScore.toFixed(1)}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-green-600 dark:text-green-400" size={20} />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Time</p>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatDuration(thisWeekStats.totalDuration)}
                </p>
                <div className={`flex items-center text-sm font-medium ${
                  weekComparison.durationDelta >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp size={16} className={weekComparison.durationDelta < 0 ? 'rotate-180' : ''} />
                  <span>{Math.abs(weekComparison.durationDelta).toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                vs last week: {formatDuration(lastWeekStats.totalDuration)}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-8">
          <SessionChart
            data={chartData}
            title="Flow Score History (Last 50 Sessions)"
            height={400}
          />
        </div>

        {/* Filters and Export */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Session History
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Filter size={16} />
                <span className="text-sm font-medium">Filters</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <FileText size={16} />
                <span className="text-sm font-medium">CSV</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <FileJson size={16} />
                <span className="text-sm font-medium">JSON</span>
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Duration (min)
                  </label>
                  <input
                    type="number"
                    value={filters.minDuration}
                    onChange={e => setFilters(prev => ({ ...prev, minDuration: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Flow Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.minFlowScore}
                    onChange={e => setFilters(prev => ({ ...prev, minFlowScore: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Flow Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.maxFlowScore}
                    onChange={e => setFilters(prev => ({ ...prev, maxFlowScore: parseInt(e.target.value) || 100 }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({
                      startDate: '',
                      endDate: '',
                      minDuration: 0,
                      maxDuration: 1000,
                      minFlowScore: 0,
                      maxFlowScore: 100,
                    })}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Session List */}
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No sessions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Avg Flow Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Peak Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Interruptions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tags
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedSessions.map(session => (
                      <tr
                        key={session.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(session.startTime)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {formatDuration(session.duration || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (session.meanFlowScore || session.flowScore || 0) >= 70
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : (session.meanFlowScore || session.flowScore || 0) >= 40
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                          }`}>
                            {(session.meanFlowScore || session.flowScore || 0).toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {(session.peakFlowScore || session.flowScore || 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {session.totalInterruptions || 0}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {session.tags?.map((tag, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              deleteConfirm === session.id
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400'
                            }`}
                            title={deleteConfirm === session.id ? 'Click again to confirm' : 'Delete session'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sessions.length)} of {sessions.length} sessions
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
