'use client';

import { memo, useMemo, useState } from 'react';
import { useTradingViewWidget } from '@/components/tradingview/use-tradingview-widget';
import { WIDGET_SCRIPTS, DARK_THEME, TA_INTERVALS } from '@/lib/tradingview/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TechnicalAnalysisProps {
  symbol: string;
  height?: number;
  className?: string;
}

function TechnicalAnalysisComponent({
  symbol,
  height = 425,
  className,
}: TechnicalAnalysisProps): React.ReactElement {
  const [interval, setInterval] = useState('1D');

  const config = useMemo(
    () => ({
      interval,
      width: '100%',
      isTransparent: DARK_THEME.isTransparent,
      height,
      symbol,
      showIntervalTabs: false,
      displayMode: 'single',
      locale: 'en',
      colorTheme: DARK_THEME.colorTheme,
    }),
    [symbol, interval, height]
  );

  const { containerRef, isLoading } = useTradingViewWidget({
    scriptUrl: WIDGET_SCRIPTS.technicalAnalysis,
    containerId: `tradingview-ta-${symbol}-${interval}`,
    config,
  });

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Timeframe tabs */}
      <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
        {TA_INTERVALS.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setInterval(tf.value)}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
              interval === tf.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Widget */}
      <div style={{ height }}>
        {isLoading && <Skeleton className="h-full w-full" />}
        <div
          ref={containerRef}
          className={cn('h-full', isLoading ? 'h-0 overflow-hidden' : '')}
        />
      </div>
    </div>
  );
}

export const TechnicalAnalysis = memo(TechnicalAnalysisComponent);
