import React from 'react';
import { Activity, Brain, Zap, Heart } from 'lucide-react';

interface FlowMeterProps {
  flowScore: number; // 0-1
  cognitiveLoad: number; // 0-1
  attention: number; // 0-1
  relaxation: number; // 0-1
  confidence?: number; // 0-1
}

export const FlowMeter: React.FC<FlowMeterProps> = ({
  flowScore,
  cognitiveLoad,
  attention,
  relaxation,
  confidence = 1,
}) => {
  // Convert 0-1 to percentage
  const toPercent = (value: number) => Math.round(value * 100);

  // Get color based on value (0-1 scale)
  const getColor = (value: number): string => {
    if (value < 0.3) return 'from-red-500 to-red-600';
    if (value < 0.6) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  // Get flow state label
  const getFlowLabel = (score: number): string => {
    if (score < 0.3) return 'Low Flow';
    if (score < 0.5) return 'Emerging Flow';
    if (score < 0.7) return 'Moderate Flow';
    if (score < 0.85) return 'High Flow';
    return 'Deep Flow';
  };

  // Metric card component
  const MetricCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: React.ElementType;
    label: string;
    value: number;
    color: string;
  }) => (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <span className="text-lg font-bold text-white">{toPercent(value)}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-300 ease-out`}
          style={{ width: `${toPercent(value)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Primary Flow Score */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm
                      border-2 border-cyan-500/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Flow State</h3>
              <p className="text-sm text-gray-400">{getFlowLabel(flowScore)}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              {toPercent(flowScore)}
            </div>
            <div className="text-xs text-gray-500">Flow Score</div>
          </div>
        </div>

        {/* Large flow progress bar */}
        <div className="relative w-full h-4 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getColor(flowScore)} transition-all duration-500 ease-out
                       shadow-lg shadow-cyan-500/50`}
            style={{ width: `${toPercent(flowScore)}%` }}
          />

          {/* Threshold markers */}
          <div className="absolute inset-0 flex justify-between px-1">
            {[0.3, 0.6, 0.85].map((threshold) => (
              <div
                key={threshold}
                className="w-px h-full bg-gray-900/50"
                style={{ marginLeft: `${threshold * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Confidence indicator */}
        {confidence < 0.8 && (
          <div className="flex items-center space-x-2 text-xs text-yellow-500">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span>Signal quality: {toPercent(confidence)}% - Calibrating...</span>
          </div>
        )}
      </div>

      {/* Component Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          icon={Brain}
          label="Cognitive Load"
          value={cognitiveLoad}
          color={getColor(cognitiveLoad)}
        />
        <MetricCard
          icon={Zap}
          label="Attention"
          value={attention}
          color={getColor(attention)}
        />
        <MetricCard
          icon={Heart}
          label="Relaxation"
          value={relaxation}
          color={getColor(relaxation)}
        />
        <MetricCard
          icon={Activity}
          label="Signal Quality"
          value={confidence}
          color={getColor(confidence)}
        />
      </div>

      {/* Flow Tips */}
      {flowScore < 0.5 && (
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Flow Enhancement Tips:</h4>
          <ul className="text-xs text-gray-300 space-y-1">
            {attention < 0.4 && (
              <li>• Try focusing on a single challenging task</li>
            )}
            {relaxation < 0.4 && (
              <li>• Take a few deep breaths to relax</li>
            )}
            {cognitiveLoad < 0.3 && (
              <li>• Task may be too easy - increase difficulty</li>
            )}
            {cognitiveLoad > 0.8 && (
              <li>• Task may be too hard - reduce complexity</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FlowMeter;
