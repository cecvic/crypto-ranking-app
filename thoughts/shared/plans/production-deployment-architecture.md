# Implementation Plan: Production Deployment Architecture for CryptoRank

Generated: 2026-01-11
Updated: 2026-01-11 (Pre-Mortem + Strategy Review)

## Strategy: Deploy First, Enhance Later

**Decision:** Deploy infrastructure now, enhance individual services in production.

**Rationale:**
- All 5 ranking factors produce real scores (not mock data)
- Local sentiment uses sentiment.js + RSS + CoinGecko community data
- Local prediction uses linear regression, momentum, Sharpe ratio concepts
- Infrastructure (persistence, caching) is the bigger risk than service quality

**Current Service Status:**

| Service | Status | Implementation |
|---------|--------|----------------|
| Sentiment | ✅ Production-ready | Local analysis with sentiment.js |
| AI Prediction | ✅ Production-ready | Statistical (regression, momentum) |
| Technical Analysis | ⚠️ Fallback mode | Hash-based until TAAPI key added |
| Whale Activity | ⚠️ Partial | DefiLlama (free), optional Whale Alert |
| Price Performance | ✅ Production-ready | CoinGecko data |

**Future Enhancements (post-deployment):**
- Add TAAPI API key for real technical indicators
- Add Token Metrics for ML-based predictions
- Add Whale Alert for transaction monitoring

## Goal

Transform the CryptoRank application from a stateless Next.js app with in-memory caching into a production-ready, scalable system with persistent storage, background data collection, and multi-instance deployment capability.

## Research Summary

### Current Architecture Analysis (VERIFIED)

| Component | Current State | Production Need |
|-----------|--------------|-----------------|
| Caching | In-memory (60s/15min TTL) | Redis + PostgreSQL |
| Storage | None | Neon PostgreSQL |
| Background Jobs | None (on-demand API calls) | Cron-based collectors |
| Deployment | Single instance | Multi-instance with shared state |
| Rate Limits | Per-instance | Pooled across instances |

### External API Analysis

| API | Rate Limit | Current Usage | Hybrid Mode |
|-----|------------|---------------|-------------|
| CoinGecko | 10-30/min (free) | On-demand | Required |
| Alternative.me | Unlimited | On-demand | Required (free) |
| LunarCrush | 1000/day | On-demand | Replaceable (local-sentiment.ts) |
| TAAPI.io | 1/15s (free) | On-demand | Generates mock data |
| CryptoPanic | 1000/day | On-demand | Replaceable (local-sentiment.ts) |
| DefiLlama | Unlimited | On-demand | Required (free) |
| CoinCodex | Unlimited | On-demand | Replaceable (local-prediction.ts) |
| Token Metrics | Varies | On-demand | Replaceable (local-prediction.ts) |
| Whale Alert | 10/min | On-demand | Optional |

### Key Findings from Codebase

1. **Hybrid Mode Ready**: `USE_LOCAL_SENTIMENT` and `USE_LOCAL_PREDICTION` env vars enable zero-cost operation
2. **Type System Solid**: `src/lib/types/index.ts` has comprehensive interfaces for all data
3. **Ranking Logic Clean**: `calculateRankingScore()` and `rankCoins()` are pure functions
4. **No Historical Tracking**: `previousRank` and `rankChange` are calculated but never persisted

---

## Implementation Phases

### Phase 1: Database + Caching Layer

**Objective**: Add persistent storage for rankings history and Redis caching for hot data.

**Estimated Complexity**: Medium (3-4 days)

#### Architecture

```
+------------------+     +------------------+     +------------------+
|   Next.js App    |---->|   Upstash Redis  |---->|   Neon Postgres  |
|                  |     |   (Hot Cache)    |     |   (Cold Storage) |
+------------------+     +------------------+     +------------------+
         |                      |                        |
         |   Cache Miss         |   TTL Expired          |
         +--------------------->+----------------------->|
                                                         |
         <-----------------------------------------------+
              Rankings + Historical Data
```

#### Database Schema (Neon PostgreSQL)

```sql
-- Core ranking snapshots
CREATE TABLE ranking_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fear_greed_value INTEGER,
    fear_greed_classification TEXT,
    total_coins INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_time ON ranking_snapshots(snapshot_time DESC);

-- Individual coin rankings per snapshot
CREATE TABLE coin_rankings (
    id SERIAL PRIMARY KEY,
    snapshot_id INTEGER REFERENCES ranking_snapshots(id) ON DELETE CASCADE,
    coin_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    rank INTEGER NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL,
    sentiment_score DECIMAL(5,2),
    technical_score DECIMAL(5,2),
    whale_score DECIMAL(5,2),
    ai_score DECIMAL(5,2),
    price_performance_score DECIMAL(5,2),
    current_price DECIMAL(20,8),
    market_cap BIGINT,
    price_change_24h DECIMAL(10,4),
    price_change_7d DECIMAL(10,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(snapshot_id, coin_id)
);

CREATE INDEX idx_coin_rankings_coin ON coin_rankings(coin_id, snapshot_id DESC);
CREATE INDEX idx_coin_rankings_snapshot ON coin_rankings(snapshot_id);

-- API response cache (for expensive calls)
CREATE TABLE api_cache (
    id SERIAL PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL,
    data JSONB NOT NULL,
    source TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);

-- Computed rank changes (materialized view)
CREATE MATERIALIZED VIEW coin_rank_changes AS
SELECT
    cr.coin_id,
    cr.symbol,
    cr.rank as current_rank,
    cr.overall_score as current_score,
    prev.rank as previous_rank,
    prev.overall_score as previous_score,
    (prev.rank - cr.rank) as rank_change,
    cr.snapshot_id
FROM coin_rankings cr
LEFT JOIN LATERAL (
    SELECT rank, overall_score, snapshot_id
    FROM coin_rankings cr2
    WHERE cr2.coin_id = cr.coin_id
    AND cr2.snapshot_id < cr.snapshot_id
    ORDER BY cr2.snapshot_id DESC
    LIMIT 1
) prev ON true
WHERE cr.snapshot_id = (SELECT MAX(id) FROM ranking_snapshots);

CREATE UNIQUE INDEX idx_rank_changes_coin ON coin_rank_changes(coin_id);
```

#### Files to Create/Modify

**New Files:**

1. `src/lib/db/client.ts` - Neon connection pool
```typescript
// Neon serverless driver with connection pooling
import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;

export const sql = neon(process.env.DATABASE_URL!);
```

2. `src/lib/db/schema.ts` - Drizzle ORM schema
3. `src/lib/db/queries.ts` - Database operations
4. `src/lib/cache/redis.ts` - Upstash Redis client
5. `src/lib/cache/strategy.ts` - Cache-aside pattern implementation

**Modified Files:**

1. `src/app/api/rankings/route.ts`
   - Replace in-memory cache with Redis lookup
   - Add database persistence for snapshots
   - Implement rank change calculation from DB

2. `package.json`
   - Add: `@neondatabase/serverless`, `drizzle-orm`, `@upstash/redis`, `@upstash/qstash`, `axios-retry`
   - Add dev: `drizzle-kit`

#### Cache Strategy

```
+-------------+     +-------------+     +-------------+
|   Request   |---->|    Redis    |---->|  PostgreSQL |
|             |     |  (60s TTL)  |     |  (Persist)  |
+-------------+     +-------------+     +-------------+
                          |
                    Cache Hit?
                       /    \
                     Yes     No
                      |       |
              Return Data    Query DB
                             Store in Redis
                             Return Data
```

**Redis Keys Structure:**
```
rankings:latest           -> Full rankings JSON (60s TTL)
rankings:coin:{coinId}    -> Single coin ranking (60s TTL)
rankings:history:{coinId} -> Last 7 snapshots (5min TTL)
sentiment:batch           -> Batch sentiment data (15min TTL)
fear_greed:current        -> Fear/Greed index (5min TTL)
```

#### Acceptance Criteria

- [ ] Neon PostgreSQL connection working
- [ ] Rankings persist to database on each refresh
- [ ] Rank changes calculated from historical data
- [ ] Redis caching reduces API response time by 80%
- [ ] Database schema supports time-series queries
- [ ] Graceful fallback to DB on Redis failure

---

### Phase 2: Background Data Collection Service

**Objective**: Move API calls to background cron jobs, eliminating rate limit issues and ensuring fresh data.

**Estimated Complexity**: Medium-High (4-5 days)

#### Architecture

```
+------------------+                    +------------------+
|   Next.js App    |<-------------------|    Upstash       |
|   (Read Only)    |   Rankings API     |    QStash        |
+------------------+                    +------------------+
                                               |
                                         Cron Triggers
                                               |
                              +----------------+----------------+
                              |                |                |
                        +-----v----+    +------v-----+   +------v-----+
                        | Collector|    | Collector  |   | Collector  |
                        | CoinGecko|    | Sentiment  |   | Technical  |
                        +-----+----+    +------+-----+   +------+-----+
                              |                |                |
                              +----------------+----------------+
                                               |
                                         +-----v-----+
                                         | PostgreSQL|
                                         +-----------+
```

#### Collector Jobs

| Job | Frequency | Data | Rate Limit Strategy |
|-----|-----------|------|---------------------|
| `collect-prices` | Every 1 min | CoinGecko top 100 | Single call, batch response |
| `collect-sentiment` | Every 15 min | Local sentiment analysis | No limit (local) |
| `collect-technical` | Every 1 hour | TAAPI or mock TA | 4 coins/min max |
| `collect-whale` | Every 30 min | DefiLlama + Whale Alert | DefiLlama unlimited |
| `collect-predictions` | Every 1 hour | Local predictions | No limit (local) |
| `compute-rankings` | Every 5 min | Aggregate + persist | Internal computation |
| `cleanup-old-data` | Daily | Prune data > 30 days | N/A |

#### Files to Create

**New Package: `packages/collectors/`**

```
packages/
  collectors/
    package.json
    tsconfig.json
    src/
      index.ts              # Cron handler entry point
      jobs/
        collect-prices.ts
        collect-sentiment.ts
        collect-technical.ts
        collect-whale.ts
        collect-predictions.ts
        compute-rankings.ts
        cleanup.ts
      lib/
        queue.ts           # QStash integration
        rate-limiter.ts    # Token bucket implementation
        batch-processor.ts # Parallel batch processing
```

**Vercel Configuration (`vercel.json`):**
```json
{
  "crons": [
    {
      "path": "/api/cron/collect-prices",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/collect-sentiment",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/compute-rankings",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Rate Limit Pooling

```typescript
// src/lib/rate-limiter/distributed.ts
import { Redis } from '@upstash/redis';

interface RateLimitConfig {
  key: string;
  limit: number;
  window: number; // seconds
}

export async function checkRateLimit(
  redis: Redis,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowKey = `ratelimit:${config.key}:${Math.floor(now / (config.window * 1000))}`;

  const current = await redis.incr(windowKey);
  if (current === 1) {
    await redis.expire(windowKey, config.window);
  }

  return {
    allowed: current <= config.limit,
    remaining: Math.max(0, config.limit - current),
    resetAt: Math.ceil(now / (config.window * 1000)) * config.window * 1000
  };
}
```

#### Acceptance Criteria

- [ ] Background collectors running on schedule
- [ ] Rate limits never exceeded (distributed tracking)
- [ ] Frontend reads from pre-computed data only
- [ ] API response time < 100ms (no external calls)
- [ ] Collector failures don't affect frontend
- [ ] QStash dead letter queue for failed jobs

---

### Phase 3: Monorepo Restructure

**Objective**: Organize codebase for scalability with shared types and independent deployment.

**Estimated Complexity**: Medium (3-4 days)

#### Directory Structure

```
crypto-ranking/
  turbo.json
  package.json              # Workspace root
  pnpm-workspace.yaml

  apps/
    web/                    # Next.js frontend
      package.json
      next.config.ts
      src/
        app/
        components/
        hooks/
        providers/

  packages/
    db/                     # Database layer
      package.json
      src/
        client.ts
        schema.ts
        queries.ts
        migrations/

    cache/                  # Redis caching
      package.json
      src/
        client.ts
        strategy.ts
        keys.ts

    types/                  # Shared TypeScript types
      package.json
      src/
        index.ts            # Re-export all types
        coins.ts
        rankings.ts
        api-responses.ts

    ranking-engine/         # Core ranking logic
      package.json
      src/
        calculator.ts
        weights.ts
        signals.ts

    collectors/             # Background data collection
      package.json
      src/
        jobs/
        lib/

    api-clients/            # External API wrappers
      package.json
      src/
        coingecko.ts
        sentiment/
        technical/
        whale/
        prediction/

    config/                 # Shared configuration
      package.json
      eslint/
      typescript/
```

#### Turbo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

#### Package Dependencies

```
apps/web
  |-- @crypto-ranking/types
  |-- @crypto-ranking/db
  |-- @crypto-ranking/cache
  |-- @crypto-ranking/ranking-engine

packages/collectors
  |-- @crypto-ranking/types
  |-- @crypto-ranking/db
  |-- @crypto-ranking/cache
  |-- @crypto-ranking/api-clients
  |-- @crypto-ranking/ranking-engine

packages/ranking-engine
  |-- @crypto-ranking/types

packages/api-clients
  |-- @crypto-ranking/types
```

#### Migration Steps

1. Initialize Turborepo workspace
2. Create package scaffolding
3. Move types to `packages/types`
4. Move ranking logic to `packages/ranking-engine`
5. Move API clients to `packages/api-clients`
6. Move app to `apps/web`
7. Update all imports to use package names
8. Verify build and type checking

#### Acceptance Criteria

- [ ] `pnpm build` builds all packages in correct order
- [ ] `pnpm dev` starts web app with hot reload
- [ ] Packages publish-ready with correct exports
- [ ] TypeScript project references working
- [ ] Shared ESLint/Prettier configuration
- [ ] No circular dependencies

---

### Phase 4: Production Deployment + Monitoring

**Objective**: Deploy to Vercel with proper monitoring, alerting, and observability.

**Estimated Complexity**: Medium (3-4 days)

#### Deployment Architecture

```
                           +------------------+
                           |   Cloudflare     |
                           |   (DNS + CDN)    |
                           +--------+---------+
                                    |
                           +--------v---------+
                           |     Vercel       |
                           |   (Edge + SSR)   |
                           +--------+---------+
                                    |
              +---------------------+---------------------+
              |                     |                     |
     +--------v--------+   +--------v--------+   +--------v--------+
     | Upstash Redis   |   | Neon PostgreSQL |   | Upstash QStash  |
     | (Cache Layer)   |   | (Persistence)   |   | (Job Queue)     |
     +-----------------+   +-----------------+   +-----------------+
```

#### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...@neon.tech/crypto_ranking

# Cache
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Job Queue
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...

# External APIs (optional in hybrid mode)
COINGECKO_API_KEY=...
USE_LOCAL_SENTIMENT=true
USE_LOCAL_PREDICTION=true

# Monitoring
SENTRY_DSN=...
AXIOM_TOKEN=...
```

#### Vercel Project Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "pnpm turbo build --filter=web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "crons": [
    { "path": "/api/cron/collect-prices", "schedule": "* * * * *" },
    { "path": "/api/cron/collect-sentiment", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/compute-rankings", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "s-maxage=60, stale-while-revalidate=300" }
      ]
    }
  ]
}
```

#### Monitoring Stack

| Tool | Purpose | Integration |
|------|---------|-------------|
| Sentry | Error tracking | `@sentry/nextjs` |
| Axiom | Log aggregation | Vercel integration |
| Checkly | Uptime monitoring | API health checks |
| Vercel Analytics | Performance metrics | Built-in |
| Upstash Dashboard | Redis/QStash metrics | Built-in |
| Neon Dashboard | DB metrics | Built-in |

#### Health Check Endpoints

```typescript
// apps/web/src/app/api/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkExternalAPIs()
  ]);

  const status = checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded';

  return Response.json({
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: checks[0].status === 'fulfilled',
      redis: checks[1].status === 'fulfilled',
      apis: checks[2].status === 'fulfilled'
    }
  }, {
    status: status === 'healthy' ? 200 : 503
  });
}
```

#### Alerting Rules

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Response Time | > 2s (p95) | Slack alert |
| Error Rate | > 1% | PagerDuty |
| Cron Job Failure | 3 consecutive | Email + Slack |
| Redis Memory | > 80% | Email warning |
| DB Connections | > 90% pool | Auto-scale alert |
| Rate Limit Exhaustion | < 10% remaining | Reduce collection frequency |

#### Acceptance Criteria

- [ ] Production deploy working on Vercel
- [ ] All cron jobs executing successfully
- [ ] Sentry capturing errors
- [ ] Health endpoint returning correct status
- [ ] Custom domain with SSL
- [ ] Performance budget: LCP < 2.5s, FID < 100ms

---

## Testing Strategy

### Unit Tests
- `packages/ranking-engine`: Score calculation, normalization
- `packages/api-clients`: Response parsing, error handling
- `packages/cache`: Key generation, TTL handling

### Integration Tests
- Database queries return expected data
- Redis cache invalidation works correctly
- Collector jobs persist data properly

### E2E Tests
- Rankings page loads with data
- Coin detail page shows correct info
- Historical rank changes display

### Load Tests
- 100 concurrent users on rankings page
- Verify Redis cache hit rate > 95%
- API response time < 200ms under load

---

## Risks & Considerations

### Risk 1: Rate Limit Exhaustion
**Mitigation**: Hybrid mode with local sentiment/prediction as default. External APIs only as enhancement.

### Risk 2: Cold Start Latency
**Mitigation**: Redis cache warming on cron. Keep-alive pings to prevent function sleep.

### Risk 3: Database Connection Limits
**Mitigation**: Neon's serverless driver with connection pooling. Max 10 connections per instance.

### Risk 4: Data Consistency
**Mitigation**: Rankings computed from snapshot, not live. Eventual consistency acceptable (5min lag).

### Risk 5: Cost Overrun
**Mitigation**:
- Neon free tier: 0.5GB storage, 190 compute hours
- Upstash free tier: 10K commands/day
- Monitor usage, set billing alerts

---

## Estimated Complexity

| Phase | Effort | Dependencies | Risk |
|-------|--------|--------------|------|
| Phase 1: Database + Cache | 3-4 days | None | Low |
| Phase 2: Background Jobs | 4-5 days | Phase 1 | Medium |
| Phase 3: Monorepo | 3-4 days | None (can parallelize) | Low |
| Phase 4: Production Deploy | 3-4 days | Phases 1-3 | Medium |

**Total Estimated Time**: 13-17 days

**Recommended Order** (Updated after Pre-Mortem):
1. Phase 1 (Database + Cache) - in current project structure
2. Phase 2 (Background Jobs) - in current structure
3. Phase 4 (Production Deploy) - verify everything works
4. Phase 3 (Monorepo Restructure) - only after stable production

---

## Technology Choices Summary

| Category | Technology | Rationale |
|----------|------------|-----------|
| Database | Neon PostgreSQL | Serverless, free tier, Vercel integration |
| Cache | Upstash Redis | Serverless, HTTP-based, free tier |
| Job Queue | Upstash QStash | Serverless cron, Vercel-native |
| Monorepo | Turborepo | Next.js native, fast builds |
| Deployment | Vercel | Next.js native, edge functions |
| Monitoring | Sentry + Axiom | Error tracking + logs |
| ORM | Drizzle | Type-safe, serverless-friendly |

---

## Risk Mitigations (Pre-Mortem)

**Pre-Mortem Run:** 2026-01-11 | Mode: Deep | Tigers: 6 | Elephants: 2

### HIGH Severity Tigers - MUST ADDRESS

#### Tiger 1: Cron Endpoints Unprotected
**Risk:** Anyone can trigger `/api/cron/*` endpoints, causing rate limit exhaustion or data corruption.

**Mitigation:** Add QStash signature verification to all cron endpoints.

```typescript
// src/app/api/cron/collect-prices/route.ts
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

async function handler(req: Request) {
  // Collector logic here
}

export const POST = verifySignatureAppRouter(handler);
```

**Package to add:** `@upstash/qstash`

**Added to:** Phase 2 - all cron endpoint files

---

#### Tiger 2: Materialized View Never Refreshes
**Risk:** `coin_rank_changes` view will be stale forever, rank change tracking won't work.

**Mitigation:** Refresh view after each rankings computation.

```typescript
// packages/collectors/src/jobs/compute-rankings.ts
import { sql } from '@crypto-ranking/db';

async function computeRankings() {
  // ... insert new snapshot ...

  // Refresh materialized view
  await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY coin_rank_changes`;
}
```

**Requirement:** Create unique index on view (already in schema).

**Added to:** Phase 2 - compute-rankings job

---

#### Tiger 3: No Database Migration Tooling
**Risk:** Schema changes will fail in production without migration workflow.

**Mitigation:** Add Drizzle Kit for migrations.

**Package to add:** `drizzle-kit` (dev dependency)

**New scripts in packages/db/package.json:**
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

**New file:** `packages/db/drizzle.config.ts`
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**CI/CD step:** Run `pnpm db:migrate` before deployment.

**Added to:** Phase 1 - database setup

---

### MEDIUM Severity Tigers - SHOULD ADDRESS

#### Tiger 4: CoinGecko API No Retry Logic
**Risk:** Transient failures cascade to rankings API failures.

**Mitigation:** Add axios-retry with exponential backoff.

```typescript
// src/lib/apis/coingecko.ts
import axiosRetry from 'axios-retry';

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.response?.status === 429, // Rate limited
});
```

**Package to add:** `axios-retry`

**Added to:** Phase 2 - api-clients package

---

#### Tiger 5: Upstash Free Tier May Be Exceeded
**Risk:** 10K commands/day limit vs ~144K needed (60s cache × 100 coins × 24h).

**Mitigation Options:**

| Option | Cost | Commands/day |
|--------|------|--------------|
| Free tier | $0 | 10,000 |
| Pay-as-you-go | ~$0.20/100K | Unlimited |
| Pro | $10/mo | 600,000 |

**Recommendation:** Start with Pay-as-you-go ($0.20/100K commands ≈ $0.30/day).

**Alternative:** Reduce cache granularity - cache full rankings list instead of per-coin, reducing to ~1,440 commands/day.

**Decision needed:** Which pricing tier to use?

---

#### Tiger 6: Vercel Hobby Cron Timeout (10s)
**Risk:** Cron jobs that take >10s will be killed.

**Mitigation Options:**

1. **Use QStash HTTP calls** (5-minute timeout) instead of Vercel cron
2. **Upgrade to Vercel Pro** ($20/mo) for 60s cron timeout
3. **Split collectors into smaller batches** (e.g., 25 coins per cron run)

**Recommendation:** Use QStash for all scheduled jobs. It's already in the stack and has 5-minute timeout.

```typescript
// Instead of Vercel cron, use QStash scheduled messages
import { Client } from '@upstash/qstash';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

await qstash.publishJSON({
  url: 'https://your-app.vercel.app/api/cron/collect-prices',
  delay: 60, // seconds
  retries: 3,
});
```

**Added to:** Phase 2 - replace vercel.json crons with QStash schedules

---

### ELEPHANTS - Unspoken Concerns

#### Elephant 1: No Staging Environment
**Risk:** Testing directly on production.

**Mitigation:**
- Use Vercel Preview deployments (automatic on PR)
- Create Neon database branch for staging: `neon branch create --name staging`
- Add `STAGING_DATABASE_URL` environment variable

**Added to:** Phase 4 - deployment configuration

---

#### Elephant 2: Turborepo Unfamiliar
**Risk:** Monorepo restructure may slow down development.

**Mitigation:**
- **Defer Phase 3** until Phase 1 & 2 are stable
- Do Phase 1 (database) in current structure first
- Restructure to monorepo only after core features working

**Updated order:**
1. Phase 1 (Database + Cache) - in current structure
2. Phase 2 (Background Jobs) - in current structure
3. Phase 4 (Production Deploy) - verify everything works
4. Phase 3 (Monorepo) - restructure once stable

---

### Accepted Risks (Paper Tigers)

| Risk | Why It's OK |
|------|-------------|
| Rate limit exhaustion | Hybrid mode with local sentiment already exists |
| Cold start latency | Redis cache warming + Edge functions mitigate |
| Database connection limits | Neon serverless uses HTTP, not connections |

---

## Appendix: Full Architecture Diagram

```
                                    Internet
                                        |
                              +--------v---------+
                              |   Cloudflare     |
                              |   DNS + CDN      |
                              +---------+--------+
                                        |
                              +---------v--------+
                              |     Vercel       |
                              |   Edge Network   |
                              +---------+--------+
                                        |
                    +-------------------+-------------------+
                    |                                       |
           +--------v--------+                    +---------v--------+
           |   Next.js App   |                    |   Cron Handlers  |
           |   (SSR/API)     |                    |   (Collectors)   |
           +--------+--------+                    +---------+--------+
                    |                                       |
                    |    Read Path                          |   Write Path
                    |                                       |
           +--------v--------+                    +---------v--------+
           |  Upstash Redis  |<-------------------|  Upstash QStash  |
           |  (L1 Cache)     |    Job Results     |  (Job Queue)     |
           +--------+--------+                    +------------------+
                    |
                    |    Cache Miss
                    |
           +--------v--------+
           | Neon PostgreSQL |
           |  (L2 Storage)   |
           +-----------------+
                    |
         +----------+-----------+
         |                      |
+--------v--------+    +--------v--------+
| ranking_snapshots|    | coin_rankings  |
| (time series)   |    | (per snapshot) |
+-----------------+    +-----------------+
```
