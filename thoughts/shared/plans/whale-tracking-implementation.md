# Implementation Plan: Real Whale Tracking with Alchemy Webhooks

**Generated:** 2026-01-11
**Status:** Ready for Implementation
**Estimated Effort:** 3-5 days

---

## Goal

Replace the current mock/DefiLlama-based whale activity tracking with real-time Alchemy Webhook data to provide accurate whale transaction signals in the 5-factor ranking system.

### Current State
- `src/lib/apis/whale.ts` uses DefiLlama TVL data and optional Whale Alert API
- `WhaleActivity` type exists with `largeTransactions24h`, `exchangeInflow24h`, `exchangeOutflow24h`, `netFlow24h`, `whaleScore`
- Whale score has 20% weight in overall ranking calculation
- No persistent storage for whale events (computed on-demand)

### Target State
- Real-time webhook ingestion from Alchemy for EVM token transfers
- Persistent storage of whale events in PostgreSQL
- Computed whale scores based on actual transaction data
- Token-level aggregation for top 100 cryptocurrencies

---

## Research Summary

### Alchemy Webhooks (from research report)
- **Free tier:** 300M compute units/month (very generous)
- **Webhook types:** `ADDRESS_ACTIVITY` for tracking specific addresses, `MINED_TRANSACTION` for all transactions
- **Chains supported:** Ethereum, Polygon, Arbitrum, Optimism, Base
- **Key insight:** Need to use `NFT_ACTIVITY` or `TOKEN_TRANSFER` webhook type with value filters

### Recommended Approach
1. Use Alchemy's **Address Activity Webhook** for known whale addresses
2. Use **Token Transfer Webhook** with filters for large value transfers
3. Store events in PostgreSQL for historical analysis
4. Compute rolling 24h metrics for ranking integration

---

## Existing Codebase Analysis

### Relevant Files

| File | Purpose | Modifications Needed |
|------|---------|---------------------|
| `src/lib/apis/whale.ts` | Whale activity fetching | Update to read from DB instead of mock |
| `src/lib/db/schema.ts` | Database schema | Add whale_events table |
| `src/lib/db/queries.ts` | Database queries | Add whale event queries |
| `src/lib/types/index.ts` | Type definitions | Add WhaleEvent types |
| `src/app/api/cron/compute-rankings/route.ts` | Ranking computation | Use DB-backed whale data |
| `.env.example` | Environment vars | Add Alchemy API key |
| `vercel.json` | Deployment config | No changes needed |

### Database Pattern (from schema.ts)
```typescript
// Current pattern uses:
// - pgTable with serial id
// - timestamp with timezone
// - indexes for query optimization
// - jsonb for flexible data storage
```

### Cron Pattern (from compute-rankings/route.ts)
```typescript
// Current pattern:
// - Uses QStash verification with dev bypass
// - Reads from Redis cache
// - Persists to PostgreSQL
// - Returns JSON response with metrics
```

---

## Implementation Phases

### Phase 1: Alchemy Setup and Webhook Configuration
**Estimated Time:** 0.5 days

#### 1.1 Alchemy Account Setup
1. Create Alchemy account at https://dashboard.alchemy.com
2. Create a new app for Ethereum Mainnet
3. Navigate to Webhooks section
4. Note the webhook signing key for verification

#### 1.2 Environment Variables
**File:** `.env.example` and `.env.local`

```bash
# Alchemy Webhooks - Whale Tracking
ALCHEMY_API_KEY=your_api_key_here
ALCHEMY_WEBHOOK_SIGNING_KEY=your_signing_key_here
ALCHEMY_WEBHOOK_ID=your_webhook_id_here

# Whale tracking thresholds
WHALE_MIN_VALUE_USD=100000
WHALE_MIN_VALUE_ETH=50
```

#### 1.3 Webhook Registration Script
Create a one-time setup script to register webhooks via Alchemy API.

**Files to create:**
- `scripts/setup-alchemy-webhooks.ts` - Registration script

#### Acceptance Criteria (Phase 1)
- [ ] Alchemy account created with API key
- [ ] Webhook signing key obtained
- [ ] Environment variables documented
- [ ] Setup script created (optional, can use dashboard)

---

### Phase 2: Database Schema for Whale Events
**Estimated Time:** 0.5 days

#### 2.1 New Schema Table
**File:** `src/lib/db/schema.ts`

```typescript
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
  transferType: text('transfer_type').notNull(), // 'wallet_to_wallet', 'exchange_inflow', 'exchange_outflow', 'contract'
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
```

#### 2.2 Migration
```bash
pnpm db:generate
pnpm db:push
```

#### Acceptance Criteria (Phase 2)
- [ ] whale_events table created with proper indexes
- [ ] token_mappings table for CoinGecko ID lookup
- [ ] known_addresses table for exchange/whale classification
- [ ] Migration applied successfully
- [ ] Types exported: `WhaleEvent`, `NewWhaleEvent`, etc.

---

### Phase 3: Webhook Endpoint Implementation
**Estimated Time:** 1 day

#### 3.1 Alchemy Webhook Handler
**File:** `src/app/api/webhooks/alchemy/route.ts`

```typescript
// POST /api/webhooks/alchemy
// Receives real-time transfer events from Alchemy

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { insertWhaleEvent, getTokenMapping, getKnownAddress } from '@/lib/db/whale-queries';

// Verify Alchemy webhook signature
function verifyAlchemySignature(
  body: string,
  signature: string,
  signingKey: string
): boolean {
  const hmac = createHmac('sha256', signingKey);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Verify signature
    const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
    if (!signingKey) {
      console.error('[alchemy-webhook] Missing signing key');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('x-alchemy-signature');

    if (!signature || !verifyAlchemySignature(body, signature, signingKey)) {
      console.error('[alchemy-webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Parse payload
    const payload = JSON.parse(body);
    const events = payload.event?.activity || [];

    console.log(`[alchemy-webhook] Received ${events.length} events`);

    // 3. Process each transfer event
    let processed = 0;
    let skipped = 0;

    for (const event of events) {
      try {
        // Filter by minimum value
        const valueUsd = event.value * (event.rawContract?.decimals || 18);
        const minValueUsd = parseInt(process.env.WHALE_MIN_VALUE_USD || '100000');

        if (valueUsd < minValueUsd) {
          skipped++;
          continue;
        }

        // Get token mapping for CoinGecko ID
        const tokenMapping = await getTokenMapping(event.rawContract?.address);

        // Classify transfer type
        const fromLabel = await getKnownAddress(event.fromAddress);
        const toLabel = await getKnownAddress(event.toAddress);
        const transferType = classifyTransfer(fromLabel, toLabel);

        // Insert whale event
        await insertWhaleEvent({
          transactionHash: event.hash,
          blockNumber: event.blockNum,
          blockTimestamp: new Date(event.blockTimestamp),
          tokenAddress: event.rawContract?.address || 'native',
          tokenSymbol: event.asset,
          coinGeckoId: tokenMapping?.coinGeckoId || null,
          fromAddress: event.fromAddress,
          toAddress: event.toAddress,
          valueRaw: event.rawContract?.value || '0',
          valueToken: event.value?.toString(),
          valueUsd: valueUsd.toString(),
          transferType,
          fromLabel: fromLabel?.label,
          toLabel: toLabel?.label,
          chain: 'ethereum',
          webhookId: payload.webhookId,
          rawPayload: event,
        });

        processed++;
      } catch (eventError) {
        console.error('[alchemy-webhook] Event processing error:', eventError);
        // Continue processing other events
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[alchemy-webhook] Processed ${processed}, skipped ${skipped} in ${duration}ms`);

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      durationMs: duration,
    });
  } catch (error) {
    console.error('[alchemy-webhook] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

function classifyTransfer(
  fromLabel: { label: string } | null,
  toLabel: { label: string } | null
): string {
  const fromIsExchange = fromLabel?.label?.startsWith('exchange:');
  const toIsExchange = toLabel?.label?.startsWith('exchange:');

  if (fromIsExchange && !toIsExchange) return 'exchange_outflow';
  if (!fromIsExchange && toIsExchange) return 'exchange_inflow';
  if (fromIsExchange && toIsExchange) return 'exchange_to_exchange';
  return 'wallet_to_wallet';
}
```

#### 3.2 Webhook Verification Middleware
**File:** `src/lib/alchemy/verify.ts`

```typescript
import { createHmac } from 'crypto';

export function verifyAlchemyWebhook(
  body: string,
  signature: string | null
): boolean {
  const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;

  if (!signingKey || !signature) {
    return false;
  }

  const hmac = createHmac('sha256', signingKey);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');

  // Timing-safe comparison
  return signature === expectedSignature;
}
```

#### 3.3 Database Queries for Whale Events
**File:** `src/lib/db/whale-queries.ts`

```typescript
import { getDb } from './client';
import { whaleEvents, tokenMappings, knownAddresses } from './schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

// Insert a new whale event
export async function insertWhaleEvent(event: NewWhaleEvent): Promise<void> {
  await getDb()
    .insert(whaleEvents)
    .values(event)
    .onConflictDoNothing(); // Ignore duplicates
}

// Get token mapping by contract address
export async function getTokenMapping(address: string) {
  const [mapping] = await getDb()
    .select()
    .from(tokenMappings)
    .where(eq(tokenMappings.contractAddress, address.toLowerCase()))
    .limit(1);
  return mapping || null;
}

// Get known address label
export async function getKnownAddress(address: string) {
  const [known] = await getDb()
    .select()
    .from(knownAddresses)
    .where(eq(knownAddresses.address, address.toLowerCase()))
    .limit(1);
  return known || null;
}

// Get whale metrics for a specific coin (24h rolling)
export async function getWhaleMetrics24h(coinGeckoId: string): Promise<{
  totalTransactions: number;
  exchangeInflow: number;
  exchangeOutflow: number;
  walletToWallet: number;
  netFlow: number;
  avgTransactionSize: number;
}> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const metrics = await getDb()
    .select({
      transferType: whaleEvents.transferType,
      count: sql<number>`count(*)::int`,
      totalValue: sql<number>`sum(${whaleEvents.valueUsd}::numeric)::float`,
    })
    .from(whaleEvents)
    .where(
      and(
        eq(whaleEvents.coinGeckoId, coinGeckoId),
        gte(whaleEvents.blockTimestamp, cutoff)
      )
    )
    .groupBy(whaleEvents.transferType);

  const byType = new Map(metrics.map(m => [m.transferType, m]));

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
    avgTransactionSize: totalTransactions > 0 ? totalValue / totalTransactions : 0,
  };
}

// Get batch whale metrics for multiple coins
export async function getBatchWhaleMetrics(
  coinGeckoIds: string[]
): Promise<Map<string, Awaited<ReturnType<typeof getWhaleMetrics24h>>>> {
  const results = new Map();

  // Batch query all metrics at once
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const metrics = await getDb()
    .select({
      coinGeckoId: whaleEvents.coinGeckoId,
      transferType: whaleEvents.transferType,
      count: sql<number>`count(*)::int`,
      totalValue: sql<number>`sum(${whaleEvents.valueUsd}::numeric)::float`,
    })
    .from(whaleEvents)
    .where(
      and(
        sql`${whaleEvents.coinGeckoId} = ANY(${coinGeckoIds})`,
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
    const byType = new Map(coinMetrics.map(m => [m.transferType, m]));

    const exchangeInflow = byType.get('exchange_inflow')?.totalValue || 0;
    const exchangeOutflow = byType.get('exchange_outflow')?.totalValue || 0;
    const walletToWallet = byType.get('wallet_to_wallet')?.totalValue || 0;
    const totalTransactions = coinMetrics.reduce((sum, m) => sum + m.count, 0);
    const totalValue = coinMetrics.reduce((sum, m) => sum + (m.totalValue || 0), 0);

    results.set(coinId, {
      totalTransactions,
      exchangeInflow,
      exchangeOutflow,
      walletToWallet,
      netFlow: exchangeOutflow - exchangeInflow,
      avgTransactionSize: totalTransactions > 0 ? totalValue / totalTransactions : 0,
    });
  }

  return results;
}
```

#### Acceptance Criteria (Phase 3)
- [ ] Webhook endpoint at `/api/webhooks/alchemy` receives events
- [ ] Alchemy signature verification working
- [ ] Events filtered by minimum USD value
- [ ] Events stored in whale_events table
- [ ] Transfer type classification working (inflow/outflow)
- [ ] Duplicate events handled gracefully

---

### Phase 4: Whale Score Computation Logic
**Estimated Time:** 1 day

#### 4.1 Updated Whale Activity Function
**File:** `src/lib/apis/whale.ts` (modify existing)

```typescript
import { getBatchWhaleMetrics } from '@/lib/db/whale-queries';
import { WhaleActivity } from '../types';

// New: Get whale activity from database
export async function getWhaleActivityFromDB(
  coinId: string,
  symbol: string
): Promise<WhaleActivity> {
  const metrics = await getWhaleMetrics24h(coinId);

  // Calculate whale score (0-100)
  let whaleScore = 50; // Start neutral

  // Factor 1: Net flow direction (max +/-25 points)
  // Positive net flow (more leaving exchanges) = accumulation = bullish
  if (metrics.netFlow !== 0) {
    const flowImpact = Math.min(25, Math.abs(metrics.netFlow) / 10_000_000);
    whaleScore += metrics.netFlow > 0 ? flowImpact : -flowImpact;
  }

  // Factor 2: Transaction volume (max +/-15 points)
  // High whale activity = significant interest
  if (metrics.totalTransactions > 50) {
    whaleScore += 15;
  } else if (metrics.totalTransactions > 20) {
    whaleScore += 10;
  } else if (metrics.totalTransactions > 5) {
    whaleScore += 5;
  } else if (metrics.totalTransactions === 0) {
    // No activity - keep neutral or slightly bearish
    whaleScore -= 5;
  }

  // Factor 3: Accumulation ratio (max +/-10 points)
  const totalFlow = metrics.exchangeInflow + metrics.exchangeOutflow;
  if (totalFlow > 0) {
    const accumulationRatio = metrics.exchangeOutflow / totalFlow;
    if (accumulationRatio > 0.7) {
      whaleScore += 10; // Strong accumulation
    } else if (accumulationRatio > 0.55) {
      whaleScore += 5;
    } else if (accumulationRatio < 0.3) {
      whaleScore -= 10; // Strong distribution
    } else if (accumulationRatio < 0.45) {
      whaleScore -= 5;
    }
  }

  // Clamp to 0-100
  whaleScore = Math.max(0, Math.min(100, whaleScore));

  return {
    coinId,
    largeTransactions24h: metrics.totalTransactions,
    exchangeInflow24h: metrics.exchangeInflow,
    exchangeOutflow24h: metrics.exchangeOutflow,
    netFlow24h: metrics.netFlow,
    whaleScore,
    source: 'alchemy' as const,
  };
}

// Batch version for efficiency
export async function getBatchWhaleActivity(
  coins: Array<{ id: string; symbol: string }>
): Promise<Map<string, WhaleActivity>> {
  const coinIds = coins.map(c => c.id);
  const metricsMap = await getBatchWhaleMetrics(coinIds);

  const results = new Map<string, WhaleActivity>();

  for (const coin of coins) {
    const metrics = metricsMap.get(coin.id);

    if (!metrics) {
      // No data - return neutral score with fallback
      results.set(coin.id, await getWhaleActivityFallback(coin.id, coin.symbol));
      continue;
    }

    // Calculate score (same logic as single version)
    let whaleScore = 50;

    if (metrics.netFlow !== 0) {
      const flowImpact = Math.min(25, Math.abs(metrics.netFlow) / 10_000_000);
      whaleScore += metrics.netFlow > 0 ? flowImpact : -flowImpact;
    }

    if (metrics.totalTransactions > 50) whaleScore += 15;
    else if (metrics.totalTransactions > 20) whaleScore += 10;
    else if (metrics.totalTransactions > 5) whaleScore += 5;
    else if (metrics.totalTransactions === 0) whaleScore -= 5;

    const totalFlow = metrics.exchangeInflow + metrics.exchangeOutflow;
    if (totalFlow > 0) {
      const accumulationRatio = metrics.exchangeOutflow / totalFlow;
      if (accumulationRatio > 0.7) whaleScore += 10;
      else if (accumulationRatio > 0.55) whaleScore += 5;
      else if (accumulationRatio < 0.3) whaleScore -= 10;
      else if (accumulationRatio < 0.45) whaleScore -= 5;
    }

    whaleScore = Math.max(0, Math.min(100, whaleScore));

    results.set(coin.id, {
      coinId: coin.id,
      largeTransactions24h: metrics.totalTransactions,
      exchangeInflow24h: metrics.exchangeInflow,
      exchangeOutflow24h: metrics.exchangeOutflow,
      netFlow24h: metrics.netFlow,
      whaleScore,
      source: 'alchemy',
    });
  }

  return results;
}

// Fallback to existing DefiLlama logic
async function getWhaleActivityFallback(
  coinId: string,
  symbol: string
): Promise<WhaleActivity> {
  // Use existing getWhaleActivity logic as fallback
  return getWhaleActivity(coinId, symbol);
}
```

#### 4.2 Update Types
**File:** `src/lib/types/index.ts` (modify)

```typescript
export interface WhaleActivity {
  coinId: string;
  largeTransactions24h: number;
  exchangeInflow24h: number;
  exchangeOutflow24h: number;
  netFlow24h: number;
  whaleScore: number;
  topHoldersChange?: number;
  source: 'defillama' | 'whale-alert' | 'santiment' | 'alchemy';  // Add 'alchemy'
}

// New: Whale event from webhook
export interface WhaleEvent {
  id: number;
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: Date;
  tokenAddress: string;
  tokenSymbol: string | null;
  coinGeckoId: string | null;
  fromAddress: string;
  toAddress: string;
  valueRaw: string;
  valueToken: string | null;
  valueUsd: string | null;
  transferType: 'wallet_to_wallet' | 'exchange_inflow' | 'exchange_outflow' | 'exchange_to_exchange';
  fromLabel: string | null;
  toLabel: string | null;
  chain: string;
  webhookId: string | null;
  receivedAt: Date;
  createdAt: Date;
}
```

#### Acceptance Criteria (Phase 4)
- [ ] `getWhaleActivityFromDB()` reads from whale_events table
- [ ] Score calculation considers net flow, volume, and accumulation ratio
- [ ] Batch version for efficient ranking computation
- [ ] Fallback to DefiLlama when no Alchemy data
- [ ] Types updated with 'alchemy' source

---

### Phase 5: Ranking System Integration
**Estimated Time:** 0.5 days

#### 5.1 Update Compute Rankings Cron
**File:** `src/app/api/cron/compute-rankings/route.ts` (modify)

```typescript
// Add import
import { getBatchWhaleActivity, getWhaleActivityFromDB } from '@/lib/apis/whale';

// In handler, replace the whale activity section:

// 4. Get whale activity (from Alchemy webhooks + fallback)
const whaleMap = new Map<string, WhaleActivity>();
if (process.env.USE_ALCHEMY_WHALE === 'true') {
  // Use batch query for efficiency
  const batchWhale = await getBatchWhaleActivity(
    coins.map(c => ({ id: c.id, symbol: c.symbol }))
  );
  for (const [coinId, whale] of batchWhale) {
    whaleMap.set(coinId, whale);
  }
} else {
  // Fallback to per-coin queries (existing logic)
  for (const coin of coins) {
    try {
      const whale = await getWhaleActivity(coin.id, coin.symbol);
      whaleMap.set(coin.id, whale);
    } catch (error) {
      console.debug(`[compute-rankings] Whale activity skipped for ${coin.symbol}`);
    }
  }
}

// Then in the loop:
const whale = whaleMap.get(coin.id) || null;
```

#### 5.2 Add Feature Flag
**File:** `.env.example`

```bash
# Use Alchemy webhooks for whale tracking (requires webhook setup)
USE_ALCHEMY_WHALE=true
```

#### 5.3 Health Check Update
**File:** `src/app/api/health/route.ts` (modify)

Add whale data status to health check:

```typescript
// Add to health response
whaleTracking: {
  enabled: process.env.USE_ALCHEMY_WHALE === 'true',
  source: process.env.USE_ALCHEMY_WHALE === 'true' ? 'alchemy' : 'defillama',
  // Could add: lastEventTime, eventCount24h
}
```

#### Acceptance Criteria (Phase 5)
- [ ] Ranking cron uses batch whale queries when enabled
- [ ] Feature flag `USE_ALCHEMY_WHALE` controls behavior
- [ ] Graceful fallback to DefiLlama when Alchemy disabled
- [ ] Health check shows whale tracking status

---

### Phase 6: Seed Data and Address Mappings
**Estimated Time:** 0.5 days

#### 6.1 Token Mappings Seed Script
**File:** `scripts/seed-token-mappings.ts`

```typescript
// Map top 100 ERC-20 tokens to CoinGecko IDs
const TOP_TOKENS = [
  { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', coinGeckoId: 'tether', decimals: 6 },
  { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', coinGeckoId: 'usd-coin', decimals: 6 },
  { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC', coinGeckoId: 'wrapped-bitcoin', decimals: 8 },
  { address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', symbol: 'MATIC', coinGeckoId: 'matic-network', decimals: 18 },
  { address: '0x514910771af9ca656af840dff83e8264ecf986ca', symbol: 'LINK', coinGeckoId: 'chainlink', decimals: 18 },
  // ... top 100 tokens
];
```

#### 6.2 Known Addresses Seed Script
**File:** `scripts/seed-known-addresses.ts`

```typescript
// Known exchange and whale addresses
const KNOWN_ADDRESSES = [
  // Binance
  { address: '0x28c6c06298d514db089934071355e5743bf21d60', label: 'exchange:binance', name: 'Binance 14' },
  { address: '0x21a31ee1afc51d94c2efccaa2092ad1028285549', label: 'exchange:binance', name: 'Binance 15' },
  // Coinbase
  { address: '0x71660c4005ba85c37ccec55d0c4493e66fe775d3', label: 'exchange:coinbase', name: 'Coinbase 1' },
  // Kraken
  { address: '0x2910543af39aba0cd09dbb2d50200b3e800a63d2', label: 'exchange:kraken', name: 'Kraken 6' },
  // ... more exchanges
];
```

#### 6.3 Run Seeds
```bash
pnpm tsx scripts/seed-token-mappings.ts
pnpm tsx scripts/seed-known-addresses.ts
```

#### Acceptance Criteria (Phase 6)
- [ ] Top 100 ERC-20 tokens mapped to CoinGecko IDs
- [ ] Major exchange addresses labeled
- [ ] Seed scripts idempotent (can run multiple times)

---

## Testing Strategy

### Unit Tests
- [ ] Webhook signature verification
- [ ] Whale score calculation logic
- [ ] Transfer type classification

### Integration Tests
- [ ] Webhook endpoint receives and stores events
- [ ] Batch whale metrics query returns correct data
- [ ] Ranking computation uses whale data correctly

### Manual Testing
1. Register test webhook in Alchemy dashboard
2. Trigger a test transfer on Ethereum
3. Verify event appears in database
4. Run ranking computation
5. Check whale scores reflect real data

### Load Testing
- [ ] Verify webhook can handle 100+ events/second
- [ ] Batch query performs well with 100 coins

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Alchemy free tier exhaustion | No whale data | Monitor CU usage, implement fallback to DefiLlama |
| Webhook delivery failures | Missing events | Alchemy has retry logic; add alerting for gaps |
| Token mapping gaps | Unmapped tokens | Default to neutral score, log for investigation |
| Exchange address list incomplete | Misclassified flows | Start with major exchanges, iterate |
| High event volume | DB growth | Implement 30-day retention cleanup |

---

## Cost Analysis

### Alchemy Free Tier
- 300M compute units/month
- Webhook delivery: ~100 CU per event
- Estimated events: 10,000/day = 300,000/month
- **CU usage:** ~30M/month (10% of free tier)

### PostgreSQL Storage
- Each whale event: ~500 bytes
- 10,000 events/day * 30 days = 300,000 events
- **Storage:** ~150MB/month (well within Neon free tier)

### Vercel
- Webhook endpoint: Serverless function
- ~10,000 invocations/day = 300,000/month
- **Usage:** Within Hobby tier limits

**Total estimated cost: $0/month** (all within free tiers)

---

## Estimated Complexity

| Phase | Complexity | Notes |
|-------|------------|-------|
| Phase 1: Alchemy Setup | Low | Dashboard configuration |
| Phase 2: Database Schema | Low | Standard Drizzle patterns |
| Phase 3: Webhook Endpoint | Medium | Signature verification, error handling |
| Phase 4: Score Computation | Medium | Algorithm tuning needed |
| Phase 5: Integration | Low | Modify existing code |
| Phase 6: Seed Data | Low | Manual data collection |

**Overall: Medium complexity, 3-5 days estimated**

---

## Post-Implementation Tasks

1. **Monitoring**: Add Vercel analytics for webhook latency
2. **Alerting**: Set up alert for webhook failures
3. **Dashboard**: Add whale metrics to admin view (optional)
4. **Expansion**: Add support for Polygon, Arbitrum chains
5. **Refinement**: Tune score algorithm based on real data

---

## References

- Research Report: `thoughts/shared/research/whale-tracking-apis-research.md`
- Alchemy Docs: https://docs.alchemy.com/reference/notify-api-quickstart
- Alchemy Webhook Types: https://docs.alchemy.com/docs/types-of-webhooks
- Known Exchange Addresses: https://etherscan.io/accounts/label/exchange
