import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface FlowMetrics {
  timestamp: number;
  flowScore: number;
  focusLevel: number;
  stressLevel: number;
  energyLevel: number;
  coherence: number;
}

export interface SessionData {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration: number;
  isRunning: boolean;
  isPaused: boolean;
  pausedAt?: number;
  totalPausedTime: number;
}

export interface AudioSettings {
  volume: number;
  binauralEnabled: boolean;
  ambientEnabled: boolean;
  binauralFrequency: number;
  ambientType: 'rain' | 'ocean' | 'forest' | 'whitenoise';
}

export interface VisualSettings {
  particleCount: number;
  colorScheme: 'flow' | 'focus' | 'calm' | 'energy';
  showWaterfall: boolean;
  showMetrics: boolean;
  brightness: number;
}

export interface CalibrationData {
  baselineFlowScore: number;
  baselineFocusLevel: number;
  baselineStressLevel: number;
  baselineEnergyLevel: number;
  calibratedAt: number;
  samplesCollected: number;
}

export interface Achievement {
  id: string;
  unlockedAt: number;
  title: string;
  description: string;
}

export interface UserPreferences {
  calibrationData?: CalibrationData;
  achievementUnlocks: Achievement[];
  totalSessionsCompleted: number;
  totalFlowTime: number;
  longestSession: number;
  highestFlowScore: number;
}

// ============================================================================
// Store State Interface
// ============================================================================

export interface SessionStore {
  // Session state
  session: SessionData;

  // Metrics history
  metricsHistory: FlowMetrics[];

  // Settings
  audioSettings: AudioSettings;
  visualSettings: VisualSettings;

  // User preferences
  userPreferences: UserPreferences;

  // Session actions
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;

  // Settings actions
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  updateVisualSettings: (settings: Partial<VisualSettings>) => void;

  // Metrics actions
  addFlowSample: (metrics: Omit<FlowMetrics, 'timestamp'>) => void;
  clearMetricsHistory: () => void;

  // User preferences actions
  updateCalibration: (calibration: CalibrationData) => void;
  unlockAchievement: (achievement: Omit<Achievement, 'unlockedAt'>) => void;

  // Derived state selectors (computed properties)
  getSessionDuration: () => number;
  getAvgFlowScore: () => number;
  getAvgFocusLevel: () => number;
  getCurrentFlowState: () => FlowMetrics | null;
  getSessionMetrics: () => {
    avgFlow: number;
    avgFocus: number;
    avgStress: number;
    avgEnergy: number;
    avgCoherence: number;
    peakFlow: number;
    samplesCount: number;
  };
}

// ============================================================================
// Default Values
// ============================================================================

const defaultSession: SessionData = {
  sessionId: '',
  startTime: 0,
  duration: 0,
  isRunning: false,
  isPaused: false,
  totalPausedTime: 0,
};

const defaultAudioSettings: AudioSettings = {
  volume: 0.7,
  binauralEnabled: true,
  ambientEnabled: true,
  binauralFrequency: 40, // 40Hz gamma wave for focus
  ambientType: 'rain',
};

const defaultVisualSettings: VisualSettings = {
  particleCount: 100,
  colorScheme: 'flow',
  showWaterfall: true,
  showMetrics: true,
  brightness: 0.8,
};

const defaultUserPreferences: UserPreferences = {
  achievementUnlocks: [],
  totalSessionsCompleted: 0,
  totalFlowTime: 0,
  longestSession: 0,
  highestFlowScore: 0,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      session: defaultSession,
      metricsHistory: [],
      audioSettings: defaultAudioSettings,
      visualSettings: defaultVisualSettings,
      userPreferences: defaultUserPreferences,

      // ========================================================================
      // Session Actions
      // ========================================================================

      startSession: () => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set({
          session: {
            sessionId,
            startTime: Date.now(),
            duration: 0,
            isRunning: true,
            isPaused: false,
            totalPausedTime: 0,
          },
          metricsHistory: [], // Clear previous session metrics
        });
      },

      pauseSession: () => {
        const { session } = get();
        if (session.isRunning && !session.isPaused) {
          set({
            session: {
              ...session,
              isPaused: true,
              pausedAt: Date.now(),
            },
          });
        }
      },

      resumeSession: () => {
        const { session } = get();
        if (session.isRunning && session.isPaused && session.pausedAt) {
          const pauseDuration = Date.now() - session.pausedAt;
          set({
            session: {
              ...session,
              isPaused: false,
              pausedAt: undefined,
              totalPausedTime: session.totalPausedTime + pauseDuration,
            },
          });
        }
      },

      stopSession: () => {
        const { session, metricsHistory, userPreferences } = get();

        if (!session.isRunning) return;

        const endTime = Date.now();
        const totalDuration = get().getSessionDuration();
        const avgFlow = get().getAvgFlowScore();

        // Update user preferences with session stats
        const updatedPreferences: UserPreferences = {
          ...userPreferences,
          totalSessionsCompleted: userPreferences.totalSessionsCompleted + 1,
          totalFlowTime: userPreferences.totalFlowTime + totalDuration,
          longestSession: Math.max(userPreferences.longestSession, totalDuration),
          highestFlowScore: Math.max(userPreferences.highestFlowScore, avgFlow),
        };

        set({
          session: {
            ...session,
            endTime,
            duration: totalDuration,
            isRunning: false,
            isPaused: false,
          },
          userPreferences: updatedPreferences,
        });
      },

      // ========================================================================
      // Settings Actions
      // ========================================================================

      updateAudioSettings: (settings) => {
        set((state) => ({
          audioSettings: {
            ...state.audioSettings,
            ...settings,
          },
        }));
      },

      updateVisualSettings: (settings) => {
        set((state) => ({
          visualSettings: {
            ...state.visualSettings,
            ...settings,
          },
        }));
      },

      // ========================================================================
      // Metrics Actions
      // ========================================================================

      addFlowSample: (metrics) => {
        const timestamp = Date.now();
        const newMetrics: FlowMetrics = {
          ...metrics,
          timestamp,
        };

        set((state) => ({
          metricsHistory: [...state.metricsHistory, newMetrics],
        }));

        // Update session duration
        const duration = get().getSessionDuration();
        set((state) => ({
          session: {
            ...state.session,
            duration,
          },
        }));
      },

      clearMetricsHistory: () => {
        set({ metricsHistory: [] });
      },

      // ========================================================================
      // User Preferences Actions
      // ========================================================================

      updateCalibration: (calibration) => {
        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            calibrationData: calibration,
          },
        }));
      },

      unlockAchievement: (achievement) => {
        const unlockedAt = Date.now();
        const newAchievement: Achievement = {
          ...achievement,
          unlockedAt,
        };

        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            achievementUnlocks: [
              ...state.userPreferences.achievementUnlocks,
              newAchievement,
            ],
          },
        }));
      },

      // ========================================================================
      // Derived State Selectors
      // ========================================================================

      getSessionDuration: () => {
        const { session } = get();

        if (!session.isRunning) {
          return session.duration;
        }

        const currentTime = session.isPaused && session.pausedAt
          ? session.pausedAt
          : Date.now();

        return currentTime - session.startTime - session.totalPausedTime;
      },

      getAvgFlowScore: () => {
        const { metricsHistory } = get();

        if (metricsHistory.length === 0) return 0;

        const sum = metricsHistory.reduce((acc, m) => acc + m.flowScore, 0);
        return sum / metricsHistory.length;
      },

      getAvgFocusLevel: () => {
        const { metricsHistory } = get();

        if (metricsHistory.length === 0) return 0;

        const sum = metricsHistory.reduce((acc, m) => acc + m.focusLevel, 0);
        return sum / metricsHistory.length;
      },

      getCurrentFlowState: () => {
        const { metricsHistory } = get();

        if (metricsHistory.length === 0) return null;

        return metricsHistory[metricsHistory.length - 1];
      },

      getSessionMetrics: () => {
        const { metricsHistory } = get();

        if (metricsHistory.length === 0) {
          return {
            avgFlow: 0,
            avgFocus: 0,
            avgStress: 0,
            avgEnergy: 0,
            avgCoherence: 0,
            peakFlow: 0,
            samplesCount: 0,
          };
        }

        const count = metricsHistory.length;
        const sums = metricsHistory.reduce(
          (acc, m) => ({
            flow: acc.flow + m.flowScore,
            focus: acc.focus + m.focusLevel,
            stress: acc.stress + m.stressLevel,
            energy: acc.energy + m.energyLevel,
            coherence: acc.coherence + m.coherence,
          }),
          { flow: 0, focus: 0, stress: 0, energy: 0, coherence: 0 }
        );

        const peakFlow = Math.max(...metricsHistory.map(m => m.flowScore));

        return {
          avgFlow: sums.flow / count,
          avgFocus: sums.focus / count,
          avgStress: sums.stress / count,
          avgEnergy: sums.energy / count,
          avgCoherence: sums.coherence / count,
          peakFlow,
          samplesCount: count,
        };
      },
    }),
    {
      name: 'flow-session-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist certain parts of the state
      partialize: (state) => ({
        audioSettings: state.audioSettings,
        visualSettings: state.visualSettings,
        userPreferences: state.userPreferences,
        // Don't persist active session or metrics history
      }),
    }
  )
);

// ============================================================================
// Convenience Hooks for Common Selections
// ============================================================================

export const useSessionState = () => useSessionStore((state) => state.session);
export const useMetricsHistory = () => useSessionStore((state) => state.metricsHistory);
export const useAudioSettings = () => useSessionStore((state) => state.audioSettings);
export const useVisualSettings = () => useSessionStore((state) => state.visualSettings);
export const useUserPreferences = () => useSessionStore((state) => state.userPreferences);

// Selector hooks for derived state
export const useSessionDuration = () => useSessionStore((state) => state.getSessionDuration());
export const useAvgFlowScore = () => useSessionStore((state) => state.getAvgFlowScore());
export const useCurrentFlowState = () => useSessionStore((state) => state.getCurrentFlowState());
export const useSessionMetrics = () => useSessionStore((state) => state.getSessionMetrics());
