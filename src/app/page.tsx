'use client';

import { useRankings, useFearGreed } from '@/hooks/use-rankings';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { TopMovers } from '@/components/dashboard/top-movers';
import { RankingsTable } from '@/components/rankings/rankings-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCwIcon } from 'lucide-react';

export default function DashboardPage() {
  const { data: rankings, isLoading: rankingsLoading, dataUpdatedAt } = useRankings({
    refetchInterval: 60000, // Refetch every minute
  });
  const { data: fearGreed, isLoading: fearGreedLoading } = useFearGreed();

  const isLoading = rankingsLoading || fearGreedLoading;
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : '--:--:--';

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Crypto Rankings</h1>
          <p className="text-muted-foreground">
            Live rankings based on 5-factor analysis
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Last updated: {lastUpdated}
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        fearGreed={fearGreed}
        rankings={rankings}
        isLoading={isLoading}
      />

      {/* Top Movers */}
      <TopMovers rankings={rankings} isLoading={isLoading} />

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Top 100 Cryptocurrencies by Ranking Score</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">Sentiment 20%</Badge>
              <Badge variant="outline">Technical 25%</Badge>
              <Badge variant="outline">Whale 20%</Badge>
              <Badge variant="outline">AI 20%</Badge>
              <Badge variant="outline">Price 15%</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RankingsTable rankings={rankings || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Legend/Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Scores Are Calculated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <h4 className="font-medium text-sm mb-1">Sentiment (20%)</h4>
              <p className="text-xs text-muted-foreground">
                Social media buzz, news sentiment, Fear & Greed index
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Technical (25%)</h4>
              <p className="text-xs text-muted-foreground">
                RSI, MACD, Bollinger Bands, SuperTrend signals
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Whale Activity (20%)</h4>
              <p className="text-xs text-muted-foreground">
                Large transactions, exchange flows, TVL changes
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">AI Prediction (20%)</h4>
              <p className="text-xs text-muted-foreground">
                ML price forecasts, neural network predictions
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Price Action (15%)</h4>
              <p className="text-xs text-muted-foreground">
                24h and 7d price performance, momentum
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
