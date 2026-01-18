/**
 * AI-related type definitions
 * Consolidated types for chat, charts, and DeFi
 */

// ============================================
// OHLC CHART TYPES
// ============================================

/**
 * OHLC candle data in Lightweight Charts format
 * time is Unix timestamp in SECONDS (not milliseconds)
 */
export interface OHLCCandle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Chart annotation types for support/resistance and swing points
 */
export interface ChartAnnotation {
  type: 'swing-high' | 'swing-low' | 'support' | 'resistance';
  time?: number; // Unix timestamp in seconds (for markers)
  price: number;
  label?: string;
}

/**
 * Response from OHLC fetch with metadata
 */
export interface OHLCResponse {
  candles: OHLCCandle[];
  granularity: '30m' | '4h' | '4d'; // Auto-selected by CoinGecko based on days
  tokenId: string;
  cached_at: string;
}

/**
 * Cached OHLC data structure
 */
export interface CachedOHLC extends OHLCResponse {
  days: number; // Original days parameter for cache key
}

/**
 * Swing analysis data from AI analysis
 * Inspired by Draconic.ai's swing analysis panels
 */
export interface SwingAnalysis {
  velocity: {
    value: number; // Rate of price change (e.g., +2.5% per day)
    signal: 'accelerating' | 'decelerating' | 'stable';
    context: string; // AI explanation
  };
  acceleration: {
    value: number; // Rate of velocity change
    signal: 'increasing' | 'decreasing' | 'neutral';
    context: string;
  };
  magnitude: {
    value: number; // Total move size (e.g., 15% from swing low)
    signal: 'strong' | 'moderate' | 'weak';
    context: string;
  };
}

// ============================================
// AI ANALYSIS TYPES
// ============================================

/**
 * Analysis row for structured AI responses
 */
export interface AnalysisRow {
  category: 'Momentum' | 'Structure' | 'Flow' | 'Synthesis';
  metric: string;
  signal: 'bullish' | 'neutral' | 'bearish';
  context: string;
}

// ============================================
// DEFI PROTOCOL TYPES
// ============================================

/**
 * DeFi protocol data from DefiLlama API
 */
export interface DefiProtocol {
  id: string;
  name: string;
  slug: string;
  tvl: number;
  chainTvls: Record<string, number>;
  chains: string[];
  category: string;
  logo?: string;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
}

/**
 * Cached protocols list response
 */
export interface CachedProtocols {
  protocols: DefiProtocol[];
  cached_at: string;
}

/**
 * Cached individual protocol response
 */
export interface CachedProtocol {
  protocol: DefiProtocol;
  cached_at: string;
}
