# Architecture

**Analysis Date:** 2026-01-21

## Pattern Overview

**Overall:** Layered monolith with real-time event processing and multi-source data aggregation, built on Next.js App Router.

**Key Characteristics:**
- **Real-time ranking engine**: Continuously aggregates signals (sentiment, technical, whale activity, AI predictions) into composite scores
- **Event-driven cron pipeline**: Scheduled background jobs orchestrate data collection, aggregation, and ranking computation
- **Multi-source data federation**: Integrates external APIs (CoinGecko, LunarCrush, TAAPI, DeFiLlama, Alchemy, DexScreener) with local fallbacks
- **Layered caching**: Redis (hot) → PostgreSQL (warm) → In-memory fallback (cold) strategy for resilience
- **Client-side reactive queries**: React Query handles client-side state with automatic refetch on stale data


## Layers

**Presentation (Frontend):**
- Purpose: React-based UI for dashboard, coin details, whale alerts, chat, and opportunities
- Location: `src/app/` (pages), `src/components/` (UI components)
- Contains: Next.js page components, React client components, hooks for data fetching
- Depends on: API routes, React Query hooks, UI library (Radix UI/Tailwind)
- Used by: End users via browser

**API Routes (Backend Entry Points):**
- Purpose: RESTful endpoints that fetch from cache/database or trigger computation
- Location: `src/app/api/`
- Contains: GET handlers for data retrieval, POST handlers for mutations, cron verification
- Depends on: Cache layer, database queries, external APIs, business logic (ranking, whale tracking)
- Used by: Client components, external services (webhooks from Alchemy), scheduled tasks (Upstash QStash)

**Business Logic Layer:**
- Purpose: Core algorithms and domain-specific operations
- Location: `src/lib/ranking/`, `src/lib/opportunity/`, `src/lib/confluence/`, `src/lib/defi/`
- Contains: Ranking calculation (`calculator.ts`), opportunity detection, technical analysis scoring
- Depends on: Types, utility functions, external API clients
- Used by: API routes, cron jobs

**Data Access Layer:**
- Purpose: Abstraction over database (Neon PostgreSQL + Drizzle ORM) and Redis cache
- Location: `src/lib/db/queries.ts`, `src/lib/cache/redis.ts`
- Contains: Query builders, cache strategies, schema definitions
- Depends on: Database client (Neon), Redis client (Upstash), schema types
- Used by: Business logic, API routes

**External API Integration Layer:**
- Purpose: Fetch data from third-party services with error handling and fallbacks
- Location: `src/lib/apis/` (coingecko.ts, whale.ts, sentiment.ts, technical.ts, prediction.ts, birdeye.ts, etc.)
- Contains: API client wrappers for each service, normalization to internal types
- Depends on: HTTP client (axios), rate limiter, types
- Used by: Business logic, cron jobs, fallback strategies

**Infrastructure & Utilities:**
- Purpose: Cross-cutting concerns
- Location: `src/lib/utils/`, `src/lib/constants/`, `src/lib/rate-limiter/`, `src/lib/qstash/`
- Contains: Helper functions, constants, rate limiting, QStash verification
- Used by: All layers


## Data Flow

**Real-Time Ranking Computation (5-minute cycle via QStash):**

1. **Trigger**: Upstash QStash cron job calls `/api/cron/compute-rankings`
2. **Fetch price data**: `compute-rankings` reads cached prices from Redis (populated by `collect-prices`)
3. **Fetch sentiment**: Reads cached sentiment batch from Redis (populated by `collect-sentiment`)
4. **Fetch technical indicators**: Fetches from TAAPI (or computes locally)
5. **Fetch whale activity**: Batch requests to Alchemy or per-coin queries to whale APIs
6. **Fetch AI predictions**: Calls prediction APIs or local model
7. **Compute scores**:
   - Normalize each signal to 0-100 scale
   - Apply weighted aggregation: sentiment (0.20) + technical (0.25) + whale (0.20) + AI (0.20) + price_performance (0.15)
   - Rank coins by overall score
8. **Persist**: Create ranking snapshot in PostgreSQL, cache latest in Redis
9. **Response**: Return to QStash scheduler

**Data Collection Pipeline (Parallel cron jobs):**

- `collect-prices` (frequent): Fetches top 100+ coins from CoinGecko, caches in Redis
- `collect-sentiment` (frequent): Fetches social sentiment from LunarCrush/CryptoPanic, caches in Redis
- `check-confluence` (periodic): Identifies technical confluence signals, updates cache
- `poll-opportunities` (periodic): Scans for trading opportunities based on signals, persists to database

**Client Data Fetch Flow:**

1. Client component renders with `useRankings()` hook
2. Hook uses React Query to fetch `/api/rankings` (GET)
3. API handler checks cache layers in order:
   - L1: Redis (hot cache, < 1 minute old)
   - L2: PostgreSQL (recent snapshot, < 1 minute old)
   - L3: In-memory fallback (graceful degradation)
4. If cache miss, trigger fresh computation (only in error scenarios)
5. Response includes `cached: true/false` and timestamp
6. React Query caches for 30s, refetches on stale, garbage collects after 5 min

**Event-Driven Whale Transaction Flow:**

1. Alchemy webhook sends ERC20 transfer event to `/api/webhooks/alchemy`
2. Handler extracts token address, amount, from/to addresses
3. Maps token to CoinGecko ID
4. Stores in `whale_events` table with metadata
5. Aggregates into metrics (24h large transactions, exchange flows)
6. Updates whale score used in next ranking computation


**State Management:**

- **Server state**: PostgreSQL (rankings, alerts, user preferences), Redis (computed aggregates, cache)
- **Client state**: React Query caches (rankings, coins, charts), Zustand stores (UI state, preferences)
- **No global mutable state**: Each computation cycle generates immutable snapshots


## Key Abstractions

**CoinRanking:**
- Purpose: Unified representation of a coin with all signal components
- Examples: `src/lib/types/index.ts`, returned by `/api/rankings`
- Pattern: Composite score object containing price, sentiment, technical, whale, AI, and overall scores
- Structure: `{ coin: CoinPrice, scores: { sentiment, technical, whale, ai, pricePerformance, overall }, rank }`

**Signal Layers:**
- Purpose: Normalize diverse data sources to 0-100 comparable scores
- Examples: `SentimentData`, `TechnicalAnalysis`, `WhaleActivity`, `AIPrediction` types
- Pattern: Each signal wraps source data + normalized score
- Usage: Weighted aggregation in `calculateRankingScore()`

**Cache Strategy:**
- Purpose: Provide unified interface for multi-tier caching
- Location: `src/lib/cache/redis.ts`, `src/lib/cache/strategy.ts`
- Pattern: Try Redis → fall back to database → fall back to in-memory
- Invalidation: TTL-based (2-15 min depending on signal freshness requirements)

**API Clients as Singletons:**
- Purpose: Reuse connection pools, manage rate limits
- Examples: Redis, Neon database, external API wrappers
- Pattern: Lazy initialization with fallback (e.g., `getRedis()` returns singleton or throws)
- Risk: Build-time errors if secrets not configured (mitigated by lazy init)


## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx` (root layout with ClerkProvider, QueryProvider)
- Triggers: User navigates to app
- Responsibilities: Authentication, data fetching via React Query, rendering dashboard/pages

**Dashboard Page:**
- Location: `src/app/dashboard/page.tsx`
- Triggers: User visits `/dashboard`
- Responsibilities: Fetch and display rankings, stats cards, top movers, confluence opportunities

**API: Rankings:**
- Location: `src/app/api/rankings/route.ts`
- Triggers: Client `useRankings()` hook or external service
- Responsibilities: Multi-tier cache check, fallback to computation, return latest coin rankings

**API: Chat:**
- Location: `src/app/api/chat/route.ts`
- Triggers: User sends message in chat interface
- Responsibilities: Stream AI response via Vercel AI SDK with OpenAI backend

**Cron: Compute Rankings:**
- Location: `src/app/api/cron/compute-rankings/route.ts`
- Triggers: Upstash QStash scheduler (every 5 minutes)
- Responsibilities: Aggregate all signals, calculate ranking scores, persist snapshot, update cache

**Cron: Collect Prices:**
- Location: `src/app/api/cron/collect-prices/route.ts`
- Triggers: Upstash QStash scheduler (every 2-5 minutes)
- Responsibilities: Fetch top coins from CoinGecko, cache in Redis

**Cron: Collect Sentiment:**
- Location: `src/app/api/cron/collect-sentiment/route.ts`
- Triggers: Upstash QStash scheduler (every 15-30 minutes)
- Responsibilities: Fetch social sentiment from LunarCrush/CryptoPanic, cache in Redis

**Webhook: Alchemy Transfers:**
- Location: `src/app/api/webhooks/alchemy/route.ts`
- Triggers: Alchemy webhook on ERC20 transfer events
- Responsibilities: Extract whale transaction details, store in `whale_events` table, update metrics


## Error Handling

**Strategy:** Graceful degradation with fallback layers and detailed logging.

**Patterns:**

1. **API client timeouts**: Wrap external API calls with `fetchWithTimeout()`, catch and log, return empty/default
2. **Database fallback**: Cache read fails → try in-memory fallback → return stale cached data if available
3. **Missing signals**: If sentiment/whale/technical missing, skip that signal in weighted score (use remaining signals)
4. **Computation failures**: Log error, return previous snapshot from cache rather than error
5. **Authentication**: Clerk auth on sensitive endpoints, returns 401 if missing userId
6. **Rate limiting**: Upstash rate-limiter blocks excessive requests, returns 429

Example from `/api/rankings/route.ts`:
```typescript
try {
  const cached = await getCachedRankings();
  if (cached && cacheAge < CACHE_DURATION) {
    return NextResponse.json({ data: cached.rankings, cached: true, ... });
  }
} catch (error) {
  console.warn('Persistent cache read failed, falling back to in-memory:', error);
}

// Fall back to in-memory cache or computation
if (inMemoryCachedRankings.length > 0 && now - inMemoryLastFetchTime < CACHE_DURATION) {
  return NextResponse.json({ data: inMemoryCachedRankings, source: 'memory' });
}
```


## Cross-Cutting Concerns

**Logging:**
- Pattern: Console.log with prefix `[component-name]` for traceability
- Example: `console.log('[compute-rankings] Processing ${coins.length} coins')`
- Centralized in: Each module uses inline logging; no centralized logger

**Validation:**
- Pattern: Zod types imported from `@/lib/types`
- Usage: Type checking at API boundaries (request parsing, response serialization)
- Example: CoinPrice, CoinRanking, FearGreedIndex all have defined interfaces

**Authentication:**
- Pattern: Clerk-based auth via `@clerk/nextjs`
- Protected: Dashboard pages use `ClerkProvider`, API routes check `userId` from `auth()`
- Public endpoints: `/api/health`, webhooks (verified via QStash token)

**Rate Limiting:**
- Pattern: Upstash rate limiter for API endpoints
- Location: `src/lib/rate-limiter/distributed.ts`
- Implementation: Distributed rate limiter using Upstash Redis backend

**Configuration:**
- Pattern: Environment variables (`.env.local`)
- Critical vars: `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, OpenAI API key, external service credentials
- Feature flags: `USE_LOCAL_SENTIMENT`, `USE_PERSISTENT_STORAGE`, `USE_ALCHEMY_WHALE`

---

*Architecture analysis: 2026-01-21*
