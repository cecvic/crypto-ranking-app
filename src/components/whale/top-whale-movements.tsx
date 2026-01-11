'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WhaleEvent } from '@/hooks/use-whale-data';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ExternalLinkIcon,
} from 'lucide-react';

interface TopWhaleMovementsProps {
  events?: WhaleEvent[];
  isLoading?: boolean;
}

type SortField = 'time' | 'value' | 'token';
type SortDirection = 'asc' | 'desc';

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const eventTime = new Date(timestamp).getTime();
  const diff = now - eventTime;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTokenAmount(value: string | null): string {
  if (!value) return '-';
  const num = parseFloat(value);
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

function formatUsd(value: string | null): string {
  if (!value) return '-';
  const num = parseFloat(value);
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
}

function getTransferTypeBadge(type: string): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  switch (type) {
    case 'exchange_inflow':
      return { label: 'Inflow', variant: 'destructive' };
    case 'exchange_outflow':
      return { label: 'Outflow', variant: 'default' };
    case 'wallet_to_wallet':
      return { label: 'Wallet', variant: 'secondary' };
    case 'exchange_to_exchange':
      return { label: 'Exchange', variant: 'outline' };
    default:
      return { label: type, variant: 'outline' };
  }
}

function getEtherscanLink(txHash: string): string {
  return `https://etherscan.io/tx/${txHash}`;
}

export function TopWhaleMovements({ events, isLoading }: TopWhaleMovementsProps) {
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedEvents = useMemo(() => {
    if (!events) return [];
    return [...events].sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortField) {
        case 'time':
          aVal = new Date(a.blockTimestamp).getTime();
          bVal = new Date(b.blockTimestamp).getTime();
          break;
        case 'value':
          aVal = parseFloat(a.valueUsd || '0');
          bVal = parseFloat(b.valueUsd || '0');
          break;
        case 'token':
          return sortDirection === 'asc'
            ? (a.tokenSymbol || '').localeCompare(b.tokenSymbol || '')
            : (b.tokenSymbol || '').localeCompare(a.tokenSymbol || '');
        default:
          return 0;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [events, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
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
        {sortField === field &&
          (sortDirection === 'asc' ? (
            <ArrowUpIcon className="w-3 h-3" />
          ) : (
            <ArrowDownIcon className="w-3 h-3" />
          ))}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return <TopWhaleMovementsSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Whale Movements (24h)</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No whale movements recorded</p>
            <p className="text-xs mt-1">Large transactions will appear here</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12">#</TableHead>
                  <SortableHeader field="time">Time</SortableHeader>
                  <SortableHeader field="token">Token</SortableHeader>
                  <TableHead>Amount</TableHead>
                  <SortableHeader field="value">USD Value</SortableHeader>
                  <TableHead>Type</TableHead>
                  <TableHead>From / To</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEvents.map((event, index) => {
                  const badge = getTransferTypeBadge(event.transferType);
                  return (
                    <TableRow key={event.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(event.blockTimestamp)}
                      </TableCell>
                      <TableCell className="font-medium uppercase">
                        {event.tokenSymbol || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatTokenAmount(event.valueToken)}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {formatUsd(event.valueUsd)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">
                            {event.fromLabel || formatAddress(event.fromAddress)}
                          </span>
                          <span>
                            {event.toLabel || formatAddress(event.toAddress)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={getEtherscanLink(event.transactionHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLinkIcon className="h-4 w-4" />
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopWhaleMovementsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-56" />
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
