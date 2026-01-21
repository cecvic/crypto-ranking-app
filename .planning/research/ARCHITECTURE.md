# Architecture Research: Birdeye Multi-Chain Integration

**Domain:** Multi-chain crypto token aggregation
**Researched:** 2026-01-21
**Confidence:** HIGH (verified against existing codebase + official Birdeye docs)

## Executive Summary

This document outlines the data flow architecture for integrating Birdeye's multi-chain token data into the existing crypto-ranking system. The architecture leverages the established cron-based collection pattern, extends the existing `AggregatedCoin` type system, and reuses the proven deduplication/normalization pipeline. The key challenge is cross-chain token identity mapping, which we solve using a combination of symbol-based matching and an extended token registry.

---

## Current vs Target Data Flow

### Current Architecture (Pre-Birdeye)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT DATA FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────┐                                                   │
│   │  CRON: collect-     │                                                   │
│   │  prices (10min)     │                                                   │
│   └─────────┬───────────┘                                                   │
│             │                                                                │
│             ▼                                                                │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │              coin-aggregator.ts                              │           │
│   │  ┌─────────────┬────────────────┬─────────────────┐         │           │
│   │  │ DexPaprika  │  DexScreener   │   CoinGecko     │         │           │
│   │  │ (1000 top)  │ (boosted/meme) │ (meme/ai/defi)  │         │           │
│   │  └─────────────┴────────────────┴─────────────────┘         │           │
│   │                       │                                      │           │
│   │                       ▼                                      │           │
│   │         ┌─────────────────────────────┐                     │           │
│   │         │ Normalize to AggregatedCoin │                     │           │
│   │         └─────────────────────────────┘                     │           │
│   │                       │                                      │           │
│   │                       ▼                                      │           │
│   │         ┌─────────────────────────────┐                     │           │
│   │         │ Deduplicate (symbol-based)  │                     │           │
│   │         │ Filter stablecoins          │                     │           │
│   │         │ Filter by volume            │                     │           │
│   │         └─────────────────────────────┘                     │           │
│   └─────────────────────────────────────────────────────────────┘           │
│                       │                                                      │
│                       ▼                                                      │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │                    REDIS CACHE                               │           │
│   │  prices:list (CoinPrice[])                                  │           │
│   │  prices:all (AggregatedCoin[])                              │           │
│   │  prices:meme / prices:ai / prices:defi                      │           │
│   │  coin:{id} (individual coins)                               │           │
│   └─────────────────────────────────────────────────────────────┘           │
│                       │                                                      │
│                       ▼                                                      │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │  API: /api/rankings                                         │           │
│   │  - Reads from Redis cache                                   │           │
│   │  - Computes scores (sentiment, technical, whale, ai)        │           │
│   │  - Returns CoinRanking[]                                    │           │
│   └─────────────────────────────────────────────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Target Architecture (With Birdeye)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TARGET DATA FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────┐     ┌─────────────────────┐                       │
│   │  CRON: collect-     │     │  CRON: collect-     │                       │
│   │  prices (10min)     │     │  birdeye (5min)     │  ◄── NEW              │
│   └─────────┬───────────┘     └─────────┬───────────┘                       │
│             │                           │                                    │
│             ▼                           ▼                                    │
│   ┌────────────────────────────────────────────────────────────┐            │
│   │              EXTENDED coin-aggregator.ts                    │            │
│   │                                                             │            │
│   │  ┌──────────────────────────────────────────────────────┐  │            │
│   │  │                 EXISTING SOURCES                      │  │            │
│   │  │ ┌─────────────┬────────────────┬─────────────────┐   │  │            │
│   │  │ │ DexPaprika  │  DexScreener   │   CoinGecko     │   │  │            │
│   │  │ └─────────────┴────────────────┴─────────────────┘   │  │            │
│   │  └──────────────────────────────────────────────────────┘  │            │
│   │                                                             │            │
│   │  ┌──────────────────────────────────────────────────────┐  │            │
│   │  │                 BIRDEYE MULTI-CHAIN                   │  │  ◄── NEW  │
│   │  │ ┌────────┬─────────┬────────┬────────┬────────────┐  │  │            │
│   │  │ │ Solana │Ethereum │  Base  │Arbitrum│ ...8 more  │  │  │            │
│   │  │ │  (50)  │  (50)   │  (50)  │  (50)  │   chains   │  │  │            │
│   │  │ └────────┴─────────┴────────┴────────┴────────────┘  │  │            │
│   │  └──────────────────────────────────────────────────────┘  │            │
│   │                          │                                  │            │
│   │                          ▼                                  │            │
│   │          ┌────────────────────────────────┐                │            │
│   │          │ normalizeBirdeyeToken()        │  ◄── NEW       │            │
│   │          │ - Maps to AggregatedCoin       │                │            │
│   │          │ - Adds chain + address         │                │            │
│   │          └────────────────────────────────┘                │            │
│   │                          │                                  │            │
│   │                          ▼                                  │            │
│   │          ┌────────────────────────────────┐                │            │
│   │          │ ENHANCED DEDUPLICATION         │  ◄── MODIFIED  │            │
│   │          │ - Symbol + chain matching      │                │            │
│   │          │ - Cross-chain token registry   │                │            │
│   │          │ - Aggregate multi-chain data   │                │            │
│   │          └────────────────────────────────┘                │            │
│   └────────────────────────────────────────────────────────────┘            │
│                          │                                                   │
│                          ▼                                                   │
│   ┌────────────────────────────────────────────────────────────┐            │
│   │                    REDIS CACHE (EXTENDED)                   │            │
│   │                                                             │            │
│   │  EXISTING:                                                  │            │
│   │  prices:list / prices:all / prices:meme / coin:{id}        │            │
│   │                                                             │            │
│   │  NEW:                                                       │            │
│   │  birdeye:chain:{chain} - Raw Birdeye data per chain        │  ◄── NEW  │
│   │  birdeye:aggregated - Cross-chain aggregated tokens        │  ◄── NEW  │
│   │  token:registry:{symbol} - Cross-chain address map         │  ◄── NEW  │
│   └────────────────────────────────────────────────────────────┘            │
│                          │                                                   │
│                          ▼                                                   │
│   ┌────────────────────────────────────────────────────────────┐            │
│   │  API: /api/rankings (UNCHANGED INTERFACE)                   │            │
│   │  - Still returns CoinRanking[]                              │            │
│   │  - Data now includes multi-chain tokens                     │            │
│   └────────────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Chain Aggregation Strategy

### Birdeye Supported Chains (11 total)

Based on [Birdeye's official documentation](https://docs.birdeye.so/docs/supported-networks):

| Chain | Identifier | Priority | Notes |
|-------|------------|----------|-------|
| Solana | `solana` | HIGH | Primary DEX chain, most data |
| Ethereum | `ethereum` | HIGH | Largest DeFi ecosystem |
| Base | `base` | HIGH | Fast-growing L2 |
| Arbitrum | `arbitrum` | MEDIUM | Major L2 |
| Polygon | `polygon` | MEDIUM | High throughput |
| BSC | `bsc` | MEDIUM | Binance ecosystem |
| Optimism | `optimism` | MEDIUM | OP Stack L2 |
| Avalanche | `avalanche` | LOW | C-Chain focus |
| zkSync | `zksync` | LOW | ZK L2 |
| Sui | `sui` | LOW | Limited API support |
| Monad | `monad` | LOW | New chain |

### Collection Strategy

**Option A: Sequential Chain Polling (Recommended)**
```
For each chain in PRIORITY_ORDER:
  1. Check rate limit (100 req/min for Birdeye)
  2. Fetch top 50 tokens by volume
  3. Normalize to AggregatedCoin
  4. Cache per-chain in Redis
  5. Delay 100ms between chains

Total: ~550 tokens across 11 chains
Time: ~2-3 seconds
Rate limit usage: 11 requests
```

**Option B: Parallel Chain Polling**
```
Promise.all([
  fetchChain('solana'),
  fetchChain('ethereum'),
  fetchChain('base'),
  ...
])

Pros: Faster (~500ms)
Cons: Spike in rate limit usage
Risk: All-or-nothing failure mode
```

**Recommendation:** Use Option A (Sequential) because:
1. Rate limit of 100/min is generous but burst protection may exist
2. Partial success is better than total failure
3. Per-chain caching enables graceful degradation
4. Easier to debug and monitor

### API Endpoint Details

Based on [Birdeye Token List V3 API](https://docs.birdeye.so/reference/get-defi-v3-token-list):

```typescript
// Request
GET https://public-api.birdeye.so/defi/v3/token/list
Headers:
  x-chain: 'solana' | 'ethereum' | ... (11 options)
  X-API-KEY: string (required)
Query params:
  offset: 0-9999 (default: 0)
  limit: 1-50 (default: 50)
  sort_type: 'desc' | 'asc' (required)

// Response
{
  success: boolean,
  data: {
    items: BirdeyeToken[],
    hasNext: boolean
  }
}
```

---

## Token Identity Mapping

### The Cross-Chain Problem

The same token (e.g., USDC) has different contract addresses on different chains:
- Solana: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Ethereum: `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
- Base: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`

We need to identify these as the same token for aggregation while preserving chain-specific data.

### Token Identity Strategy

**Three-Layer Approach:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN IDENTITY LAYERS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: CANONICAL ID (Primary Key)                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ canonical_id = coingecko_id || symbol_lowercase            │ │
│  │                                                            │ │
│  │ Examples:                                                  │ │
│  │ - "usd-coin" (CoinGecko ID for USDC)                      │ │
│  │ - "bitcoin" (CoinGecko ID for BTC)                        │ │
│  │ - "pepe" (symbol fallback if no CoinGecko mapping)        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Layer 2: CHAIN-ADDRESS INDEX (Lookup)                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Map: {chain}:{address} -> canonical_id                    │ │
│  │                                                            │ │
│  │ Redis: token:address:solana:EPjFWdd5... -> "usd-coin"     │ │
│  │ Redis: token:address:ethereum:0xa0b86... -> "usd-coin"    │ │
│  │ Redis: token:address:base:0x833589... -> "usd-coin"       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Layer 3: MULTI-CHAIN DATA (Aggregated)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ For each canonical_id, store chain-specific data:         │ │
│  │                                                            │ │
│  │ {                                                          │ │
│  │   canonical_id: "usd-coin",                               │ │
│  │   symbol: "USDC",                                         │ │
│  │   chains: {                                               │ │
│  │     solana: { address, price, volume, liquidity },        │ │
│  │     ethereum: { address, price, volume, liquidity },      │ │
│  │     base: { address, price, volume, liquidity }           │ │
│  │   },                                                       │ │
│  │   aggregated: {                                           │ │
│  │     total_volume_24h: sum(chain.volume),                  │ │
│  │     avg_price: weighted_avg(chain.price, chain.volume),   │ │
│  │     total_liquidity: sum(chain.liquidity)                 │ │
│  │   }                                                        │ │
│  │ }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Extending Existing Token Mappings Table

The codebase already has a `token_mappings` table for whale tracking:

```sql
-- Current schema
CREATE TABLE token_mappings (
  id SERIAL PRIMARY KEY,
  contract_address TEXT NOT NULL UNIQUE,
  chain TEXT NOT NULL DEFAULT 'ethereum',
  symbol TEXT NOT NULL,
  coingecko_id TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 18,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Recommendation:** Extend this table or create a new `multi_chain_tokens` table:

```sql
-- New table for multi-chain token registry
CREATE TABLE multi_chain_tokens (
  id SERIAL PRIMARY KEY,
  canonical_id TEXT NOT NULL,                    -- CoinGecko ID or symbol
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,

  -- JSON array of chain data
  chain_addresses JSONB NOT NULL DEFAULT '[]',   -- [{chain, address, decimals}]

  -- Metadata
  coingecko_id TEXT,
  image_url TEXT,
  is_stablecoin BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_canonical UNIQUE (canonical_id)
);

-- Index for address lookups
CREATE INDEX idx_multi_chain_addresses ON multi_chain_tokens
  USING GIN (chain_addresses);
```

### Symbol-Based Matching Algorithm

```typescript
function resolveCanonicalId(token: BirdeyeToken, chain: string): string {
  // Priority 1: Check address registry
  const registered = await lookupByAddress(chain, token.address);
  if (registered) return registered.canonical_id;

  // Priority 2: Check CoinGecko mapping by symbol
  const coingeckoId = await lookupCoinGeckoBySymbol(token.symbol);
  if (coingeckoId) return coingeckoId;

  // Priority 3: Fall back to symbol-based ID
  return token.symbol.toLowerCase();
}
```

---

## Component Impact Analysis

### Files That Change

| File | Change Type | Impact |
|------|-------------|--------|
| `src/lib/apis/birdeye.ts` | EXTEND | Add multi-chain fetching functions |
| `src/lib/services/coin-aggregator.ts` | EXTEND | Add Birdeye as data source |
| `src/lib/utils/coin-utils.ts` | EXTEND | Add `normalizeBirdeyeToken()` |
| `src/lib/types/index.ts` | EXTEND | Add multi-chain types |
| `src/lib/cache/redis.ts` | EXTEND | Add new cache keys |
| `src/lib/db/schema.ts` | EXTEND | Add `multi_chain_tokens` table |
| `src/app/api/cron/collect-prices/route.ts` | MINOR | Integrate Birdeye source |

### Files That Stay the Same

| File | Reason |
|------|--------|
| `src/app/api/rankings/route.ts` | Consumes `CoinPrice[]` - interface unchanged |
| `src/lib/ranking/calculator.ts` | Works with existing types |
| `src/lib/apis/coingecko.ts` | Continues as primary metadata source |
| `src/components/*` | Display layer unchanged |
| All client hooks | API interface unchanged |

### New Files Needed

| File | Purpose |
|------|---------|
| `src/lib/services/birdeye-collector.ts` | Multi-chain token collection logic |
| `src/lib/services/token-registry.ts` | Cross-chain identity resolution |
| `src/app/api/cron/collect-birdeye/route.ts` | Optional: Dedicated Birdeye cron |
| `src/lib/db/token-registry-queries.ts` | DB operations for token registry |

---

## Detailed Data Flow

### Phase 1: Collection (Cron Job)

```typescript
// src/lib/services/birdeye-collector.ts

const CHAINS_BY_PRIORITY = [
  'solana', 'ethereum', 'base', 'arbitrum',
  'polygon', 'bsc', 'optimism', 'avalanche',
  'zksync', 'sui', 'monad'
];

export async function collectBirdeyeTokens(): Promise<BirdeyeCollectionResult> {
  const results: Map<string, BirdeyeToken[]> = new Map();
  const errors: string[] = [];

  for (const chain of CHAINS_BY_PRIORITY) {
    try {
      // Rate limit check
      const rateCheck = await checkRateLimit(RATE_LIMITS.BIRDEYE);
      if (!rateCheck.allowed) {
        await sleep(rateCheck.resetAt - Date.now());
      }

      // Fetch tokens
      const tokens = await getTrendingTokens(chain, 50);
      results.set(chain, tokens);

      // Cache per-chain
      await redis.setex(
        CACHE_KEYS.BIRDEYE_CHAIN(chain),
        CACHE_TTL.BIRDEYE_CHAIN,
        JSON.stringify(tokens)
      );

      // Small delay between chains
      await sleep(100);
    } catch (error) {
      errors.push(`${chain}: ${error.message}`);
    }
  }

  return { results, errors };
}
```

### Phase 2: Normalization

```typescript
// src/lib/utils/coin-utils.ts

export function normalizeBirdeyeToken(
  token: BirdeyeToken,
  chain: BirdeyeChain
): AggregatedCoin {
  return {
    id: `birdeye-${chain}-${token.address}`,
    symbol: token.symbol.toUpperCase(),
    name: token.name,
    image: token.logoURI,
    price: token.price,
    volume_24h: token.volume24hUSD,
    price_change_24h: token.priceChange24h,
    market_cap: token.mc,
    chain: chain,
    address: token.address,
    source: 'birdeye',
    last_updated: new Date().toISOString(),
  };
}
```

### Phase 3: Aggregation

```typescript
// Enhanced aggregateAllCoins() in coin-aggregator.ts

export async function aggregateAllCoins(): Promise<AggregationResult> {
  // ... existing DexPaprika, DexScreener, CoinGecko fetches ...

  // NEW: Fetch from Birdeye (all chains)
  const birdeyeTokens = await collectBirdeyeTokens();

  // Normalize Birdeye tokens
  const normalizedBirdeye: AggregatedCoin[] = [];
  for (const [chain, tokens] of birdeyeTokens.results) {
    normalizedBirdeye.push(
      ...tokens.map(t => normalizeBirdeyeToken(t, chain as BirdeyeChain))
    );
  }

  // Combine all sources
  const allNormalized = [
    ...dexPaprikaTokens.map(normalizeDexPaprikaToken),
    ...dexScreenerPairs.map(normalizeDexScreenerPair),
    ...coingeckoCoins.map(normalizeCoingeckoCoin),
    ...normalizedBirdeye,  // NEW
  ];

  // Enhanced deduplication with cross-chain awareness
  const deduped = deduplicateCoinsMultiChain(allNormalized);

  // ... rest of pipeline unchanged ...
}
```

### Phase 4: Cross-Chain Deduplication

```typescript
// Enhanced deduplication logic

export function deduplicateCoinsMultiChain(
  coins: AggregatedCoin[]
): AggregatedCoin[] {
  // Group by symbol first
  const bySymbol = new Map<string, AggregatedCoin[]>();

  for (const coin of coins) {
    const symbol = coin.symbol.toUpperCase();
    if (!bySymbol.has(symbol)) {
      bySymbol.set(symbol, []);
    }
    bySymbol.get(symbol)!.push(coin);
  }

  const result: AggregatedCoin[] = [];

  for (const [symbol, group] of bySymbol) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // Multiple coins with same symbol - merge them
    const merged = mergeMultiChainCoins(group);
    result.push(merged);
  }

  return result;
}

function mergeMultiChainCoins(coins: AggregatedCoin[]): AggregatedCoin {
  // Find best metadata source (prefer CoinGecko)
  const primary = coins.find(c => c.source === 'coingecko')
    || coins.find(c => c.source === 'birdeye')
    || coins[0];

  // Aggregate metrics across chains
  const totalVolume = coins.reduce((sum, c) => sum + (c.volume_24h || 0), 0);
  const avgPrice = weightedAveragePrice(coins);

  // Collect all sources and chains
  const sources = new Set<CoinSource>();
  const chains = new Set<string>();

  for (const coin of coins) {
    sources.add(coin.source);
    if (coin.chain) chains.add(coin.chain);
    if (coin.sources) coin.sources.forEach(s => sources.add(s));
  }

  return {
    ...primary,
    price: avgPrice,
    volume_24h: totalVolume,
    sources: Array.from(sources),
    chains: Array.from(chains),  // NEW field
  };
}
```

---

## Caching Strategy

### New Cache Keys

```typescript
// Add to src/lib/cache/redis.ts

export const CACHE_KEYS = {
  // ... existing keys ...

  // Birdeye per-chain data
  BIRDEYE_CHAIN: (chain: string) => `birdeye:chain:${chain}`,

  // Aggregated multi-chain data
  BIRDEYE_AGGREGATED: 'birdeye:aggregated',

  // Token registry lookups
  TOKEN_BY_ADDRESS: (chain: string, address: string) =>
    `token:address:${chain}:${address.toLowerCase()}`,
  TOKEN_BY_SYMBOL: (symbol: string) =>
    `token:symbol:${symbol.toLowerCase()}`,
};

export const CACHE_TTL = {
  // ... existing TTLs ...

  BIRDEYE_CHAIN: 300,      // 5 minutes per chain
  BIRDEYE_AGGREGATED: 300, // 5 minutes
  TOKEN_REGISTRY: 3600,    // 1 hour for registry lookups
};
```

### Cache Invalidation Strategy

```
Cron: collect-birdeye (every 5 min)
  └── Updates: birdeye:chain:* keys
  └── Triggers: aggregation refresh

Cron: collect-prices (every 10 min)
  └── Reads: birdeye:chain:* (if fresh)
  └── Updates: prices:all, prices:list

Token registry:
  └── Populated lazily on first lookup
  └── TTL: 1 hour (addresses rarely change)
```

---

## Migration Path

### Phase 1: Foundation (No Breaking Changes)

**Goal:** Add Birdeye as optional data source, existing flow unchanged.

1. Extend `src/lib/apis/birdeye.ts` with multi-chain fetching
2. Add `normalizeBirdeyeToken()` to coin-utils
3. Add new cache keys
4. Create `birdeye-collector.ts` service
5. **Do NOT modify** existing cron or aggregator yet

**Verification:** Birdeye data can be fetched and cached independently.

### Phase 2: Integration (Additive)

**Goal:** Integrate Birdeye into aggregation pipeline.

1. Modify `coin-aggregator.ts` to include Birdeye source
2. Enhance deduplication for cross-chain awareness
3. Add `chains` field to `AggregatedCoin` type
4. Update breakdown metadata to include Birdeye counts

**Verification:** Aggregation includes Birdeye tokens, dedup works correctly.

### Phase 3: Registry (New Feature)

**Goal:** Implement cross-chain token identity resolution.

1. Create `multi_chain_tokens` table
2. Implement `token-registry.ts` service
3. Seed registry with known tokens (USDC, USDT, WETH, etc.)
4. Integrate registry lookups into aggregation

**Verification:** Same token across chains maps to single entry.

### Phase 4: Optimization (Performance)

**Goal:** Tune caching, rate limits, and collection frequency.

1. Evaluate separate Birdeye cron vs integrated collection
2. Tune cache TTLs based on data freshness requirements
3. Add monitoring/metrics for multi-chain data quality
4. Consider WebSocket for real-time updates (future)

---

## Rate Limiting Strategy

### Current Configuration

From `src/lib/rate-limiter/distributed.ts`:
```typescript
BIRDEYE: {
  key: 'ratelimit:birdeye',
  limit: 100,     // 100 per minute (free tier)
  window: 60,
}
```

### Multi-Chain Collection Budget

```
Per collection cycle:
- 11 chains x 1 request = 11 requests
- Buffer for retries: 5 requests
- Total: ~16 requests per cycle

At 100 req/min:
- Can run every ~10 seconds safely
- Recommended: 5-minute cycle (96% headroom)
```

### Graceful Degradation

```typescript
// If rate limited, use cached data
const cachedChainData = await redis.get(CACHE_KEYS.BIRDEYE_CHAIN(chain));
if (cachedChainData && !rateCheck.allowed) {
  console.log(`[Birdeye] Using cached data for ${chain} (rate limited)`);
  return JSON.parse(cachedChainData);
}
```

---

## Type Extensions

### Extended AggregatedCoin

```typescript
// src/lib/types/index.ts

export type CoinSource =
  | 'dexpaprika'
  | 'dexscreener'
  | 'coingecko'
  | 'binance'
  | 'kucoin'
  | 'birdeye';  // NEW

export interface AggregatedCoin {
  // ... existing fields ...

  // Multi-chain support (NEW)
  chains?: string[];           // All chains this token exists on
  chain_data?: ChainData[];    // Per-chain metrics
}

export interface ChainData {
  chain: string;
  address: string;
  price: number;
  volume_24h: number;
  liquidity: number;
}
```

### Multi-Chain Token Registry

```typescript
// src/lib/types/index.ts

export interface MultiChainToken {
  canonical_id: string;
  symbol: string;
  name: string;
  coingecko_id?: string;
  image_url?: string;
  is_stablecoin: boolean;
  chain_addresses: ChainAddress[];
}

export interface ChainAddress {
  chain: string;
  address: string;
  decimals: number;
}
```

---

## Error Handling

### Per-Chain Failure Isolation

```typescript
const results: BirdeyeCollectionResult = {
  success: new Map(),
  errors: [],
  partial: false,
};

for (const chain of CHAINS) {
  try {
    const tokens = await fetchChainTokens(chain);
    results.success.set(chain, tokens);
  } catch (error) {
    results.errors.push({ chain, error: error.message });
    results.partial = true;
    // Continue to next chain - don't fail entire collection
  }
}

// Aggregation proceeds with available data
if (results.success.size > 0) {
  await aggregateAvailableChains(results.success);
}
```

### Fallback Chain

If Birdeye fails entirely, the existing sources (DexPaprika, DexScreener, CoinGecko) continue to provide data. The architecture is additive, not dependent.

---

## Sources

- [Birdeye API Documentation](https://docs.birdeye.so/) - Official API reference
- [Birdeye Supported Networks](https://docs.birdeye.so/docs/supported-networks) - Chain list
- [Token List V3 API](https://docs.birdeye.so/reference/get-defi-v3-token-list) - Endpoint details
- [CoinGecko Contract Address API](https://docs.coingecko.com/reference/coins-contract-address) - Cross-reference tokens
- Existing codebase analysis of `coin-aggregator.ts`, `coin-utils.ts`, and `birdeye.ts`
