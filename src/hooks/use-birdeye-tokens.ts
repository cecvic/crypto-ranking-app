'use client';

// React Query hook for Birdeye multi-chain token data

import { useQuery } from '@tanstack/react-query';
import { BirdeyeTokensAPIResponse } from '@/lib/types';

interface UseBirdeyeTokensOptions {
  chain?: string;
  limit?: number;
  sortBy?: 'marketCap' | 'volume24h';
  enabled?: boolean;
}

async function fetchBirdeyeTokens(options: UseBirdeyeTokensOptions): Promise<BirdeyeTokensAPIResponse> {
  const { chain, limit = 100, sortBy = 'marketCap' } = options;

  const params = new URLSearchParams({
    limit: limit.toString(),
    sortBy,
  });

  // Use chain-specific endpoint if chain provided
  const url = chain
    ? `/api/tokens/${chain}?${params}`
    : `/api/tokens?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch tokens: ${response.status}`);
  }

  return response.json();
}

export function useBirdeyeTokens(options: UseBirdeyeTokensOptions = {}) {
  const { chain, limit = 100, sortBy = 'marketCap', enabled = true } = options;

  return useQuery({
    queryKey: ['birdeye-tokens', { chain, limit, sortBy }],
    queryFn: () => fetchBirdeyeTokens({ chain, limit, sortBy }),
    enabled,
    staleTime: 60 * 1000,      // 1 minute stale time
    gcTime: 5 * 60 * 1000,     // 5 minute garbage collection (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Convenience hooks for specific chains
export function useSolanaTokens(options: Omit<UseBirdeyeTokensOptions, 'chain'> = {}) {
  return useBirdeyeTokens({ ...options, chain: 'solana' });
}

export function useEthereumTokens(options: Omit<UseBirdeyeTokensOptions, 'chain'> = {}) {
  return useBirdeyeTokens({ ...options, chain: 'ethereum' });
}

export function useBaseTokens(options: Omit<UseBirdeyeTokensOptions, 'chain'> = {}) {
  return useBirdeyeTokens({ ...options, chain: 'base' });
}

// Hook to get available chains
export function useBirdeyeChains() {
  return [
    'solana',
    'ethereum',
    'base',
    'arbitrum',
    'bsc',
    'polygon',
    'optimism',
    'avalanche',
    'zksync',
    'sui',
    'aptos',
  ] as const;
}

// Hook to get token by address (useful for detail views)
export function useBirdeyeToken(chain: string, address: string, enabled = true) {
  const { data, ...rest } = useBirdeyeTokens({
    chain,
    limit: 500, // Larger limit to find the token
    enabled,
  });

  const token = data?.data.find(t => t.address.toLowerCase() === address.toLowerCase()) ?? null;

  return {
    ...rest,
    data: token,
  };
}
