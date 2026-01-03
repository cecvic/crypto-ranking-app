import { NextResponse } from 'next/server';
import { getTopCoins } from '@/lib/apis/coingecko';
import { getAggregatedSentiment, getFearGreedIndex } from '@/lib/apis/sentiment';
import { getTechnicalAnalysis } from '@/lib/apis/technical';
import { getWhaleActivity } from '@/lib/apis/whale';
import { getAIPrediction } from '@/lib/apis/prediction';
import { calculateRankingScore, rankCoins } from '@/lib/ranking/calculator';
import { CoinRanking, CoinPrice } from '@/lib/types';

// In-memory cache for rankings
let cachedRankings: CoinRanking[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedRankings.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      return NextResponse.json({
        data: cachedRankings,
        cached: true,
        timestamp: new Date(lastFetchTime).toISOString(),
      });
    }

    // Fetch top 100 coins from CoinGecko
    const coins = await getTopCoins(100);

    // Fetch global sentiment (Fear & Greed)
    const fearGreed = await getFearGreedIndex();

    // Process each coin (with limited parallel requests to respect rate limits)
    const rankings: Omit<CoinRanking, 'rank' | 'rankChange'>[] = [];

    // Process in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < coins.length; i += batchSize) {
      const batch = coins.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (coin: CoinPrice) => {
          // Fetch data for each ranking factor
          // Note: In production, you'd want to cache these and use proper rate limiting
          const [sentiment, technical, whale, ai] = await Promise.all([
            getAggregatedSentiment(coin.id, coin.symbol).catch(() => null),
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

    // Rank all coins
    const rankedCoins = rankCoins(rankings);

    // Update cache
    cachedRankings = rankedCoins;
    lastFetchTime = now;

    return NextResponse.json({
      data: rankedCoins,
      cached: false,
      timestamp: new Date().toISOString(),
      fearGreed,
    });
  } catch (error) {
    console.error('Rankings API error:', error);

    // Return cached data on error
    if (cachedRankings.length > 0) {
      return NextResponse.json({
        data: cachedRankings,
        cached: true,
        timestamp: new Date(lastFetchTime).toISOString(),
        error: 'Using cached data due to API error',
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    );
  }
}
