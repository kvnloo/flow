import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Clock,
  Zap,
  Target,
  Award,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

interface FlowMetricsProps {
  currentSession?: SessionStats;
  historicalData?: HistoricalStats;
  achievements?: Achievement[];
  streak?: number;
}

interface SessionStats {
  duration: number; // in minutes
  avgFlowScore: number;
  peakFlowScore: number;
  sessionCount: number;
}

interface HistoricalStats {
  previousAvgScore: number;
  personalBest: number;
  totalSessions: number;
  progressToNextLevel: number; // 0-100
  nextLevelThreshold: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number; // 0-100 for in-progress achievements
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  suffix?: string;
  gradient?: string;
  delay?: number;
}

const AnimatedNumber: React.FC<{
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
}> = ({ value, duration = 1000, decimals = 0, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * easeOut);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span>
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  suffix = '',
  gradient = 'from-blue-500 to-purple-600',
  delay = 0,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const TrendIcon =
    trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-green-500'
      : trend === 'down'
      ? 'text-red-500'
      : 'text-gray-500';

  return (
    <div
      className={`transform transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-3 rounded-lg bg-gradient-to-br ${gradient} text-white`}
          >
            {icon}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendIcon size={16} />
              <span className="font-medium">{trendValue}</span>
            </div>
          )}
        </div>

        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          {title}
        </h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? (
            <AnimatedNumber value={value} decimals={1} suffix={suffix} />
          ) : (
            value
          )}
        </p>
      </div>
    </div>
  );
};

const AchievementBadge: React.FC<{ achievement: Achievement; index: number }> =
  ({ achievement, index }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const timer = setTimeout(() => setIsVisible(true), index * 100);
      return () => clearTimeout(timer);
    }, [index]);

    const isUnlocked = !!achievement.unlockedAt;

    return (
      <div
        className={`transform transition-all duration-500 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div
          className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
            isUnlocked
              ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-400 dark:border-yellow-600 hover:shadow-lg cursor-pointer'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`text-2xl ${
                isUnlocked ? 'filter-none' : 'grayscale'
              }`}
            >
              {achievement.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4
                className={`font-semibold text-sm mb-1 ${
                  isUnlocked
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {achievement.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {achievement.description}
              </p>

              {!isUnlocked && achievement.progress !== undefined && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{achievement.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${achievement.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {isUnlocked && (
            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
              <Award size={16} />
            </div>
          )}
        </div>
      </div>
    );
  };

const FlowMetrics: React.FC<FlowMetricsProps> = ({
  currentSession = {
    duration: 0,
    avgFlowScore: 0,
    peakFlowScore: 0,
    sessionCount: 0,
  },
  historicalData = {
    previousAvgScore: 0,
    personalBest: 0,
    totalSessions: 0,
    progressToNextLevel: 0,
    nextLevelThreshold: 0,
  },
  achievements = [],
  streak = 0,
}) => {
  const calculateTrend = (
    current: number,
    previous: number
  ): { trend: 'up' | 'down' | 'neutral'; value: string } => {
    if (previous === 0)
      return { trend: 'neutral', value: '0%' };
    const diff = ((current - previous) / previous) * 100;
    return {
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
      value: `${Math.abs(diff).toFixed(1)}%`,
    };
  };

  const avgTrend = calculateTrend(
    currentSession.avgFlowScore,
    historicalData.previousAvgScore
  );

  const unlockedAchievements = achievements.filter((a) => a.unlockedAt);
  const inProgressAchievements = achievements.filter(
    (a) => !a.unlockedAt && a.progress !== undefined
  );

  return (
    <div className="space-y-8">
      {/* Current Session Stats */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="text-yellow-500" size={24} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Current Session
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Session Duration"
            value={currentSession.duration}
            icon={<Clock size={24} />}
            suffix=" min"
            gradient="from-blue-500 to-cyan-600"
            delay={0}
          />

          <StatCard
            title="Avg Flow Score"
            value={currentSession.avgFlowScore}
            icon={<TrendingUp size={24} />}
            trend={avgTrend.trend}
            trendValue={avgTrend.value}
            gradient="from-purple-500 to-pink-600"
            delay={100}
          />

          <StatCard
            title="Peak Flow"
            value={currentSession.peakFlowScore}
            icon={<Target size={24} />}
            gradient="from-green-500 to-emerald-600"
            delay={200}
          />

          <StatCard
            title="Session Streak"
            value={streak}
            icon={<Calendar size={24} />}
            suffix=" days"
            gradient="from-orange-500 to-red-600"
            delay={300}
          />
        </div>
      </div>

      {/* Historical Comparison */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award className="text-purple-500" size={24} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Historical Performance
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Personal Best"
            value={historicalData.personalBest}
            icon={<Trophy size={24} />}
            gradient="from-yellow-500 to-orange-600"
            delay={0}
          />

          <StatCard
            title="Total Sessions"
            value={historicalData.totalSessions}
            icon={<Calendar size={24} />}
            gradient="from-indigo-500 to-blue-600"
            delay={100}
          />

          <div className="transform transition-all duration-500 opacity-100 translate-y-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                  <TrendingUp size={24} />
                </div>
              </div>

              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Level Progress
              </h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                <AnimatedNumber
                  value={historicalData.progressToNextLevel}
                  decimals={0}
                  suffix="%"
                />
              </p>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-pink-500 to-rose-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${historicalData.progressToNextLevel}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {historicalData.nextLevelThreshold -
                  (historicalData.totalSessions || 0)}{' '}
                sessions to next level
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="text-yellow-500" size={24} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Achievements
              </h2>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {unlockedAchievements.length} / {achievements.length} unlocked
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlockedAchievements.map((achievement, index) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                index={index}
              />
            ))}
            {inProgressAchievements.map((achievement, index) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                index={unlockedAchievements.length + index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Trophy icon component (since it's not in lucide-react by default)
const Trophy: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export default FlowMetrics;
export type { FlowMetricsProps, SessionStats, HistoricalStats, Achievement };
