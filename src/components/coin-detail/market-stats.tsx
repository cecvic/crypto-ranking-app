'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MarketStatsProps {
  coin: {
    market_cap: number;
    total_volume: number;
  };
  details?: {
    marketData?: {
      high24h?: number;
      low24h?: number;
      ath?: number;
      athChangePercentage?: number;
      circulatingSupply?: number;
      totalSupply?: number;
      maxSupply?: number;
    };
  };
}

function formatPrice(price: number): string {
  if (!price) return '--';
  if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${price.toPrecision(4)}`;
}

function formatLargeNumber(num: number): string {
  if (!num) return '--';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
}

function DataRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}): React.ReactElement {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', valueColor)}>{value}</span>
    </div>
  );
}

export function MarketStats({ coin, details }: MarketStatsProps): React.ReactElement {
  const md = details?.marketData;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Market Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataRow label="Market Cap" value={formatLargeNumber(coin.market_cap)} />
          <DataRow label="24h Volume" value={formatLargeNumber(coin.total_volume)} />
          <DataRow label="24h High" value={formatPrice(md?.high24h ?? 0)} />
          <DataRow label="24h Low" value={formatPrice(md?.low24h ?? 0)} />
          <DataRow label="All-Time High" value={formatPrice(md?.ath ?? 0)} />
          <DataRow
            label="From ATH"
            value={md?.athChangePercentage ? `${md.athChangePercentage.toFixed(2)}%` : '--'}
            valueColor="text-red-500"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supply Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataRow
            label="Circulating Supply"
            value={md?.circulatingSupply?.toLocaleString() ?? '--'}
          />
          <DataRow
            label="Total Supply"
            value={md?.totalSupply?.toLocaleString() ?? '--'}
          />
          <DataRow
            label="Max Supply"
            value={md?.maxSupply?.toLocaleString() ?? 'Unlimited'}
          />
        </CardContent>
      </Card>
    </div>
  );
}
