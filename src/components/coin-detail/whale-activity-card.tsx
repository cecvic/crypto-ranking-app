'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WhaleActivity } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FishIcon } from 'lucide-react';

interface WhaleActivityCardProps {
  whale: WhaleActivity | null;
  whaleScore: number;
}

function formatFlow(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function FlowRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}): React.ReactElement {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium', valueColor)}>{value}</span>
    </div>
  );
}

export function WhaleActivityCard({ whale, whaleScore }: WhaleActivityCardProps): React.ReactElement {
  if (!whale) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FishIcon className="h-5 w-5" />
            Whale Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No whale activity data available</p>
        </CardContent>
      </Card>
    );
  }

  const netFlowPositive = whale.netFlow24h >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FishIcon className="h-5 w-5" />
            Whale Activity
          </CardTitle>
          <span
            className={cn(
              'text-lg font-bold',
              whaleScore >= 70 ? 'text-green-500' : whaleScore >= 50 ? 'text-yellow-500' : 'text-red-500'
            )}
          >
            {Math.round(whaleScore)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <FlowRow
          label="Net Flow (24h)"
          value={`${netFlowPositive ? '+' : ''}${formatFlow(whale.netFlow24h)}`}
          valueColor={netFlowPositive ? 'text-green-500' : 'text-red-500'}
        />
        <FlowRow
          label="Exchange Inflow"
          value={formatFlow(whale.exchangeInflow24h)}
          valueColor="text-red-400"
        />
        <FlowRow
          label="Exchange Outflow"
          value={formatFlow(whale.exchangeOutflow24h)}
          valueColor="text-green-400"
        />
        <FlowRow
          label="Large Txns (24h)"
          value={whale.largeTransactions24h.toLocaleString()}
        />
        {whale.topHoldersChange !== undefined && (
          <FlowRow
            label="Top Holders Change"
            value={`${whale.topHoldersChange >= 0 ? '+' : ''}${whale.topHoldersChange.toFixed(2)}%`}
            valueColor={whale.topHoldersChange >= 0 ? 'text-green-500' : 'text-red-500'}
          />
        )}
      </CardContent>
    </Card>
  );
}
