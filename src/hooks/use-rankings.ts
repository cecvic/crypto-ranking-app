'use client';

import { useQuery } from '@tanstack/react-query';
import { CoinRanking, FearGreedIndex } from '@/lib/types';

// Fetch rankings from our API
async function fetchRankings(): Promise<CoinRanking[]> {
  const response = await fetch('/api/rankings');
  if (!response.ok) {
    throw new Error('Failed to fetch rankings');
  }
  const data = await response.json();
  return data.data;
}

// Fetch Fear & Greed Index
async function fetchFearGreed(): Promise<FearGreedIndex> {
  const response = await fetch('/api/fear-greed');
  if (!response.ok) {
    throw new Error('Failed to fetch fear & greed index');
  }
  const data = await response.json();
  return data.data;
}

// Fetch single coin data
async function fetchCoin(coinId: string): Promise<CoinRanking> {
  const response = await fetch(`/api/coins/${coinId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch coin ${coinId}`);
  }
  const data = await response.json();
  return data.data;
}

// Fetch chart data
async function fetchChart(coinId: string, days: number = 7): Promise<any[]> {
  const response = await fetch(`/api/coins/${coinId}/chart?days=${days}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chart for ${coinId}`);
  }
  const data = await response.json();
  return data.data;
}

// Hook for rankings list
export function useRankings(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['rankings'],
    queryFn: fetchRankings,
    refetchInterval: options?.refetchInterval ?? 60000, // Refetch every minute
    staleTime: 30000, // Data fresh for 30 seconds
  });
}

// Hook for Fear & Greed Index
export function useFearGreed() {
  return useQuery({
    queryKey: ['fear-greed'],
    queryFn: fetchFearGreed,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 60000, // Data fresh for 1 minute
  });
}

// Hook for single coin
export function useCoin(coinId: string) {
  return useQuery({
    queryKey: ['coin', coinId],
    queryFn: () => fetchCoin(coinId),
    enabled: !!coinId,
    staleTime: 30000,
  });
}

// Hook for coin chart
export function useCoinChart(coinId: string, days: number = 7) {
  return useQuery({
    queryKey: ['chart', coinId, days],
    queryFn: () => fetchChart(coinId, days),
    enabled: !!coinId,
    staleTime: 60000,
  });
}

// Hook for global market data
export function useGlobalData() {
  return useQuery({
    queryKey: ['global'],
    queryFn: async () => {
      const response = await fetch('/api/global');
      if (!response.ok) throw new Error('Failed to fetch global data');
      return response.json();
    },
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}
