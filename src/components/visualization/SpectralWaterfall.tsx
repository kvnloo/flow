import React, { useEffect, useRef, useState } from 'react';

interface SpectralWaterfallProps {
  /** Width of the canvas in pixels */
  width?: number;
  /** Height of the canvas in pixels */
  height?: number;
  /** Minimum frequency to display (Hz) */
  minFrequency?: number;
  /** Maximum frequency to display (Hz) */
  maxFrequency?: number;
  /** Time window to display (seconds) */
  timeWindow?: number;
  /** Update rate (Hz) */
  updateRate?: number;
}

interface SpectralDataPoint {
  timestamp: number;
  frequencies: number[];
  powers: number[];
}

/**
 * SpectralWaterfall Component
 *
 * Real-time scrolling time-frequency visualization using canvas 2D rendering.
 * Displays power spectral density as a heatmap with:
 * - X-axis: Time (scrolling, last N seconds)
 * - Y-axis: Frequency (0-50 Hz, logarithmic scale)
 * - Color: Jet colormap (blue→cyan→green→yellow→red)
 *
 * @example
 * ```tsx
 * <SpectralWaterfall
 *   width={800}
 *   height={400}
 *   minFrequency={0.1}
 *   maxFrequency={50}
 *   timeWindow={60}
 * />
 * ```
 */
export const SpectralWaterfall: React.FC<SpectralWaterfallProps> = ({
  width = 800,
  height = 400,
  minFrequency = 0.1,
  maxFrequency = 50,
  timeWindow = 60,
  updateRate = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataBufferRef = useRef<SpectralDataPoint[]>([]);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  // Jet colormap implementation
  const getJetColor = (value: number): [number, number, number] => {
    // Clamp value between 0 and 1
    const v = Math.max(0, Math.min(1, value));

    let r: number, g: number, b: number;

    if (v < 0.125) {
      r = 0;
      g = 0;
      b = 0.5 + 0.5 * (v / 0.125);
    } else if (v < 0.375) {
      r = 0;
      g = (v - 0.125) / 0.25;
      b = 1;
    } else if (v < 0.625) {
      r = (v - 0.375) / 0.25;
      g = 1;
      b = 1 - (v - 0.375) / 0.25;
    } else if (v < 0.875) {
      r = 1;
      g = 1 - (v - 0.625) / 0.25;
      b = 0;
    } else {
      r = 1 - 0.5 * (v - 0.875) / 0.125;
      g = 0;
      b = 0;
    }

    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255),
    ];
  };

  // Convert frequency to Y position (logarithmic scale)
  const frequencyToY = (freq: number): number => {
    if (freq <= 0) return height;
    const logMin = Math.log10(minFrequency);
    const logMax = Math.log10(maxFrequency);
    const logFreq = Math.log10(freq);
    const normalized = (logFreq - logMin) / (logMax - logMin);
    return height - (normalized * height);
  };

  // Normalize power values to 0-1 range for colormap
  const normalizePower = (power: number, minPower: number, maxPower: number): number => {
    if (maxPower === minPower) return 0.5;
    return (power - minPower) / (maxPower - minPower);
  };

  // Render the waterfall visualization
  const renderWaterfall = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const data = dataBufferRef.current;
    if (data.length === 0) return;

    // Calculate time range
    const currentTime = Date.now() / 1000;
    const startTime = currentTime - timeWindow;

    // Filter data within time window
    const visibleData = data.filter(d => d.timestamp >= startTime);

    if (visibleData.length === 0) return;

    // Find global min/max power for normalization
    let minPower = Infinity;
    let maxPower = -Infinity;
    visibleData.forEach(d => {
      d.powers.forEach(p => {
        minPower = Math.min(minPower, p);
        maxPower = Math.max(maxPower, p);
      });
    });

    // Render each time slice as a vertical column
    const columnWidth = width / visibleData.length;

    visibleData.forEach((dataPoint, timeIndex) => {
      const x = timeIndex * columnWidth;

      // For each frequency bin, draw a colored rectangle
      for (let i = 0; i < dataPoint.frequencies.length - 1; i++) {
        const freq1 = dataPoint.frequencies[i];
        const freq2 = dataPoint.frequencies[i + 1];
        const power = dataPoint.powers[i];

        // Skip if outside frequency range
        if (freq2 < minFrequency || freq1 > maxFrequency) continue;

        const y1 = frequencyToY(freq1);
        const y2 = frequencyToY(freq2);
        const rectHeight = Math.abs(y2 - y1);

        // Normalize power and get color
        const normalizedPower = normalizePower(power, minPower, maxPower);
        const [r, g, b] = getJetColor(normalizedPower);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, Math.min(y1, y2), columnWidth + 1, rectHeight);
      }
    });

    // Draw frequency axis labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';

    const frequencyLabels = [0.1, 0.5, 1, 5, 10, 20, 50];
    frequencyLabels.forEach(freq => {
      if (freq >= minFrequency && freq <= maxFrequency) {
        const y = frequencyToY(freq);
        ctx.fillText(`${freq} Hz`, width - 5, y + 4);
      }
    });

    // Draw time axis labels
    ctx.textAlign = 'center';
    const timeLabels = [0, 15, 30, 45, 60];
    timeLabels.forEach(sec => {
      if (sec <= timeWindow) {
        const x = width - (sec / timeWindow) * width;
        ctx.fillText(`-${sec}s`, x, height - 5);
      }
    });
  };

  // Animation loop
  const animate = (timestamp: number) => {
    const deltaTime = timestamp - lastUpdateRef.current;
    const updateInterval = 1000 / updateRate;

    if (deltaTime >= updateInterval) {
      renderWaterfall();
      lastUpdateRef.current = timestamp;
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Generate mock data for demonstration
  const generateMockData = (): SpectralDataPoint => {
    const numBins = 100;
    const frequencies: number[] = [];
    const powers: number[] = [];

    for (let i = 0; i < numBins; i++) {
      // Logarithmic frequency spacing
      const freq = minFrequency * Math.pow(maxFrequency / minFrequency, i / (numBins - 1));
      frequencies.push(freq);

      // Simulate 1/f noise with some peaks
      const baseNoise = 10 / freq;
      const peak1 = 50 * Math.exp(-Math.pow((freq - 10) / 2, 2));
      const peak2 = 30 * Math.exp(-Math.pow((freq - 25) / 3, 2));
      const randomVariation = Math.random() * 5;

      powers.push(baseNoise + peak1 + peak2 + randomVariation);
    }

    return {
      timestamp: Date.now() / 1000,
      frequencies,
      powers,
    };
  };

  // Data generation interval
  useEffect(() => {
    const dataInterval = setInterval(() => {
      const newData = generateMockData();
      dataBufferRef.current.push(newData);

      // Remove old data outside time window
      const currentTime = Date.now() / 1000;
      const cutoffTime = currentTime - timeWindow - 5; // Keep 5s buffer
      dataBufferRef.current = dataBufferRef.current.filter(
        d => d.timestamp >= cutoffTime
      );
    }, 1000 / updateRate);

    return () => clearInterval(dataInterval);
  }, [updateRate, timeWindow]);

  // Animation lifecycle
  useEffect(() => {
    lastUpdateRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height, minFrequency, maxFrequency, timeWindow]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '1px solid #333',
          backgroundColor: '#000',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          color: '#fff',
          fontSize: '14px',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '5px 10px',
          borderRadius: '4px',
        }}
      >
        Spectral Waterfall: {minFrequency}-{maxFrequency} Hz | {timeWindow}s window
      </div>
    </div>
  );
};

export default SpectralWaterfall;
