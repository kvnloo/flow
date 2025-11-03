/**
 * Adaptive Difficulty System using PID Controller
 *
 * Implements a PID (Proportional-Integral-Derivative) controller to dynamically
 * adjust difficulty thresholds based on user success rate. Maintains optimal
 * engagement by targeting 70% success rate over a sliding window.
 *
 * Based on research:
 * - 85% success rate optimal for learning
 * - 70% success rate better for sustained engagement
 * - PID control provides smooth, responsive adjustments
 */

/**
 * Configuration for the PID controller
 */
interface PIDConfig {
  /** Proportional gain - immediate response to current error */
  Kp: number;
  /** Integral gain - correction for accumulated error over time */
  Ki: number;
  /** Derivative gain - prediction based on rate of change */
  Kd: number;
  /** Target success rate (0-1 range) */
  targetRate: number;
  /** Maximum adjustment per update cycle */
  maxDelta: number;
}

/**
 * Bounds for threshold values
 */
interface ThresholdBounds {
  /** Minimum allowed threshold */
  min: number;
  /** Maximum allowed threshold */
  max: number;
}

/**
 * State of the adaptive difficulty system
 */
interface DifficultyState {
  /** Current difficulty threshold */
  threshold: number;
  /** Sliding window of recent trial results (true = success, false = failure) */
  trialWindow: boolean[];
  /** Current success rate (0-1 range) */
  successRate: number;
  /** Accumulated error for integral term */
  errorIntegral: number;
  /** Previous error for derivative term */
  previousError: number;
  /** Total number of trials processed */
  totalTrials: number;
  /** Total number of successful trials */
  totalSuccesses: number;
}

/**
 * Default PID configuration optimized for engagement
 */
const DEFAULT_PID_CONFIG: PIDConfig = {
  Kp: 0.1,   // Proportional gain
  Ki: 0.05,  // Integral gain
  Kd: 0.02,  // Derivative gain
  targetRate: 0.70,  // 70% success rate for optimal engagement
  maxDelta: 0.01     // Smooth threshold adjustments
};

/**
 * Default threshold bounds
 */
const DEFAULT_BOUNDS: ThresholdBounds = {
  min: 0.3,   // Minimum 30% threshold
  max: 0.95   // Maximum 95% threshold
};

/**
 * Sliding window size for success rate calculation
 */
const WINDOW_SIZE = 20;

/**
 * Adaptive Difficulty Controller
 *
 * Uses PID control to maintain optimal user engagement by adjusting
 * difficulty thresholds based on success rate feedback.
 */
export class AdaptiveDifficultyController {
  private config: PIDConfig;
  private bounds: ThresholdBounds;
  private state: DifficultyState;

  /**
   * Creates a new adaptive difficulty controller
   *
   * @param initialThreshold - Starting difficulty threshold (0-1 range)
   * @param config - Optional PID configuration override
   * @param bounds - Optional threshold bounds override
   */
  constructor(
    initialThreshold: number = 0.6,
    config?: Partial<PIDConfig>,
    bounds?: Partial<ThresholdBounds>
  ) {
    this.config = { ...DEFAULT_PID_CONFIG, ...config };
    this.bounds = { ...DEFAULT_BOUNDS, ...bounds };

    // Initialize state
    this.state = {
      threshold: this.clampThreshold(initialThreshold),
      trialWindow: [],
      successRate: 0,
      errorIntegral: 0,
      previousError: 0,
      totalTrials: 0,
      totalSuccesses: 0
    };
  }

  /**
   * Records a trial result and updates difficulty threshold
   *
   * @param success - Whether the trial was successful
   * @returns Updated difficulty threshold
   */
  public recordTrial(success: boolean): number {
    // Update trial window (sliding window of last 20 trials)
    this.state.trialWindow.push(success);
    if (this.state.trialWindow.length > WINDOW_SIZE) {
      this.state.trialWindow.shift();
    }

    // Update totals
    this.state.totalTrials++;
    if (success) {
      this.state.totalSuccesses++;
    }

    // Calculate success rate from sliding window
    this.state.successRate = this.calculateSuccessRate();

    // Only update threshold if we have enough data
    if (this.state.trialWindow.length >= Math.min(5, WINDOW_SIZE)) {
      this.updateThreshold();
    }

    return this.state.threshold;
  }

  /**
   * Calculates current success rate from sliding window
   *
   * @returns Success rate (0-1 range)
   */
  private calculateSuccessRate(): number {
    if (this.state.trialWindow.length === 0) {
      return 0;
    }

    const successes = this.state.trialWindow.filter(s => s).length;
    return successes / this.state.trialWindow.length;
  }

  /**
   * Updates difficulty threshold using PID controller
   *
   * PID Control Formula:
   * adjustment = Kp * error + Ki * integral + Kd * derivative
   *
   * Where:
   * - error = targetRate - currentRate
   * - integral = accumulated error over time
   * - derivative = rate of change of error
   */
  private updateThreshold(): void {
    // Calculate error (positive = too hard, negative = too easy)
    const error = this.config.targetRate - this.state.successRate;

    // Update integral term (accumulated error)
    this.state.errorIntegral += error;

    // Calculate derivative term (rate of change)
    const errorDerivative = error - this.state.previousError;

    // PID calculation
    const adjustment =
      this.config.Kp * error +                    // Proportional
      this.config.Ki * this.state.errorIntegral + // Integral
      this.config.Kd * errorDerivative;           // Derivative

    // Clamp adjustment to maxDelta for smooth transitions
    const clampedAdjustment = Math.max(
      -this.config.maxDelta,
      Math.min(this.config.maxDelta, adjustment)
    );

    // Apply adjustment (decrease threshold if too hard, increase if too easy)
    this.state.threshold = this.clampThreshold(
      this.state.threshold - clampedAdjustment
    );

    // Store error for next derivative calculation
    this.state.previousError = error;
  }

  /**
   * Clamps threshold value to configured bounds
   *
   * @param threshold - Threshold value to clamp
   * @returns Clamped threshold value
   */
  private clampThreshold(threshold: number): number {
    return Math.max(this.bounds.min, Math.min(this.bounds.max, threshold));
  }

  /**
   * Gets current difficulty threshold
   *
   * @returns Current threshold value (0-1 range)
   */
  public getThreshold(): number {
    return this.state.threshold;
  }

  /**
   * Gets current success rate
   *
   * @returns Current success rate (0-1 range)
   */
  public getSuccessRate(): number {
    return this.state.successRate;
  }

  /**
   * Gets overall success rate (all trials)
   *
   * @returns Overall success rate (0-1 range)
   */
  public getOverallSuccessRate(): number {
    if (this.state.totalTrials === 0) {
      return 0;
    }
    return this.state.totalSuccesses / this.state.totalTrials;
  }

  /**
   * Gets current PID error value
   *
   * @returns Current error (targetRate - successRate)
   */
  public getError(): number {
    return this.config.targetRate - this.state.successRate;
  }

  /**
   * Gets accumulated integral error
   *
   * @returns Integral error value
   */
  public getErrorIntegral(): number {
    return this.state.errorIntegral;
  }

  /**
   * Gets number of trials in sliding window
   *
   * @returns Number of trials (max WINDOW_SIZE)
   */
  public getWindowSize(): number {
    return this.state.trialWindow.length;
  }

  /**
   * Gets total number of trials processed
   *
   * @returns Total trial count
   */
  public getTotalTrials(): number {
    return this.state.totalTrials;
  }

  /**
   * Resets the controller state for a new session
   *
   * @param newThreshold - Optional new starting threshold
   */
  public reset(newThreshold?: number): void {
    const threshold = newThreshold !== undefined
      ? this.clampThreshold(newThreshold)
      : this.state.threshold;

    this.state = {
      threshold,
      trialWindow: [],
      successRate: 0,
      errorIntegral: 0,
      previousError: 0,
      totalTrials: 0,
      totalSuccesses: 0
    };
  }

  /**
   * Exports current state for persistence
   *
   * @returns State object that can be serialized
   */
  public exportState(): DifficultyState {
    return { ...this.state };
  }

  /**
   * Imports state from persistence
   *
   * @param state - Previously exported state
   */
  public importState(state: DifficultyState): void {
    this.state = { ...state };
  }

  /**
   * Gets diagnostic information about controller state
   *
   * @returns Object with diagnostic data
   */
  public getDiagnostics(): {
    threshold: number;
    successRate: number;
    overallSuccessRate: number;
    error: number;
    errorIntegral: number;
    windowSize: number;
    totalTrials: number;
    targetRate: number;
    bounds: ThresholdBounds;
  } {
    return {
      threshold: this.state.threshold,
      successRate: this.state.successRate,
      overallSuccessRate: this.getOverallSuccessRate(),
      error: this.getError(),
      errorIntegral: this.state.errorIntegral,
      windowSize: this.state.trialWindow.length,
      totalTrials: this.state.totalTrials,
      targetRate: this.config.targetRate,
      bounds: this.bounds
    };
  }
}

/**
 * Creates a new adaptive difficulty controller with default settings
 *
 * @param initialThreshold - Starting threshold (default: 0.6)
 * @returns New AdaptiveDifficultyController instance
 */
export function createAdaptiveDifficulty(
  initialThreshold: number = 0.6
): AdaptiveDifficultyController {
  return new AdaptiveDifficultyController(initialThreshold);
}

/**
 * Creates an adaptive difficulty controller optimized for learning (85% target)
 *
 * @param initialThreshold - Starting threshold (default: 0.5)
 * @returns New AdaptiveDifficultyController instance
 */
export function createLearningDifficulty(
  initialThreshold: number = 0.5
): AdaptiveDifficultyController {
  return new AdaptiveDifficultyController(
    initialThreshold,
    { targetRate: 0.85 }  // Higher success rate for learning
  );
}

/**
 * Creates an adaptive difficulty controller optimized for engagement (70% target)
 *
 * @param initialThreshold - Starting threshold (default: 0.6)
 * @returns New AdaptiveDifficultyController instance
 */
export function createEngagementDifficulty(
  initialThreshold: number = 0.6
): AdaptiveDifficultyController {
  return new AdaptiveDifficultyController(
    initialThreshold,
    { targetRate: 0.70 }  // Default configuration
  );
}
