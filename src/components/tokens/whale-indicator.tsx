'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WhaleIndicatorProps {
  whaleScore: number | null;
  netFlow: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
  className?: string;
}

function formatVolume(volume: number | null): string {
  if (volume === null) return '-';
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

export function WhaleIndicator({
  whaleScore,
  netFlow,
  buyVolume,
  sellVolume,
  className,
}: WhaleIndicatorProps): React.ReactElement {
  // No data state
  if (whaleScore === null || netFlow === null) {
    return (
      <div className={cn('flex items-center gap-1 text-muted-foreground', className)}>
        <Minus className="h-3 w-3" />
        <span className="text-xs">-</span>
      </div>
    );
  }

  // Determine direction and colors based on user decision:
  // Green = whale buys (accumulation, positive net flow)
  // Red = whale sells (distribution, negative net flow)
  const isAccumulation = netFlow > 0;
  const isNeutral = Math.abs(netFlow) < 10000; // Less than $10k net flow = neutral

  let bgColor: string;
  let textColor: string;
  let Icon: typeof TrendingUp;

  if (isNeutral) {
    bgColor = 'bg-muted';
    textColor = 'text-muted-foreground';
    Icon = Minus;
  } else if (isAccumulation) {
    bgColor = 'bg-green-500/10';
    textColor = 'text-green-500';
    Icon = TrendingUp;
  } else {
    bgColor = 'bg-red-500/10';
    textColor = 'text-red-500';
    Icon = TrendingDown;
  }

  // Calculate buy ratio for tooltip
  const totalVolume = (buyVolume || 0) + (sellVolume || 0);
  const buyRatio = totalVolume > 0 ? ((buyVolume || 0) / totalVolume) * 100 : 50;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded cursor-help',
              bgColor,
              className
            )}
          >
            <Icon className={cn('h-3 w-3', textColor)} />
            <span className={cn('text-sm font-mono', textColor)}>
              {whaleScore}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <div className="space-y-1 text-xs">
            <div className="font-medium">Whale Activity (24h)</div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Flow:</span>
              <span className={isAccumulation ? 'text-green-500' : 'text-red-500'}>
                {isAccumulation ? '+' : ''}{formatVolume(netFlow)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buy Volume:</span>
              <span className="text-green-500">{formatVolume(buyVolume)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sell Volume:</span>
              <span className="text-red-500">{formatVolume(sellVolume)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buy Ratio:</span>
              <span>{buyRatio.toFixed(0)}%</span>
            </div>
            <div className="pt-1 border-t text-muted-foreground">
              Score: 0-100 (50 = neutral)
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
