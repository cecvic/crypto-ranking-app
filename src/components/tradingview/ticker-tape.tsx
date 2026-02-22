'use client';

import { memo } from 'react';
import { useTradingViewWidget } from '@/components/tradingview/use-tradingview-widget';
import { WIDGET_SCRIPTS, DARK_THEME, TICKER_TAPE_SYMBOLS } from '@/lib/tradingview/constants';
import { Skeleton } from '@/components/ui/skeleton';

function TickerTapeComponent(): React.ReactElement {
  const config = {
    symbols: TICKER_TAPE_SYMBOLS,
    showSymbolLogo: true,
    isTransparent: DARK_THEME.isTransparent,
    colorTheme: DARK_THEME.colorTheme,
    displayMode: 'adaptive',
    locale: 'en',
  };

  const { containerRef, isLoading } = useTradingViewWidget({
    scriptUrl: WIDGET_SCRIPTS.tickerTape,
    containerId: 'tradingview-ticker-tape',
    config,
  });

  return (
    <div className="w-full border-b border-border overflow-hidden">
      {isLoading && <Skeleton className="h-[46px] w-full" />}
      <div
        ref={containerRef}
        className={isLoading ? 'h-0 overflow-hidden' : ''}
      />
    </div>
  );
}

export const TickerTape = memo(TickerTapeComponent);
