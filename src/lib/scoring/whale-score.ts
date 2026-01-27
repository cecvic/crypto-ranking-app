// Whale Score Calculation
// Extracted from cron job for better testability and reuse

/**
 * Calculate whale score from aggregated metrics
 * Score 0-100: 50 is neutral, >50 is bullish (accumulation), <50 is bearish (distribution)
 *
 * Scoring factors:
 * - Net flow direction: max +/-25 points based on buy/sell volume difference
 * - Transaction count: max +15 points for high activity, -5 for no activity
 * - Accumulation ratio: max +/-10 points based on buy/sell ratio
 *
 * @param metrics - Aggregated whale trade metrics
 * @returns Whale score between 0-100
 */
export function calculateWhaleScore(metrics: {
  buyVolume24h: number;
  sellVolume24h: number;
  buyCount24h: number;
  sellCount24h: number;
  netFlow24h: number;
}): number {
  let score = 50; // Start neutral

  // Factor 1: Net flow direction (max +/-25 points)
  // Positive net flow = more buys = accumulation = bullish
  const netFlow = metrics.netFlow24h;
  if (netFlow !== 0) {
    const flowImpact = Math.min(25, Math.abs(netFlow) / 10_000_000); // $10M = max impact
    score += netFlow > 0 ? flowImpact : -flowImpact;
  }

  // Factor 2: Transaction volume (max +/-15 points)
  const totalCount = metrics.buyCount24h + metrics.sellCount24h;
  if (totalCount > 50) score += 15;
  else if (totalCount > 20) score += 10;
  else if (totalCount > 5) score += 5;
  else if (totalCount === 0) score -= 5;

  // Factor 3: Accumulation ratio (max +/-10 points)
  const totalVolume = metrics.buyVolume24h + metrics.sellVolume24h;
  if (totalVolume > 0) {
    const buyRatio = metrics.buyVolume24h / totalVolume;
    if (buyRatio > 0.7) score += 10;      // Strong accumulation
    else if (buyRatio > 0.55) score += 5;
    else if (buyRatio < 0.3) score -= 10; // Strong distribution
    else if (buyRatio < 0.45) score -= 5;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}
