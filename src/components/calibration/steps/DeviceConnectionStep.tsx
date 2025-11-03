'use client';

import { useState, useEffect } from 'react';
import { ConnectionState } from '@/hooks/useMuseConnection';
import { SignalQualityIndicator } from '../SignalQualityIndicator';

interface DeviceConnectionStepProps {
  museConnection: {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    deviceInfo: any;
    connectionState: ConnectionState;
    error: Error | null;
  };
  onComplete: () => void;
  onSkip: () => void;
}

export function DeviceConnectionStep({
  museConnection,
  onComplete,
  onSkip,
}: DeviceConnectionStepProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { connect, connectionState, deviceInfo, error } = museConnection;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch (err) {
      console.error('Connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (connectionState === 'streaming') {
      // Wait a moment to show signal quality, then proceed
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionState, onComplete]);

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
      case 'streaming':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected - Starting stream...';
      case 'streaming':
        return 'Streaming - Signal quality good';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection failed';
      default:
        return 'Ready to connect';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Step 1: Connect Your Device</h2>
        <p className="text-gray-400">
          Connect your Muse headband to begin calibration
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              connectionState === 'streaming' ? 'bg-green-500 animate-pulse' :
              connectionState === 'connected' ? 'bg-yellow-500 animate-pulse' :
              connectionState === 'connecting' ? 'bg-blue-500 animate-pulse' :
              connectionState === 'error' ? 'bg-red-500' :
              'bg-gray-600'
            }`} />
            <span className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          {deviceInfo && (
            <span className="text-sm text-gray-500">
              {deviceInfo.name}
            </span>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error.message}</p>
          </div>
        )}

        {/* Device Info */}
        {deviceInfo && connectionState === 'streaming' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Device:</span>
                <span className="ml-2 text-white">{deviceInfo.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Model:</span>
                <span className="ml-2 text-white">{deviceInfo.model || 'Muse S'}</span>
              </div>
            </div>

            {/* Signal Quality Indicators */}
            <div className="pt-4 border-t border-gray-800">
              <h3 className="text-sm font-medium mb-3">Signal Quality</h3>
              <SignalQualityIndicator deviceInfo={deviceInfo} />
            </div>
          </div>
        )}

        {/* Connect Button */}
        {connectionState === 'disconnected' && (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Connect Muse Headband'}
          </button>
        )}

        {connectionState === 'error' && (
          <button
            onClick={handleConnect}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Retry Connection
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2 text-blue-400">Connection Tips</h3>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>Make sure your Muse headband is powered on</li>
          <li>Ensure Bluetooth is enabled on your device</li>
          <li>Place the headband on your head for best signal quality</li>
          <li>Wet the electrodes slightly for better contact</li>
        </ul>
      </div>
    </div>
  );
}
