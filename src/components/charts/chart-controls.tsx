'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Timeframes map to CoinGecko's 'days' parameter
// Granularity is auto-selected by CoinGecko:
// - 1 day: 30-minute candles
// - 7-14 days: 4-hour candles
// - 30+ days: 4-day candles
const TIMEFRAMES = [
  { value: '1', label: '1D', granularity: '30m candles' },
  { value: '7', label: '7D', granularity: '4h candles' },
  { value: '30', label: '30D', granularity: '4d candles' },
  { value: '90', label: '90D', granularity: '4d candles' },
] as const;

interface TimeframeSwitcherProps {
  defaultValue: string;
  onValueChange?: (value: string) => void;
}

export function TimeframeSwitcher({
  defaultValue,
  onValueChange,
}: TimeframeSwitcherProps) {
  return (
    <ToggleGroup
      type="single"
      defaultValue={defaultValue}
      onValueChange={(value) => value && onValueChange?.(value)}
      className="gap-0.5"
    >
      {TIMEFRAMES.map((tf) => (
        <ToggleGroupItem
          key={tf.value}
          value={tf.value}
          size="sm"
          className="text-xs px-2 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {tf.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
