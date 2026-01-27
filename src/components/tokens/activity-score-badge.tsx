'use client';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500 bg-green-500/10';
  if (score >= 60) return 'text-emerald-500 bg-emerald-500/10';
  if (score >= 40) return 'text-yellow-500 bg-yellow-500/10';
  if (score >= 20) return 'text-orange-500 bg-orange-500/10';
  return 'text-red-500 bg-red-500/10';
}

interface ActivityScoreBadgeProps {
  score: number | null;
  trade24h?: number | null;
  uniqueWallet24h?: number | null;
  className?: string;
}

export function ActivityScoreBadge({
  score,
  trade24h,
  uniqueWallet24h,
  className,
}: ActivityScoreBadgeProps) {
  if (score === null) {
    return (
      <span className={cn('text-muted-foreground text-sm', className)}>-</span>
    );
  }

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
            {/* Mini progress bar */}
            <div className="h-1.5 w-6 rounded-full bg-current/20 overflow-hidden">
              <div
                className="h-full bg-current rounded-full transition-all"
                style={{ width: `${score}%` }}
              />
            </div>
            <span>{score.toFixed(0)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div className="font-medium">Activity Score: {score.toFixed(1)}</div>
            {trade24h !== undefined && trade24h !== null && (
              <div>Trades (24h): {trade24h.toLocaleString()}</div>
            )}
            {uniqueWallet24h !== undefined && uniqueWallet24h !== null && (
              <div>Unique wallets: {uniqueWallet24h.toLocaleString()}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
