'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

interface FlowMetrics {
  flowScore: number; // 0-1, higher = better flow
  alphaPower: number; // 8-13 Hz, focus/relaxation
  betaPower: number; // 13-30 Hz, active thinking
  thetaPower: number; // 4-8 Hz, deep relaxation
  alphaCoherence: number; // 0-1, synchronization
}

interface FlowParticleSystemProps {
  metrics: FlowMetrics;
  particleCount?: number;
}

export function FlowParticleSystem({
  metrics,
  particleCount = 10000
}: FlowParticleSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const noise3D = useMemo(() => createNoise3D(), []);

  // Particle state buffers
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);

    // Initialize particles in a sphere
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Random spherical distribution
      const radius = Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      velocities[i3] = 0;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = 0;

      phases[i] = Math.random() * Math.PI * 2;
    }

    return { positions, velocities, phases };
  }, [particleCount]);

  // Color interpolation based on frequency bands
  const getFlowColor = useMemo(() => {
    const betaColor = new THREE.Color(0xffff00); // Yellow
    const alphaColor = new THREE.Color(0x00ff00); // Green
    const thetaColor = new THREE.Color(0x0000ff); // Blue

    return (beta: number, alpha: number, theta: number) => {
      const total = beta + alpha + theta;
      if (total === 0) return new THREE.Color(0xffffff);

      const result = new THREE.Color(0, 0, 0);
      result.addScaledVector(betaColor as any, beta / total);
      result.addScaledVector(alphaColor as any, alpha / total);
      result.addScaledVector(thetaColor as any, theta / total);

      return result;
    };
  }, []);

  // Initialize instance colors
  useEffect(() => {
    if (!meshRef.current) return;

    const color = new THREE.Color();
    const baseColor = getFlowColor(
      metrics.betaPower,
      metrics.alphaPower,
      metrics.thetaPower
    );

    for (let i = 0; i < particleCount; i++) {
      const variation = 0.8 + Math.random() * 0.4;
      color.copy(baseColor).multiplyScalar(variation);
      meshRef.current.setColorAt(i, color);
    }

    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [particleCount, metrics.betaPower, metrics.alphaPower, metrics.thetaPower, getFlowColor]);

  // Animation loop
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    // Flow-based parameters
    const turbulence = 1 - metrics.flowScore; // Lower flow = more chaos
    const speed = metrics.thetaPower * 2; // Theta drives velocity
    const coherence = metrics.alphaCoherence;
    const noiseScale = 0.3;
    const timeScale = 0.5;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Current position
      position.set(
        particles.positions[i3],
        particles.positions[i3 + 1],
        particles.positions[i3 + 2]
      );

      // Perlin noise field for organic motion
      const noiseX = noise3D(
        position.x * noiseScale,
        position.y * noiseScale,
        time * timeScale
      );
      const noiseY = noise3D(
        position.y * noiseScale,
        position.z * noiseScale,
        time * timeScale + 100
      );
      const noiseZ = noise3D(
        position.z * noiseScale,
        position.x * noiseScale,
        time * timeScale + 200
      );

      // Apply noise-driven force with turbulence
      const forceScale = speed * (1 + turbulence);
      particles.velocities[i3] += noiseX * forceScale * 0.01;
      particles.velocities[i3 + 1] += noiseY * forceScale * 0.01;
      particles.velocities[i3 + 2] += noiseZ * forceScale * 0.01;

      // Alpha coherence affects position pull toward center
      const centerPull = new THREE.Vector3()
        .copy(position)
        .multiplyScalar(-coherence * 0.001);

      particles.velocities[i3] += centerPull.x;
      particles.velocities[i3 + 1] += centerPull.y;
      particles.velocities[i3 + 2] += centerPull.z;

      // Apply damping (inverse of turbulence for smoothness)
      const damping = 0.95 + (metrics.flowScore * 0.04);
      particles.velocities[i3] *= damping;
      particles.velocities[i3 + 1] *= damping;
      particles.velocities[i3 + 2] *= damping;

      // Update position
      particles.positions[i3] += particles.velocities[i3];
      particles.positions[i3 + 1] += particles.velocities[i3 + 1];
      particles.positions[i3 + 2] += particles.velocities[i3 + 2];

      // Boundary sphere constraint
      const radius = Math.sqrt(
        particles.positions[i3] ** 2 +
        particles.positions[i3 + 1] ** 2 +
        particles.positions[i3 + 2] ** 2
      );

      if (radius > 8) {
        const normalize = 8 / radius;
        particles.positions[i3] *= normalize;
        particles.positions[i3 + 1] *= normalize;
        particles.positions[i3 + 2] *= normalize;

        // Bounce velocity
        particles.velocities[i3] *= -0.5;
        particles.velocities[i3 + 1] *= -0.5;
        particles.velocities[i3 + 2] *= -0.5;
      }

      // Set instance matrix
      position.set(
        particles.positions[i3],
        particles.positions[i3 + 1],
        particles.positions[i3 + 2]
      );

      // Scale based on flow (smaller = more flow)
      const scaleValue = 0.02 + (1 - metrics.flowScore) * 0.03;
      scale.set(scaleValue, scaleValue, scaleValue);

      // Rotation based on phase
      particles.phases[i] += speed * 0.01;
      const quaternion = new THREE.Quaternion();
      quaternion.setFromEuler(
        new THREE.Euler(particles.phases[i], particles.phases[i] * 1.3, 0)
      );

      matrix.compose(position, quaternion, scale);
      meshRef.current.setMatrixAt(i, matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Geometry and material
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        transparent: true,
        opacity: 0.6,
        shininess: 100,
      }),
    []
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, particleCount]}
      frustumCulled={false}
    >
      <meshPhongMaterial
        transparent
        opacity={0.6}
        shininess={100}
      />
    </instancedMesh>
  );
}
