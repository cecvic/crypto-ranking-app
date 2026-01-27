import axios from 'axios';
import axiosRetry from 'axios-retry';
import { BirdeyeToken, BirdeyeTrade, BirdeyeSecurityInfo, BirdeyeWhaleTrade } from '../types';

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

// Response type for /defi/v3/trades/token-by-volume endpoint
interface BirdeyeWhaleTradesResponse {
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

/**
 * Fetch large trades (whale activity) for a token from Birdeye
 * Uses /defi/v3/trades/token-by-volume endpoint with volume filtering
 *
 * @param chain - Target chain (solana, ethereum, etc.)
 * @param tokenAddress - Token contract address
 * @param minVolumeUsd - Minimum trade volume in USD (default $100k)
 * @param timeFrom - Optional Unix timestamp for start of range
 * @param timeTo - Optional Unix timestamp for end of range
 * @returns Array of whale trades (BirdeyeWhaleTrade[]), empty array on error
 */
export async function getWhaleTrades(
  chain: BirdeyeChain,
  tokenAddress: string,
  minVolumeUsd: number = 100000,
  timeFrom?: number,
  timeTo?: number
): Promise<BirdeyeWhaleTrade[]> {
  try {
    console.log(`[Birdeye] Fetching whale trades for ${tokenAddress} on ${chain} (min $${minVolumeUsd})`);

    const params: Record<string, unknown> = {
      address: tokenAddress,
      min_volume: minVolumeUsd,
      volume_type: 'usd',
      limit: 500, // Max per API docs
    };

    if (timeFrom) params.time_from = timeFrom;
    if (timeTo) params.time_to = timeTo;

    const response = await api.get<BirdeyeWhaleTradesResponse>(
      '/defi/v3/trades/token-by-volume',
      {
        params,
        headers: {
          'x-chain': chain,
        },
      }
    );

    if (!response.data?.success || !response.data?.data?.items) {
      console.log(`[Birdeye] No whale trade data for ${tokenAddress}`);
      return [];
    }

    const trades: BirdeyeWhaleTrade[] = response.data.data.items.map((t) => ({
      txHash: t.txHash,
      blockTime: t.blockUnixTime,
      source: t.source,
      side: t.side,
      tokenAddress: t.address,
      amount: t.amount,
      priceUsd: t.priceUsd,
      volumeUsd: t.volumeUsd,
    }));

    console.log(`[Birdeye] Found ${trades.length} whale trades for ${tokenAddress}`);
    return trades;
  } catch (error) {
    console.error(`[Birdeye] Error fetching whale trades for ${tokenAddress}:`, error);
    return [];
  }
}

/**
 * Aggregate whale trades into metrics for scoring
 * @param trades - Array of BirdeyeWhaleTrade objects
 * @returns Aggregated metrics for 24h period
 */
export function aggregateWhaleTrades(trades: BirdeyeWhaleTrade[]): {
  buyVolume24h: number;
  sellVolume24h: number;
  buyCount24h: number;
  sellCount24h: number;
  netFlow24h: number;
  largestTrade24h: number;
} {
  const metrics = {
    buyVolume24h: 0,
    sellVolume24h: 0,
    buyCount24h: 0,
    sellCount24h: 0,
    netFlow24h: 0,
    largestTrade24h: 0,
  };

  for (const trade of trades) {
    if (trade.side === 'buy') {
      metrics.buyVolume24h += trade.volumeUsd;
      metrics.buyCount24h++;
    } else {
      metrics.sellVolume24h += trade.volumeUsd;
      metrics.sellCount24h++;
    }

    metrics.largestTrade24h = Math.max(metrics.largestTrade24h, trade.volumeUsd);
  }

  metrics.netFlow24h = metrics.buyVolume24h - metrics.sellVolume24h;

  return metrics;
}
