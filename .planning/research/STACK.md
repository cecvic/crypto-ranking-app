# Stack Research: Birdeye API Integration

**Project:** crypto-ranking - Birdeye API migration
**Researched:** 2026-01-21
**Overall Confidence:** HIGH

## Executive Summary

The project already has a solid Birdeye integration foundation in `/src/lib/apis/birdeye.ts` using axios with retry logic. The recommended approach is to **extend the existing pattern** rather than introducing new dependencies. Birdeye has no official TypeScript SDK - direct REST API calls via axios is the standard approach.

---

## Recommended Approach

**Use the existing axios-based pattern with enhancements for multi-chain orchestration.**

**Rationale:**
1. The codebase already uses axios + axios-retry consistently (CoinGecko, DexScreener, etc.)
2. Birdeye provides no official SDK - REST API is the canonical integration method
3. The existing `birdeye.ts` already implements the correct authentication pattern (`X-API-KEY` header)
4. Rate limiting infrastructure (Redis-based) is already in place

**Confidence: HIGH** - Verified via [Birdeye official documentation](https://docs.birdeye.so/docs/overview)

---

## HTTP Client

### Recommendation: Continue with axios + axios-retry

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **axios + axios-retry** | RECOMMENDED | Already in use, proven patterns, retry/backoff built-in |
| Native fetch | NOT RECOMMENDED | Would require manual retry logic, breaks consistency |
| Official SDK | N/A | Birdeye does not provide an official TypeScript SDK |
| Community SDKs | NOT RECOMMENDED | No actively maintained community packages found |

**Current implementation is correct:**
```typescript
// From existing birdeye.ts - no changes needed
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
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429 ||
           error.response?.status === 503;
  },
});
```

**Confidence: HIGH** - Matches existing codebase patterns and Birdeye docs

---

## Rate Limiting Strategy

### Birdeye Rate Limit Structure

**Key insight:** Birdeye applies rate limits **PER ACCOUNT**, not per endpoint. All API calls share a single quota.

| Tier | Requests/Second | Requests/Minute | Notes |
|------|-----------------|-----------------|-------|
| Standard | 1 rps | - | 3 endpoints only |
| Lite | 15 rps | - | Full API |
| Starter | 15 rps | - | Full API |
| Premium | 50 rps | 1000 rpm | Full API |
| Business | 100 rps | 1500 rpm | Full API + WebSocket |
| Enterprise | Custom | Custom | Negotiated |

**Per-endpoint limits also apply:**
- Price endpoints: 300 rps
- Trade endpoints: 100 rps
- Token list v3 scroll: **2 rps** (very restrictive)
- Wallet APIs: 30 rps, 150 rpm (beta)

### Recommendation: Enhance existing rate limiter

The existing `RATE_LIMITS.BIRDEYE` in `/src/lib/rate-limiter/distributed.ts` is set to 100/minute. This should be updated to match your actual tier:

```typescript
// Update based on your Birdeye subscription tier
BIRDEYE: {
  key: 'ratelimit:birdeye',
  limit: 50,      // Premium tier: 50 rps
  window: 1,      // 1 second window for rps
},
BIRDEYE_MINUTE: {
  key: 'ratelimit:birdeye:minute',
  limit: 1000,    // Premium tier: 1000 rpm
  window: 60,
},
```

**Multi-chain consideration:** Each chain counts against the SAME rate limit. When querying 11 chains, budget accordingly:
- 11 chains at 4 requests each = 44 requests
- At Premium tier (50 rps), this is nearly a full second's quota

**Confidence: HIGH** - Verified via [Birdeye Rate Limiting docs](https://docs.birdeye.so/docs/rate-limiting)

---

## Multi-Chain Orchestration

### Supported Chains

Birdeye supports 11+ chains via the `x-chain` header:

| Chain | Identifier | Notes |
|-------|------------|-------|
| Solana | `solana` | Primary chain, full support |
| Ethereum | `ethereum` | Full support |
| Arbitrum | `arbitrum` | Full support |
| Avalanche | `avalanche` | Full support |
| BSC | `bsc` | Full support |
| Optimism | `optimism` | Full support |
| Polygon | `polygon` | Full support |
| Base | `base` | Full support |
| zkSync | `zksync` | Full support |
| Sui | `sui` | Limited - no wallet APIs, market cap may be missing |
| Aptos | `aptos` | New addition |

### Recommendation: Parallel requests with rate-aware batching

**Pattern:** Query multiple chains in parallel, respecting aggregate rate limit.

```typescript
// Recommended multi-chain orchestration pattern
const BIRDEYE_CHAINS = [
  'solana', 'ethereum', 'arbitrum', 'avalanche',
  'bsc', 'optimism', 'polygon', 'base', 'zksync', 'sui', 'aptos'
] as const;

async function fetchAllChains<T>(
  endpoint: string,
  params: Record<string, unknown>,
  concurrency: number = 3  // Conservative: 3 chains at a time
): Promise<Map<string, T>> {
  const results = new Map<string, T>();

  // Process in batches to respect rate limits
  for (let i = 0; i < BIRDEYE_CHAINS.length; i += concurrency) {
    const batch = BIRDEYE_CHAINS.slice(i, i + concurrency);

    await waitForRateLimit(RATE_LIMITS.BIRDEYE);

    const batchResults = await Promise.all(
      batch.map(chain =>
        fetchChain<T>(endpoint, params, chain)
          .catch(err => ({ chain, error: err }))
      )
    );

    batchResults.forEach((result, idx) => {
      if (!('error' in result)) {
        results.set(batch[idx], result);
      }
    });
  }

  return results;
}
```

**Why concurrency = 3:**
- 11 chains / 3 = ~4 batches
- At 50 rps, 3 parallel requests per second is conservative
- Leaves headroom for other API calls

**Confidence: MEDIUM** - Pattern is sound, but optimal concurrency depends on actual tier

---

## Caching Strategy

### Birdeye-Specific Cache Keys

Extend existing `CACHE_KEYS` in `/src/lib/cache/redis.ts`:

```typescript
// Add to CACHE_KEYS
BIRDEYE_TOKEN_PRICE: (chain: string, address: string) =>
  `birdeye:price:${chain}:${address}`,
BIRDEYE_TOKEN_LIST: (chain: string) =>
  `birdeye:tokenlist:${chain}`,
BIRDEYE_OHLCV: (chain: string, address: string, interval: string) =>
  `birdeye:ohlcv:${chain}:${address}:${interval}`,
BIRDEYE_TRENDING: (chain: string) =>
  `birdeye:trending:${chain}`,
BIRDEYE_SECURITY: (chain: string, address: string) =>
  `birdeye:security:${chain}:${address}`,
```

### Recommended TTLs

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Token price | 30s | Price data is time-sensitive |
| Token list | 5m | Token list changes infrequently |
| OHLCV | 60s | Candle data aggregates over time |
| Trending tokens | 2m | Trends shift, but not second-by-second |
| Security info | 1h | Security data rarely changes |
| Token metadata | 24h | Name, symbol, decimals are static |

```typescript
// Add to CACHE_TTL
BIRDEYE_PRICE: 30,          // 30 seconds
BIRDEYE_TOKEN_LIST: 300,    // 5 minutes
BIRDEYE_OHLCV: 60,          // 1 minute
BIRDEYE_TRENDING: 120,      // 2 minutes
BIRDEYE_SECURITY: 3600,     // 1 hour
BIRDEYE_METADATA: 86400,    // 24 hours
```

### Compute Unit Optimization

Birdeye charges "compute units" (CUs) per API call:

| Endpoint | Compute Units | Strategy |
|----------|---------------|----------|
| Supported networks | 1 CU | Cache indefinitely |
| Token metadata | 5 CU | Cache 24h, fetch once |
| Token price | 10 CU | Cache 30s, aggregate multi-price |
| OHLCV | 40 CU | Cache 60s, expensive |
| Token list v3 scroll | 500 CU | AVOID - use v1 (30 CU) |
| Wallet tx history | 150 CU | Cache heavily |

**Key optimization:** Use the multi-price endpoint (`/defi/multi_price`) for batch price lookups. Fetching 50 tokens individually = 500 CU; batch = fewer calls, same rate limit cost.

**Confidence: HIGH** - Verified via [Birdeye Compute Unit docs](https://docs.birdeye.so/docs/compute-unit-cost)

---

## Existing Infrastructure Integration

### What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| Birdeye API client | Partial | `/src/lib/apis/birdeye.ts` |
| Rate limiter | Ready | `/src/lib/rate-limiter/distributed.ts` |
| Redis cache | Ready | `/src/lib/cache/redis.ts` |
| Cache strategy | Ready | `/src/lib/cache/strategy.ts` |
| Types | Partial | `/src/lib/types/index.ts` |

### What Needs Extension

1. **birdeye.ts** - Add multi-price, OHLCV, token search endpoints
2. **types/index.ts** - Extend `BirdeyeToken` for OHLCV, search results
3. **redis.ts** - Add Birdeye-specific cache keys and TTLs
4. **distributed.ts** - Update rate limit to match subscription tier

---

## No New Dependencies Required

The existing stack is sufficient:

| Dependency | Already Installed | Purpose |
|------------|-------------------|---------|
| axios | Yes | HTTP client |
| axios-retry | Yes | Retry with backoff |
| @upstash/redis | Yes | Distributed caching |

**Do not add:**
- No Birdeye SDK (none exists)
- No additional HTTP libraries
- No new rate limiting packages

**Confidence: HIGH** - Verified via existing package.json and codebase review

---

## Confidence Assessment

| Recommendation | Confidence | Source |
|----------------|------------|--------|
| Use axios (no SDK) | HIGH | [Birdeye docs](https://docs.birdeye.so) - no SDK mentioned |
| X-API-KEY header | HIGH | [Birdeye overview](https://docs.birdeye.so/docs/overview) |
| Rate limits per account | HIGH | [Rate limiting docs](https://docs.birdeye.so/docs/rate-limiting) |
| 11 supported chains | HIGH | [Supported networks](https://docs.birdeye.so/docs/supported-networks) |
| Multi-price batching | MEDIUM | Documented, not tested |
| Concurrency = 3 | LOW | Heuristic, needs tuning |
| TTL values | MEDIUM | Based on data volatility estimates |

---

## Sources

- [Birdeye Documentation](https://docs.birdeye.so/)
- [Birdeye API Overview](https://docs.birdeye.so/docs/overview)
- [Birdeye Rate Limiting](https://docs.birdeye.so/docs/rate-limiting)
- [Birdeye Per-API Rate Limits](https://docs.birdeye.so/docs/per-api-rate-limit)
- [Birdeye Supported Networks](https://docs.birdeye.so/docs/supported-networks)
- [Birdeye Compute Unit Costs](https://docs.birdeye.so/docs/compute-unit-cost)
- [Birdeye Pricing](https://docs.birdeye.so/docs/pricing)
