// Core types for the crypto ranking system

export interface CoinBase {
  id: string;
  symbol: string;
  name: string;
  image: string;
}

export interface CoinPrice extends CoinBase {
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  sparkline_in_7d?: {
    price: number[];
  };
  last_updated: string;
}

export interface SentimentData {
  coinId: string;
  socialScore: number;        // 0-100 normalized
  socialVolume: number;       // Raw social mentions
  sentimentPositive: number;  // Percentage
  sentimentNegative: number;  // Percentage
  galaxyScore?: number;       // LunarCrush specific
  altRank?: number;           // LunarCrush specific
  source: 'lunarcrush' | 'cryptopanic' | 'alternative' | 'local';
}

export interface TechnicalAnalysis {
  coinId: string;
  symbol: string;
  interval: string;
  rsi: number;                // 0-100
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bbands: {
    upper: number;
    middle: number;
    lower: number;
  };
  sma20: number;
  sma50: number;
  sma200: number;
  supertrend?: {
    value: number;
    direction: 'up' | 'down';
  };
  overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  score: number;              // 0-100 normalized TA score
}

export interface WhaleActivity {
  coinId: string;
  largeTransactions24h: number;
  exchangeInflow24h: number;
  exchangeOutflow24h: number;
  netFlow24h: number;         // Positive = accumulation, Negative = distribution
  whaleScore: number;         // 0-100 normalized
  topHoldersChange?: number;  // Percentage change in top holder concentration
  source: 'defillama' | 'whale-alert' | 'santiment' | 'alchemy';
}

export interface AIPrediction {
  coinId: string;
  prediction24h: {
    price: number;
    changePercent: number;
    confidence: number;
  };
  prediction7d: {
    price: number;
    changePercent: number;
    confidence: number;
  };
  prediction30d?: {
    price: number;
    changePercent: number;
    confidence: number;
  };
  aiScore: number;            // 0-100 normalized bullish score
  source: 'coincodex' | 'tokenmetrics' | 'internal';
}

export interface FearGreedIndex {
  value: number;              // 0-100
  classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  timestamp: string;
  previousValue?: number;
  previousClassification?: string;
}

export interface RankingWeights {
  sentiment: number;          // Default: 0.20
  technicalAnalysis: number;  // Default: 0.25
  whaleActivity: number;      // Default: 0.20
  aiPrediction: number;       // Default: 0.20
  pricePerformance: number;   // Default: 0.15
}

export interface CoinRanking {
  coin: CoinPrice;
  scores: {
    sentiment?: number;
    technical?: number;
    whale?: number;
    ai?: number;
    pricePerformance?: number;
    overall: number;
  };
  signals: {
    sentiment: SentimentData | null;
    technical: TechnicalAnalysis | null;
    whale: WhaleActivity | null;
    ai: AIPrediction | null;
  };
  rank: number;
  previousRank?: number;
  rankChange?: number;
  updatedAt: string;
}

export interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  cached?: boolean;
  timestamp: string;
}

// API Configuration types
export interface APIConfig {
  coingecko: {
    baseUrl: string;
    apiKey?: string;
  };
  lunarcrush: {
    baseUrl: string;
    apiKey: string;
  };
  taapi: {
    baseUrl: string;
    apiKey: string;
  };
  defillama: {
    baseUrl: string;
  };
  alternativeMe: {
    baseUrl: string;
  };
  coincodex: {
    baseUrl: string;
  };
}

// Re-export confluence types
export * from './confluence';
