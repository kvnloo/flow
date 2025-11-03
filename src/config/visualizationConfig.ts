/**
 * Visualization Configuration
 * Central configuration for all visualization systems
 */

export interface ParticleConfig {
  count: number;
  size: {
    min: number;
    max: number;
  };
  speed: {
    min: number;
    max: number;
  };
  opacity: {
    min: number;
    max: number;
  };
  colors: string[];
  connectionDistance: number;
  connectionOpacity: number;
  mouseInteraction: {
    enabled: boolean;
    radius: number;
    strength: number;
  };
}

export interface MandalaConfig {
  layers: number;
  segments: number;
  rotation: {
    speed: number;
    direction: 'clockwise' | 'counterclockwise' | 'alternating';
  };
  colors: {
    primary: string[];
    secondary: string[];
    accent: string[];
  };
  opacity: {
    min: number;
    max: number;
  };
  scale: {
    min: number;
    max: number;
  };
  animation: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  symmetry: {
    enabled: boolean;
    type: 'radial' | 'bilateral' | 'rotational';
  };
}

export interface WaterfallConfig {
  droplets: {
    count: number;
    size: {
      min: number;
      max: number;
    };
    speed: {
      min: number;
      max: number;
    };
  };
  trails: {
    enabled: boolean;
    length: number;
    opacity: number;
  };
  ripples: {
    enabled: boolean;
    maxRadius: number;
    duration: number;
  };
  colors: {
    droplet: string[];
    trail: string[];
    ripple: string[];
  };
  gravity: number;
  wind: {
    enabled: boolean;
    strength: number;
    variation: number;
  };
}

export interface PerformanceConfig {
  fps: {
    target: number;
    min: number;
    adaptive: boolean;
  };
  quality: {
    level: 'low' | 'medium' | 'high' | 'ultra';
    autoAdjust: boolean;
  };
  rendering: {
    useWebGL: boolean;
    antialiasing: boolean;
    pixelRatio: number;
  };
  optimization: {
    culling: boolean;
    batching: boolean;
    instancedRendering: boolean;
  };
  debug: {
    showFPS: boolean;
    showStats: boolean;
    logPerformance: boolean;
  };
}

export interface VisualizationConfig {
  particles: ParticleConfig;
  mandala: MandalaConfig;
  waterfall: WaterfallConfig;
  performance: PerformanceConfig;
}

/**
 * Default Particle Configuration
 */
const DEFAULT_PARTICLE_CONFIG: ParticleConfig = {
  count: 100,
  size: {
    min: 2,
    max: 6,
  },
  speed: {
    min: 0.5,
    max: 2.0,
  },
  opacity: {
    min: 0.3,
    max: 0.8,
  },
  colors: [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#ec4899', // pink
    '#f43f5e', // rose
  ],
  connectionDistance: 150,
  connectionOpacity: 0.2,
  mouseInteraction: {
    enabled: true,
    radius: 200,
    strength: 0.5,
  },
};

/**
 * Default Mandala Configuration
 */
const DEFAULT_MANDALA_CONFIG: MandalaConfig = {
  layers: 8,
  segments: 12,
  rotation: {
    speed: 0.5,
    direction: 'clockwise',
  },
  colors: {
    primary: ['#6366f1', '#8b5cf6', '#a855f7'],
    secondary: ['#ec4899', '#f43f5e', '#fb923c'],
    accent: ['#fbbf24', '#34d399', '#60a5fa'],
  },
  opacity: {
    min: 0.4,
    max: 0.9,
  },
  scale: {
    min: 0.8,
    max: 1.2,
  },
  animation: {
    enabled: true,
    duration: 3000,
    easing: 'ease-in-out',
  },
  symmetry: {
    enabled: true,
    type: 'radial',
  },
};

/**
 * Default Waterfall Configuration
 */
const DEFAULT_WATERFALL_CONFIG: WaterfallConfig = {
  droplets: {
    count: 50,
    size: {
      min: 3,
      max: 8,
    },
    speed: {
      min: 2,
      max: 5,
    },
  },
  trails: {
    enabled: true,
    length: 20,
    opacity: 0.4,
  },
  ripples: {
    enabled: true,
    maxRadius: 50,
    duration: 1500,
  },
  colors: {
    droplet: ['#60a5fa', '#3b82f6', '#2563eb'],
    trail: ['#93c5fd', '#bfdbfe', '#dbeafe'],
    ripple: ['#60a5fa', '#93c5fd', '#bfdbfe'],
  },
  gravity: 0.2,
  wind: {
    enabled: true,
    strength: 0.1,
    variation: 0.5,
  },
};

/**
 * Default Performance Configuration
 */
const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  fps: {
    target: 60,
    min: 30,
    adaptive: true,
  },
  quality: {
    level: 'high',
    autoAdjust: true,
  },
  rendering: {
    useWebGL: true,
    antialiasing: true,
    pixelRatio: window.devicePixelRatio || 1,
  },
  optimization: {
    culling: true,
    batching: true,
    instancedRendering: true,
  },
  debug: {
    showFPS: false,
    showStats: false,
    logPerformance: false,
  },
};

/**
 * Complete Visualization Configuration
 */
export const VISUALIZATION_CONFIG: VisualizationConfig = {
  particles: DEFAULT_PARTICLE_CONFIG,
  mandala: DEFAULT_MANDALA_CONFIG,
  waterfall: DEFAULT_WATERFALL_CONFIG,
  performance: DEFAULT_PERFORMANCE_CONFIG,
};

/**
 * Quality Presets
 */
export const QUALITY_PRESETS = {
  low: {
    particles: { ...DEFAULT_PARTICLE_CONFIG, count: 30 },
    mandala: { ...DEFAULT_MANDALA_CONFIG, layers: 4, segments: 6 },
    waterfall: { ...DEFAULT_WATERFALL_CONFIG, droplets: { ...DEFAULT_WATERFALL_CONFIG.droplets, count: 20 } },
    performance: { ...DEFAULT_PERFORMANCE_CONFIG, quality: { level: 'low' as const, autoAdjust: false } },
  },
  medium: {
    particles: { ...DEFAULT_PARTICLE_CONFIG, count: 60 },
    mandala: { ...DEFAULT_MANDALA_CONFIG, layers: 6, segments: 8 },
    waterfall: { ...DEFAULT_WATERFALL_CONFIG, droplets: { ...DEFAULT_WATERFALL_CONFIG.droplets, count: 35 } },
    performance: { ...DEFAULT_PERFORMANCE_CONFIG, quality: { level: 'medium' as const, autoAdjust: false } },
  },
  high: {
    particles: DEFAULT_PARTICLE_CONFIG,
    mandala: DEFAULT_MANDALA_CONFIG,
    waterfall: DEFAULT_WATERFALL_CONFIG,
    performance: DEFAULT_PERFORMANCE_CONFIG,
  },
  ultra: {
    particles: { ...DEFAULT_PARTICLE_CONFIG, count: 200 },
    mandala: { ...DEFAULT_MANDALA_CONFIG, layers: 12, segments: 16 },
    waterfall: { ...DEFAULT_WATERFALL_CONFIG, droplets: { ...DEFAULT_WATERFALL_CONFIG.droplets, count: 100 } },
    performance: {
      ...DEFAULT_PERFORMANCE_CONFIG,
      quality: { level: 'ultra' as const, autoAdjust: false },
      fps: { target: 120, min: 60, adaptive: true }
    },
  },
};

/**
 * Get configuration by quality level
 */
export function getConfigByQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): VisualizationConfig {
  return QUALITY_PRESETS[quality];
}

/**
 * Merge custom configuration with defaults
 */
export function mergeConfig(custom: Partial<VisualizationConfig>): VisualizationConfig {
  return {
    particles: { ...DEFAULT_PARTICLE_CONFIG, ...custom.particles },
    mandala: { ...DEFAULT_MANDALA_CONFIG, ...custom.mandala },
    waterfall: { ...DEFAULT_WATERFALL_CONFIG, ...custom.waterfall },
    performance: { ...DEFAULT_PERFORMANCE_CONFIG, ...custom.performance },
  };
}
