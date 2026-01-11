// Database Query Functions for Whale Tracking
import { getDb } from './client';
import {
  whaleEvents,
  tokenMappings,
  knownAddresses,
  type NewWhaleEvent,
  type TokenMapping,
  type KnownAddress,
} from './schema';
import { eq, and, gte, sql, inArray, desc } from 'drizzle-orm';
import { type WhaleEvent } from './schema';

// ============================================
// INSERT OPERATIONS
// ============================================

/**
 * Insert a new whale event, ignoring duplicates
 */
export async function insertWhaleEvent(event: NewWhaleEvent): Promise<void> {
  await getDb()
    .insert(whaleEvents)
    .values(event)
    .onConflictDoNothing(); // Ignore duplicates based on tx hash + token address
}

// ============================================
// LOOKUP OPERATIONS
// ============================================

/**
 * Get token mapping by contract address
 */
export async function getTokenMapping(
  address: string
): Promise<TokenMapping | null> {
  const [mapping] = await getDb()
    .select()
    .from(tokenMappings)
    .where(eq(tokenMappings.contractAddress, address.toLowerCase()))
    .limit(1);
  return mapping || null;
}

/**
 * Get known address label
 */
export async function getKnownAddress(
  address: string
): Promise<KnownAddress | null> {
  const [known] = await getDb()
    .select()
    .from(knownAddresses)
    .where(eq(knownAddresses.address, address.toLowerCase()))
    .limit(1);
  return known || null;
}

// ============================================
// METRICS QUERIES
// ============================================

export interface WhaleMetrics {
  totalTransactions: number;
  exchangeInflow: number;
  exchangeOutflow: number;
  walletToWallet: number;
  netFlow: number;
  avgTransactionSize: number;
}

/**
 * Get whale metrics for a specific coin (24h rolling window)
 */
export async function getWhaleMetrics24h(
  coinGeckoId: string
): Promise<WhaleMetrics> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const metrics = await getDb()
    .select({
      transferType: whaleEvents.transferType,
      count: sql<number>`count(*)::int`,
      totalValue: sql<number>`COALESCE(sum(${whaleEvents.valueToken}::numeric), 0)::float`,
    })
    .from(whaleEvents)
    .where(
      and(
        eq(whaleEvents.coinGeckoId, coinGeckoId),
        gte(whaleEvents.blockTimestamp, cutoff)
      )
    )
    .groupBy(whaleEvents.transferType);

  const byType = new Map(metrics.map((m) => [m.transferType, m]));

  const exchangeInflow = byType.get('exchange_inflow')?.totalValue || 0;
  const exchangeOutflow = byType.get('exchange_outflow')?.totalValue || 0;
  const walletToWallet = byType.get('wallet_to_wallet')?.totalValue || 0;

  const totalTransactions = metrics.reduce((sum, m) => sum + m.count, 0);
  const totalValue = metrics.reduce((sum, m) => sum + (m.totalValue || 0), 0);

  return {
    totalTransactions,
    exchangeInflow,
    exchangeOutflow,
    walletToWallet,
    netFlow: exchangeOutflow - exchangeInflow, // Positive = accumulation
    avgTransactionSize:
      totalTransactions > 0 ? totalValue / totalTransactions : 0,
  };
}

/**
 * Get batch whale metrics for multiple coins (more efficient for ranking computation)
 */
export async function getBatchWhaleMetrics(
  coinGeckoIds: string[]
): Promise<Map<string, WhaleMetrics>> {
  const results = new Map<string, WhaleMetrics>();

  if (coinGeckoIds.length === 0) {
    return results;
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const metrics = await getDb()
    .select({
      coinGeckoId: whaleEvents.coinGeckoId,
      transferType: whaleEvents.transferType,
      count: sql<number>`count(*)::int`,
      totalValue: sql<number>`COALESCE(sum(${whaleEvents.valueToken}::numeric), 0)::float`,
    })
    .from(whaleEvents)
    .where(
      and(
        inArray(whaleEvents.coinGeckoId, coinGeckoIds),
        gte(whaleEvents.blockTimestamp, cutoff)
      )
    )
    .groupBy(whaleEvents.coinGeckoId, whaleEvents.transferType);

  // Group by coinGeckoId
  const byCoin = new Map<string, typeof metrics>();
  for (const m of metrics) {
    if (!m.coinGeckoId) continue;
    if (!byCoin.has(m.coinGeckoId)) {
      byCoin.set(m.coinGeckoId, []);
    }
    byCoin.get(m.coinGeckoId)!.push(m);
  }

  // Process each coin
  for (const coinId of coinGeckoIds) {
    const coinMetrics = byCoin.get(coinId) || [];
    const byType = new Map(coinMetrics.map((m) => [m.transferType, m]));

    const exchangeInflow = byType.get('exchange_inflow')?.totalValue || 0;
    const exchangeOutflow = byType.get('exchange_outflow')?.totalValue || 0;
    const walletToWallet = byType.get('wallet_to_wallet')?.totalValue || 0;
    const totalTransactions = coinMetrics.reduce((sum, m) => sum + m.count, 0);
    const totalValue = coinMetrics.reduce(
      (sum, m) => sum + (m.totalValue || 0),
      0
    );

    results.set(coinId, {
      totalTransactions,
      exchangeInflow,
      exchangeOutflow,
      walletToWallet,
      netFlow: exchangeOutflow - exchangeInflow,
      avgTransactionSize:
        totalTransactions > 0 ? totalValue / totalTransactions : 0,
    });
  }

  return results;
}

// ============================================
// WHALE ALERTS PAGE QUERIES
// ============================================

/**
 * Get recent whale events with optional filters
 */
export async function getRecentWhaleEvents(
  limit: number = 50,
  filters?: {
    coinGeckoId?: string;
    transferType?: string;
    minValueUsd?: number;
  }
): Promise<WhaleEvent[]> {
  const conditions = [];

  if (filters?.coinGeckoId) {
    conditions.push(eq(whaleEvents.coinGeckoId, filters.coinGeckoId));
  }
  if (filters?.transferType) {
    conditions.push(eq(whaleEvents.transferType, filters.transferType));
  }
  if (filters?.minValueUsd) {
    conditions.push(gte(whaleEvents.valueUsd, filters.minValueUsd.toString()));
  }

  const query = getDb()
    .select()
    .from(whaleEvents)
    .orderBy(desc(whaleEvents.blockTimestamp))
    .limit(limit);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

/**
 * Get top whale movements by USD value
 */
export async function getTopWhaleMovements(
  limit: number = 10,
  hours: number = 24
): Promise<WhaleEvent[]> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  return getDb()
    .select()
    .from(whaleEvents)
    .where(gte(whaleEvents.blockTimestamp, cutoff))
    .orderBy(desc(whaleEvents.valueUsd))
    .limit(limit);
}

/**
 * Aggregate metrics response interface
 */
export interface WhaleAggregateMetrics {
  totalTransactions: number;
  totalVolumeUsd: number;
  exchangeInflow: number;
  exchangeOutflow: number;
  netFlow: number;
  topTokensByVolume: Array<{
    coinGeckoId: string;
    symbol: string;
    volume: number;
    transactionCount: number;
  }>;
}

/**
 * Get aggregate metrics with token breakdown
 */
export async function getWhaleAggregateMetrics(
  hours: number = 24
): Promise<WhaleAggregateMetrics> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Get aggregate stats
  const [aggregates] = await getDb()
    .select({
      totalTransactions: sql<number>`count(*)::int`,
      totalVolumeUsd: sql<number>`COALESCE(sum(${whaleEvents.valueUsd}::numeric), 0)::float`,
      exchangeInflow: sql<number>`COALESCE(sum(CASE WHEN ${whaleEvents.transferType} = 'exchange_inflow' THEN ${whaleEvents.valueUsd}::numeric ELSE 0 END), 0)::float`,
      exchangeOutflow: sql<number>`COALESCE(sum(CASE WHEN ${whaleEvents.transferType} = 'exchange_outflow' THEN ${whaleEvents.valueUsd}::numeric ELSE 0 END), 0)::float`,
    })
    .from(whaleEvents)
    .where(gte(whaleEvents.blockTimestamp, cutoff));

  // Get top tokens by volume
  const topTokens = await getDb()
    .select({
      coinGeckoId: whaleEvents.coinGeckoId,
      symbol: whaleEvents.tokenSymbol,
      volume: sql<number>`COALESCE(sum(${whaleEvents.valueUsd}::numeric), 0)::float`,
      transactionCount: sql<number>`count(*)::int`,
    })
    .from(whaleEvents)
    .where(
      and(
        gte(whaleEvents.blockTimestamp, cutoff),
        sql`${whaleEvents.coinGeckoId} IS NOT NULL`
      )
    )
    .groupBy(whaleEvents.coinGeckoId, whaleEvents.tokenSymbol)
    .orderBy(desc(sql`sum(${whaleEvents.valueUsd}::numeric)`))
    .limit(10);

  return {
    totalTransactions: aggregates?.totalTransactions || 0,
    totalVolumeUsd: aggregates?.totalVolumeUsd || 0,
    exchangeInflow: aggregates?.exchangeInflow || 0,
    exchangeOutflow: aggregates?.exchangeOutflow || 0,
    netFlow: (aggregates?.exchangeOutflow || 0) - (aggregates?.exchangeInflow || 0),
    topTokensByVolume: topTokens.map((t) => ({
      coinGeckoId: t.coinGeckoId || '',
      symbol: t.symbol || '',
      volume: t.volume,
      transactionCount: t.transactionCount,
    })),
  };
}

// ============================================
// SEED OPERATIONS
// ============================================

/**
 * Upsert token mappings (for seed scripts)
 */
export async function upsertTokenMapping(
  mapping: Omit<typeof tokenMappings.$inferInsert, 'id' | 'updatedAt'>
): Promise<void> {
  await getDb()
    .insert(tokenMappings)
    .values({
      ...mapping,
      contractAddress: mapping.contractAddress.toLowerCase(),
    })
    .onConflictDoUpdate({
      target: tokenMappings.contractAddress,
      set: {
        symbol: mapping.symbol,
        coinGeckoId: mapping.coinGeckoId,
        decimals: mapping.decimals,
        chain: mapping.chain,
        updatedAt: new Date(),
      },
    });
}

/**
 * Upsert known addresses (for seed scripts)
 */
export async function upsertKnownAddress(
  addressData: Omit<typeof knownAddresses.$inferInsert, 'id' | 'updatedAt'>
): Promise<void> {
  await getDb()
    .insert(knownAddresses)
    .values({
      ...addressData,
      address: addressData.address.toLowerCase(),
    })
    .onConflictDoUpdate({
      target: knownAddresses.address,
      set: {
        label: addressData.label,
        name: addressData.name,
        chain: addressData.chain,
        updatedAt: new Date(),
      },
    });
}

// ============================================
// CLEANUP OPERATIONS
// ============================================

/**
 * Delete whale events older than retention period
 */
export async function cleanupOldWhaleEvents(
  retentionDays: number = 30
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await getDb()
    .delete(whaleEvents)
    .where(sql`${whaleEvents.blockTimestamp} < ${cutoff}`)
    .returning({ id: whaleEvents.id });

  return result.length;
}
