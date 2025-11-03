'use client';

import * as React from 'react';
import { createContext, useContext } from 'react';

/**
 * Audio context type definition
 */
interface AudioContextType {
  audioContext: AudioContext | null;
  initializeAudio: () => Promise<AudioContext>;
}

const AudioContext = createContext<AudioContextType>({
  audioContext: null,
  initializeAudio: async () => new AudioContext(),
});

/**
 * Audio provider for managing global Web Audio API context
 *
 * Features:
 * - Singleton AudioContext instance
 * - Lazy initialization on user interaction
 * - Automatic cleanup on unmount
 * - Shared audio context across components
 *
 * @example
 * ```tsx
 * function Component() {
 *   const { initializeAudio } = useAudio();
 *
 *   const handleStart = async () => {
 *     const ctx = await initializeAudio();
 *     // Use AudioContext for audio operations
 *   };
 * }
 * ```
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioContextRef = React.useRef<AudioContext | null>(null);

  /**
   * Initialize audio context (must be called from user interaction)
   * Returns existing context if already initialized
   */
  const initializeAudio = React.useCallback(async (): Promise<AudioContext> => {
    if (audioContextRef.current) {
      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return audioContextRef.current;
    }

    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      return ctx;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw error;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const value = React.useMemo(
    () => ({
      audioContext: audioContextRef.current,
      initializeAudio,
    }),
    [initializeAudio]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

/**
 * Hook to access audio context
 *
 * @throws {Error} If used outside of AudioProvider
 */
export function useAudio() {
  const context = useContext(AudioContext);

  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }

  return context;
}
