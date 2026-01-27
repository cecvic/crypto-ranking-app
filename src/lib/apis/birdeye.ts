import axios from 'axios';
import axiosRetry from 'axios-retry';
import { BirdeyeToken, BirdeyeTrade, BirdeyeSecurityInfo } from '../types';

const BASE_URL = 'https://public-api.birdeye.so';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

// Add API key dynamically per-request (env vars may not be available at module load time)
api.interceptors.request.use((config) => {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (apiKey) {
    config.headers['X-API-KEY'] = apiKey;
    console.log(`[Birdeye] API key set (length: ${apiKey.length})`);
  } else {
    console.warn('[Birdeye] WARNING: No API key found in BIRDEYE_API_KEY env var');
  }
  return config;
});

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429 ||
           error.response?.status === 503;
  },
  onRetry: (retryCount, error) => {
    console.log(`[Birdeye] Retry attempt ${retryCount} after error: ${error.message}`);
  },
});

// All 11 Birdeye-supported chains
export const BIRDEYE_CHAINS = {
  solana: 'solana',
  ethereum: 'ethereum',
  arbitrum: 'arbitrum',
  avalanche: 'avalanche',
  bsc: 'bsc',
  optimism: 'optimism',
  polygon: 'polygon',
  base: 'base',
  zksync: 'zksync',
  sui: 'sui',
  aptos: 'aptos',
} as const;

export type BirdeyeChain = keyof typeof BIRDEYE_CHAINS;

interface BirdeyeTokenListResponse {
  success: boolean;
  data: {
    tokens: Array<{
      address: string;
      symbol: string;
      name: string;
      decimals: number;
      logoURI?: string;
      liquidity: number;
      v24hUSD: number;
      v24hChangePercent: number;
      price: number;
      mc?: number;
    }>;
  };
}

// Multi-price endpoint response shape
interface BirdeyeMultiPriceAPIResponse {
  success: boolean;
  data: Record<string, {
    value: number;
    updateUnixTime: number;
    updateHumanTime: string;
    priceChange24h?: number;
    liquidity?: number;
    volume24hUSD?: number;
  } | null>;
}

interface BirdeyeSecurityResponse {
  success: boolean;
  data: {
    isToken2022?: boolean;
    freezeAuthority?: string | null;
    mintAuthority?: string | null;
    isProxy?: boolean;
    creatorAddress?: string;
    creationTime?: number;
  };
}

// Token Overview response (activity metrics)
export interface BirdeyeTokenOverviewResponse {
  success: boolean;
  data: {
    address: string;
    symbol: string;
    name: string;
    price: number;
    priceChange24h: number;
    volume24h: number;
    liquidity: number;
    mc: number;
    trade24h?: number;
    trade24hChangePercent?: number;
    buy24h?: number;
    sell24h?: number;
    uniqueWallet24h?: number;
    uniqueWallet24hChangePercent?: number;
  };
}

// Search response structure
export interface BirdeyeSearchResponse {
  success: boolean;
  data: {
    items: Array<{
      type: 'token' | 'pair';
      result: {
        address: string;
        symbol: string;
        name: string;
        logoURI?: string;
        decimals?: number;
        liquidity?: number;
        volume24h?: number;
        price?: number;
      };
    }>;
  };
}

// Simplified search result for external use
export interface BirdeyeSearchResult {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  decimals?: number;
  liquidity?: number;
  volume24h?: number;
  price?: number;
  chain: BirdeyeChain;
}

interface BirdeyeTradesResponse {
  success: boolean;
  data: {
    items: Array<{
      txHash: string;
      blockUnixTime: number;
      source: string;
      side: 'buy' | 'sell';
      address: string;
      amount: number;
      priceUsd: number;
      volumeUsd: number;
    }>;
  };
}

export async function getTrendingTokens(
  chain: BirdeyeChain,
  limit: number = 50
): Promise<BirdeyeToken[]> {
  try {
    console.log(`[Birdeye] Fetching trending tokens on ${chain}...`);

    const response = await api.get<BirdeyeTokenListResponse>('/defi/tokenlist', {
      params: {
        chain,
        sort_by: 'v24hUSD',
        sort_type: 'desc',
        offset: 0,
        limit,
      },
      headers: {
        'x-chain': chain,
      },
    });

    if (!response.data?.success || !response.data?.data?.tokens) {
      console.error('[Birdeye] Invalid response structure');
      return [];
    }

    const tokens = response.data.data.tokens.map((t) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logoURI: t.logoURI,
      liquidity: t.liquidity || 0,
      volume24hUSD: t.v24hUSD || 0,
      priceChange24h: t.v24hChangePercent || 0,
      price: t.price || 0,
      mc: t.mc,
    }));

    console.log(`[Birdeye] Found ${tokens.length} tokens on ${chain}`);
    return tokens;
  } catch (error) {
    console.error(`[Birdeye] Error fetching trending tokens on ${chain}:`, error);
    return [];
  }
}

export async function getTokenSecurity(
  address: string,
  chain: BirdeyeChain
): Promise<BirdeyeSecurityInfo | null> {
  try {
    const response = await api.get<BirdeyeSecurityResponse>('/defi/token_security', {
      params: { address },
      headers: {
        'x-chain': chain,
      },
    });

    if (!response.data?.success || !response.data?.data) {
      return null;
    }

    const d = response.data.data;
    return {
      isToken2022: d.isToken2022 ?? false,
      freezeAuthority: d.freezeAuthority ?? null,
      mintAuthority: d.mintAuthority ?? null,
      isProxy: d.isProxy ?? false,
      creatorAddress: d.creatorAddress ?? '',
      creationTime: d.creationTime ?? 0,
    };
  } catch (error) {
    console.error(`[Birdeye] Error fetching security for ${address}:`, error);
    return null;
  }
}

export async function getRecentTrades(
  address: string,
  chain: BirdeyeChain,
  limit: number = 20
): Promise<BirdeyeTrade[]> {
  try {
    const response = await api.get<BirdeyeTradesResponse>('/defi/txs/token', {
      params: {
        address,
        tx_type: 'swap',
        limit,
      },
      headers: {
        'x-chain': chain,
      },
    });

    if (!response.data?.success || !response.data?.data?.items) {
      return [];
    }

    return response.data.data.items.map((t) => ({
      txHash: t.txHash,
      blockTime: t.blockUnixTime,
      source: t.source,
      side: t.side,
      tokenAddress: t.address,
      amount: t.amount,
      priceUsd: t.priceUsd,
      volumeUsd: t.volumeUsd,
    }));
  } catch (error) {
    console.error(`[Birdeye] Error fetching trades for ${address}:`, error);
    return [];
  }
}

/**
 * Batch fetch prices for multiple tokens (up to 100 per call)
 * Uses the /defi/multi_price endpoint for efficient batching
 */
export async function getMultiPrice(
  addresses: string[],
  chain: BirdeyeChain
): Promise<Map<string, { price: number; priceChange24h: number; liquidity: number; volume24hUSD: number }>> {
  const result = new Map<string, { price: number; priceChange24h: number; liquidity: number; volume24hUSD: number }>();

  if (addresses.length === 0) {
    return result;
  }

  // API supports max 100 addresses per call
  if (addresses.length > 100) {
    console.warn(`[Birdeye] getMultiPrice received ${addresses.length} addresses, max is 100. Truncating.`);
    addresses = addresses.slice(0, 100);
  }

  try {
    console.log(`[Birdeye] Fetching multi_price for ${addresses.length} tokens on ${chain}...`);

    const response = await api.get<BirdeyeMultiPriceAPIResponse>('/defi/multi_price', {
      params: {
        list_address: addresses.join(','),
      },
      headers: {
        'x-chain': chain,
      },
    });

    if (!response.data?.success || !response.data?.data) {
      console.error('[Birdeye] Invalid multi_price response structure');
      return result;
    }

    for (const [address, priceData] of Object.entries(response.data.data)) {
      if (priceData) {
        result.set(address, {
          price: priceData.value ?? 0,
          priceChange24h: priceData.priceChange24h ?? 0,
          liquidity: priceData.liquidity ?? 0,
          volume24hUSD: priceData.volume24hUSD ?? 0,
        });
      }
    }

    console.log(`[Birdeye] Received prices for ${result.size}/${addresses.length} tokens`);
    return result;
  } catch (error) {
    console.error(`[Birdeye] Error fetching multi_price on ${chain}:`, error);
    return result;
  }
}

/**
 * Fetch token list sorted by market cap (for seeding registry)
 * @param chain - Target chain
 * @param limit - Number of tokens to fetch (default 50)
 * @param sortBy - Sort criteria: 'mc' (market cap) or 'v24hUSD' (volume)
 */
export async function getTokenList(
  chain: BirdeyeChain,
  limit: number = 50,
  sortBy: 'mc' | 'v24hUSD' = 'v24hUSD' // Default to volume - mc returns spam tokens with fake values
): Promise<BirdeyeToken[]> {
  // Birdeye API max limit is 50
  const cappedLimit = Math.min(limit, 50);
  try {
    console.log(`[Birdeye] Fetching token list on ${chain} sorted by ${sortBy} (limit: ${cappedLimit})...`);

    const response = await api.get<BirdeyeTokenListResponse>('/defi/tokenlist', {
      params: {
        chain,
        sort_by: sortBy,
        sort_type: 'desc',
        offset: 0,
        limit: cappedLimit,
      },
      headers: {
        'x-chain': chain,
      },
    });

    if (!response.data?.success || !response.data?.data?.tokens) {
      console.error('[Birdeye] Invalid token list response structure');
      return [];
    }

    const tokens = response.data.data.tokens.map((t) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logoURI: t.logoURI,
      liquidity: t.liquidity || 0,
      volume24hUSD: t.v24hUSD || 0,
      priceChange24h: t.v24hChangePercent || 0,
      price: t.price || 0,
      mc: t.mc,
    }));

    console.log(`[Birdeye] Found ${tokens.length} tokens on ${chain} (sorted by ${sortBy})`);
    return tokens;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(`[Birdeye] Error fetching token list on ${chain}:`, {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else {
      console.error(`[Birdeye] Error fetching token list on ${chain}:`, error);
    }
    return [];
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await api.get('/defi/tokenlist', {
      params: { chain: 'solana', limit: 1 },
      headers: { 'x-chain': 'solana' },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Get detailed token overview with activity metrics
 * @param address - Token address
 * @param chain - Target chain
 * @returns Token overview data with activity metrics or null on error
 */
export async function getTokenOverview(
  address: string,
  chain: BirdeyeChain
): Promise<BirdeyeTokenOverviewResponse['data'] | null> {
  try {
    console.log(`[Birdeye] Fetching token overview for ${address} on ${chain}...`);

    const response = await api.get<BirdeyeTokenOverviewResponse>('/defi/token_overview', {
      params: { address },
      headers: {
        'x-chain': chain,
      },
    });

    if (!response.data?.success || !response.data?.data) {
      console.error('[Birdeye] Invalid token overview response structure');
      return null;
    }

    console.log(`[Birdeye] Token overview for ${address}: trade24h=${response.data.data.trade24h}, uniqueWallet24h=${response.data.data.uniqueWallet24h}`);
    return response.data.data;
  } catch (error) {
    console.error(`[Birdeye] Error fetching token overview for ${address} on ${chain}:`, error);
    return null;
  }
}

/**
 * Search tokens by keyword on a specific chain
 * @param keyword - Search keyword (symbol, name, or address)
 * @param chain - Target chain
 * @returns Array of token search results
 */
export async function searchTokens(
  keyword: string,
  chain: BirdeyeChain
): Promise<BirdeyeSearchResult[]> {
  try {
    console.log(`[Birdeye] Searching tokens for "${keyword}" on ${chain}...`);

    const response = await api.get<BirdeyeSearchResponse>('/defi/v3/search', {
      params: { keyword },
      headers: {
        'x-chain': chain,
      },
    });

    if (!response.data?.success || !response.data?.data?.items) {
      console.error('[Birdeye] Invalid search response structure');
      return [];
    }

    // Filter to only token results (not pairs)
    const tokenResults = response.data.data.items
      .filter((item) => item.type === 'token')
      .map((item) => ({
        address: item.result.address,
        symbol: item.result.symbol,
        name: item.result.name,
        logoURI: item.result.logoURI,
        decimals: item.result.decimals,
        liquidity: item.result.liquidity,
        volume24h: item.result.volume24h,
        price: item.result.price,
        chain,
      }));

    console.log(`[Birdeye] Found ${tokenResults.length} tokens for "${keyword}" on ${chain}`);
    return tokenResults;
  } catch (error) {
    console.error(`[Birdeye] Error searching tokens for "${keyword}" on ${chain}:`, error);
    return [];
  }
}

// Helper to delay between API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Search tokens across all supported chains
 * @param keyword - Search keyword (symbol, name, or address)
 * @returns Record of chain -> search results (top 5 per chain)
 */
export async function searchAllChains(
  keyword: string
): Promise<Record<BirdeyeChain, BirdeyeSearchResult[]>> {
  const result: Record<BirdeyeChain, BirdeyeSearchResult[]> = {
    solana: [],
    ethereum: [],
    base: [],
    arbitrum: [],
    bsc: [],
    polygon: [],
    optimism: [],
    avalanche: [],
    zksync: [],
    sui: [],
    aptos: [],
  };

  // Process chains in priority order (solana first)
  const chainOrder: BirdeyeChain[] = [
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
  ];

  console.log(`[Birdeye] Starting cross-chain search for "${keyword}"...`);

  for (let i = 0; i < chainOrder.length; i++) {
    const chain = chainOrder[i];

    try {
      const chainResults = await searchTokens(keyword, chain);
      // Limit to top 5 results per chain
      result[chain] = chainResults.slice(0, 5);
    } catch (error) {
      console.error(`[Birdeye] Error searching ${chain}, skipping:`, error);
      // Continue to next chain on error
    }

    // Add delay between chains (except after last chain)
    if (i < chainOrder.length - 1) {
      await delay(100);
    }
  }

  const totalResults = Object.values(result).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`[Birdeye] Cross-chain search complete: ${totalResults} results across all chains`);

  return result;
}
