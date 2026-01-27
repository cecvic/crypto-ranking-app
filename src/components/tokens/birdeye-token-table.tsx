'use client';

import React, { useState } from 'react';
import { useBirdeyeTokens } from '@/hooks/use-birdeye-tokens';
import { ChainSelector } from './chain-selector';
import { BirdeyeTokenResponse } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhaleIndicator } from './whale-indicator';

interface BirdeyeTokenTableProps {
  initialChain?: string;
  limit?: number;
}

function formatPrice(price: number | null): string {
  if (price === null) return '-';
  if (price < 0.00001) return `$${price.toExponential(2)}`;
  if (price < 1) return `$${price.toFixed(6)}`;
  if (price < 1000) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatVolume(volume: number | null): string {
  if (volume === null) return '-';
  if (volume >= 1_000_000_000) return `$${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(2)}K`;
  return `$${volume.toFixed(2)}`;
}

function formatPercentChange(change: number | null): React.ReactElement {
  if (change === null) return <span className="text-muted-foreground">-</span>;

  const isPositive = change >= 0;
  const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;

  return (
    <span className={cn(
      'flex items-center gap-1',
      isPositive ? 'text-green-500' : 'text-red-500'
    )}>
      <Icon className="h-3 w-3" />
      {Math.abs(change).toFixed(2)}%
    </span>
  );
}

function TokenRow({ token }: { token: BirdeyeTokenResponse }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          {token.logoUri ? (
            <img
              src={token.logoUri}
              alt={token.symbol}
              className="h-8 w-8 rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-mono">{token.symbol.slice(0, 2)}</span>
            </div>
          )}
          <div>
            <div className="font-medium">{token.symbol}</div>
            <div className="text-sm text-muted-foreground truncate max-w-[150px]">
              {token.name}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-muted">
          {token.chain}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatPrice(token.price)}
      </TableCell>
      <TableCell className="text-right">
        {formatPercentChange(token.priceChange24h)}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatVolume(token.volume24h)}
      </TableCell>
      <TableCell>
        <WhaleIndicator
          whaleScore={token.whaleScore}
          netFlow={token.netFlow24h}
          buyVolume={token.buyVolume24h}
          sellVolume={token.sellVolume24h}
        />
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatVolume(token.marketCap)}
      </TableCell>
    </TableRow>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {[...Array(10)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-6 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function BirdeyeTokenTable({ initialChain, limit = 100 }: BirdeyeTokenTableProps) {
  const [chain, setChain] = useState<string | undefined>(initialChain);

  const { data, isLoading, error, isFetching } = useBirdeyeTokens({
    chain,
    limit,
    sortBy: 'marketCap',
  });

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Token Rankings</h2>
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.count} tokens {chain ? `on ${chain}` : 'across all chains'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ChainSelector
            value={chain}
            onChange={setChain}
            className="w-[180px]"
          />
          {isFetching && !isLoading && (
            <span className="text-xs text-muted-foreground">Updating...</span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          Failed to load tokens: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Token</TableHead>
              <TableHead>Chain</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">24h Change</TableHead>
              <TableHead className="text-right">Volume (24h)</TableHead>
              <TableHead>Whale</TableHead>
              <TableHead className="text-right">Market Cap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingSkeleton />
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No tokens found. Try a different chain or check back later.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((token) => (
                <TokenRow key={`${token.chain}-${token.address}`} token={token} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cache indicator */}
      {data && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          {data.cached && <span>Cached</span>}
          <span>Updated: {new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
