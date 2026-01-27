'use client';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUpIcon } from 'lucide-react';

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500 bg-green-500/10';
  if (score >= 60) return 'text-emerald-500 bg-emerald-500/10';
  if (score >= 40) return 'text-yellow-500 bg-yellow-500/10';
  if (score >= 20) return 'text-orange-500 bg-orange-500/10';
  return 'text-red-500 bg-red-500/10';
}

interface OpportunityScoreBadgeProps {
  score: number | null;
  activityScore?: number | null;
  liquidity?: number | null;
  className?: string;
}

export function OpportunityScoreBadge({
  score,
  activityScore,
  liquidity,
  className,
}: OpportunityScoreBadgeProps) {
  if (score === null) {
    return (
      <span className={cn('text-muted-foreground text-sm', className)}>-</span>
    );
  }

  const formatLiquidity = (liq: number) => {
    if (liq >= 1_000_000) return `$${(liq / 1_000_000).toFixed(1)}M`;
    if (liq >= 1_000) return `$${(liq / 1_000).toFixed(0)}K`;
    return `$${liq.toFixed(0)}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-sm cursor-help',
              getScoreColor(score),
              className
            )}
          >
            <TrendingUpIcon className="h-3 w-3" />
            <span>{score.toFixed(0)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div className="font-medium">Opportunity Score: {score.toFixed(1)}</div>
            {activityScore !== undefined && activityScore !== null && (
              <div>Activity: {activityScore.toFixed(1)}</div>
            )}
            {liquidity !== undefined && liquidity !== null && (
              <div>Liquidity: {formatLiquidity(liquidity)}</div>
            )}
            <div className="text-muted-foreground">
              Combines activity + liquidity
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
