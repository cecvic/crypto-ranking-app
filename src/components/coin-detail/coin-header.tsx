'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CoinRanking } from '@/lib/types';
import { getSignalLabel } from '@/lib/ranking/calculator';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoinHeaderProps {
  coin: CoinRanking['coin'];
  scores: CoinRanking['scores'];
}

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${price.toPrecision(4)}`;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

export function CoinHeader({ coin, scores }: CoinHeaderProps): React.ReactElement {
  const signal = getSignalLabel(scores.overall);
  const isPositive = coin.price_change_percentage_24h >= 0;

  return (
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div className="flex items-center gap-4">
        <Image
          src={coin.image}
          alt={coin.name}
          width={64}
          height={64}
          className="rounded-full"
        />
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{coin.name}</h1>
            <Badge variant="outline" className="text-lg">
              {coin.symbol}
            </Badge>
            <Badge variant="secondary">Rank #{coin.market_cap_rank}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-2xl font-mono">{formatPrice(coin.current_price)}</span>
            <span
              className={cn(
                'flex items-center gap-1',
                isPositive ? 'text-green-500' : 'text-red-500'
              )}
            >
              {isPositive ? (
                <TrendingUpIcon className="h-4 w-4" />
              ) : (
                <TrendingDownIcon className="h-4 w-4" />
              )}
              {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <Card className="text-center px-6 py-4">
        <div className={cn('text-4xl font-bold', getScoreColor(scores.overall))}>
          {scores.overall.toFixed(0)}
        </div>
        <Badge
          variant={
            signal.color === 'green' || signal.color === 'lime'
              ? 'default'
              : signal.color === 'yellow'
                ? 'secondary'
                : 'destructive'
          }
          className="mt-2"
        >
          {signal.label}
        </Badge>
      </Card>
    </div>
  );
}
