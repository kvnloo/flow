/**
 * Flow State Classifier
 * Based on Katahira et al. (2018) - EEG Correlates of Flow State
 *
 * Key Principles:
 * - Increased frontal theta (4-8Hz) during flow
 * - Moderate central alpha (8-12Hz) for relaxed focus
 * - Theta/alpha balance indicates flow engagement
 * - Alpha asymmetry reflects motivation (approach vs withdrawal)
 * - Cognitive load from beta/alpha ratio (NOT success rate)
 */

import { BandPowerResult } from './bandpower';

export interface FlowMetrics {
  // Primary flow indicator (0-1, higher = more flow)
  flowScore: number;

  // Component metrics
  cognitiveLoad: number;    // 0-1, optimal around 0.4-0.6
  attention: number;        // 0-1, frontal theta engagement
  relaxation: number;       // 0-1, central alpha presence

  // Alpha asymmetry (-1 to 1, positive = approach motivation)
  motivation: number;

  // Raw component scores for debugging
  components: {
    frontalTheta: number;     // Z-scored
    centralAlpha: number;     // Z-scored
    thetaAlphaBalance: number; // Ratio
    betaAlphaRatio: number;   // For cognitive load
    alphaAsymmetry: number;   // Left - Right frontal alpha
  };

  // Confidence in classification
  confidence: number;
}

export interface CalibrationData {
  frontalThetaMean: number;
  frontalThetaStd: number;
  centralAlphaMean: number;
  centralAlphaStd: number;
  betaAlphaRatioMean: number;
  betaAlphaRatioStd: number;
  sampleCount: number;
  timestamp: number;
}

export class FlowClassifier {
  private calibration: CalibrationData | null = null;
  private calibrationBuffer: {
    frontalTheta: number[];
    centralAlpha: number[];
    betaAlphaRatio: number[];
  } = {
    frontalTheta: [],
    centralAlpha: [],
    betaAlphaRatio: []
  };

  // Calibration parameters
  private readonly CALIBRATION_DURATION_MS = 120000; // 2 minutes
  private readonly CALIBRATION_SAMPLE_RATE = 256; // Hz
  private readonly MIN_CALIBRATION_SAMPLES = 30;

  // Channel mapping for Muse 2
  private readonly FRONTAL_CHANNELS = ['AF7', 'AF8']; // Frontal theta
  private readonly CENTRAL_CHANNELS = ['TP9', 'TP10']; // Central alpha
  private readonly LEFT_FRONTAL = ['AF7']; // For asymmetry
  private readonly RIGHT_FRONTAL = ['AF8']; // For asymmetry

  constructor() {}

  /**
   * Start calibration baseline collection
   * User should be in relaxed, neutral state for 2 minutes
   */
  startCalibration(): void {
    this.calibrationBuffer = {
      frontalTheta: [],
      centralAlpha: [],
      betaAlphaRatio: []
    };
    this.calibration = null;
  }

  /**
   * Add sample to calibration baseline
   */
  addCalibrationSample(bandPowers: BandPowerResult): boolean {
    const frontalTheta = this.computeFrontalTheta(bandPowers);
    const centralAlpha = this.computeCentralAlpha(bandPowers);
    const betaAlphaRatio = this.computeBetaAlphaRatio(bandPowers);

    this.calibrationBuffer.frontalTheta.push(frontalTheta);
    this.calibrationBuffer.centralAlpha.push(centralAlpha);
    this.calibrationBuffer.betaAlphaRatio.push(betaAlphaRatio);

    return this.calibrationBuffer.frontalTheta.length >= this.MIN_CALIBRATION_SAMPLES;
  }

  /**
   * Finalize calibration and compute baseline statistics
   */
  finalizeCalibration(): CalibrationData | null {
    if (this.calibrationBuffer.frontalTheta.length < this.MIN_CALIBRATION_SAMPLES) {
      return null;
    }

    this.calibration = {
      frontalThetaMean: this.mean(this.calibrationBuffer.frontalTheta),
      frontalThetaStd: this.std(this.calibrationBuffer.frontalTheta),
      centralAlphaMean: this.mean(this.calibrationBuffer.centralAlpha),
      centralAlphaStd: this.std(this.calibrationBuffer.centralAlpha),
      betaAlphaRatioMean: this.mean(this.calibrationBuffer.betaAlphaRatio),
      betaAlphaRatioStd: this.std(this.calibrationBuffer.betaAlphaRatio),
      sampleCount: this.calibrationBuffer.frontalTheta.length,
      timestamp: Date.now()
    };

    return this.calibration;
  }

  /**
   * Load previously saved calibration
   */
  loadCalibration(data: CalibrationData): void {
    this.calibration = data;
  }

  /**
   * Check if classifier is calibrated
   */
  isCalibrated(): boolean {
    return this.calibration !== null;
  }

  /**
   * Classify flow state from current band powers
   * Requires prior calibration
   */
  classifyFlow(bandPowers: BandPowerResult): FlowMetrics | null {
    if (!this.calibration) {
      return null;
    }

    // Compute raw features
    const frontalTheta = this.computeFrontalTheta(bandPowers);
    const centralAlpha = this.computeCentralAlpha(bandPowers);
    const betaAlphaRatio = this.computeBetaAlphaRatio(bandPowers);
    const alphaAsymmetry = this.computeAlphaAsymmetry(bandPowers);

    // Z-score normalization relative to baseline
    const frontalThetaZ = this.zscore(
      frontalTheta,
      this.calibration.frontalThetaMean,
      this.calibration.frontalThetaStd
    );

    const centralAlphaZ = this.zscore(
      centralAlpha,
      this.calibration.centralAlphaMean,
      this.calibration.centralAlphaStd
    );

    const betaAlphaRatioZ = this.zscore(
      betaAlphaRatio,
      this.calibration.betaAlphaRatioMean,
      this.calibration.betaAlphaRatioStd
    );

    // Theta/Alpha balance (flow indicator)
    const thetaAlphaBalance = frontalTheta / (centralAlpha + 1e-6);

    // Component metrics (0-1 normalized)
    const attention = this.sigmoid(frontalThetaZ); // High theta = high attention
    const relaxation = this.sigmoid(centralAlphaZ); // High alpha = relaxed focus

    // Cognitive load: optimal around 0.4-0.6 (inverted U-curve)
    // Based on beta/alpha ratio (NOT success rate!)
    const cognitiveLoad = this.computeCognitiveLoad(betaAlphaRatioZ);

    // Motivation: positive = approach, negative = withdrawal
    const motivation = this.normalize(alphaAsymmetry, -2, 2);

    // Flow score: weighted combination
    // Flow = high frontal theta + moderate central alpha + optimal cognitive load
    const flowScore = this.computeFlowScore(
      frontalThetaZ,
      centralAlphaZ,
      betaAlphaRatioZ,
      thetaAlphaBalance
    );

    // Confidence based on signal quality and calibration
    const confidence = this.computeConfidence(bandPowers);

    return {
      flowScore,
      cognitiveLoad,
      attention,
      relaxation,
      motivation,
      components: {
        frontalTheta: frontalThetaZ,
        centralAlpha: centralAlphaZ,
        thetaAlphaBalance,
        betaAlphaRatio: betaAlphaRatioZ,
        alphaAsymmetry
      },
      confidence
    };
  }

  /**
   * Compute frontal theta (average of AF7 + AF8)
   */
  private computeFrontalTheta(bandPowers: BandPowerResult): number {
    const powers: number[] = [];

    for (const channel of this.FRONTAL_CHANNELS) {
      if (bandPowers.channels[channel]) {
        powers.push(bandPowers.channels[channel].theta);
      }
    }

    return powers.length > 0 ? this.mean(powers) : 0;
  }

  /**
   * Compute central alpha (average of all channels)
   */
  private computeCentralAlpha(bandPowers: BandPowerResult): number {
    const powers: number[] = [];

    for (const channel of this.CENTRAL_CHANNELS) {
      if (bandPowers.channels[channel]) {
        powers.push(bandPowers.channels[channel].alpha);
      }
    }

    return powers.length > 0 ? this.mean(powers) : 0;
  }

  /**
   * Compute beta/alpha ratio for cognitive load
   * NOT success rate - this is EEG-based cognitive load!
   */
  private computeBetaAlphaRatio(bandPowers: BandPowerResult): number {
    const ratios: number[] = [];

    for (const channel of Object.keys(bandPowers.channels)) {
      const ch = bandPowers.channels[channel];
      if (ch) {
        ratios.push(ch.beta / (ch.alpha + 1e-6));
      }
    }

    return ratios.length > 0 ? this.mean(ratios) : 0;
  }

  /**
   * Compute alpha asymmetry (left - right frontal alpha)
   * Positive = approach motivation, Negative = withdrawal
   */
  private computeAlphaAsymmetry(bandPowers: BandPowerResult): number {
    let leftAlpha = 0;
    let rightAlpha = 0;

    for (const channel of this.LEFT_FRONTAL) {
      if (bandPowers.channels[channel]) {
        leftAlpha += bandPowers.channels[channel].alpha;
      }
    }

    for (const channel of this.RIGHT_FRONTAL) {
      if (bandPowers.channels[channel]) {
        rightAlpha += bandPowers.channels[channel].alpha;
      }
    }

    leftAlpha /= this.LEFT_FRONTAL.length;
    rightAlpha /= this.RIGHT_FRONTAL.length;

    // Right - Left (inverted) because alpha is inversely related to activity
    return rightAlpha - leftAlpha;
  }

  /**
   * Compute cognitive load from beta/alpha ratio
   * Optimal load around 0.4-0.6 (inverted U-curve)
   */
  private computeCognitiveLoad(betaAlphaRatioZ: number): number {
    // Map z-score to 0-1 range with optimal around 0.5
    const load = this.sigmoid(betaAlphaRatioZ);

    // Penalize extremes (too low or too high is suboptimal)
    const optimalDistance = Math.abs(load - 0.5) * 2;
    return 1 - optimalDistance;
  }

  /**
   * Compute overall flow score
   * Flow = high frontal theta + moderate alpha + optimal cognitive load
   */
  private computeFlowScore(
    frontalThetaZ: number,
    centralAlphaZ: number,
    betaAlphaRatioZ: number,
    thetaAlphaBalance: number
  ): number {
    // Attention component (high theta is good)
    const attentionScore = this.sigmoid(frontalThetaZ);

    // Relaxation component (moderate alpha is good, too high or low is bad)
    const relaxationScore = 1 - Math.abs(this.sigmoid(centralAlphaZ) - 0.5) * 2;

    // Cognitive load (optimal around 0.5)
    const loadScore = this.computeCognitiveLoad(betaAlphaRatioZ);

    // Theta/alpha balance (higher is better for flow)
    const balanceScore = Math.min(thetaAlphaBalance / 2, 1);

    // Weighted combination
    const flowScore = (
      attentionScore * 0.35 +      // 35% attention (frontal theta)
      relaxationScore * 0.25 +     // 25% relaxation (central alpha)
      loadScore * 0.25 +           // 25% optimal cognitive load
      balanceScore * 0.15          // 15% theta/alpha balance
    );

    return Math.max(0, Math.min(1, flowScore));
  }

  /**
   * Compute confidence in classification
   */
  private computeConfidence(bandPowers: BandPowerResult): number {
    const channelCount = Object.keys(bandPowers.channels).length;
    const expectedChannels = 4; // Muse 2 has 4 channels

    // Confidence based on available channels
    const channelConfidence = channelCount / expectedChannels;

    // Confidence based on calibration sample count
    const calibrationConfidence = this.calibration
      ? Math.min(this.calibration.sampleCount / 100, 1)
      : 0;

    return (channelConfidence + calibrationConfidence) / 2;
  }

  /**
   * Compute z-score: (x - mean) / std
   */
  private zscore(x: number, mean: number, std: number): number {
    return std > 0 ? (x - mean) / std : 0;
  }

  /**
   * Sigmoid activation: 1 / (1 + e^(-x))
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Normalize value to [0, 1] range
   */
  private normalize(x: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (x - min) / (max - min)));
  }

  /**
   * Compute mean of array
   */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Compute standard deviation of array
   */
  private std(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }
}
