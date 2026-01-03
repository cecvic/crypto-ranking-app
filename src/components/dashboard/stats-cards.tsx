'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FearGreedIndex, CoinRanking } from '@/lib/types';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  GaugeIcon,
  ZapIcon,
  DollarSignIcon,
} from 'lucide-react';

interface StatsCardsProps {
  fearGreed?: FearGreedIndex;
  rankings?: CoinRanking[];
  isLoading?: boolean;
}

export function StatsCards({ fearGreed, rankings, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return <StatsCardsSkeleton />;
  }

  // Calculate stats from rankings
  const topGainers = rankings?.filter((r) => r.coin.price_change_percentage_24h > 0).length ?? 0;
  const topLosers = rankings?.filter((r) => r.coin.price_change_percentage_24h < 0).length ?? 0;
  const totalScore = rankings?.reduce((sum, r) => sum + r.scores.overall, 0) ?? 0;
  const avgScore = rankings && rankings.length > 0 ? totalScore / rankings.length : 0;
  const strongBuys = rankings?.filter((r) => r.scores.overall >= 70).length ?? 0;

  const getFearGreedColor = (value: number) => {
    if (value <= 25) return 'text-red-500';
    if (value <= 45) return 'text-orange-500';
    if (value <= 55) return 'text-yellow-500';
    if (value <= 75) return 'text-lime-500';
    return 'text-green-500';
  };

  const getFearGreedBg = (value: number) => {
    if (value <= 25) return 'bg-red-500/10';
    if (value <= 45) return 'bg-orange-500/10';
    if (value <= 55) return 'bg-yellow-500/10';
    if (value <= 75) return 'bg-lime-500/10';
    return 'bg-green-500/10';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Fear & Greed Index */}
      <Card className={fearGreed ? getFearGreedBg(fearGreed.value) : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fear & Greed Index</CardTitle>
          <GaugeIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold ${
                fearGreed ? getFearGreedColor(fearGreed.value) : ''
              }`}
            >
              {fearGreed?.value || '--'}
            </span>
            <span className="text-sm text-muted-foreground">
              {fearGreed?.classification || 'Loading...'}
            </span>
          </div>
          {fearGreed?.previousValue !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              {fearGreed.value > fearGreed.previousValue ? '↑' : '↓'} from{' '}
              {fearGreed.previousValue} yesterday
            </p>
          )}
        </CardContent>
      </Card>

      {/* Market Sentiment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Market Trend</CardTitle>
          <ActivityIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-green-500">
              <TrendingUpIcon className="h-4 w-4" />
              <span className="text-xl font-bold">{topGainers}</span>
            </div>
            <div className="flex items-center gap-1 text-red-500">
              <TrendingDownIcon className="h-4 w-4" />
              <span className="text-xl font-bold">{topLosers}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {topGainers > topLosers ? 'Bullish' : 'Bearish'} sentiment in 24h
          </p>
        </CardContent>
      </Card>

      {/* Average Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Ranking Score</CardTitle>
          <ZapIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{avgScore.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Across {rankings?.length || 0} tracked coins
          </p>
        </CardContent>
      </Card>

      {/* Strong Buys */}
      <Card className="bg-green-500/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Strong Buy Signals</CardTitle>
          <DollarSignIcon className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-500">{strongBuys}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Coins with score {'>'}70
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
