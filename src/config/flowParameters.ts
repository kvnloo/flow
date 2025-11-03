/**
 * Flow State Configuration Parameters
 *
 * Scientific basis for flow state optimization based on neuroscience research:
 * - Brainwave frequency bands correlate with cognitive states
 * - Challenge-skill balance follows Csikszentmihalyi's flow theory
 * - Binaural beats can entrain neural oscillations (Oster, 1973)
 */

/**
 * Brainwave frequency bands and their cognitive correlates
 *
 * Based on clinical EEG research:
 * - Delta (0.5-4 Hz): Deep sleep, unconscious processes
 * - Theta (4-8 Hz): Meditation, creativity, deep relaxation
 * - Alpha (8-13 Hz): Relaxed awareness, pre-flow state
 * - Beta (13-30 Hz): Active thinking, problem-solving
 * - Gamma (30-100 Hz): Peak performance, flow state
 */
export interface BrainwaveBand {
  min: number;      // Minimum frequency in Hz
  max: number;      // Maximum frequency in Hz
  description: string;
  cognitiveState: string;
}

export const BRAINWAVE_BANDS: Record<string, BrainwaveBand> = {
  delta: {
    min: 0.5,
    max: 4,
    description: 'Deep sleep and unconscious processing',
    cognitiveState: 'restorative'
  },
  theta: {
    min: 4,
    max: 8,
    description: 'Deep meditation and creativity',
    cognitiveState: 'creative'
  },
  alpha: {
    min: 8,
    max: 13,
    description: 'Relaxed awareness and learning readiness',
    cognitiveState: 'relaxed'
  },
  beta: {
    min: 13,
    max: 30,
    description: 'Active thinking and concentration',
    cognitiveState: 'focused'
  },
  gamma: {
    min: 30,
    max: 100,
    description: 'Peak performance and flow state',
    cognitiveState: 'flow'
  }
};

/**
 * Flow state intensity levels
 *
 * Based on challenge-skill ratio (Csikszentmihalyi, 1990):
 * - Ratio < 0.7: Boredom (skill exceeds challenge)
 * - Ratio 0.7-1.3: Flow channel (optimal balance)
 * - Ratio > 1.3: Anxiety (challenge exceeds skill)
 */
export interface FlowState {
  level: number;           // 0-100 flow intensity
  challengeSkillRatio: number;  // Challenge/Skill balance
  dominantBand: keyof typeof BRAINWAVE_BANDS;
  targetFrequency: number; // Hz
  description: string;
}

export const FLOW_STATES: Record<string, FlowState> = {
  'deep-rest': {
    level: 0,
    challengeSkillRatio: 0.1,
    dominantBand: 'delta',
    targetFrequency: 2,
    description: 'Deep restorative state'
  },
  'meditation': {
    level: 20,
    challengeSkillRatio: 0.5,
    dominantBand: 'theta',
    targetFrequency: 6,
    description: 'Meditative creativity'
  },
  'relaxed-focus': {
    level: 40,
    challengeSkillRatio: 0.8,
    dominantBand: 'alpha',
    targetFrequency: 10,
    description: 'Calm concentration'
  },
  'active-focus': {
    level: 60,
    challengeSkillRatio: 1.0,
    dominantBand: 'beta',
    targetFrequency: 20,
    description: 'Engaged problem-solving'
  },
  'peak-flow': {
    level: 80,
    challengeSkillRatio: 1.1,
    dominantBand: 'gamma',
    targetFrequency: 40,
    description: 'Optimal flow state'
  },
  'hyper-flow': {
    level: 100,
    challengeSkillRatio: 1.2,
    dominantBand: 'gamma',
    targetFrequency: 60,
    description: 'Maximum performance state'
  }
};

/**
 * Difficulty progression parameters
 *
 * Adaptive difficulty maintains challenge-skill balance:
 * - Too easy → increase complexity to prevent boredom
 * - Too hard → decrease complexity to prevent anxiety
 * - Just right → maintain flow channel
 */
export interface DifficultyParameters {
  baseComplexity: number;      // Starting complexity (0-1)
  adaptationRate: number;       // How quickly difficulty adjusts (0-1)
  targetSuccessRate: number;    // Optimal success rate for flow (0-1)
  minComplexity: number;        // Floor complexity
  maxComplexity: number;        // Ceiling complexity
}

export const DIFFICULTY_PRESETS: Record<string, DifficultyParameters> = {
  beginner: {
    baseComplexity: 0.3,
    adaptationRate: 0.1,
    targetSuccessRate: 0.8,  // Higher success rate for confidence building
    minComplexity: 0.2,
    maxComplexity: 0.6
  },
  intermediate: {
    baseComplexity: 0.5,
    adaptationRate: 0.15,
    targetSuccessRate: 0.7,  // Balanced challenge
    minComplexity: 0.3,
    maxComplexity: 0.8
  },
  advanced: {
    baseComplexity: 0.7,
    adaptationRate: 0.2,
    targetSuccessRate: 0.6,  // Higher challenge for experts
    minComplexity: 0.5,
    maxComplexity: 0.95
  },
  adaptive: {
    baseComplexity: 0.5,
    adaptationRate: 0.25,
    targetSuccessRate: 0.7,
    minComplexity: 0.1,
    maxComplexity: 1.0
  }
};

/**
 * Binaural beat audio parameters
 *
 * Binaural beats create frequency entrainment:
 * - Left ear: Base frequency (e.g., 200 Hz)
 * - Right ear: Base + target brainwave (e.g., 210 Hz for 10 Hz alpha)
 * - Brain perceives the difference (10 Hz) and entrains to it
 */
export interface AudioParameters {
  baseFrequency: number;        // Carrier frequency in Hz (typically 100-400 Hz)
  binauralBeatFrequency: number; // Target brainwave frequency in Hz
  volume: number;               // 0-1
  waveform: 'sine' | 'square' | 'triangle' | 'sawtooth';
  fadeInDuration: number;       // Seconds
  fadeOutDuration: number;      // Seconds
}

export const DEFAULT_AUDIO: AudioParameters = {
  baseFrequency: 200,           // 200 Hz carrier frequency (sub-bass range)
  binauralBeatFrequency: 40,    // 40 Hz gamma wave for flow
  volume: 0.3,                  // Conservative volume for safety
  waveform: 'sine',             // Smoothest waveform for comfort
  fadeInDuration: 5,            // Gentle 5-second fade-in
  fadeOutDuration: 3            // Quick 3-second fade-out
};

/**
 * Session tracking parameters
 */
export interface SessionParameters {
  warmupDuration: number;       // Seconds to ramp into flow
  optimalDuration: number;      // Target session length for peak flow
  cooldownDuration: number;     // Seconds to ramp out of flow
  breakInterval: number;        // Recommended break frequency
  breakDuration: number;        // Recommended break length
}

export const DEFAULT_SESSION: SessionParameters = {
  warmupDuration: 300,          // 5 minutes warmup
  optimalDuration: 3600,        // 60 minutes optimal (Pomodoro × 2)
  cooldownDuration: 180,        // 3 minutes cooldown
  breakInterval: 1500,          // Break every 25 minutes (Pomodoro)
  breakDuration: 300            // 5 minute breaks
};

/**
 * Visualization parameters for flow feedback
 */
export interface VisualizationParameters {
  colorScheme: 'spectrum' | 'monochrome' | 'thermal';
  animationSpeed: number;       // 0-1 (slow to fast)
  particleCount: number;        // Visual complexity
  responseLatency: number;      // Ms delay for visual feedback
  smoothingFactor: number;      // 0-1 (choppy to smooth)
}

export const DEFAULT_VISUALIZATION: VisualizationParameters = {
  colorScheme: 'spectrum',
  animationSpeed: 0.5,
  particleCount: 100,
  responseLatency: 50,          // 50ms for perceptible feedback
  smoothingFactor: 0.7          // Smooth but responsive
};

/**
 * Color mapping for flow states
 * Based on synesthesia research and cognitive associations
 */
export const COLOR_MAPPING: Record<string, string> = {
  'deep-rest': '#1a1a2e',       // Deep indigo (night, rest)
  'meditation': '#16213e',      // Dark blue (calm, introspection)
  'relaxed-focus': '#0f3460',   // Medium blue (clarity, peace)
  'active-focus': '#533483',    // Purple (concentration, thought)
  'peak-flow': '#e94560',       // Vibrant red (energy, action)
  'hyper-flow': '#ff6b6b'       // Bright coral (peak intensity)
};

/**
 * Master configuration object
 */
export const FLOW_PARAMETERS = {
  bands: BRAINWAVE_BANDS,
  flowStates: FLOW_STATES,
  difficulty: DIFFICULTY_PRESETS,
  audio: DEFAULT_AUDIO,
  session: DEFAULT_SESSION,
  visualization: DEFAULT_VISUALIZATION,
  colors: COLOR_MAPPING
} as const;

/**
 * Type exports for consuming modules
 */
export type FlowParametersConfig = typeof FLOW_PARAMETERS;
export type FlowStateKey = keyof typeof FLOW_STATES;
export type DifficultyPreset = keyof typeof DIFFICULTY_PRESETS;
export type BrainwaveBandKey = keyof typeof BRAINWAVE_BANDS;
