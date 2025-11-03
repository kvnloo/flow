'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectionState } from '@/hooks/useMuseConnection';
import { DeviceConnectionStep } from './steps/DeviceConnectionStep';
import { BaselineRecordingStep } from './steps/BaselineRecordingStep';
import { ActiveRecordingStep } from './steps/ActiveRecordingStep';
import { ProgressBar } from './ProgressBar';

interface CalibrationWizardProps {
  museConnection: {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    deviceInfo: any;
    connectionState: ConnectionState;
    error: Error | null;
  };
  onComplete: (data: {
    baselineData: any;
    activeData: any;
    thresholds: any;
  }) => void;
  onSkip: () => void;
}

type CalibrationStep = 'connection' | 'baseline' | 'active' | 'complete';

export function CalibrationWizard({
  museConnection,
  onComplete,
  onSkip,
}: CalibrationWizardProps) {
  const [currentStep, setCurrentStep] = useState<CalibrationStep>('connection');
  const [baselineData, setBaselineData] = useState<any>(null);
  const [activeData, setActiveData] = useState<any>(null);

  const steps: CalibrationStep[] = ['connection', 'baseline', 'active', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleConnectionComplete = useCallback(() => {
    setCurrentStep('baseline');
  }, []);

  const handleBaselineComplete = useCallback((data: any) => {
    setBaselineData(data);
    setCurrentStep('active');
  }, []);

  const handleActiveComplete = useCallback((data: any) => {
    setActiveData(data);
    setCurrentStep('complete');
  }, []);

  useEffect(() => {
    if (currentStep === 'complete' && baselineData && activeData) {
      // Calculate thresholds from baseline and active data
      const thresholds = calculateThresholds(baselineData, activeData);

      // Trigger completion callback
      setTimeout(() => {
        onComplete({
          baselineData,
          activeData,
          thresholds,
        });
      }, 2000); // Show completion message briefly
    }
  }, [currentStep, baselineData, activeData, onComplete]);

  const calculateThresholds = (baseline: any, active: any) => {
    // Calculate personalized thresholds based on calibration data
    // This is a simplified version - actual implementation should use statistical analysis
    return {
      focus: {
        baseline: baseline.averageFocus || 0.5,
        threshold: (baseline.averageFocus || 0.5) * 1.2,
      },
      energy: {
        baseline: baseline.averageEnergy || 0.5,
        threshold: (baseline.averageEnergy || 0.5) * 1.1,
      },
      stress: {
        baseline: baseline.averageStress || 0.5,
        threshold: (baseline.averageStress || 0.5) * 0.8,
      },
    };
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <ProgressBar progress={progress} currentStep={currentStepIndex + 1} totalSteps={steps.length} />

      {/* Step Content */}
      <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
        {currentStep === 'connection' && (
          <DeviceConnectionStep
            museConnection={museConnection}
            onComplete={handleConnectionComplete}
            onSkip={onSkip}
          />
        )}

        {currentStep === 'baseline' && (
          <BaselineRecordingStep
            museConnection={museConnection}
            onComplete={handleBaselineComplete}
          />
        )}

        {currentStep === 'active' && (
          <ActiveRecordingStep
            museConnection={museConnection}
            onComplete={handleActiveComplete}
          />
        )}

        {currentStep === 'complete' && (
          <div className="text-center py-12">
            <div className="mb-6">
              <svg
                className="w-24 h-24 mx-auto text-green-500"
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
            <h2 className="text-3xl font-bold mb-2">Calibration Complete!</h2>
            <p className="text-gray-400">
              Your personalized flow detection thresholds have been saved.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Redirecting to session...
            </p>
          </div>
        )}
      </div>

      {/* Skip Calibration Button (only on connection step) */}
      {currentStep === 'connection' && (
        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Skip calibration and use default settings →
          </button>
        </div>
      )}
    </div>
  );
}
