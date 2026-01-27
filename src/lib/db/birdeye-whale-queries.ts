// Database Query Functions for Birdeye Whale Metrics
// Queries for whale_metrics_birdeye table created in 02-01

import { getDb } from './client';
import { whaleMetricsBirdeye, type WhaleMetricsBirdeyeRow } from './schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

// ============================================
// QUERY OPERATIONS
// ============================================

/**
 * Get whale metrics for a specific token
 */
export async function getWhaleMetrics(
  chain: string,
  tokenAddress: string
): Promise<WhaleMetricsBirdeyeRow | null> {
  const [metrics] = await getDb()
    .select()
    .from(whaleMetricsBirdeye)
    .where(
      and(
        eq(whaleMetricsBirdeye.chain, chain),
        eq(whaleMetricsBirdeye.tokenAddress, tokenAddress)
      )
    )
    .limit(1);

  return metrics || null;
}

/**
 * Get whale metrics for a specific chain
 */
export async function getWhaleMetricsByChain(
  chain: string,
  limit: number = 100
): Promise<WhaleMetricsBirdeyeRow[]> {
  return getDb()
    .select()
    .from(whaleMetricsBirdeye)
    .where(eq(whaleMetricsBirdeye.chain, chain))
    .orderBy(desc(whaleMetricsBirdeye.lastUpdatedAt))
    .limit(limit);
}

/**
 * Get all whale metrics across all chains
 */
export async function getAllWhaleMetrics(
  limit: number = 500
): Promise<WhaleMetricsBirdeyeRow[]> {
  return getDb()
    .select()
    .from(whaleMetricsBirdeye)
    .orderBy(desc(whaleMetricsBirdeye.lastUpdatedAt))
    .limit(limit);
}

/**
 * Get whale metrics for multiple tokens (batch query)
 */
export async function getWhaleMetricsForTokens(
  tokenKeys: Array<{ chain: string; address: string }>
): Promise<Map<string, WhaleMetricsBirdeyeRow>> {
  if (tokenKeys.length === 0) {
    return new Map();
  }

  // Build unique chain-address pairs
  const addresses = tokenKeys.map((k) => k.address);

  const metrics = await getDb()
    .select()
    .from(whaleMetricsBirdeye)
    .where(inArray(whaleMetricsBirdeye.tokenAddress, addresses));

  // Create a map keyed by chain-address
  const metricsMap = new Map<string, WhaleMetricsBirdeyeRow>();
  for (const m of metrics) {
    metricsMap.set(`${m.chain}-${m.tokenAddress}`, m);
  }

  return metricsMap;
}
