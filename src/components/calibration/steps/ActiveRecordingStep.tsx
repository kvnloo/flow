'use client';

import { useState, useEffect, useRef } from 'react';
import { useEEGStream } from '@/hooks/useEEGStream';
import { MuseConnector } from '@/lib/eeg/museConnector';
import { EEGVisualization } from '../EEGVisualization';
import { RecordingTimer } from '../RecordingTimer';

interface ActiveRecordingStepProps {
  museConnection: {
    deviceInfo: any;
  };
  onComplete: (data: any) => void;
}

const ACTIVE_DURATION = 120; // 2 minutes in seconds

export function ActiveRecordingStep({
  museConnection,
  onComplete,
}: ActiveRecordingStepProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(ACTIVE_DURATION);
  const [recordedSamples, setRecordedSamples] = useState<any[]>([]);

  const connectorRef = useRef<MuseConnector | null>(null);
  const eegStream = useEEGStream(connectorRef.current);

  useEffect(() => {
    connectorRef.current = new MuseConnector();
  }, []);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordedSamples([]);
    setTimeRemaining(ACTIVE_DURATION);
  };

  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsRecording(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && eegStream.processedData) {
      setRecordedSamples(prev => [...prev, eegStream.processedData]);
    }
  }, [isRecording, eegStream.processedData]);

  useEffect(() => {
    if (!isRecording && timeRemaining === 0 && recordedSamples.length > 0) {
      const activeMetrics = calculateActiveMetrics(recordedSamples);
      onComplete(activeMetrics);
    }
  }, [isRecording, timeRemaining, recordedSamples, onComplete]);

  const calculateActiveMetrics = (samples: any[]) => {
    if (samples.length === 0) {
      return {
        averageFocus: 0.7,
        averageEnergy: 0.7,
        averageStress: 0.3,
        peakFocus: 0.9,
        sampleCount: 0,
      };
    }

    const sum = samples.reduce(
      (acc, sample) => ({
        focus: acc.focus + (sample.metrics?.focus || 0),
        energy: acc.energy + (sample.metrics?.engagement || 0),
        stress: acc.stress + (sample.metrics?.workload || 0),
      }),
      { focus: 0, energy: 0, stress: 0 }
    );

    const peakFocus = Math.max(...samples.map(s => s.metrics?.focus || 0));

    return {
      averageFocus: sum.focus / samples.length,
      averageEnergy: sum.energy / samples.length,
      averageStress: sum.stress / samples.length,
      peakFocus,
      sampleCount: samples.length,
    };
  };

  const progress = ((ACTIVE_DURATION - timeRemaining) / ACTIVE_DURATION) * 100;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Step 3: Active Recording</h2>
        <p className="text-gray-400">
          Focus on a challenging task for 2 minutes
        </p>
      </div>

      {/* Recording Status */}
      <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
        <RecordingTimer
          isRecording={isRecording}
          timeRemaining={timeRemaining}
          totalDuration={ACTIVE_DURATION}
          progress={progress}
        />

        {/* EEG Visualization */}
        {isRecording && (
          <div className="mt-6">
            <EEGVisualization
              processedData={eegStream.processedData}
              stats={eegStream.stats}
            />
          </div>
        )}

        {/* Start Recording Button */}
        {!isRecording && timeRemaining === ACTIVE_DURATION && (
          <button
            onClick={handleStartRecording}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors mt-4"
          >
            Start Active Recording
          </button>
        )}

        {/* Recording Complete */}
        {!isRecording && timeRemaining === 0 && (
          <div className="text-center py-4">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-green-400 font-medium">Active recording complete!</p>
            <p className="text-sm text-gray-500 mt-2">
              Recorded {recordedSamples.length} samples
            </p>
          </div>
        )}
      </div>

      {/* Task Suggestions */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2 text-blue-400">Suggested Tasks</h3>
        <p className="text-sm text-gray-300 mb-2">
          Choose a mentally engaging activity:
        </p>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>Solve math problems or logic puzzles</li>
          <li>Write code or debug a program</li>
          <li>Read and analyze a complex text</li>
          <li>Plan a detailed project or strategy</li>
          <li>Work on a creative design or composition</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          The key is to maintain focused attention throughout the recording.
        </p>
      </div>
    </div>
  );
}
