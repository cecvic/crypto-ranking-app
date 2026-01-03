'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/charts/sparkline';
import { CoinRanking } from '@/lib/types';
import { getSignalLabel } from '@/lib/ranking/calculator';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  SearchIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from 'lucide-react';

interface RankingsTableProps {
  rankings: CoinRanking[];
  isLoading?: boolean;
}

type SortField = 'rank' | 'price' | 'change24h' | 'score' | 'sentiment' | 'technical' | 'whale' | 'ai';
type SortDirection = 'asc' | 'desc';

export function RankingsTable({ rankings, isLoading }: RankingsTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter and sort rankings
  const filteredRankings = useMemo(() => {
    let filtered = [...rankings];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.coin.name.toLowerCase().includes(searchLower) ||
          r.coin.symbol.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortField) {
        case 'rank':
          aVal = a.rank;
          bVal = b.rank;
          break;
        case 'price':
          aVal = a.coin.current_price;
          bVal = b.coin.current_price;
          break;
        case 'change24h':
          aVal = a.coin.price_change_percentage_24h;
          bVal = b.coin.price_change_percentage_24h;
          break;
        case 'score':
          aVal = a.scores.overall;
          bVal = b.scores.overall;
          break;
        case 'sentiment':
          aVal = a.scores.sentiment;
          bVal = b.scores.sentiment;
          break;
        case 'technical':
          aVal = a.scores.technical;
          bVal = b.scores.technical;
          break;
        case 'whale':
          aVal = a.scores.whale;
          bVal = b.scores.whale;
          break;
        case 'ai':
          aVal = a.scores.ai;
          bVal = b.scores.ai;
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [rankings, search, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'rank' ? 'asc' : 'desc');
    }
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? (
            <ArrowUpIcon className="w-3 h-3" />
          ) : (
            <ArrowDownIcon className="w-3 h-3" />
          )
        )}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return <RankingsTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search coins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredRankings.length} of {rankings.length} coins
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <SortableHeader field="rank">#</SortableHeader>
              <TableHead>Coin</TableHead>
              <SortableHeader field="price">Price</SortableHeader>
              <SortableHeader field="change24h">24h %</SortableHeader>
              <TableHead>7d Chart</TableHead>
              <SortableHeader field="score">Score</SortableHeader>
              <SortableHeader field="sentiment">Sentiment</SortableHeader>
              <SortableHeader field="technical">Technical</SortableHeader>
              <SortableHeader field="whale">Whale</SortableHeader>
              <SortableHeader field="ai">AI</SortableHeader>
              <TableHead>Signal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRankings.map((ranking) => (
              <RankingRow key={ranking.coin.id} ranking={ranking} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RankingRow({ ranking }: { ranking: CoinRanking }) {
  const { coin, scores, rank, rankChange } = ranking;
  const signal = getSignalLabel(scores.overall);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatChange = (change: number) => {
    const formatted = Math.abs(change).toFixed(2);
    if (change >= 0) {
      return (
        <span className="text-green-500 flex items-center gap-1">
          <TrendingUpIcon className="w-3 h-3" />
          {formatted}%
        </span>
      );
    }
    return (
      <span className="text-red-500 flex items-center gap-1">
        <TrendingDownIcon className="w-3 h-3" />
        {formatted}%
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSignalBadgeVariant = (
    color: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (color) {
      case 'green':
      case 'lime':
        return 'default';
      case 'yellow':
        return 'secondary';
      case 'orange':
      case 'red':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <TableRow className="hover:bg-muted/30">
      {/* Rank */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-1">
          {rank}
          {rankChange !== undefined && rankChange !== 0 && (
            <span
              className={`text-xs ${rankChange > 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {rankChange > 0 ? (
                <ArrowUpIcon className="w-3 h-3 inline" />
              ) : (
                <ArrowDownIcon className="w-3 h-3 inline" />
              )}
              {Math.abs(rankChange)}
            </span>
          )}
        </div>
      </TableCell>

      {/* Coin */}
      <TableCell>
        <Link href={`/coin/${coin.id}`} className="flex items-center gap-3 hover:opacity-80">
          <Image
            src={coin.image}
            alt={coin.name}
            width={32}
            height={32}
            className="rounded-full"
          />
          <div>
            <div className="font-medium">{coin.name}</div>
            <div className="text-xs text-muted-foreground">{coin.symbol}</div>
          </div>
        </Link>
      </TableCell>

      {/* Price */}
      <TableCell className="font-mono">{formatPrice(coin.current_price)}</TableCell>

      {/* 24h Change */}
      <TableCell>{formatChange(coin.price_change_percentage_24h)}</TableCell>

      {/* 7d Sparkline */}
      <TableCell>
        {coin.sparkline_in_7d?.price && (
          <Sparkline data={coin.sparkline_in_7d.price} width={100} height={28} />
        )}
      </TableCell>

      {/* Overall Score */}
      <TableCell>
        <span className={`font-bold text-lg ${getScoreColor(scores.overall)}`}>
          {scores.overall.toFixed(0)}
        </span>
      </TableCell>

      {/* Individual Scores */}
      <TableCell className={getScoreColor(scores.sentiment)}>
        {scores.sentiment.toFixed(0)}
      </TableCell>
      <TableCell className={getScoreColor(scores.technical)}>
        {scores.technical.toFixed(0)}
      </TableCell>
      <TableCell className={getScoreColor(scores.whale)}>
        {scores.whale.toFixed(0)}
      </TableCell>
      <TableCell className={getScoreColor(scores.ai)}>
        {scores.ai.toFixed(0)}
      </TableCell>

      {/* Signal */}
      <TableCell>
        <Badge variant={getSignalBadgeVariant(signal.color)}>{signal.label}</Badge>
      </TableCell>
    </TableRow>
  );
}

function RankingsTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 11 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 11 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
