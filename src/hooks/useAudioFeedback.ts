import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioManager } from '@/lib/audio/audioManager';
import type { FlowMetrics } from '@/types/flow';

export interface AudioFeedbackParams {
  binauralFrequency?: number;
  binauralVolume?: number;
  ambientVolume?: number;
  ambientCutoff?: number;
  ambientResonance?: number;
}

export interface UseAudioFeedbackReturn {
  startAudio: () => void;
  stopAudio: () => void;
  updateParams: (params: AudioFeedbackParams) => void;
  updateFromMetrics: (metrics: FlowMetrics) => void;
  setVolume: (layer: 'binaural' | 'ambient', volume: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  isPlaying: boolean;
}

/**
 * React hook for audio synthesis control with binaural beats and ambient soundscapes
 *
 * Features:
 * - Binaural beats generation for focus enhancement
 * - Ambient synthesizer with dynamic filtering
 * - Volume management per audio layer
 * - Real-time parameter updates from flow metrics
 * - Audio context lifecycle management
 * - Mute/unmute functionality
 *
 * @example
 * ```tsx
 * const { startAudio, updateFromMetrics, toggleMute } = useAudioFeedback();
 *
 * // Start audio on user interaction
 * <button onClick={startAudio}>Enable Audio</button>
 *
 * // Update based on flow state
 * useEffect(() => {
 *   updateFromMetrics(currentMetrics);
 * }, [currentMetrics]);
 * ```
 */
export function useAudioFeedback(): UseAudioFeedbackReturn {
  const audioManagerRef = useRef<AudioManager | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize audio manager on mount
  useEffect(() => {
    audioManagerRef.current = new AudioManager();

    return () => {
      // Cleanup on unmount
      if (audioManagerRef.current) {
        audioManagerRef.current.stop();
        audioManagerRef.current = null;
      }
    };
  }, []);

  /**
   * Start audio playback
   * Must be called from user interaction due to browser autoplay policies
   */
  const startAudio = useCallback(() => {
    if (!audioManagerRef.current) return;

    try {
      audioManagerRef.current.start();
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to start audio:', error);
    }
  }, []);

  /**
   * Stop audio playback and release resources
   */
  const stopAudio = useCallback(() => {
    if (!audioManagerRef.current) return;

    audioManagerRef.current.stop();
    setIsPlaying(false);
  }, []);

  /**
   * Update audio parameters directly
   *
   * @param params - Audio parameters to update
   */
  const updateParams = useCallback((params: AudioFeedbackParams) => {
    if (!audioManagerRef.current) return;

    const {
      binauralFrequency,
      binauralVolume,
      ambientVolume,
      ambientCutoff,
      ambientResonance,
    } = params;

    if (binauralFrequency !== undefined) {
      audioManagerRef.current.setBinauralFrequency(binauralFrequency);
    }

    if (binauralVolume !== undefined) {
      audioManagerRef.current.setVolume('binaural', binauralVolume);
    }

    if (ambientVolume !== undefined) {
      audioManagerRef.current.setVolume('ambient', ambientVolume);
    }

    if (ambientCutoff !== undefined) {
      audioManagerRef.current.setAmbientFilter(ambientCutoff, ambientResonance);
    }
  }, []);

  /**
   * Update audio parameters based on flow metrics
   * Maps flow state to audio characteristics
   *
   * @param metrics - Current flow state metrics
   */
  const updateFromMetrics = useCallback((metrics: FlowMetrics) => {
    if (!audioManagerRef.current || !isPlaying) return;

    // Map flow intensity to binaural frequency (4-12 Hz range)
    // Higher intensity = higher alpha/beta waves for focus
    const binauralFrequency = 4 + (metrics.flowIntensity * 8);

    // Map arousal to ambient filter cutoff (200-2000 Hz)
    // Higher arousal = brighter, more energetic sound
    const ambientCutoff = 200 + (metrics.arousal * 1800);

    // Map valence to ambient resonance (1-10)
    // Higher valence = more resonant, pleasant timbre
    const ambientResonance = 1 + (metrics.valence * 9);

    // Map flow intensity to volume levels
    const binauralVolume = 0.3 + (metrics.flowIntensity * 0.4); // 0.3-0.7 range
    const ambientVolume = 0.2 + (metrics.flowIntensity * 0.3); // 0.2-0.5 range

    audioManagerRef.current.setBinauralFrequency(binauralFrequency);
    audioManagerRef.current.setAmbientFilter(ambientCutoff, ambientResonance);
    audioManagerRef.current.setVolume('binaural', binauralVolume);
    audioManagerRef.current.setVolume('ambient', ambientVolume);
  }, [isPlaying]);

  /**
   * Set volume for specific audio layer
   *
   * @param layer - Audio layer to adjust ('binaural' or 'ambient')
   * @param volume - Volume level (0-1)
   */
  const setVolume = useCallback((layer: 'binaural' | 'ambient', volume: number) => {
    if (!audioManagerRef.current) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioManagerRef.current.setVolume(layer, clampedVolume);
  }, []);

  /**
   * Toggle mute state for all audio
   */
  const toggleMute = useCallback(() => {
    if (!audioManagerRef.current) return;

    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (newMutedState) {
      // Mute both layers
      audioManagerRef.current.setVolume('binaural', 0);
      audioManagerRef.current.setVolume('ambient', 0);
    } else {
      // Restore default volumes
      audioManagerRef.current.setVolume('binaural', 0.5);
      audioManagerRef.current.setVolume('ambient', 0.35);
    }
  }, [isMuted]);

  return {
    startAudio,
    stopAudio,
    updateParams,
    updateFromMetrics,
    setVolume,
    isMuted,
    toggleMute,
    isPlaying,
  };
}
