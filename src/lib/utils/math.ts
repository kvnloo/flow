/**
 * Mathematical Utilities Library
 *
 * Provides comprehensive mathematical operations including:
 * - Vector operations (2D/3D)
 * - Matrix operations
 * - Statistical functions
 * - Interpolation functions
 * - Perlin noise generation
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Matrix2x2 = [[number, number], [number, number]];
export type Matrix3x3 = [[number, number, number], [number, number, number], [number, number, number]];
export type Matrix4x4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number]
];

// ============================================================================
// VECTOR OPERATIONS
// ============================================================================

/**
 * 2D Vector Operations
 */
export const vec2 = {
  /**
   * Create a new 2D vector
   */
  create(x = 0, y = 0): Vec2 {
    return { x, y };
  },

  /**
   * Add two vectors
   */
  add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  /**
   * Subtract two vectors
   */
  subtract(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  },

  /**
   * Multiply vector by scalar
   */
  scale(v: Vec2, s: number): Vec2 {
    return { x: v.x * s, y: v.y * s };
  },

  /**
   * Calculate dot product
   */
  dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  },

  /**
   * Calculate magnitude (length)
   */
  magnitude(v: Vec2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  /**
   * Normalize vector to unit length
   */
  normalize(v: Vec2): Vec2 {
    const mag = vec2.magnitude(v);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
  },

  /**
   * Calculate distance between two points
   */
  distance(a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Rotate vector by angle (radians)
   */
  rotate(v: Vec2, angle: number): Vec2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    };
  },

  /**
   * Linear interpolation between two vectors
   */
  lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  },
};

/**
 * 3D Vector Operations
 */
export const vec3 = {
  /**
   * Create a new 3D vector
   */
  create(x = 0, y = 0, z = 0): Vec3 {
    return { x, y, z };
  },

  /**
   * Add two vectors
   */
  add(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  /**
   * Subtract two vectors
   */
  subtract(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  /**
   * Multiply vector by scalar
   */
  scale(v: Vec3, s: number): Vec3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  },

  /**
   * Calculate dot product
   */
  dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },

  /**
   * Calculate cross product
   */
  cross(a: Vec3, b: Vec3): Vec3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  },

  /**
   * Calculate magnitude (length)
   */
  magnitude(v: Vec3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },

  /**
   * Normalize vector to unit length
   */
  normalize(v: Vec3): Vec3 {
    const mag = vec3.magnitude(v);
    if (mag === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
  },

  /**
   * Calculate distance between two points
   */
  distance(a: Vec3, b: Vec3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  /**
   * Linear interpolation between two vectors
   */
  lerp(a: Vec3, b: Vec3, t: number): Vec3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  },
};

// ============================================================================
// MATRIX OPERATIONS
// ============================================================================

/**
 * 2x2 Matrix Operations
 */
export const mat2 = {
  /**
   * Create identity matrix
   */
  identity(): Matrix2x2 {
    return [
      [1, 0],
      [0, 1],
    ];
  },

  /**
   * Multiply two matrices
   */
  multiply(a: Matrix2x2, b: Matrix2x2): Matrix2x2 {
    return [
      [
        a[0][0] * b[0][0] + a[0][1] * b[1][0],
        a[0][0] * b[0][1] + a[0][1] * b[1][1],
      ],
      [
        a[1][0] * b[0][0] + a[1][1] * b[1][0],
        a[1][0] * b[0][1] + a[1][1] * b[1][1],
      ],
    ];
  },

  /**
   * Calculate determinant
   */
  determinant(m: Matrix2x2): number {
    return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  },

  /**
   * Invert matrix
   */
  invert(m: Matrix2x2): Matrix2x2 | null {
    const det = mat2.determinant(m);
    if (det === 0) return null;
    const invDet = 1 / det;
    return [
      [m[1][1] * invDet, -m[0][1] * invDet],
      [-m[1][0] * invDet, m[0][0] * invDet],
    ];
  },
};

/**
 * 3x3 Matrix Operations
 */
export const mat3 = {
  /**
   * Create identity matrix
   */
  identity(): Matrix3x3 {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  },

  /**
   * Multiply two matrices
   */
  multiply(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
    const result: Matrix3x3 = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        result[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
      }
    }

    return result;
  },

  /**
   * Calculate determinant
   */
  determinant(m: Matrix3x3): number {
    return (
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    );
  },
};

// ============================================================================
// STATISTICAL FUNCTIONS
// ============================================================================

/**
 * Calculate mean (average) of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function std(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((val) => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Calculate z-score for a value
 */
export function zscore(value: number, values: number[]): number {
  const avg = mean(values);
  const stdDev = std(values);
  if (stdDev === 0) return 0;
  return (value - avg) / stdDev;
}

/**
 * Sigmoid activation function
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Calculate median of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Calculate variance
 */
export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  return mean(values.map((val) => Math.pow(val - avg, 2)));
}

/**
 * Calculate covariance between two datasets
 */
export function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const meanX = mean(x);
  const meanY = mean(y);
  return mean(x.map((xi, i) => (xi - meanX) * (y[i] - meanY)));
}

/**
 * Calculate Pearson correlation coefficient
 */
export function correlation(x: number[], y: number[]): number {
  const cov = covariance(x, y);
  const stdX = std(x);
  const stdY = std(y);
  if (stdX === 0 || stdY === 0) return 0;
  return cov / (stdX * stdY);
}

// ============================================================================
// INTERPOLATION FUNCTIONS
// ============================================================================

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smooth step interpolation (smoothstep)
 */
export function smoothstep(a: number, b: number, t: number): number {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/**
 * Smoother step interpolation (smootherstep)
 */
export function smootherstep(a: number, b: number, t: number): number {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Cubic interpolation (Hermite spline)
 */
export function cubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Cosine interpolation
 */
export function cosineInterp(a: number, b: number, t: number): number {
  const t2 = (1 - Math.cos(t * Math.PI)) / 2;
  return a * (1 - t2) + b * t2;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Map value from one range to another
 */
export function map(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// ============================================================================
// PERLIN NOISE GENERATOR
// ============================================================================

/**
 * Perlin Noise Generator
 * Based on Ken Perlin's improved noise algorithm
 */
export class PerlinNoise {
  private permutation: number[];
  private p: number[];

  constructor(seed?: number) {
    // Default permutation table
    const defaultPerm = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103,
      30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197,
      62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20,
      125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231,
      83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102,
      143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200,
      196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226,
      250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47,
      16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70,
      221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113,
      224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144,
      12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181,
      199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205,
      93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
    ];

    // Seed-based shuffling if seed provided
    this.permutation = seed !== undefined ? this.shuffle(defaultPerm, seed) : defaultPerm;

    // Duplicate permutation to avoid overflow
    this.p = new Array(512);
    for (let i = 0; i < 256; i++) {
      this.p[i] = this.permutation[i];
      this.p[256 + i] = this.permutation[i];
    }
  }

  /**
   * Shuffle array using seed
   */
  private shuffle(array: number[], seed: number): number[] {
    const arr = [...array];
    let m = arr.length;
    let t: number;
    let i: number;

    // Simple seeded random
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    while (m) {
      i = Math.floor(random() * m--);
      t = arr[m];
      arr[m] = arr[i];
      arr[i] = t;
    }

    return arr;
  }

  /**
   * Fade function (smoothstep)
   */
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Gradient function
   */
  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * Generate 1D Perlin noise
   */
  noise1D(x: number): number {
    return this.noise3D(x, 0, 0);
  }

  /**
   * Generate 2D Perlin noise
   */
  noise2D(x: number, y: number): number {
    return this.noise3D(x, y, 0);
  }

  /**
   * Generate 3D Perlin noise
   */
  noise3D(x: number, y: number, z: number): number {
    // Find unit cube that contains point
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    // Find relative x, y, z of point in cube
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    // Compute fade curves
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    // Hash coordinates of cube corners
    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;

    // Add blended results from 8 corners of cube
    return lerp(
      lerp(
        lerp(
          this.grad(this.p[AA], x, y, z),
          this.grad(this.p[BA], x - 1, y, z),
          u
        ),
        lerp(
          this.grad(this.p[AB], x, y - 1, z),
          this.grad(this.p[BB], x - 1, y - 1, z),
          u
        ),
        v
      ),
      lerp(
        lerp(
          this.grad(this.p[AA + 1], x, y, z - 1),
          this.grad(this.p[BA + 1], x - 1, y, z - 1),
          u
        ),
        lerp(
          this.grad(this.p[AB + 1], x, y - 1, z - 1),
          this.grad(this.p[BB + 1], x - 1, y - 1, z - 1),
          u
        ),
        v
      ),
      w
    );
  }

  /**
   * Generate octave noise (fractal Brownian motion)
   */
  octaveNoise(
    x: number,
    y: number,
    z: number,
    octaves: number,
    persistence: number,
    lacunarity: number
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Check if number is approximately equal (within epsilon)
 */
export function approximately(a: number, b: number, epsilon = 1e-10): number {
  return Math.abs(a - b) < epsilon ? 1 : 0;
}

/**
 * Generate random number in range
 */
export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate random integer in range
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}
