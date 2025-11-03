import React, { useEffect, useState, useCallback } from 'react';
import { Play, Pause, Square, Activity } from 'lucide-react';

export interface SessionControlsProps {
  isConnected: boolean;
  isCalibrated: boolean;
  sessionState: 'idle' | 'running' | 'paused';
  sessionDuration: number; // in seconds
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onCalibrate: () => void;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  isConnected,
  isCalibrated,
  sessionState,
  sessionDuration,
  onStart,
  onPause,
  onStop,
  onCalibrate,
}) => {
  const [formattedTime, setFormattedTime] = useState('00:00');

  // Format duration as MM:SS
  useEffect(() => {
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;
    setFormattedTime(
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    );
  }, [sessionDuration]);

  // Keyboard shortcuts
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      // Only handle shortcuts when connected
      if (!isConnected) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (sessionState === 'running') {
            onPause();
          } else if (sessionState === 'paused') {
            onStart();
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (sessionState !== 'idle') {
            onStop();
          }
          break;
      }
    },
    [isConnected, sessionState, onPause, onStart, onStop]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
      <div
        className={`w-2 h-2 rounded-full transition-colors ${
          isConnected
            ? 'bg-green-500 animate-pulse'
            : 'bg-red-500'
        }`}
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );

  // Session timer display
  const SessionTimer = () => (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      <span className="text-xl font-mono font-bold text-blue-900 dark:text-blue-100">
        {formattedTime}
      </span>
    </div>
  );

  // Control buttons
  const ControlButtons = () => {
    const baseButtonClass =
      'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    if (!isCalibrated) {
      return (
        <button
          onClick={onCalibrate}
          disabled={!isConnected}
          className={`${baseButtonClass} bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500 shadow-lg hover:shadow-xl`}
        >
          <Activity className="w-5 h-5" />
          <span>Calibrate</span>
        </button>
      );
    }

    return (
      <div className="flex items-center gap-3">
        {sessionState === 'idle' && (
          <button
            onClick={onStart}
            disabled={!isConnected}
            className={`${baseButtonClass} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 shadow-lg hover:shadow-xl`}
          >
            <Play className="w-5 h-5" />
            <span>Start Session</span>
          </button>
        )}

        {sessionState === 'running' && (
          <>
            <button
              onClick={onPause}
              className={`${baseButtonClass} bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500 shadow-lg hover:shadow-xl`}
            >
              <Pause className="w-5 h-5" />
              <span>Pause</span>
            </button>
            <button
              onClick={onStop}
              className={`${baseButtonClass} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-lg hover:shadow-xl`}
            >
              <Square className="w-5 h-5" />
              <span>Stop</span>
            </button>
          </>
        )}

        {sessionState === 'paused' && (
          <>
            <button
              onClick={onStart}
              className={`${baseButtonClass} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 shadow-lg hover:shadow-xl`}
            >
              <Play className="w-5 h-5" />
              <span>Resume</span>
            </button>
            <button
              onClick={onStop}
              className={`${baseButtonClass} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-lg hover:shadow-xl`}
            >
              <Square className="w-5 h-5" />
              <span>Stop</span>
            </button>
          </>
        )}
      </div>
    );
  };

  // Keyboard shortcuts hint
  const KeyboardHints = () => (
    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
      {isConnected && isCalibrated && (
        <>
          <div>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
              Space
            </kbd>{' '}
            Pause/Resume
          </div>
          <div>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
              Esc
            </kbd>{' '}
            Stop
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <ConnectionStatus />
        {sessionState !== 'idle' && <SessionTimer />}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center">
        <ControlButtons />
      </div>

      {/* Keyboard Shortcuts */}
      <div className="flex justify-center">
        <KeyboardHints />
      </div>

      {/* State Indicator */}
      {!isCalibrated && isConnected && (
        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Please calibrate the device before starting a session
          </p>
        </div>
      )}
    </div>
  );
};

export default SessionControls;
