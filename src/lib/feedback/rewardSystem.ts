/**
 * Reward System - Gamification for Flow Application
 *
 * Implements achievement tracking, progress milestones, XP system,
 * unlockable features, and session statistics with local storage persistence.
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'flow' | 'streak' | 'time' | 'mastery';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  requirement: {
    type: 'flow_score' | 'session_count' | 'total_time' | 'streak_days' | 'avg_flow' | 'perfect_sessions';
    value: number;
    current?: number;
  };
  reward?: {
    type: 'visualization' | 'audio_theme' | 'title' | 'feature';
    unlockId: string;
  };
}

export interface UserLevel {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  unlocks: string[];
}

export interface SessionStats {
  totalSessions: number;
  totalTime: number; // in minutes
  averageFlowScore: number;
  highestFlowScore: number;
  currentStreak: number;
  longestStreak: number;
  perfectSessions: number; // sessions with flow score >= 90
  lastSessionDate?: Date;
  personalBests: {
    longestSession: number; // in minutes
    highestConcentration: number;
    mostProductive: number;
  };
}

export interface UserProgress {
  xp: number;
  level: number;
  achievements: Achievement[];
  stats: SessionStats;
  unlockedFeatures: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  type: 'achievement' | 'level_up' | 'milestone' | 'streak';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

const STORAGE_KEY = 'flow_user_progress';
const NOTIFICATIONS_KEY = 'flow_notifications';

/**
 * User Level Progression System
 * Levels 1-50 with titles and unlockable features
 */
const USER_LEVELS: UserLevel[] = [
  { level: 1, title: 'Flow Novice', minXP: 0, maxXP: 100, unlocks: [] },
  { level: 2, title: 'Flow Apprentice', minXP: 100, maxXP: 250, unlocks: ['basic_stats'] },
  { level: 3, title: 'Flow Seeker', minXP: 250, maxXP: 500, unlocks: ['ambient_sounds'] },
  { level: 4, title: 'Flow Practitioner', minXP: 500, maxXP: 1000, unlocks: ['custom_timers'] },
  { level: 5, title: 'Flow Adept', minXP: 1000, maxXP: 2000, unlocks: ['advanced_stats', 'nature_theme'] },
  { level: 7, title: 'Flow Expert', minXP: 2000, maxXP: 3500, unlocks: ['focus_music', 'graph_visualization'] },
  { level: 10, title: 'Flow Master', minXP: 3500, maxXP: 5500, unlocks: ['binaural_beats', 'heatmap_view'] },
  { level: 15, title: 'Flow Guru', minXP: 5500, maxXP: 8500, unlocks: ['meditation_mode', 'cosmic_theme'] },
  { level: 20, title: 'Flow Sage', minXP: 8500, maxXP: 12500, unlocks: ['ai_insights', 'custom_themes'] },
  { level: 25, title: 'Flow Virtuoso', minXP: 12500, maxXP: 17500, unlocks: ['advanced_audio', 'export_data'] },
  { level: 30, title: 'Flow Legend', minXP: 17500, maxXP: 25000, unlocks: ['all_visualizations', 'premium_sounds'] },
  { level: 40, title: 'Flow Transcendent', minXP: 25000, maxXP: 40000, unlocks: ['ultimate_mode'] },
  { level: 50, title: 'Flow Enlightened', minXP: 40000, maxXP: Infinity, unlocks: ['everything'] }
];

/**
 * Achievement Definitions
 * Organized by category and tier
 */
const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  // Flow Score Achievements
  {
    id: 'first_flow',
    name: 'First Flow',
    description: 'Complete your first flow session',
    category: 'flow',
    tier: 'bronze',
    icon: '🌊',
    requirement: { type: 'session_count', value: 1 }
  },
  {
    id: 'flow_state',
    name: 'Flow State',
    description: 'Achieve a flow score of 80 or higher',
    category: 'flow',
    tier: 'silver',
    icon: '✨',
    requirement: { type: 'flow_score', value: 80 },
    reward: { type: 'visualization', unlockId: 'particle_flow' }
  },
  {
    id: 'deep_flow',
    name: 'Deep Flow',
    description: 'Achieve a flow score of 90 or higher',
    category: 'flow',
    tier: 'gold',
    icon: '🌟',
    requirement: { type: 'flow_score', value: 90 },
    reward: { type: 'audio_theme', unlockId: 'deep_focus' }
  },
  {
    id: 'perfect_flow',
    name: 'Perfect Flow',
    description: 'Achieve a perfect flow score of 100',
    category: 'flow',
    tier: 'platinum',
    icon: '💎',
    requirement: { type: 'flow_score', value: 100 },
    reward: { type: 'title', unlockId: 'the_perfect_one' }
  },
  {
    id: 'consistent_flow',
    name: 'Consistent Flow',
    description: 'Maintain an average flow score of 75+',
    category: 'mastery',
    tier: 'gold',
    icon: '📈',
    requirement: { type: 'avg_flow', value: 75 }
  },

  // Streak Achievements
  {
    id: 'daily_habit',
    name: 'Daily Habit',
    description: 'Complete sessions for 3 days in a row',
    category: 'streak',
    tier: 'bronze',
    icon: '🔥',
    requirement: { type: 'streak_days', value: 3 }
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Complete sessions for 7 days in a row',
    category: 'streak',
    tier: 'silver',
    icon: '⚡',
    requirement: { type: 'streak_days', value: 7 },
    reward: { type: 'feature', unlockId: 'streak_protection' }
  },
  {
    id: 'dedication',
    name: 'Dedication',
    description: 'Complete sessions for 30 days in a row',
    category: 'streak',
    tier: 'gold',
    icon: '🏆',
    requirement: { type: 'streak_days', value: 30 }
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Complete sessions for 100 days in a row',
    category: 'streak',
    tier: 'platinum',
    icon: '👑',
    requirement: { type: 'streak_days', value: 100 },
    reward: { type: 'title', unlockId: 'the_unstoppable' }
  },

  // Time Achievements
  {
    id: 'hour_of_flow',
    name: 'Hour of Flow',
    description: 'Accumulate 60 minutes of flow time',
    category: 'time',
    tier: 'bronze',
    icon: '⏱️',
    requirement: { type: 'total_time', value: 60 }
  },
  {
    id: 'marathon_session',
    name: 'Marathon Session',
    description: 'Complete a single 2-hour flow session',
    category: 'time',
    tier: 'silver',
    icon: '🏃',
    requirement: { type: 'session_count', value: 1 } // Special handling needed
  },
  {
    id: 'century',
    name: 'Century',
    description: 'Accumulate 100 hours of flow time',
    category: 'time',
    tier: 'gold',
    icon: '💯',
    requirement: { type: 'total_time', value: 6000 }
  },
  {
    id: 'flow_master_time',
    name: 'Flow Master',
    description: 'Accumulate 1000 hours of flow time',
    category: 'time',
    tier: 'platinum',
    icon: '🌌',
    requirement: { type: 'total_time', value: 60000 },
    reward: { type: 'title', unlockId: 'flow_master' }
  },

  // Mastery Achievements
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete 10 perfect flow sessions (90+ score)',
    category: 'mastery',
    tier: 'gold',
    icon: '🎯',
    requirement: { type: 'perfect_sessions', value: 10 }
  },
  {
    id: 'session_veteran',
    name: 'Session Veteran',
    description: 'Complete 100 flow sessions',
    category: 'mastery',
    tier: 'silver',
    icon: '🎖️',
    requirement: { type: 'session_count', value: 100 }
  },
  {
    id: 'flow_legend',
    name: 'Flow Legend',
    description: 'Complete 500 flow sessions',
    category: 'mastery',
    tier: 'platinum',
    icon: '🏅',
    requirement: { type: 'session_count', value: 500 }
  }
];

/**
 * Calculate XP earned from a session
 */
function calculateSessionXP(flowScore: number, duration: number): number {
  const baseXP = 10;
  const scoreMultiplier = flowScore / 100;
  const timeBonus = Math.min(duration / 60, 2); // Max 2x bonus for 2+ hours
  const perfectBonus = flowScore >= 90 ? 1.5 : 1;

  return Math.floor(baseXP * scoreMultiplier * timeBonus * perfectBonus);
}

/**
 * Get user level based on XP
 */
function getLevelForXP(xp: number): UserLevel {
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= USER_LEVELS[i].minXP) {
      return USER_LEVELS[i];
    }
  }
  return USER_LEVELS[0];
}

/**
 * Initialize default user progress
 */
function initializeProgress(): UserProgress {
  const now = new Date();
  return {
    xp: 0,
    level: 1,
    achievements: ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: false,
      requirement: { ...a.requirement, current: 0 }
    })),
    stats: {
      totalSessions: 0,
      totalTime: 0,
      averageFlowScore: 0,
      highestFlowScore: 0,
      currentStreak: 0,
      longestStreak: 0,
      perfectSessions: 0,
      personalBests: {
        longestSession: 0,
        highestConcentration: 0,
        mostProductive: 0
      }
    },
    unlockedFeatures: [],
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Load user progress from local storage
 */
export function loadProgress(): UserProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return initializeProgress();
    }

    const progress = JSON.parse(stored);

    // Convert date strings back to Date objects
    progress.createdAt = new Date(progress.createdAt);
    progress.updatedAt = new Date(progress.updatedAt);
    if (progress.stats.lastSessionDate) {
      progress.stats.lastSessionDate = new Date(progress.stats.lastSessionDate);
    }

    progress.achievements.forEach((a: Achievement) => {
      if (a.unlockedAt) {
        a.unlockedAt = new Date(a.unlockedAt);
      }
    });

    return progress;
  } catch (error) {
    console.error('Failed to load progress:', error);
    return initializeProgress();
  }
}

/**
 * Save user progress to local storage
 */
export function saveProgress(progress: UserProgress): void {
  try {
    progress.updatedAt = new Date();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

/**
 * Update progress after a session
 */
export function updateProgressAfterSession(
  sessionData: {
    flowScore: number;
    duration: number; // in minutes
    concentration: number;
    productivity: number;
  }
): {
  progress: UserProgress;
  xpGained: number;
  leveledUp: boolean;
  newAchievements: Achievement[];
  notifications: Notification[];
} {
  const progress = loadProgress();
  const { flowScore, duration, concentration, productivity } = sessionData;

  // Calculate XP
  const xpGained = calculateSessionXP(flowScore, duration);
  const oldLevel = progress.level;
  progress.xp += xpGained;

  // Update level
  const newLevelData = getLevelForXP(progress.xp);
  progress.level = newLevelData.level;
  const leveledUp = progress.level > oldLevel;

  // Update unlocked features if leveled up
  if (leveledUp) {
    const unlockedInLevel = newLevelData.unlocks.filter(
      u => !progress.unlockedFeatures.includes(u)
    );
    progress.unlockedFeatures.push(...unlockedInLevel);
  }

  // Update stats
  const stats = progress.stats;
  stats.totalSessions += 1;
  stats.totalTime += duration;
  stats.averageFlowScore =
    (stats.averageFlowScore * (stats.totalSessions - 1) + flowScore) / stats.totalSessions;
  stats.highestFlowScore = Math.max(stats.highestFlowScore, flowScore);

  if (flowScore >= 90) {
    stats.perfectSessions += 1;
  }

  // Update personal bests
  stats.personalBests.longestSession = Math.max(
    stats.personalBests.longestSession,
    duration
  );
  stats.personalBests.highestConcentration = Math.max(
    stats.personalBests.highestConcentration,
    concentration
  );
  stats.personalBests.mostProductive = Math.max(
    stats.personalBests.mostProductive,
    productivity
  );

  // Update streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (stats.lastSessionDate) {
    const lastDate = new Date(stats.lastSessionDate);
    lastDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, don't update streak
    } else if (daysDiff === 1) {
      // Consecutive day
      stats.currentStreak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    } else {
      // Streak broken
      stats.currentStreak = 1;
    }
  } else {
    // First session
    stats.currentStreak = 1;
    stats.longestStreak = 1;
  }

  stats.lastSessionDate = new Date();

  // Check achievements
  const newAchievements: Achievement[] = [];
  const notifications: Notification[] = [];

  progress.achievements.forEach(achievement => {
    if (achievement.unlocked) return;

    let achieved = false;
    const req = achievement.requirement;

    switch (req.type) {
      case 'flow_score':
        req.current = flowScore;
        achieved = flowScore >= req.value;
        break;
      case 'session_count':
        req.current = stats.totalSessions;
        achieved = stats.totalSessions >= req.value;
        break;
      case 'total_time':
        req.current = stats.totalTime;
        achieved = stats.totalTime >= req.value;
        break;
      case 'streak_days':
        req.current = stats.currentStreak;
        achieved = stats.currentStreak >= req.value;
        break;
      case 'avg_flow':
        req.current = Math.round(stats.averageFlowScore);
        achieved = stats.averageFlowScore >= req.value;
        break;
      case 'perfect_sessions':
        req.current = stats.perfectSessions;
        achieved = stats.perfectSessions >= req.value;
        break;
    }

    if (achieved) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date();
      newAchievements.push(achievement);

      // Add unlocked feature if achievement has reward
      if (achievement.reward) {
        progress.unlockedFeatures.push(achievement.reward.unlockId);
      }

      // Create notification
      notifications.push({
        id: `achievement_${achievement.id}_${Date.now()}`,
        type: 'achievement',
        title: `Achievement Unlocked: ${achievement.name}`,
        message: achievement.description,
        timestamp: new Date(),
        read: false,
        data: achievement
      });
    }
  });

  // Add level up notification
  if (leveledUp) {
    notifications.push({
      id: `levelup_${progress.level}_${Date.now()}`,
      type: 'level_up',
      title: `Level Up! You're now level ${progress.level}`,
      message: `You've become a ${newLevelData.title}!`,
      timestamp: new Date(),
      read: false,
      data: { level: progress.level, title: newLevelData.title }
    });
  }

  // Add streak milestone notifications
  if ([3, 7, 14, 30, 50, 100].includes(stats.currentStreak)) {
    notifications.push({
      id: `streak_${stats.currentStreak}_${Date.now()}`,
      type: 'streak',
      title: `${stats.currentStreak}-Day Streak! 🔥`,
      message: `You've maintained your flow practice for ${stats.currentStreak} days straight!`,
      timestamp: new Date(),
      read: false,
      data: { streak: stats.currentStreak }
    });
  }

  // Save progress
  saveProgress(progress);

  // Save notifications
  saveNotifications(notifications);

  return {
    progress,
    xpGained,
    leveledUp,
    newAchievements,
    notifications
  };
}

/**
 * Get progress to next level
 */
export function getProgressToNextLevel(progress: UserProgress): {
  currentLevel: UserLevel;
  nextLevel: UserLevel | null;
  progressPercent: number;
  xpToNext: number;
} {
  const currentLevel = getLevelForXP(progress.xp);
  const nextLevelIndex = USER_LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
  const nextLevel = nextLevelIndex < USER_LEVELS.length ? USER_LEVELS[nextLevelIndex] : null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progressPercent: 100,
      xpToNext: 0
    };
  }

  const xpInLevel = progress.xp - currentLevel.minXP;
  const xpNeeded = nextLevel.minXP - currentLevel.minXP;
  const progressPercent = Math.round((xpInLevel / xpNeeded) * 100);
  const xpToNext = nextLevel.minXP - progress.xp;

  return {
    currentLevel,
    nextLevel,
    progressPercent,
    xpToNext
  };
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  progress: UserProgress,
  category?: Achievement['category']
): Achievement[] {
  if (!category) {
    return progress.achievements;
  }
  return progress.achievements.filter(a => a.category === category);
}

/**
 * Get unlocked achievements
 */
export function getUnlockedAchievements(progress: UserProgress): Achievement[] {
  return progress.achievements.filter(a => a.unlocked);
}

/**
 * Get locked achievements
 */
export function getLockedAchievements(progress: UserProgress): Achievement[] {
  return progress.achievements.filter(a => !a.unlocked);
}

/**
 * Get achievement progress percentage
 */
export function getAchievementProgress(achievement: Achievement): number {
  if (achievement.unlocked) return 100;
  if (!achievement.requirement.current) return 0;

  const progress = (achievement.requirement.current / achievement.requirement.value) * 100;
  return Math.min(Math.round(progress), 100);
}

/**
 * Save notifications to local storage
 */
function saveNotifications(notifications: Notification[]): void {
  try {
    const existing = loadNotifications();
    const combined = [...notifications, ...existing].slice(0, 50); // Keep last 50
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(combined));
  } catch (error) {
    console.error('Failed to save notifications:', error);
  }
}

/**
 * Load notifications from local storage
 */
export function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return [];

    const notifications = JSON.parse(stored);
    return notifications.map((n: any) => ({
      ...n,
      timestamp: new Date(n.timestamp)
    }));
  } catch (error) {
    console.error('Failed to load notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export function markNotificationRead(notificationId: string): void {
  const notifications = loadNotifications();
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsRead(): void {
  const notifications = loadNotifications();
  notifications.forEach(n => n.read = true);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

/**
 * Get unread notifications
 */
export function getUnreadNotifications(): Notification[] {
  return loadNotifications().filter(n => !n.read);
}

/**
 * Clear all notifications
 */
export function clearNotifications(): void {
  localStorage.removeItem(NOTIFICATIONS_KEY);
}

/**
 * Reset all progress (use with caution!)
 */
export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(NOTIFICATIONS_KEY);
}

/**
 * Export progress data
 */
export function exportProgress(): string {
  const progress = loadProgress();
  return JSON.stringify(progress, null, 2);
}

/**
 * Import progress data
 */
export function importProgress(data: string): boolean {
  try {
    const progress = JSON.parse(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch (error) {
    console.error('Failed to import progress:', error);
    return false;
  }
}

/**
 * Get feature availability
 */
export function isFeatureUnlocked(featureId: string, progress?: UserProgress): boolean {
  const userProgress = progress || loadProgress();
  return userProgress.unlockedFeatures.includes(featureId);
}

/**
 * Get all available user levels
 */
export function getAllLevels(): UserLevel[] {
  return [...USER_LEVELS];
}

/**
 * Get statistics summary
 */
export function getStatsSummary(progress: UserProgress): {
  rank: string;
  completionRate: number;
  avgSessionLength: number;
  efficiency: number;
} {
  const stats = progress.stats;
  const avgSessionLength = stats.totalSessions > 0
    ? Math.round(stats.totalTime / stats.totalSessions)
    : 0;

  const completionRate = progress.achievements.length > 0
    ? Math.round((getUnlockedAchievements(progress).length / progress.achievements.length) * 100)
    : 0;

  const efficiency = Math.round(
    (stats.averageFlowScore * 0.4) +
    (Math.min(stats.currentStreak / 30, 1) * 30) +
    (Math.min(completionRate / 100, 1) * 30)
  );

  let rank = 'Beginner';
  if (progress.level >= 40) rank = 'Transcendent';
  else if (progress.level >= 30) rank = 'Legend';
  else if (progress.level >= 20) rank = 'Sage';
  else if (progress.level >= 15) rank = 'Guru';
  else if (progress.level >= 10) rank = 'Master';
  else if (progress.level >= 7) rank = 'Expert';
  else if (progress.level >= 5) rank = 'Adept';

  return {
    rank,
    completionRate,
    avgSessionLength,
    efficiency
  };
}
