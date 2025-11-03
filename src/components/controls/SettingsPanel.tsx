import React, { useState, useEffect } from 'react';
import {
  Settings,
  Volume2,
  Eye,
  Activity,
  Clock,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Palette,
  Sliders,
} from 'lucide-react';

interface AudioSettings {
  binauralBeatsVolume: number;
  ambientVolume: number;
  natureSoundsVolume: number;
  masterVolume: number;
}

interface VisualSettings {
  particleCount: number;
  colorScheme: 'ocean' | 'forest' | 'sunset' | 'cosmic' | 'monochrome';
  particleSpeed: number;
  glowIntensity: number;
}

interface CalibrationSettings {
  baselineDuration: number;
  restDuration: number;
  taskDuration: number;
}

interface SessionSettings {
  sessionDuration: number;
  breakInterval: number;
  breakDuration: number;
  autoStart: boolean;
}

interface SettingsPanelSettings {
  audio: AudioSettings;
  visual: VisualSettings;
  calibration: CalibrationSettings;
  session: SessionSettings;
}

const DEFAULT_SETTINGS: SettingsPanelSettings = {
  audio: {
    binauralBeatsVolume: 50,
    ambientVolume: 30,
    natureSoundsVolume: 40,
    masterVolume: 70,
  },
  visual: {
    particleCount: 100,
    colorScheme: 'ocean',
    particleSpeed: 50,
    glowIntensity: 60,
  },
  calibration: {
    baselineDuration: 60,
    restDuration: 30,
    taskDuration: 45,
  },
  session: {
    sessionDuration: 25,
    breakInterval: 25,
    breakDuration: 5,
    autoStart: false,
  },
};

const STORAGE_KEY = 'flow-state-settings';

const COLOR_SCHEMES = [
  { value: 'ocean', label: 'Ocean', colors: ['#00d4ff', '#0099cc', '#006699'] },
  { value: 'forest', label: 'Forest', colors: ['#00ff88', '#00cc66', '#009944'] },
  { value: 'sunset', label: 'Sunset', colors: ['#ff6b35', '#ff8c42', '#ffa600'] },
  { value: 'cosmic', label: 'Cosmic', colors: ['#b000ff', '#8800cc', '#660099'] },
  { value: 'monochrome', label: 'Monochrome', colors: ['#ffffff', '#cccccc', '#999999'] },
];

interface SettingsPanelProps {
  onSettingsChange?: (settings: SettingsPanelSettings) => void;
  isOpen?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onSettingsChange,
  isOpen: externalIsOpen,
}) => {
  const [settings, setSettings] = useState<SettingsPanelSettings>(DEFAULT_SETTINGS);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['audio', 'visual'])
  );
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        onSettingsChange?.({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to parse stored settings:', error);
      }
    }
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const updateSettings = (category: keyof SettingsPanelSettings, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    onSettingsChange?.(settings);
    setHasUnsavedChanges(false);
  };

  const resetSettings = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem(STORAGE_KEY);
      onSettingsChange?.(DEFAULT_SETTINGS);
      setHasUnsavedChanges(false);
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flow-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string);
            setSettings({ ...DEFAULT_SETTINGS, ...imported });
            setHasUnsavedChanges(true);
          } catch (error) {
            alert('Failed to import settings. Invalid file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const renderSlider = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    min: number = 0,
    max: number = 100,
    step: number = 1,
    unit: string = '%'
  ) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-sm text-cyan-400 font-mono">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500
                   hover:bg-gray-600 transition-colors"
      />
    </div>
  );

  const renderSection = (
    id: string,
    title: string,
    icon: React.ReactNode,
    content: React.ReactNode
  ) => {
    const isExpanded = expandedSections.has(id);
    return (
      <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/50 backdrop-blur-sm">
        <button
          onClick={() => toggleSection(id)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50
                     transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="text-cyan-400 group-hover:text-cyan-300 transition-colors">
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        <div
          className={`transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-4 space-y-4 border-t border-gray-700">{content}</div>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setInternalIsOpen(true)}
        className="fixed top-4 right-4 p-3 bg-gray-800/90 backdrop-blur-sm border border-gray-700
                   rounded-lg hover:bg-gray-700 transition-all shadow-lg z-50 group"
        title="Open Settings"
      >
        <Settings className="w-6 h-6 text-cyan-400 group-hover:rotate-90 transition-transform duration-300" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border-2 border-cyan-500/30 rounded-2xl shadow-2xl w-full max-w-3xl
                      max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-gray-800/50">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r
                           from-cyan-400 to-blue-400">
              Settings
            </h2>
          </div>
          <button
            onClick={() => setInternalIsOpen(false)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Close Settings"
          >
            <ChevronUp className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Audio Settings */}
          {renderSection(
            'audio',
            'Audio Settings',
            <Volume2 className="w-5 h-5" />,
            <div className="space-y-4">
              {renderSlider(
                'Master Volume',
                settings.audio.masterVolume,
                (value) => updateSettings('audio', 'masterVolume', value)
              )}
              {renderSlider(
                'Binaural Beats',
                settings.audio.binauralBeatsVolume,
                (value) => updateSettings('audio', 'binauralBeatsVolume', value)
              )}
              {renderSlider(
                'Ambient Sounds',
                settings.audio.ambientVolume,
                (value) => updateSettings('audio', 'ambientVolume', value)
              )}
              {renderSlider(
                'Nature Sounds',
                settings.audio.natureSoundsVolume,
                (value) => updateSettings('audio', 'natureSoundsVolume', value)
              )}
            </div>
          )}

          {/* Visual Settings */}
          {renderSection(
            'visual',
            'Visual Settings',
            <Eye className="w-5 h-5" />,
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Color Scheme</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COLOR_SCHEMES.map((scheme) => (
                    <button
                      key={scheme.value}
                      onClick={() => updateSettings('visual', 'colorScheme', scheme.value)}
                      className={`px-3 py-2 rounded-lg border-2 transition-all ${
                        settings.visual.colorScheme === scheme.value
                          ? 'border-cyan-500 bg-cyan-500/20'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          {scheme.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-300">{scheme.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {renderSlider(
                'Particle Count',
                settings.visual.particleCount,
                (value) => updateSettings('visual', 'particleCount', value),
                10,
                500,
                10,
                ''
              )}
              {renderSlider(
                'Particle Speed',
                settings.visual.particleSpeed,
                (value) => updateSettings('visual', 'particleSpeed', value)
              )}
              {renderSlider(
                'Glow Intensity',
                settings.visual.glowIntensity,
                (value) => updateSettings('visual', 'glowIntensity', value)
              )}
            </div>
          )}

          {/* Calibration Settings */}
          {renderSection(
            'calibration',
            'Calibration Settings',
            <Activity className="w-5 h-5" />,
            <div className="space-y-4">
              {renderSlider(
                'Baseline Duration',
                settings.calibration.baselineDuration,
                (value) => updateSettings('calibration', 'baselineDuration', value),
                30,
                300,
                5,
                's'
              )}
              {renderSlider(
                'Rest Duration',
                settings.calibration.restDuration,
                (value) => updateSettings('calibration', 'restDuration', value),
                15,
                120,
                5,
                's'
              )}
              {renderSlider(
                'Task Duration',
                settings.calibration.taskDuration,
                (value) => updateSettings('calibration', 'taskDuration', value),
                15,
                120,
                5,
                's'
              )}
            </div>
          )}

          {/* Session Settings */}
          {renderSection(
            'session',
            'Session Preferences',
            <Clock className="w-5 h-5" />,
            <div className="space-y-4">
              {renderSlider(
                'Session Duration',
                settings.session.sessionDuration,
                (value) => updateSettings('session', 'sessionDuration', value),
                5,
                120,
                5,
                ' min'
              )}
              {renderSlider(
                'Break Interval',
                settings.session.breakInterval,
                (value) => updateSettings('session', 'breakInterval', value),
                5,
                60,
                5,
                ' min'
              )}
              {renderSlider(
                'Break Duration',
                settings.session.breakDuration,
                (value) => updateSettings('session', 'breakDuration', value),
                1,
                30,
                1,
                ' min'
              )}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Auto-start sessions</label>
                <button
                  onClick={() =>
                    updateSettings('session', 'autoStart', !settings.session.autoStart)
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.session.autoStart ? 'bg-cyan-500' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.session.autoStart ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex flex-wrap items-center justify-between
                        gap-2 bg-gray-800/50">
          <div className="flex items-center space-x-2">
            <button
              onClick={exportSettings}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg
                         transition-colors flex items-center space-x-2"
              title="Export Settings"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
            <button
              onClick={importSettings}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg
                         transition-colors flex items-center space-x-2"
              title="Import Settings"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm">Import</span>
            </button>
            <button
              onClick={resetSettings}
              className="px-4 py-2 bg-gray-700 hover:bg-red-600 text-gray-200 rounded-lg
                         transition-colors flex items-center space-x-2"
              title="Reset to Defaults"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Reset</span>
            </button>
          </div>
          <button
            onClick={saveSettings}
            disabled={!hasUnsavedChanges}
            className={`px-6 py-2 rounded-lg transition-all flex items-center space-x-2 ${
              hasUnsavedChanges
                ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span className="font-semibold">
              {hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
