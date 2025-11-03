import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  offsetX?: number;
  offsetY?: number;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Neurofeedback Training',
    description: 'This interactive tutorial will guide you through the essential features of the neurofeedback system. Learn how to connect devices, calibrate sensors, and interpret your brain activity visualizations.',
  },
  {
    id: 'device-connection',
    title: 'Connect Your Device',
    description: 'Click the "Connect Device" button in the top-right corner to pair your EEG headset. Make sure Bluetooth is enabled and your device is powered on. The system supports Muse, OpenBCI, and other compatible devices.',
    targetSelector: '[data-tutorial="device-connect"]',
    position: 'bottom',
    offsetY: 10,
  },
  {
    id: 'calibration',
    title: 'Calibration Process',
    description: 'Before starting a session, calibrate your device for optimal signal quality. Sit comfortably, relax, and close your eyes during the 60-second baseline recording. This establishes your brain\'s resting state.',
    targetSelector: '[data-tutorial="calibration"]',
    position: 'left',
    offsetX: -10,
  },
  {
    id: 'session-interface',
    title: 'Session Controls',
    description: 'Start, pause, and stop your training sessions here. Monitor real-time metrics including alpha waves, focus score, and relaxation levels. Sessions are automatically saved to your progress history.',
    targetSelector: '[data-tutorial="session-controls"]',
    position: 'bottom',
    offsetY: 10,
  },
  {
    id: 'visualizations',
    title: 'Understanding Visualizations',
    description: 'The graphs display your brain wave patterns across different frequency bands: Delta (sleep), Theta (meditation), Alpha (relaxation), Beta (focus), and Gamma (cognition). Watch for patterns and changes during training.',
    targetSelector: '[data-tutorial="visualizations"]',
    position: 'top',
    offsetY: -10,
  },
  {
    id: 'audio-feedback',
    title: 'Audio Feedback Settings',
    description: 'Enable audio cues that respond to your mental state. When you achieve the target state (e.g., deep relaxation), the tone becomes more harmonious. Adjust volume and feedback type in settings.',
    targetSelector: '[data-tutorial="audio-settings"]',
    position: 'right',
    offsetX: 10,
  },
  {
    id: 'progress-tracking',
    title: 'Track Your Progress',
    description: 'View your training history, session statistics, and improvement trends. Set goals, earn achievements, and monitor your neuroplasticity journey over time. Consistency is key to lasting results.',
    targetSelector: '[data-tutorial="progress"]',
    position: 'left',
    offsetX: -10,
  },
];

const STORAGE_KEY = 'neurofeedback-tutorial-completed';

interface TooltipPosition {
  top: number;
  left: number;
  transform: string;
}

export const TutorialOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    transform: 'translate(-50%, -50%)',
  });

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const updateTargetPosition = useCallback(() => {
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let top = 0;
      let left = 0;
      let transform = '';

      switch (step.position) {
        case 'top':
          top = rect.top + (step.offsetY || 0);
          left = rect.left + rect.width / 2;
          transform = 'translate(-50%, -100%)';
          break;
        case 'bottom':
          top = rect.bottom + (step.offsetY || 0);
          left = rect.left + rect.width / 2;
          transform = 'translate(-50%, 0)';
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left + (step.offsetX || 0);
          transform = 'translate(-100%, -50%)';
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + (step.offsetX || 0);
          transform = 'translate(0, -50%)';
          break;
        default:
          top = viewport.height / 2;
          left = viewport.width / 2;
          transform = 'translate(-50%, -50%)';
      }

      if (left < 20) left = 20;
      if (left > viewport.width - 20) left = viewport.width - 20;
      if (top < 20) top = 20;
      if (top > viewport.height - 20) top = viewport.height - 20;

      setTooltipPosition({ top, left, transform });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (isVisible) {
      updateTargetPosition();
      window.addEventListener('resize', updateTargetPosition);
      window.addEventListener('scroll', updateTargetPosition);
      return () => {
        window.removeEventListener('resize', updateTargetPosition);
        window.removeEventListener('scroll', updateTargetPosition);
      };
    }
  }, [isVisible, currentStep, updateTargetPosition]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'skipped');
    setIsVisible(false);
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'completed');
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleBack();
          break;
        case 'Escape':
          e.preventDefault();
          handleSkip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleNext, handleBack, handleSkip]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 transition-opacity duration-300"
      style={{ pointerEvents: 'none' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      {/* Backdrop with spotlight */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{
          opacity: 0.75,
          pointerEvents: 'auto',
        }}
      />

      {/* Spotlight highlight */}
      {targetRect && (
        <div
          className="absolute transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.75)',
            borderRadius: '8px',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tutorial tooltip */}
      <div
        className="absolute w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl transition-all duration-300 ease-out animate-fade-in"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: tooltipPosition.transform,
          pointerEvents: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 id="tutorial-title" className="text-xl font-semibold text-gray-900 mb-1">
              {step.title}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Step {currentStep + 1} of {TUTORIAL_STEPS.length}</span>
              <div className="flex gap-1">
                {TUTORIAL_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 w-6 rounded-full transition-colors duration-200 ${
                      index === currentStep
                        ? 'bg-indigo-600'
                        : index < currentStep
                        ? 'bg-indigo-300'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Skip tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed">{step.description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              disabled={isFirstStep}
              className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                isFirstStep
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
              aria-label="Previous step"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              aria-label={isLastStep ? 'Complete tutorial' : 'Next step'}
            >
              {isLastStep ? (
                <>
                  Complete
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Arrow pointer for non-centered tooltips */}
        {step.targetSelector && step.position && (
          <div
            className="absolute w-4 h-4 bg-white transform rotate-45"
            style={{
              ...(step.position === 'top' && {
                bottom: -8,
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
              }),
              ...(step.position === 'bottom' && {
                top: -8,
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
              }),
              ...(step.position === 'left' && {
                right: -8,
                top: '50%',
                transform: 'translateY(-50%) rotate(45deg)',
              }),
              ...(step.position === 'right' && {
                left: -8,
                top: '50%',
                transform: 'translateY(-50%) rotate(45deg)',
              }),
            }}
          />
        )}
      </div>

      {/* Keyboard hints */}
      <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs text-gray-600 pointer-events-auto">
        <div className="flex flex-col gap-1">
          <div><kbd className="px-2 py-1 bg-gray-200 rounded">←</kbd> Back</div>
          <div><kbd className="px-2 py-1 bg-gray-200 rounded">→</kbd> or <kbd className="px-2 py-1 bg-gray-200 rounded">Enter</kbd> Next</div>
          <div><kbd className="px-2 py-1 bg-gray-200 rounded">Esc</kbd> Skip</div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        kbd {
          font-family: ui-monospace, monospace;
          font-size: 0.75rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default TutorialOverlay;
