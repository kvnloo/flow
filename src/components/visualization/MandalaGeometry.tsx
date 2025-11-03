import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BrainState {
  alphaFrequency: number; // 8-12 Hz
  flowScore: number; // 0-100
  leftHemisphere: number; // 0-100
  rightHemisphere: number; // 0-100
}

interface MandalaGeometryProps {
  brainState: BrainState;
  pattern?: 'flower-of-life' | 'metatron-cube' | 'sri-yantra' | 'seed-of-life';
  size?: number;
  enableGlow?: boolean;
}

/**
 * MandalaGeometry - Sacred geometry visualization driven by brain states
 *
 * Features:
 * - Rotation speed controlled by alpha frequency (8-12 Hz)
 * - Complexity based on flow score (fractal depth 1-5)
 * - Symmetry reflecting L/R hemisphere balance
 * - Sacred geometry patterns (flower of life, metatron's cube)
 * - Dynamic color based on brain state
 * - Smooth transitions between states
 */
export const MandalaGeometry: React.FC<MandalaGeometryProps> = ({
  brainState,
  pattern = 'flower-of-life',
  size = 5,
  enableGlow = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Normalize brain state values
  const normalizedState = useMemo(() => {
    const alphaRange = [8, 12]; // Hz
    const normalizedAlpha = THREE.MathUtils.clamp(
      (brainState.alphaFrequency - alphaRange[0]) / (alphaRange[1] - alphaRange[0]),
      0,
      1
    );

    const normalizedFlow = brainState.flowScore / 100;
    const normalizedLeft = brainState.leftHemisphere / 100;
    const normalizedRight = brainState.rightHemisphere / 100;
    const hemisphereBalance = 1 - Math.abs(normalizedLeft - normalizedRight);

    return {
      alpha: normalizedAlpha,
      flow: normalizedFlow,
      hemisphereBalance,
      leftDominance: normalizedLeft,
      rightDominance: normalizedRight,
    };
  }, [brainState]);

  // Calculate fractal depth based on flow score
  const fractalDepth = useMemo(() => {
    return Math.floor(normalizedState.flow * 4) + 1; // 1-5
  }, [normalizedState.flow]);

  // Generate color based on brain state
  const stateColor = useMemo(() => {
    const hue = normalizedState.flow * 0.6; // 0 (red) to 0.6 (cyan)
    const saturation = 0.7 + normalizedState.alpha * 0.3; // 0.7-1.0
    const lightness = 0.4 + normalizedState.hemisphereBalance * 0.2; // 0.4-0.6

    return new THREE.Color().setHSL(hue, saturation, lightness);
  }, [normalizedState]);

  // Generate mandala geometry based on pattern
  const geometry = useMemo(() => {
    switch (pattern) {
      case 'flower-of-life':
        return generateFlowerOfLife(fractalDepth, size);
      case 'metatron-cube':
        return generateMetatronsCube(fractalDepth, size);
      case 'sri-yantra':
        return generateSriYantra(fractalDepth, size);
      case 'seed-of-life':
        return generateSeedOfLife(fractalDepth, size);
      default:
        return generateFlowerOfLife(fractalDepth, size);
    }
  }, [pattern, fractalDepth, size]);

  // Custom shader material for glow effect
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: stateColor },
        uTime: { value: 0 },
        uGlowIntensity: { value: enableGlow ? 1.0 : 0.0 },
        uFlowScore: { value: normalizedState.flow },
        uHemisphereBalance: { value: normalizedState.hemisphereBalance },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uGlowIntensity;
        uniform float uFlowScore;
        uniform float uHemisphereBalance;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Base color
          vec3 color = uColor;

          // Distance-based glow
          float dist = length(vPosition);
          float glow = 1.0 / (1.0 + dist * 0.5);
          glow = pow(glow, 2.0) * uGlowIntensity;

          // Pulse effect based on flow score
          float pulse = sin(uTime * 2.0 + dist * 3.0) * 0.5 + 0.5;
          pulse = mix(0.8, 1.2, pulse * uFlowScore);

          // Edge highlighting based on hemisphere balance
          float edge = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          edge *= uHemisphereBalance;

          // Combine effects
          color = color * pulse + vec3(glow) * 0.3 + vec3(edge) * 0.5;

          // Fresnel effect
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
          color += vec3(fresnel) * uGlowIntensity * 0.2;

          gl_FragColor = vec4(color, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [stateColor, enableGlow, normalizedState]);

  // Update shader uniforms
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value = stateColor;
      materialRef.current.uniforms.uFlowScore.value = normalizedState.flow;
      materialRef.current.uniforms.uHemisphereBalance.value = normalizedState.hemisphereBalance;
    }
  }, [stateColor, normalizedState]);

  // Animation loop
  useFrame((state, delta) => {
    if (groupRef.current && materialRef.current) {
      // Rotation speed based on alpha frequency
      // Higher alpha (12 Hz) = faster rotation
      const baseSpeed = 0.1;
      const alphaMultiplier = 1 + normalizedState.alpha * 2; // 1-3x
      const rotationSpeed = baseSpeed * alphaMultiplier * delta;

      // Apply asymmetric rotation based on hemisphere dominance
      const leftRotation = rotationSpeed * (0.5 + normalizedState.leftDominance * 0.5);
      const rightRotation = rotationSpeed * (0.5 + normalizedState.rightDominance * 0.5);

      groupRef.current.rotation.z += leftRotation;
      groupRef.current.rotation.x += rightRotation * 0.2;

      // Update shader time
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

      // Scale pulsing based on flow score
      const scalePulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05 * normalizedState.flow;
      groupRef.current.scale.setScalar(scalePulse);
    }
  });

  return (
    <group ref={groupRef}>
      {geometry.map((geom, index) => (
        <mesh key={index} geometry={geom}>
          <primitive object={shaderMaterial} ref={index === 0 ? materialRef : null} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Generate Flower of Life geometry
 * Sacred pattern of overlapping circles
 */
function generateFlowerOfLife(depth: number, size: number): THREE.BufferGeometry[] {
  const geometries: THREE.BufferGeometry[] = [];
  const radius = size / (depth * 2);

  // Center circle
  const centerCircle = new THREE.RingGeometry(radius * 0.95, radius, 64);
  geometries.push(centerCircle);

  // Generate rings of circles
  for (let ring = 1; ring <= depth; ring++) {
    const numCircles = ring * 6;
    const ringRadius = radius * ring * 1.732; // √3 for hexagonal spacing

    for (let i = 0; i < numCircles; i++) {
      const angle = (i / numCircles) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const y = Math.sin(angle) * ringRadius;

      const circle = new THREE.RingGeometry(radius * 0.95, radius, 64);
      circle.translate(x, y, 0);
      geometries.push(circle);
    }
  }

  return geometries;
}

/**
 * Generate Metatron's Cube geometry
 * 13 circles with connecting lines forming sacred geometry
 */
function generateMetatronsCube(depth: number, size: number): THREE.BufferGeometry[] {
  const geometries: THREE.BufferGeometry[] = [];
  const radius = size / 6;

  // 13 circle positions (Fruit of Life pattern)
  const positions = [
    [0, 0], // Center
    // Inner hexagon
    [0, 1], [0.866, 0.5], [0.866, -0.5], [0, -1], [-0.866, -0.5], [-0.866, 0.5],
    // Outer ring
    [0, 2], [1.732, 1], [1.732, -1], [0, -2], [-1.732, -1], [-1.732, 1],
  ];

  // Create circles
  positions.forEach(([x, y]) => {
    const circle = new THREE.RingGeometry(radius * 0.9, radius, 32);
    circle.translate(x * radius * 1.5, y * radius * 1.5, 0);
    geometries.push(circle);
  });

  // Create connecting lines based on depth
  if (depth >= 2) {
    const lineGeometries = createMetatronLines(positions, radius, depth);
    geometries.push(...lineGeometries);
  }

  return geometries;
}

/**
 * Generate Sri Yantra geometry
 * Nine interlocking triangles around central point
 */
function generateSriYantra(depth: number, size: number): THREE.BufferGeometry[] {
  const geometries: THREE.BufferGeometry[] = [];
  const baseSize = size / 3;

  // Create triangles pointing up (Shiva - masculine)
  for (let i = 0; i < Math.min(5, depth + 1); i++) {
    const scale = 1 - i * 0.15;
    const triangle = createTriangle(baseSize * scale, true);
    triangle.rotateZ((i * Math.PI) / 10);
    geometries.push(triangle);
  }

  // Create triangles pointing down (Shakti - feminine)
  for (let i = 0; i < Math.min(4, depth); i++) {
    const scale = 0.9 - i * 0.15;
    const triangle = createTriangle(baseSize * scale, false);
    triangle.rotateZ((i * Math.PI) / 8);
    geometries.push(triangle);
  }

  // Central bindu (point)
  const bindu = new THREE.CircleGeometry(size * 0.05, 32);
  geometries.push(bindu);

  return geometries;
}

/**
 * Generate Seed of Life geometry
 * Seven overlapping circles
 */
function generateSeedOfLife(depth: number, size: number): THREE.BufferGeometry[] {
  const geometries: THREE.BufferGeometry[] = [];
  const radius = size / 3;

  // Center circle
  const center = new THREE.RingGeometry(radius * 0.95, radius, 64);
  geometries.push(center);

  // Six surrounding circles
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    const circle = new THREE.RingGeometry(radius * 0.95, radius, 64);
    circle.translate(x, y, 0);
    geometries.push(circle);
  }

  // Add additional layers based on depth
  if (depth >= 3) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.cos(angle) * radius * 1.732;
      const y = Math.sin(angle) * radius * 1.732;

      const circle = new THREE.RingGeometry(radius * 0.95, radius, 64);
      circle.translate(x, y, 0);
      geometries.push(circle);
    }
  }

  return geometries;
}

/**
 * Helper: Create connecting lines for Metatron's Cube
 */
function createMetatronLines(
  positions: number[][],
  radius: number,
  depth: number
): THREE.BufferGeometry[] {
  const geometries: THREE.BufferGeometry[] = [];
  const lineWidth = radius * 0.05;

  // Connect all circles to center
  for (let i = 1; i < positions.length; i++) {
    const [x1, y1] = positions[0];
    const [x2, y2] = positions[i];

    const line = createLine(
      x1 * radius * 1.5,
      y1 * radius * 1.5,
      x2 * radius * 1.5,
      y2 * radius * 1.5,
      lineWidth
    );
    geometries.push(line);
  }

  // Connect circles in rings based on depth
  if (depth >= 3) {
    // Inner hexagon connections
    for (let i = 1; i <= 6; i++) {
      const next = i === 6 ? 1 : i + 1;
      const [x1, y1] = positions[i];
      const [x2, y2] = positions[next];

      const line = createLine(
        x1 * radius * 1.5,
        y1 * radius * 1.5,
        x2 * radius * 1.5,
        y2 * radius * 1.5,
        lineWidth
      );
      geometries.push(line);
    }
  }

  return geometries;
}

/**
 * Helper: Create triangle geometry
 */
function createTriangle(size: number, pointUp: boolean): THREE.BufferGeometry {
  const shape = new THREE.Shape();

  if (pointUp) {
    shape.moveTo(0, size);
    shape.lineTo(-size * 0.866, -size * 0.5);
    shape.lineTo(size * 0.866, -size * 0.5);
    shape.lineTo(0, size);
  } else {
    shape.moveTo(0, -size);
    shape.lineTo(-size * 0.866, size * 0.5);
    shape.lineTo(size * 0.866, size * 0.5);
    shape.lineTo(0, -size);
  }

  const geometry = new THREE.ShapeGeometry(shape);

  // Convert to line geometry
  const edges = new THREE.EdgesGeometry(geometry);
  return edges;
}

/**
 * Helper: Create line between two points
 */
function createLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number
): THREE.BufferGeometry {
  const points = [new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return geometry;
}

export default MandalaGeometry;
