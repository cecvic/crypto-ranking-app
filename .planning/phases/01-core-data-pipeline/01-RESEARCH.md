# Phase 1: Core Data Pipeline - Research

**Researched:** 2026-01-22
**Domain:** Multi-chain token price aggregation via Birdeye API
**Confidence:** HIGH

## Summary

This phase replaces CoinGecko with Birdeye API to support multi-chain token price data across 11 blockchains. Birdeye uses account-level rate limiting (shared across all endpoints), requires chain-specific headers, and provides multi-price endpoints for batching. The standard architecture uses Redis cache-aside pattern with TTL-based expiration, PostgreSQL composite indexes for multi-chain token queries, and Vercel cron jobs for scheduled polling within serverless timeout constraints.

**Critical constraint:** Rate limits are account-level (100 rps free tier, 1000 rpm premium), not per-endpoint. Every API call consumes from the same quota pool across price fetching, market data, and trending lists.

**Primary recommendation:** Use `/defi/multi_price` endpoint (max 100 tokens per call) with Redis cache (15-30 min TTL), composite indexes on (chain, address), and dynamic polling intervals that adapt based on rate limit headroom (80% threshold triggers slowdown).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| axios | 1.x | HTTP client | Industry standard, interceptor support for retry/rate limiting |
| axios-retry | 4.x | Retry with backoff | Built-in exponential backoff, handles network/idempotent errors |
| ioredis | 5.x | Redis client | Most popular Node.js Redis client, Cluster support, TypeScript types |
| drizzle-orm | Latest | PostgreSQL ORM | Type-safe queries, lightweight, migration support |
| @vercel/cron | Latest | Scheduled jobs | Vercel platform integration, authentication built-in |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 3.x | Response validation | Validate Birdeye API responses before caching |
| p-queue | 8.x | Concurrency control | Limit parallel API calls to stay under rate limits |
| node-cron | 3.x | Cron syntax | If running on non-Vercel platform (VPS, Docker) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| axios-retry | Custom retry logic | axios-retry provides tested exponential backoff (Math.pow(2, retryCount) * 1000) |
| ioredis | node-redis | ioredis has better TypeScript support and Cluster client |
| @vercel/cron | BullMQ + Redis | BullMQ adds complexity but provides job persistence, retries, and queues if needed beyond simple polling |

**Installation:**
```bash
npm install axios axios-retry ioredis drizzle-orm zod p-queue
npm install -D @types/node
```

## Architecture Patterns

### Recommended Database Schema
```sql
-- Multi-chain token table
CREATE TABLE tokens (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL,           -- Contract address
  chain TEXT NOT NULL,              -- solana, ethereum, arbitrum, etc.
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  decimals INT,
  logo_uri TEXT,

  -- Denormalized data for fast reads
  price DECIMAL(20, 8),
  price_change_24h DECIMAL(10, 4),
  volume_24h DECIMAL(20, 2),
  liquidity DECIMAL(20, 2),
  market_cap BIGINT,

  last_fetched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Composite unique constraint
  CONSTRAINT tokens_chain_address_unique UNIQUE (chain, address)
);

-- Composite index for queries by chain
CREATE INDEX idx_tokens_chain_address ON tokens (chain, address);

-- Index for ranking queries
CREATE INDEX idx_tokens_chain_volume ON tokens (chain, volume_24h DESC);
CREATE INDEX idx_tokens_chain_marketcap ON tokens (chain, market_cap DESC);
```

**Why this structure:**
- `(chain, address)` composite index enables fast lookups for price updates
- Denormalized price data avoids joins for ranking queries
- PostgreSQL 17's bi-directional indexes make single composite index serve both ASC/DESC queries

### Pattern 1: Cache-Aside with TTL
**What:** Check cache first, fetch from API on miss, store with expiration

**When to use:** All Birdeye API calls (price, volume, market data)

**Example:**
```typescript
// Source: Redis best practices 2026
async function getTokenPrice(address: string, chain: string) {
  const cacheKey = `price:${chain}:${address}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Fetch from API (with rate limiting)
  await waitForRateLimit(RATE_LIMITS.BIRDEYE);
  const response = await api.get('/defi/price', {
    params: { address },
    headers: { 'x-chain': chain }
  });

  // 3. Cache with TTL
  await redis.setex(cacheKey, 900, JSON.stringify(response.data)); // 15 min

  return response.data;
}
```

### Pattern 2: Batch API Calls with Multi-Price Endpoint
**What:** Fetch up to 100 token prices in a single API call

**When to use:** Refreshing token registry, cron job polling

**Example:**
```typescript
// Source: Birdeye /defi/multi_price documentation
async function batchFetchPrices(tokens: Array<{address: string, chain: string}>) {
  // Group by chain (x-chain header is per-request)
  const byChain = groupBy(tokens, 'chain');

  for (const [chain, chainTokens] of Object.entries(byChain)) {
    // Batch max 100 tokens
    const chunks = chunk(chainTokens, 100);

    for (const batch of chunks) {
      const addresses = batch.map(t => t.address).join(',');

      const response = await api.get('/defi/multi_price', {
        params: { list_address: addresses },
        headers: { 'x-chain': chain }
      });

      // response.data is hashmap: { [address]: { value, updateUnixTime, ... } }
      for (const [address, priceData] of Object.entries(response.data)) {
        await updateTokenPrice(chain, address, priceData);
      }
    }
  }
}
```

### Pattern 3: Dynamic Rate Limiting with Headroom Check
**What:** Adjust polling frequency based on remaining quota

**When to use:** Cron jobs that must stay under account-level limits

**Example:**
```typescript
// Source: Dynamic rate limiting best practices 2026
async function adaptivePolling() {
  const status = await getRateLimitStatus('BIRDEYE');
  const headroom = status.remaining / RATE_LIMITS.BIRDEYE.limit;

  if (headroom > 0.8) {
    // Plenty of headroom: poll all chains
    return await pollAllChains();
  } else if (headroom > 0.5) {
    // Medium headroom: prioritize high-volume chains
    return await pollPriorityChains(['solana', 'ethereum', 'base']);
  } else {
    // Low headroom: poll only top tokens
    return await pollTopTokensOnly(50);
  }
}
```

### Pattern 4: Token Seeding from Birdeye Rankings
**What:** Populate token registry from Birdeye's Token List V3 API

**When to use:** Initial setup, periodic registry refresh (daily/weekly)

**Example:**
```typescript
// Source: Birdeye Token List V3 API
async function seedTokenRegistry(chain: string, limit: number = 200) {
  const tokens = [];
  let offset = 0;

  while (tokens.length < limit) {
    const response = await api.get('/defi/v3/token/list', {
      params: {
        offset,
        limit: 100  // Max per request
      },
      headers: { 'x-chain': chain }
    });

    tokens.push(...response.data.items);

    if (!response.data.hasNext) break;
    offset += 100;
  }

  // Insert tokens into database
  await db.insert(tokensTable).values(
    tokens.map(t => ({
      address: t.address,
      chain,
      symbol: t.symbol,
      name: t.name,
      // ... other fields
    }))
  ).onConflictDoUpdate({
    target: [tokensTable.chain, tokensTable.address],
    set: { last_fetched_at: new Date() }
  });
}
```

### Anti-Patterns to Avoid
- **Fetching prices individually instead of using `/defi/multi_price`:** Wastes 100x rate limit quota
- **Not grouping by chain before batching:** x-chain header is per-request, mixing chains requires multiple calls
- **Caching with no TTL:** Redis memory fills up; always use `setex()` or `expire()`
- **Polling all 11 chains sequentially in a single cron job:** Vercel cron has 10s default timeout (60s max free tier); split into multiple cron jobs or use background workers
- **Retrying on 401/403 errors:** These are auth/permission errors, not transient; only retry 429/503/network errors

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential backoff retry | Custom setTimeout loop | `axios-retry` with `exponentialDelay` | Handles jitter (prevents thundering herd), respects retry-after headers, default backoff: 100ms * 2^retryCount |
| Rate limit quota tracking | In-memory counter | Redis sliding window with `incr()` + `expire()` | Works across multiple serverless instances, survives restarts, atomic operations |
| Symbol collision handling | String concatenation (e.g., "USDC-ETH") | Composite key `(chain, address)` as primary identifier, symbol for display only | Symbols are not unique across chains; addresses are the source of truth |
| Cache invalidation | Manual delete on update | TTL + optional pub/sub for critical updates | TTL handles 95% of cases; pub/sub adds complexity but cuts stale reads by >95% if needed |
| Cron job locks (prevent duplicate runs) | Flag file or DB row | Redis `set NX EX` (set if not exists with expiration) | Atomic operation, auto-cleanup on timeout, distributed-safe |

**Key insight:** Birdeye API responses include `updateUnixTime` timestamp. Use this to detect if cached data is newer than API response (rare but possible during high volatility).

## Common Pitfalls

### Pitfall 1: Exceeding Account-Level Rate Limits
**What goes wrong:** App hits 100 rps (free tier) across all endpoints combined, gets 429 errors, cron jobs fail

**Why it happens:** Rate limits are account-level, not per-endpoint. Fetching prices for 200 tokens + trending lists + market data can easily exceed quota.

**How to avoid:**
1. Use `/defi/multi_price` (1 call for 100 tokens vs 100 individual calls)
2. Track rate limit usage with Redis sliding window
3. Implement 80% headroom threshold: when remaining < 20%, reduce polling frequency or token count

**Warning signs:**
- 429 errors in logs
- `x-ratelimit-remaining` header approaching 0
- Cron jobs completing but returning empty/stale data

### Pitfall 2: Symbol Collisions Across Chains
**What goes wrong:** USDC exists on 8+ chains; user sees multiple "USDC" entries or wrong chain's data

**Why it happens:** Symbols are not unique; address is the unique identifier per chain

**How to avoid:**
- Use `(chain, address)` as composite primary key
- Display symbol + chain in UI: "USDC (Ethereum)", "USDC (Solana)"
- Never use symbol alone for lookups; always require chain context

**Warning signs:**
- User reports seeing duplicate tokens
- Price data mixing between chains (e.g., Solana USDC showing Ethereum price)

### Pitfall 3: Vercel Cron Timeout (10s Default)
**What goes wrong:** Cron job fetching all 11 chains sequentially times out before completion

**Why it happens:** Free tier: 10s default, 60s max; Pro tier: 300s. Fetching 200 tokens * 11 chains with rate limiting takes minutes.

**How to avoid:**
1. Split into multiple cron jobs (one per chain or chain group)
2. Use `maxDuration: 60` in route config (free tier max)
3. Kick off background job and return immediately (e.g., queue to BullMQ or trigger another API endpoint)

**Warning signs:**
- 504 Gateway Timeout errors
- Cron job logs show "Function timed out"
- Incomplete data updates (only first few chains updated)

### Pitfall 4: Stale Cache with No Invalidation Strategy
**What goes wrong:** Token price changes 50% but UI shows old price for 15+ minutes

**Why it happens:** Cache TTL set too long, no event-based invalidation

**How to avoid:**
- Use context-aware TTLs: high-volatility tokens (volume spikes) get 5 min TTL, stable tokens get 30 min
- Consider hybrid approach: short TTL (15 min) + background refresh for hot keys every 30s
- Monitor `updateUnixTime` from API; if newer than cache timestamp, update cache immediately

**Warning signs:**
- User reports price discrepancies with other platforms
- Cache hit rate >95% but complaints about stale data

### Pitfall 5: Not Handling Birdeye API Schema Changes
**What goes wrong:** Birdeye changes response schema (adds/removes fields), app crashes parsing response

**Why it happens:** Assuming API contract is stable without validation

**How to avoid:**
1. Use Zod schemas to validate API responses before using
2. Handle optional fields gracefully (use `?.` operator)
3. Log schema validation errors to catch breaking changes early

**Warning signs:**
- Runtime errors like "Cannot read property 'value' of undefined"
- TypeScript errors after Birdeye API updates

## Code Examples

Verified patterns from official sources:

### Axios Retry Configuration
```typescript
// Source: axios-retry best practices 2026
import axiosRetry from 'axios-retry';

const api = axios.create({
  baseURL: 'https://public-api.birdeye.so',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'X-API-KEY': process.env.BIRDEYE_API_KEY,
  },
});

axiosRetry(api, {
  retries: 3,
  retryDelay: (retryCount) => {
    // Exponential backoff with jitter
    const delay = Math.pow(2, retryCount) * 1000;
    const jitter = Math.random() * 200;
    return delay + jitter;
  },
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429 ||
           error.response?.status === 503;
  },
  onRetry: (retryCount, error) => {
    console.log(`[Birdeye] Retry ${retryCount} after ${error.message}`);
  },
});
```

### Redis Rate Limiter (Sliding Window)
```typescript
// Source: Distributed rate limiter pattern
export async function checkRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = Math.floor(now / (config.window * 1000));
  const windowKey = `${config.key}:${windowStart}`;

  // Increment counter for current window
  const current = await redis.incr(windowKey);

  // Set expiry if this is the first request in the window
  if (current === 1) {
    await redis.expire(windowKey, config.window);
  }

  const resetAt = (windowStart + 1) * config.window * 1000;

  return {
    allowed: current <= config.limit,
    remaining: Math.max(0, config.limit - current),
    resetAt,
    current,
  };
}
```

### Vercel Cron Job Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/poll-prices-solana",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/poll-prices-evm",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/refresh-token-registry",
      "schedule": "0 0 * * *"
    }
  ]
}
```

```typescript
// app/api/cron/poll-prices-solana/route.ts
export const maxDuration = 60; // seconds (free tier max)

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Acquire distributed lock
  const lockKey = 'lock:poll-prices-solana';
  const lock = await redis.set(lockKey, '1', 'NX', 'EX', 300); // 5 min
  if (!lock) {
    console.log('[Cron] Already running, skipping');
    return Response.json({ skipped: true });
  }

  try {
    await pollChainPrices('solana');
    return Response.json({ success: true });
  } finally {
    await redis.del(lockKey);
  }
}
```

### Multi-Chain Token Query (Drizzle ORM)
```typescript
// Source: PostgreSQL composite index best practices
import { eq, and, desc } from 'drizzle-orm';

// Fetch token by chain + address (uses composite index)
const token = await db.query.tokens.findFirst({
  where: and(
    eq(tokens.chain, 'solana'),
    eq(tokens.address, 'So11111111111111111111111111111111111111112')
  )
});

// Fetch top tokens by volume for a chain (uses idx_tokens_chain_volume)
const topTokens = await db.query.tokens.findMany({
  where: eq(tokens.chain, 'ethereum'),
  orderBy: [desc(tokens.volume_24h)],
  limit: 100
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Token List V1/V2 API | Token List V3 API | Mar 2025 | V3 adds pagination (100 tokens/call), advanced sorting (FDV, liquidity, market cap), and timeframe filters (1h, 2h, 4h, 8h, 24h) |
| Individual `/defi/price` calls | `/defi/multi_price` batching | 2024 | 100x reduction in rate limit usage (1 call for 100 tokens vs 100 calls) |
| WebSocket streaming (Business tier) | HTTP polling with cache | Phase 1 decision | WebSocket requires $499/mo; polling sufficient for 15min+ refresh intervals |
| Per-endpoint rate limits | Account-level rate limits | Birdeye API v2+ | Must track total quota across all endpoints, not just per-endpoint |
| String concatenation for multi-chain ("USDC-ETH") | Composite key (chain, address) | Multi-chain era | Symbols are not unique; addresses are chain-specific identifiers |

**Deprecated/outdated:**
- Token List V1 API: Deprecated March 23, 2025; use V3
- Token List V2 API: Deprecated March 23, 2025; use V3
- `/defi/tokenlist` endpoint: Still works but lacks V3 features (pagination, advanced sorting)

## Open Questions

Things that couldn't be fully resolved:

1. **Birdeye Compute Unit (CU) relationship to rate limits**
   - What we know: Each endpoint has a CU cost (e.g., `/defi/price` = 10 CU, Token List V3 = 100 CU)
   - What's unclear: How CUs relate to rps/rpm limits; is there a CU quota separate from rps quota?
   - Recommendation: Monitor both rps and CU usage via response headers; assume rps is primary constraint

2. **Token List V3 default sorting**
   - What we know: V3 supports sorting by liquidity, market cap, FDV, volume (1h-24h)
   - What's unclear: What's the default sort if no parameters provided?
   - Recommendation: Explicitly specify `sort_by=volume_24h&sort_type=desc` for token seeding

3. **Optimal cache TTL per token volatility**
   - What we know: Static data: 1-6h TTL; frequent changes: 30-60s TTL
   - What's unclear: How to classify tokens as high/low volatility in real-time?
   - Recommendation: Start with uniform 15 min TTL; phase 2 can add dynamic TTLs based on price change % thresholds

4. **Symbol collision UX best practice**
   - What we know: Multiple tokens share symbols across chains (USDC, WETH, etc.)
   - What's unclear: Industry standard UX—separate entries vs aggregated view?
   - Recommendation: Show separate entries with chain label ("USDC (Ethereum)", "USDC (Solana)"); users expect per-chain data

## Sources

### Primary (HIGH confidence)
- [Birdeye /defi/price endpoint](https://docs.birdeye.so/reference/get-defi-price) - Required parameters, response schema, compute units
- [Birdeye /defi/multi_price endpoint](https://docs.birdeye.so/reference/get-defi-multi_price) - Batch limit (100 tokens), hashmap response format
- [Birdeye rate limiting](https://docs.birdeye.so/docs/rate-limiting) - Account-level limits, tier breakdown (free: 1 rps, premium: 50 rps/1000 rpm)
- [Birdeye supported chains](https://docs.birdeye.so/docs/list-supported-chains) - Full chain list, x-chain header usage
- [Birdeye compute units](https://docs.birdeye.so/docs/compute-unit-cost) - Per-endpoint CU costs
- [Birdeye Token List V3 API](https://docs.birdeye.so/reference/get-defi-v3-token-list) - Pagination, chain support, response schema
- [Birdeye trending tokens](https://docs.birdeye.so/docs/trending-tokens) - Sorting options (rank, liquidity, volume24hUSD)

### Secondary (MEDIUM confidence)
- [Redis caching with TTL best practices](https://betterstack.com/community/guides/scaling-nodejs/nodejs-caching-redis/) - Cache-aside pattern, TTL recommendations (30 min for API responses)
- [Redis cache invalidation strategies 2026](https://thelinuxcode.com/redis-cache-in-2026-fast-paths-fresh-data-and-a-modern-dx/) - TTL + event-based hybrid, pub/sub for distributed systems
- [PostgreSQL composite indexes](https://minervadb.xyz/composite-indexes-in-postgresql/) - Column order matters (left-to-right), 100x performance improvement
- [PostgreSQL 17 bi-directional indexes](https://medium.com/@DevBoostLab/postgresql-17-performance-upgrade-2026-f4222e71f577) - Single composite index serves ASC/DESC queries (94% query time reduction)
- [Axios-retry exponential backoff](https://www.zenrows.com/blog/axios-retry) - Best practice: 3 retries, Math.pow(2, retryCount) * 1000, add jitter
- [Vercel cron job timeouts](https://vercel.com/docs/functions/configuring-functions/duration) - Free tier: 10s default/60s max; Pro: 300s; Enterprise: 900s
- [Dynamic rate limiting strategies](https://www.moesif.com/blog/technical/api-development/Mastering-API-Rate-Limiting-Strategies-for-Efficient-Management/) - Adapt based on server load, 80% threshold triggers slowdown

### Tertiary (LOW confidence)
- [Multi-chain token setup guide](https://zerocap.com/insights/research-lab/multichain-token-setup-quantblock/) - Token bridging vs wrapping concepts
- [Symbol collision handling discussions](https://github.com/Uniswap/v2-core/issues/63) - Community recognizes UX problem but no standard solution
- [CoinGecko symbol reservation policy](https://support.coingecko.com/hc/en-us/articles/4498962550681-Can-I-reserve-a-token-symbol-or-use-another-token-s-symbol) - Symbols are not unique/reservable across platforms

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - axios-retry, ioredis, drizzle-orm are industry standards with verified docs
- Architecture: HIGH - Patterns verified with official Birdeye docs and Redis/PostgreSQL best practices
- Pitfalls: MEDIUM - Based on common patterns (rate limiting, timeouts) but not Birdeye-specific war stories

**Research date:** 2026-01-22
**Valid until:** 2026-02-21 (30 days - API docs stable but CU costs/tiers subject to change per Birdeye disclaimer)
