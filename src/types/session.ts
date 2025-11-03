/**
 * Session Management Type Definitions
 *
 * Complete TypeScript interfaces for session state management,
 * configuration, calibration, and metrics tracking in the Flow framework.
 */

/**
 * Flow state levels indicating current cognitive/productivity state
 */
export type FlowStateLevel =
  | 'deep-flow'      // Peak performance, full immersion
  | 'flow'           // High engagement, strong focus
  | 'focused'        // Good attention, productive
  | 'normal'         // Standard working state
  | 'distracted'     // Reduced focus, interruptions
  | 'blocked';       // Stuck, unable to progress

/**
 * Session phases tracking work progression
 */
export type SessionPhase =
  | 'calibration'    // Initial calibration period
  | 'warmup'         // Ramping up to full productivity
  | 'active'         // Main working phase
  | 'cooldown'       // Winding down
  | 'break'          // Scheduled break
  | 'complete';      // Session finished

/**
 * Task complexity levels for workload assessment
 */
export type TaskComplexity =
  | 'trivial'        // < 5 minutes, routine
  | 'simple'         // 5-15 minutes, straightforward
  | 'moderate'       // 15-45 minutes, standard
  | 'complex'        // 45-120 minutes, challenging
  | 'expert';        // > 120 minutes, highly complex

/**
 * Interruption types for context switching analysis
 */
export type InterruptionType =
  | 'external'       // Outside interruptions (chat, call, etc.)
  | 'internal'       // Self-interruptions (context switch, distraction)
  | 'planned'        // Scheduled breaks/transitions
  | 'system';        // Tool/system notifications

/**
 * Core session state capturing current work context
 */
export interface SessionState {
  /** Unique session identifier */
  sessionId: string;

  /** Session start timestamp */
  startTime: Date;

  /** Last activity timestamp */
  lastActivity: Date;

  /** Current session phase */
  phase: SessionPhase;

  /** Current flow state level */
  flowState: FlowStateLevel;

  /** Whether session is currently active */
  isActive: boolean;

  /** Current task being worked on */
  currentTask?: {
    id: string;
    description: string;
    complexity: TaskComplexity;
    startTime: Date;
    estimatedDuration?: number; // minutes
  };

  /** Context stack for nested work */
  contextStack: Array<{
    type: 'task' | 'file' | 'function' | 'debug';
    identifier: string;
    enteredAt: Date;
  }>;

  /** Active file being edited */
  activeFile?: {
    path: string;
    language: string;
    linesChanged: number;
    openedAt: Date;
  };

  /** Recent interruptions */
  interruptions: Array<{
    type: InterruptionType;
    timestamp: Date;
    duration?: number; // seconds
    recoveryTime?: number; // seconds
  }>;
}

/**
 * Session configuration and preferences
 */
export interface SessionConfig {
  /** Target session duration in minutes */
  targetDuration: number;

  /** Calibration period duration in minutes */
  calibrationDuration: number;

  /** Break interval in minutes (0 = no scheduled breaks) */
  breakInterval: number;

  /** Break duration in minutes */
  breakDuration: number;

  /** Enable automatic flow state detection */
  autoFlowDetection: boolean;

  /** Minimum activity threshold for flow state (actions/minute) */
  flowThreshold: number;

  /** Enable interruption tracking */
  trackInterruptions: boolean;

  /** Enable context switching analysis */
  trackContextSwitching: boolean;

  /** Session goals/objectives */
  goals?: string[];

  /** Preferred working style */
  workingStyle?: {
    preferredFlowDuration: number; // minutes
    preferredTaskComplexity: TaskComplexity;
    preferredBreakFrequency: number; // per hour
  };

  /** Notification preferences */
  notifications?: {
    flowStateChanges: boolean;
    breakReminders: boolean;
    goalProgress: boolean;
    sessionSummary: boolean;
  };
}

/**
 * Calibration data from initial observation period
 */
export interface CalibrationData {
  /** When calibration was performed */
  calibratedAt: Date;

  /** Calibration duration in minutes */
  duration: number;

  /** Baseline typing speed (characters per minute) */
  baselineTypingSpeed: number;

  /** Baseline code velocity (lines per minute) */
  baselineCodeVelocity: number;

  /** Average time between actions (seconds) */
  averageActionInterval: number;

  /** Detected working patterns */
  patterns: {
    /** Average focused work duration before break */
    focusDuration: number; // minutes

    /** Typical task switching frequency */
    taskSwitchFrequency: number; // per hour

    /** Preferred file editing patterns */
    fileEditingPattern: 'sequential' | 'parallel' | 'mixed';

    /** Peak productivity hours (if detectable) */
    peakHours?: number[]; // 0-23
  };

  /** Personal velocity factors */
  velocityFactors: {
    /** Complexity impact on velocity (0-1 multiplier) */
    complexityImpact: Record<TaskComplexity, number>;

    /** Context switch recovery time (seconds) */
    contextSwitchPenalty: number;

    /** Time to reach flow state (minutes) */
    timeToFlow: number;
  };

  /** Confidence in calibration (0-1) */
  confidence: number;
}

/**
 * Real-time session metrics
 */
export interface SessionMetrics {
  /** Total active time in session (minutes) */
  activeTime: number;

  /** Total idle time (minutes) */
  idleTime: number;

  /** Time in each flow state (minutes) */
  flowStateDistribution: Record<FlowStateLevel, number>;

  /** Number of tasks completed */
  tasksCompleted: number;

  /** Tasks by complexity */
  tasksByComplexity: Record<TaskComplexity, number>;

  /** Total lines of code written */
  linesWritten: number;

  /** Total lines deleted */
  linesDeleted: number;

  /** Files modified count */
  filesModified: number;

  /** Git commits made */
  commitsCount: number;

  /** Context switches count */
  contextSwitches: number;

  /** Total interruptions */
  interruptions: {
    total: number;
    byType: Record<InterruptionType, number>;
    totalRecoveryTime: number; // seconds
  };

  /** Current velocity metrics */
  velocity: {
    /** Current typing speed (characters per minute) */
    typingSpeed: number;

    /** Current code velocity (lines per minute) */
    codeVelocity: number;

    /** Velocity trend (-1 to 1, negative = slowing) */
    trend: number;
  };

  /** Goal progress tracking */
  goalProgress?: Array<{
    goal: string;
    completed: boolean;
    progress: number; // 0-1
  }>;
}

/**
 * Flow-specific metrics and analysis
 */
export interface FlowMetrics {
  /** Current flow score (0-100) */
  currentFlowScore: number;

  /** Average flow score for session */
  averageFlowScore: number;

  /** Peak flow score achieved */
  peakFlowScore: number;

  /** Time spent in flow state (minutes) */
  totalFlowTime: number;

  /** Flow state transitions */
  stateTransitions: Array<{
    from: FlowStateLevel;
    to: FlowStateLevel;
    timestamp: Date;
    trigger?: string;
  }>;

  /** Flow sustainability metrics */
  sustainability: {
    /** Longest continuous flow period (minutes) */
    longestFlowPeriod: number;

    /** Average flow period duration (minutes) */
    averageFlowPeriod: number;

    /** Flow fragmentation (0-1, higher = more fragmented) */
    fragmentation: number;
  };

  /** Factors affecting flow */
  flowFactors: {
    /** Task alignment with complexity preference */
    taskAlignment: number; // 0-1

    /** Environment stability (low interruptions) */
    environmentStability: number; // 0-1

    /** Cognitive load appropriateness */
    cognitiveLoad: number; // 0-1

    /** Energy level estimate */
    energyLevel: number; // 0-1
  };

  /** Predictive insights */
  predictions?: {
    /** Predicted time until flow state */
    timeToFlow?: number; // minutes

    /** Predicted flow duration */
    flowDuration?: number; // minutes

    /** Recommended break timing */
    recommendedBreak?: Date;

    /** Optimal task complexity for current state */
    optimalComplexity?: TaskComplexity;
  };
}

/**
 * Session summary for completed sessions
 */
export interface SessionSummary {
  /** Session identifier */
  sessionId: string;

  /** Session timeframe */
  timeframe: {
    start: Date;
    end: Date;
    duration: number; // minutes
  };

  /** Configuration used */
  config: SessionConfig;

  /** Calibration data (if available) */
  calibration?: CalibrationData;

  /** Final metrics */
  metrics: SessionMetrics;

  /** Flow analysis */
  flow: FlowMetrics;

  /** Key achievements */
  achievements: string[];

  /** Insights and recommendations */
  insights: {
    /** What went well */
    strengths: string[];

    /** Areas for improvement */
    improvements: string[];

    /** Recommendations for next session */
    recommendations: string[];
  };

  /** Comparison to baseline/previous sessions */
  comparison?: {
    /** Change in average flow score */
    flowScoreDelta: number;

    /** Change in productivity */
    productivityDelta: number;

    /** Change in interruption frequency */
    interruptionDelta: number;
  };
}

/**
 * Session history entry for trend analysis
 */
export interface SessionHistoryEntry {
  sessionId: string;
  date: Date;
  duration: number;
  averageFlowScore: number;
  tasksCompleted: number;
  linesWritten: number;
  interruptions: number;
  phase: SessionPhase;
}

/**
 * User profile with aggregated session data
 */
export interface UserProfile {
  /** User identifier */
  userId: string;

  /** Most recent calibration */
  currentCalibration?: CalibrationData;

  /** Preferred session configuration */
  preferredConfig: SessionConfig;

  /** Historical session data */
  sessionHistory: SessionHistoryEntry[];

  /** Aggregate statistics */
  statistics: {
    totalSessions: number;
    totalActiveTime: number; // minutes
    averageSessionDuration: number; // minutes
    averageFlowScore: number;
    totalTasksCompleted: number;
    totalLinesWritten: number;
    preferredWorkingHours: number[]; // 0-23
    bestFlowStateConditions: string[];
  };

  /** Personal preferences learned over time */
  learnedPreferences?: {
    optimalSessionDuration: number;
    optimalBreakFrequency: number;
    preferredTaskComplexity: TaskComplexity;
    bestTimeOfDay: number; // hour 0-23
  };
}

/**
 * Event types for session state changes
 */
export type SessionEvent =
  | { type: 'session_started'; sessionId: string; timestamp: Date }
  | { type: 'session_ended'; sessionId: string; timestamp: Date; summary: SessionSummary }
  | { type: 'phase_changed'; from: SessionPhase; to: SessionPhase; timestamp: Date }
  | { type: 'flow_state_changed'; from: FlowStateLevel; to: FlowStateLevel; timestamp: Date }
  | { type: 'task_started'; taskId: string; complexity: TaskComplexity; timestamp: Date }
  | { type: 'task_completed'; taskId: string; duration: number; timestamp: Date }
  | { type: 'interruption'; interruptionType: InterruptionType; timestamp: Date }
  | { type: 'break_started'; duration: number; timestamp: Date }
  | { type: 'break_ended'; actualDuration: number; timestamp: Date }
  | { type: 'calibration_completed'; data: CalibrationData; timestamp: Date }
  | { type: 'goal_achieved'; goal: string; timestamp: Date };

/**
 * Session event listener callback type
 */
export type SessionEventListener = (event: SessionEvent) => void;

/**
 * Session manager interface
 */
export interface ISessionManager {
  /** Start a new session */
  startSession(config?: Partial<SessionConfig>): Promise<SessionState>;

  /** End current session */
  endSession(): Promise<SessionSummary>;

  /** Get current session state */
  getCurrentState(): SessionState | null;

  /** Update session state */
  updateState(updates: Partial<SessionState>): void;

  /** Get current metrics */
  getMetrics(): SessionMetrics;

  /** Get flow metrics */
  getFlowMetrics(): FlowMetrics;

  /** Perform calibration */
  calibrate(duration?: number): Promise<CalibrationData>;

  /** Subscribe to session events */
  on(event: SessionEvent['type'], listener: SessionEventListener): void;

  /** Unsubscribe from session events */
  off(event: SessionEvent['type'], listener: SessionEventListener): void;

  /** Get session history */
  getHistory(limit?: number): Promise<SessionHistoryEntry[]>;

  /** Get user profile */
  getProfile(): Promise<UserProfile>;
}
