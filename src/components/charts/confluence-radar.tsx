'use client';

import { useMemo, memo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CoinRanking } from '@/lib/types';
import {
  calculateConfluence,
  scoresToRadarData,
  getRadarFillColor,
  getRadarStrokeColor,
  getConfluenceLabel,
} from '@/lib/confluence/calculator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConfluenceRadarProps {
  scores: CoinRanking['scores'];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  showConfluenceBadge?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { width: 140, height: 120, outerRadius: 40, fontSize: 9 },
  md: { width: 220, height: 200, outerRadius: 70, fontSize: 11 },
  lg: { width: 300, height: 280, outerRadius: 100, fontSize: 12 },
};

function ConfluenceRadarComponent({
  scores,
  size = 'md',
  showLabels = true,
  showConfluenceBadge = true,
  className,
}: ConfluenceRadarProps) {
  const confluence = useMemo(() => calculateConfluence(scores), [scores]);
  const radarData = useMemo(() => scoresToRadarData(scores), [scores]);
  const fillColor = getRadarFillColor(confluence.direction);
  const strokeColor = getRadarStrokeColor(confluence.direction);
  const dimensions = SIZE_MAP[size];

  const getBadgeVariant = () => {
    if (confluence.direction === 'bullish') return 'default';
    if (confluence.direction === 'bearish') return 'destructive';
    return 'secondary';
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <ResponsiveContainer width={dimensions.width} height={dimensions.height}>
        <RadarChart
          data={radarData}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <PolarGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />
          {showLabels && (
            <PolarAngleAxis
              dataKey="factor"
              tick={{
                fill: '#9ca3af',
                fontSize: dimensions.fontSize,
              }}
              tickLine={false}
            />
          )}
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke={strokeColor}
            fill={fillColor}
            strokeWidth={2}
            dot={{ r: 3, fill: strokeColor }}
            animationDuration={500}
            animationEasing="ease-out"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a3e',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [
              `${typeof value === 'number' ? value.toFixed(0) : value}`,
              'Score',
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>

      {showConfluenceBadge && (
        <Badge variant={getBadgeVariant()} className="mt-2 text-xs">
          {getConfluenceLabel(confluence)}
        </Badge>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const ConfluenceRadar = memo(ConfluenceRadarComponent);
