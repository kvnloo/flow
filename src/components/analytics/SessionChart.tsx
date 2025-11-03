import React, { useState, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  TooltipProps,
} from 'recharts';
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { toPng } from 'html-to-image';

interface DataPoint {
  timestamp: number;
  flowScore: number;
  attention: number;
  relaxation: number;
  cognitiveLoad: number;
}

interface SessionChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  className?: string;
}

interface SeriesConfig {
  key: keyof DataPoint;
  name: string;
  color: string;
  visible: boolean;
}

const SessionChart: React.FC<SessionChartProps> = ({
  data,
  title = 'Flow Metrics Over Time',
  height = 400,
  className = '',
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ start: number; end: number } | null>(null);
  const [series, setSeries] = useState<SeriesConfig[]>([
    { key: 'flowScore', name: 'Flow Score', color: '#8b5cf6', visible: true },
    { key: 'attention', name: 'Attention', color: '#3b82f6', visible: true },
    { key: 'relaxation', name: 'Relaxation', color: '#10b981', visible: true },
    { key: 'cognitiveLoad', name: 'Cognitive Load', color: '#f59e0b', visible: true },
  ]);

  // Format timestamp for display
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Custom tooltip component
  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({
    active,
    payload,
    label,
  }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {formatTime(label as number)}
        </p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {entry.name}:
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Toggle series visibility
  const toggleSeries = (key: keyof DataPoint): void => {
    setSeries((prev) =>
      prev.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s))
    );
  };

  // Export chart as PNG
  const exportChart = async (): Promise<void> => {
    if (!chartRef.current) return;

    try {
      const dataUrl = await toPng(chartRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `flow-chart-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export chart:', error);
    }
  };

  // Zoom controls
  const handleZoomIn = (): void => {
    if (!data.length) return;
    const dataLength = data.length;
    const start = zoom?.start ?? 0;
    const end = zoom?.end ?? dataLength - 1;
    const range = end - start;
    const newRange = Math.max(Math.floor(range * 0.7), 10);
    const center = Math.floor((start + end) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(dataLength - 1, newStart + newRange);
    setZoom({ start: newStart, end: newEnd });
  };

  const handleZoomOut = (): void => {
    if (!data.length) return;
    const dataLength = data.length;
    if (!zoom) {
      setZoom({ start: 0, end: dataLength - 1 });
      return;
    }
    const range = zoom.end - zoom.start;
    const newRange = Math.min(Math.floor(range * 1.5), dataLength);
    const center = Math.floor((zoom.start + zoom.end) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(dataLength - 1, newStart + newRange);
    setZoom({ start: newStart, end: newEnd });
  };

  const handleResetZoom = (): void => {
    setZoom(null);
  };

  // Prepare chart data based on zoom
  const chartData = zoom
    ? data.slice(zoom.start, zoom.end + 1)
    : data;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={handleZoomIn}
            disabled={!data.length}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={handleZoomOut}
            disabled={!data.length}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={handleResetZoom}
            disabled={!zoom}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
          {/* Export Button */}
          <button
            onClick={exportChart}
            disabled={!data.length}
            className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Export as PNG"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="w-full">
        {data.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-gray-500 dark:text-gray-400">
              No data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                className="text-xs text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                domain={[0, 100]}
                className="text-xs text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                }}
                onClick={(e) => {
                  const dataKey = e.dataKey as keyof DataPoint;
                  toggleSeries(dataKey);
                }}
                iconType="circle"
              />
              {series.map(
                (s) =>
                  s.visible && (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.name}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                      animationDuration={300}
                    />
                  )
              )}
              {!zoom && (
                <Brush
                  dataKey="timestamp"
                  height={30}
                  stroke="#8b5cf6"
                  tickFormatter={formatTime}
                  className="text-xs"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Series Toggle */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Toggle Series Visibility
        </p>
        <div className="flex flex-wrap gap-3">
          {series.map((s) => (
            <button
              key={s.key}
              onClick={() => toggleSeries(s.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                ${
                  s.visible
                    ? 'border-transparent shadow-sm'
                    : 'border-gray-300 dark:border-gray-600 opacity-50'
                }
              `}
              style={{
                backgroundColor: s.visible ? s.color : 'transparent',
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span
                className={`text-sm font-medium ${
                  s.visible ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {s.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Info */}
      {zoom && (
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            Viewing {zoom.end - zoom.start + 1} of {data.length} data points
            (zoomed)
          </p>
        </div>
      )}
    </div>
  );
};

export default SessionChart;
