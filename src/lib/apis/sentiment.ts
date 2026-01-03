// Sentiment APIs - LunarCrush, CryptoPanic, Alternative.me Fear & Greed
import axios from 'axios';
import { SentimentData, FearGreedIndex } from '../types';

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

// ============================================
// AGGREGATED SENTIMENT SCORE
// ============================================
export async function getAggregatedSentiment(
  coinId: string,
  symbol: string
): Promise<SentimentData> {
  // Fetch from multiple sources in parallel
  const [fearGreed, lunarCrush, cryptoPanic] = await Promise.all([
    getFearGreedIndex(),
    getLunarCrushSentiment(symbol),
    getCryptoPanicSentiment(symbol),
  ]);

  // Default sentiment if all sources fail
  const defaultSentiment: SentimentData = {
    coinId,
    socialScore: 50,
    socialVolume: 0,
    sentimentPositive: 50,
    sentimentNegative: 50,
    source: 'alternative',
  };

  // Priority: LunarCrush > CryptoPanic > Fear & Greed (global)
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

  // Fall back to global Fear & Greed
  return {
    ...defaultSentiment,
    socialScore: fearGreed.value,
    sentimentPositive: fearGreed.value,
    sentimentNegative: 100 - fearGreed.value,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
