// DexPaprika API Client
// Free API for DEX token data across 29+ chains
// Docs: https://api.dexpaprika.com/docs

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { DexPaprikaToken } from '../types';

const BASE_URL = 'https://api.dexpaprika.com';

// Create axios instance with retry logic
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds (DEX APIs can be slow)
  headers: {
    'Accept': 'application/json',
  },
});

// Add retry logic with exponential backoff
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429 ||
           error.response?.status === 503 ||
           error.response?.status === 502;
  },
  onRetry: (retryCount, error) => {
    console.log(`[DexPaprika] Retry attempt ${retryCount} after error: ${error.message}`);
  },
});

// Supported chains
export const SUPPORTED_CHAINS = [
  'ethereum',
  'solana',
  'base',
  'arbitrum',
  'polygon',
  'bsc',
  'avalanche',
  'optimism',
  'fantom',
  'cronos',
] as const;

export type SupportedChain = typeof SUPPORTED_CHAINS[number];

/**
 * Get top tokens by volume across all chains
 */
export async function getTopTokens(limit: number = 500): Promise<DexPaprikaToken[]> {
  try {
    console.log(`[DexPaprika] Fetching top ${limit} tokens...`);

    const response = await api.get('/tokens', {
      params: {
        limit,
        sort: 'volume_24h_usd',
        order: 'desc',
      },
    });

    const tokens = response.data?.tokens || response.data || [];
    console.log(`[DexPaprika] Fetched ${tokens.length} tokens`);

    return tokens.map(normalizeToken);
  } catch (error) {
    console.error('[DexPaprika] Error fetching top tokens:', error);
    return [];
  }
}

/**
 * Get tokens by specific chain
 */
export async function getTokensByChain(
  chain: SupportedChain,
  limit: number = 100
): Promise<DexPaprikaToken[]> {
  try {
    console.log(`[DexPaprika] Fetching tokens for chain: ${chain}...`);

    const response = await api.get(`/networks/${chain}/tokens`, {
      params: {
        limit,
        sort: 'volume_24h_usd',
        order: 'desc',
      },
    });

    const tokens = response.data?.tokens || response.data || [];
    console.log(`[DexPaprika] Fetched ${tokens.length} tokens from ${chain}`);

    return tokens.map((t: RawDexPaprikaToken) => normalizeToken({ ...t, chain }));
  } catch (error) {
    console.error(`[DexPaprika] Error fetching tokens for ${chain}:`, error);
    return [];
  }
}

/**
 * Search for tokens by query
 */
export async function searchTokens(query: string): Promise<DexPaprikaToken[]> {
  try {
    console.log(`[DexPaprika] Searching for: ${query}...`);

    const response = await api.get('/search', {
      params: {
        q: query,
        limit: 50,
      },
    });

    const tokens = response.data?.tokens || response.data?.results?.tokens || [];
    console.log(`[DexPaprika] Found ${tokens.length} tokens for query: ${query}`);

    return tokens.map(normalizeToken);
  } catch (error) {
    console.error(`[DexPaprika] Error searching for ${query}:`, error);
    return [];
  }
}

/**
 * Get token details by address
 */
export async function getTokenByAddress(
  chain: SupportedChain,
  address: string
): Promise<DexPaprikaToken | null> {
  try {
    const response = await api.get(`/networks/${chain}/tokens/${address}`);
    return normalizeToken(response.data);
  } catch (error) {
    console.error(`[DexPaprika] Error fetching token ${address} on ${chain}:`, error);
    return null;
  }
}

/**
 * Get trending/hot tokens (high recent volume increase)
 */
export async function getTrendingTokens(limit: number = 100): Promise<DexPaprikaToken[]> {
  try {
    console.log(`[DexPaprika] Fetching trending tokens...`);

    // Try to get tokens sorted by volume change
    const response = await api.get('/tokens', {
      params: {
        limit,
        sort: 'price_change_24h',
        order: 'desc',
      },
    });

    const tokens = response.data?.tokens || response.data || [];

    // Filter for tokens with positive volume and reasonable price change
    const trending = tokens.filter((t: RawDexPaprikaToken) =>
      (t.volume_24h_usd ?? t.volume_24h ?? 0) > 10000 &&
      Math.abs(t.price_change_24h ?? t.price_change_percentage_24h ?? 0) > 5
    );

    console.log(`[DexPaprika] Found ${trending.length} trending tokens`);
    return trending.map(normalizeToken);
  } catch (error) {
    console.error('[DexPaprika] Error fetching trending tokens:', error);
    return [];
  }
}

/**
 * Get meme tokens (search-based approach)
 */
export async function getMemeTokens(): Promise<DexPaprikaToken[]> {
  const memeQueries = ['pepe', 'doge', 'shib', 'bonk', 'meme', 'inu', 'cat', 'frog'];
  const allTokens: DexPaprikaToken[] = [];

  for (const query of memeQueries) {
    try {
      const tokens = await searchTokens(query);
      allTokens.push(...tokens);
    } catch {
      // Continue with other queries
    }
  }

  // Dedupe by address
  const seen = new Set<string>();
  return allTokens.filter(t => {
    const key = `${t.chain}-${t.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================
// Internal helpers
// ============================================

interface RawDexPaprikaToken {
  id?: string;
  token_id?: string;
  name?: string;
  symbol?: string;
  chain?: string;
  network?: string;
  address?: string;
  contract_address?: string;
  price_usd?: number;
  price?: number;
  volume_24h_usd?: number;
  volume_24h?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  market_cap_usd?: number;
  market_cap?: number;
  liquidity_usd?: number;
  liquidity?: number;
  logo_url?: string;
  logo?: string;
  image?: string;
}

/**
 * Normalize various API response formats to our standard format
 */
function normalizeToken(raw: RawDexPaprikaToken): DexPaprikaToken {
  return {
    id: raw.id || raw.token_id || `${raw.chain || raw.network || 'unknown'}-${raw.address || raw.contract_address || 'unknown'}`,
    name: raw.name || 'Unknown',
    symbol: (raw.symbol || '???').toUpperCase(),
    chain: raw.chain || raw.network || 'ethereum',
    address: raw.address || raw.contract_address || '',
    price_usd: raw.price_usd ?? raw.price ?? 0,
    volume_24h_usd: raw.volume_24h_usd ?? raw.volume_24h ?? 0,
    price_change_24h: raw.price_change_24h ?? raw.price_change_percentage_24h ?? 0,
    market_cap_usd: raw.market_cap_usd ?? raw.market_cap,
    liquidity_usd: raw.liquidity_usd ?? raw.liquidity,
    logo_url: raw.logo_url || raw.logo || raw.image,
  };
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await api.get('/');
    return response.status === 200;
  } catch {
    return false;
  }
}
