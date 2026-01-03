// Technical Analysis API - TAAPI.io
import axios from 'axios';
import { TechnicalAnalysis } from '../types';

const TAAPI_URL = 'https://api.taapi.io';

// Rate limit: Free tier = 1 request per 15 seconds, 5000/day
const api = axios.create({
  baseURL: TAAPI_URL,
  timeout: 15000,
});

interface TaapiIndicator {
  indicator: string;
  id?: string;
}

interface TaapiBulkRequest {
  secret: string;
  construct: {
    exchange: string;
    symbol: string;
    interval: string;
    indicators: TaapiIndicator[];
  };
}

export async function getTechnicalAnalysis(
  symbol: string,
  interval: string = '1h'
): Promise<TechnicalAnalysis | null> {
  const apiKey = process.env.TAAPI_API_KEY;

  if (!apiKey) {
    console.warn('TAAPI API key not configured');
    return generateMockTA(symbol, interval);
  }

  try {
    // Use bulk endpoint for efficiency (1 request for multiple indicators)
    const bulkRequest: TaapiBulkRequest = {
      secret: apiKey,
      construct: {
        exchange: 'binance',
        symbol: `${symbol}/USDT`,
        interval: interval,
        indicators: [
          { indicator: 'rsi', id: 'rsi' },
          { indicator: 'macd', id: 'macd' },
          { indicator: 'bbands', id: 'bbands' },
          { indicator: 'sma', id: 'sma20' },
          { indicator: 'supertrend', id: 'supertrend' },
        ],
      },
    };

    const response = await api.post('/bulk', bulkRequest);
    const data = response.data.data;

    // Parse indicators from response
    const rsi = data.find((d: any) => d.id === 'rsi')?.result?.value || 50;
    const macd = data.find((d: any) => d.id === 'macd')?.result || {};
    const bbands = data.find((d: any) => d.id === 'bbands')?.result || {};
    const sma20 = data.find((d: any) => d.id === 'sma20')?.result?.value || 0;
    const supertrend = data.find((d: any) => d.id === 'supertrend')?.result || {};

    // Calculate overall signal and score
    const { signal, score } = calculateTASignal(rsi, macd, supertrend);

    return {
      coinId: symbol.toLowerCase(),
      symbol: symbol,
      interval: interval,
      rsi: rsi,
      macd: {
        macd: macd.valueMACD || 0,
        signal: macd.valueMACDSignal || 0,
        histogram: macd.valueMACDHist || 0,
      },
      bbands: {
        upper: bbands.valueUpperBand || 0,
        middle: bbands.valueMiddleBand || 0,
        lower: bbands.valueLowerBand || 0,
      },
      sma20: sma20,
      sma50: 0,
      sma200: 0,
      supertrend: supertrend.value ? {
        value: supertrend.value,
        direction: supertrend.valueAdvice === 'long' ? 'up' : 'down',
      } : undefined,
      overallSignal: signal,
      score: score,
    };
  } catch (error) {
    console.error(`TAAPI error for ${symbol}:`, error);
    return generateMockTA(symbol, interval);
  }
}

// Get TA for single indicator (for when you don't need all)
export async function getSingleIndicator(
  symbol: string,
  indicator: string,
  interval: string = '1h'
): Promise<any> {
  const apiKey = process.env.TAAPI_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await api.get(`/${indicator}`, {
      params: {
        secret: apiKey,
        exchange: 'binance',
        symbol: `${symbol}/USDT`,
        interval: interval,
      },
    });

    return response.data;
  } catch (error) {
    console.error(`TAAPI ${indicator} error for ${symbol}:`, error);
    return null;
  }
}

// Calculate overall signal based on indicators
function calculateTASignal(
  rsi: number,
  macd: { valueMACD?: number; valueMACDSignal?: number; valueMACDHist?: number },
  supertrend: { valueAdvice?: string }
): { signal: TechnicalAnalysis['overallSignal']; score: number } {
  let score = 50; // Start neutral
  let bullishSignals = 0;
  let bearishSignals = 0;

  // RSI analysis
  if (rsi < 30) {
    bullishSignals += 2; // Oversold = bullish
    score += 15;
  } else if (rsi < 40) {
    bullishSignals += 1;
    score += 8;
  } else if (rsi > 70) {
    bearishSignals += 2; // Overbought = bearish
    score -= 15;
  } else if (rsi > 60) {
    bearishSignals += 1;
    score -= 8;
  }

  // MACD analysis
  if (macd.valueMACDHist !== undefined) {
    if (macd.valueMACDHist > 0) {
      bullishSignals += 1;
      score += 10;
    } else {
      bearishSignals += 1;
      score -= 10;
    }
  }

  // Supertrend analysis
  if (supertrend.valueAdvice === 'long') {
    bullishSignals += 2;
    score += 15;
  } else if (supertrend.valueAdvice === 'short') {
    bearishSignals += 2;
    score -= 15;
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine signal
  let signal: TechnicalAnalysis['overallSignal'];
  const netSignal = bullishSignals - bearishSignals;

  if (netSignal >= 3) {
    signal = 'strong_buy';
  } else if (netSignal >= 1) {
    signal = 'buy';
  } else if (netSignal <= -3) {
    signal = 'strong_sell';
  } else if (netSignal <= -1) {
    signal = 'sell';
  } else {
    signal = 'neutral';
  }

  return { signal, score };
}

// Generate mock TA for testing or when API is unavailable
function generateMockTA(symbol: string, interval: string): TechnicalAnalysis {
  // Generate somewhat realistic mock data based on symbol hash
  const hash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const rsi = 30 + (hash % 40); // RSI between 30-70
  const macdHist = ((hash % 200) - 100) / 100; // MACD histogram between -1 and 1

  const { signal, score } = calculateTASignal(
    rsi,
    { valueMACDHist: macdHist },
    { valueAdvice: rsi < 50 ? 'long' : 'short' }
  );

  return {
    coinId: symbol.toLowerCase(),
    symbol: symbol,
    interval: interval,
    rsi: rsi,
    macd: {
      macd: macdHist * 100,
      signal: macdHist * 80,
      histogram: macdHist,
    },
    bbands: {
      upper: 100 + (hash % 10),
      middle: 100,
      lower: 100 - (hash % 10),
    },
    sma20: 100 + (hash % 5),
    sma50: 100,
    sma200: 100 - (hash % 5),
    overallSignal: signal,
    score: score,
  };
}

// Batch TA for multiple symbols (respects rate limits)
export async function getBatchTechnicalAnalysis(
  symbols: string[],
  interval: string = '1h'
): Promise<Map<string, TechnicalAnalysis>> {
  const results = new Map<string, TechnicalAnalysis>();
  
  // Process with delay to respect rate limits
  for (const symbol of symbols) {
    const ta = await getTechnicalAnalysis(symbol, interval);
    if (ta) {
      results.set(symbol.toUpperCase(), ta);
    }
    // Wait 15 seconds between requests (free tier limit)
    if (process.env.TAAPI_API_KEY) {
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  return results;
}
