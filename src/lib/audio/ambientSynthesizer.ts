/**
 * Ambient Synthesizer - Generative Music Based on Flow State
 *
 * Creates ambient music that adapts to the user's flow state:
 * - Volume inversely proportional to beta waves (quieter when stressed)
 * - Harmony consonance increases with flow score
 * - Multiple synth layers for rich soundscape
 * - Real-time parameter adjustment
 * - Smooth transitions between states
 */

import * as Tone from 'tone';

/**
 * Flow state representation for musical generation
 */
export interface FlowState {
  /** Flow score (0-100), higher = deeper flow */
  flowScore: number;
  /** Beta wave power (0-1), higher = more stress/alertness */
  beta: number;
  /** Alpha wave power (0-1), higher = more relaxed/creative */
  alpha: number;
  /** Theta wave power (0-1), higher = more meditative */
  theta: number;
}

/**
 * Synthesis parameters derived from flow state
 */
interface SynthParams {
  masterVolume: number;
  padVolume: number;
  melodyVolume: number;
  bassVolume: number;
  filterFrequency: number;
  reverbDecay: number;
  delayTime: number;
  harmonicComplexity: number;
  tempoScale: number;
}

/**
 * Musical scale with consonance rating
 */
interface Scale {
  name: string;
  intervals: number[];
  consonance: number; // 0-1, higher = more consonant
}

/**
 * Predefined musical scales ordered by consonance
 */
const SCALES: Scale[] = [
  // High consonance - peaceful, flowing
  { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9], consonance: 1.0 },
  { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], consonance: 0.9 },
  { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11], consonance: 0.85 },

  // Medium consonance - contemplative
  { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], consonance: 0.7 },
  { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10], consonance: 0.65 },
  { name: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10], consonance: 0.6 },

  // Lower consonance - mysterious, tense
  { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10], consonance: 0.5 },
  { name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10], consonance: 0.4 },
  { name: 'Whole Tone', intervals: [0, 2, 4, 6, 8, 10], consonance: 0.3 },
];

/**
 * Ambient Synthesizer for generative music
 */
export class AmbientSynthesizer {
  private isInitialized = false;
  private isPlaying = false;

  // Synthesizer layers
  private padSynth!: Tone.PolySynth;
  private melodySynth!: Tone.Synth;
  private bassSynth!: Tone.Synth;

  // Effects chain
  private padReverb!: Tone.Reverb;
  private melodyDelay!: Tone.FeedbackDelay;
  private melodyReverb!: Tone.Reverb;
  private bassFilter!: Tone.Filter;
  private masterCompressor!: Tone.Compressor;
  private masterVolume!: Tone.Volume;

  // Generative sequencers
  private padLoop!: Tone.Loop;
  private melodyLoop!: Tone.Loop;
  private bassLoop!: Tone.Loop;

  // Current state
  private currentState: FlowState = {
    flowScore: 50,
    beta: 0.5,
    alpha: 0.5,
    theta: 0.5,
  };

  private currentScale: Scale = SCALES[0];
  private rootNote = 'C2';
  private currentParams: SynthParams = this.calculateParams(this.currentState);

  // Transition smoothing
  private parameterSmoothing = 2.0; // seconds for parameter transitions

  /**
   * Initialize the synthesizer and all audio components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await Tone.start();
    console.log('Tone.js started');

    // Initialize pad synth - warm, evolving background
    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 2.0,
        decay: 1.0,
        sustain: 0.8,
        release: 4.0,
      },
      volume: -12,
    });

    this.padReverb = new Tone.Reverb({
      decay: 8.0,
      wet: 0.5,
    });

    await this.padReverb.generate();
    this.padSynth.connect(this.padReverb);

    // Initialize melody synth - gentle, melodic foreground
    this.melodySynth = new Tone.Synth({
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.4,
        release: 1.5,
      },
      volume: -18,
    });

    this.melodyDelay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.3,
      wet: 0.3,
    });

    this.melodyReverb = new Tone.Reverb({
      decay: 3.0,
      wet: 0.4,
    });

    await this.melodyReverb.generate();
    this.melodySynth.chain(this.melodyDelay, this.melodyReverb);

    // Initialize bass synth - subtle low-end support
    this.bassSynth = new Tone.Synth({
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.5,
        decay: 1.0,
        sustain: 0.6,
        release: 2.0,
      },
      volume: -20,
    });

    this.bassFilter = new Tone.Filter({
      frequency: 200,
      type: 'lowpass',
      rolloff: -24,
    });

    this.bassSynth.connect(this.bassFilter);

    // Master effects
    this.masterCompressor = new Tone.Compressor({
      threshold: -20,
      ratio: 3,
      attack: 0.003,
      release: 0.1,
    });

    this.masterVolume = new Tone.Volume(-6);

    // Connect everything to master
    this.padReverb.connect(this.masterCompressor);
    this.melodyReverb.connect(this.masterCompressor);
    this.bassFilter.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterVolume);
    this.masterVolume.toDestination();

    // Initialize generative loops
    this.initializeLoops();

    this.isInitialized = true;
    console.log('Ambient synthesizer initialized');
  }

  /**
   * Initialize generative sequencer loops
   */
  private initializeLoops(): void {
    // Pad loop - slow evolving chords
    this.padLoop = new Tone.Loop((time) => {
      if (!this.isPlaying) return;

      const chord = this.generateChord(3);
      this.padSynth.triggerAttackRelease(
        chord,
        '2m',
        time,
        0.3
      );
    }, '2m');

    // Melody loop - sparse melodic notes
    this.melodyLoop = new Tone.Loop((time) => {
      if (!this.isPlaying) return;

      // Probabilistic note generation - more active in flow states
      const probability = 0.3 + (this.currentState.flowScore / 100) * 0.4;
      if (Math.random() < probability) {
        const note = this.generateMelodyNote();
        const duration = this.randomChoice(['4n', '2n', '1m']);
        this.melodySynth.triggerAttackRelease(note, duration, time, 0.2);
      }
    }, '4n');

    // Bass loop - subtle foundation
    this.bassLoop = new Tone.Loop((time) => {
      if (!this.isPlaying) return;

      // Bass plays root note occasionally
      if (Math.random() < 0.4) {
        this.bassSynth.triggerAttackRelease(
          this.rootNote,
          '1m',
          time,
          0.15
        );
      }
    }, '1m');
  }

  /**
   * Calculate synthesis parameters from flow state
   */
  private calculateParams(state: FlowState): SynthParams {
    // Master volume inversely proportional to beta (quieter when stressed)
    const masterVolume = -12 - (state.beta * 18); // -12dB to -30dB

    // Layer volumes based on state
    const padVolume = -12 + (state.theta * 6); // More pad in meditative states
    const melodyVolume = -18 + (state.alpha * 8); // More melody in creative states
    const bassVolume = -20 + ((1 - state.beta) * 6); // Less bass when stressed

    // Filter opens up in flow states
    const filterFrequency = 200 + (state.flowScore * 8); // 200Hz to 1000Hz

    // Reverb increases spaciousness in flow
    const reverbDecay = 3.0 + (state.flowScore / 100) * 5.0; // 3s to 8s

    // Delay time varies with flow
    const delayTime = 0.125 + (state.flowScore / 100) * 0.375; // 125ms to 500ms

    // Harmonic complexity increases with flow score
    const harmonicComplexity = state.flowScore / 100;

    // Tempo scales slightly with flow (subtle)
    const tempoScale = 0.9 + (state.flowScore / 100) * 0.2; // 0.9x to 1.1x

    return {
      masterVolume,
      padVolume,
      melodyVolume,
      bassVolume,
      filterFrequency,
      reverbDecay,
      delayTime,
      harmonicComplexity,
      tempoScale,
    };
  }

  /**
   * Select appropriate scale based on flow state
   */
  private selectScale(state: FlowState): Scale {
    // Map flow score to scale consonance
    const targetConsonance = state.flowScore / 100;

    // Find scale with closest consonance
    let bestScale = SCALES[0];
    let minDifference = Math.abs(SCALES[0].consonance - targetConsonance);

    for (const scale of SCALES) {
      const difference = Math.abs(scale.consonance - targetConsonance);
      if (difference < minDifference) {
        minDifference = difference;
        bestScale = scale;
      }
    }

    return bestScale;
  }

  /**
   * Generate a chord from the current scale
   */
  private generateChord(noteCount: number): string[] {
    const octave = 3;
    const chord: string[] = [];

    // Use scale intervals to build consonant chords
    const availableIntervals = [...this.currentScale.intervals];

    for (let i = 0; i < noteCount && availableIntervals.length > 0; i++) {
      const index = Math.floor(Math.random() * availableIntervals.length);
      const interval = availableIntervals[index];
      availableIntervals.splice(index, 1);

      const noteNumber = Tone.Frequency(this.rootNote).toMidi() + interval + (octave - 2) * 12;
      chord.push(Tone.Frequency(noteNumber, 'midi').toNote());
    }

    return chord;
  }

  /**
   * Generate a melodic note from the current scale
   */
  private generateMelodyNote(): string {
    const octave = 4 + Math.floor(Math.random() * 2); // Octave 4 or 5
    const interval = this.randomChoice(this.currentScale.intervals);
    const noteNumber = Tone.Frequency(this.rootNote).toMidi() + interval + (octave - 2) * 12;

    return Tone.Frequency(noteNumber, 'midi').toNote();
  }

  /**
   * Apply synthesizer parameters with smooth transitions
   */
  private applyParameters(params: SynthParams): void {
    const now = Tone.now();
    const rampTime = this.parameterSmoothing;

    // Master volume
    this.masterVolume.volume.rampTo(params.masterVolume, rampTime, now);

    // Layer volumes
    this.padSynth.volume.rampTo(params.padVolume, rampTime, now);
    this.melodySynth.volume.rampTo(params.melodyVolume, rampTime, now);
    this.bassSynth.volume.rampTo(params.bassVolume, rampTime, now);

    // Filter frequency
    this.bassFilter.frequency.rampTo(params.filterFrequency, rampTime, now);

    // Reverb decay
    this.padReverb.decay = params.reverbDecay;

    // Delay time
    this.melodyDelay.delayTime.rampTo(params.delayTime, rampTime, now);

    // Tempo scaling
    const currentBPM = Tone.Transport.bpm.value;
    const targetBPM = 60 * params.tempoScale;
    Tone.Transport.bpm.rampTo(targetBPM, rampTime, now);
  }

  /**
   * Update flow state and adjust music in real-time
   */
  updateFlowState(state: FlowState): void {
    this.currentState = state;

    // Calculate new parameters
    const newParams = this.calculateParams(state);

    // Select appropriate scale
    const newScale = this.selectScale(state);
    if (newScale.name !== this.currentScale.name) {
      console.log(`Scale transition: ${this.currentScale.name} → ${newScale.name}`);
      this.currentScale = newScale;
    }

    // Apply parameters with smooth transitions
    this.applyParameters(newParams);
    this.currentParams = newParams;

    console.log('Flow state updated:', {
      flowScore: state.flowScore,
      scale: this.currentScale.name,
      masterVolume: newParams.masterVolume.toFixed(1),
    });
  }

  /**
   * Start playing ambient music
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isPlaying) {
      return;
    }

    this.isPlaying = true;

    // Start transport
    Tone.Transport.start();

    // Start all loops
    this.padLoop.start(0);
    this.melodyLoop.start(0);
    this.bassLoop.start(0);

    console.log('Ambient synthesizer started');
  }

  /**
   * Stop playing ambient music
   */
  stop(): void {
    if (!this.isPlaying) {
      return;
    }

    this.isPlaying = false;

    // Stop all loops
    this.padLoop.stop();
    this.melodyLoop.stop();
    this.bassLoop.stop();

    // Stop transport
    Tone.Transport.stop();

    console.log('Ambient synthesizer stopped');
  }

  /**
   * Dispose of all audio resources
   */
  dispose(): void {
    this.stop();

    if (this.isInitialized) {
      this.padLoop.dispose();
      this.melodyLoop.dispose();
      this.bassLoop.dispose();

      this.padSynth.dispose();
      this.melodySynth.dispose();
      this.bassSynth.dispose();

      this.padReverb.dispose();
      this.melodyDelay.dispose();
      this.melodyReverb.dispose();
      this.bassFilter.dispose();
      this.masterCompressor.dispose();
      this.masterVolume.dispose();

      this.isInitialized = false;
      console.log('Ambient synthesizer disposed');
    }
  }

  /**
   * Check if synthesizer is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current synthesis parameters
   */
  getCurrentParams(): Readonly<SynthParams> {
    return { ...this.currentParams };
  }

  /**
   * Get current scale information
   */
  getCurrentScale(): Readonly<Scale> {
    return { ...this.currentScale };
  }

  /**
   * Utility: Random choice from array
   */
  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}

/**
 * Create and return a singleton instance
 */
let instance: AmbientSynthesizer | null = null;

export function getAmbientSynthesizer(): AmbientSynthesizer {
  if (!instance) {
    instance = new AmbientSynthesizer();
  }
  return instance;
}
