// Database Query Functions for Birdeye Whale Metrics
// Queries for whale_metrics_birdeye table created in 02-01

import { getDb } from './client';
import { whaleMetricsBirdeye, type WhaleMetricsBirdeyeRow } from './schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Upsert whale metrics for a token (insert or update on conflict)
 */
export async function upsertWhaleMetrics(
  chain: string,
  tokenAddress: string,
  metrics: {
    buyVolume24h: number;
    sellVolume24h: number;
    buyCount24h: number;
    sellCount24h: number;
    netFlow24h: number;
    largestTrade24h: number;
    whaleScore: number;
  }
): Promise<void> {
  await getDb()
    .insert(whaleMetricsBirdeye)
    .values({
      chain,
      tokenAddress,
      buyVolume24h: metrics.buyVolume24h.toFixed(2),
      sellVolume24h: metrics.sellVolume24h.toFixed(2),
      buyCount24h: metrics.buyCount24h,
      sellCount24h: metrics.sellCount24h,
      netFlow24h: metrics.netFlow24h.toFixed(2),
      largestTrade24h: metrics.largestTrade24h.toFixed(2),
      whaleScore: metrics.whaleScore,
      lastUpdatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [whaleMetricsBirdeye.chain, whaleMetricsBirdeye.tokenAddress],
      set: {
        buyVolume24h: metrics.buyVolume24h.toFixed(2),
        sellVolume24h: metrics.sellVolume24h.toFixed(2),
        buyCount24h: metrics.buyCount24h,
        sellCount24h: metrics.sellCount24h,
        netFlow24h: metrics.netFlow24h.toFixed(2),
        largestTrade24h: metrics.largestTrade24h.toFixed(2),
        whaleScore: metrics.whaleScore,
        lastUpdatedAt: new Date(),
      },
    });
}

/**
 * Batch upsert whale metrics for multiple tokens
 */
export async function batchUpsertWhaleMetrics(
  chain: string,
  metricsMap: Map<string, {
    buyVolume24h: number;
    sellVolume24h: number;
    buyCount24h: number;
    sellCount24h: number;
    netFlow24h: number;
    largestTrade24h: number;
    whaleScore: number;
  }>
): Promise<number> {
  let updated = 0;

  for (const [tokenAddress, metrics] of metricsMap) {
    await upsertWhaleMetrics(chain, tokenAddress, metrics);
    updated++;
  }

  return updated;
}

// ============================================
// QUERY OPERATIONS
// ============================================

/**
 * Get whale metrics for a specific token
 * Returns null if table doesn't exist (migration not applied)
 */
export async function getWhaleMetrics(
  chain: string,
  tokenAddress: string
): Promise<WhaleMetricsBirdeyeRow | null> {
  try {
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
  } catch (error) {
    // Table may not exist if migration not applied
    console.warn('[whale-queries] getWhaleMetrics failed, table may not exist');
    return null;
  }
}

/**
 * Get whale metrics for a specific chain
 * Returns empty array if table doesn't exist (migration not applied)
 */
export async function getWhaleMetricsByChain(
  chain: string,
  limit: number = 100
): Promise<WhaleMetricsBirdeyeRow[]> {
  try {
    return await getDb()
      .select()
      .from(whaleMetricsBirdeye)
      .where(eq(whaleMetricsBirdeye.chain, chain))
      .orderBy(desc(whaleMetricsBirdeye.lastUpdatedAt))
      .limit(limit);
  } catch (error) {
    // Table may not exist if migration not applied
    console.warn('[whale-queries] getWhaleMetricsByChain failed, table may not exist');
    return [];
  }
}

/**
 * Get all whale metrics across all chains
 * Returns empty array if table doesn't exist (migration not applied)
 */
export async function getAllWhaleMetrics(
  limit: number = 500
): Promise<WhaleMetricsBirdeyeRow[]> {
  try {
    return await getDb()
      .select()
      .from(whaleMetricsBirdeye)
      .orderBy(desc(whaleMetricsBirdeye.lastUpdatedAt))
      .limit(limit);
  } catch (error) {
    // Table may not exist if migration not applied
    console.warn('[whale-queries] getAllWhaleMetrics failed, table may not exist');
    return [];
  }
}

/**
 * Get whale metrics for multiple tokens (batch query)
 * Returns empty map if table doesn't exist (migration not applied)
 */
export async function getWhaleMetricsForTokens(
  chain: string,
  tokenAddresses: string[]
): Promise<Map<string, WhaleMetricsBirdeyeRow>> {
  if (tokenAddresses.length === 0) {
    return new Map();
  }

  try {
    const rows = await getDb()
      .select()
      .from(whaleMetricsBirdeye)
      .where(
        and(
          eq(whaleMetricsBirdeye.chain, chain),
          inArray(whaleMetricsBirdeye.tokenAddress, tokenAddresses)
        )
      );

    return new Map(rows.map((row) => [row.tokenAddress, row]));
  } catch (error) {
    // Table may not exist if migration not applied
    console.warn('[whale-queries] getWhaleMetricsForTokens failed, table may not exist');
    return new Map();
  }
}
