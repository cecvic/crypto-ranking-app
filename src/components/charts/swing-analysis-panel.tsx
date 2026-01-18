'use client';

import { cn } from '@/lib/utils';
import type { SwingAnalysis } from '@/lib/types/ai';

interface SwingAnalysisPanelProps {
  analysis: SwingAnalysis;
  tokenId: string;
}

const signalColors = {
  // Velocity
  accelerating: 'text-green-500',
  decelerating: 'text-red-500',
  stable: 'text-yellow-500',
  // Acceleration
  increasing: 'text-green-500',
  decreasing: 'text-red-500',
  neutral: 'text-yellow-500',
  // Magnitude
  strong: 'text-green-500',
  moderate: 'text-yellow-500',
  weak: 'text-red-500',
};

function MetricCard({
  label,
  value,
  signal,
  context,
}: {
  label: string;
  value: number;
  signal: string;
  context: string;
}) {
  const colorClass = signalColors[signal as keyof typeof signalColors] || 'text-muted-foreground';

  return (
    <div className="flex flex-col p-3 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className={cn('text-xs font-medium capitalize', colorClass)}>
          {signal}
        </span>
      </div>
      <div className={cn('text-2xl font-mono font-bold', colorClass)}>
        {value > 0 ? '+' : ''}{value.toFixed(2)}%
      </div>
      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
        {context}
      </p>
    </div>
  );
}

export function SwingAnalysisPanel({ analysis, tokenId }: SwingAnalysisPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-foreground">
          {tokenId.toUpperCase()} Swing Analysis
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3">
        <MetricCard
          label="Velocity"
          value={analysis.velocity.value}
          signal={analysis.velocity.signal}
          context={analysis.velocity.context}
        />
        <MetricCard
          label="Acceleration"
          value={analysis.acceleration.value}
          signal={analysis.acceleration.signal}
          context={analysis.acceleration.context}
        />
        <MetricCard
          label="Magnitude"
          value={analysis.magnitude.value}
          signal={analysis.magnitude.signal}
          context={analysis.magnitude.context}
        />
      </div>
    </div>
  );
}
