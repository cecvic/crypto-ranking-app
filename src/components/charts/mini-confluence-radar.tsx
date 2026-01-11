'use client';

import { memo, useMemo } from 'react';
import { RadarChart, PolarGrid, Radar, ResponsiveContainer } from 'recharts';
import { CoinRanking } from '@/lib/types';
import {
  calculateConfluence,
  scoresToRadarData,
  getRadarFillColor,
  getRadarStrokeColor,
} from '@/lib/confluence/calculator';

interface MiniConfluenceRadarProps {
  scores: CoinRanking['scores'];
  width?: number;
  height?: number;
}

function MiniConfluenceRadarComponent({
  scores,
  width = 60,
  height = 50,
}: MiniConfluenceRadarProps) {
  const confluence = useMemo(() => calculateConfluence(scores), [scores]);
  const radarData = useMemo(() => scoresToRadarData(scores), [scores]);
  const fillColor = getRadarFillColor(confluence.direction);
  const strokeColor = getRadarStrokeColor(confluence.direction);

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          data={radarData}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
          <Radar
            dataKey="value"
            stroke={strokeColor}
            fill={fillColor}
            strokeWidth={1.5}
            dot={false}
            animationDuration={300}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const MiniConfluenceRadar = memo(MiniConfluenceRadarComponent);
