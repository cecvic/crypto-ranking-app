// Sentiment APIs - Local analysis + LunarCrush, CryptoPanic, Alternative.me Fear & Greed
import axios from 'axios';
import { SentimentData, FearGreedIndex } from '../types';
import { generateSentimentData, getQuickSentiment, analyzeMultipleTexts } from './local-sentiment';
import { aggregateTextData, fetchCoinGeckoCommunityData } from './free-data-sources';

const USE_LOCAL_SENTIMENT = process.env.USE_LOCAL_SENTIMENT === 'true';

// ============================================
// FEAR & GREED INDEX (Alternative.me) - FREE
// ============================================
const FEAR_GREED_URL = 'https://api.alternative.me/fng/';

export async function getFearGreedIndex(): Promise<FearGreedIndex> {
  try {
    const response = await axios.get(FEAR_GREED_URL, {
      params: { limit: 2 }, // Get today and yesterday
    });

    const today = response.data.data[0];
    const yesterday = response.data.data[1];

    return {
      value: parseInt(today.value),
      classification: today.value_classification as FearGreedIndex['classification'],
      timestamp: new Date(parseInt(today.timestamp) * 1000).toISOString(),
      previousValue: yesterday ? parseInt(yesterday.value) : undefined,
      previousClassification: yesterday?.value_classification,
    };
  } catch (error) {
    console.error('Fear & Greed API error:', error);
    // Return neutral on error
    return {
      value: 50,
      classification: 'Neutral',
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================
// LUNARCRUSH API - Social Intelligence
// ============================================
const LUNARCRUSH_URL = 'https://lunarcrush.com/api4';

export async function getLunarCrushSentiment(
  symbol: string
): Promise<SentimentData | null> {
  const apiKey = process.env.LUNARCRUSH_API_KEY;
  
  if (!apiKey) {
    console.warn('LunarCrush API key not configured');
    return null;
  }

  try {
    const response = await axios.get(`${LUNARCRUSH_URL}/public/coins/${symbol.toLowerCase()}/v1`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const data = response.data.data;

    if (!data) return null;

    return {
      coinId: symbol.toLowerCase(),
      socialScore: normalizeScore(data.social_score || 0, 0, 100),
      socialVolume: data.social_volume || 0,
      sentimentPositive: data.sentiment || 50,
      sentimentNegative: 100 - (data.sentiment || 50),
      galaxyScore: data.galaxy_score,
      altRank: data.alt_rank,
      source: 'lunarcrush',
    };
  } catch (error) {
    console.error(`LunarCrush API error for ${symbol}:`, error);
    return null;
  }
}

// Batch fetch for multiple coins (more efficient)
export async function getLunarCrushBatch(
  symbols: string[]
): Promise<Map<string, SentimentData>> {
  const results = new Map<string, SentimentData>();
  const apiKey = process.env.LUNARCRUSH_API_KEY;

  if (!apiKey) {
    console.warn('LunarCrush API key not configured');
    return results;
  }

  try {
    // LunarCrush supports fetching multiple coins
    const response = await axios.get(`${LUNARCRUSH_URL}/public/coins/list/v1`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      params: {
        sort: 'galaxy_score',
        limit: 100,
      },
    });

    const coins = response.data.data || [];
    
    for (const coin of coins) {
      if (symbols.includes(coin.symbol?.toUpperCase())) {
        results.set(coin.symbol.toUpperCase(), {
          coinId: coin.id || coin.symbol.toLowerCase(),
          socialScore: normalizeScore(coin.social_score || 0, 0, 100),
          socialVolume: coin.social_volume || 0,
          sentimentPositive: coin.sentiment || 50,
          sentimentNegative: 100 - (coin.sentiment || 50),
          galaxyScore: coin.galaxy_score,
          altRank: coin.alt_rank,
          source: 'lunarcrush',
        });
      }
    }
  } catch (error) {
    console.error('LunarCrush batch API error:', error);
  }

  return results;
}

// ============================================
// CRYPTOPANIC API - News Sentiment
// ============================================
const CRYPTOPANIC_URL = 'https://cryptopanic.com/api/v1';

export async function getCryptoPanicSentiment(
  symbol: string
): Promise<{ positive: number; negative: number; total: number } | null> {
  const apiKey = process.env.CRYPTOPANIC_API_KEY;
  
  if (!apiKey) {
    console.warn('CryptoPanic API key not configured');
    return null;
  }

  try {
    const response = await axios.get(`${CRYPTOPANIC_URL}/posts/`, {
      params: {
        auth_token: apiKey,
        currencies: symbol.toUpperCase(),
        filter: 'hot',
        public: true,
      },
    });

    const posts = response.data.results || [];
    
    let positive = 0;
    let negative = 0;

    for (const post of posts) {
      if (post.votes) {
        positive += post.votes.positive || 0;
        negative += post.votes.negative || 0;
      }
    }

    const total = positive + negative;

    return {
      positive: total > 0 ? (positive / total) * 100 : 50,
      negative: total > 0 ? (negative / total) * 100 : 50,
      total,
    };
  } catch (error) {
    console.error(`CryptoPanic API error for ${symbol}:`, error);
    return null;
  }
}

export async function getLocalSentiment(
  coinId: string,
  symbol: string,
  priceChange24h: number = 0,
  priceChange7d: number = 0,
  volume24h: number = 0,
  avgVolume: number = 0
): Promise<SentimentData> {
  try {
    const [textData, communityData] = await Promise.all([
      aggregateTextData(coinId, symbol),
      fetchCoinGeckoCommunityData(coinId),
    ]);

    if (textData.length > 0) {
      const texts = textData.map(item => item.text);
      const sentimentData = generateSentimentData(coinId, texts);
      
      if (communityData) {
        sentimentData.socialScore = Math.round(
          (sentimentData.socialScore * 0.6) + (communityData.sentiment * 0.4)
        );
      }
      
      return sentimentData;
    }

    if (communityData) {
      return {
        coinId,
        socialScore: communityData.sentiment,
        socialVolume: communityData.twitterFollowers + communityData.redditSubscribers,
        sentimentPositive: communityData.sentiment,
        sentimentNegative: 100 - communityData.sentiment,
        source: 'local',
      };
    }

    return getQuickSentiment(coinId, priceChange24h, priceChange7d, volume24h, avgVolume);
  } catch {
    return getQuickSentiment(coinId, priceChange24h, priceChange7d, volume24h, avgVolume);
  }
}

export async function getAggregatedSentiment(
  coinId: string,
  symbol: string,
  priceChange24h: number = 0,
  priceChange7d: number = 0,
  volume24h: number = 0,
  avgVolume: number = 0
): Promise<SentimentData> {
  if (USE_LOCAL_SENTIMENT) {
    return getLocalSentiment(coinId, symbol, priceChange24h, priceChange7d, volume24h, avgVolume);
  }

  const [fearGreed, lunarCrush, cryptoPanic] = await Promise.all([
    getFearGreedIndex(),
    getLunarCrushSentiment(symbol),
    getCryptoPanicSentiment(symbol),
  ]);

  const defaultSentiment: SentimentData = {
    coinId,
    socialScore: 50,
    socialVolume: 0,
    sentimentPositive: 50,
    sentimentNegative: 50,
    source: 'alternative',
  };

  if (lunarCrush) {
    return lunarCrush;
  }

  if (cryptoPanic) {
    return {
      coinId,
      socialScore: cryptoPanic.positive,
      socialVolume: cryptoPanic.total,
      sentimentPositive: cryptoPanic.positive,
      sentimentNegative: cryptoPanic.negative,
      source: 'cryptopanic',
    };
  }

  return {
    ...defaultSentiment,
    socialScore: fearGreed.value,
    sentimentPositive: fearGreed.value,
    sentimentNegative: 100 - fearGreed.value,
  };
}

export async function getLocalSentimentBatch(
  coins: Array<{
    id: string;
    symbol: string;
    priceChange24h?: number;
    priceChange7d?: number;
    volume24h?: number;
    avgVolume?: number;
  }>
): Promise<Map<string, SentimentData>> {
  const results = new Map<string, SentimentData>();
  
  const batchSize = 5;
  for (let i = 0; i < coins.length; i += batchSize) {
    const batch = coins.slice(i, i + batchSize);
    const sentiments = await Promise.all(
      batch.map(coin =>
        getLocalSentiment(
          coin.id,
          coin.symbol,
          coin.priceChange24h || 0,
          coin.priceChange7d || 0,
          coin.volume24h || 0,
          coin.avgVolume || 0
        )
      )
    );
    
    sentiments.forEach((sentiment, idx) => {
      results.set(batch[idx].symbol.toUpperCase(), sentiment);
    });
  }
  
  return results;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
