/**
 * Normalizer utilities for percentile-based scoring
 * Uses percentile normalization for outlier robustness in token metrics
 */

import { quantileRank } from 'simple-statistics';

/**
 * Token metrics used for building percentile lookups
 */
export interface TokenWithMetrics {
  volume24h?: number | null;
  trade24h?: number | null;
  uniqueWallet24h?: number | null;
  liquidity?: number | null;
}

/**
 * Pre-sorted arrays for each metric, used for fast percentile calculation
 */
export interface PercentileLookup {
  volume24h: number[];
  trade24h: number[];
  uniqueWallet24h: number[];
  liquidity: number[];
}

/**
 * Build sorted arrays for each metric from a collection of tokens.
 * These sorted arrays enable O(log n) percentile lookups.
 *
 * @param tokens Array of tokens with metrics
 * @returns PercentileLookup with sorted arrays for each metric
 */
export function buildPercentileLookup(tokens: TokenWithMetrics[]): PercentileLookup {
  const volume24h: number[] = [];
  const trade24h: number[] = [];
  const uniqueWallet24h: number[] = [];
  const liquidity: number[] = [];

  for (const token of tokens) {
    if (token.volume24h != null && token.volume24h > 0) {
      volume24h.push(token.volume24h);
    }
    if (token.trade24h != null && token.trade24h > 0) {
      trade24h.push(token.trade24h);
    }
    if (token.uniqueWallet24h != null && token.uniqueWallet24h > 0) {
      uniqueWallet24h.push(token.uniqueWallet24h);
    }
    if (token.liquidity != null && token.liquidity > 0) {
      liquidity.push(token.liquidity);
    }
  }

  // Sort all arrays in ascending order for percentile calculation
  volume24h.sort((a, b) => a - b);
  trade24h.sort((a, b) => a - b);
  uniqueWallet24h.sort((a, b) => a - b);
  liquidity.sort((a, b) => a - b);

  return { volume24h, trade24h, uniqueWallet24h, liquidity };
}

/**
 * Calculate the percentile rank of a value within a sorted array.
 * Returns 0-100 representing the percentage of values that are <= this value.
 *
 * @param value The value to find the percentile for
 * @param sortedArray A pre-sorted array in ascending order
 * @returns Percentile rank 0-100 (0 = lowest, 100 = highest)
 */
export function percentileRank(value: number, sortedArray: number[]): number {
  // Handle edge cases
  if (sortedArray.length === 0) {
    return 0;
  }
  if (value <= 0 || value == null) {
    return 0;
  }

  // Use simple-statistics quantileRank which returns 0-1
  const rank = quantileRank(sortedArray, value);

  // Convert to 0-100 scale
  return Math.round(rank * 100);
}

/**
 * Linear normalization that maps a value from one range to another.
 * Output is clamped to the output range.
 *
 * @param value The input value to normalize
 * @param minIn Minimum of input range
 * @param maxIn Maximum of input range
 * @param minOut Minimum of output range (default 0)
 * @param maxOut Maximum of output range (default 100)
 * @returns Normalized value clamped to [minOut, maxOut]
 */
export function normalizeToRange(
  value: number,
  minIn: number,
  maxIn: number,
  minOut: number = 0,
  maxOut: number = 100
): number {
  // Handle edge case where input range is zero
  if (maxIn === minIn) {
    return (minOut + maxOut) / 2;
  }

  // Linear interpolation
  const normalized = ((value - minIn) / (maxIn - minIn)) * (maxOut - minOut) + minOut;

  // Clamp to output range
  return Math.max(minOut, Math.min(maxOut, normalized));
}
