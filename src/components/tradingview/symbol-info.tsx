'use client';

import { memo, useMemo } from 'react';
import { useTradingViewWidget } from '@/components/tradingview/use-tradingview-widget';
import { WIDGET_SCRIPTS, DARK_THEME } from '@/lib/tradingview/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SymbolInfoProps {
  symbol: string;
  className?: string;
}

function SymbolInfoComponent({ symbol, className }: SymbolInfoProps): React.ReactElement {
  const config = useMemo(
    () => ({
      symbol,
      width: '100%',
      isTransparent: DARK_THEME.isTransparent,
      colorTheme: DARK_THEME.colorTheme,
      locale: 'en',
    }),
    [symbol]
  );

  const { containerRef, isLoading } = useTradingViewWidget({
    scriptUrl: WIDGET_SCRIPTS.symbolInfo,
    containerId: `tradingview-info-${symbol}`,
    config,
  });

  return (
    <div className={cn('w-full', className)}>
      {isLoading && <Skeleton className="h-[80px] w-full" />}
      <div
        ref={containerRef}
        className={isLoading ? 'h-0 overflow-hidden' : ''}
      />
    </div>
  );
}

export const SymbolInfo = memo(SymbolInfoComponent);
