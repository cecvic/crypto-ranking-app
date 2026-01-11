'use client';

import { useQuery } from '@tanstack/react-query';

// ============================================
// TYPES
// ============================================

export interface WhaleEvent {
  id: number;
  transactionHash: string;
  blockTimestamp: string;
  tokenAddress: string;
  tokenSymbol: string | null;
  coinGeckoId: string | null;
  fromAddress: string;
  toAddress: string;
  valueRaw: string;
  valueToken: string | null;
  valueUsd: string | null;
  transferType: string;
  fromLabel: string | null;
  toLabel: string | null;
  chain: string;
}

export interface WhaleMetrics {
  totalTransactions: number;
  totalVolumeUsd: number;
  exchangeInflow: number;
  exchangeOutflow: number;
  netFlow: number;
  topTokensByVolume: Array<{
    coinGeckoId: string;
    symbol: string;
    volume: number;
    transactionCount: number;
  }>;
}

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchWhaleEvents(options?: {
  limit?: number;
  token?: string;
  type?: string;
  minValue?: number;
}): Promise<WhaleEvent[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.token) params.set('token', options.token);
  if (options?.type) params.set('type', options.type);
  if (options?.minValue) params.set('minValue', String(options.minValue));

  const response = await fetch(`/api/whale/events?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch whale events');
  }
  const data = await response.json();
  return data.data as WhaleEvent[];
}

async function fetchWhaleMetrics(period: string = '24h'): Promise<WhaleMetrics> {
  const response = await fetch(`/api/whale/metrics?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch whale metrics');
  }
  const data = await response.json();
  return data.data as WhaleMetrics;
}

async function fetchTopWhaleMovements(
  limit: number = 10,
  period: string = '24h'
): Promise<WhaleEvent[]> {
  const response = await fetch(`/api/whale/top-movements?limit=${limit}&period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch top whale movements');
  }
  const data = await response.json();
  return data.data as WhaleEvent[];
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook for fetching whale events with filtering
 */
export function useWhaleEvents(options?: {
  limit?: number;
  token?: string;
  type?: string;
  minValue?: number;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: ['whale-events', options?.limit, options?.token, options?.type, options?.minValue],
    queryFn: () => fetchWhaleEvents(options),
    refetchInterval: options?.refetchInterval ?? 30000, // 30 seconds default
    staleTime: 15000, // Data considered fresh for 15 seconds
  });
}

/**
 * Hook for fetching aggregate whale metrics
 */
export function useWhaleMetrics(period: string = '24h') {
  return useQuery({
    queryKey: ['whale-metrics', period],
    queryFn: () => fetchWhaleMetrics(period),
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // Data considered fresh for 30 seconds
  });
}

/**
 * Hook for fetching top whale movements by value
 */
export function useTopWhaleMovements(limit: number = 10, period: string = '24h') {
  return useQuery({
    queryKey: ['whale-top-movements', limit, period],
    queryFn: () => fetchTopWhaleMovements(limit, period),
    refetchInterval: 60000, // 1 minute
    staleTime: 30000,
  });
}
