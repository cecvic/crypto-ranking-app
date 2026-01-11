// Cron: Collect Prices from Multiple Sources
// Schedule: Every 10 minutes (optimized for free tier limits)
// Purpose: Aggregate coins from DexPaprika, DexScreener, and CoinGecko

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequestWithDevBypass } from '@/lib/qstash/verify';
import { getGlobalData } from '@/lib/apis/coingecko';
import { aggregateAllCoins } from '@/lib/services/coin-aggregator';
import { aggregatedToCoinPrice } from '@/lib/utils/coin-utils';
import { getRedis, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter/distributed';

// Extended cache keys for category-based storage
const CATEGORY_CACHE_KEYS = {
  PRICES_MEME: 'prices:meme',
  PRICES_AI: 'prices:ai',
  PRICES_DEFI: 'prices:defi',
  PRICES_ALL: 'prices:all',
  AGGREGATION_METADATA: 'aggregation:metadata',
} as const;

// Longer TTL for aggregated data (10 minutes)
const AGGREGATION_TTL = 600;

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[collect-prices] Starting multi-source price collection...');

  try {
    // Check rate limit before making API calls
    const rateCheck = await checkRateLimit(RATE_LIMITS.COINGECKO);
    if (!rateCheck.allowed) {
      console.log(`[collect-prices] Rate limited. Remaining: ${rateCheck.remaining}`);
      return NextResponse.json({
        success: false,
        error: 'Rate limited',
        remaining: rateCheck.remaining,
        resetAt: new Date(rateCheck.resetAt).toISOString(),
      }, { status: 429 });
    }

    // Aggregate from all sources
    const aggregationResult = await aggregateAllCoins();
    const { coins, metadata } = aggregationResult;

    console.log(`[collect-prices] Aggregated ${coins.length} coins in ${metadata.fetchDurationMs}ms`);
    console.log(`[collect-prices] Breakdown: dexpaprika=${metadata.breakdown.dexpaprika}, dexscreener=${metadata.breakdown.dexscreener}, coingecko=${metadata.breakdown.coingecko}`);

    // Fetch global market data (separate call)
    let globalData = null;
    try {
      const globalRateCheck = await checkRateLimit(RATE_LIMITS.COINGECKO);
      if (globalRateCheck.allowed) {
        globalData = await getGlobalData();
        console.log('[collect-prices] Fetched global market data');
      }
    } catch (error) {
      console.error('[collect-prices] Failed to fetch global data:', error);
      // Non-fatal, continue
    }

    // Cache in Redis
    const redis = getRedis();
    const pipeline = redis.pipeline();

    // Convert to CoinPrice format for backward compatibility
    const coinPrices = coins.map(aggregatedToCoinPrice);

    // Cache full list (backward compatible)
    pipeline.setex(
      CACHE_KEYS.PRICES_LIST,
      AGGREGATION_TTL,
      JSON.stringify(coinPrices)
    );

    // Cache aggregated coins with full metadata
    pipeline.setex(
      CATEGORY_CACHE_KEYS.PRICES_ALL,
      AGGREGATION_TTL,
      JSON.stringify(coins)
    );

    // Cache by category for fast filtering
    const memeCoins = coins.filter(c => c.is_meme);
    const aiCoins = coins.filter(c => c.is_ai);
    const defiCoins = coins.filter(c => c.is_defi);

    pipeline.setex(
      CATEGORY_CACHE_KEYS.PRICES_MEME,
      AGGREGATION_TTL,
      JSON.stringify(memeCoins)
    );
    pipeline.setex(
      CATEGORY_CACHE_KEYS.PRICES_AI,
      AGGREGATION_TTL,
      JSON.stringify(aiCoins)
    );
    pipeline.setex(
      CATEGORY_CACHE_KEYS.PRICES_DEFI,
      AGGREGATION_TTL,
      JSON.stringify(defiCoins)
    );

    // Cache individual coins for quick lookup
    for (const coin of coinPrices.slice(0, 500)) { // Limit to top 500 for performance
      pipeline.setex(
        `${CACHE_KEYS.COIN_PREFIX}${coin.id}`,
        AGGREGATION_TTL,
        JSON.stringify(coin)
      );
    }

    // Cache global data if available
    if (globalData) {
      pipeline.setex(
        CACHE_KEYS.GLOBAL_DATA,
        CACHE_TTL.PRICES,
        JSON.stringify(globalData)
      );
    }

    // Cache aggregation metadata
    pipeline.setex(
      CATEGORY_CACHE_KEYS.AGGREGATION_METADATA,
      AGGREGATION_TTL,
      JSON.stringify({
        ...metadata,
        timestamp: new Date().toISOString(),
      })
    );

    await pipeline.exec();

    const duration = Date.now() - startTime;
    console.log(`[collect-prices] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      coinsCollected: coins.length,
      breakdown: {
        total: coins.length,
        meme: memeCoins.length,
        ai: aiCoins.length,
        defi: defiCoins.length,
        sources: metadata.breakdown,
      },
      hasGlobalData: !!globalData,
      durationMs: duration,
      aggregationDurationMs: metadata.fetchDurationMs,
      errors: metadata.errors.length > 0 ? metadata.errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[collect-prices] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export const POST = verifyCronRequestWithDevBypass(handler);

// Also allow GET for local testing
export async function GET(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  return handler(req);
}
