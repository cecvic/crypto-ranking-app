'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MiniConfluenceRadar } from '@/components/charts/mini-confluence-radar';
import { CoinRanking } from '@/lib/types';
import { ConfluenceResult } from '@/lib/types/confluence';
import {
  getTopConfluenceOpportunities,
  calculateConfluence,
} from '@/lib/confluence/calculator';
import { RadarIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface ConfluenceOpportunitiesProps {
  rankings?: CoinRanking[];
  isLoading?: boolean;
}

export function ConfluenceOpportunities({
  rankings,
  isLoading,
}: ConfluenceOpportunitiesProps) {
  const bullishOpportunities = useMemo(() => {
    if (!rankings) return [];
    return getTopConfluenceOpportunities(rankings, {
      direction: 'bullish',
      minAligned: 4,
      limit: 5,
    });
  }, [rankings]);

  const bearishOpportunities = useMemo(() => {
    if (!rankings) return [];
    return getTopConfluenceOpportunities(rankings, {
      direction: 'bearish',
      minAligned: 4,
      limit: 5,
    });
  }, [rankings]);

  if (isLoading) {
    return <ConfluenceOpportunitiesSkeleton />;
  }

  const hasBullish = bullishOpportunities.length > 0;
  const hasBearish = bearishOpportunities.length > 0;

  if (!hasBullish && !hasBearish) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RadarIcon className="h-5 w-5 text-primary" />
            Confluence Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No strong confluence signals detected. Coins need 4+ aligned factors
            to appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RadarIcon className="h-5 w-5 text-primary" />
          Confluence Radar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bullish Confluence */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-500 font-medium">
              <TrendingUpIcon className="h-4 w-4" />
              Bullish Confluence
            </div>
            {bullishOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No bullish confluence signals
              </p>
            ) : (
              <div className="space-y-2">
                {bullishOpportunities.map(({ ranking, confluence }) => (
                  <OpportunityItem
                    key={ranking.coin.id}
                    ranking={ranking}
                    confluence={confluence}
                    type="bullish"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bearish Confluence */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-500 font-medium">
              <TrendingDownIcon className="h-4 w-4" />
              Bearish Confluence
            </div>
            {bearishOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No bearish confluence signals
              </p>
            ) : (
              <div className="space-y-2">
                {bearishOpportunities.map(({ ranking, confluence }) => (
                  <OpportunityItem
                    key={ranking.coin.id}
                    ranking={ranking}
                    confluence={confluence}
                    type="bearish"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityItem({
  ranking,
  confluence,
  type,
}: {
  ranking: CoinRanking;
  confluence: ConfluenceResult;
  type: 'bullish' | 'bearish';
}) {
  const { coin, scores } = ranking;
  const alignedCount =
    type === 'bullish' ? confluence.bullishCount : confluence.bearishCount;

  return (
    <Link
      href={`/coin/${coin.id}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
    >
      {/* Mini Radar */}
      <MiniConfluenceRadar scores={scores} width={50} height={45} />

      {/* Coin Info */}
      <Image
        src={coin.image}
        alt={coin.name}
        width={28}
        height={28}
        className="rounded-full"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{coin.name}</div>
        <div className="text-xs text-muted-foreground uppercase">
          {coin.symbol}
        </div>
      </div>

      {/* Confluence Badge */}
      <Badge
        variant={type === 'bullish' ? 'default' : 'destructive'}
        className="text-xs"
      >
        {alignedCount}/5
      </Badge>
    </Link>
  );
}

function ConfluenceOpportunitiesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map((col) => (
            <div key={col} className="space-y-3">
              <Skeleton className="h-5 w-36" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-11 w-12 rounded" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-5 w-10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
