# Phase 2: Whale Detection - Research

**Researched:** 2026-01-27
**Domain:** DEX whale trade detection via Birdeye API
**Confidence:** MEDIUM

## Summary

Whale detection for DEX trades involves fetching large transactions from Birdeye's `/defi/v3/trades/token-by-volume` endpoint and integrating them into the existing whale score calculation. This replaces the current placeholder whale score (based on DefiLlama TVL and Whale Alert) with real on-chain DEX trade data.

The standard approach involves defining whale thresholds based on USD volume ($100k-$500k range), tracking directional flows (buy vs sell), and scoring based on accumulation vs distribution patterns. The existing codebase already has infrastructure for Birdeye API integration, rate limiting, and caching that can be extended for whale trade data.

Key findings indicate that whale thresholds vary by market but $100k is a commonly accepted floor for significant DEX trades, with lookback windows of 24 hours standard for activity metrics. Scoring should weight net flow (accumulation vs distribution), transaction volume, and directional bias.

**Primary recommendation:** Implement a cron job that fetches large trades ($100k+ USD) for tracked tokens every 15 minutes, stores aggregated metrics (buy/sell volumes, net flow, transaction count) in database, and replaces the existing whale score calculation with Birdeye-sourced metrics.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| axios | 1.6.x | HTTP client | Already used for Birdeye API, supports interceptors for API key injection |
| axios-retry | 4.x | Retry logic | Already integrated, handles 429/503 errors with exponential backoff |
| Redis | - | Caching & rate limiting | Existing infrastructure for distributed rate limits and response caching |
| Drizzle ORM | - | Database operations | Existing pattern for token storage, extend for whale trade metrics |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.x | Date calculations | For 24h lookback window calculations |
| zod | 3.x | API response validation | For validating Birdeye trade response structure |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Birdeye trades API | Whale Alert API | Whale Alert requires paid tier ($999/mo) and doesn't provide DEX-specific data |
| Cron-based polling | WebSocket streaming | WebSocket requires Business tier ($499/mo), deferred to v2 |
| Aggregated metrics | Individual trade storage | Storing all trades increases DB size, aggregation sufficient for scoring |

**Installation:**
```bash
# No new dependencies required - using existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/cron/
│   └── poll-whale-trades/   # New cron job for whale detection
├── lib/apis/
│   └── birdeye.ts           # Extend with getWhaleTrades function
├── lib/db/
│   ├── schema.ts            # Add whale_metrics table
│   └── whale-queries.ts     # Extend with Birdeye metrics queries
└── components/tokens/
    └── birdeye-token-table.tsx  # Add whale indicator column
```

### Pattern 1: Aggregated Metrics Storage
**What:** Store pre-aggregated whale metrics (buy volume, sell volume, net flow, tx count) per token per timeframe, not individual trades
**When to use:** When you need fast reads for scoring and the raw trade data isn't needed for display
**Example:**
```typescript
// Database schema for aggregated whale metrics
export const whaleMetricsBirdeye = pgTable('whale_metrics_birdeye', {
  id: serial('id').primaryKey(),
  chain: varchar('chain', { length: 20 }).notNull(),
  tokenAddress: varchar('token_address', { length: 255 }).notNull(),

  // 24h aggregated metrics
  buyVolume24h: numeric('buy_volume_24h', { precision: 20, scale: 2 }).default('0'),
  sellVolume24h: numeric('sell_volume_24h', { precision: 20, scale: 2 }).default('0'),
  buyCount24h: integer('buy_count_24h').default(0),
  sellCount24h: integer('sell_count_24h').default(0),
  netFlow24h: numeric('net_flow_24h', { precision: 20, scale: 2 }).default('0'), // buy - sell

  // Metadata
  largestTrade24h: numeric('largest_trade_24h', { precision: 20, scale: 2 }),
  lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
}, (table) => ({
  compositeIdx: uniqueIndex('whale_metrics_chain_address_idx')
    .on(table.chain, table.tokenAddress),
}));
```

### Pattern 2: Sequential Chain Processing with Rate Limit Management
**What:** Poll chains one at a time, checking rate limit headroom before each chain, adjusting coverage based on available quota
**When to use:** When API has account-level rate limits shared across all endpoints (Birdeye free tier: 100 req/min)
**Example:**
```typescript
// Source: Existing poll-birdeye cron pattern
for (const chain of CHAIN_PRIORITY) {
  // Check rate limit before each chain
  const rateCheck = await checkRateLimit(RATE_LIMITS.BIRDEYE_ACCOUNT);
  if (!rateCheck.allowed) {
    console.log(`Rate limit hit at chain ${chain}, stopping`);
    break;
  }

  // Fetch whale trades for this chain
  const trades = await getWhaleTrades(chain, tokenAddresses, threshold);

  // Small delay between chains (100ms)
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### Pattern 3: Dynamic TTL Based on Rate Limit Headroom
**What:** Cache whale metrics with longer TTL when rate limit headroom is low, shorter TTL when headroom is high
**When to use:** When balancing data freshness with API quota constraints
**Example:**
```typescript
// Source: Existing getBirdeyeDynamicTTL pattern
function getWhaleDynamicTTL(headroomPercent: number): number {
  if (headroomPercent > 70) return 15 * 60;  // 15 min when plenty of quota
  if (headroomPercent > 40) return 20 * 60;  // 20 min when moderate
  return 30 * 60;                             // 30 min when tight (stale allowed)
}
```

### Pattern 4: Whale Score Calculation with Multi-Factor Weighting
**What:** Score whale activity 0-100 based on multiple factors: net flow direction, transaction volume, accumulation ratio
**When to use:** Converting raw metrics into actionable scores for ranking
**Example:**
```typescript
// Based on existing whale score patterns and industry research
function calculateWhaleScore(metrics: WhaleMetrics): number {
  let score = 50; // Neutral baseline

  // Factor 1: Net flow direction (max +/-25 points)
  // Positive = accumulation = bullish
  const netFlow = metrics.buyVolume24h - metrics.sellVolume24h;
  const flowImpact = Math.min(25, Math.abs(netFlow) / 10_000_000);
  score += netFlow > 0 ? flowImpact : -flowImpact;

  // Factor 2: Transaction volume (max +/-15 points)
  const totalCount = metrics.buyCount24h + metrics.sellCount24h;
  if (totalCount > 50) score += 15;
  else if (totalCount > 20) score += 10;
  else if (totalCount > 5) score += 5;
  else if (totalCount === 0) score -= 5;

  // Factor 3: Accumulation ratio (max +/-10 points)
  const totalVolume = metrics.buyVolume24h + metrics.sellVolume24h;
  if (totalVolume > 0) {
    const buyRatio = metrics.buyVolume24h / totalVolume;
    if (buyRatio > 0.7) score += 10;      // Strong accumulation
    else if (buyRatio > 0.55) score += 5;
    else if (buyRatio < 0.3) score -= 10; // Strong distribution
    else if (buyRatio < 0.45) score -= 5;
  }

  return Math.max(0, Math.min(100, score)); // Clamp 0-100
}
```

### Anti-Patterns to Avoid
- **Storing all individual trades:** Bloats database, slow queries. Store aggregated metrics instead.
- **Parallel chain polling:** Exhausts shared rate limit quickly. Use sequential processing.
- **Fixed whale thresholds across all chains:** $100k on Ethereum != $100k on smaller chains. Consider chain-specific thresholds.
- **Ignoring buy/sell direction:** Net flow matters more than total volume. Always track directionally.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting across instances | Custom counter | Existing Redis-based checkRateLimit | Already distributed, handles window resets, supports headroom checking |
| API retry logic | Manual retry loops | axios-retry with exponential backoff | Handles 429/503 errors, configurable delay, already integrated |
| Date range calculations | Custom date math | date-fns for startOfDay, subHours | Handles timezones, DST, edge cases |
| Token address resolution | Manual DB queries | Existing getTokenAddresses pattern | Handles pagination, chain filtering, performance optimization |
| Cache invalidation | Time-based manual clearing | Redis TTL with dynamic adjustment | Automatic expiry, memory efficient, headroom-based tuning |

**Key insight:** The codebase already has battle-tested patterns for Birdeye API integration (poll-birdeye cron), rate limiting (distributed Redis), and whale scoring (whale-queries.ts). Extend these patterns rather than creating parallel systems.

## Common Pitfalls

### Pitfall 1: Endpoint Path Confusion
**What goes wrong:** Birdeye docs reference multiple trade endpoints with similar names
**Why it happens:**
- `/defi/txs/token` - General trades endpoint (existing in codebase)
- `/defi/v3/trades/token-by-volume` - Volume-filtered trades endpoint (requirement)
- Path confusion leads to wrong data or 404 errors

**How to avoid:**
- Use full path `/defi/v3/trades/token-by-volume` as specified in requirements
- Verify response structure matches expected whale trade format
- Test with known high-volume tokens first

**Warning signs:**
- API returns 404 despite valid authentication
- Trade results don't respect volume filters
- Response structure missing volumeUsd field

### Pitfall 2: Chain-Specific Token Addressing
**What goes wrong:** Same token symbol on different chains requires different addresses for API calls
**Why it happens:** Birdeye requires both `address` and `x-chain` header, tokens have unique addresses per chain (e.g., USDC on Ethereum vs USDC on Solana are different addresses)
**How to avoid:**
- Store token address per chain in database (already done via composite index)
- Always pass chain parameter with address in API calls
- Query tokens by (chain, address) composite key, not just address

**Warning signs:**
- Getting wrong token data (e.g., querying Ethereum USDC on Solana chain)
- API errors about token not found on chain
- Volume/price mismatches

### Pitfall 3: Whale Threshold Rigidity
**What goes wrong:** Using fixed $100k threshold across all chains and tokens leads to noise (too many small-cap trades) or silence (missing large-cap whales)
**Why it happens:** $100k is 0.001% of a $100M cap token but 10% of a $1M cap token. Context matters.
**How to avoid:**
- Start with $100k as baseline (industry standard for OTC desks)
- Consider dynamic thresholds based on token market cap or liquidity
- Alternative: Use percentile-based thresholds (top 1% of trades for that token)
- Document threshold choice in code comments

**Warning signs:**
- Whale score always 0 for large cap tokens
- Whale score always 100 for small cap tokens
- No variation in scores across tokens

### Pitfall 4: Ignoring API Response Pagination
**What goes wrong:** Birdeye trade endpoint returns max 500 trades per call. Assuming all trades fit in one response misses data.
**Why it happens:** Documentation mentions 500 limit, but easy to overlook when testing with low-volume tokens
**How to avoid:**
- Check response for `hasMore` or pagination indicators
- Implement offset/limit pagination if needed
- For whale detection, recent trades (first 500) may be sufficient vs full history
- Document decision to truncate or paginate

**Warning signs:**
- Metrics plateau at certain values
- High-volume tokens show same trade count as low-volume tokens
- Inconsistent metrics on successive fetches

### Pitfall 5: Stale Metrics in High-Frequency Markets
**What goes wrong:** 15-minute cron updates mean whale scores lag reality by up to 15 minutes during volatile periods
**Why it happens:** Polling-based architecture (no WebSocket) + rate limit constraints = refresh latency
**How to avoid:**
- Document "as of" timestamp on whale indicators in UI
- Show "last updated X minutes ago" badge
- Accept 15min lag as v1 limitation (WebSocket is v2 feature)
- Consider on-demand refresh for high-priority tokens (within rate limits)

**Warning signs:**
- Users report whale scores don't match real-time DEX activity
- Scores don't update during volatile events
- Confusion about data freshness

## Code Examples

Verified patterns from official sources:

### Birdeye Whale Trades API Call
```typescript
// Based on Birdeye API documentation and existing client pattern
export async function getWhaleTrades(
  chain: BirdeyeChain,
  tokenAddress: string,
  minVolumeUsd: number = 100000, // $100k default threshold
  timeFrom?: number, // Unix timestamp
  timeTo?: number    // Unix timestamp
): Promise<BirdeyeTrade[]> {
  try {
    const params: Record<string, unknown> = {
      address: tokenAddress,
      min_volume: minVolumeUsd,
      volume_type: 'usd',
      limit: 500, // Max per API docs
    };

    if (timeFrom) params.time_from = timeFrom;
    if (timeTo) params.time_to = timeTo;

    const response = await api.get<BirdeyeTradesResponse>(
      '/defi/v3/trades/token-by-volume',
      {
        params,
        headers: {
          'x-chain': chain,
        },
      }
    );

    if (!response.data?.success || !response.data?.data?.items) {
      return [];
    }

    return response.data.data.items.map((t) => ({
      txHash: t.txHash,
      blockTime: t.blockUnixTime,
      source: t.source,
      side: t.side,
      tokenAddress: t.address,
      amount: t.amount,
      priceUsd: t.priceUsd,
      volumeUsd: t.volumeUsd,
    }));
  } catch (error) {
    console.error(`[Birdeye] Error fetching whale trades for ${tokenAddress}:`, error);
    return [];
  }
}
```

### Aggregate Whale Metrics from Trades
```typescript
interface WhaleMetricsAggregated {
  buyVolume24h: number;
  sellVolume24h: number;
  buyCount24h: number;
  sellCount24h: number;
  netFlow24h: number;
  largestTrade24h: number;
}

function aggregateWhaleTrades(trades: BirdeyeTrade[]): WhaleMetricsAggregated {
  const metrics: WhaleMetricsAggregated = {
    buyVolume24h: 0,
    sellVolume24h: 0,
    buyCount24h: 0,
    sellCount24h: 0,
    netFlow24h: 0,
    largestTrade24h: 0,
  };

  for (const trade of trades) {
    if (trade.side === 'buy') {
      metrics.buyVolume24h += trade.volumeUsd;
      metrics.buyCount24h++;
    } else {
      metrics.sellVolume24h += trade.volumeUsd;
      metrics.sellCount24h++;
    }

    metrics.largestTrade24h = Math.max(
      metrics.largestTrade24h,
      trade.volumeUsd
    );
  }

  metrics.netFlow24h = metrics.buyVolume24h - metrics.sellVolume24h;

  return metrics;
}
```

### UI Component for Whale Indicator
```typescript
// Pattern: Directional color coding (green = buys, red = sells)
interface WhaleIndicatorProps {
  buyVolume: number;
  sellVolume: number;
  netFlow: number;
}

function WhaleIndicator({ buyVolume, sellVolume, netFlow }: WhaleIndicatorProps) {
  const totalVolume = buyVolume + sellVolume;
  const buyRatio = totalVolume > 0 ? buyVolume / totalVolume : 0;

  // Determine color based on net flow
  const isAccumulation = netFlow > 0;
  const color = isAccumulation ? 'text-green-500' : 'text-red-500';
  const bgColor = isAccumulation ? 'bg-green-500/10' : 'bg-red-500/10';

  return (
    <div className={cn('flex items-center gap-2 px-2 py-1 rounded', bgColor)}>
      <div className={cn('text-sm font-mono', color)}>
        {formatVolume(Math.abs(netFlow))}
      </div>
      <div className="text-xs text-muted-foreground">
        {(buyRatio * 100).toFixed(0)}% buy
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Whale Alert API for CEX transfers | DEX trade data via Birdeye | 2024-2025 | More relevant for DeFi ecosystems, captures DEX-native activity |
| Fixed whale thresholds | Dynamic thresholds based on market cap | 2025 | Reduces false positives on small-cap tokens |
| Individual trade storage | Aggregated metrics storage | Ongoing | Reduces storage costs, faster queries |
| 1h cron polling | 15min cron polling | Current | Balance between freshness and rate limits |

**Deprecated/outdated:**
- **Whale Alert dominance:** Was gold standard for whale tracking, but focuses on CEX and large wallet transfers. DEX era requires trade-level granularity.
- **Ignoring directional flow:** Old systems only tracked "large transaction count". Modern approach weights buy vs sell direction heavily.
- **WebSocket for retail apps:** 2025-2026 trend shows polling at 15min intervals sufficient for most use cases, WebSocket overkill unless HFT.

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal whale threshold per chain**
   - What we know: $100k is standard for OTC desks, industry baseline
   - What's unclear: Should Solana use different threshold than Ethereum due to gas costs and typical trade sizes?
   - Recommendation: Start with $100k universal, add chain-specific config if noise/silence issues emerge

2. **Trade endpoint exact response structure**
   - What we know: Endpoint path `/defi/v3/trades/token-by-volume` confirmed via docs
   - What's unclear: Full response schema (WebFetch failed on docs page)
   - Recommendation: Test endpoint early in implementation, add response validation with zod schema

3. **Handling multi-DEX aggregation**
   - What we know: Birdeye aggregates from multiple DEXs (Uniswap, Raydium, etc.)
   - What's unclear: Whether `source` field in response identifies specific DEX, and if filtering by DEX makes sense
   - Recommendation: Accept all DEX sources in v1, consider per-DEX breakdowns in v2 if useful

4. **Score weight in overall ranking**
   - What we know: Current ranking uses 5 factors (sentiment, technical, whale, AI, price)
   - What's unclear: Whether whale score weight should change now that it's real data vs placeholder
   - Recommendation: Keep existing 20% weight initially, adjust based on backtesting if needed

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns in `/src/lib/apis/birdeye.ts` and `/src/app/api/cron/poll-birdeye/route.ts`
- Existing whale scoring logic in `/src/lib/apis/whale.ts` (calculateWhaleScoreFromMetrics)
- Redis-based rate limiting implementation in `/src/lib/rate-limiter/distributed.ts`

### Secondary (MEDIUM confidence)
- [Birdeye Trades - Token Filtered By Volume (V3)](https://docs.birdeye.so/reference/get-defi-v3-token-txs-by-volume) - API endpoint documentation
- [Filter, Analyze, and Discover Token Activity with Trades by Volume](https://bds.birdeye.so/blog/detail/filter-analyze-and-discover-token-activity-with-trades-by-volume-v3) - Feature overview
- [Bitcoin: Exchange Whale Ratio](https://cryptoquant.com/asset/btc/chart/flow-indicator/exchange-whale-ratio) - Industry whale metrics patterns
- [Best Crypto OTC Trading Platform 2026](https://ventureburn.com/crypto-otc-trading-platform/) - Whale threshold research ($100k standard)
- [Best Crypto Whale Trackers 2026](https://cryptonews.com/cryptocurrency/best-crypto-whale-trackers/) - UI patterns for whale indicators

### Tertiary (LOW confidence)
- WebSearch results about whale detection timeframes (1h/4h mentioned but not authoritative)
- General crypto trading best practices (varied sources, no single authority)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase patterns, no new dependencies
- Architecture: HIGH - Clear extension of proven poll-birdeye pattern
- Pitfalls: MEDIUM - Based on docs review and codebase analysis, but trade endpoint not directly tested
- Threshold values: MEDIUM - $100k supported by OTC desk standards, but chain-specific thresholds unverified
- UI patterns: MEDIUM - Based on industry platforms, not Birdeye-specific guidance

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable API patterns)

**Key uncertainties flagged for validation:**
1. Trade endpoint exact response structure (recommend early test)
2. Chain-specific threshold tuning (recommend start universal, adjust empirically)
3. Whale score weight in overall ranking (recommend keep 20%, backtest if needed)
