'use client';

import { useWhaleEvents, useWhaleMetrics, useTopWhaleMovements } from '@/hooks/use-whale-data';
import { WhaleStatsCards } from '@/components/whale/whale-stats-cards';
import { ExchangeFlowAnalysis } from '@/components/whale/exchange-flow-analysis';
import { WhaleActivityFeed } from '@/components/whale/whale-activity-feed';
import { TopWhaleMovements } from '@/components/whale/top-whale-movements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCwIcon, AnchorIcon } from 'lucide-react';

export default function WhaleAlertsPage() {
  const { data: metrics, isLoading: metricsLoading } = useWhaleMetrics('24h');
  const {
    data: events,
    isLoading: eventsLoading,
    dataUpdatedAt,
    refetch: refetchEvents,
  } = useWhaleEvents({ limit: 50 });
  const { data: topMovements, isLoading: topLoading } = useTopWhaleMovements(10, '24h');

  const isLoading = metricsLoading || eventsLoading || topLoading;
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : '--:--:--';

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AnchorIcon className="h-8 w-8" />
            Whale Alerts
          </h1>
          <p className="text-muted-foreground">
            Real-time large transaction monitoring and exchange flow analysis
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Last updated: {lastUpdated}
        </div>
      </div>

      {/* Stats Cards */}
      <WhaleStatsCards metrics={metrics} isLoading={metricsLoading} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Exchange Flow Analysis */}
        <ExchangeFlowAnalysis metrics={metrics} isLoading={metricsLoading} />

        {/* Activity Feed */}
        <WhaleActivityFeed
          events={events}
          isLoading={eventsLoading}
          onRefresh={() => refetchEvents()}
        />
      </div>

      {/* Top Movements Table */}
      <TopWhaleMovements events={topMovements} isLoading={topLoading} />

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Understanding Whale Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-medium text-sm mb-1">Exchange Inflow</h4>
              <p className="text-xs text-muted-foreground">
                Large transfers TO exchanges often indicate potential selling pressure.
                Whales may be preparing to sell their holdings.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Exchange Outflow</h4>
              <p className="text-xs text-muted-foreground">
                Large transfers FROM exchanges suggest accumulation and long-term holding.
                This is typically a bullish signal.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Net Flow</h4>
              <p className="text-xs text-muted-foreground">
                Positive net flow (more outflows than inflows) is typically bullish.
                Negative net flow suggests distribution.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
