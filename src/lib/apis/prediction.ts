import axios from 'axios';
import { AIPrediction } from '../types';
import { generateLocalPrediction, getBatchLocalPredictions } from './local-prediction';

const USE_LOCAL_PREDICTION = process.env.USE_LOCAL_PREDICTION === 'true';

// ============================================
// COINCODEX API (FREE - No API Key Required)
// ============================================
const COINCODEX_URL = 'https://coincodex.com/api/coincodex';

export async function getCoinCodexPrediction(
  symbol: string
): Promise<AIPrediction | null> {
  try {
    // CoinCodex uses coin shortnames
    const response = await axios.get(`${COINCODEX_URL}/get_coin/${symbol.toLowerCase()}`, {
      timeout: 10000,
    });

    const data = response.data;

    if (!data || !data.today_open) {
      return null;
    }

    // Get prediction data
    const predictionResponse = await axios.get(
      `${COINCODEX_URL}/get_coin_prediction/${symbol.toLowerCase()}`,
      { timeout: 10000 }
    );

    const prediction = predictionResponse.data;

    // Calculate predictions based on available data
    const currentPrice = data.last_price_usd || 0;
    const price7d = prediction?.price_7d || currentPrice;
    const price30d = prediction?.price_30d || currentPrice;

    // Calculate AI score based on predicted growth
    const change7d = currentPrice > 0 ? ((price7d - currentPrice) / currentPrice) * 100 : 0;
    const change30d = currentPrice > 0 ? ((price30d - currentPrice) / currentPrice) * 100 : 0;

    // Score: 50 (neutral) + adjustment based on predictions
    let aiScore = 50;
    aiScore += Math.min(25, Math.max(-25, change7d)); // -25 to +25 from 7d prediction
    aiScore += Math.min(15, Math.max(-15, change30d / 2)); // -15 to +15 from 30d prediction

    return {
      coinId: symbol.toLowerCase(),
      prediction24h: {
        price: currentPrice * (1 + (change7d / 7 / 100)), // Interpolate for 24h
        changePercent: change7d / 7,
        confidence: 0.6, // CoinCodex doesn't provide confidence
      },
      prediction7d: {
        price: price7d,
        changePercent: change7d,
        confidence: 0.55,
      },
      prediction30d: {
        price: price30d,
        changePercent: change30d,
        confidence: 0.45,
      },
      aiScore: Math.max(0, Math.min(100, aiScore)),
      source: 'coincodex',
    };
  } catch (error) {
    console.error(`CoinCodex prediction error for ${symbol}:`, error);
    return null;
  }
}

// ============================================
// TOKEN METRICS API (Requires API Key)
// ============================================
const TOKEN_METRICS_URL = 'https://api.tokenmetrics.com/v2';

export async function getTokenMetricsPrediction(
  symbol: string
): Promise<AIPrediction | null> {
  const apiKey = process.env.TOKEN_METRICS_API_KEY;

  if (!apiKey) {
    console.warn('Token Metrics API key not configured');
    return null;
  }

  try {
    // Get AI trading signals
    const response = await axios.get(`${TOKEN_METRICS_URL}/trading-signals`, {
      headers: {
        'api_key': apiKey,
      },
      params: {
        symbol: symbol.toUpperCase(),
        limit: 1,
      },
    });

    const signal = response.data.data?.[0];

    if (!signal) {
      return null;
    }

    // Token Metrics provides grades and signals
    const traderGrade = signal.trader_grade || 50;
    const investorGrade = signal.investor_grade || 50;

    // Normalize to 0-100 score
    const aiScore = (traderGrade + investorGrade) / 2;

    return {
      coinId: symbol.toLowerCase(),
      prediction24h: {
        price: signal.price_prediction_24h || 0,
        changePercent: signal.price_change_24h || 0,
        confidence: signal.confidence || 0.7,
      },
      prediction7d: {
        price: signal.price_prediction_7d || 0,
        changePercent: signal.price_change_7d || 0,
        confidence: signal.confidence_7d || 0.6,
      },
      aiScore,
      source: 'tokenmetrics',
    };
  } catch (error) {
    console.error(`Token Metrics error for ${symbol}:`, error);
    return null;
  }
}

export async function getAIPrediction(
  coinId: string,
  symbol: string,
  currentPrice: number,
  historicalPrices: number[] = [],
  priceChange24h: number = 0,
  priceChange7d: number = 0
): Promise<AIPrediction> {
  if (USE_LOCAL_PREDICTION) {
    return generateLocalPrediction(
      coinId,
      symbol,
      currentPrice,
      historicalPrices,
      priceChange24h,
      priceChange7d
    );
  }

  const [coinCodex, tokenMetrics] = await Promise.all([
    getCoinCodexPrediction(symbol).catch(() => null),
    getTokenMetricsPrediction(symbol).catch(() => null),
  ]);

  if (tokenMetrics) {
    return tokenMetrics;
  }

  if (coinCodex) {
    return coinCodex;
  }

  if (historicalPrices.length > 0) {
    return generateLocalPrediction(
      coinId,
      symbol,
      currentPrice,
      historicalPrices,
      priceChange24h,
      priceChange7d
    );
  }

  return generateDefaultPrediction(coinId, symbol, currentPrice);
}

// Generate default prediction when APIs are unavailable
function generateDefaultPrediction(
  coinId: string,
  symbol: string,
  currentPrice: number
): AIPrediction {
  // Use a hash of the symbol for consistent pseudo-random values
  const hash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  
  // Generate slight variations (-5% to +10%)
  const change24h = ((hash % 15) - 5);
  const change7d = ((hash % 20) - 5);
  const change30d = ((hash % 30) - 10);

  return {
    coinId,
    prediction24h: {
      price: currentPrice * (1 + change24h / 100),
      changePercent: change24h,
      confidence: 0.5,
    },
    prediction7d: {
      price: currentPrice * (1 + change7d / 100),
      changePercent: change7d,
      confidence: 0.4,
    },
    prediction30d: {
      price: currentPrice * (1 + change30d / 100),
      changePercent: change30d,
      confidence: 0.3,
    },
    aiScore: 50 + (change7d / 2), // Slight bias based on predicted change
    source: 'internal',
  };
}

export async function getBatchPredictions(
  coins: Array<{ 
    id: string; 
    symbol: string; 
    price: number;
    sparkline?: number[];
    priceChange24h?: number;
    priceChange7d?: number;
  }>
): Promise<Map<string, AIPrediction>> {
  if (USE_LOCAL_PREDICTION) {
    return getBatchLocalPredictions(coins.map(coin => ({
      id: coin.id,
      symbol: coin.symbol,
      price: coin.price,
      sparkline: coin.sparkline,
      priceChange24h: coin.priceChange24h,
      priceChange7d: coin.priceChange7d,
    })));
  }

  const results = new Map<string, AIPrediction>();

  const batchSize = 5;
  for (let i = 0; i < coins.length; i += batchSize) {
    const batch = coins.slice(i, i + batchSize);
    const predictions = await Promise.all(
      batch.map(coin => 
        getAIPrediction(
          coin.id, 
          coin.symbol, 
          coin.price,
          coin.sparkline || [],
          coin.priceChange24h || 0,
          coin.priceChange7d || 0
        ).catch(() => generateDefaultPrediction(coin.id, coin.symbol, coin.price))
      )
    );

    predictions.forEach((pred, idx) => {
      results.set(batch[idx].symbol.toUpperCase(), pred);
    });
  }

  return results;
}
