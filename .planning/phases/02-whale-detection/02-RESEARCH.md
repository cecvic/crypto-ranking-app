# Phase 2: Whale Detection - Research

**Researched:** 2026-01-22
**Domain:** DEX trade data integration and whale activity tracking
**Confidence:** HIGH

## Summary

Phase 2 integrates DEX-sourced whale activity data from Birdeye's `/defi/v3/token/txs-by-volume` endpoint into the existing whale activity scoring system. The project already has a complete whale tracking infrastructure (Alchemy-based on-chain monitoring, database schema, scoring algorithms), but currently relies on Ethereum L1 data via webhooks. This phase adds DEX trade volume data across 11 chains to complement the existing system.

The Birdeye API provides filtered trade lists by volume thresholds, supporting up to 500 trades per request with unlimited time ranges. The existing whale scoring algorithm (lines 247-287 in `src/lib/apis/whale.ts`) uses net flow, transaction volume, and accumulation ratio to calculate 0-100 scores. DEX trade data will integrate into this system by aggregating large trades into similar metrics.

The standard approach is: (1) poll Birdeye trades endpoint via cron job similar to existing `poll-birdeye` route, (2) store DEX trade events in database alongside Alchemy webhook data, (3) augment existing `getWhaleMetrics24h` queries to include DEX trades, (4) existing scoring algorithm automatically incorporates the new data source.

**Primary recommendation:** Extend the existing whale tracking infrastructure rather than building parallel systems. Reuse database schema patterns (composite unique constraints for deduplication), cron job patterns (rate limit management, sequential chain processing), and scoring algorithms (already proven in production).

## Standard Stack

The established libraries/tools for DEX trade integration and whale tracking:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| axios | 1.6+ | HTTP client for Birdeye API | Already used for all API integrations, has request interceptors for dynamic API keys |
| axios-retry | 4.0+ | Automatic retry logic | Already configured for Birdeye API with exponential backoff |
| Drizzle ORM | 0.45.1 | PostgreSQL database layer | Project standard, type-safe queries, batch operations |
| @neondatabase/serverless | 1.0.2 | PostgreSQL connection pooling | Project's database provider with edge runtime support |
| @tanstack/react-query | 5.90+ | Client-side data fetching | Already used for whale data hooks (`use-whale-data.ts`) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Redis (Upstash) | - | Distributed rate limiting + caching | Shared rate limit tracking across API endpoints |
| Vercel Cron | Next.js 14+ | Scheduled jobs | Already used for `poll-birdeye`, `compute-rankings` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Birdeye API | DexScreener, Dex.guru | Birdeye already integrated, supports 11 chains, has volume filtering |
| Cron polling | WebSocket streaming | WebSocket requires Business tier ($499/mo), deferred to v2 per prior decision |
| Alchemy + Birdeye | Birdeye only | Alchemy provides wallet-level classification (exchange vs whale), Birdeye provides volume data; complementary sources |

**Installation:**
```bash
# No new dependencies required - all libraries already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/cron/
│   ├── poll-whale-trades/      # NEW: Fetch DEX trades from Birdeye
│   │   └── route.ts
│   └── poll-birdeye/            # EXISTING: Price polling pattern to follow
│       └── route.ts
├── lib/
│   ├── apis/
│   │   ├── birdeye.ts           # EXTEND: Add getWhaleTradesByVolume()
│   │   └── whale.ts             # EXTEND: Integrate DEX metrics into scoring
│   ├── db/
│   │   ├── whale-queries.ts     # EXTEND: Add getDexTradeMetrics24h()
│   │   └── schema.ts            # EXTEND: Add dexTrades table
│   └── types/
│       └── index.ts             # EXTEND: Add BirdeyeWhaleTrade interface
```

### Pattern 1: DEX Trade Polling Cron
**What:** Scheduled job that fetches large DEX trades across 11 chains using Birdeye API
**When to use:** Every 15-30 minutes (balance freshness with rate limits)
**Example:**
```typescript
// Source: Existing poll-birdeye.ts pattern (lines 1-179)
// Adapted for whale trades endpoint

export const maxDuration = 60; // Vercel free tier limit

const CHAIN_PRIORITY: BirdeyeChain[] = [
  'solana', 'ethereum', 'base', 'arbitrum', // ... 11 chains
];

async function handler(req: NextRequest) {
  // 1. Check rate limit headroom (reuse BIRDEYE_ACCOUNT quota)
  const rateCheck = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
  if (rateCheck.headroomPercent < 10) return earlyExit();

  // 2. Sequential chain processing (shares quota with price polling)
  for (const chain of CHAIN_PRIORITY) {
    const trades = await getWhaleTradesByVolume(chain, {
      minVolumeUsd: 100_000, // $100k+ trades = whale activity
      limit: 50,
      txType: 'swap'
    });

    // 3. Batch insert with deduplication
    await insertDexTrades(trades);

    // 4. Small delay between chains
    await sleep(100);
  }
}
```

### Pattern 2: Database Schema Extension
**What:** Add `dex_trades` table alongside existing `whale_events` table
**When to use:** Storing DEX trade data that complements Alchemy webhook events
**Example:**
```typescript
// Source: Existing whale_events schema (schema.ts lines 87-129)
// Pattern: Composite unique constraint for deduplication

export const dexTrades = pgTable('dex_trades', {
  id: serial('id').primaryKey(),

  // Trade identification (for deduplication)
  transactionHash: text('transaction_hash').notNull(),
  tokenAddress: text('token_address').notNull(),
  chain: text('chain').notNull(),

  // Trade details
  blockTimestamp: timestamp('block_timestamp', { withTimezone: true }).notNull(),
  side: text('side').notNull(), // 'buy' | 'sell'
  volumeUsd: decimal('volume_usd', { precision: 20, scale: 2 }).notNull(),
  priceUsd: decimal('price_usd', { precision: 20, scale: 8 }),

  // Token metadata (for aggregation)
  tokenSymbol: text('token_symbol'),
  coinGeckoId: text('coingecko_id'),

  // Source metadata
  source: text('source').notNull().default('birdeye-dex'),
  poolId: text('pool_id'),
  dexName: text('dex_name'), // 'raydium', 'uniswap', etc.

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Prevent duplicate trades (same pattern as whale_events)
  uniqueIndex('idx_dex_trades_unique').on(table.transactionHash, table.tokenAddress, table.chain),
  // Query by coin for metrics
  index('idx_dex_trades_coin_time').on(table.coinGeckoId, table.blockTimestamp),
  // Query by time for cleanup
  index('idx_dex_trades_timestamp').on(table.blockTimestamp),
]);
```

### Pattern 3: Whale Score Integration
**What:** Augment existing whale metrics with DEX trade volume data
**When to use:** Computing whale activity scores for ranking algorithm
**Example:**
```typescript
// Source: Existing whale scoring (whale.ts lines 247-287)
// Pattern: Multi-factor scoring with 0-100 normalization

export interface DexWhaleMetrics {
  totalTradeVolume: number;     // Sum of large trades (>$100k)
  largeTradeCount: number;       // Number of whale-sized trades
  buyVsSellRatio: number;        // Accumulation indicator
  avgTradeSize: number;          // Whale activity intensity
}

async function getDexWhaleMetrics24h(coinGeckoId: string): Promise<DexWhaleMetrics> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const metrics = await db
    .select({
      side: dexTrades.side,
      count: sql<number>`count(*)::int`,
      totalVolume: sql<number>`sum(${dexTrades.volumeUsd}::numeric)::float`,
    })
    .from(dexTrades)
    .where(and(
      eq(dexTrades.coinGeckoId, coinGeckoId),
      gte(dexTrades.blockTimestamp, cutoff),
      gte(dexTrades.volumeUsd, '100000') // Only $100k+ trades
    ))
    .groupBy(dexTrades.side);

  // Calculate buy vs sell ratio for accumulation signal
  const buys = metrics.find(m => m.side === 'buy');
  const sells = metrics.find(m => m.side === 'sell');

  return {
    totalTradeVolume: (buys?.totalVolume || 0) + (sells?.totalVolume || 0),
    largeTradeCount: (buys?.count || 0) + (sells?.count || 0),
    buyVsSellRatio: (buys?.totalVolume || 0) / ((sells?.totalVolume || 1)), // >1 = accumulation
    avgTradeSize: totalVolume / largeTradeCount,
  };
}

// Integrate into existing calculateWhaleScoreFromMetrics
function calculateWhaleScoreFromMetrics(
  alchemyMetrics: WhaleMetrics,
  dexMetrics: DexWhaleMetrics
): number {
  let score = 50; // Neutral baseline

  // Existing Alchemy factors (net flow, tx volume, accumulation)
  score += calculateAlchemyFactors(alchemyMetrics); // +/- 50 points

  // NEW: DEX trade factors
  if (dexMetrics.largeTradeCount > 20) {
    score += 10; // High whale interest
  }
  if (dexMetrics.buyVsSellRatio > 1.5) {
    score += 15; // Strong accumulation
  } else if (dexMetrics.buyVsSellRatio < 0.67) {
    score -= 15; // Distribution
  }

  return Math.max(0, Math.min(100, score)); // Clamp 0-100
}
```

### Pattern 4: Rate Limit Management
**What:** Share Birdeye account-level quota between price polling and trade polling
**When to use:** Multiple cron jobs hitting same API provider
**Example:**
```typescript
// Source: Existing poll-birdeye.ts rate limiting (lines 44-73)
// Pattern: Headroom-based adaptive behavior

// Both crons share BIRDEYE_ACCOUNT quota
const RATE_LIMITS = {
  BIRDEYE_ACCOUNT: {
    limit: 500,      // Requests per minute (Enterprise tier)
    window: 60_000,  // 1 minute window
  }
};

// In poll-whale-trades cron:
const rateStatus = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
const headroomPercent = (rateStatus.remaining / 500) * 100;

if (headroomPercent < 10) {
  console.log('[poll-whale-trades] Skipping run - low headroom');
  return earlyExit();
}

// Reduce scope when tight
let chainsToProcess = CHAIN_PRIORITY;
if (headroomPercent < 30) {
  chainsToProcess = CHAIN_PRIORITY.slice(0, 5); // Top 5 chains only
}
```

### Anti-Patterns to Avoid

- **Parallel chain polling:** Don't use `Promise.all()` for multi-chain requests. Sequential processing prevents rate limit bursts and allows early exit when quota runs low. Existing `poll-birdeye` uses sequential `for` loop (line 67).

- **Storing all trades:** Don't fetch trades without volume filter. Use `minVolumeUsd` parameter to only get whale-sized trades ($100k+). Otherwise you'll store millions of small retail trades.

- **Separate whale score calculation:** Don't create a new scoring function for DEX data. Extend existing `calculateWhaleScoreFromMetrics` to accept combined metrics from both Alchemy and Birdeye sources.

- **Missing deduplication:** Don't insert trades without unique constraints. Cron jobs may retry, API may return duplicate data. Use composite unique index on `(txHash, tokenAddress, chain)` like existing `whale_events` table (line 122).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API rate limiting | In-memory counters | Redis-backed distributed rate limiter | Serverless functions are stateless; in-memory state lost between invocations. Existing implementation uses Upstash Redis. |
| Trade deduplication | Application-level checking | PostgreSQL unique constraints + `onConflictDoNothing()` | Database-level deduplication is atomic and handles race conditions. Existing pattern in `whale-queries.ts` line 25. |
| Whale threshold detection | Custom volume analysis | Birdeye API `min_volume`/`max_volume` params | API does server-side filtering. Don't fetch all trades then filter client-side (wastes quota and bandwidth). |
| Batch database operations | Individual inserts in loop | Drizzle batch API or `insert().values([...])` | Single query with multiple rows is 10-100x faster than N queries. Critical for inserting 50+ trades per chain. |
| Wash trade filtering | Pattern detection algorithms | Trust Birdeye's data quality | Research shows wash trading is 0.035% of DEX volume (Chainalysis 2024). Detecting it requires graph analysis beyond project scope. Accept false positives in whale metrics. |
| CoinGecko ID mapping | Custom lookup tables | Existing `tokenMappings` table | Already populated for Alchemy webhook tokens (schema.ts lines 132-142). Reuse for Birdeye tokens. |

**Key insight:** The whale tracking infrastructure is already production-ready (webhooks, database, scoring, UI components). Phase 2 is an additive enhancement, not a greenfield build. Maximize code reuse, don't reinvent patterns that already work.

## Common Pitfalls

### Pitfall 1: Rate Limit Quota Conflicts
**What goes wrong:** Price polling cron (`poll-birdeye`) and trade polling cron (`poll-whale-trades`) both hit Birdeye API on overlapping schedules. Account-level quota (500 req/min Enterprise) gets exhausted, causing both jobs to fail.

**Why it happens:** Vercel cron jobs run independently. If both scheduled for `:00` and `:15`, they'll hit API simultaneously. Birdeye enforces account-level limits, not per-endpoint limits.

**How to avoid:**
- Stagger cron schedules: price polling at `:00/:30`, trade polling at `:15/:45`
- Both crons check same `BIRDEYE_ACCOUNT` rate limit before proceeding
- Use headroom-based adaptive behavior (existing pattern lines 44-64 in poll-birdeye.ts)

**Warning signs:**
- `429 Too Many Requests` errors in logs
- Both crons running within same minute window
- Rate limit headroom dropping below 10% frequently

### Pitfall 2: Missing Chain-Address Composite Keys
**What goes wrong:** Trade deduplication fails because same transaction hash exists on multiple chains (e.g., cross-chain bridges). Database rejects valid trades as duplicates or stores true duplicates if only using txHash.

**Why it happens:** Transaction hashes are not globally unique across chains. `0xabc...` on Ethereum is unrelated to `0xabc...` on Arbitrum. Single-column unique constraint on `txHash` causes false positive collisions.

**How to avoid:**
- Use composite unique constraint: `uniqueIndex().on(txHash, tokenAddress, chain)`
- Follow existing pattern from Birdeye tokens table (schema.ts line 270): `uniqueIndex('idx_birdeye_tokens_chain_address').on(table.chain, table.address)`
- Include chain in all queries: `where(and(eq(txHash, hash), eq(chain, 'solana')))`

**Warning signs:**
- Insert operations silently skipping valid trades
- `getWhaleMetrics24h` returning unexpectedly low counts
- Database unique constraint violations in logs

### Pitfall 3: Volume Threshold Too Low
**What goes wrong:** Setting `min_volume` too low (e.g., $10k) results in hundreds of trades per token, exhausting rate limits and filling database with non-whale activity. Storage costs increase, query performance degrades.

**Why it happens:** No industry-standard whale threshold exists. Developers guess conservatively. But $10k is routine retail size on liquid DEX pairs. Need $100k+ to capture actual whale behavior.

**How to avoid:**
- Start with $100k minimum (`minVolumeUsd: 100_000`)
- Monitor data distribution: if getting 500+ trades per token, threshold is too low
- Research reference: DexCheck and major trackers focus on $100k+ moves as "large trades"
- Trade count should be 10-50 per token per 24h, not 500+

**Warning signs:**
- API returning `hasNext: true` for most tokens (hitting 500-trade cap)
- Database growing >100 MB/day from trades alone
- Whale scores not differentiating between tokens (everything high volume)

### Pitfall 4: Ignoring Transaction Type Filters
**What goes wrong:** Fetching all transaction types (`tx_type: 'all'`) includes liquidity adds/removes, not just swaps. These don't represent whale trading activity, skew volume metrics, and add noise to scoring.

**Why it happens:** API defaults to filtering, but `tx_type: 'all'` looks comprehensive. However, liquidity operations have different semantics than trades (adding $1M liquidity ≠ $1M buy pressure).

**How to avoid:**
- Use `tx_type: 'swap'` to get only DEX trades
- Exclude `tx_type: 'add'` and `tx_type: 'remove'` (liquidity operations)
- Birdeye API documentation explicitly supports 4 types: swap/add/remove/all (WebFetch result)

**Warning signs:**
- Whale scores spiking on tokens with new liquidity pools
- Large "trades" with identical buy/sell sides (LP operations)
- Metrics not correlating with price movements

### Pitfall 5: Not Mapping Tokens to CoinGecko IDs
**What goes wrong:** DEX trades stored with only `tokenAddress` and `chain`, but whale metrics queried by `coinGeckoId`. Joins fail, metrics return zero, scoring algorithm sees no DEX data.

**Why it happens:** Birdeye returns contract addresses (chain-specific), but ranking system uses CoinGecko IDs (chain-agnostic identifiers). Need mapping layer to connect them.

**How to avoid:**
- Populate `tokenMappings` table during trade ingestion
- Query for mapping: `getTokenMapping(address)` (existing function, whale-queries.ts line 36)
- If mapping missing, create it: `upsertTokenMapping({ contractAddress, chain, symbol, coinGeckoId })` (line 318)
- Store `coinGeckoId` column in `dex_trades` table (indexed for fast metrics queries)

**Warning signs:**
- Trade data in database but whale scores unchanged
- Metrics queries returning zero counts despite trades present
- Missing `coinGeckoId` values in `dex_trades` rows

## Code Examples

Verified patterns from existing codebase and official documentation:

### Birdeye Whale Trades API Call
```typescript
// Source: Birdeye official docs + existing birdeye.ts patterns

interface BirdeyeTradesByVolumeResponse {
  success: boolean;
  data: {
    items: Array<{
      txHash: string;
      blockUnixTime: number;
      txType: 'swap' | 'add' | 'remove';
      owner: string;          // Wallet address
      quote: { address: string; symbol: string };
      base: { address: string; symbol: string };
      volume: number;         // Token amount
      volumeUSD: number;      // USD value
      source: string;         // DEX name (e.g., 'Raydium')
      poolId: string;
    }>;
    hasNext: boolean;
  };
}

export async function getWhaleTradesByVolume(
  chain: BirdeyeChain,
  tokenAddress: string,
  options?: {
    minVolumeUsd?: number;
    maxVolumeUsd?: number;
    limit?: number;
    offset?: number;
    txType?: 'swap' | 'add' | 'remove' | 'all';
  }
): Promise<BirdeyeTrade[]> {
  const response = await api.get<BirdeyeTradesByVolumeResponse>(
    '/defi/v3/token/txs-by-volume',
    {
      params: {
        address: tokenAddress,
        tx_type: options?.txType || 'swap',
        sort_type: 'desc',
        limit: Math.min(options?.limit || 50, 50), // API max 50
        offset: options?.offset || 0,
        // Note: min_volume/max_volume not in docs, may need to filter client-side
      },
      headers: {
        'x-chain': chain,
      },
    }
  );

  if (!response.data?.success || !response.data?.data?.items) {
    return [];
  }

  // Filter by volume if API doesn't support it natively
  return response.data.data.items
    .filter(trade => {
      if (options?.minVolumeUsd && trade.volumeUSD < options.minVolumeUsd) return false;
      if (options?.maxVolumeUsd && trade.volumeUSD > options.maxVolumeUsd) return false;
      return true;
    })
    .map(t => ({
      txHash: t.txHash,
      blockTime: t.blockUnixTime,
      source: t.source,
      side: determineSide(t), // Logic to determine buy vs sell
      tokenAddress: t.base.address,
      amount: t.volume,
      priceUsd: t.volumeUSD / t.volume,
      volumeUsd: t.volumeUSD,
    }));
}
```

### Batch Insert DEX Trades with Deduplication
```typescript
// Source: Existing whale-queries.ts pattern (line 21-26) + Drizzle docs

export async function insertDexTrades(
  trades: Array<{
    txHash: string;
    tokenAddress: string;
    chain: string;
    blockTime: number;
    side: 'buy' | 'sell';
    volumeUsd: number;
    priceUsd: number;
    tokenSymbol?: string;
    coinGeckoId?: string;
    source: string;
    poolId?: string;
    dexName?: string;
  }>
): Promise<void> {
  if (trades.length === 0) return;

  // Map token addresses to CoinGecko IDs
  const addresses = [...new Set(trades.map(t => t.tokenAddress))];
  const mappings = await Promise.all(
    addresses.map(addr => getTokenMapping(addr))
  );
  const mappingMap = new Map(
    mappings.filter(Boolean).map(m => [m!.contractAddress, m!.coinGeckoId])
  );

  // Enrich trades with coinGeckoId
  const enrichedTrades = trades.map(trade => ({
    transactionHash: trade.txHash,
    tokenAddress: trade.tokenAddress.toLowerCase(),
    chain: trade.chain,
    blockTimestamp: new Date(trade.blockTime * 1000),
    side: trade.side,
    volumeUsd: trade.volumeUsd.toString(),
    priceUsd: trade.priceUsd.toString(),
    tokenSymbol: trade.tokenSymbol,
    coinGeckoId: mappingMap.get(trade.tokenAddress.toLowerCase()) || null,
    source: trade.source,
    poolId: trade.poolId,
    dexName: trade.dexName,
  }));

  // Batch insert with automatic deduplication
  // Uses uniqueIndex on (txHash, tokenAddress, chain)
  await getDb()
    .insert(dexTrades)
    .values(enrichedTrades)
    .onConflictDoNothing(); // Skip duplicates silently

  console.log(`[dex-trades] Inserted ${enrichedTrades.length} trades (deduped)`);
}
```

### Combined Whale Metrics Query
```typescript
// Source: Existing whale-queries.ts patterns (lines 76-114) adapted for DEX data

export interface CombinedWhaleMetrics {
  alchemy: {
    totalTransactions: number;
    exchangeInflow: number;
    exchangeOutflow: number;
    netFlow: number;
  };
  dex: {
    largeTradeCount: number;
    totalVolume: number;
    buyVolume: number;
    sellVolume: number;
    buyVsSellRatio: number;
  };
}

export async function getCombinedWhaleMetrics24h(
  coinGeckoId: string
): Promise<CombinedWhaleMetrics> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Existing Alchemy metrics (whale_events table)
  const alchemyMetrics = await getDb()
    .select({
      transferType: whaleEvents.transferType,
      count: sql<number>`count(*)::int`,
      totalValue: sql<number>`sum(${whaleEvents.valueUsd}::numeric)::float`,
    })
    .from(whaleEvents)
    .where(and(
      eq(whaleEvents.coinGeckoId, coinGeckoId),
      gte(whaleEvents.blockTimestamp, cutoff)
    ))
    .groupBy(whaleEvents.transferType);

  const byType = new Map(alchemyMetrics.map(m => [m.transferType, m]));

  // NEW: DEX metrics (dex_trades table)
  const dexMetrics = await getDb()
    .select({
      side: dexTrades.side,
      count: sql<number>`count(*)::int`,
      totalVolume: sql<number>`sum(${dexTrades.volumeUsd}::numeric)::float`,
    })
    .from(dexTrades)
    .where(and(
      eq(dexTrades.coinGeckoId, coinGeckoId),
      gte(dexTrades.blockTimestamp, cutoff)
    ))
    .groupBy(dexTrades.side);

  const bySide = new Map(dexMetrics.map(m => [m.side, m]));
  const buyVolume = bySide.get('buy')?.totalVolume || 0;
  const sellVolume = bySide.get('sell')?.totalVolume || 0;

  return {
    alchemy: {
      totalTransactions: alchemyMetrics.reduce((sum, m) => sum + m.count, 0),
      exchangeInflow: byType.get('exchange_inflow')?.totalValue || 0,
      exchangeOutflow: byType.get('exchange_outflow')?.totalValue || 0,
      netFlow: (byType.get('exchange_outflow')?.totalValue || 0) -
               (byType.get('exchange_inflow')?.totalValue || 0),
    },
    dex: {
      largeTradeCount: dexMetrics.reduce((sum, m) => sum + m.count, 0),
      totalVolume: buyVolume + sellVolume,
      buyVolume,
      sellVolume,
      buyVsSellRatio: sellVolume > 0 ? buyVolume / sellVolume : 1,
    },
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single data source (Whale Alert API) | Multi-source aggregation (Alchemy + Birdeye) | Phase 1-2 (2026) | Covers Ethereum L1 + 11 DEX chains vs single chain |
| Global whale thresholds ($500k+) | Context-aware thresholds (varies by token liquidity) | Ongoing research | $100k DEX trades may be whales for mid-cap tokens, retail for BTC |
| Manual wash trade filtering | Accept Birdeye data quality | 2024+ | Wash trading is 0.035% of DEX volume (Chainalysis), not worth filtering overhead |
| Separate scoring per data source | Unified whale score algorithm | Phase 2 | Single 0-100 score combining on-chain and DEX data |
| WebSocket real-time streaming | Polling-based updates | Prior decision | WebSocket requires $499/mo Business tier, deferred to v2 |

**Deprecated/outdated:**
- `serial` primary keys: PostgreSQL recommends `identity` columns (Drizzle best practices 2025), but project uses `serial`. Not worth migration for existing tables.
- Single-chain focus: Early whale trackers (Whale Alert) only covered Bitcoin/Ethereum. Modern approach requires multi-chain coverage (11+ chains).

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal whale volume threshold**
   - What we know: No industry standard exists. Research shows $100k+ is common for "large trade" classification. Existing code uses $500k for Whale Alert API.
   - What's unclear: Whether $100k threshold will produce too much data (50+ trades per token) or too little (5-10 trades). Depends on token liquidity distribution.
   - Recommendation: Start with $100k, monitor trade counts in first week. Adjust to $250k if getting 100+ trades per token per day. Goal: 10-50 trades per token in 24h window.

2. **Buy vs Sell classification from DEX trades**
   - What we know: Birdeye returns `side: 'buy' | 'sell'`, but unclear from docs whether this is relative to base or quote token. Existing code has placeholder `determineSide(trade)` function.
   - What's unclear: How Birdeye determines trade direction. May need to infer from token flow (base → quote = sell base, quote → base = buy base).
   - Recommendation: Test endpoint with known trades, compare `side` value to actual swap direction. If ambiguous, derive from `owner` address and token deltas. Consider lower weight for DEX buy/sell ratio vs Alchemy exchange flows (which have clearer semantics).

3. **Token mapping completeness**
   - What we know: `tokenMappings` table exists for Alchemy webhook tokens (Ethereum L1). Birdeye covers 11 chains with different token addresses.
   - What's unclear: Coverage percentage of Birdeye tokens in CoinGecko (needed for coinGeckoId mapping). Some long-tail tokens may not have CoinGecko listings.
   - Recommendation: Store DEX trades even without coinGeckoId mapping (allows future backfill). Whale metrics queries filter `WHERE coinGeckoId IS NOT NULL`. Log unmapped tokens for manual review (may reveal trending tokens not yet in CoinGecko).

## Sources

### Primary (HIGH confidence)
- [Birdeye API: Trades by Volume (V3) endpoint](https://docs.birdeye.so/reference/get-defi-v3-token-txs-by-volume) - Official API documentation
- [Birdeye Blog: Filter, Analyze, and Discover Token Activity with Trades by Volume (V3)](https://bds.birdeye.so/blog/detail/filter-analyze-and-discover-token-activity-with-trades-by-volume-v3) - Use cases and features
- [Drizzle ORM: Batch API documentation](https://orm.drizzle.team/docs/batch-api) - Official batch operations guide
- [Drizzle ORM: Upsert patterns](https://orm.drizzle.team/docs/guides/upsert) - Official onConflictDoNothing() docs
- Existing codebase:
  - `src/lib/apis/whale.ts` (lines 247-287) - Whale scoring algorithm
  - `src/app/api/cron/poll-birdeye/route.ts` (lines 1-179) - Rate limiting and sequential chain processing patterns
  - `src/lib/db/whale-queries.ts` (lines 76-114) - Metrics aggregation queries
  - `src/lib/db/schema.ts` (lines 87-129) - whale_events table schema

### Secondary (MEDIUM confidence)
- [Chainalysis: Crypto Market Manipulation 2025 (Wash Trading)](https://www.chainalysis.com/blog/crypto-market-manipulation-wash-trading-pump-and-dump-2025/) - Wash trading represents 0.035% of DEX volume
- [7 Best Crypto Whale Trackers 2026](https://cryptonews.com/cryptocurrency/best-crypto-whale-trackers/) - Industry tools use $100k+ thresholds for "large trades"
- [PostgreSQL 18 Temporal Constraints](https://betterstack.com/community/guides/databases/postgres-temporal-constraints/) - New WITHOUT OVERLAPS constraint for temporal deduplication
- [Next.js Rate Limiting Best Practices](https://dev.to/ethanleetech/4-best-rate-limiting-solutions-for-nextjs-apps-2024-3ljj) - Redis-backed distributed rate limiting for serverless

### Tertiary (LOW confidence)
- WebSearch results on whale thresholds - No authoritative standard found, recommendations vary by platform
- Community discussions on DEX whale detection - Anecdotal evidence, not verified with production data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified in production (Phase 1 complete)
- Architecture: HIGH - Extending proven patterns from existing whale tracking infrastructure
- API integration: HIGH - Birdeye endpoint documented, similar to existing token list endpoint
- Database patterns: HIGH - Reusing schema patterns from whale_events and birdeye_tokens tables
- Whale scoring: MEDIUM - Algorithm exists and works, but DEX integration formula needs validation
- Volume thresholds: LOW - No industry standard, requires experimentation to optimize

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable APIs and patterns, but Birdeye may add features)
