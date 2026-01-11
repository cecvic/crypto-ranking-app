// Cron: Collect Prices from CoinGecko
// Schedule: Every 1 minute
// Purpose: Fetch top 100 coins and cache for rankings

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequestWithDevBypass } from '@/lib/qstash/verify';
import { getTopCoins, getGlobalData } from '@/lib/apis/coingecko';
import { getRedis, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter/distributed';

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[collect-prices] Starting price collection...');

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

    // Fetch top 100 coins
    const coins = await getTopCoins(100, 1, true);
    console.log(`[collect-prices] Fetched ${coins.length} coins`);

    // Fetch global market data
    let globalData = null;
    try {
      // Check rate limit again for second call
      const globalRateCheck = await checkRateLimit(RATE_LIMITS.COINGECKO);
      if (globalRateCheck.allowed) {
        globalData = await getGlobalData();
        console.log('[collect-prices] Fetched global market data');
      }
    } catch (error) {
      console.error('[collect-prices] Failed to fetch global data:', error);
      // Non-fatal, continue with coins
    }

    // Cache in Redis
    const redis = getRedis();

    // Cache full coin list
    await redis.setex(
      CACHE_KEYS.PRICES_LIST,
      CACHE_TTL.PRICES,
      JSON.stringify(coins)
    );

    // Cache individual coins for quick lookup
    const pipeline = redis.pipeline();
    for (const coin of coins) {
      pipeline.setex(
        `${CACHE_KEYS.COIN_PREFIX}${coin.id}`,
        CACHE_TTL.PRICES,
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

    await pipeline.exec();

    const duration = Date.now() - startTime;
    console.log(`[collect-prices] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      coinsCollected: coins.length,
      hasGlobalData: !!globalData,
      durationMs: duration,
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
