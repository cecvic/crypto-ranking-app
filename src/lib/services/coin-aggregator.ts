// Coin Aggregator Service
// Aggregates coin data from multiple sources (DexPaprika, DexScreener, CoinGecko)
// Deduplicates, filters stablecoins, and tags by category

import * as dexpaprika from '../apis/dexpaprika';
import * as dexscreener from '../apis/dexscreener';
import * as coingecko from '../apis/coingecko';
import {
  AggregatedCoin,
  AggregationResult,
  DexPaprikaToken,
  DexScreenerPair,
  CoinPrice,
} from '../types';
import {
  normalizeDexPaprikaToken,
  normalizeDexScreenerPair,
  normalizeCoingeckoCoin,
  deduplicateCoins,
  filterStablecoins,
  filterByVolume,
  sortCoins,
} from '../utils/coin-utils';

// Configuration
const CONFIG = {
  // Limits per source
  dexpaprikaLimit: 1000,
  dexscreenerSearchLimit: 50,
  coingeckoCategoryLimit: 250,
  coingeckoTopLimit: 250,

  // Minimum volume threshold (USD)
  minVolume: 1000,

  // Timeout for each source (ms)
  sourceTimeout: 30000,
};

/**
 * Aggregate coins from all sources
 * This is the main entry point for the cron job
 */
export async function aggregateAllCoins(): Promise<AggregationResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log('[Aggregator] Starting multi-source coin aggregation...');

  // Fetch from all sources in parallel
  const [
    dexPaprikaTokens,
    dexScreenerBoosted,
    dexScreenerMemes,
    coingeckoMeme,
    coingeckoAI,
    coingeckoDefi,
    coingeckoTop,
  ] = await Promise.all([
    // DexPaprika - Top tokens by volume
    fetchWithTimeout(
      () => dexpaprika.getTopTokens(CONFIG.dexpaprikaLimit),
      CONFIG.sourceTimeout,
      'dexpaprika-top'
    ).catch((e) => {
      errors.push(`DexPaprika: ${e.message}`);
      return [] as DexPaprikaToken[];
    }),

    // DexScreener - Boosted/trending tokens
    fetchWithTimeout(
      () => dexscreener.getBoostedTokens(),
      CONFIG.sourceTimeout,
      'dexscreener-boosted'
    ).catch((e) => {
      errors.push(`DexScreener boosted: ${e.message}`);
      return [];
    }),

    // DexScreener - Meme coin search
    fetchWithTimeout(
      () => dexscreener.getTrendingMemeCoins(),
      CONFIG.sourceTimeout,
      'dexscreener-memes'
    ).catch((e) => {
      errors.push(`DexScreener memes: ${e.message}`);
      return [] as DexScreenerPair[];
    }),

    // CoinGecko - Meme category
    fetchWithTimeout(
      () => coingecko.getMemeCoins(CONFIG.coingeckoCategoryLimit),
      CONFIG.sourceTimeout,
      'coingecko-meme'
    ).catch((e) => {
      errors.push(`CoinGecko meme: ${e.message}`);
      return [] as CoinPrice[];
    }),

    // CoinGecko - AI category
    fetchWithTimeout(
      () => coingecko.getAICoins(CONFIG.coingeckoCategoryLimit),
      CONFIG.sourceTimeout,
      'coingecko-ai'
    ).catch((e) => {
      errors.push(`CoinGecko AI: ${e.message}`);
      return [] as CoinPrice[];
    }),

    // CoinGecko - DeFi category
    fetchWithTimeout(
      () => coingecko.getDefiCoins(CONFIG.coingeckoCategoryLimit),
      CONFIG.sourceTimeout,
      'coingecko-defi'
    ).catch((e) => {
      errors.push(`CoinGecko DeFi: ${e.message}`);
      return [] as CoinPrice[];
    }),

    // CoinGecko - Top by market cap (for general coverage)
    fetchWithTimeout(
      () => coingecko.getTopCoins(CONFIG.coingeckoTopLimit, 1, false),
      CONFIG.sourceTimeout,
      'coingecko-top'
    ).catch((e) => {
      errors.push(`CoinGecko top: ${e.message}`);
      return [] as CoinPrice[];
    }),
  ]);

  // Convert boosted tokens to pairs for normalization
  let dexScreenerPairs: DexScreenerPair[] = [...dexScreenerMemes];
  if (dexScreenerBoosted.length > 0) {
    try {
      const boostedPairs = await dexscreener.boostedToPairs(dexScreenerBoosted);
      dexScreenerPairs = [...dexScreenerPairs, ...boostedPairs];
    } catch (e) {
      errors.push(`DexScreener pair conversion: ${(e as Error).message}`);
    }
  }

  // Log source counts
  console.log('[Aggregator] Source counts:');
  console.log(`  - DexPaprika: ${dexPaprikaTokens.length} tokens`);
  console.log(`  - DexScreener: ${dexScreenerPairs.length} pairs`);
  console.log(`  - CoinGecko Meme: ${coingeckoMeme.length} coins`);
  console.log(`  - CoinGecko AI: ${coingeckoAI.length} coins`);
  console.log(`  - CoinGecko DeFi: ${coingeckoDefi.length} coins`);
  console.log(`  - CoinGecko Top: ${coingeckoTop.length} coins`);

  // Normalize all to common format
  const normalized: AggregatedCoin[] = [
    ...dexPaprikaTokens.map(normalizeDexPaprikaToken),
    ...dexScreenerPairs.map(normalizeDexScreenerPair),
    ...coingeckoMeme.map((c) => normalizeCoingeckoCoin(c, 'meme')),
    ...coingeckoAI.map((c) => normalizeCoingeckoCoin(c, 'ai')),
    ...coingeckoDefi.map((c) => normalizeCoingeckoCoin(c, 'defi')),
    ...coingeckoTop.map((c) => normalizeCoingeckoCoin(c)),
  ];

  const totalFetched = normalized.length;
  console.log(`[Aggregator] Total fetched: ${totalFetched} coins`);

  // Deduplicate (prefer CoinGecko metadata)
  const deduped = deduplicateCoins(normalized);
  console.log(`[Aggregator] After deduplication: ${deduped.length} coins`);

  // Filter stablecoins
  const noStables = filterStablecoins(deduped);
  console.log(`[Aggregator] After stablecoin filter: ${noStables.length} coins`);

  // Filter by minimum volume
  const filtered = filterByVolume(noStables, CONFIG.minVolume);
  console.log(`[Aggregator] After volume filter: ${filtered.length} coins`);

  // Sort by volume
  const sorted = sortCoins(filtered, 'volume', 'desc');

  // Calculate category breakdown
  const categoryBreakdown = {
    meme: sorted.filter((c) => c.is_meme).length,
    ai: sorted.filter((c) => c.is_ai).length,
    defi: sorted.filter((c) => c.is_defi).length,
  };

  const result: AggregationResult = {
    coins: sorted,
    metadata: {
      totalFetched,
      afterDedup: deduped.length,
      afterStablecoinFilter: noStables.length,
      breakdown: {
        dexpaprika: dexPaprikaTokens.length,
        dexscreener: dexScreenerPairs.length,
        coingecko: coingeckoMeme.length + coingeckoAI.length + coingeckoDefi.length + coingeckoTop.length,
      },
      categoryBreakdown,
      fetchDurationMs: Date.now() - startTime,
      errors,
    },
  };

  console.log(`[Aggregator] Completed in ${result.metadata.fetchDurationMs}ms`);
  console.log(`[Aggregator] Final coin count: ${sorted.length}`);
  console.log(`[Aggregator] Categories: meme=${categoryBreakdown.meme}, ai=${categoryBreakdown.ai}, defi=${categoryBreakdown.defi}`);

  if (errors.length > 0) {
    console.warn(`[Aggregator] Errors encountered: ${errors.join(', ')}`);
  }

  return result;
}

/**
 * Aggregate coins by specific category
 */
export async function aggregateCoinsByCategory(
  category: 'meme' | 'ai' | 'defi' | 'all'
): Promise<AggregatedCoin[]> {
  const result = await aggregateAllCoins();

  if (category === 'all') {
    return result.coins;
  }

  return result.coins.filter((coin) => {
    switch (category) {
      case 'meme':
        return coin.is_meme;
      case 'ai':
        return coin.is_ai;
      case 'defi':
        return coin.is_defi;
      default:
        return true;
    }
  });
}

/**
 * Quick aggregation - only fetch from fastest sources
 */
export async function aggregateQuick(): Promise<AggregatedCoin[]> {
  const startTime = Date.now();

  // Only fetch from CoinGecko (most reliable, good metadata)
  const [meme, ai, defi, top] = await Promise.all([
    coingecko.getMemeCoins(100).catch(() => []),
    coingecko.getAICoins(100).catch(() => []),
    coingecko.getDefiCoins(100).catch(() => []),
    coingecko.getTopCoins(100, 1, false).catch(() => []),
  ]);

  const normalized = [
    ...meme.map((c) => normalizeCoingeckoCoin(c, 'meme')),
    ...ai.map((c) => normalizeCoingeckoCoin(c, 'ai')),
    ...defi.map((c) => normalizeCoingeckoCoin(c, 'defi')),
    ...top.map((c) => normalizeCoingeckoCoin(c)),
  ];

  const deduped = deduplicateCoins(normalized);
  const filtered = filterStablecoins(deduped);

  console.log(`[Aggregator-Quick] Completed in ${Date.now() - startTime}ms with ${filtered.length} coins`);

  return filtered;
}

// ============================================
// Helpers
// ============================================

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout<T>(
  fetcher: () => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      fetcher(),
      new Promise<T>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Timeout after ${timeoutMs}ms`));
        });
      }),
    ]);

    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[Aggregator] ${label} failed:`, error);
    throw error;
  }
}
