/**
 * Opportunity Score calculation
 * Combines activity with liquidity factors and risk adjustments
 */

import { type ActivityScore } from './activity-score';
import { type PercentileLookup, percentileRank } from './normalizers';

/**
 * Breakdown of opportunity score components
 */
export interface OpportunityScore {
  /** Final composite score 0-100 */
  total: number;
  /** Activity score component (from ActivityScore.total) */
  activityScore: number;
  /** Liquidity percentile 0-100 */
  liquidityScore: number;
  /** Risk-adjusted flag (true if multiplier < 1.0) */
  riskAdjusted: boolean;
}

// Liquidity thresholds for risk multiplier
const LIQUIDITY_VERY_LOW = 10_000; // < $10k
const LIQUIDITY_LOW = 50_000; // < $50k
const LIQUIDITY_MEDIUM = 100_000; // < $100k

// Risk multipliers for low liquidity tokens
const RISK_MULTIPLIER_VERY_LOW = 0.5;
const RISK_MULTIPLIER_LOW = 0.75;
const RISK_MULTIPLIER_MEDIUM = 0.9;
const RISK_MULTIPLIER_NORMAL = 1.0;

// Volume/liquidity ratio for healthy trading (neither illiquid nor wash trading)
const HEALTHY_RATIO_MIN = 0.5;
const HEALTHY_RATIO_MAX = 2.0;
const HEALTHY_RATIO_BONUS = 15;

// Component weights
const WEIGHT_ACTIVITY = 0.60;
const WEIGHT_LIQUIDITY = 0.25;
// Remaining 15% comes from healthy ratio bonus

/**
 * Determine risk multiplier based on liquidity amount.
 * Low liquidity tokens get penalized as they pose higher risk.
 *
 * @param liquidity USD liquidity amount
 * @returns Risk multiplier 0.5-1.0
 */
function getRiskMultiplier(liquidity: number): number {
  if (liquidity < LIQUIDITY_VERY_LOW) {
    return RISK_MULTIPLIER_VERY_LOW;
  }
  if (liquidity < LIQUIDITY_LOW) {
    return RISK_MULTIPLIER_LOW;
  }
  if (liquidity < LIQUIDITY_MEDIUM) {
    return RISK_MULTIPLIER_MEDIUM;
  }
  return RISK_MULTIPLIER_NORMAL;
}

/**
 * Check if volume/liquidity ratio is in healthy range.
 * Healthy ratio indicates real trading activity, not wash trading or illiquid.
 *
 * @param volume24h 24h trading volume
 * @param liquidity Current liquidity
 * @returns true if ratio is between 0.5 and 2.0
 */
function hasHealthyTradingRatio(volume24h: number, liquidity: number): boolean {
  if (liquidity <= 0) {
    return false;
  }
  const ratio = volume24h / liquidity;
  return ratio >= HEALTHY_RATIO_MIN && ratio <= HEALTHY_RATIO_MAX;
}

/**
 * Calculate opportunity score from activity score and liquidity factors.
 * Applies risk adjustment for low liquidity and bonus for healthy trading ratios.
 *
 * @param activityScore Pre-calculated activity score
 * @param liquidity Token liquidity in USD
 * @param volume24h 24h trading volume in USD
 * @param percentiles Pre-computed percentile lookup tables
 * @returns OpportunityScore with total and component breakdowns
 */
export function calculateOpportunityScore(
  activityScore: ActivityScore,
  liquidity: number | null | undefined,
  volume24h: number | null | undefined,
  percentiles: PercentileLookup
): OpportunityScore {
  const liquidityValue = liquidity ?? 0;
  const volumeValue = volume24h ?? 0;

  // Calculate liquidity percentile
  const liquidityScore = percentileRank(liquidityValue, percentiles.liquidity);

  // Determine risk multiplier based on liquidity
  const riskMultiplier = getRiskMultiplier(liquidityValue);
  const riskAdjusted = riskMultiplier < RISK_MULTIPLIER_NORMAL;

  // Check for healthy trading ratio bonus
  const healthyBonus = hasHealthyTradingRatio(volumeValue, liquidityValue) ? HEALTHY_RATIO_BONUS : 0;

  // Calculate base score from weighted components
  const baseScore =
    activityScore.total * WEIGHT_ACTIVITY +
    liquidityScore * WEIGHT_LIQUIDITY +
    healthyBonus;

  // Apply risk multiplier and cap at 100
  const total = Math.round(Math.max(0, Math.min(100, baseScore * riskMultiplier)));

  return {
    total,
    activityScore: activityScore.total,
    liquidityScore,
    riskAdjusted,
  };
}
