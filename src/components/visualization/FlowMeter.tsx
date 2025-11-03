import React, { useEffect, useState } from 'react';

interface FlowMeterProps {
  flowScore: number; // 0-100
  attention?: number; // 0-100
  relaxation?: number; // 0-100
  cognitiveLoad?: number; // 0-100
  className?: string;
}

export const FlowMeter: React.FC<FlowMeterProps> = ({
  flowScore,
  attention = 0,
  relaxation = 0,
  cognitiveLoad = 0,
  className = '',
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedAttention, setAnimatedAttention] = useState(0);
  const [animatedRelaxation, setAnimatedRelaxation] = useState(0);
  const [animatedLoad, setAnimatedLoad] = useState(0);

  // Spring physics animation
  useEffect(() => {
    const animateValue = (
      current: number,
      target: number,
      setter: (value: number) => void,
      velocity: { current: number }
    ) => {
      const diff = target - current;
      const spring = 0.15; // Spring stiffness
      const damping = 0.7; // Damping factor

      velocity.current = velocity.current * damping + diff * spring;
      const next = current + velocity.current;

      if (Math.abs(diff) > 0.1 || Math.abs(velocity.current) > 0.1) {
        setter(next);
        return true;
      } else {
        setter(target);
        velocity.current = 0;
        return false;
      }
    };

    const velocities = {
      score: { current: 0 },
      attention: { current: 0 },
      relaxation: { current: 0 },
      load: { current: 0 },
    };

    const animate = () => {
      const animations = [
        animateValue(animatedScore, flowScore, setAnimatedScore, velocities.score),
        animateValue(animatedAttention, attention, setAnimatedAttention, velocities.attention),
        animateValue(animatedRelaxation, relaxation, setAnimatedRelaxation, velocities.relaxation),
        animateValue(animatedLoad, cognitiveLoad, setAnimatedLoad, velocities.load),
      ];

      if (animations.some(active => active)) {
        requestAnimationFrame(animate);
      }
    };

    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [flowScore, attention, relaxation, cognitiveLoad, animatedScore, animatedAttention, animatedRelaxation, animatedLoad]);

  // Calculate color based on flow level
  const getFlowColor = (score: number): string => {
    if (score < 30) return 'from-red-500 via-red-400 to-orange-400';
    if (score < 60) return 'from-yellow-500 via-yellow-400 to-amber-400';
    if (score < 80) return 'from-green-500 via-green-400 to-emerald-400';
    return 'from-emerald-500 via-green-400 to-teal-400';
  };

  const getFlowTextColor = (score: number): string => {
    if (score < 30) return 'text-red-500';
    if (score < 60) return 'text-yellow-500';
    if (score < 80) return 'text-green-500';
    return 'text-emerald-500';
  };

  // SVG circle parameters
  const size = 240;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  // Mini gauge parameters
  const miniSize = 60;
  const miniStroke = 6;
  const miniRadius = (miniSize - miniStroke) / 2;
  const miniCircumference = 2 * Math.PI * miniRadius;

  const MiniGauge: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
    const miniOffset = miniCircumference - (value / 100) * miniCircumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: miniSize, height: miniSize }}>
          <svg width={miniSize} height={miniSize} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={miniSize / 2}
              cy={miniSize / 2}
              r={miniRadius}
              stroke="currentColor"
              strokeWidth={miniStroke}
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx={miniSize / 2}
              cy={miniSize / 2}
              r={miniRadius}
              stroke="currentColor"
              strokeWidth={miniStroke}
              fill="none"
              strokeDasharray={miniCircumference}
              strokeDashoffset={miniOffset}
              strokeLinecap="round"
              className={`${color} transition-all duration-300`}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {Math.round(value)}
            </span>
          </div>
        </div>
        <span className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center space-y-6 ${className}`}>
      {/* Main Flow Meter */}
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={getFlowColor(animatedScore).split(' ')[0].replace('from-', '')} />
              <stop offset="50%" className={getFlowColor(animatedScore).split(' ')[1].replace('via-', '')} />
              <stop offset="100%" className={getFlowColor(animatedScore).split(' ')[2].replace('to-', '')} />
            </linearGradient>
          </defs>
          {/* Progress circle with gradient */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#flowGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 drop-shadow-lg"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))',
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Flow
          </span>
          <span className={`text-5xl font-bold ${getFlowTextColor(animatedScore)} transition-colors duration-500`}>
            {Math.round(animatedScore)}
          </span>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            / 100
          </span>
        </div>
      </div>

      {/* Mini Gauges */}
      <div className="flex items-center justify-center space-x-8">
        <MiniGauge
          value={animatedAttention}
          label="Attention"
          color="text-blue-500"
        />
        <MiniGauge
          value={animatedRelaxation}
          label="Relaxation"
          color="text-purple-500"
        />
        <MiniGauge
          value={animatedLoad}
          label="Cognitive"
          color="text-orange-500"
        />
      </div>

      {/* Flow State Indicator */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${
            animatedScore >= 80 ? 'bg-emerald-500 animate-pulse' :
            animatedScore >= 60 ? 'bg-green-500' :
            animatedScore >= 30 ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
        />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {animatedScore >= 80 ? 'Peak Flow' :
           animatedScore >= 60 ? 'In Flow' :
           animatedScore >= 30 ? 'Building Flow' :
           'Low Flow'}
        </span>
      </div>
    </div>
  );
};

export default FlowMeter;
