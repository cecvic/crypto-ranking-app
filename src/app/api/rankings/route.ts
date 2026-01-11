import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTopCoins } from '@/lib/apis/coingecko';
import { getLunarCrushBatch, getFearGreedIndex, getLocalSentimentBatch } from '@/lib/apis/sentiment';
import { getTechnicalAnalysis } from '@/lib/apis/technical';
import { getWhaleActivity } from '@/lib/apis/whale';
import { getAIPrediction } from '@/lib/apis/prediction';
import { calculateRankingScore, rankCoins } from '@/lib/ranking/calculator';
import { CoinRanking, CoinPrice, SentimentData } from '@/lib/types';
import {
  getCachedRankings,
  setCachedRankings,
  getCachedFearGreed,
  setCachedFearGreed,
} from '@/lib/cache/strategy';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';

// Feature flags
const USE_LOCAL_SENTIMENT = process.env.USE_LOCAL_SENTIMENT === 'true';
const USE_PERSISTENT_STORAGE = process.env.USE_PERSISTENT_STORAGE !== 'false';

// In-memory fallback (for local dev without database)
let inMemoryCachedRankings: CoinRanking[] = [];
let inMemoryCachedSentiment: Map<string, SentimentData> = new Map();
let inMemoryLastFetchTime = 0;
let inMemoryLastSentimentFetch = 0;

const CACHE_DURATION = 60000;
const SENTIMENT_CACHE_DURATION = 900000; // 15 min cache for sentiment

export async function GET() {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();

    // ============================================
    // L1/L2 CACHE CHECK (Redis -> PostgreSQL)
    // ============================================
    if (USE_PERSISTENT_STORAGE) {
      try {
        const cached = await getCachedRankings();
        if (cached && cached.rankings.length > 0) {
          const cacheAge = now - new Date(cached.timestamp).getTime();
          if (cacheAge < CACHE_DURATION) {
            return NextResponse.json({
              data: cached.rankings,
              cached: true,
              timestamp: cached.timestamp,
              fearGreed: cached.fearGreed,
              source: 'persistent',
            });
          }
        }
      } catch (error) {
        console.warn('Persistent cache read failed, falling back to in-memory:', error);
      }
    }

    // ============================================
    // IN-MEMORY FALLBACK CHECK
    // ============================================
    if (inMemoryCachedRankings.length > 0 && now - inMemoryLastFetchTime < CACHE_DURATION) {
      return NextResponse.json({
        data: inMemoryCachedRankings,
        cached: true,
        timestamp: new Date(inMemoryLastFetchTime).toISOString(),
        source: 'memory',
      });
    }

    // ============================================
    // FRESH DATA FETCH
    // ============================================
    const coins = await getTopCoins(100);

    // Get Fear & Greed (with caching)
    let fearGreed = USE_PERSISTENT_STORAGE ? await getCachedFearGreed() : null;
    if (!fearGreed) {
      fearGreed = await getFearGreedIndex();
      if (USE_PERSISTENT_STORAGE) {
        setCachedFearGreed(fearGreed).catch(() => {});
      }
    }

    // Get sentiment data (with Redis caching)
    let sentimentMap: Map<string, SentimentData> = new Map();

    if (USE_PERSISTENT_STORAGE) {
      // Try Redis cache for sentiment batch
      const cachedSentiment = await getCached<Record<string, SentimentData>>(
        CACHE_KEYS.SENTIMENT_BATCH
      );
      if (cachedSentiment) {
        sentimentMap = new Map(Object.entries(cachedSentiment));
      }
    }

    // Fetch fresh sentiment if cache is empty or stale
    if (sentimentMap.size === 0 && now - inMemoryLastSentimentFetch > SENTIMENT_CACHE_DURATION) {
      let sentimentBatch: Map<string, SentimentData> = new Map();

      if (USE_LOCAL_SENTIMENT) {
        // Use local sentiment analysis
        console.log('[Rankings] Using LOCAL sentiment analysis...');
        const coinData = coins.map((c: CoinPrice) => ({
          id: c.id,
          symbol: c.symbol,
          priceChange24h: c.price_change_percentage_24h || 0,
          priceChange7d: c.price_change_percentage_7d || 0,
          volume24h: c.total_volume || 0,
          avgVolume: c.total_volume || 0,
        }));
        sentimentBatch = await getLocalSentimentBatch(coinData).catch((err) => {
          console.error('[Rankings] Local sentiment error:', err);
          return new Map();
        });
        console.log(`[Rankings] Local sentiment fetched for ${sentimentBatch.size} coins`);
      } else {
        // Use LunarCrush API
        const symbols = coins.map((c: CoinPrice) => c.symbol.toUpperCase());
        sentimentBatch = await getLunarCrushBatch(symbols).catch(() => new Map());
      }

      if (sentimentBatch.size > 0) {
        sentimentMap = sentimentBatch;
        inMemoryCachedSentiment = sentimentBatch;
        inMemoryLastSentimentFetch = now;

        // Cache in Redis
        if (USE_PERSISTENT_STORAGE) {
          const sentimentObj = Object.fromEntries(sentimentBatch);
          setCached(CACHE_KEYS.SENTIMENT_BATCH, sentimentObj, CACHE_TTL.SENTIMENT_BATCH).catch(
            () => {}
          );
        }
      }
    } else if (sentimentMap.size === 0) {
      // Use in-memory fallback
      sentimentMap = inMemoryCachedSentiment;
    }

    // ============================================
    // COMPUTE RANKINGS
    // ============================================
    const rankings: Omit<CoinRanking, 'rank' | 'rankChange'>[] = [];
    const batchSize = 10;

    for (let i = 0; i < coins.length; i += batchSize) {
      const batch = coins.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (coin: CoinPrice) => {
          // Use cached sentiment or create fallback with Fear & Greed
          const sentiment = sentimentMap.get(coin.symbol.toUpperCase()) || {
            coinId: coin.id,
            socialScore: fearGreed!.value,
            socialVolume: 0,
            sentimentPositive: fearGreed!.value,
            sentimentNegative: 100 - fearGreed!.value,
            source: 'alternative' as const,
          };

          const [technical, whale, ai] = await Promise.all([
            getTechnicalAnalysis(coin.symbol).catch(() => null),
            getWhaleActivity(coin.id, coin.symbol).catch(() => null),
            getAIPrediction(coin.id, coin.symbol, coin.current_price).catch(() => null),
          ]);

          const { scores, signals } = calculateRankingScore(
            coin,
            sentiment,
            technical,
            whale,
            ai
          );

          return {
            coin,
            scores,
            signals,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      rankings.push(...batchResults);
    }

    const rankedCoins = rankCoins(rankings);

    // ============================================
    // UPDATE CACHES
    // ============================================

    // In-memory (always, for fallback)
    inMemoryCachedRankings = rankedCoins;
    inMemoryLastFetchTime = now;

    // Persistent storage (if enabled)
    if (USE_PERSISTENT_STORAGE) {
      // Fire-and-forget to avoid blocking response
      setCachedRankings(rankedCoins, fearGreed!).catch((error) => {
        console.error('Failed to persist rankings:', error);
      });
    }

    return NextResponse.json({
      data: rankedCoins,
      cached: false,
      timestamp: new Date().toISOString(),
      fearGreed,
      source: USE_PERSISTENT_STORAGE ? 'fresh_persistent' : 'fresh_memory',
    });
  } catch (error) {
    console.error('Rankings API error:', error);

    // ============================================
    // ERROR FALLBACK: Try all cache layers
    // ============================================

    // Try persistent cache
    if (USE_PERSISTENT_STORAGE) {
      try {
        const cached = await getCachedRankings();
        if (cached && cached.rankings.length > 0) {
          return NextResponse.json({
            data: cached.rankings,
            cached: true,
            timestamp: cached.timestamp,
            error: 'Using cached data due to API error',
            source: 'persistent_fallback',
          });
        }
      } catch {
        // Continue to in-memory fallback
      }
    }

    // Try in-memory cache
    if (inMemoryCachedRankings.length > 0) {
      return NextResponse.json({
        data: inMemoryCachedRankings,
        cached: true,
        timestamp: new Date(inMemoryLastFetchTime).toISOString(),
        error: 'Using cached data due to API error',
        source: 'memory_fallback',
      });
    }

    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
  }
}
