/**
 * AI tool definitions for the crypto trading assistant
 * Uses Vercel AI SDK tool() function with Zod schemas
 * Adapted to use crypto-ranking's existing data clients
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { getCoinById, getCoinChart, getTopCoins } from '@/lib/apis/coingecko';
import { fetchCoinGeckoTrending } from '@/lib/apis/free-data-sources';
import { generateAnnotations, calculateSwingAnalysis } from '@/lib/crypto/swing-analysis';
import { getCachedProtocols, getCachedProtocol } from '@/lib/defi/cache';
import type { OHLCCandle, CachedOHLC } from '@/lib/types/ai';

/**
 * Determine OHLC granularity based on days (CoinGecko auto-selects)
 */
function getGranularity(days: number): '30m' | '4h' | '4d' {
  if (days === 1) return '30m';
  if (days <= 30) return '4h';
  return '4d';
}

/**
 * Get cached OHLC data with cache-aside pattern
 */
async function getCachedOHLC(tokenId: string, days: number): Promise<CachedOHLC> {
  const cacheKey = CACHE_KEYS.OHLC(tokenId, days);

  return getCachedOrFetch<CachedOHLC>(
    cacheKey,
    async () => {
      // Fetch fresh OHLC from CoinGecko
      const candles = await getCoinChart(tokenId, days);

      return {
        candles: candles as OHLCCandle[],
        granularity: getGranularity(days),
        tokenId,
        days,
        cached_at: new Date().toISOString(),
      };
    },
    CACHE_TTL.OHLC
  );
}

/**
 * Get cached trending coins
 */
async function getCachedTrending() {
  const cacheKey = 'trending:coins';

  return getCachedOrFetch(
    cacheKey,
    async () => {
      const trending = await fetchCoinGeckoTrending();
      return {
        coins: trending.coins.map((c) => ({
          id: c.id,
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          market_cap_rank: c.marketCapRank,
        })),
        cached_at: new Date().toISOString(),
      };
    },
    CACHE_TTL.PRICES // 2 minutes TTL
  );
}

/**
 * Get cached price data for a coin
 */
async function getCachedPrice(coinId: string) {
  const cacheKey = `${CACHE_KEYS.COIN_PREFIX}${coinId}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
      const data = await getCoinById(coinId);
      return {
        id: data.id,
        symbol: data.symbol?.toUpperCase(),
        name: data.name,
        current_price: data.market_data?.current_price?.usd,
        price_change_percentage_24h: data.market_data?.price_change_percentage_24h,
        market_cap: data.market_data?.market_cap?.usd,
        total_volume: data.market_data?.total_volume?.usd,
        last_updated: data.market_data?.last_updated || new Date().toISOString(),
        cached_at: new Date().toISOString(),
      };
    },
    CACHE_TTL.PRICES
  );
}

export const cryptoTools = {
  get_price: tool({
    description:
      'Get current price, 24h change, and market cap for a cryptocurrency. Call this BEFORE stating any price information. Use CoinGecko IDs like "bitcoin", "ethereum", "solana".',
    inputSchema: z.object({
      id: z.string().describe('CoinGecko token ID like "bitcoin", "ethereum", "solana"'),
    }),
    execute: async ({ id }: { id: string }) => {
      const data = await getCachedPrice(id);
      return {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        price_usd: data.current_price,
        change_24h_percent: data.price_change_percentage_24h,
        market_cap_usd: data.market_cap,
        volume_24h_usd: data.total_volume,
        last_updated: data.last_updated,
        cached_at: data.cached_at,
      };
    },
  }),

  get_trending: tool({
    description: 'Get top 7 trending cryptocurrencies. Use for "what is hot" or "surprise me" queries.',
    inputSchema: z.object({}),
    execute: async () => {
      const data = await getCachedTrending();
      return {
        coins: data.coins,
        cached_at: data.cached_at,
      };
    },
  }),

  get_ohlc: tool({
    description:
      'Get OHLC candlestick data for a cryptocurrency chart. Use when user asks for a chart, price action, technical analysis, or "show me the chart". Returns candles with swing analysis annotations.',
    inputSchema: z.object({
      id: z.string().describe('CoinGecko token ID like "bitcoin", "ethereum", "solana"'),
      days: z
        .enum(['1', '7', '14', '30', '90', '180', '365'])
        .default('7')
        .describe('Days of history. Use 1 for day trading view, 7 for swing trading, 30+ for longer term'),
    }),
    execute: async ({ id, days }: { id: string; days: string }) => {
      const data = await getCachedOHLC(id, parseInt(days));

      // Generate swing annotations and analysis
      const annotations = generateAnnotations(data.candles);
      const swingAnalysis = calculateSwingAnalysis(data.candles);

      return {
        candles: data.candles,
        tokenId: data.tokenId,
        days: data.days,
        granularity: data.granularity,
        cached_at: data.cached_at,
        annotations,
        swingAnalysis,
      };
    },
  }),
};

/**
 * DeFi tools for protocol TVL and analytics
 */
export const defiTools = {
  get_defi_tvl: tool({
    description:
      'Get TVL (Total Value Locked) for DeFi protocols. Use when user asks about DeFi, TVL, liquidity, or protocol rankings. Returns protocol data with TVL, chains, and 24h change.',
    inputSchema: z.object({
      protocol: z
        .string()
        .optional()
        .describe('Protocol slug like "aave", "uniswap", "lido". Omit for top protocols list.'),
      limit: z.number().default(10).describe('Number of top protocols to return (1-50)'),
    }),
    execute: async ({ protocol, limit }: { protocol?: string; limit: number }) => {
      if (protocol) {
        const data = await getCachedProtocol(protocol);
        return { protocol: data.protocol, cached_at: data.cached_at };
      }
      const data = await getCachedProtocols(limit);
      return { protocols: data.protocols, cached_at: data.cached_at };
    },
  }),

  compare_protocols: tool({
    description:
      'Compare multiple DeFi protocols side-by-side. Use when user wants to compare TVL, chains, or metrics across 2-4 protocols.',
    inputSchema: z.object({
      protocols: z
        .array(z.string())
        .min(2)
        .max(4)
        .describe('Array of protocol slugs to compare, e.g., ["aave", "compound", "makerdao"]'),
    }),
    execute: async ({ protocols }: { protocols: string[] }) => {
      const results = await Promise.all(protocols.map(getCachedProtocol));
      return {
        protocols: results.map((r) => r.protocol),
        cached_at: new Date().toISOString(),
      };
    },
  }),
};
