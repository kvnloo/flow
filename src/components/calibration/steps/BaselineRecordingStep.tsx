'use client';

import { useState, useEffect, useRef } from 'react';
import { useEEGStream } from '@/hooks/useEEGStream';
import { MuseConnector } from '@/lib/eeg/museConnector';
import { EEGVisualization } from '../EEGVisualization';
import { RecordingTimer } from '../RecordingTimer';

interface BaselineRecordingStepProps {
  museConnection: {
    deviceInfo: any;
  };
  onComplete: (data: any) => void;
}

const BASELINE_DURATION = 120; // 2 minutes in seconds

export function BaselineRecordingStep({
  museConnection,
  onComplete,
}: BaselineRecordingStepProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(BASELINE_DURATION);
  const [recordedSamples, setRecordedSamples] = useState<any[]>([]);

  const connectorRef = useRef<MuseConnector | null>(null);
  const eegStream = useEEGStream(connectorRef.current);

  useEffect(() => {
    // Initialize connector from existing connection
    // In a real implementation, this would reuse the connected device
    connectorRef.current = new MuseConnector();
  }, []);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordedSamples([]);
    setTimeRemaining(BASELINE_DURATION);
  };

  useEffect(() => {
    if (!isRecording) return;

    // Countdown timer
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
      // Calculate baseline metrics from recorded samples
      const baselineMetrics = calculateBaselineMetrics(recordedSamples);
      onComplete(baselineMetrics);
    }
  }, [isRecording, timeRemaining, recordedSamples, onComplete]);

  const calculateBaselineMetrics = (samples: any[]) => {
    if (samples.length === 0) {
      return {
        averageFocus: 0.5,
        averageEnergy: 0.5,
        averageStress: 0.5,
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

    return {
      averageFocus: sum.focus / samples.length,
      averageEnergy: sum.energy / samples.length,
      averageStress: sum.stress / samples.length,
      sampleCount: samples.length,
    };
  };

  const progress = ((BASELINE_DURATION - timeRemaining) / BASELINE_DURATION) * 100;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Step 2: Baseline Recording</h2>
        <p className="text-gray-400">
          Relax with your eyes closed for 2 minutes
        </p>
      </div>

      {/* Recording Status */}
      <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
        <RecordingTimer
          isRecording={isRecording}
          timeRemaining={timeRemaining}
          totalDuration={BASELINE_DURATION}
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
        {!isRecording && timeRemaining === BASELINE_DURATION && (
          <button
            onClick={handleStartRecording}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors mt-4"
          >
            Start Baseline Recording
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
            <p className="text-green-400 font-medium">Baseline recording complete!</p>
            <p className="text-sm text-gray-500 mt-2">
              Recorded {recordedSamples.length} samples
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2 text-blue-400">Instructions</h3>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>Find a quiet, comfortable place to sit</li>
          <li>Close your eyes and relax</li>
          <li>Breathe naturally and let your mind rest</li>
          <li>Try not to think about anything in particular</li>
          <li>Stay still for the full 2 minutes</li>
        </ul>
      </div>
    </div>
  );
}
