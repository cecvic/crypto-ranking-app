// DexScreener API Client
// Free API for DEX pair and token data
// Docs: https://docs.dexscreener.com/api/reference
// Rate limit: 300 requests/minute

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { DexScreenerPair, DexScreenerBoostedToken, DexScreenerResponse } from '../types';

const BASE_URL = 'https://api.dexscreener.com';

// Create axios instance with retry logic
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

// Add retry logic
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429 ||
           error.response?.status === 503;
  },
  onRetry: (retryCount, error) => {
    console.log(`[DexScreener] Retry attempt ${retryCount} after error: ${error.message}`);
  },
});

// Supported chain IDs
export const CHAIN_IDS = {
  ethereum: 'ethereum',
  bsc: 'bsc',
  polygon: 'polygon',
  arbitrum: 'arbitrum',
  avalanche: 'avalanche',
  fantom: 'fantom',
  cronos: 'cronos',
  base: 'base',
  optimism: 'optimism',
  solana: 'solana',
} as const;

export type ChainId = keyof typeof CHAIN_IDS;

/**
 * Search for pairs by query (token name, symbol, or address)
 */
export async function searchPairs(query: string): Promise<DexScreenerPair[]> {
  try {
    console.log(`[DexScreener] Searching for: ${query}...`);

    const response = await api.get<DexScreenerResponse>('/latest/dex/search', {
      params: { q: query },
    });

    const pairs = response.data?.pairs || [];
    console.log(`[DexScreener] Found ${pairs.length} pairs for query: ${query}`);

    return pairs;
  } catch (error) {
    console.error(`[DexScreener] Error searching for ${query}:`, error);
    return [];
  }
}

/**
 * Get tokens by addresses (up to 30 at once)
 */
export async function getTokensByAddresses(
  chainId: ChainId,
  addresses: string[]
): Promise<DexScreenerPair[]> {
  if (addresses.length === 0) return [];
  if (addresses.length > 30) {
    console.warn('[DexScreener] Max 30 addresses per request, truncating...');
    addresses = addresses.slice(0, 30);
  }

  try {
    const addressList = addresses.join(',');
    const response = await api.get<DexScreenerPair[]>(
      `/tokens/v1/${chainId}/${addressList}`
    );

    return response.data || [];
  } catch (error) {
    console.error(`[DexScreener] Error fetching tokens on ${chainId}:`, error);
    return [];
  }
}

/**
 * Get pair by address
 */
export async function getPairByAddress(
  chainId: ChainId,
  pairAddress: string
): Promise<DexScreenerPair | null> {
  try {
    const response = await api.get<DexScreenerResponse>(
      `/latest/dex/pairs/${chainId}/${pairAddress}`
    );

    return response.data?.pairs?.[0] || null;
  } catch (error) {
    console.error(`[DexScreener] Error fetching pair ${pairAddress}:`, error);
    return null;
  }
}

/**
 * Get boosted (promoted) tokens - indicates attention/trending
 */
export async function getBoostedTokens(): Promise<DexScreenerBoostedToken[]> {
  try {
    console.log('[DexScreener] Fetching boosted tokens...');

    const response = await api.get<DexScreenerBoostedToken[]>('/token-boosts/latest/v1');

    const tokens = response.data || [];
    console.log(`[DexScreener] Found ${tokens.length} boosted tokens`);

    return tokens;
  } catch (error) {
    console.error('[DexScreener] Error fetching boosted tokens:', error);
    return [];
  }
}

/**
 * Get top boosted tokens (most active boosting)
 */
export async function getTopBoostedTokens(): Promise<DexScreenerBoostedToken[]> {
  try {
    const response = await api.get<DexScreenerBoostedToken[]>('/token-boosts/top/v1');
    return response.data || [];
  } catch (error) {
    console.error('[DexScreener] Error fetching top boosted tokens:', error);
    return [];
  }
}

/**
 * Get token profiles with social links
 */
export async function getTokenProfiles(): Promise<DexScreenerBoostedToken[]> {
  try {
    const response = await api.get<DexScreenerBoostedToken[]>('/token-profiles/latest/v1');
    return response.data || [];
  } catch (error) {
    console.error('[DexScreener] Error fetching token profiles:', error);
    return [];
  }
}

/**
 * Get trending meme coins by searching common patterns
 */
export async function getTrendingMemeCoins(): Promise<DexScreenerPair[]> {
  const memeQueries = ['pepe', 'doge', 'shib', 'bonk', 'wojak', 'cat', 'inu'];
  const allPairs: DexScreenerPair[] = [];
  const seen = new Set<string>();

  for (const query of memeQueries) {
    try {
      const pairs = await searchPairs(query);

      // Filter for pairs with decent liquidity and volume
      const validPairs = pairs.filter(p => {
        const key = `${p.chainId}-${p.baseToken.address}`;
        if (seen.has(key)) return false;
        seen.add(key);

        const hasLiquidity = (p.liquidity?.usd || 0) > 1000;
        const hasVolume = (p.volume?.h24 || 0) > 1000;
        return hasLiquidity || hasVolume;
      });

      allPairs.push(...validPairs);
    } catch {
      // Continue with other queries
    }
  }

  console.log(`[DexScreener] Found ${allPairs.length} meme coin pairs`);
  return allPairs;
}

/**
 * Get pairs with recent high activity
 */
export async function getHighActivityPairs(chainId?: ChainId): Promise<DexScreenerPair[]> {
  try {
    // Search for common high-activity tokens
    const queries = ['eth', 'usdc', 'sol'];
    const allPairs: DexScreenerPair[] = [];

    for (const query of queries) {
      const pairs = await searchPairs(query);

      // Filter by chain if specified
      const filtered = chainId
        ? pairs.filter(p => p.chainId === chainId)
        : pairs;

      // Sort by 24h volume and take top ones
      const sorted = filtered
        .filter(p => (p.volume?.h24 || 0) > 10000)
        .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
        .slice(0, 50);

      allPairs.push(...sorted);
    }

    return allPairs;
  } catch (error) {
    console.error('[DexScreener] Error fetching high activity pairs:', error);
    return [];
  }
}

/**
 * Convert boosted token to pair format for normalization
 */
export async function boostedToPairs(
  boosted: DexScreenerBoostedToken[]
): Promise<DexScreenerPair[]> {
  const pairs: DexScreenerPair[] = [];

  // Group by chain
  const byChain = new Map<string, string[]>();
  for (const token of boosted) {
    const chainTokens = byChain.get(token.chainId) || [];
    chainTokens.push(token.tokenAddress);
    byChain.set(token.chainId, chainTokens);
  }

  // Fetch details in batches
  for (const [chainId, addresses] of byChain) {
    try {
      const chainPairs = await getTokensByAddresses(
        chainId as ChainId,
        addresses.slice(0, 30)
      );
      pairs.push(...chainPairs);
    } catch {
      // Continue with other chains
    }
  }

  return pairs;
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    // Use a simple search as health check
    const response = await api.get('/latest/dex/search', {
      params: { q: 'eth' },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
