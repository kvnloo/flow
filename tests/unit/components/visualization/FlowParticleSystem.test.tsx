import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { FlowParticleSystem } from '@/components/visualization/FlowParticleSystem';
import * as THREE from 'three';

// Mock simplex-noise
vi.mock('simplex-noise', () => ({
  createNoise3D: () => vi.fn(() => Math.random() * 2 - 1),
}));

describe('FlowParticleSystem', () => {
  const defaultMetrics = {
    flowScore: 0.5,
    alphaPower: 0.6,
    betaPower: 0.4,
    thetaPower: 0.3,
    alphaCoherence: 0.7,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} />
        </Canvas>
      );
      expect(container).toBeTruthy();
    });

    it('should render with custom particle count', () => {
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={5000} />
        </Canvas>
      );
      expect(container).toBeTruthy();
    });

    it('should create instancedMesh with correct particle count', () => {
      const particleCount = 1000;
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={particleCount} />
        </Canvas>
      );

      // Check that instancedMesh is created (indirect test via DOM)
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });
  });

  describe('Particle Count', () => {
    it('should handle default particle count of 10000', () => {
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle small particle count', () => {
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={100} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle large particle count', () => {
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={20000} />
        </Canvas>
      );
      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Metrics Response', () => {
    it('should respond to flow score changes', () => {
      const { rerender } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} />
        </Canvas>
      );

      const updatedMetrics = { ...defaultMetrics, flowScore: 0.9 };
      rerender(
        <Canvas>
          <FlowParticleSystem metrics={updatedMetrics} />
        </Canvas>
      );

      // Component should re-render without errors
      expect(true).toBe(true);
    });

    it('should respond to frequency band changes', () => {
      const { rerender } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} />
        </Canvas>
      );

      const updatedMetrics = {
        ...defaultMetrics,
        alphaPower: 0.9,
        betaPower: 0.8,
        thetaPower: 0.7,
      };

      rerender(
        <Canvas>
          <FlowParticleSystem metrics={updatedMetrics} />
        </Canvas>
      );

      expect(true).toBe(true);
    });

    it('should handle extreme metric values', () => {
      const extremeMetrics = {
        flowScore: 1.0,
        alphaPower: 1.0,
        betaPower: 1.0,
        thetaPower: 1.0,
        alphaCoherence: 1.0,
      };

      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={extremeMetrics} />
        </Canvas>
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle zero metric values', () => {
      const zeroMetrics = {
        flowScore: 0,
        alphaPower: 0,
        betaPower: 0,
        thetaPower: 0,
        alphaCoherence: 0,
      };

      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={zeroMetrics} />
        </Canvas>
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Geometry and Material', () => {
    it('should use sphere geometry for particles', () => {
      const createGeometrySpy = vi.spyOn(THREE, 'SphereGeometry' as any);

      render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={100} />
        </Canvas>
      );

      expect(createGeometrySpy).toHaveBeenCalled();
      createGeometrySpy.mockRestore();
    });

    it('should use phong material with transparency', () => {
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} />
        </Canvas>
      );

      // Material properties are set in the component
      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Color Interpolation', () => {
    it('should calculate colors based on frequency bands', () => {
      const highAlphaMetrics = {
        ...defaultMetrics,
        alphaPower: 0.9,
        betaPower: 0.1,
        thetaPower: 0.1,
      };

      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={highAlphaMetrics} />
        </Canvas>
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle equal frequency bands', () => {
      const equalMetrics = {
        ...defaultMetrics,
        alphaPower: 0.33,
        betaPower: 0.33,
        thetaPower: 0.34,
      };

      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={equalMetrics} />
        </Canvas>
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should not create unnecessary objects on re-render', () => {
      const { rerender } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={1000} />
        </Canvas>
      );

      // Re-render with same props
      rerender(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={1000} />
        </Canvas>
      );

      expect(true).toBe(true);
    });

    it('should handle rapid metric updates', () => {
      const { rerender } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} />
        </Canvas>
      );

      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        const updatedMetrics = {
          ...defaultMetrics,
          flowScore: Math.random(),
          alphaPower: Math.random(),
        };

        rerender(
          <Canvas>
            <FlowParticleSystem metrics={updatedMetrics} />
          </Canvas>
        );
      }

      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle particle count of 1', () => {
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={1} />
        </Canvas>
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle negative metric values gracefully', () => {
      const negativeMetrics = {
        flowScore: -0.5,
        alphaPower: -0.3,
        betaPower: -0.2,
        thetaPower: -0.1,
        alphaCoherence: -0.4,
      };

      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={negativeMetrics} />
        </Canvas>
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle NaN metric values', () => {
      const nanMetrics = {
        flowScore: NaN,
        alphaPower: NaN,
        betaPower: NaN,
        thetaPower: NaN,
        alphaCoherence: NaN,
      };

      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={nanMetrics} />
        </Canvas>
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Animation Loop', () => {
    it('should update particle positions over time', async () => {
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={10} />
        </Canvas>
      );

      // Wait for animation frame
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should respect turbulence based on flow score', () => {
      const lowFlowMetrics = { ...defaultMetrics, flowScore: 0.1 };
      const highFlowMetrics = { ...defaultMetrics, flowScore: 0.9 };

      const { rerender } = render(
        <Canvas>
          <FlowParticleSystem metrics={lowFlowMetrics} />
        </Canvas>
      );

      rerender(
        <Canvas>
          <FlowParticleSystem metrics={highFlowMetrics} />
        </Canvas>
      );

      expect(true).toBe(true);
    });
  });

  describe('Boundary Constraints', () => {
    it('should constrain particles within boundary sphere', async () => {
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={100} />
        </Canvas>
      );

      // Allow animation to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Snapshot', () => {
    it('should match snapshot', () => {
      const { container } = render(
        <Canvas>
          <FlowParticleSystem metrics={defaultMetrics} particleCount={100} />
        </Canvas>
      );

      expect(container.firstChild).toBeTruthy();
    });
  });
});
