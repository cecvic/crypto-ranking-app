// Cron: Compute Rankings
// Schedule: Every 5 minutes
// Purpose: Aggregate all signals and compute final rankings, persist to DB

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequestWithDevBypass } from '@/lib/qstash/verify';
import { getRedis, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import { createSnapshot, refreshRankChangesView, getLatestSnapshot } from '@/lib/db/queries';
import { calculateRankingScore, rankCoins } from '@/lib/ranking/calculator';
import { generateLocalPrediction } from '@/lib/apis/local-prediction';
import { getTechnicalAnalysis } from '@/lib/apis/technical';
import { getWhaleActivity } from '@/lib/apis/whale';
import {
  CoinPrice,
  CoinRanking,
  SentimentData,
  TechnicalAnalysis,
  WhaleActivity,
  AIPrediction,
  FearGreedIndex,
} from '@/lib/types';

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[compute-rankings] Starting rankings computation...');

  try {
    const redis = getRedis();

    // 1. Get cached price data
    const cachedPrices = await redis.get<string>(CACHE_KEYS.PRICES_LIST);
    if (!cachedPrices) {
      console.log('[compute-rankings] No cached prices found, skipping');
      return NextResponse.json({
        success: false,
        error: 'No price data available',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const coins: CoinPrice[] = typeof cachedPrices === 'string'
      ? JSON.parse(cachedPrices)
      : cachedPrices;

    console.log(`[compute-rankings] Processing ${coins.length} coins`);

    // 2. Get cached sentiment data
    const cachedSentiment = await redis.get<string>(CACHE_KEYS.SENTIMENT_BATCH);
    const sentimentMap = new Map<string, SentimentData>();
    if (cachedSentiment) {
      const sentimentList: SentimentData[] = typeof cachedSentiment === 'string'
        ? JSON.parse(cachedSentiment)
        : cachedSentiment;
      for (const s of sentimentList) {
        sentimentMap.set(s.coinId, s);
      }
    }

    // 3. Get Fear & Greed index
    let fearGreed: FearGreedIndex = {
      value: 50,
      classification: 'Neutral',
      timestamp: new Date().toISOString(),
    };
    const cachedFearGreed = await redis.get<string>(CACHE_KEYS.FEAR_GREED);
    if (cachedFearGreed) {
      fearGreed = typeof cachedFearGreed === 'string'
        ? JSON.parse(cachedFearGreed)
        : cachedFearGreed;
    }

    // 4. Compute rankings for each coin
    const rawRankings: Omit<CoinRanking, 'rank' | 'rankChange'>[] = [];

    for (const coin of coins) {
      // Get sentiment for this coin
      const sentiment = sentimentMap.get(coin.id) || null;

      // Generate technical analysis (uses mock if no API key)
      let technical: TechnicalAnalysis | null = null;
      try {
        technical = await getTechnicalAnalysis(coin.symbol);
      } catch (error) {
        // Log but continue - technical is optional
        console.debug(`[compute-rankings] Technical analysis skipped for ${coin.symbol}`);
      }

      // Generate AI prediction locally
      let ai: AIPrediction | null = null;
      try {
        const sparkline = coin.sparkline_in_7d?.price || [];
        ai = generateLocalPrediction(
          coin.id,
          coin.symbol,
          coin.current_price,
          sparkline,
          coin.price_change_percentage_24h,
          coin.price_change_percentage_7d
        );
      } catch (error) {
        console.debug(`[compute-rankings] AI prediction skipped for ${coin.symbol}`);
      }

      // Get whale activity (uses DefiLlama free API)
      let whale: WhaleActivity | null = null;
      try {
        whale = await getWhaleActivity(coin.id, coin.symbol);
      } catch (error) {
        console.debug(`[compute-rankings] Whale activity skipped for ${coin.symbol}`);
      }

      // Calculate ranking score
      const { scores, signals } = calculateRankingScore(
        coin,
        sentiment,
        technical,
        whale,
        ai
      );

      rawRankings.push({
        coin,
        scores,
        signals,
        updatedAt: new Date().toISOString(),
      });
    }

    // 5. Rank coins by overall score
    const rankings = rankCoins(rawRankings);

    console.log(`[compute-rankings] Computed ${rankings.length} rankings`);

    // 6. Persist to database if persistent storage is enabled
    let snapshotId: number | null = null;
    if (process.env.USE_PERSISTENT_STORAGE === 'true') {
      try {
        snapshotId = await createSnapshot(rankings, fearGreed);
        console.log(`[compute-rankings] Created snapshot ${snapshotId}`);

        // Refresh materialized view for rank changes (Tiger 2 mitigation)
        try {
          await refreshRankChangesView();
          console.log('[compute-rankings] Refreshed materialized view');
        } catch (viewError) {
          // View might not exist yet, that's ok
          console.debug('[compute-rankings] Materialized view refresh skipped:', viewError);
        }
      } catch (dbError) {
        console.error('[compute-rankings] Database error:', dbError);
        // Continue - we can still cache to Redis
      }
    }

    // 7. Cache rankings in Redis for fast access
    await redis.setex(
      CACHE_KEYS.RANKINGS_LATEST,
      CACHE_TTL.RANKINGS_LATEST,
      JSON.stringify(rankings)
    );

    // Cache individual coin rankings
    const pipeline = redis.pipeline();
    for (const ranking of rankings) {
      pipeline.setex(
        CACHE_KEYS.RANKINGS_COIN(ranking.coin.id),
        CACHE_TTL.RANKINGS_COIN,
        JSON.stringify(ranking)
      );
    }
    await pipeline.exec();

    const duration = Date.now() - startTime;
    console.log(`[compute-rankings] Completed in ${duration}ms`);

    // Return summary
    const topRankings = rankings.slice(0, 5).map(r => ({
      rank: r.rank,
      symbol: r.coin.symbol,
      score: r.scores.overall,
    }));

    return NextResponse.json({
      success: true,
      rankingsComputed: rankings.length,
      snapshotId,
      fearGreed: fearGreed.value,
      topRankings,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[compute-rankings] Error:', error);

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
