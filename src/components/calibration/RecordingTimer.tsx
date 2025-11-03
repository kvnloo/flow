interface RecordingTimerProps {
  isRecording: boolean;
  timeRemaining: number;
  totalDuration: number;
  progress: number;
}

export function RecordingTimer({
  isRecording,
  timeRemaining,
  totalDuration,
  progress,
}: RecordingTimerProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-center space-y-4">
      {/* Timer Display */}
      <div className="relative">
        <div className="text-6xl font-bold tabular-nums">
          {formatTime(timeRemaining)}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {isRecording ? 'Recording in progress...' : 'Ready to record'}
        </div>
      </div>

      {/* Progress Circle */}
      {isRecording && (
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-800"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                className="text-blue-500 transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-bold">{Math.round(progress)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">Recording</span>
        </div>
      )}
    </div>
  );
}
