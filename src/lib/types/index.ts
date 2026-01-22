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

// ============================================
// Multi-Source Aggregation Types
// ============================================

/**
 * Data source identifier for aggregated coins
 */
export type CoinSource = 'dexpaprika' | 'dexscreener' | 'coingecko' | 'binance' | 'kucoin';

/**
 * Coin category flags
 */
export type CoinCategory = 'meme' | 'ai' | 'defi' | 'gaming' | 'layer1' | 'layer2';

/**
 * Aggregated coin from multiple data sources
 */
export interface AggregatedCoin {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  price: number;
  volume_24h: number;
  price_change_24h: number;
  market_cap?: number;
  chain?: string;
  address?: string;
  source: CoinSource;
  sources?: CoinSource[]; // All sources this coin appeared in
  categories?: CoinCategory[];
  is_meme?: boolean;
  is_ai?: boolean;
  is_defi?: boolean;
  is_gaming?: boolean;
  last_updated: string;
}

/**
 * DexPaprika token response
 */
export interface DexPaprikaToken {
  id: string;
  name: string;
  symbol: string;
  chain: string;
  address: string;
  price_usd: number;
  volume_24h_usd: number;
  price_change_24h: number;
  market_cap_usd?: number;
  liquidity_usd?: number;
  logo_url?: string;
}

/**
 * DexPaprika API response wrapper
 */
export interface DexPaprikaResponse<T> {
  tokens?: T[];
  pairs?: T[];
  data?: T[];
}

/**
 * DexScreener pair response
 */
export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    header?: string;
    openGraph?: string;
  };
  boosts?: {
    active: number;
  };
}

/**
 * DexScreener API response wrapper
 */
export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[] | null;
}

/**
 * DexScreener boosted token response
 */
export interface DexScreenerBoostedToken {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  description?: string;
  links?: Array<{
    label?: string;
    type?: string;
    url: string;
  }>;
}

/**
 * Aggregation result with metadata
 */
export interface AggregationResult {
  coins: AggregatedCoin[];
  metadata: {
    totalFetched: number;
    afterDedup: number;
    afterStablecoinFilter: number;
    breakdown: {
      dexpaprika: number;
      dexscreener: number;
      coingecko: number;
    };
    categoryBreakdown: {
      meme: number;
      ai: number;
      defi: number;
    };
    fetchDurationMs: number;
    errors: string[];
  };
}

// Re-export confluence types
export * from './confluence';

// ============================================
// Birdeye API Types
// ============================================

/**
 * All 11 Birdeye-supported chains
 */
export type BirdeyeSupportedChain =
  | 'solana'
  | 'ethereum'
  | 'arbitrum'
  | 'avalanche'
  | 'bsc'
  | 'optimism'
  | 'polygon'
  | 'base'
  | 'zksync'
  | 'sui'
  | 'aptos';

export interface BirdeyeToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  liquidity: number;
  volume24hUSD: number;
  priceChange24h: number;
  price: number;
  mc?: number;
}

export interface BirdeyeTrade {
  txHash: string;
  blockTime: number;
  source: string;
  side: 'buy' | 'sell';
  tokenAddress: string;
  amount: number;
  priceUsd: number;
  volumeUsd: number;
}

export interface BirdeyeSecurityInfo {
  isToken2022: boolean;
  freezeAuthority: string | null;
  mintAuthority: string | null;
  isProxy: boolean;
  creatorAddress: string;
  creationTime: number;
}

/**
 * Individual token price data from multi_price endpoint
 */
export interface BirdeyeTokenPrice {
  price: number;
  priceChange24h: number;
  liquidity: number;
  volume24hUSD: number;
}

/**
 * Response shape from /defi/multi_price endpoint
 * Maps token address to price data (null if not found)
 */
export interface BirdeyeMultiPriceResponse {
  success: boolean;
  data: Record<string, {
    value: number;
    updateUnixTime: number;
    updateHumanTime: string;
    priceChange24h?: number;
    liquidity?: number;
    volume24hUSD?: number;
  } | null>;
}

/**
 * Birdeye token response from /api/tokens
 */
export interface BirdeyeTokenResponse {
  address: string;
  chain: string;
  symbol: string;
  name: string;
  logoUri: string | null;
  price: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  marketCap: number | null;
  lastFetchedAt: string | null;
}

/**
 * API response wrapper for token endpoints
 */
export interface BirdeyeTokensAPIResponse {
  data: BirdeyeTokenResponse[];
  cached: boolean;
  chain: string;
  count: number;
  timestamp: string;
}
