// Database Query Functions
import { getDb, getSql } from './client';
import {
  rankingSnapshots,
  coinRankings,
  apiCache,
  type NewRankingSnapshot,
  type NewCoinRankingRow,
  type CoinRankingRow,
} from './schema';
import { desc, eq, and, lt, sql as drizzleSql } from 'drizzle-orm';
import { CoinRanking, FearGreedIndex } from '@/lib/types';

// ============================================
// RANKING SNAPSHOTS
// ============================================

export async function createSnapshot(
  rankings: CoinRanking[],
  fearGreed: FearGreedIndex
): Promise<number> {
  // Insert snapshot
  const [snapshot] = await getDb().insert(rankingSnapshots).values({
    fearGreedValue: fearGreed.value,
    fearGreedClassification: fearGreed.classification,
    totalCoins: rankings.length,
  }).returning({ id: rankingSnapshots.id });

  // Insert all coin rankings for this snapshot
  const coinRankingRows: NewCoinRankingRow[] = rankings.map((r) => ({
    snapshotId: snapshot.id,
    coinId: r.coin.id,
    symbol: r.coin.symbol,
    name: r.coin.name,
    rank: r.rank,
    overallScore: r.scores.overall.toString(),
    sentimentScore: r.scores.sentiment?.toString(),
    technicalScore: r.scores.technical?.toString(),
    whaleScore: r.scores.whale?.toString(),
    aiScore: r.scores.ai?.toString(),
    pricePerformanceScore: r.scores.pricePerformance?.toString(),
    currentPrice: r.coin.current_price?.toString(),
    marketCap: r.coin.market_cap,
    priceChange24h: r.coin.price_change_percentage_24h?.toString(),
    priceChange7d: r.coin.price_change_percentage_7d?.toString(),
    coinData: r.coin,
    signals: r.signals,
  }));

  await getDb().insert(coinRankings).values(coinRankingRows);

  return snapshot.id;
}

export async function getLatestSnapshot(): Promise<{
  snapshot: typeof rankingSnapshots.$inferSelect | null;
  rankings: CoinRankingRow[];
}> {
  const [latestSnapshot] = await getDb()
    .select()
    .from(rankingSnapshots)
    .orderBy(desc(rankingSnapshots.snapshotTime))
    .limit(1);

  if (!latestSnapshot) {
    return { snapshot: null, rankings: [] };
  }

  const rankings = await getDb()
    .select()
    .from(coinRankings)
    .where(eq(coinRankings.snapshotId, latestSnapshot.id))
    .orderBy(coinRankings.rank);

  return { snapshot: latestSnapshot, rankings };
}

export interface RankingsWithTimestamp {
  rankings: CoinRanking[];
  snapshotTime: Date | null;
}

export async function getLatestRankingsWithTimestamp(): Promise<RankingsWithTimestamp> {
  // Get the actual snapshot time from DB
  const snapshots = await getDb()
    .select({ snapshotTime: rankingSnapshots.snapshotTime })
    .from(rankingSnapshots)
    .orderBy(desc(rankingSnapshots.snapshotTime))
    .limit(1);

  const rankings = await getLatestRankingsWithChanges();
  return {
    rankings,
    snapshotTime: snapshots[0]?.snapshotTime ?? null,
  };
}

export async function getLatestRankingsWithChanges(): Promise<CoinRanking[]> {
  // Get current and previous snapshots
  const snapshots = await getDb()
    .select()
    .from(rankingSnapshots)
    .orderBy(desc(rankingSnapshots.snapshotTime))
    .limit(2);

  if (snapshots.length === 0) {
    return [];
  }

  const currentSnapshot = snapshots[0];
  const previousSnapshot = snapshots[1];

  // Get current rankings
  const currentRankings = await getDb()
    .select()
    .from(coinRankings)
    .where(eq(coinRankings.snapshotId, currentSnapshot.id))
    .orderBy(coinRankings.rank);

  // Get previous rankings for rank change calculation
  let previousRankMap = new Map<string, number>();
  if (previousSnapshot) {
    const previousRankings = await getDb()
      .select({ coinId: coinRankings.coinId, rank: coinRankings.rank })
      .from(coinRankings)
      .where(eq(coinRankings.snapshotId, previousSnapshot.id));

    previousRankMap = new Map(previousRankings.map(r => [r.coinId, r.rank]));
  }

  // Convert to CoinRanking format with rank changes
  return currentRankings.map((row): CoinRanking => {
    const previousRank = previousRankMap.get(row.coinId);
    const rankChange = previousRank ? previousRank - row.rank : undefined;

    return {
      coin: row.coinData as CoinRanking['coin'],
      rank: row.rank,
      previousRank,
      rankChange,
      scores: {
        overall: parseFloat(row.overallScore),
        sentiment: row.sentimentScore ? parseFloat(row.sentimentScore) : undefined,
        technical: row.technicalScore ? parseFloat(row.technicalScore) : undefined,
        whale: row.whaleScore ? parseFloat(row.whaleScore) : undefined,
        ai: row.aiScore ? parseFloat(row.aiScore) : undefined,
        pricePerformance: row.pricePerformanceScore ? parseFloat(row.pricePerformanceScore) : undefined,
      },
      signals: row.signals as CoinRanking['signals'],
      updatedAt: row.createdAt?.toISOString() || new Date().toISOString(),
    };
  });
}

export async function getCoinHistory(
  coinId: string,
  limit: number = 7
): Promise<{
  rank: number;
  score: number;
  timestamp: Date;
}[]> {
  const history = await getDb()
    .select({
      rank: coinRankings.rank,
      score: coinRankings.overallScore,
      timestamp: rankingSnapshots.snapshotTime,
    })
    .from(coinRankings)
    .innerJoin(rankingSnapshots, eq(coinRankings.snapshotId, rankingSnapshots.id))
    .where(eq(coinRankings.coinId, coinId))
    .orderBy(desc(rankingSnapshots.snapshotTime))
    .limit(limit);

  return history.map(h => ({
    rank: h.rank,
    score: parseFloat(h.score),
    timestamp: h.timestamp,
  }));
}

// ============================================
// API CACHE (PostgreSQL-based fallback)
// ============================================

export async function getCachedData<T>(key: string): Promise<T | null> {
  const [cached] = await getDb()
    .select()
    .from(apiCache)
    .where(
      and(
        eq(apiCache.cacheKey, key),
        drizzleSql`${apiCache.expiresAt} > NOW()`
      )
    )
    .limit(1);

  if (!cached) {
    return null;
  }

  return cached.data as T;
}

export async function setCachedData<T>(
  key: string,
  data: T,
  source: string,
  ttlSeconds: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await getDb()
    .insert(apiCache)
    .values({
      cacheKey: key,
      data: data as object,
      source,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: apiCache.cacheKey,
      set: {
        data: data as object,
        source,
        expiresAt,
      },
    });
}

export async function deleteCachedData(key: string): Promise<void> {
  await getDb().delete(apiCache).where(eq(apiCache.cacheKey, key));
}

// ============================================
// CLEANUP
// ============================================

export async function cleanupOldSnapshots(retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await getDb()
    .delete(rankingSnapshots)
    .where(lt(rankingSnapshots.snapshotTime, cutoffDate))
    .returning({ id: rankingSnapshots.id });

  return result.length;
}

export async function cleanupExpiredCache(): Promise<number> {
  const result = await getDb()
    .delete(apiCache)
    .where(lt(apiCache.expiresAt, new Date()))
    .returning({ id: apiCache.id });

  return result.length;
}

// ============================================
// MATERIALIZED VIEW REFRESH
// ============================================

export async function refreshRankChangesView(): Promise<void> {
  // Using raw SQL for materialized view operations
  await getSql()`REFRESH MATERIALIZED VIEW CONCURRENTLY coin_rank_changes`;
}

// Check if database is connected
export async function checkConnection(): Promise<boolean> {
  try {
    await getSql()`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
