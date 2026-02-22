'use client';

import { memo } from 'react';
import { AdvancedChart } from '@/components/tradingview/advanced-chart';
import { TradingChart } from '@/components/charts/trading-chart';
import { getTradingViewSymbol } from '@/lib/tradingview/symbol-map';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartData } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CoinChartProps {
  coinId: string;
  symbol: string;
  chartData?: ChartData[];
  chartLoading?: boolean;
  height?: number;
  className?: string;
}

function CoinChartComponent({
  coinId,
  symbol,
  chartData,
  chartLoading,
  height = 600,
  className,
}: CoinChartProps): React.ReactElement {
  const tvSymbol = getTradingViewSymbol(coinId, symbol);

  if (tvSymbol.isSupported) {
    return (
      <div className={cn('relative', className)}>
        <Badge
          variant="outline"
          className="absolute top-2 right-2 z-10 text-xs opacity-60"
        >
          TradingView
        </Badge>
        <AdvancedChart symbol={tvSymbol.symbol} height={height} />
      </div>
    );
  }

  // Fallback to lightweight-charts for DEX-only tokens
  return (
    <div className={cn('relative', className)}>
      <Badge
        variant="outline"
        className="absolute top-2 right-2 z-10 text-xs opacity-60"
      >
        DEX Data
      </Badge>
      {chartLoading ? (
        <Skeleton className="w-full" style={{ height }} />
      ) : chartData && chartData.length > 0 ? (
        <TradingChart data={chartData} height={height} type="candlestick" />
      ) : (
        <div
          className="flex items-center justify-center bg-card/50 rounded-lg border border-border"
          style={{ height }}
        >
          <p className="text-muted-foreground">No chart data available</p>
        </div>
      )}
    </div>
  );
}

export const CoinChart = memo(CoinChartComponent);
