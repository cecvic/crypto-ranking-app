'use client';

import { useQuery } from '@tanstack/react-query';

export interface ActivityRankedToken {
  address: string;
  chain: string;
  symbol: string;
  name: string;
  logoUri: string | null;
  price: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  marketCap: number | null;
  activityScore: number | null;
  opportunityScore: number | null;
  trade24h: number | null;
  uniqueWallet24h: number | null;
}

interface UseActivityRankingsOptions {
  chain?: string;
  limit?: number;
  offset?: number;
}

export function useActivityRankings(options: UseActivityRankingsOptions = {}) {
  const { chain, limit = 100, offset = 0 } = options;

  return useQuery({
    queryKey: ['activity-rankings', chain, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (chain) params.set('chain', chain);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const response = await fetch(`/api/tokens/activity?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activity rankings');

      return response.json() as Promise<{
        data: ActivityRankedToken[];
        count: number;
        timestamp: string;
        cached: boolean;
      }>;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (match API cache)
  });
}
