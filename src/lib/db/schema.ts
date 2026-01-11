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

// ============================================
// WHALE TRACKING TABLES
// ============================================

// Whale transaction events from Alchemy webhooks
export const whaleEvents = pgTable('whale_events', {
  id: serial('id').primaryKey(),

  // Transaction identification
  transactionHash: text('transaction_hash').notNull(),
  blockNumber: integer('block_number').notNull(),
  blockTimestamp: timestamp('block_timestamp', { withTimezone: true }).notNull(),

  // Token details
  tokenAddress: text('token_address').notNull(), // Contract address
  tokenSymbol: text('token_symbol'),              // ETH, USDC, etc.
  coinGeckoId: text('coingecko_id'),             // Mapped coin ID

  // Transfer details
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address').notNull(),
  valueRaw: text('value_raw').notNull(),         // Raw value (wei/smallest unit)
  valueToken: decimal('value_token', { precision: 30, scale: 10 }), // Human-readable
  valueUsd: decimal('value_usd', { precision: 20, scale: 2 }),      // USD value at time

  // Classification
  transferType: text('transfer_type').notNull(), // 'wallet_to_wallet', 'exchange_inflow', 'exchange_outflow', 'exchange_to_exchange'
  fromLabel: text('from_label'),                 // 'exchange:binance', 'whale:0x...', etc.
  toLabel: text('to_label'),

  // Metadata
  chain: text('chain').notNull().default('ethereum'),
  webhookId: text('webhook_id'),
  rawPayload: jsonb('raw_payload'),

  // Timestamps
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Prevent duplicate transactions
  uniqueIndex('idx_whale_events_tx_unique').on(table.transactionHash, table.tokenAddress),
  // Query by coin for ranking computation
  index('idx_whale_events_coin_time').on(table.coinGeckoId, table.blockTimestamp),
  // Query by time for cleanup
  index('idx_whale_events_timestamp').on(table.blockTimestamp),
  // Query by transfer type for metrics
  index('idx_whale_events_type').on(table.transferType, table.blockTimestamp),
]);

// Token to CoinGecko ID mapping (for lookup)
export const tokenMappings = pgTable('token_mappings', {
  id: serial('id').primaryKey(),
  contractAddress: text('contract_address').notNull().unique(),
  chain: text('chain').notNull().default('ethereum'),
  symbol: text('symbol').notNull(),
  coinGeckoId: text('coingecko_id').notNull(),
  decimals: integer('decimals').notNull().default(18),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_token_mappings_address').on(table.contractAddress),
]);

// Known exchange/whale addresses for classification
export const knownAddresses = pgTable('known_addresses', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  label: text('label').notNull(),         // 'exchange:binance', 'exchange:coinbase', 'whale', 'contract'
  name: text('name'),                      // Human-readable name
  chain: text('chain').notNull().default('ethereum'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_known_addresses_address').on(table.address),
]);

// TypeScript types inferred from schema
export type RankingSnapshot = typeof rankingSnapshots.$inferSelect;
export type NewRankingSnapshot = typeof rankingSnapshots.$inferInsert;
export type CoinRankingRow = typeof coinRankings.$inferSelect;
export type NewCoinRankingRow = typeof coinRankings.$inferInsert;
export type ApiCacheRow = typeof apiCache.$inferSelect;
export type NewApiCacheRow = typeof apiCache.$inferInsert;

// Whale tracking types
export type WhaleEvent = typeof whaleEvents.$inferSelect;
export type NewWhaleEvent = typeof whaleEvents.$inferInsert;
export type TokenMapping = typeof tokenMappings.$inferSelect;
export type NewTokenMapping = typeof tokenMappings.$inferInsert;
export type KnownAddress = typeof knownAddresses.$inferSelect;
export type NewKnownAddress = typeof knownAddresses.$inferInsert;
