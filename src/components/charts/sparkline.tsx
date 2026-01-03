'use client';

import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  color,
  fillColor,
}: SparklineProps) {
  const { path, fill, isPositive } = useMemo(() => {
    if (!data || data.length < 2) {
      return { path: '', fill: '', isPositive: true };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Normalize data to fit in the SVG
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });

    // Create path
    const pathData = points
      .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(' ');

    // Create fill path (closes at bottom)
    const fillData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

    // Determine if trend is positive
    const positive = data[data.length - 1] >= data[0];

    return { path: pathData, fill: fillData, isPositive: positive };
  }, [data, width, height]);

  const lineColor = color || (isPositive ? '#22c55e' : '#ef4444');
  const areaColor = fillColor || (isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)');

  if (!data || data.length < 2) {
    return (
      <div
        className="bg-gray-800 rounded animate-pulse"
        style={{ width, height }}
      />
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {/* Fill */}
      <path d={fill} fill={areaColor} />
      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
