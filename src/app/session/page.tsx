'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { FlowParticleSystem } from '@/components/visualization/FlowParticleSystem';
import { MandalaGeometry } from '@/components/visualization/MandalaGeometry';
import { SpectralWaterfall } from '@/components/visualization/SpectralWaterfall';
import { FlowMeter } from '@/components/metrics/FlowMeter';
import { SessionControls } from '@/components/controls/SessionControls';
import { SettingsPanel } from '@/components/controls/SettingsPanel';
import { useMuseConnection } from '@/hooks/useMuseConnection';
import { useEEGStream } from '@/hooks/useEEGStream';
import { useFlowState } from '@/hooks/useFlowState';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';

type SessionState = 'idle' | 'running' | 'paused';

interface SessionData {
  startTime: number;
  endTime?: number;
  flowScores: number[];
  cognitiveLoadScores: number[];
  attentionScores: number[];
  relaxationScores: number[];
}

export default function SessionPage() {
  // Session state
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  // Muse connection
  const { connect, disconnect, deviceInfo, connectionState, error: connectionError } = useMuseConnection({
    autoReconnect: true,
    maxReconnectAttempts: 3,
  });

  // EEG data stream
  const museConnectorRef = useRef<any>(null); // Will be set from connection
  const { eegData, processedData, stats, isProcessing, error: streamError } = useEEGStream(
    museConnectorRef.current
  );

  // Flow state detection
  const {
    flowMetrics,
    isCalibrated,
    calibrationProgress,
    startCalibration,
    updateFlowState,
    resetCalibration,
  } = useFlowState();

  // Audio feedback
  const { startAudio, stopAudio, updateFromMetrics, toggleMute, isMuted, isPlaying } = useAudioFeedback();

  // Settings panel
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auto-save interval
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connection status
  const isConnected = connectionState === 'connected' || connectionState === 'streaming';

  // Signal quality indicator
  const getSignalQualityIcon = () => {
    if (!isConnected) return <WifiOff className="w-5 h-5 text-red-500" />;

    const quality = deviceInfo?.signalQuality;
    if (!quality) return <Wifi className="w-5 h-5 text-gray-500" />;

    const avgQuality = (quality.TP9 + quality.AF7 + quality.AF8 + quality.TP10) / 4;

    if (avgQuality < 2) return <SignalLow className="w-5 h-5 text-red-500" />;
    if (avgQuality < 3) return <SignalMedium className="w-5 h-5 text-yellow-500" />;
    return <SignalHigh className="w-5 h-5 text-green-500" />;
  };

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (sessionState === 'running' && sessionData) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionData.startTime) / 1000);
        setSessionDuration(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionState, sessionData]);

  // Process EEG data
  useEffect(() => {
    if (processedData && sessionState === 'running') {
      // Update flow state classifier
      updateFlowState(processedData);
    }
  }, [processedData, sessionState, updateFlowState]);

  // Update audio feedback from metrics
  useEffect(() => {
    if (flowMetrics && sessionState === 'running' && isPlaying) {
      updateFromMetrics({
        flowIntensity: flowMetrics.flowScore,
        arousal: flowMetrics.attention,
        valence: flowMetrics.relaxation,
      });
    }
  }, [flowMetrics, sessionState, isPlaying, updateFromMetrics]);

  // Auto-save session data
  useEffect(() => {
    if (sessionState === 'running' && flowMetrics && sessionData) {
      // Save data every 30 seconds
      if (!autoSaveIntervalRef.current) {
        autoSaveIntervalRef.current = setInterval(() => {
          saveSessionData();
        }, 30000);
      }

      // Add current metrics to session data
      setSessionData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          flowScores: [...prev.flowScores, flowMetrics.flowScore],
          cognitiveLoadScores: [...prev.cognitiveLoadScores, flowMetrics.cognitiveLoad],
          attentionScores: [...prev.attentionScores, flowMetrics.attention],
          relaxationScores: [...prev.relaxationScores, flowMetrics.relaxation],
        };
      });
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [sessionState, flowMetrics, sessionData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isConnected || !isCalibrated) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (sessionState === 'running') {
            handlePause();
          } else if (sessionState === 'paused') {
            handleStart();
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (sessionState !== 'idle') {
            handleStop();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isConnected, isCalibrated, sessionState]);

  // Session control handlers
  const handleStart = useCallback(() => {
    if (!isConnected || !isCalibrated) return;

    if (sessionState === 'idle') {
      // Start new session
      setSessionData({
        startTime: Date.now(),
        flowScores: [],
        cognitiveLoadScores: [],
        attentionScores: [],
        relaxationScores: [],
      });
      setSessionDuration(0);
    }

    setSessionState('running');

    // Start audio feedback
    if (!isPlaying) {
      startAudio();
    }
  }, [isConnected, isCalibrated, sessionState, isPlaying, startAudio]);

  const handlePause = useCallback(() => {
    setSessionState('paused');
  }, []);

  const handleStop = useCallback(() => {
    setSessionState('idle');

    // Save final session data
    if (sessionData) {
      setSessionData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          endTime: Date.now(),
        };
      });
      saveSessionData();
    }

    // Stop audio
    stopAudio();
  }, [sessionData, stopAudio]);

  const handleCalibrate = useCallback(() => {
    if (!isConnected) {
      connect().catch(console.error);
      return;
    }
    startCalibration();
  }, [isConnected, connect, startCalibration]);

  const saveSessionData = () => {
    if (!sessionData) return;

    // Save to localStorage
    const sessions = JSON.parse(localStorage.getItem('flow-sessions') || '[]');
    sessions.push(sessionData);
    localStorage.setItem('flow-sessions', JSON.stringify(sessions));
  };

  // Convert flow metrics to visualization format
  const visualizationMetrics = flowMetrics
    ? {
        flowScore: flowMetrics.flowScore,
        alphaPower: flowMetrics.relaxation * 0.5, // Normalized to expected range
        betaPower: flowMetrics.attention * 0.5,
        thetaPower: flowMetrics.cognitiveLoad * 0.5,
        alphaCoherence: flowMetrics.confidence || 0.5,
      }
    : {
        flowScore: 0,
        alphaPower: 0,
        betaPower: 0,
        thetaPower: 0,
        alphaCoherence: 0,
      };

  const brainState = flowMetrics
    ? {
        alphaFrequency: 8 + flowMetrics.relaxation * 4, // 8-12 Hz range
        flowScore: flowMetrics.flowScore * 100,
        leftHemisphere: 50, // Would need actual asymmetry data
        rightHemisphere: 50,
      }
    : {
        alphaFrequency: 10,
        flowScore: 0,
        leftHemisphere: 50,
        rightHemisphere: 50,
      };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Connection Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getSignalQualityIcon()}
            <span className="text-sm text-gray-300">
              {deviceInfo?.name || 'Not Connected'}
            </span>
            {stats.samplesPerSecond > 0 && (
              <span className="text-xs text-gray-500">
                {stats.samplesPerSecond} Hz | {stats.latencyMs}ms latency
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isCalibrated && calibrationProgress > 0 && (
              <div className="text-xs text-yellow-400">
                Calibrating: {Math.round(calibrationProgress * 100)}%
              </div>
            )}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Signal className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Column Grid */}
      <div className="pt-16 px-4 pb-8">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
            {/* Left Column - Visualizations */}
            <div className="lg:col-span-5 space-y-6 overflow-y-auto">
              {/* 3D Particle System */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden h-96">
                <Canvas>
                  <PerspectiveCamera makeDefault position={[0, 0, 15]} />
                  <OrbitControls enableZoom={false} enablePan={false} />
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} />
                  <FlowParticleSystem metrics={visualizationMetrics} particleCount={5000} />
                </Canvas>
              </div>

              {/* Mandala Geometry */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden h-96">
                <Canvas>
                  <PerspectiveCamera makeDefault position={[0, 0, 10]} />
                  <OrbitControls enableZoom={false} />
                  <ambientLight intensity={0.3} />
                  <pointLight position={[5, 5, 5]} intensity={0.8} />
                  <MandalaGeometry brainState={brainState} pattern="flower-of-life" enableGlow />
                </Canvas>
              </div>

              {/* Spectral Waterfall */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <SpectralWaterfall
                  width={600}
                  height={300}
                  minFrequency={0.1}
                  maxFrequency={50}
                  timeWindow={60}
                />
              </div>
            </div>

            {/* Center Column - Metrics */}
            <div className="lg:col-span-4 overflow-y-auto">
              <FlowMeter
                flowScore={flowMetrics?.flowScore || 0}
                cognitiveLoad={flowMetrics?.cognitiveLoad || 0}
                attention={flowMetrics?.attention || 0}
                relaxation={flowMetrics?.relaxation || 0}
                confidence={flowMetrics?.confidence || 0}
              />
            </div>

            {/* Right Column - Controls */}
            <div className="lg:col-span-3 overflow-y-auto">
              <SessionControls
                isConnected={isConnected}
                isCalibrated={isCalibrated}
                sessionState={sessionState}
                sessionDuration={sessionDuration}
                onStart={handleStart}
                onPause={handlePause}
                onStop={handleStop}
                onCalibrate={handleCalibrate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onSettingsChange={(settings) => {
          console.log('Settings updated:', settings);
          // Apply settings to components
        }}
      />

      {/* Error Display */}
      {(connectionError || streamError) && (
        <div className="fixed bottom-4 right-4 bg-red-900/90 border border-red-700 rounded-lg p-4 max-w-md">
          <h4 className="text-red-400 font-semibold mb-2">Error</h4>
          <p className="text-sm text-gray-300">
            {connectionError?.message || streamError?.message}
          </p>
        </div>
      )}
    </main>
  );
}
