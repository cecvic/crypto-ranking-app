'use client';

import { use } from 'react';
import { useCoin, useCoinChart } from '@/hooks/use-rankings';
import { CoinChart } from '@/components/charts/coin-chart';
import { ConfluenceRadar } from '@/components/charts/confluence-radar';
import { TickerTape } from '@/components/tradingview/ticker-tape';
import { TechnicalAnalysis } from '@/components/tradingview/technical-analysis';
import { CoinHeader } from '@/components/coin-detail/coin-header';
import { ScoreCards } from '@/components/coin-detail/score-cards';
import { MarketStats } from '@/components/coin-detail/market-stats';
import { AIPredictionsCard } from '@/components/coin-detail/ai-predictions-card';
import { WhaleActivityCard } from '@/components/coin-detail/whale-activity-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getTradingViewSymbol } from '@/lib/tradingview/symbol-map';
import Link from 'next/link';
import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react';

interface CoinPageProps {
  params: Promise<{ coinId: string }>;
}

export default function CoinPage({ params }: CoinPageProps) {
  const { coinId } = use(params);
  const { data: coinData, isLoading: coinLoading } = useCoin(coinId);
  const { data: chartData, isLoading: chartLoading } = useCoinChart(coinId, 7);

  if (coinLoading) {
    return <CoinPageSkeleton />;
  }

  if (!coinData) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Coin not found</p>
            <Link href="/" className="text-primary hover:underline mt-2 inline-block">
              Back to Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { coin, scores, signals, details } = coinData as any;
  const tvSymbol = getTradingViewSymbol(coinId, coin.symbol);

  return (
    <div className="min-h-screen">
      {/* Ticker Tape */}
      <TickerTape />

      <div className="container py-6 space-y-6">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Rankings
        </Link>

        {/* Coin Header */}
        <CoinHeader coin={coin} scores={scores} />

        {/* Chart + Technical Analysis side by side */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <CoinChart
              coinId={coinId}
              symbol={coin.symbol}
              chartData={chartData}
              chartLoading={chartLoading}
              height={600}
            />
          </Card>

          {tvSymbol.isSupported && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Technical Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TechnicalAnalysis
                  symbol={tvSymbol.symbol}
                  height={540}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Score Cards */}
        <ScoreCards scores={scores} />

        {/* Confluence Radar + Market Stats */}
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Confluence Radar</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ConfluenceRadar scores={scores} size="lg" />
            </CardContent>
          </Card>

          <MarketStats coin={coin} details={details} />
        </div>

        {/* AI Predictions + Whale Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <AIPredictionsCard
            ai={signals.ai}
            aiScore={scores.ai ?? 0}
          />
          <WhaleActivityCard
            whale={signals.whale}
            whaleScore={scores.whale ?? 0}
          />
        </div>

        {/* Links */}
        {details?.links && (
          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {details.links.homepage && (
                <Link
                  href={details.links.homepage}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Website <ExternalLinkIcon className="h-3 w-3" />
                </Link>
              )}
              {details.links.twitter && (
                <Link
                  href={details.links.twitter}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Twitter <ExternalLinkIcon className="h-3 w-3" />
                </Link>
              )}
              {details.links.reddit && (
                <Link
                  href={details.links.reddit}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Reddit <ExternalLinkIcon className="h-3 w-3" />
                </Link>
              )}
              {details.links.github && (
                <Link
                  href={details.links.github}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  GitHub <ExternalLinkIcon className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CoinPageSkeleton() {
  return (
    <div className="min-h-screen">
      <Skeleton className="h-[46px] w-full" />
      <div className="container py-6 space-y-6">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    </div>
  );
}
