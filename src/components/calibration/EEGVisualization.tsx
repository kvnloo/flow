'use client';

import { useMemo } from 'react';

interface EEGVisualizationProps {
  processedData: any;
  stats: {
    samplesPerSecond: number;
    latencyMs: number;
    droppedSamples: number;
    bufferSize: number;
  };
}

const CHANNELS = ['TP9', 'AF7', 'AF8', 'TP10'] as const;

export function EEGVisualization({ processedData, stats }: EEGVisualizationProps) {
  const channelData = useMemo(() => {
    if (!processedData?.bands) {
      return CHANNELS.map(channel => ({
        channel,
        alpha: 0.5,
        beta: 0.5,
        theta: 0.5,
        gamma: 0.3,
      }));
    }

    return CHANNELS.map(channel => {
      const bands = processedData.bands[channel];
      if (!bands) {
        return {
          channel,
          alpha: 0.5,
          beta: 0.5,
          theta: 0.5,
          gamma: 0.3,
        };
      }

      // Normalize band powers to 0-1 range for visualization
      const total = bands.alpha + bands.beta + bands.theta + bands.gamma + bands.delta;
      return {
        channel,
        alpha: total > 0 ? bands.alpha / total : 0,
        beta: total > 0 ? bands.beta / total : 0,
        theta: total > 0 ? bands.theta / total : 0,
        gamma: total > 0 ? bands.gamma / total : 0,
      };
    });
  }, [processedData]);

  const getBandColor = (band: string): string => {
    switch (band) {
      case 'alpha':
        return 'bg-blue-500';
      case 'beta':
        return 'bg-green-500';
      case 'theta':
        return 'bg-purple-500';
      case 'gamma':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Band Power Visualization */}
      <div>
        <h3 className="text-sm font-medium mb-3">Frequency Band Activity</h3>
        <div className="space-y-4">
          {channelData.map(data => (
            <div key={data.channel} className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-medium">{data.channel}</span>
                <span>Signal detected</span>
              </div>
              <div className="flex gap-1 h-8">
                {/* Alpha */}
                <div
                  className={`${getBandColor('alpha')} rounded transition-all duration-300`}
                  style={{ width: `${data.alpha * 100}%`, minWidth: '2%' }}
                  title={`Alpha: ${(data.alpha * 100).toFixed(1)}%`}
                />
                {/* Beta */}
                <div
                  className={`${getBandColor('beta')} rounded transition-all duration-300`}
                  style={{ width: `${data.beta * 100}%`, minWidth: '2%' }}
                  title={`Beta: ${(data.beta * 100).toFixed(1)}%`}
                />
                {/* Theta */}
                <div
                  className={`${getBandColor('theta')} rounded transition-all duration-300`}
                  style={{ width: `${data.theta * 100}%`, minWidth: '2%' }}
                  title={`Theta: ${(data.theta * 100).toFixed(1)}%`}
                />
                {/* Gamma */}
                <div
                  className={`${getBandColor('gamma')} rounded transition-all duration-300`}
                  style={{ width: `${data.gamma * 100}%`, minWidth: '2%' }}
                  title={`Gamma: ${(data.gamma * 100).toFixed(1)}%`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-gray-400">Alpha (8-13 Hz)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-gray-400">Beta (13-30 Hz)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded" />
            <span className="text-gray-400">Theta (4-8 Hz)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span className="text-gray-400">Gamma (30-100 Hz)</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="pt-4 border-t border-gray-800">
        <h3 className="text-sm font-medium mb-3">Stream Statistics</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Sample Rate:</span>
            <span className="ml-2 text-white">{stats.samplesPerSecond} Hz</span>
          </div>
          <div>
            <span className="text-gray-500">Latency:</span>
            <span className="ml-2 text-white">{stats.latencyMs} ms</span>
          </div>
          <div>
            <span className="text-gray-500">Buffer Size:</span>
            <span className="ml-2 text-white">{stats.bufferSize}</span>
          </div>
          <div>
            <span className="text-gray-500">Dropped:</span>
            <span className="ml-2 text-white">{stats.droppedSamples}</span>
          </div>
        </div>

        {/* Quality Indicator */}
        {processedData?.quality !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Signal Quality</span>
              <span className="text-white">{(processedData.quality * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  processedData.quality > 0.8
                    ? 'bg-green-500'
                    : processedData.quality > 0.5
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${processedData.quality * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
