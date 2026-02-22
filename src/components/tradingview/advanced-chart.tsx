'use client';

import { memo, useMemo } from 'react';
import { useTradingViewWidget } from '@/components/tradingview/use-tradingview-widget';
import { WIDGET_SCRIPTS, DARK_THEME, CHART_STUDIES } from '@/lib/tradingview/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AdvancedChartProps {
  symbol: string;
  height?: number;
  className?: string;
}

function AdvancedChartComponent({
  symbol,
  height = 600,
  className,
}: AdvancedChartProps): React.ReactElement {
  const config = useMemo(
    () => ({
      autosize: true,
      symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: DARK_THEME.backgroundColor,
      gridColor: DARK_THEME.gridLineColor,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      studies: [...CHART_STUDIES],
      withdateranges: true,
    }),
    [symbol]
  );

  const { containerRef, isLoading, error } = useTradingViewWidget({
    scriptUrl: WIDGET_SCRIPTS.advancedChart,
    containerId: `tradingview-chart-${symbol}`,
    config,
  });

  return (
    <div className={cn('w-full rounded-lg overflow-hidden', className)} style={{ height }}>
      {isLoading && <Skeleton className="h-full w-full" />}
      {error && (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        className={cn('h-full', isLoading ? 'h-0 overflow-hidden' : '')}
      />
    </div>
  );
}

export const AdvancedChart = memo(AdvancedChartComponent);
