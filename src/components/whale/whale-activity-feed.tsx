'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { WhaleEvent } from '@/hooks/use-whale-data';
import {
  ExternalLinkIcon,
  ArrowRightIcon,
  RefreshCwIcon,
} from 'lucide-react';

interface WhaleActivityFeedProps {
  events?: WhaleEvent[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const eventTime = new Date(timestamp).getTime();
  const diff = now - eventTime;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatValue(valueToken: string | null, valueUsd: string | null, symbol: string | null): string {
  const token = valueToken ? parseFloat(valueToken) : 0;
  const usd = valueUsd ? parseFloat(valueUsd) : 0;

  let tokenStr = '';
  if (token >= 1000) {
    tokenStr = `${(token / 1000).toFixed(1)}K`;
  } else if (token >= 1) {
    tokenStr = token.toFixed(2);
  } else {
    tokenStr = token.toFixed(4);
  }

  let usdStr = '';
  if (usd >= 1_000_000) {
    usdStr = `($${(usd / 1_000_000).toFixed(2)}M)`;
  } else if (usd >= 1_000) {
    usdStr = `($${(usd / 1_000).toFixed(1)}K)`;
  } else if (usd > 0) {
    usdStr = `($${usd.toFixed(0)})`;
  }

  return `${tokenStr} ${symbol?.toUpperCase() || ''} ${usdStr}`.trim();
}

function getTransferTypeBadge(type: string): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  switch (type) {
    case 'exchange_inflow':
      return { label: 'Exchange Inflow', variant: 'destructive' };
    case 'exchange_outflow':
      return { label: 'Exchange Outflow', variant: 'default' };
    case 'wallet_to_wallet':
      return { label: 'Wallet Transfer', variant: 'secondary' };
    case 'exchange_to_exchange':
      return { label: 'Inter-Exchange', variant: 'outline' };
    default:
      return { label: type, variant: 'outline' };
  }
}

function getEtherscanLink(txHash: string, chain: string): string {
  if (chain === 'ethereum' || chain === 'mainnet') {
    return `https://etherscan.io/tx/${txHash}`;
  }
  return `https://etherscan.io/tx/${txHash}`;
}

export function WhaleActivityFeed({ events, isLoading, onRefresh }: WhaleActivityFeedProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (typeFilter === 'all') return events;
    return events.filter((e) => e.transferType === typeFilter);
  }, [events, typeFilter]);

  if (isLoading) {
    return <WhaleActivityFeedSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Real-time Whale Activity</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="exchange_inflow">Inflow</SelectItem>
                <SelectItem value="exchange_outflow">Outflow</SelectItem>
                <SelectItem value="wallet_to_wallet">Wallet</SelectItem>
              </SelectContent>
            </Select>
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh}>
                <RefreshCwIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <p className="text-sm">No whale activity found</p>
              <p className="text-xs mt-1">Check back later for whale movements</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const badge = getTransferTypeBadge(event.transferType);
                return (
                  <div
                    key={event.id}
                    className="border-b border-border/50 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(event.blockTimestamp)}
                      </span>
                      <Badge variant={badge.variant} className="text-xs">
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">
                        {formatValue(event.valueToken, event.valueUsd, event.tokenSymbol)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <span>{event.fromLabel || formatAddress(event.fromAddress)}</span>
                      <ArrowRightIcon className="h-3 w-3" />
                      <span>{event.toLabel || formatAddress(event.toAddress)}</span>
                    </div>
                    <a
                      href={getEtherscanLink(event.transactionHash, event.chain)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View on Etherscan
                      <ExternalLinkIcon className="h-3 w-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function WhaleActivityFeedSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border/50 pb-4 last:border-0">
              <div className="flex justify-between mb-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-64 mb-2" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
