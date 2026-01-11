// Cron: Collect Sentiment Data
// Schedule: Every 15 minutes
// Purpose: Aggregate sentiment from local analysis + Fear & Greed index

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequestWithDevBypass } from '@/lib/qstash/verify';
import { getRedis, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { getFearGreedIndex } from '@/lib/apis/sentiment';
import { getQuickSentiment } from '@/lib/apis/local-sentiment';
import { CoinPrice, SentimentData } from '@/lib/types';

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[collect-sentiment] Starting sentiment collection...');

  try {
    const redis = getRedis();

    // Get cached prices for sentiment calculation
    const cachedPrices = await redis.get<string>(CACHE_KEYS.PRICES_LIST);
    if (!cachedPrices) {
      console.log('[collect-sentiment] No cached prices found, skipping');
      return NextResponse.json({
        success: false,
        error: 'No price data available',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const coins: CoinPrice[] = typeof cachedPrices === 'string'
      ? JSON.parse(cachedPrices)
      : cachedPrices;

    console.log(`[collect-sentiment] Processing ${coins.length} coins`);

    // Fetch Fear & Greed index (free API)
    let fearGreed = null;
    try {
      fearGreed = await getFearGreedIndex();
      console.log(`[collect-sentiment] Fear & Greed: ${fearGreed.value} (${fearGreed.classification})`);
    } catch (error) {
      console.error('[collect-sentiment] Failed to fetch Fear & Greed:', error);
    }

    // Generate sentiment for each coin using local analysis
    // In production, this could be enhanced with RSS feeds or social data
    const sentimentData: SentimentData[] = [];
    const avgVolume = coins.reduce((sum, c) => sum + (c.total_volume || 0), 0) / coins.length;

    for (const coin of coins) {
      const sentiment = getQuickSentiment(
        coin.id,
        coin.price_change_percentage_24h || 0,
        coin.price_change_percentage_7d || 0,
        coin.total_volume || 0,
        avgVolume
      );
      sentimentData.push(sentiment);
    }

    // Cache batch sentiment data
    await redis.setex(
      CACHE_KEYS.SENTIMENT_BATCH,
      CACHE_TTL.SENTIMENT,
      JSON.stringify(sentimentData)
    );

    // Cache Fear & Greed if available
    if (fearGreed) {
      await redis.setex(
        CACHE_KEYS.FEAR_GREED,
        CACHE_TTL.FEAR_GREED,
        JSON.stringify(fearGreed)
      );
    }

    // Also cache individual coin sentiment for quick lookups
    const pipeline = redis.pipeline();
    for (const sentiment of sentimentData) {
      pipeline.setex(
        `${CACHE_KEYS.SENTIMENT_PREFIX}${sentiment.coinId}`,
        CACHE_TTL.SENTIMENT,
        JSON.stringify(sentiment)
      );
    }
    await pipeline.exec();

    const duration = Date.now() - startTime;
    console.log(`[collect-sentiment] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      coinsProcessed: sentimentData.length,
      hasFearGreed: !!fearGreed,
      fearGreedValue: fearGreed?.value,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[collect-sentiment] Error:', error);

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
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  return handler(req);
}
