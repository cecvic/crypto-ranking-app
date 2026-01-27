'use client';

import React, { useState, useMemo } from 'react';
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
import { ArrowUpIcon, ArrowDownIcon, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhaleIndicator } from './whale-indicator';

type SortKey = 'symbol' | 'chain' | 'price' | 'priceChange24h' | 'volume24h' | 'whaleScore' | 'marketCap';
type SortDirection = 'asc' | 'desc';

interface BirdeyeTokenTableProps {
  initialChain?: string;
  limit?: number;
}

interface SortableHeaderProps {
  children: React.ReactNode;
  sortKey: SortKey;
  currentSortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortableHeader({
  children,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = sortKey === currentSortKey;

  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:bg-muted/50 transition-colors', className)}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn('flex items-center gap-1', className?.includes('text-right') && 'justify-end')}>
        {children}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUpIcon className="h-4 w-4" />
          ) : (
            <ArrowDownIcon className="h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
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
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data, isLoading, error, isFetching } = useBirdeyeTokens({
    chain,
    limit,
    sortBy: 'marketCap',
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to desc (highest first)
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!data?.data) return [];

    return [...data.data].sort((a, b) => {
      let aVal: number | string | null = null;
      let bVal: number | string | null = null;

      switch (sortKey) {
        case 'symbol':
          aVal = a.symbol.toLowerCase();
          bVal = b.symbol.toLowerCase();
          break;
        case 'chain':
          aVal = a.chain.toLowerCase();
          bVal = b.chain.toLowerCase();
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'priceChange24h':
          aVal = a.priceChange24h;
          bVal = b.priceChange24h;
          break;
        case 'volume24h':
          aVal = a.volume24h;
          bVal = b.volume24h;
          break;
        case 'whaleScore':
          aVal = a.whaleScore;
          bVal = b.whaleScore;
          break;
        case 'marketCap':
          aVal = a.marketCap;
          bVal = b.marketCap;
          break;
      }

      // Handle nulls - always sort them to the end
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      // Compare values
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else {
        comparison = (aVal as number) - (bVal as number);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data?.data, sortKey, sortDirection]);

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
              <SortableHeader
                sortKey="symbol"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-[250px]"
              >
                Token
              </SortableHeader>
              <SortableHeader
                sortKey="chain"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Chain
              </SortableHeader>
              <SortableHeader
                sortKey="price"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-right"
              >
                Price
              </SortableHeader>
              <SortableHeader
                sortKey="priceChange24h"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-right"
              >
                24h Change
              </SortableHeader>
              <SortableHeader
                sortKey="volume24h"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-right"
              >
                Volume (24h)
              </SortableHeader>
              <SortableHeader
                sortKey="whaleScore"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Whale
              </SortableHeader>
              <SortableHeader
                sortKey="marketCap"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-right"
              >
                Market Cap
              </SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingSkeleton />
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No tokens found. Try a different chain or check back later.
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((token) => (
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
