'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMuseConnection } from '@/hooks/useMuseConnection';
import { CalibrationWizard } from '@/components/calibration/CalibrationWizard';
import { sessionDB } from '@/lib/storage/sessionDB';

export default function CalibrationPage() {
  const router = useRouter();
  const [userId] = useState('user-' + Date.now()); // TODO: Replace with actual user auth
  const museConnection = useMuseConnection();

  const handleCalibrationComplete = async (data: {
    baselineData: any;
    activeData: any;
    thresholds: any;
  }) => {
    try {
      // Save calibration data to IndexedDB
      await sessionDB.createCalibration({
        sessionId: 'calibration-' + Date.now(),
        userId,
        timestamp: Date.now(),
        baselineMetrics: {
          focusLevel: data.thresholds.focus.baseline,
          energyLevel: data.thresholds.energy.baseline,
          stressLevel: data.thresholds.stress.baseline,
          environmentalFactors: {
            baselineData: data.baselineData,
            activeData: data.activeData,
          },
        },
        personalFactors: {},
      });

      // Redirect to session page
      router.push('/session');
    } catch (error) {
      console.error('Failed to save calibration:', error);
    }
  };

  const handleSkipCalibration = () => {
    // Use default thresholds
    router.push('/session');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Device Calibration</h1>
            <p className="text-gray-400">
              Calibrate your Muse headband for personalized flow detection
            </p>
          </div>

          {/* Calibration Wizard */}
          <CalibrationWizard
            museConnection={museConnection}
            onComplete={handleCalibrationComplete}
            onSkip={handleSkipCalibration}
          />
        </div>
      </div>
    </div>
  );
}
