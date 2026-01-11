'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ActivityIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import { WhaleMetrics } from '@/hooks/use-whale-data';

interface WhaleStatsCardsProps {
  metrics?: WhaleMetrics;
  isLoading?: boolean;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function WhaleStatsCards({ metrics, isLoading }: WhaleStatsCardsProps) {
  if (isLoading) {
    return <WhaleStatsCardsSkeleton />;
  }

  const netFlow = metrics?.netFlow || 0;
  const isPositiveFlow = netFlow >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          <ActivityIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {metrics?.totalTransactions || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Whale movements (24h)
          </p>
        </CardContent>
      </Card>

      {/* Net Flow */}
      <Card className={isPositiveFlow ? 'bg-green-500/10' : 'bg-red-500/10'}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
          {isPositiveFlow ? (
            <TrendingUpIcon className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDownIcon className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${isPositiveFlow ? 'text-green-500' : 'text-red-500'}`}>
            {isPositiveFlow ? '+' : ''}{formatUsd(netFlow)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isPositiveFlow ? 'Accumulation (Bullish)' : 'Distribution (Bearish)'}
          </p>
        </CardContent>
      </Card>

      {/* Exchange Inflow (Sell Pressure) */}
      <Card className="bg-red-500/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Exchange Inflow</CardTitle>
          <ArrowRightIcon className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-500">
            {formatUsd(metrics?.exchangeInflow || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Potential sell pressure
          </p>
        </CardContent>
      </Card>

      {/* Exchange Outflow (Accumulation) */}
      <Card className="bg-green-500/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Exchange Outflow</CardTitle>
          <ArrowLeftIcon className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-500">
            {formatUsd(metrics?.exchangeOutflow || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Accumulation signal
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function WhaleStatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
