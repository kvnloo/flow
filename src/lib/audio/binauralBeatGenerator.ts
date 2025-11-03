/**
 * BinauralBeatGenerator
 *
 * High-fidelity binaural beat generator optimized for audiophile equipment.
 * Generates precise stereo tones with smooth frequency transitions to avoid
 * audible artifacts on high-end headphones (Sennheiser HD800S, etc.).
 *
 * Technical Specifications:
 * - Uses Web Audio API for sample-accurate timing
 * - Stereo oscillator pairs for precise beat frequency control
 * - Exponential ramping for smooth transitions (reduces clicks/pops)
 * - Real-time frequency adjustment with <1ms latency
 * - Optimized for 44.1kHz/48kHz sample rates
 *
 * @example
 * const generator = new BinauralBeatGenerator();
 * await generator.start(200, 10); // 200Hz base, 10Hz beat
 * await generator.setFrequency(200, 8); // Smooth transition to 8Hz beat
 * generator.stop();
 */

export interface BinauralBeatConfig {
  baseFrequency: number;      // Base frequency in Hz (e.g., 200Hz)
  beatFrequency: number;       // Beat frequency in Hz (difference between ears)
  volume?: number;             // Master volume (0.0 to 1.0)
  rampDuration?: number;       // Frequency transition duration in seconds
}

export class BinauralBeatGenerator {
  private audioContext: AudioContext | null = null;
  private leftOscillator: OscillatorNode | null = null;
  private rightOscillator: OscillatorNode | null = null;
  private leftGain: GainNode | null = null;
  private rightGain: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private masterGain: GainNode | null = null;

  private isPlaying: boolean = false;
  private currentBaseFrequency: number = 0;
  private currentBeatFrequency: number = 0;
  private currentVolume: number = 0.3; // Safe default volume

  // Audio quality constants
  private readonly DEFAULT_RAMP_DURATION = 2.0; // Seconds for smooth transitions
  private readonly VOLUME_RAMP_DURATION = 0.05; // Fast volume ramps to avoid clicks
  private readonly MIN_FREQUENCY = 20; // Hz
  private readonly MAX_FREQUENCY = 20000; // Hz
  private readonly MIN_BEAT_FREQUENCY = 0.5; // Hz
  private readonly MAX_BEAT_FREQUENCY = 40; // Hz (typical brainwave range)

  /**
   * Initialize audio context and nodes.
   * Creates stereo oscillator pair with precise frequency control.
   */
  private async initializeAudioContext(): Promise<void> {
    if (this.audioContext) {
      return; // Already initialized
    }

    // Create AudioContext with optimal settings
    this.audioContext = new AudioContext({
      latencyHint: 'interactive',
      sampleRate: 48000, // High quality sample rate
    });

    // Resume context if suspended (required in some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Create stereo channel merger
    this.merger = this.audioContext.createChannelMerger(2);

    // Create master gain for volume control
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0; // Start at zero for smooth fade-in

    // Connect master gain to output
    this.merger.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Create and configure oscillator nodes for binaural beats.
   *
   * @param baseFrequency - Base carrier frequency in Hz
   * @param beatFrequency - Beat frequency (difference between ears) in Hz
   */
  private createOscillators(baseFrequency: number, beatFrequency: number): void {
    if (!this.audioContext || !this.merger) {
      throw new Error('Audio context not initialized');
    }

    // Validate frequency ranges
    this.validateFrequencies(baseFrequency, beatFrequency);

    const now = this.audioContext.currentTime;

    // Calculate precise stereo frequencies
    const leftFrequency = baseFrequency;
    const rightFrequency = baseFrequency + beatFrequency;

    // Create LEFT channel oscillator
    this.leftOscillator = this.audioContext.createOscillator();
    this.leftOscillator.type = 'sine'; // Pure sine wave for clean audio
    this.leftOscillator.frequency.setValueAtTime(leftFrequency, now);

    // Create LEFT channel gain
    this.leftGain = this.audioContext.createGain();
    this.leftGain.gain.setValueAtTime(1.0, now);

    // Connect LEFT: oscillator -> gain -> merger(channel 0)
    this.leftOscillator.connect(this.leftGain);
    this.leftGain.connect(this.merger, 0, 0);

    // Create RIGHT channel oscillator
    this.rightOscillator = this.audioContext.createOscillator();
    this.rightOscillator.type = 'sine';
    this.rightOscillator.frequency.setValueAtTime(rightFrequency, now);

    // Create RIGHT channel gain
    this.rightGain = this.audioContext.createGain();
    this.rightGain.gain.setValueAtTime(1.0, now);

    // Connect RIGHT: oscillator -> gain -> merger(channel 1)
    this.rightOscillator.connect(this.rightGain);
    this.rightGain.connect(this.merger, 0, 1);

    // Start oscillators
    this.leftOscillator.start(now);
    this.rightOscillator.start(now);

    // Store current frequencies
    this.currentBaseFrequency = baseFrequency;
    this.currentBeatFrequency = beatFrequency;
  }

  /**
   * Validate frequency parameters are within safe ranges.
   */
  private validateFrequencies(baseFrequency: number, beatFrequency: number): void {
    if (baseFrequency < this.MIN_FREQUENCY || baseFrequency > this.MAX_FREQUENCY) {
      throw new Error(
        `Base frequency ${baseFrequency}Hz out of range (${this.MIN_FREQUENCY}-${this.MAX_FREQUENCY}Hz)`
      );
    }

    if (beatFrequency < this.MIN_BEAT_FREQUENCY || beatFrequency > this.MAX_BEAT_FREQUENCY) {
      throw new Error(
        `Beat frequency ${beatFrequency}Hz out of range (${this.MIN_BEAT_FREQUENCY}-${this.MAX_BEAT_FREQUENCY}Hz)`
      );
    }
  }

  /**
   * Start binaural beat generation.
   *
   * @param baseFrequency - Base carrier frequency in Hz (e.g., 200)
   * @param beatFrequency - Beat frequency in Hz (e.g., 10 for 10Hz alpha)
   * @param volume - Master volume (0.0 to 1.0), default 0.3
   */
  async start(
    baseFrequency: number,
    beatFrequency: number,
    volume: number = 0.3
  ): Promise<void> {
    if (this.isPlaying) {
      console.warn('BinauralBeatGenerator already playing, stopping first');
      this.stop();
    }

    // Initialize audio context
    await this.initializeAudioContext();

    if (!this.audioContext || !this.masterGain) {
      throw new Error('Failed to initialize audio context');
    }

    // Store volume
    this.currentVolume = Math.max(0, Math.min(1, volume));

    // Create oscillators
    this.createOscillators(baseFrequency, beatFrequency);

    // Smooth fade-in to avoid clicks
    const now = this.audioContext.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(
      this.currentVolume,
      now + this.VOLUME_RAMP_DURATION
    );

    this.isPlaying = true;

    console.log(
      `🎵 Binaural beats started: ${baseFrequency}Hz base, ${beatFrequency}Hz beat, ${(volume * 100).toFixed(0)}% volume`
    );
  }

  /**
   * Smoothly transition to new frequencies.
   * Uses exponential ramping for natural-sounding transitions.
   *
   * @param baseFrequency - New base frequency in Hz
   * @param beatFrequency - New beat frequency in Hz
   * @param rampDuration - Transition duration in seconds (default 2.0)
   */
  async setFrequency(
    baseFrequency: number,
    beatFrequency: number,
    rampDuration?: number
  ): Promise<void> {
    if (!this.isPlaying || !this.audioContext || !this.leftOscillator || !this.rightOscillator) {
      throw new Error('Cannot set frequency: generator not playing');
    }

    // Validate frequencies
    this.validateFrequencies(baseFrequency, beatFrequency);

    const duration = rampDuration ?? this.DEFAULT_RAMP_DURATION;
    const now = this.audioContext.currentTime;

    // Calculate new stereo frequencies
    const leftFrequency = baseFrequency;
    const rightFrequency = baseFrequency + beatFrequency;

    // Smooth exponential ramp for natural transitions
    // exponentialRampToValueAtTime requires value > 0, so we ensure minimum 0.001
    const safeLeftFreq = Math.max(0.001, leftFrequency);
    const safeRightFreq = Math.max(0.001, rightFrequency);

    // Cancel any scheduled changes and apply new ramp
    this.leftOscillator.frequency.cancelScheduledValues(now);
    this.leftOscillator.frequency.setValueAtTime(this.currentBaseFrequency, now);
    this.leftOscillator.frequency.exponentialRampToValueAtTime(safeLeftFreq, now + duration);

    this.rightOscillator.frequency.cancelScheduledValues(now);
    this.rightOscillator.frequency.setValueAtTime(
      this.currentBaseFrequency + this.currentBeatFrequency,
      now
    );
    this.rightOscillator.frequency.exponentialRampToValueAtTime(safeRightFreq, now + duration);

    // Update stored frequencies
    this.currentBaseFrequency = baseFrequency;
    this.currentBeatFrequency = beatFrequency;

    console.log(
      `🎵 Frequency transition: ${baseFrequency}Hz base, ${beatFrequency}Hz beat (${duration}s ramp)`
    );
  }

  /**
   * Adjust volume with smooth ramping.
   *
   * @param volume - New volume (0.0 to 1.0)
   * @param rampDuration - Transition duration in seconds (default 0.05)
   */
  setVolume(volume: number, rampDuration?: number): void {
    if (!this.isPlaying || !this.audioContext || !this.masterGain) {
      throw new Error('Cannot set volume: generator not playing');
    }

    const safeVolume = Math.max(0, Math.min(1, volume));
    const duration = rampDuration ?? this.VOLUME_RAMP_DURATION;
    const now = this.audioContext.currentTime;

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.currentVolume, now);
    this.masterGain.gain.linearRampToValueAtTime(safeVolume, now + duration);

    this.currentVolume = safeVolume;

    console.log(`🔊 Volume: ${(safeVolume * 100).toFixed(0)}%`);
  }

  /**
   * Stop binaural beat generation with smooth fade-out.
   * Properly cleans up all audio nodes to prevent memory leaks.
   */
  stop(): void {
    if (!this.isPlaying || !this.audioContext) {
      return;
    }

    const now = this.audioContext.currentTime;
    const fadeOutDuration = this.VOLUME_RAMP_DURATION;

    // Smooth fade-out
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.currentVolume, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + fadeOutDuration);
    }

    // Schedule oscillator stop after fade-out
    setTimeout(() => {
      this.cleanup();
    }, fadeOutDuration * 1000 + 50); // Add 50ms buffer

    this.isPlaying = false;

    console.log('🎵 Binaural beats stopped');
  }

  /**
   * Clean up audio nodes and connections.
   * Prevents memory leaks and audio glitches.
   */
  private cleanup(): void {
    try {
      // Stop and disconnect oscillators
      if (this.leftOscillator) {
        this.leftOscillator.stop();
        this.leftOscillator.disconnect();
        this.leftOscillator = null;
      }

      if (this.rightOscillator) {
        this.rightOscillator.stop();
        this.rightOscillator.disconnect();
        this.rightOscillator = null;
      }

      // Disconnect gain nodes
      if (this.leftGain) {
        this.leftGain.disconnect();
        this.leftGain = null;
      }

      if (this.rightGain) {
        this.rightGain.disconnect();
        this.rightGain = null;
      }

      // Note: We keep audioContext, merger, and masterGain alive
      // for potential restart without reinitialization
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Dispose of all resources including audio context.
   * Call this when completely done with the generator.
   */
  async dispose(): Promise<void> {
    this.stop();

    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Disconnect and clear remaining nodes
    if (this.merger) {
      this.merger.disconnect();
      this.merger = null;
    }

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    // Close audio context
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    console.log('🎵 BinauralBeatGenerator disposed');
  }

  /**
   * Get current playback state.
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      baseFrequency: this.currentBaseFrequency,
      beatFrequency: this.currentBeatFrequency,
      volume: this.currentVolume,
      leftFrequency: this.currentBaseFrequency,
      rightFrequency: this.currentBaseFrequency + this.currentBeatFrequency,
      audioContextState: this.audioContext?.state ?? 'closed',
    };
  }

  /**
   * Check if generator is currently playing.
   */
  get playing(): boolean {
    return this.isPlaying;
  }
}
