// Database Schema - Drizzle ORM for Neon PostgreSQL
import {
  pgTable,
  serial,
  text,
  integer,
  decimal,
  timestamp,
  bigint,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Core ranking snapshots - one row per computation cycle
export const rankingSnapshots = pgTable('ranking_snapshots', {
  id: serial('id').primaryKey(),
  snapshotTime: timestamp('snapshot_time', { withTimezone: true }).notNull().defaultNow(),
  fearGreedValue: integer('fear_greed_value'),
  fearGreedClassification: text('fear_greed_classification'),
  totalCoins: integer('total_coins').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_snapshots_time').on(table.snapshotTime),
]);

// Individual coin rankings per snapshot
export const coinRankings = pgTable('coin_rankings', {
  id: serial('id').primaryKey(),
  snapshotId: integer('snapshot_id').references(() => rankingSnapshots.id, { onDelete: 'cascade' }).notNull(),
  coinId: text('coin_id').notNull(),
  symbol: text('symbol').notNull(),
  name: text('name').notNull(),
  rank: integer('rank').notNull(),
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }).notNull(),
  sentimentScore: decimal('sentiment_score', { precision: 5, scale: 2 }),
  technicalScore: decimal('technical_score', { precision: 5, scale: 2 }),
  whaleScore: decimal('whale_score', { precision: 5, scale: 2 }),
  aiScore: decimal('ai_score', { precision: 5, scale: 2 }),
  pricePerformanceScore: decimal('price_performance_score', { precision: 5, scale: 2 }),
  currentPrice: decimal('current_price', { precision: 20, scale: 8 }),
  marketCap: bigint('market_cap', { mode: 'number' }),
  priceChange24h: decimal('price_change_24h', { precision: 10, scale: 4 }),
  priceChange7d: decimal('price_change_7d', { precision: 10, scale: 4 }),
  // Store full coin data and signals as JSON for flexibility
  coinData: jsonb('coin_data'),
  signals: jsonb('signals'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('idx_coin_rankings_unique').on(table.snapshotId, table.coinId),
  index('idx_coin_rankings_coin').on(table.coinId, table.snapshotId),
  index('idx_coin_rankings_snapshot').on(table.snapshotId),
]);

// API response cache for expensive calls
export const apiCache = pgTable('api_cache', {
  id: serial('id').primaryKey(),
  cacheKey: text('cache_key').notNull().unique(),
  data: jsonb('data').notNull(),
  source: text('source').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_api_cache_key').on(table.cacheKey),
  index('idx_api_cache_expires').on(table.expiresAt),
]);

// Relations
export const rankingSnapshotsRelations = relations(rankingSnapshots, ({ many }) => ({
  rankings: many(coinRankings),
}));

export const coinRankingsRelations = relations(coinRankings, ({ one }) => ({
  snapshot: one(rankingSnapshots, {
    fields: [coinRankings.snapshotId],
    references: [rankingSnapshots.id],
  }),
}));

// TypeScript types inferred from schema
export type RankingSnapshot = typeof rankingSnapshots.$inferSelect;
export type NewRankingSnapshot = typeof rankingSnapshots.$inferInsert;
export type CoinRankingRow = typeof coinRankings.$inferSelect;
export type NewCoinRankingRow = typeof coinRankings.$inferInsert;
export type ApiCacheRow = typeof apiCache.$inferSelect;
export type NewApiCacheRow = typeof apiCache.$inferInsert;
