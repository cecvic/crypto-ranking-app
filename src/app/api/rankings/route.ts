import { NextResponse } from 'next/server';
import { getTopCoins } from '@/lib/apis/coingecko';
import { getLunarCrushBatch, getFearGreedIndex, getLocalSentimentBatch } from '@/lib/apis/sentiment';
import { getTechnicalAnalysis } from '@/lib/apis/technical';
import { getWhaleActivity } from '@/lib/apis/whale';
import { getAIPrediction } from '@/lib/apis/prediction';
import { calculateRankingScore, rankCoins } from '@/lib/ranking/calculator';
import { CoinRanking, CoinPrice, SentimentData } from '@/lib/types';

const USE_LOCAL_SENTIMENT = process.env.USE_LOCAL_SENTIMENT === 'true';

let cachedRankings: CoinRanking[] = [];
let cachedSentiment: Map<string, SentimentData> = new Map();
let lastFetchTime = 0;
let lastSentimentFetch = 0;
const CACHE_DURATION = 60000;
const SENTIMENT_CACHE_DURATION = 900000; // 15 min cache for sentiment (rate limit protection)

export async function GET() {
  try {
    const now = Date.now();

    if (cachedRankings.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      return NextResponse.json({
        data: cachedRankings,
        cached: true,
        timestamp: new Date(lastFetchTime).toISOString(),
      });
    }

    const coins = await getTopCoins(100);
    const fearGreed = await getFearGreedIndex();

    if (now - lastSentimentFetch > SENTIMENT_CACHE_DURATION) {
      let sentimentBatch: Map<string, SentimentData> = new Map();
      
      if (USE_LOCAL_SENTIMENT) {
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
        const symbols = coins.map((c: CoinPrice) => c.symbol.toUpperCase());
        sentimentBatch = await getLunarCrushBatch(symbols).catch(() => new Map());
      }
      
      if (sentimentBatch.size > 0) {
        cachedSentiment = sentimentBatch;
        lastSentimentFetch = now;
      }
    }

    const rankings: Omit<CoinRanking, 'rank' | 'rankChange'>[] = [];
    const batchSize = 10;

    for (let i = 0; i < coins.length; i += batchSize) {
      const batch = coins.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (coin: CoinPrice) => {
          // Use cached sentiment or create fallback with Fear & Greed
          const sentiment = cachedSentiment.get(coin.symbol.toUpperCase()) || {
            coinId: coin.id,
            socialScore: fearGreed.value,
            socialVolume: 0,
            sentimentPositive: fearGreed.value,
            sentimentNegative: 100 - fearGreed.value,
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
