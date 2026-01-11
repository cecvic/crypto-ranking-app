import * as ss from 'simple-statistics';
import { AIPrediction } from '../types';

interface PriceDataPoint {
  timestamp: number;
  price: number;
  volume?: number;
}

export function calculateTrendPrediction(
  prices: number[],
  horizon: number = 7
): { predictedPrice: number; changePercent: number; confidence: number; trend: 'up' | 'down' | 'sideways' } {
  if (prices.length < 7) {
    const lastPrice = prices[prices.length - 1] || 0;
    return { predictedPrice: lastPrice, changePercent: 0, confidence: 0.3, trend: 'sideways' };
  }

  const currentPrice = prices[prices.length - 1];
  
  const recentPrices = prices.slice(-14);
  const xValues = recentPrices.map((_, i) => i);
  const regression = ss.linearRegression(xValues.map((x, i) => [x, recentPrices[i]]));
  const regressionLine = ss.linearRegressionLine(regression);
  
  const predictedPrice = regressionLine(recentPrices.length + horizon - 1);
  const changePercent = ((predictedPrice - currentPrice) / currentPrice) * 100;
  
  const rSquared = calculateRSquared(recentPrices, xValues.map(x => regressionLine(x)));
  const volatility = ss.standardDeviation(recentPrices) / ss.mean(recentPrices);
  const confidence = Math.max(0.2, Math.min(0.8, rSquared * (1 - volatility)));
  
  let trend: 'up' | 'down' | 'sideways' = 'sideways';
  if (changePercent > 2) trend = 'up';
  else if (changePercent < -2) trend = 'down';

  return {
    predictedPrice: Math.max(0, predictedPrice),
    changePercent,
    confidence,
    trend,
  };
}

export function calculateMomentumScore(prices: number[]): number {
  if (prices.length < 14) return 50;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const recentReturns = returns.slice(-7);
  const avgReturn = ss.mean(recentReturns);
  const momentum = Math.tanh(avgReturn * 50) * 50 + 50;

  return Math.max(0, Math.min(100, momentum));
}

export function calculateVolatilityAdjustedPrediction(
  prices: number[],
  volumes: number[] = []
): { bullishProbability: number; confidence: number } {
  if (prices.length < 7) {
    return { bullishProbability: 50, confidence: 0.3 };
  }

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const recentReturns = returns.slice(-14);
  const volatility = ss.standardDeviation(recentReturns);
  const avgReturn = ss.mean(recentReturns);
  
  const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;
  const bullishProbability = 50 + Math.tanh(sharpeRatio * 2) * 40;
  
  const confidence = Math.max(0.3, 0.7 - volatility * 5);

  return {
    bullishProbability: Math.max(10, Math.min(90, bullishProbability)),
    confidence: Math.max(0.2, Math.min(0.7, confidence)),
  };
}

export function generateLocalPrediction(
  coinId: string,
  symbol: string,
  currentPrice: number,
  historicalPrices: number[],
  priceChange24h: number = 0,
  priceChange7d: number = 0
): AIPrediction {
  if (historicalPrices.length < 7) {
    return generateFallbackPrediction(coinId, symbol, currentPrice, priceChange24h, priceChange7d);
  }

  const prediction24h = calculateTrendPrediction(historicalPrices, 1);
  const prediction7d = calculateTrendPrediction(historicalPrices, 7);
  const prediction30d = calculateTrendPrediction(historicalPrices, 30);
  
  const momentum = calculateMomentumScore(historicalPrices);
  const volatilityAdj = calculateVolatilityAdjustedPrediction(historicalPrices);
  
  const aiScore = (momentum * 0.4) + (volatilityAdj.bullishProbability * 0.4) + 
    (prediction7d.trend === 'up' ? 60 : prediction7d.trend === 'down' ? 40 : 50) * 0.2;

  return {
    coinId,
    prediction24h: {
      price: prediction24h.predictedPrice,
      changePercent: prediction24h.changePercent,
      confidence: prediction24h.confidence,
    },
    prediction7d: {
      price: prediction7d.predictedPrice,
      changePercent: prediction7d.changePercent,
      confidence: prediction7d.confidence,
    },
    prediction30d: {
      price: prediction30d.predictedPrice,
      changePercent: prediction30d.changePercent,
      confidence: prediction30d.confidence * 0.7,
    },
    aiScore: Math.max(0, Math.min(100, Math.round(aiScore))),
    source: 'internal',
  };
}

function generateFallbackPrediction(
  coinId: string,
  symbol: string,
  currentPrice: number,
  priceChange24h: number,
  priceChange7d: number
): AIPrediction {
  const momentum24h = Math.tanh(priceChange24h / 10) * 15;
  const momentum7d = Math.tanh(priceChange7d / 20) * 15;
  const aiScore = 50 + momentum24h + momentum7d;
  
  const change24hPredicted = priceChange24h * 0.3;
  const change7dPredicted = priceChange7d * 0.5;
  const change30dPredicted = priceChange7d * 1.2;

  return {
    coinId,
    prediction24h: {
      price: currentPrice * (1 + change24hPredicted / 100),
      changePercent: change24hPredicted,
      confidence: 0.4,
    },
    prediction7d: {
      price: currentPrice * (1 + change7dPredicted / 100),
      changePercent: change7dPredicted,
      confidence: 0.35,
    },
    prediction30d: {
      price: currentPrice * (1 + change30dPredicted / 100),
      changePercent: change30dPredicted,
      confidence: 0.25,
    },
    aiScore: Math.max(0, Math.min(100, Math.round(aiScore))),
    source: 'internal',
  };
}

export async function getBatchLocalPredictions(
  coins: Array<{ 
    id: string; 
    symbol: string; 
    price: number; 
    sparkline?: number[];
    priceChange24h?: number;
    priceChange7d?: number;
  }>
): Promise<Map<string, AIPrediction>> {
  const results = new Map<string, AIPrediction>();

  for (const coin of coins) {
    const prediction = generateLocalPrediction(
      coin.id,
      coin.symbol,
      coin.price,
      coin.sparkline || [],
      coin.priceChange24h || 0,
      coin.priceChange7d || 0
    );
    results.set(coin.symbol.toUpperCase(), prediction);
  }

  return results;
}

function calculateRSquared(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) return 0;
  
  const meanActual = ss.mean(actual);
  let ssTotal = 0;
  let ssResidual = 0;
  
  for (let i = 0; i < actual.length; i++) {
    ssTotal += Math.pow(actual[i] - meanActual, 2);
    ssResidual += Math.pow(actual[i] - predicted[i], 2);
  }
  
  if (ssTotal === 0) return 0;
  return Math.max(0, 1 - (ssResidual / ssTotal));
}
