/**
 * Flow Classifier Tests
 * Tests for flow state detection based on Katahira et al. (2018)
 *
 * Coverage targets:
 * - Calibration process
 * - Baseline calculation
 * - Flow detection algorithm
 * - Z-score normalization
 * - Edge cases
 */

import { FlowClassifier, CalibrationData, FlowMetrics } from '../flowClassifier';
import { BandPowerResult } from '../bandpower';

// Mock band power data generator
function createMockBandPower(
  thetaPower: number = 5,
  alphaPower: number = 10,
  betaPower: number = 15
): BandPowerResult {
  return {
    channels: {
      AF7: {
        delta: 3,
        theta: thetaPower,
        alpha: alphaPower,
        beta: betaPower,
        gamma: 2
      },
      AF8: {
        delta: 3,
        theta: thetaPower,
        alpha: alphaPower,
        beta: betaPower,
        gamma: 2
      },
      TP9: {
        delta: 3,
        theta: thetaPower,
        alpha: alphaPower,
        beta: betaPower,
        gamma: 2
      },
      TP10: {
        delta: 3,
        theta: thetaPower,
        alpha: alphaPower,
        beta: betaPower,
        gamma: 2
      }
    },
    timestamp: Date.now(),
    sampleRate: 256
  };
}

describe('FlowClassifier', () => {
  let classifier: FlowClassifier;

  beforeEach(() => {
    classifier = new FlowClassifier();
  });

  describe('Calibration Process', () => {
    it('should start with uncalibrated state', () => {
      expect(classifier.isCalibrated()).toBe(false);
    });

    it('should reset calibration buffer when startCalibration is called', () => {
      // Add some samples
      classifier.startCalibration();
      classifier.addCalibrationSample(createMockBandPower());

      // Reset
      classifier.startCalibration();
      expect(classifier.isCalibrated()).toBe(false);
    });

    it('should add calibration samples', () => {
      classifier.startCalibration();

      const sample = createMockBandPower(5, 10, 15);
      const hasEnoughSamples = classifier.addCalibrationSample(sample);

      // First sample should not be enough
      expect(hasEnoughSamples).toBe(false);
    });

    it('should indicate when minimum samples reached', () => {
      classifier.startCalibration();

      // Add 30 samples (MIN_CALIBRATION_SAMPLES)
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }

      // 30th sample should trigger ready state
      const hasEnoughSamples = classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      expect(hasEnoughSamples).toBe(true);
    });

    it('should fail to finalize with insufficient samples', () => {
      classifier.startCalibration();

      // Add only 10 samples (less than minimum)
      for (let i = 0; i < 10; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }

      const calibration = classifier.finalizeCalibration();
      expect(calibration).toBeNull();
      expect(classifier.isCalibrated()).toBe(false);
    });

    it('should successfully finalize with sufficient samples', () => {
      classifier.startCalibration();

      // Add 35 samples
      for (let i = 0; i < 35; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }

      const calibration = classifier.finalizeCalibration();
      expect(calibration).not.toBeNull();
      expect(classifier.isCalibrated()).toBe(true);
    });

    it('should load pre-existing calibration data', () => {
      const calibrationData: CalibrationData = {
        frontalThetaMean: 5.0,
        frontalThetaStd: 1.0,
        centralAlphaMean: 10.0,
        centralAlphaStd: 2.0,
        betaAlphaRatioMean: 1.5,
        betaAlphaRatioStd: 0.3,
        sampleCount: 50,
        timestamp: Date.now()
      };

      classifier.loadCalibration(calibrationData);
      expect(classifier.isCalibrated()).toBe(true);
    });
  });

  describe('Baseline Calculation', () => {
    it('should calculate correct mean for frontal theta', () => {
      classifier.startCalibration();

      // Add samples with varying theta power
      const thetaValues = [4, 5, 6, 5, 4, 6, 5, 4, 6, 5,
                           4, 5, 6, 5, 4, 6, 5, 4, 6, 5,
                           4, 5, 6, 5, 4, 6, 5, 4, 6, 5];

      for (const theta of thetaValues) {
        classifier.addCalibrationSample(createMockBandPower(theta, 10, 15));
      }

      const calibration = classifier.finalizeCalibration();
      expect(calibration).not.toBeNull();

      // Expected mean: 5.0
      expect(calibration!.frontalThetaMean).toBeCloseTo(5.0, 1);
    });

    it('should calculate correct mean for central alpha', () => {
      classifier.startCalibration();

      // Add samples with varying alpha power
      const alphaValues = [8, 10, 12, 10, 8, 12, 10, 8, 12, 10,
                           8, 10, 12, 10, 8, 12, 10, 8, 12, 10,
                           8, 10, 12, 10, 8, 12, 10, 8, 12, 10];

      for (const alpha of alphaValues) {
        classifier.addCalibrationSample(createMockBandPower(5, alpha, 15));
      }

      const calibration = classifier.finalizeCalibration();
      expect(calibration).not.toBeNull();

      // Expected mean: 10.0
      expect(calibration!.centralAlphaMean).toBeCloseTo(10.0, 1);
    });

    it('should calculate correct mean for beta/alpha ratio', () => {
      classifier.startCalibration();

      // Beta=15, Alpha=10 → ratio = 1.5
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }

      const calibration = classifier.finalizeCalibration();
      expect(calibration).not.toBeNull();

      // Expected mean: 1.5
      expect(calibration!.betaAlphaRatioMean).toBeCloseTo(1.5, 1);
    });

    it('should calculate standard deviation correctly', () => {
      classifier.startCalibration();

      // Add samples with known variance
      const thetaValues = [3, 4, 5, 6, 7, 3, 4, 5, 6, 7,
                           3, 4, 5, 6, 7, 3, 4, 5, 6, 7,
                           3, 4, 5, 6, 7, 3, 4, 5, 6, 7];

      for (const theta of thetaValues) {
        classifier.addCalibrationSample(createMockBandPower(theta, 10, 15));
      }

      const calibration = classifier.finalizeCalibration();
      expect(calibration).not.toBeNull();

      // Expected std for [3,4,5,6,7] repeating: ~1.41
      expect(calibration!.frontalThetaStd).toBeGreaterThan(1.0);
      expect(calibration!.frontalThetaStd).toBeLessThan(2.0);
    });

    it('should store sample count in calibration data', () => {
      classifier.startCalibration();

      const sampleCount = 40;
      for (let i = 0; i < sampleCount; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }

      const calibration = classifier.finalizeCalibration();
      expect(calibration).not.toBeNull();
      expect(calibration!.sampleCount).toBe(sampleCount);
    });

    it('should store timestamp in calibration data', () => {
      classifier.startCalibration();

      const beforeTime = Date.now();

      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }

      const calibration = classifier.finalizeCalibration();
      const afterTime = Date.now();

      expect(calibration).not.toBeNull();
      expect(calibration!.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(calibration!.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Flow Detection Algorithm', () => {
    beforeEach(() => {
      // Setup baseline calibration
      classifier.startCalibration();

      // Baseline: theta=5, alpha=10, beta=15
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }

      classifier.finalizeCalibration();
    });

    it('should return null when not calibrated', () => {
      const uncalibrated = new FlowClassifier();
      const result = uncalibrated.classifyFlow(createMockBandPower());

      expect(result).toBeNull();
    });

    it('should return FlowMetrics when calibrated', () => {
      const result = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('flowScore');
      expect(result).toHaveProperty('cognitiveLoad');
      expect(result).toHaveProperty('attention');
      expect(result).toHaveProperty('relaxation');
      expect(result).toHaveProperty('motivation');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('confidence');
    });

    it('should detect increased frontal theta as higher attention', () => {
      // Baseline state (theta=5)
      const baseline = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      // Increased theta (>1.2x baseline = 6+)
      const highTheta = classifier.classifyFlow(createMockBandPower(7, 10, 15));

      expect(highTheta).not.toBeNull();
      expect(baseline).not.toBeNull();
      expect(highTheta!.attention).toBeGreaterThan(baseline!.attention);
    });

    it('should detect moderate alpha as optimal relaxation', () => {
      // Very low alpha (below 0.8x baseline = <8)
      const lowAlpha = classifier.classifyFlow(createMockBandPower(5, 5, 15));

      // Optimal alpha (0.8-1.2x baseline = 8-12)
      const optimalAlpha = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      // Very high alpha (above 1.2x baseline = >12)
      const highAlpha = classifier.classifyFlow(createMockBandPower(5, 15, 15));

      expect(optimalAlpha).not.toBeNull();
      expect(lowAlpha).not.toBeNull();
      expect(highAlpha).not.toBeNull();

      // Moderate alpha should have higher relaxation score
      expect(optimalAlpha!.relaxation).toBeGreaterThan(lowAlpha!.relaxation);
      expect(optimalAlpha!.relaxation).toBeGreaterThan(highAlpha!.relaxation);
    });

    it('should detect flow state with Katahira criteria', () => {
      // Flow criteria: theta >1.2x baseline, alpha 0.8-1.2x baseline
      // Baseline: theta=5, alpha=10

      // Flow state: theta=7 (1.4x), alpha=11 (1.1x)
      const flowState = classifier.classifyFlow(createMockBandPower(7, 11, 15));

      // Non-flow: theta=4 (0.8x), alpha=15 (1.5x)
      const nonFlowState = classifier.classifyFlow(createMockBandPower(4, 15, 15));

      expect(flowState).not.toBeNull();
      expect(nonFlowState).not.toBeNull();

      // Flow state should have higher flow score
      expect(flowState!.flowScore).toBeGreaterThan(nonFlowState!.flowScore);
    });

    it('should normalize flow score to 0-1 range', () => {
      const result = classifier.classifyFlow(createMockBandPower(7, 11, 15));

      expect(result).not.toBeNull();
      expect(result!.flowScore).toBeGreaterThanOrEqual(0);
      expect(result!.flowScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Theta/Alpha Ratio Calculation', () => {
    beforeEach(() => {
      classifier.startCalibration();
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }
      classifier.finalizeCalibration();
    });

    it('should calculate theta/alpha balance correctly', () => {
      const result = classifier.classifyFlow(createMockBandPower(8, 4, 15));

      expect(result).not.toBeNull();
      expect(result!.components.thetaAlphaBalance).toBeCloseTo(8 / 4, 1);
    });

    it('should handle zero alpha gracefully', () => {
      const result = classifier.classifyFlow(createMockBandPower(8, 0, 15));

      expect(result).not.toBeNull();
      // Should use small epsilon to avoid division by zero
      expect(result!.components.thetaAlphaBalance).toBeGreaterThan(0);
      expect(isFinite(result!.components.thetaAlphaBalance)).toBe(true);
    });

    it('should show higher theta/alpha ratio in flow state', () => {
      // Low ratio: low theta, high alpha
      const lowRatio = classifier.classifyFlow(createMockBandPower(3, 12, 15));

      // High ratio: high theta, moderate alpha
      const highRatio = classifier.classifyFlow(createMockBandPower(8, 10, 15));

      expect(lowRatio).not.toBeNull();
      expect(highRatio).not.toBeNull();
      expect(highRatio!.components.thetaAlphaBalance).toBeGreaterThan(
        lowRatio!.components.thetaAlphaBalance
      );
    });
  });

  describe('Frontal Asymmetry (AF7 vs AF8)', () => {
    beforeEach(() => {
      classifier.startCalibration();
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }
      classifier.finalizeCalibration();
    });

    it('should calculate alpha asymmetry for motivation', () => {
      const bandPower: BandPowerResult = {
        channels: {
          AF7: { delta: 3, theta: 5, alpha: 8, beta: 15, gamma: 2 },  // Left frontal
          AF8: { delta: 3, theta: 5, alpha: 12, beta: 15, gamma: 2 }, // Right frontal
          TP9: { delta: 3, theta: 5, alpha: 10, beta: 15, gamma: 2 },
          TP10: { delta: 3, theta: 5, alpha: 10, beta: 15, gamma: 2 }
        },
        timestamp: Date.now(),
        sampleRate: 256
      };

      const result = classifier.classifyFlow(bandPower);

      expect(result).not.toBeNull();
      // Right (12) - Left (8) = 4 (positive = approach motivation)
      expect(result!.components.alphaAsymmetry).toBeCloseTo(4, 1);
    });

    it('should indicate approach motivation with positive asymmetry', () => {
      // Higher right alpha = approach
      const approachBandPower: BandPowerResult = {
        channels: {
          AF7: { delta: 3, theta: 5, alpha: 8, beta: 15, gamma: 2 },
          AF8: { delta: 3, theta: 5, alpha: 12, beta: 15, gamma: 2 },
          TP9: { delta: 3, theta: 5, alpha: 10, beta: 15, gamma: 2 },
          TP10: { delta: 3, theta: 5, alpha: 10, beta: 15, gamma: 2 }
        },
        timestamp: Date.now(),
        sampleRate: 256
      };

      const result = classifier.classifyFlow(approachBandPower);

      expect(result).not.toBeNull();
      expect(result!.motivation).toBeGreaterThan(0.5); // Normalized positive
    });

    it('should indicate withdrawal motivation with negative asymmetry', () => {
      // Higher left alpha = withdrawal
      const withdrawalBandPower: BandPowerResult = {
        channels: {
          AF7: { delta: 3, theta: 5, alpha: 12, beta: 15, gamma: 2 },
          AF8: { delta: 3, theta: 5, alpha: 8, beta: 15, gamma: 2 },
          TP9: { delta: 3, theta: 5, alpha: 10, beta: 15, gamma: 2 },
          TP10: { delta: 3, theta: 5, alpha: 10, beta: 15, gamma: 2 }
        },
        timestamp: Date.now(),
        sampleRate: 256
      };

      const result = classifier.classifyFlow(withdrawalBandPower);

      expect(result).not.toBeNull();
      expect(result!.motivation).toBeLessThan(0.5); // Normalized negative
    });
  });

  describe('Cognitive Load (Beta/Alpha Ratio)', () => {
    beforeEach(() => {
      classifier.startCalibration();
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }
      classifier.finalizeCalibration();
    });

    it('should calculate beta/alpha ratio', () => {
      const result = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      expect(result).not.toBeNull();
      // Beta=15, Alpha=10 → ratio = 1.5
      expect(result!.components.betaAlphaRatio).toBeCloseTo(0, 1); // Z-scored around baseline
    });

    it('should target optimal cognitive load at 0.4-0.6', () => {
      // Test with beta/alpha ratio near baseline (optimal)
      const optimalResult = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      expect(optimalResult).not.toBeNull();
      expect(optimalResult!.cognitiveLoad).toBeGreaterThanOrEqual(0.4);
      expect(optimalResult!.cognitiveLoad).toBeLessThanOrEqual(0.6);
    });

    it('should penalize very low cognitive load', () => {
      // Very low beta = low cognitive engagement
      const lowLoad = classifier.classifyFlow(createMockBandPower(5, 10, 5));
      const optimalLoad = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      expect(lowLoad).not.toBeNull();
      expect(optimalLoad).not.toBeNull();
      expect(optimalLoad!.cognitiveLoad).toBeGreaterThan(lowLoad!.cognitiveLoad);
    });

    it('should penalize very high cognitive load', () => {
      // Very high beta = cognitive overload
      const highLoad = classifier.classifyFlow(createMockBandPower(5, 10, 30));
      const optimalLoad = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      expect(highLoad).not.toBeNull();
      expect(optimalLoad).not.toBeNull();
      expect(optimalLoad!.cognitiveLoad).toBeGreaterThan(highLoad!.cognitiveLoad);
    });

    it('should normalize cognitive load to 0-1 range', () => {
      const result = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      expect(result).not.toBeNull();
      expect(result!.cognitiveLoad).toBeGreaterThanOrEqual(0);
      expect(result!.cognitiveLoad).toBeLessThanOrEqual(1);
    });
  });

  describe('Z-Score Normalization', () => {
    beforeEach(() => {
      classifier.startCalibration();

      // Create baseline with known stats
      // Mean theta = 5, std = 2
      const thetaValues = [3, 4, 5, 6, 7];
      for (let i = 0; i < 6; i++) {
        for (const theta of thetaValues) {
          classifier.addCalibrationSample(createMockBandPower(theta, 10, 15));
        }
      }

      classifier.finalizeCalibration();
    });

    it('should calculate z-score correctly', () => {
      // Baseline: mean=5, std≈1.41
      // Value: 7
      // Z-score: (7-5)/1.41 ≈ 1.42

      const result = classifier.classifyFlow(createMockBandPower(7, 10, 15));

      expect(result).not.toBeNull();
      expect(result!.components.frontalTheta).toBeGreaterThan(1.0);
      expect(result!.components.frontalTheta).toBeLessThan(2.0);
    });

    it('should handle zero standard deviation gracefully', () => {
      // Create uniform calibration
      const uniform = new FlowClassifier();
      uniform.startCalibration();

      for (let i = 0; i < 30; i++) {
        uniform.addCalibrationSample(createMockBandPower(5, 10, 15));
      }

      uniform.finalizeCalibration();

      // Should not crash with std=0
      const result = uniform.classifyFlow(createMockBandPower(5, 10, 15));

      expect(result).not.toBeNull();
      expect(isFinite(result!.components.frontalTheta)).toBe(true);
    });

    it('should normalize positive deviations', () => {
      const result = classifier.classifyFlow(createMockBandPower(8, 10, 15));

      expect(result).not.toBeNull();
      // Value above mean should have positive z-score
      expect(result!.components.frontalTheta).toBeGreaterThan(0);
    });

    it('should normalize negative deviations', () => {
      const result = classifier.classifyFlow(createMockBandPower(3, 10, 15));

      expect(result).not.toBeNull();
      // Value below mean should have negative z-score
      expect(result!.components.frontalTheta).toBeLessThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing channels gracefully', () => {
      classifier.startCalibration();
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }
      classifier.finalizeCalibration();

      // Band power with only 2 channels
      const partialBandPower: BandPowerResult = {
        channels: {
          AF7: { delta: 3, theta: 5, alpha: 10, beta: 15, gamma: 2 },
          AF8: { delta: 3, theta: 5, alpha: 10, beta: 15, gamma: 2 }
        },
        timestamp: Date.now(),
        sampleRate: 256
      };

      const result = classifier.classifyFlow(partialBandPower);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeLessThan(1); // Lower confidence
    });

    it('should handle empty band power channels', () => {
      classifier.startCalibration();
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }
      classifier.finalizeCalibration();

      const emptyBandPower: BandPowerResult = {
        channels: {},
        timestamp: Date.now(),
        sampleRate: 256
      };

      const result = classifier.classifyFlow(emptyBandPower);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(0); // Zero confidence
    });

    it('should handle extreme values without crashing', () => {
      classifier.startCalibration();
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }
      classifier.finalizeCalibration();

      // Extreme values
      const extremeBandPower = createMockBandPower(1000, 0.001, 10000);

      const result = classifier.classifyFlow(extremeBandPower);

      expect(result).not.toBeNull();
      expect(isFinite(result!.flowScore)).toBe(true);
      expect(isFinite(result!.cognitiveLoad)).toBe(true);
    });

    it('should maintain confidence based on sample count', () => {
      // Low sample count
      classifier.startCalibration();
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }
      classifier.finalizeCalibration();

      const lowSampleResult = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      // High sample count
      const highSampleClassifier = new FlowClassifier();
      highSampleClassifier.startCalibration();
      for (let i = 0; i < 100; i++) {
        highSampleClassifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }
      highSampleClassifier.finalizeCalibration();

      const highSampleResult = highSampleClassifier.classifyFlow(createMockBandPower(5, 10, 15));

      expect(lowSampleResult).not.toBeNull();
      expect(highSampleResult).not.toBeNull();
      expect(highSampleResult!.confidence).toBeGreaterThanOrEqual(lowSampleResult!.confidence);
    });

    it('should handle calibration with varying data', () => {
      classifier.startCalibration();

      // Add highly variable samples
      for (let i = 0; i < 30; i++) {
        const theta = 3 + Math.random() * 10;
        const alpha = 5 + Math.random() * 15;
        const beta = 10 + Math.random() * 20;
        classifier.addCalibrationSample(createMockBandPower(theta, alpha, beta));
      }

      const calibration = classifier.finalizeCalibration();

      expect(calibration).not.toBeNull();
      expect(calibration!.frontalThetaStd).toBeGreaterThan(0);
      expect(calibration!.centralAlphaStd).toBeGreaterThan(0);
    });
  });

  describe('Component Metrics', () => {
    beforeEach(() => {
      classifier.startCalibration();
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }
      classifier.finalizeCalibration();
    });

    it('should normalize attention to 0-1 range', () => {
      const result = classifier.classifyFlow(createMockBandPower(7, 10, 15));

      expect(result).not.toBeNull();
      expect(result!.attention).toBeGreaterThanOrEqual(0);
      expect(result!.attention).toBeLessThanOrEqual(1);
    });

    it('should normalize relaxation to 0-1 range', () => {
      const result = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      expect(result).not.toBeNull();
      expect(result!.relaxation).toBeGreaterThanOrEqual(0);
      expect(result!.relaxation).toBeLessThanOrEqual(1);
    });

    it('should normalize motivation to 0-1 range', () => {
      const result = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      expect(result).not.toBeNull();
      expect(result!.motivation).toBeGreaterThanOrEqual(0);
      expect(result!.motivation).toBeLessThanOrEqual(1);
    });

    it('should provide all component raw scores', () => {
      const result = classifier.classifyFlow(createMockBandPower(5, 10, 15));

      expect(result).not.toBeNull();
      expect(result!.components).toHaveProperty('frontalTheta');
      expect(result!.components).toHaveProperty('centralAlpha');
      expect(result!.components).toHaveProperty('thetaAlphaBalance');
      expect(result!.components).toHaveProperty('betaAlphaRatio');
      expect(result!.components).toHaveProperty('alphaAsymmetry');
    });
  });

  describe('Threshold Validation', () => {
    beforeEach(() => {
      classifier.startCalibration();
      // Baseline: theta=5, alpha=10
      for (let i = 0; i < 30; i++) {
        classifier.addCalibrationSample(createMockBandPower(5, 10, 15));
      }
      classifier.finalizeCalibration();
    });

    it('should detect theta >1.2x baseline as flow indicator', () => {
      // Baseline theta = 5
      // 1.2x baseline = 6

      const belowThreshold = classifier.classifyFlow(createMockBandPower(5.5, 10, 15));
      const aboveThreshold = classifier.classifyFlow(createMockBandPower(7, 10, 15));

      expect(belowThreshold).not.toBeNull();
      expect(aboveThreshold).not.toBeNull();

      // Above threshold should have higher attention
      expect(aboveThreshold!.attention).toBeGreaterThan(belowThreshold!.attention);
    });

    it('should detect alpha 0.8-1.2x baseline as optimal', () => {
      // Baseline alpha = 10
      // Optimal range: 8-12

      const tooLow = classifier.classifyFlow(createMockBandPower(5, 6, 15));
      const optimal = classifier.classifyFlow(createMockBandPower(5, 10, 15));
      const tooHigh = classifier.classifyFlow(createMockBandPower(5, 14, 15));

      expect(tooLow).not.toBeNull();
      expect(optimal).not.toBeNull();
      expect(tooHigh).not.toBeNull();

      // Optimal should have best relaxation score
      expect(optimal!.relaxation).toBeGreaterThanOrEqual(tooLow!.relaxation);
      expect(optimal!.relaxation).toBeGreaterThanOrEqual(tooHigh!.relaxation);
    });
  });

  describe('Integration Test', () => {
    it('should complete full calibration and classification workflow', () => {
      // 1. Start calibration
      classifier.startCalibration();
      expect(classifier.isCalibrated()).toBe(false);

      // 2. Add samples
      for (let i = 0; i < 35; i++) {
        const theta = 4 + Math.random() * 2; // 4-6
        const alpha = 9 + Math.random() * 2; // 9-11
        const beta = 14 + Math.random() * 2; // 14-16
        classifier.addCalibrationSample(createMockBandPower(theta, alpha, beta));
      }

      // 3. Finalize calibration
      const calibration = classifier.finalizeCalibration();
      expect(calibration).not.toBeNull();
      expect(classifier.isCalibrated()).toBe(true);

      // 4. Classify baseline state
      const baselineState = classifier.classifyFlow(createMockBandPower(5, 10, 15));
      expect(baselineState).not.toBeNull();

      // 5. Classify flow state
      const flowState = classifier.classifyFlow(createMockBandPower(7, 11, 15));
      expect(flowState).not.toBeNull();

      // 6. Verify flow state has higher score
      expect(flowState!.flowScore).toBeGreaterThan(baselineState!.flowScore);

      // 7. Verify all metrics are in valid range
      expect(flowState!.flowScore).toBeGreaterThanOrEqual(0);
      expect(flowState!.flowScore).toBeLessThanOrEqual(1);
      expect(flowState!.cognitiveLoad).toBeGreaterThanOrEqual(0);
      expect(flowState!.cognitiveLoad).toBeLessThanOrEqual(1);
      expect(flowState!.attention).toBeGreaterThanOrEqual(0);
      expect(flowState!.attention).toBeLessThanOrEqual(1);
      expect(flowState!.relaxation).toBeGreaterThanOrEqual(0);
      expect(flowState!.relaxation).toBeLessThanOrEqual(1);
      expect(flowState!.motivation).toBeGreaterThanOrEqual(0);
      expect(flowState!.motivation).toBeLessThanOrEqual(1);
      expect(flowState!.confidence).toBeGreaterThanOrEqual(0);
      expect(flowState!.confidence).toBeLessThanOrEqual(1);
    });
  });
});
