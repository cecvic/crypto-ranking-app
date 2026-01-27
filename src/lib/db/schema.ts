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
  boolean,
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

// ============================================
// ALERT SUBSCRIPTION TABLES
// ============================================

// User alert subscriptions for confluence alerts
export const alertSubscriptions = pgTable('alert_subscriptions', {
  id: serial('id').primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  email: text('email').notNull(),

  // Alert preferences
  enableBullish: boolean('enable_bullish').notNull().default(true),
  enableBearish: boolean('enable_bearish').notNull().default(true),
  minConfluence: integer('min_confluence').notNull().default(4), // 4 or 5

  // Rate limiting
  maxAlertsPerDay: integer('max_alerts_per_day').notNull().default(20),
  alertsSentToday: integer('alerts_sent_today').notNull().default(0),
  lastAlertResetAt: timestamp('last_alert_reset_at', { withTimezone: true }).defaultNow(),

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('idx_alert_subs_user').on(table.clerkUserId),
  index('idx_alert_subs_active').on(table.isActive),
]);

// Alert history for deduplication and tracking
export const alertHistory = pgTable('alert_history', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').references(() => alertSubscriptions.id, { onDelete: 'cascade' }).notNull(),
  coinId: text('coin_id').notNull(),
  direction: text('direction').notNull(), // 'bullish' | 'bearish'
  confluenceLevel: integer('confluence_level').notNull(), // 3, 4, or 5
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_alert_history_sub_coin').on(table.subscriptionId, table.coinId, table.sentAt),
  index('idx_alert_history_sent').on(table.sentAt),
]);

// Relations for alert tables
export const alertSubscriptionsRelations = relations(alertSubscriptions, ({ many }) => ({
  alertHistory: many(alertHistory),
}));

export const alertHistoryRelations = relations(alertHistory, ({ one }) => ({
  subscription: one(alertSubscriptions, {
    fields: [alertHistory.subscriptionId],
    references: [alertSubscriptions.id],
  }),
}));

// ============================================
// OPPORTUNITY RADAR TABLES
// ============================================

export const opportunityEvents = pgTable('opportunity_events', {
  id: serial('id').primaryKey(),

  tokenAddress: text('token_address').notNull(),
  tokenSymbol: text('token_symbol'),
  chain: text('chain').notNull().default('solana'),
  pairAddress: text('pair_address'),
  pairCreatedAt: timestamp('pair_created_at', { withTimezone: true }),

  liquidity: decimal('liquidity', { precision: 20, scale: 2 }),
  volume5m: decimal('volume_5m', { precision: 20, scale: 2 }),
  volume1h: decimal('volume_1h', { precision: 20, scale: 2 }),
  volumeAcceleration: decimal('volume_acceleration', { precision: 10, scale: 4 }),
  priceChange1h: decimal('price_change_1h', { precision: 10, scale: 4 }),

  whaleConfirmed: boolean('whale_confirmed').default(false),
  compositeScore: decimal('composite_score', { precision: 5, scale: 2 }).notNull(),
  rawData: jsonb('raw_data'),

  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex('idx_opportunity_token_unique').on(table.tokenAddress, table.chain),
  index('idx_opportunity_chain_detected').on(table.chain, table.detectedAt),
  index('idx_opportunity_score').on(table.compositeScore),
  index('idx_opportunity_expires').on(table.expiresAt),
]);

// ============================================
// BIRDEYE MULTI-CHAIN TOKEN REGISTRY
// ============================================

// Multi-chain token data from Birdeye API
export const birdeyeTokens = pgTable('birdeye_tokens', {
  id: serial('id').primaryKey(),
  address: text('address').notNull(),
  chain: text('chain').notNull(),
  symbol: text('symbol').notNull(),
  name: text('name').notNull(),
  decimals: integer('decimals'),
  logoUri: text('logo_uri'),

  // Denormalized price data for fast reads
  price: decimal('price', { precision: 20, scale: 8 }),
  priceChange24h: decimal('price_change_24h', { precision: 10, scale: 4 }),
  volume24h: decimal('volume_24h', { precision: 20, scale: 2 }),
  liquidity: decimal('liquidity', { precision: 20, scale: 2 }),
  marketCap: bigint('market_cap', { mode: 'number' }),

  // Activity metrics (from Birdeye Token Overview)
  trade24h: integer('trade_24h'),
  uniqueWallet24h: integer('unique_wallet_24h'),
  buy24h: integer('buy_24h'),
  sell24h: integer('sell_24h'),

  // Computed scores
  activityScore: decimal('activity_score', { precision: 5, scale: 2 }),
  opportunityScore: decimal('opportunity_score', { precision: 5, scale: 2 }),

  lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('idx_birdeye_tokens_chain_address').on(table.chain, table.address),
  index('idx_birdeye_tokens_chain_volume').on(table.chain, table.volume24h),
  index('idx_birdeye_tokens_chain_marketcap').on(table.chain, table.marketCap),
  index('idx_birdeye_tokens_activity_score').on(table.activityScore),
  index('idx_birdeye_tokens_opportunity_score').on(table.opportunityScore),
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

// Alert subscription types
export type AlertSubscription = typeof alertSubscriptions.$inferSelect;
export type NewAlertSubscription = typeof alertSubscriptions.$inferInsert;
export type AlertHistoryRow = typeof alertHistory.$inferSelect;
export type NewAlertHistoryRow = typeof alertHistory.$inferInsert;

// Opportunity radar types
export type OpportunityEvent = typeof opportunityEvents.$inferSelect;
export type NewOpportunityEvent = typeof opportunityEvents.$inferInsert;

// Birdeye token registry types
export type BirdeyeTokenRow = typeof birdeyeTokens.$inferSelect;
export type NewBirdeyeTokenRow = typeof birdeyeTokens.$inferInsert;

// ============================================
// BIRDEYE WHALE METRICS (DEX TRADES)
// ============================================

// Aggregated whale trade metrics from Birdeye API
export const whaleMetricsBirdeye = pgTable('whale_metrics_birdeye', {
  id: serial('id').primaryKey(),
  chain: text('chain').notNull(),
  tokenAddress: text('token_address').notNull(),

  // 24h aggregated metrics (USD values)
  buyVolume24h: decimal('buy_volume_24h', { precision: 20, scale: 2 }).default('0'),
  sellVolume24h: decimal('sell_volume_24h', { precision: 20, scale: 2 }).default('0'),
  buyCount24h: integer('buy_count_24h').default(0),
  sellCount24h: integer('sell_count_24h').default(0),
  netFlow24h: decimal('net_flow_24h', { precision: 20, scale: 2 }).default('0'),
  largestTrade24h: decimal('largest_trade_24h', { precision: 20, scale: 2 }),

  // Computed whale score (0-100)
  whaleScore: integer('whale_score').default(50),

  // Metadata
  lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('idx_whale_metrics_chain_address').on(table.chain, table.tokenAddress),
  index('idx_whale_metrics_chain_updated').on(table.chain, table.lastUpdatedAt),
]);

// Type exports for whale metrics
export type WhaleMetricsBirdeyeRow = typeof whaleMetricsBirdeye.$inferSelect;
export type NewWhaleMetricsBirdeyeRow = typeof whaleMetricsBirdeye.$inferInsert;
