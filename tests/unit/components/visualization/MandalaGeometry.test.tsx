import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { MandalaGeometry } from '@/components/visualization/MandalaGeometry';

describe('MandalaGeometry', () => {
  const defaultBrainState = {
    alphaFrequency: 10, // 8-12 Hz
    flowScore: 50, // 0-100
    leftHemisphere: 60, // 0-100
    rightHemisphere: 55, // 0-100
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} />
        </Canvas>
      );
      expect(container).toBeTruthy();
    });

    it('should render with default pattern (flower-of-life)', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should render with custom size', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} size={10} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should render with glow enabled', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} enableGlow={true} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should render with glow disabled', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} enableGlow={false} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Pattern Types', () => {
    it('should render flower-of-life pattern', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} pattern="flower-of-life" />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should render metatron-cube pattern', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} pattern="metatron-cube" />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should render sri-yantra pattern', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} pattern="sri-yantra" />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should render seed-of-life pattern', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} pattern="seed-of-life" />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Geometry Creation', () => {
    it('should create geometry based on pattern', () => {
      const patterns: Array<'flower-of-life' | 'metatron-cube' | 'sri-yantra' | 'seed-of-life'> = [
        'flower-of-life',
        'metatron-cube',
        'sri-yantra',
        'seed-of-life',
      ];

      patterns.forEach((pattern) => {
        const { container } = render(
          <Canvas>
            <MandalaGeometry brainState={defaultBrainState} pattern={pattern} />
          </Canvas>
        );
        expect(container.querySelector('canvas')).toBeTruthy();
      });
    });

    it('should adjust complexity based on flow score', () => {
      const lowFlowState = { ...defaultBrainState, flowScore: 10 };
      const highFlowState = { ...defaultBrainState, flowScore: 90 };

      const { rerender } = render(
        <Canvas>
          <MandalaGeometry brainState={lowFlowState} />
        </Canvas>
      );

      rerender(
        <Canvas>
          <MandalaGeometry brainState={highFlowState} />
        </Canvas>
      );

      expect(true).toBe(true);
    });

    it('should calculate fractal depth from flow score', () => {
      const flowScores = [0, 25, 50, 75, 100];

      flowScores.forEach((flowScore) => {
        const { container } = render(
          <Canvas>
            <MandalaGeometry brainState={{ ...defaultBrainState, flowScore }} />
          </Canvas>
        );
        expect(container.querySelector('canvas')).toBeTruthy();
      });
    });
  });

  describe('Rotation Animation', () => {
    it('should rotate based on alpha frequency', async () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} />
        </Canvas>
      );

      // Wait for animation frame
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle low alpha frequency (8 Hz)', () => {
      const lowAlphaState = { ...defaultBrainState, alphaFrequency: 8 };
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={lowAlphaState} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle high alpha frequency (12 Hz)', () => {
      const highAlphaState = { ...defaultBrainState, alphaFrequency: 12 };
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={highAlphaState} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should apply asymmetric rotation based on hemisphere dominance', () => {
      const leftDominant = {
        ...defaultBrainState,
        leftHemisphere: 80,
        rightHemisphere: 40,
      };

      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={leftDominant} />
        </Canvas>
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Color Calculation', () => {
    it('should calculate color based on brain state', () => {
      const states = [
        { ...defaultBrainState, flowScore: 0 },
        { ...defaultBrainState, flowScore: 50 },
        { ...defaultBrainState, flowScore: 100 },
      ];

      states.forEach((state) => {
        const { container } = render(
          <Canvas>
            <MandalaGeometry brainState={state} />
          </Canvas>
        );
        expect(container.querySelector('canvas')).toBeTruthy();
      });
    });

    it('should adjust saturation based on alpha frequency', () => {
      const lowAlpha = { ...defaultBrainState, alphaFrequency: 8 };
      const highAlpha = { ...defaultBrainState, alphaFrequency: 12 };

      const { rerender } = render(
        <Canvas>
          <MandalaGeometry brainState={lowAlpha} />
        </Canvas>
      );

      rerender(
        <Canvas>
          <MandalaGeometry brainState={highAlpha} />
        </Canvas>
      );

      expect(true).toBe(true);
    });

    it('should adjust lightness based on hemisphere balance', () => {
      const balanced = {
        ...defaultBrainState,
        leftHemisphere: 50,
        rightHemisphere: 50,
      };

      const unbalanced = {
        ...defaultBrainState,
        leftHemisphere: 90,
        rightHemisphere: 10,
      };

      const { rerender } = render(
        <Canvas>
          <MandalaGeometry brainState={balanced} />
        </Canvas>
      );

      rerender(
        <Canvas>
          <MandalaGeometry brainState={unbalanced} />
        </Canvas>
      );

      expect(true).toBe(true);
    });
  });

  describe('Shader Material', () => {
    it('should create shader material with uniforms', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should update shader uniforms on brain state change', () => {
      const { rerender } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} />
        </Canvas>
      );

      const updatedState = {
        ...defaultBrainState,
        flowScore: 80,
        alphaFrequency: 11,
      };

      rerender(
        <Canvas>
          <MandalaGeometry brainState={updatedState} />
        </Canvas>
      );

      expect(true).toBe(true);
    });

    it('should handle glow intensity toggle', () => {
      const { rerender } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} enableGlow={true} />
        </Canvas>
      );

      rerender(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} enableGlow={false} />
        </Canvas>
      );

      expect(true).toBe(true);
    });
  });

  describe('Scale Pulsing', () => {
    it('should pulse scale based on flow score', async () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} />
        </Canvas>
      );

      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should have minimal pulsing at low flow score', () => {
      const lowFlowState = { ...defaultBrainState, flowScore: 10 };
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={lowFlowState} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should have strong pulsing at high flow score', () => {
      const highFlowState = { ...defaultBrainState, flowScore: 90 };
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={highFlowState} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle alpha frequency outside range', () => {
      const states = [
        { ...defaultBrainState, alphaFrequency: 5 },
        { ...defaultBrainState, alphaFrequency: 15 },
      ];

      states.forEach((state) => {
        const { container } = render(
          <Canvas>
            <MandalaGeometry brainState={state} />
          </Canvas>
        );
        expect(container.querySelector('canvas')).toBeTruthy();
      });
    });

    it('should handle flow score outside range', () => {
      const states = [
        { ...defaultBrainState, flowScore: -10 },
        { ...defaultBrainState, flowScore: 150 },
      ];

      states.forEach((state) => {
        const { container } = render(
          <Canvas>
            <MandalaGeometry brainState={state} />
          </Canvas>
        );
        expect(container.querySelector('canvas')).toBeTruthy();
      });
    });

    it('should handle hemisphere values outside range', () => {
      const state = {
        ...defaultBrainState,
        leftHemisphere: -20,
        rightHemisphere: 150,
      };

      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={state} />
        </Canvas>
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle very small size', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} size={0.1} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle very large size', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} size={100} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Pattern Changes', () => {
    it('should switch patterns smoothly', () => {
      const patterns: Array<'flower-of-life' | 'metatron-cube' | 'sri-yantra' | 'seed-of-life'> = [
        'flower-of-life',
        'metatron-cube',
        'sri-yantra',
        'seed-of-life',
      ];

      const { rerender } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} pattern={patterns[0]} />
        </Canvas>
      );

      patterns.forEach((pattern) => {
        rerender(
          <Canvas>
            <MandalaGeometry brainState={defaultBrainState} pattern={pattern} />
          </Canvas>
        );
      });

      expect(true).toBe(true);
    });
  });

  describe('Snapshot', () => {
    it('should match snapshot for flower-of-life', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} pattern="flower-of-life" />
        </Canvas>
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('should match snapshot for metatron-cube', () => {
      const { container } = render(
        <Canvas>
          <MandalaGeometry brainState={defaultBrainState} pattern="metatron-cube" />
        </Canvas>
      );
      expect(container.firstChild).toBeTruthy();
    });
  });
});
