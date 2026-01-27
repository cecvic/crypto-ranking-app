/**
 * Activity Score calculation for token activity ranking
 * Combines volume, trades, wallets, and momentum into a composite score
 */

import { type PercentileLookup, percentileRank, normalizeToRange } from './normalizers';

/**
 * Input metrics for activity score calculation
 */
export interface ActivityMetrics {
  volume24h?: number | null;
  trade24h?: number | null;
  uniqueWallet24h?: number | null;
  buy24h?: number | null;
  sell24h?: number | null;
  priceChange24h?: number | null;
}

/**
 * Breakdown of activity score components
 */
export interface ActivityScore {
  /** Composite score 0-100 */
  total: number;
  /** Volume percentile 0-100 */
  volumeScore: number;
  /** Trade count percentile 0-100 */
  tradeScore: number;
  /** Unique wallet percentile 0-100 */
  walletScore: number;
  /** Momentum score 0-100 (price direction + buy/sell ratio) */
  momentumScore: number;
}

// Scoring weights
const WEIGHT_VOLUME = 0.30;
const WEIGHT_TRADE = 0.25;
const WEIGHT_WALLET = 0.25;
const WEIGHT_MOMENTUM = 0.20;

/**
 * Calculate momentum score based on price change and buy/sell ratio.
 * Momentum combines direction of price movement with trading pressure.
 *
 * @param priceChange24h 24h price change percentage (e.g., 5.5 for +5.5%)
 * @param buy24h Number of buy trades
 * @param sell24h Number of sell trades
 * @returns Momentum score 0-100
 */
function calculateMomentumScore(
  priceChange24h: number | null | undefined,
  buy24h: number | null | undefined,
  sell24h: number | null | undefined
): number {
  // Price change component: normalize from -50% to +50% to 0-100
  // More extreme positive changes get higher scores
  const priceChange = priceChange24h ?? 0;
  const priceScore = normalizeToRange(priceChange, -50, 50, 0, 100);

  // Buy/sell ratio component
  // Ratio > 1 means more buying pressure, < 1 means more selling pressure
  const totalBuy = buy24h ?? 0;
  const totalSell = sell24h ?? 0;
  const totalTrades = totalBuy + totalSell;

  let buyRatioScore = 50; // Neutral if no data
  if (totalTrades > 0) {
    const buyRatio = totalBuy / totalTrades; // 0 to 1
    // Map 0-1 to 0-100, with 0.5 (equal buy/sell) being 50
    buyRatioScore = buyRatio * 100;
  }

  // Combine price change (60% weight) and buy pressure (40% weight)
  const momentumScore = priceScore * 0.6 + buyRatioScore * 0.4;

  return Math.round(Math.max(0, Math.min(100, momentumScore)));
}

/**
 * Calculate activity score from token metrics.
 * Uses percentile-based normalization for volume, trades, and wallets.
 * Momentum is calculated from price change and buy/sell ratio.
 *
 * @param metrics Token activity metrics
 * @param percentiles Pre-computed percentile lookup tables
 * @returns ActivityScore with total and component breakdowns
 */
export function calculateActivityScore(
  metrics: ActivityMetrics,
  percentiles: PercentileLookup
): ActivityScore {
  // Calculate percentile-based scores for each metric
  const volumeScore = percentileRank(metrics.volume24h ?? 0, percentiles.volume24h);
  const tradeScore = percentileRank(metrics.trade24h ?? 0, percentiles.trade24h);
  const walletScore = percentileRank(metrics.uniqueWallet24h ?? 0, percentiles.uniqueWallet24h);

  // Calculate momentum from price change and buy/sell ratio
  const momentumScore = calculateMomentumScore(
    metrics.priceChange24h,
    metrics.buy24h,
    metrics.sell24h
  );

  // Weighted sum for total score
  const total =
    volumeScore * WEIGHT_VOLUME +
    tradeScore * WEIGHT_TRADE +
    walletScore * WEIGHT_WALLET +
    momentumScore * WEIGHT_MOMENTUM;

  return {
    total: Math.round(Math.max(0, Math.min(100, total))),
    volumeScore,
    tradeScore,
    walletScore,
    momentumScore,
  };
}
