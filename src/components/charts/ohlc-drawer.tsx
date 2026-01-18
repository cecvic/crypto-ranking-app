'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { OHLCCandle } from '@/lib/types/ai';

interface OHLCDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candle: OHLCCandle | null;
}

export function OHLCDrawer({ open, onOpenChange, candle }: OHLCDrawerProps) {
  if (!candle) return null;

  const isGreen = candle.close >= candle.open;
  const change = ((candle.close - candle.open) / candle.open * 100).toFixed(2);
  const date = new Date(candle.time * 1000);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            <span>{date.toLocaleDateString()}</span>
            <span className={isGreen ? 'text-green-500' : 'text-red-500'}>
              {isGreen ? '+' : ''}{change}%
            </span>
          </DrawerTitle>
        </DrawerHeader>
        <div className="grid grid-cols-2 gap-4 p-4 pb-8">
          <div>
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="text-lg font-mono">${candle.open.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Close</p>
            <p className={`text-lg font-mono ${isGreen ? 'text-green-500' : 'text-red-500'}`}>
              ${candle.close.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">High</p>
            <p className="text-lg font-mono">${candle.high.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Low</p>
            <p className="text-lg font-mono">${candle.low.toLocaleString()}</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
