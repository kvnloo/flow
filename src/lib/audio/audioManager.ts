/**
 * Master Audio Manager
 *
 * Coordinates all audio sources with proper gain staging and mixing.
 * Manages binaural beats, ambient synthesis, and nature soundscapes.
 */

import { BinauralBeatGenerator } from './binauralBeatGenerator';
import { AmbientSynthesizer } from './ambientSynthesizer';

export interface AudioManagerConfig {
  masterVolume: number;
  binauralVolume: number;
  ambientVolume: number;
  natureVolume: number;
}

export interface NatureSoundConfig {
  type: 'rain' | 'forest' | 'ocean' | 'wind' | 'stream';
  intensity: number; // 0-1
}

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Audio sources
  private binauralBeat: BinauralBeatGenerator | null = null;
  private ambientSynth: AmbientSynthesizer | null = null;

  // Layer gain nodes for mixing
  private binauralGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private natureGain: GainNode | null = null;

  // Nature soundscape
  private natureSoundBuffer: AudioBuffer | null = null;
  private natureSoundSource: AudioBufferSourceNode | null = null;

  // Mute/solo state
  private muteState = {
    binaural: false,
    ambient: false,
    nature: false
  };

  private soloState = {
    binaural: false,
    ambient: false,
    nature: false
  };

  // Configuration
  private config: AudioManagerConfig = {
    masterVolume: 0.7,
    binauralVolume: 0.6,
    ambientVolume: 0.5,
    natureVolume: 0.3
  };

  private isRunning = false;

  constructor(config?: Partial<AudioManagerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize audio context and all audio sources
   */
  async initialize(): Promise<void> {
    if (this.context) {
      console.warn('AudioManager already initialized');
      return;
    }

    try {
      // Create audio context
      this.context = new AudioContext();

      // Create master gain node
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.config.masterVolume;
      this.masterGain.connect(this.context.destination);

      // Create layer gain nodes
      this.binauralGain = this.context.createGain();
      this.binauralGain.gain.value = this.config.binauralVolume;
      this.binauralGain.connect(this.masterGain);

      this.ambientGain = this.context.createGain();
      this.ambientGain.gain.value = this.config.ambientVolume;
      this.ambientGain.connect(this.masterGain);

      this.natureGain = this.context.createGain();
      this.natureGain.gain.value = this.config.natureVolume;
      this.natureGain.connect(this.masterGain);

      // Initialize audio generators
      this.binauralBeat = new BinauralBeatGenerator(this.context);
      this.ambientSynth = new AmbientSynthesizer(this.context);

      // Connect to layer gain nodes
      this.binauralBeat.connect(this.binauralGain);
      this.ambientSynth.connect(this.ambientGain);

      console.log('AudioManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
      throw error;
    }
  }

  /**
   * Start all audio sources
   */
  async start(): Promise<void> {
    if (!this.context || this.isRunning) {
      return;
    }

    try {
      // Resume audio context if suspended
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      // Start binaural beats with default theta wave (5Hz)
      this.binauralBeat?.start(5);

      // Start ambient synthesizer
      this.ambientSynth?.start();

      this.isRunning = true;
      console.log('Audio sources started');
    } catch (error) {
      console.error('Failed to start audio sources:', error);
      throw error;
    }
  }

  /**
   * Stop all audio sources
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.binauralBeat?.stop();
    this.ambientSynth?.stop();
    this.stopNatureSound();

    this.isRunning = false;
    console.log('Audio sources stopped');
  }

  /**
   * Load and play nature soundscape
   */
  async loadNatureSound(config: NatureSoundConfig): Promise<void> {
    if (!this.context || !this.natureGain) {
      throw new Error('AudioManager not initialized');
    }

    // Stop current nature sound if playing
    this.stopNatureSound();

    try {
      // In production, load actual audio files
      // For now, generate synthetic nature sounds
      const buffer = await this.generateNatureSound(config);
      this.natureSoundBuffer = buffer;

      // Create and configure buffer source
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.natureGain);

      // Apply intensity to volume
      this.natureGain.gain.value = this.config.natureVolume * config.intensity;

      source.start();
      this.natureSoundSource = source;

      console.log(`Nature sound started: ${config.type}`);
    } catch (error) {
      console.error('Failed to load nature sound:', error);
      throw error;
    }
  }

  /**
   * Stop nature soundscape
   */
  private stopNatureSound(): void {
    if (this.natureSoundSource) {
      this.natureSoundSource.stop();
      this.natureSoundSource.disconnect();
      this.natureSoundSource = null;
    }
  }

  /**
   * Generate synthetic nature sound (placeholder)
   * In production, replace with actual audio file loading
   */
  private async generateNatureSound(config: NatureSoundConfig): Promise<AudioBuffer> {
    if (!this.context) {
      throw new Error('AudioContext not initialized');
    }

    const sampleRate = this.context.sampleRate;
    const duration = 10; // 10 second loop
    const buffer = this.context.createBuffer(2, sampleRate * duration, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);

      // Generate noise-based soundscape
      switch (config.type) {
        case 'rain':
          this.generateRainSound(data, sampleRate);
          break;
        case 'forest':
          this.generateForestSound(data, sampleRate);
          break;
        case 'ocean':
          this.generateOceanSound(data, sampleRate);
          break;
        case 'wind':
          this.generateWindSound(data, sampleRate);
          break;
        case 'stream':
          this.generateStreamSound(data, sampleRate);
          break;
      }
    }

    return buffer;
  }

  private generateRainSound(data: Float32Array, sampleRate: number): void {
    // Pink noise for rain
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
  }

  private generateForestSound(data: Float32Array, sampleRate: number): void {
    // Low-frequency filtered noise for wind through leaves
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }
  }

  private generateOceanSound(data: Float32Array, sampleRate: number): void {
    // Slow wave modulation
    const waveFreq = 0.1;
    for (let i = 0; i < data.length; i++) {
      const wave = Math.sin(2 * Math.PI * waveFreq * i / sampleRate);
      data[i] = (Math.random() * 2 - 1) * 0.3 * (0.5 + 0.5 * wave);
    }
  }

  private generateWindSound(data: Float32Array, sampleRate: number): void {
    // Band-passed noise
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
  }

  private generateStreamSound(data: Float32Array, sampleRate: number): void {
    // High-frequency noise for babbling brook
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }
  }

  /**
   * Update binaural beat frequency based on flow state
   */
  updateBinauralFrequency(frequency: number): void {
    this.binauralBeat?.updateFrequency(frequency);
  }

  /**
   * Update ambient parameters based on flow metrics
   */
  updateAmbientParams(params: {
    filterFrequency?: number;
    reverbMix?: number;
    chorusDepth?: number;
  }): void {
    if (params.filterFrequency !== undefined) {
      this.ambientSynth?.updateFilterFrequency(params.filterFrequency);
    }
    if (params.reverbMix !== undefined) {
      this.ambientSynth?.updateReverbMix(params.reverbMix);
    }
    if (params.chorusDepth !== undefined) {
      this.ambientSynth?.updateChorusDepth(params.chorusDepth);
    }
  }

  /**
   * Master volume control
   */
  setMasterVolume(value: number): void {
    if (!this.masterGain) return;

    const clampedValue = Math.max(0, Math.min(1, value));
    this.config.masterVolume = clampedValue;

    // Smooth volume transition
    const now = this.context?.currentTime || 0;
    this.masterGain.gain.setTargetAtTime(clampedValue, now, 0.1);
  }

  /**
   * Layer volume controls
   */
  setBinauralVolume(value: number): void {
    if (!this.binauralGain) return;

    const clampedValue = Math.max(0, Math.min(1, value));
    this.config.binauralVolume = clampedValue;

    if (!this.muteState.binaural) {
      const now = this.context?.currentTime || 0;
      this.binauralGain.gain.setTargetAtTime(clampedValue, now, 0.1);
    }
  }

  setAmbientVolume(value: number): void {
    if (!this.ambientGain) return;

    const clampedValue = Math.max(0, Math.min(1, value));
    this.config.ambientVolume = clampedValue;

    if (!this.muteState.ambient) {
      const now = this.context?.currentTime || 0;
      this.ambientGain.gain.setTargetAtTime(clampedValue, now, 0.1);
    }
  }

  setNatureVolume(value: number): void {
    if (!this.natureGain) return;

    const clampedValue = Math.max(0, Math.min(1, value));
    this.config.natureVolume = clampedValue;

    if (!this.muteState.nature) {
      const now = this.context?.currentTime || 0;
      this.natureGain.gain.setTargetAtTime(clampedValue, now, 0.1);
    }
  }

  /**
   * Mute/unmute individual layers
   */
  toggleMuteBinaural(): void {
    if (!this.binauralGain || !this.context) return;

    this.muteState.binaural = !this.muteState.binaural;
    const targetVolume = this.muteState.binaural ? 0 : this.config.binauralVolume;

    this.binauralGain.gain.setTargetAtTime(targetVolume, this.context.currentTime, 0.05);
  }

  toggleMuteAmbient(): void {
    if (!this.ambientGain || !this.context) return;

    this.muteState.ambient = !this.muteState.ambient;
    const targetVolume = this.muteState.ambient ? 0 : this.config.ambientVolume;

    this.ambientGain.gain.setTargetAtTime(targetVolume, this.context.currentTime, 0.05);
  }

  toggleMuteNature(): void {
    if (!this.natureGain || !this.context) return;

    this.muteState.nature = !this.muteState.nature;
    const targetVolume = this.muteState.nature ? 0 : this.config.natureVolume;

    this.natureGain.gain.setTargetAtTime(targetVolume, this.context.currentTime, 0.05);
  }

  /**
   * Solo functionality
   */
  toggleSoloBinaural(): void {
    this.soloState.binaural = !this.soloState.binaural;
    this.updateSoloState();
  }

  toggleSoloAmbient(): void {
    this.soloState.ambient = !this.soloState.ambient;
    this.updateSoloState();
  }

  toggleSoloNature(): void {
    this.soloState.nature = !this.soloState.nature;
    this.updateSoloState();
  }

  private updateSoloState(): void {
    if (!this.context) return;

    const anySolo = this.soloState.binaural || this.soloState.ambient || this.soloState.nature;
    const now = this.context.currentTime;

    if (anySolo) {
      // Mute non-soloed layers
      if (this.binauralGain) {
        const volume = this.soloState.binaural ? this.config.binauralVolume : 0;
        this.binauralGain.gain.setTargetAtTime(volume, now, 0.05);
      }
      if (this.ambientGain) {
        const volume = this.soloState.ambient ? this.config.ambientVolume : 0;
        this.ambientGain.gain.setTargetAtTime(volume, now, 0.05);
      }
      if (this.natureGain) {
        const volume = this.soloState.nature ? this.config.natureVolume : 0;
        this.natureGain.gain.setTargetAtTime(volume, now, 0.05);
      }
    } else {
      // Restore all volumes
      if (this.binauralGain && !this.muteState.binaural) {
        this.binauralGain.gain.setTargetAtTime(this.config.binauralVolume, now, 0.05);
      }
      if (this.ambientGain && !this.muteState.ambient) {
        this.ambientGain.gain.setTargetAtTime(this.config.ambientVolume, now, 0.05);
      }
      if (this.natureGain && !this.muteState.nature) {
        this.natureGain.gain.setTargetAtTime(this.config.natureVolume, now, 0.05);
      }
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
      muteState: { ...this.muteState },
      soloState: { ...this.soloState }
    };
  }

  /**
   * Cleanup and dispose
   */
  async dispose(): Promise<void> {
    this.stop();

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    this.masterGain = null;
    this.binauralGain = null;
    this.ambientGain = null;
    this.natureGain = null;
    this.binauralBeat = null;
    this.ambientSynth = null;

    console.log('AudioManager disposed');
  }
}
