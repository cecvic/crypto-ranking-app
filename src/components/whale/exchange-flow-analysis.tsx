'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WhaleMetrics } from '@/hooks/use-whale-data';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
} from 'lucide-react';

interface ExchangeFlowAnalysisProps {
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

function getSentiment(netFlow: number, totalVolume: number): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive';
  icon: React.ReactNode;
} {
  if (totalVolume === 0) {
    return {
      label: 'No Activity',
      variant: 'secondary',
      icon: <MinusIcon className="h-3 w-3" />,
    };
  }

  const ratio = Math.abs(netFlow) / totalVolume;

  if (netFlow > 0 && ratio > 0.1) {
    return {
      label: 'Accumulating',
      variant: 'default',
      icon: <TrendingUpIcon className="h-3 w-3" />,
    };
  } else if (netFlow < 0 && ratio > 0.1) {
    return {
      label: 'Distributing',
      variant: 'destructive',
      icon: <TrendingDownIcon className="h-3 w-3" />,
    };
  }

  return {
    label: 'Neutral',
    variant: 'secondary',
    icon: <MinusIcon className="h-3 w-3" />,
  };
}

export function ExchangeFlowAnalysis({ metrics, isLoading }: ExchangeFlowAnalysisProps) {
  if (isLoading) {
    return <ExchangeFlowAnalysisSkeleton />;
  }

  const inflow = metrics?.exchangeInflow || 0;
  const outflow = metrics?.exchangeOutflow || 0;
  const totalFlow = inflow + outflow;
  const inflowPercent = totalFlow > 0 ? (inflow / totalFlow) * 100 : 50;
  const outflowPercent = 100 - inflowPercent;
  const netFlow = metrics?.netFlow || 0;

  const sentiment = getSentiment(netFlow, totalFlow);
  const topTokens = metrics?.topTokensByVolume || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Exchange Flow Analysis</span>
          <Badge variant={sentiment.variant} className="flex items-center gap-1">
            {sentiment.icon}
            {sentiment.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Flow Visualization */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-red-500 font-medium">Inflow {inflowPercent.toFixed(0)}%</span>
            <span className="text-green-500 font-medium">Outflow {outflowPercent.toFixed(0)}%</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden flex">
            <div
              className="bg-red-500 h-full transition-all duration-500"
              style={{ width: `${inflowPercent}%` }}
            />
            <div
              className="bg-green-500 h-full transition-all duration-500"
              style={{ width: `${outflowPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatUsd(inflow)}</span>
            <span>Net: {netFlow >= 0 ? '+' : ''}{formatUsd(netFlow)}</span>
            <span>{formatUsd(outflow)}</span>
          </div>
        </div>

        {/* Top Tokens */}
        {topTokens.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Top Tokens by Volume</h4>
            <div className="space-y-2">
              {topTokens.slice(0, 5).map((token, index) => (
                <div
                  key={token.coinGeckoId || index}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{index + 1}.</span>
                    <span className="font-medium uppercase">{token.symbol || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {token.transactionCount} txns
                    </span>
                    <span className="font-mono">{formatUsd(token.volume)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {topTokens.length === 0 && totalFlow === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No whale activity in the last 24 hours</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExchangeFlowAnalysisSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
