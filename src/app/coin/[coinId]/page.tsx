'use client';

import { use } from 'react';
import { useCoin, useCoinChart } from '@/hooks/use-rankings';
import { TradingChart } from '@/components/charts/trading-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getSignalLabel } from '@/lib/ranking/calculator';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from 'lucide-react';

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
              ← Back to Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { coin, scores, signals, details } = coinData as any;
  const signal = getSignalLabel(scores.overall);

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `$${price.toPrecision(4)}`;
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Image
            src={coin.image}
            alt={coin.name}
            width={64}
            height={64}
            className="rounded-full"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{coin.name}</h1>
              <Badge variant="outline" className="text-lg">
                {coin.symbol}
              </Badge>
              <Badge variant="secondary">Rank #{coin.market_cap_rank}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-2xl font-mono">{formatPrice(coin.current_price)}</span>
              <span
                className={`flex items-center gap-1 ${
                  coin.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {coin.price_change_percentage_24h >= 0 ? (
                  <TrendingUpIcon className="h-4 w-4" />
                ) : (
                  <TrendingDownIcon className="h-4 w-4" />
                )}
                {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Overall Score */}
        <Card className="text-center px-6 py-4">
          <div className={`text-4xl font-bold ${getScoreColor(scores.overall)}`}>
            {scores.overall.toFixed(0)}
          </div>
          <Badge
            variant={signal.color === 'green' || signal.color === 'lime' ? 'default' : 'destructive'}
            className="mt-2"
          >
            {signal.label}
          </Badge>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="7d">
            <TabsList>
              <TabsTrigger value="1d">1D</TabsTrigger>
              <TabsTrigger value="7d">7D</TabsTrigger>
              <TabsTrigger value="30d">30D</TabsTrigger>
              <TabsTrigger value="90d">90D</TabsTrigger>
            </TabsList>
            <TabsContent value="7d" className="mt-4">
              {chartLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <TradingChart data={chartData || []} height={400} type="candlestick" />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <div className="grid gap-4 md:grid-cols-5">
        <ScoreCard title="Sentiment" score={scores.sentiment} />
        <ScoreCard title="Technical" score={scores.technical} />
        <ScoreCard title="Whale Activity" score={scores.whale} />
        <ScoreCard title="AI Prediction" score={scores.ai} />
        <ScoreCard title="Price Action" score={scores.pricePerformance} />
      </div>

      {/* Market Data */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Market Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataRow label="Market Cap" value={formatLargeNumber(coin.market_cap)} />
            <DataRow label="24h Volume" value={formatLargeNumber(coin.total_volume)} />
            <DataRow label="24h High" value={formatPrice(details?.marketData?.high24h || 0)} />
            <DataRow label="24h Low" value={formatPrice(details?.marketData?.low24h || 0)} />
            <DataRow label="All-Time High" value={formatPrice(details?.marketData?.ath || 0)} />
            <DataRow
              label="From ATH"
              value={`${details?.marketData?.athChangePercentage?.toFixed(2)}%`}
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
              value={details?.marketData?.circulatingSupply?.toLocaleString() || '--'}
            />
            <DataRow
              label="Total Supply"
              value={details?.marketData?.totalSupply?.toLocaleString() || '--'}
            />
            <DataRow
              label="Max Supply"
              value={details?.marketData?.maxSupply?.toLocaleString() || 'Unlimited'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Links */}
      {details?.links && (
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
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
  );
}

function ScoreCard({ title, score }: { title: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 70) return 'text-green-500 bg-green-500/10';
    if (s >= 50) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-red-500 bg-red-500/10';
  };

  return (
    <Card className={getColor(score)}>
      <CardContent className="py-4 text-center">
        <div className="text-2xl font-bold">{score.toFixed(0)}</div>
        <div className="text-sm font-medium mt-1">{title}</div>
      </CardContent>
    </Card>
  );
}

function DataRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueColor || ''}`}>{value}</span>
    </div>
  );
}

function CoinPageSkeleton() {
  return (
    <div className="container py-6 space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
      <Skeleton className="h-[400px] w-full" />
      <div className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
