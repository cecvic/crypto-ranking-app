'use client';

import React, { useState, useMemo } from 'react';
import { useBirdeyeTokens } from '@/hooks/use-birdeye-tokens';
import { useActivityRankings, ActivityRankedToken } from '@/hooks/use-activity-rankings';
import { ChainSelector } from './chain-selector';
import { ActivityScoreBadge } from './activity-score-badge';
import { OpportunityScoreBadge } from './opportunity-score-badge';
import { BirdeyeTokenResponse } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpIcon, ArrowDownIcon, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhaleIndicator } from './whale-indicator';

type SortKey = 'symbol' | 'chain' | 'price' | 'priceChange24h' | 'volume24h' | 'whaleScore' | 'marketCap';
type SortDirection = 'asc' | 'desc';

type SortBy = 'activityScore' | 'opportunityScore' | 'marketCap' | 'volume24h';

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

// Unified token type for both data sources
interface DisplayToken {
  address: string;
  chain: string;
  symbol: string;
  name: string;
  logoUri: string | null;
  price: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  marketCap: number | null;
  whaleScore?: number | null;
  netFlow24h?: number | null;
  buyVolume24h?: number | null;
  sellVolume24h?: number | null;
  activityScore?: number | null;
  opportunityScore?: number | null;
  trade24h?: number | null;
  uniqueWallet24h?: number | null;
  liquidity?: number | null;
}

interface TokenRowProps {
  token: DisplayToken;
  showActivityScores: boolean;
}

function TokenRow({ token, showActivityScores }: TokenRowProps) {
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
      {showActivityScores && (
        <>
          <TableCell className="text-center">
            <ActivityScoreBadge
              score={token.activityScore ?? null}
              trade24h={token.trade24h ?? null}
              uniqueWallet24h={token.uniqueWallet24h ?? null}
            />
          </TableCell>
          <TableCell className="text-center">
            <OpportunityScoreBadge
              score={token.opportunityScore ?? null}
              activityScore={token.activityScore ?? null}
              liquidity={token.liquidity ?? null}
            />
          </TableCell>
        </>
      )}
    </TableRow>
  );
}

interface LoadingSkeletonProps {
  showActivityScores: boolean;
}

function LoadingSkeleton({ showActivityScores }: LoadingSkeletonProps) {
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
          {showActivityScores && (
            <>
              <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
              <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
            </>
          )}
        </TableRow>
      ))}
    </>
  );
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'activityScore', label: 'Activity Score' },
  { value: 'opportunityScore', label: 'Opportunity Score' },
  { value: 'marketCap', label: 'Market Cap' },
  { value: 'volume24h', label: 'Volume (24h)' },
];

export function BirdeyeTokenTable({ initialChain, limit = 100 }: BirdeyeTokenTableProps) {
  const [chain, setChain] = useState<string | undefined>(initialChain);
  // Default to activity score sorting (RANK-01 requirement)
  const [sortBy, setSortBy] = useState<SortBy>('activityScore');
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Use activity rankings for activity/opportunity sorts
  const useActivityData = sortBy === 'activityScore' || sortBy === 'opportunityScore';

  // Fetch activity-ranked data
  const activityQuery = useActivityRankings({
    chain,
    limit,
  });

  // Fetch standard birdeye data for market cap / volume sorts
  const birdeyeQuery = useBirdeyeTokens({
    chain,
    limit,
    sortBy: sortBy === 'volume24h' ? 'volume24h' : 'marketCap',
  });

  // Select active query based on sort mode
  const activeQuery = useActivityData ? activityQuery : birdeyeQuery;
  const { data, isLoading, error, isFetching } = activeQuery;

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

  // Convert data to unified display format
  const displayTokens: DisplayToken[] = (data?.data || []).map((token) => ({
    address: token.address,
    chain: token.chain,
    symbol: token.symbol,
    name: token.name,
    logoUri: token.logoUri,
    price: token.price,
    priceChange24h: token.priceChange24h,
    volume24h: token.volume24h,
    marketCap: token.marketCap,
    whaleScore: (token as { whaleScore?: number | null }).whaleScore ?? null,
    netFlow24h: (token as { netFlow24h?: number | null }).netFlow24h ?? null,
    buyVolume24h: (token as { buyVolume24h?: number | null }).buyVolume24h ?? null,
    sellVolume24h: (token as { sellVolume24h?: number | null }).sellVolume24h ?? null,
    activityScore: useActivityData ? (token as ActivityRankedToken).activityScore : undefined,
    opportunityScore: useActivityData ? (token as ActivityRankedToken).opportunityScore : undefined,
    trade24h: useActivityData ? (token as ActivityRankedToken).trade24h : undefined,
    uniqueWallet24h: useActivityData ? (token as ActivityRankedToken).uniqueWallet24h : undefined,
    liquidity: useActivityData ? (token as ActivityRankedToken).liquidity : undefined,
  }));

  // Sort by opportunity score if selected (API returns by activity score by default)
  const sortedTokens = sortBy === 'opportunityScore'
    ? [...displayTokens].sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0))
    : displayTokens;

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Token Rankings</h2>
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.count} tokens {chain ? `on ${chain}` : 'across all chains'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Sort selector */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      <div className="rounded-lg border overflow-x-auto">
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
              {useActivityData && (
                <>
                  <TableHead className="text-center">Activity</TableHead>
                  <TableHead className="text-center">Opportunity</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingSkeleton showActivityScores={useActivityData} />
            ) : sortedTokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={useActivityData ? 9 : 7} className="text-center py-8 text-muted-foreground">
                  No tokens found. Try a different chain or check back later.
                </TableCell>
              </TableRow>
            ) : (
              sortedTokens.map((token) => (
                <TokenRow
                  key={`${token.chain}-${token.address}`}
                  token={token}
                  showActivityScores={useActivityData}
                />
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
