'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CoinRanking } from '@/lib/types';
import { TrendingUpIcon, TrendingDownIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface TopMoversProps {
  rankings?: CoinRanking[];
  isLoading?: boolean;
}

export function TopMovers({ rankings, isLoading }: TopMoversProps) {
  if (isLoading) {
    return <TopMoversSkeleton />;
  }

  if (!rankings || rankings.length === 0) {
    return null;
  }

  // Get top gainers and losers by 24h change
  const sorted = [...rankings].sort(
    (a, b) => b.coin.price_change_percentage_24h - a.coin.price_change_percentage_24h
  );

  const topGainers = sorted.slice(0, 5);
  const topLosers = sorted.slice(-5).reverse();

  // Get highest scoring coins
  const topScores = [...rankings]
    .sort((a, b) => b.scores.overall - a.scores.overall)
    .slice(0, 5);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Top Gainers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-500">
            <TrendingUpIcon className="h-5 w-5" />
            Top Gainers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topGainers.map((ranking, index) => (
            <MoverItem
              key={ranking.coin.id}
              ranking={ranking}
              index={index + 1}
              type="gainer"
            />
          ))}
        </CardContent>
      </Card>

      {/* Top Losers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-500">
            <TrendingDownIcon className="h-5 w-5" />
            Top Losers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topLosers.map((ranking, index) => (
            <MoverItem
              key={ranking.coin.id}
              ranking={ranking}
              index={index + 1}
              type="loser"
            />
          ))}
        </CardContent>
      </Card>

      {/* Highest Scores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-primary">
            <ArrowUpIcon className="h-5 w-5" />
            Best Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topScores.map((ranking, index) => (
            <MoverItem
              key={ranking.coin.id}
              ranking={ranking}
              index={index + 1}
              type="score"
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MoverItem({
  ranking,
  index,
  type,
}: {
  ranking: CoinRanking;
  index: number;
  type: 'gainer' | 'loser' | 'score';
}) {
  const { coin, scores } = ranking;

  const formatChange = (change: number) => {
    const abs = Math.abs(change).toFixed(2);
    return change >= 0 ? `+${abs}%` : `-${abs}%`;
  };

  return (
    <Link
      href={`/coin/${coin.id}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <span className="text-sm text-muted-foreground w-4">{index}</span>
      <Image
        src={coin.image}
        alt={coin.name}
        width={28}
        height={28}
        className="rounded-full"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{coin.name}</div>
        <div className="text-xs text-muted-foreground">{coin.symbol}</div>
      </div>
      {type === 'score' ? (
        <Badge variant="default" className="text-xs">
          {scores.overall.toFixed(0)}
        </Badge>
      ) : (
        <span
          className={`text-sm font-medium ${
            coin.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {formatChange(coin.price_change_percentage_24h)}
        </span>
      )}
    </Link>
  );
}

function TopMoversSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, cardIndex) => (
        <Card key={cardIndex}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
