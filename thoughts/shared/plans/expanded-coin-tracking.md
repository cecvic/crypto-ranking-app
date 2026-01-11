# Expanded Coin Tracking Plan (v2 - Multi-Source Free)

## Goal
Track **ALL available coins** (~17,000+ CEX + 15M+ DEX tokens) with focus on:
- Meme coins (high volatility, whale activity targets)
- AI tokens (emerging category)
- DeFi tokens
- New/low-cap coins (pump & dump opportunities)
- **Exclude stablecoins** (low volatility, not useful for whale detection)

## Key Discovery: FREE Multi-Source Strategy

Research revealed we can get **massive coverage at ZERO COST** by combining:

| Source | Coverage | Rate Limit | Cost | Best For |
|--------|----------|------------|------|----------|
| **DexPaprika** | 15M+ tokens, 29 chains | Generous (no auth) | **FREE** | DEX meme/AI coins |
| **DexScreener** | All DEX pairs | 300/min | **FREE** | Meme coin search |
| **CoinGecko** | 18K+ coins | 30/min, 10K/mo | **FREE** | Categories, metadata |
| **Binance API** | 300+ pairs | 6K weight/min | **FREE** | Top CEX prices |
| **KuCoin API** | 1000+ coins | 1800/min | **FREE** | Broader altcoins |

**Total Cost: $0/month** with coverage exceeding paid plans!

---

## Architecture: Multi-Source Aggregation

```
┌─────────────────────────────────────────────────────────────────┐
│                     Data Aggregation Layer                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  DexPaprika  │  │  DexScreener │  │  CoinGecko   │          │
│  │  15M+ tokens │  │  300 req/min │  │  Categories  │          │
│  │  29 chains   │  │  Meme search │  │  Metadata    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └────────────┬────┴────────────────┘                   │
│                      │                                          │
│              ┌───────▼───────┐                                  │
│              │  Deduplication │                                  │
│              │  & Enrichment  │                                  │
│              └───────┬───────┘                                  │
│                      │                                          │
│              ┌───────▼───────┐                                  │
│              │  Stablecoin   │                                  │
│              │   Filter      │                                  │
│              └───────┬───────┘                                  │
│                      │                                          │
│              ┌───────▼───────┐                                  │
│              │  Redis Cache  │                                  │
│              │  + PostgreSQL │                                  │
│              └───────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: DexPaprika Integration (Primary DEX Source)

**Why DexPaprika:**
- 100% FREE, no API key needed
- 15M+ tokens across Solana, Base, Ethereum, BSC, Arbitrum, etc.
- Real-time streaming (SSE) available
- TypeScript SDK available

**New File:** `src/lib/apis/dexpaprika.ts`

```typescript
// DexPaprika API - FREE, no auth required
const BASE_URL = 'https://api.dexpaprika.com';

export async function getTokensByChain(chain: string): Promise<Token[]> {
  // e.g., chain = 'solana', 'ethereum', 'base'
  const response = await fetch(`${BASE_URL}/networks/${chain}/tokens`);
  return response.json();
}

export async function getTopTokens(limit: number = 500): Promise<Token[]> {
  // Get top tokens by volume across all chains
  const response = await fetch(`${BASE_URL}/tokens?limit=${limit}&order=volume_desc`);
  return response.json();
}

export async function searchTokens(query: string): Promise<Token[]> {
  const response = await fetch(`${BASE_URL}/search?q=${query}`);
  return response.json();
}

// Real-time price stream (SSE)
export function streamPrices(tokenIds: string[]): EventSource {
  return new EventSource(`${BASE_URL}/stream/prices?ids=${tokenIds.join(',')}`);
}
```

### Phase 2: DexScreener Integration (Meme Coin Discovery)

**Why DexScreener:**
- 300 requests/min (very generous)
- Excellent for searching new meme coins
- No API key required

**New File:** `src/lib/apis/dexscreener.ts`

```typescript
const BASE_URL = 'https://api.dexscreener.com';

// Search for meme coins
export async function searchPairs(query: string): Promise<Pair[]> {
  const response = await fetch(`${BASE_URL}/latest/dex/search?q=${query}`);
  return (await response.json()).pairs;
}

// Get token by address (up to 30 at once)
export async function getTokens(chainId: string, addresses: string[]): Promise<Token[]> {
  const response = await fetch(
    `${BASE_URL}/tokens/v1/${chainId}/${addresses.join(',')}`
  );
  return response.json();
}

// Get boosted/trending tokens (promotional, but indicates attention)
export async function getBoostedTokens(): Promise<Token[]> {
  const response = await fetch(`${BASE_URL}/token-boosts/latest/v1`);
  return response.json();
}
```

### Phase 3: Update CoinGecko for Categories Only

Keep CoinGecko for what it does best - categories and metadata (within free limits).

**Update:** `src/lib/apis/coingecko.ts`

```typescript
// Add category-focused functions
export async function getCoinsByCategory(
  category: 'meme-coin' | 'artificial-intelligence' | 'decentralized-finance-defi',
  limit: number = 250
): Promise<CoinPrice[]> {
  const response = await api.get('/coins/markets', {
    params: {
      vs_currency: 'usd',
      category: category,
      order: 'volume_desc',
      per_page: limit,
      sparkline: false,
    },
  });
  return response.data;
}

export async function getAllCategories(): Promise<Category[]> {
  const response = await api.get('/coins/categories/list');
  return response.data;
}

// Cache categories for 7 days (they rarely change)
export async function getCachedCategories(): Promise<Category[]> {
  const cached = await redis.get('coingecko:categories');
  if (cached) return JSON.parse(cached);

  const categories = await getAllCategories();
  await redis.setex('coingecko:categories', 7 * 24 * 60 * 60, JSON.stringify(categories));
  return categories;
}
```

### Phase 4: Unified Data Aggregator

**New File:** `src/lib/services/coin-aggregator.ts`

```typescript
import * as dexpaprika from '../apis/dexpaprika';
import * as dexscreener from '../apis/dexscreener';
import * as coingecko from '../apis/coingecko';
import { filterStablecoins, deduplicateCoins } from '../utils/coin-utils';

export interface AggregatedCoin {
  id: string;
  symbol: string;
  name: string;
  price: number;
  volume_24h: number;
  price_change_24h: number;
  market_cap?: number;
  chain?: string;
  source: 'dexpaprika' | 'dexscreener' | 'coingecko' | 'exchange';
  categories?: string[];
  is_meme?: boolean;
  is_ai?: boolean;
  is_defi?: boolean;
}

export async function aggregateAllCoins(): Promise<AggregatedCoin[]> {
  // Parallel fetch from all sources
  const [
    dexPaprikaTokens,
    dexScreenerTrending,
    coingeckoMeme,
    coingeckoAI,
    coingeckoDefi,
    coingeckoTop,
  ] = await Promise.all([
    dexpaprika.getTopTokens(1000),           // Top 1000 DEX tokens by volume
    dexscreener.getBoostedTokens(),          // Trending/promoted tokens
    coingecko.getCoinsByCategory('meme-coin', 250),
    coingecko.getCoinsByCategory('artificial-intelligence', 250),
    coingecko.getCoinsByCategory('decentralized-finance-defi', 250),
    coingecko.getTopCoins(250),              // Top 250 by market cap
  ]);

  // Normalize to common format
  const normalized = [
    ...normalizeDexPaprika(dexPaprikaTokens),
    ...normalizeDexScreener(dexScreenerTrending),
    ...normalizeCoingecko(coingeckoMeme, 'meme'),
    ...normalizeCoingecko(coingeckoAI, 'ai'),
    ...normalizeCoingecko(coingeckoDefi, 'defi'),
    ...normalizeCoingecko(coingeckoTop),
  ];

  // Deduplicate (prefer CoinGecko for metadata, DexPaprika for DEX-only coins)
  const deduped = deduplicateCoins(normalized);

  // Filter out stablecoins
  const filtered = filterStablecoins(deduped);

  return filtered;
}
```

### Phase 5: Stablecoin Filtering

**New File:** `src/lib/constants/stablecoins.ts`

```typescript
// Known stablecoin IDs (CoinGecko format)
export const STABLECOIN_IDS = new Set([
  'tether', 'usd-coin', 'dai', 'binance-usd', 'trueusd',
  'frax', 'pax-dollar', 'usdd', 'tusd', 'gusd',
  'gemini-dollar', 'first-digital-usd', 'euro-coin',
  'stasis-eurs', 'neutrino', 'fei-protocol', 'liquity-usd',
  'tether-gold', 'paxos-gold', 'eurs', 'celo-dollar',
  'seur', 'tor', 'susd', 'rai', 'mimatic', 'husd'
]);

// Known stablecoin symbols (for DEX tokens without IDs)
export const STABLECOIN_SYMBOLS = new Set([
  'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'USDP',
  'USDD', 'GUSD', 'LUSD', 'SUSD', 'RAI', 'MIM', 'EURS',
  'EURT', 'HUSD', 'CUSD', 'CEUR', 'PAXG', 'XAUT', 'UST'
]);

export function isStablecoin(coin: { id?: string; symbol?: string }): boolean {
  if (coin.id && STABLECOIN_IDS.has(coin.id.toLowerCase())) return true;
  if (coin.symbol && STABLECOIN_SYMBOLS.has(coin.symbol.toUpperCase())) return true;
  return false;
}
```

### Phase 6: New Cron Job Architecture

**Update:** `src/app/api/cron/collect-prices/route.ts`

Replace single-source with multi-source aggregation:

```typescript
import { aggregateAllCoins } from '@/lib/services/coin-aggregator';

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[collect-prices] Starting multi-source aggregation...');

  try {
    // Aggregate from all sources
    const coins = await aggregateAllCoins();
    console.log(`[collect-prices] Aggregated ${coins.length} coins (excluding stablecoins)`);

    // Cache in Redis
    const redis = getRedis();
    await redis.setex(CACHE_KEYS.PRICES_LIST, CACHE_TTL.PRICES, JSON.stringify(coins));

    // Also store by category for fast filtering
    const memeCoins = coins.filter(c => c.is_meme);
    const aiCoins = coins.filter(c => c.is_ai);
    const defiCoins = coins.filter(c => c.is_defi);

    await Promise.all([
      redis.setex('prices:meme', CACHE_TTL.PRICES, JSON.stringify(memeCoins)),
      redis.setex('prices:ai', CACHE_TTL.PRICES, JSON.stringify(aiCoins)),
      redis.setex('prices:defi', CACHE_TTL.PRICES, JSON.stringify(defiCoins)),
    ]);

    return NextResponse.json({
      success: true,
      coinsCollected: coins.length,
      breakdown: {
        meme: memeCoins.length,
        ai: aiCoins.length,
        defi: defiCoins.length,
      },
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    // ... error handling
  }
}
```

### Phase 7: Frontend Updates

**Update:** `src/components/rankings/rankings-table.tsx`

Add category filters and virtual scrolling for large lists:

```typescript
// Add category filter tabs
<Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
  <TabsList>
    <TabsTrigger value="all">All Coins</TabsTrigger>
    <TabsTrigger value="meme">Meme Coins</TabsTrigger>
    <TabsTrigger value="ai">AI Tokens</TabsTrigger>
    <TabsTrigger value="defi">DeFi</TabsTrigger>
  </TabsList>
</Tabs>

// Use virtual scrolling for 1000+ coins
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: filteredCoins.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60, // row height
  overscan: 10,
});
```

---

## API Call Budget (FREE Strategy)

| Source | Endpoint | Frequency | Calls/Day | Monthly |
|--------|----------|-----------|-----------|---------|
| DexPaprika | Top tokens | Every 10 min | 144 | 4,320 |
| DexScreener | Trending | Every 10 min | 144 | 4,320 |
| CoinGecko | Meme category | Every 10 min | 144 | 4,320 |
| CoinGecko | AI category | Every 10 min | 144 | 4,320 |
| CoinGecko | DeFi category | Every 10 min | 144 | 4,320 |
| CoinGecko | Top 250 | Every 10 min | 144 | 4,320 |
| **Total** | - | - | **864** | **~26,000** |

**CoinGecko usage:** 576 calls/day = 17,280/month (exceeds 10K limit)

**Solution:** Reduce CoinGecko to every 20 min OR use DexPaprika/DexScreener more heavily:

**Optimized:**
| Source | Frequency | Monthly Calls |
|--------|-----------|---------------|
| DexPaprika | Every 10 min | 4,320 (FREE - no limit) |
| DexScreener | Every 10 min | 4,320 (FREE - 300/min) |
| CoinGecko | Every 30 min | 5,760 (within 10K) |

**Result:** Completely within FREE tier!

---

## Files to Create

1. `src/lib/apis/dexpaprika.ts` - DexPaprika API client
2. `src/lib/apis/dexscreener.ts` - DexScreener API client
3. `src/lib/services/coin-aggregator.ts` - Multi-source aggregator
4. `src/lib/constants/stablecoins.ts` - Stablecoin filter list
5. `src/lib/utils/coin-utils.ts` - Deduplication, normalization helpers

## Files to Modify

1. `src/lib/apis/coingecko.ts` - Add category functions
2. `src/app/api/cron/collect-prices/route.ts` - Use aggregator
3. `src/lib/cache/redis.ts` - Add category cache keys
4. `src/components/rankings/rankings-table.tsx` - Category filters, virtual scroll
5. `src/lib/types.ts` - Add AggregatedCoin type

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Coins tracked | 100 | 17,000+ |
| Meme coins | ~5-10 | 1,000+ |
| AI tokens | 0-2 | 250+ |
| DeFi tokens | ~20 | 250+ |
| Stablecoins | ~10 | 0 |
| Monthly API cost | $0 | **$0** |
| Refresh interval | 1 min | 10 min |

---

## Open Source Libraries to Use

From GitHub research:

| Library | Purpose | Install |
|---------|---------|---------|
| `@tanstack/react-virtual` | Virtual scrolling for large lists | `pnpm add @tanstack/react-virtual` |
| `ccxt` | Exchange API abstraction (optional) | `pnpm add ccxt` |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| DexPaprika rate limits hit | Data gaps | Fall back to DexScreener |
| Too many coins slow rankings | Slow computation | Batch processing, limit to top 5000 by volume |
| Duplicate coins from sources | Data inconsistency | Dedupe by address/symbol |
| New stablecoins not filtered | Noise | Fetch stablecoin list monthly from CoinGecko |
| UI performance with 17K coins | Bad UX | Virtual scrolling + client-side pagination |

---

## Implementation Order

1. **Day 1:** Create DexPaprika and DexScreener API clients
2. **Day 1:** Create stablecoin filter
3. **Day 2:** Create coin aggregator service
4. **Day 2:** Update cron job to use aggregator
5. **Day 3:** Add category filters to frontend
6. **Day 3:** Add virtual scrolling for large lists
7. **Day 4:** Testing and optimization

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Budget | $0 - Using free APIs only |
| Refresh rate | 10 minutes (acceptable) |
| Scope | All 17K+ coins via multi-source |
| Categories | Meme, AI, DeFi prioritized |
