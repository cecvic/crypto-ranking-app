# Codebase Concerns

**Analysis Date:** 2026-01-21

## Tech Debt

**Type Casting with `any` (Multiple locations):**
- Issue: Several files use `any` type casting to bypass TypeScript checks, reducing type safety
- Files:
  - `src/app/coin/[coinId]/page.tsx` (line ~400): `const { coin, scores, signals, details } = coinData as any;`
  - `src/app/api/fear-greed/route.ts`: `let cachedData: any = null;`
  - `src/lib/apis/technical.ts`: Multiple instances of `(d: any)` in array operations
  - `src/hooks/use-rankings.ts`: `async function fetchChart(coinId: string, days: number = 7): Promise<any[]>`
- Impact: Eliminates compile-time type checking, increasing runtime error risk; makes refactoring harder
- Fix approach: Replace `any` with proper types. Use generics where needed, create union types for response handling

**Silent Error Suppression in Cache Operations:**
- Issue: Cache miss handling silently returns null; failed cache writes use `.catch(() => {})` without logging
- Files: `src/lib/cache/redis.ts` (lines 129-131, 172-173)
- Impact: Cache failures are invisible, making debugging difficult. Silent fires can mask real Redis connection issues
- Fix approach: Log cache errors at minimum. Consider circuit breaker pattern for persistent failures

**Rate Limiter Implementation Inconsistency:**
- Issue: Two separate rate limiting implementations exist - `src/lib/cache/redis.ts` has `checkRateLimit()` (lines 188-214) and `src/lib/rate-limiter/distributed.ts` has a separate implementation (lines 63-91)
- Files:
  - `src/lib/cache/redis.ts`: Simpler window-based limiter
  - `src/lib/rate-limiter/distributed.ts`: More complex sliding window with decrement logic
- Impact: Confusion about which to use; potential for using the wrong one in different parts of the app; maintenance burden
- Fix approach: Choose one implementation and deprecate the other. Merge configurations into single source of truth

**Hard-coded Email Template String Parsing:**
- Issue: `src/lib/email/templates/confluence-alert.tsx` and message parsing in `src/components/chat/message.tsx` use regex and string matching to extract table data from markdown
- Files: `src/components/chat/message.tsx` (line ~200): Comment says "Match any table with the four columns we need"
- Impact: Brittle; breaks if markdown structure changes; difficult to maintain; error-prone
- Fix approach: Use structured data format (JSON) for responses instead of markdown parsing

**Timeout and Retry Configuration Scattered:**
- Issue: Timeout values (15000ms, 30000ms) and retry counts (3) are hard-coded throughout multiple API clients
- Files:
  - `src/lib/apis/coingecko.ts` (line 11): timeout 15000
  - `src/lib/apis/birdeye.ts` (line 9): timeout 30000
  - `src/lib/rate-limiter/distributed.ts` (line 99): maxWaitMs 60000
  - Multiple axiosRetry configurations
- Impact: Inconsistent behavior; difficult to tune for performance; hard to support different environments
- Fix approach: Centralize in config file with environment overrides

---

## Known Bugs

**Rate Limit Status Check Decrements Counter (Side Effect Bug):**
- Symptoms: Calling `getRateLimitStatus()` to check rate limit status actually consumes one request from the limit
- Files: `src/lib/rate-limiter/distributed.ts` (lines 184-205)
- Trigger: Any code calling `getRateLimitStatus()` will decrement the counter (lines 196)
- Workaround: Don't use `getRateLimitStatus()` for monitoring; use `checkRateLimit()` instead and handle differently
- Fix approach: Remove the decrement logic or create separate read-only status check method

**Duplicate/Conflicting Cache Key Usage:**
- Symptoms: DexPaprika and DexScreener both aggregated data could overwrite each other in cache
- Files: `src/lib/cache/redis.ts` (lines 48-52) - `PRICES_ALL`, `PRICES_MEME` are used by coin-aggregator
- Impact: Race conditions in concurrent requests; data loss
- Fix approach: Include source identifier in cache keys to prevent collisions

---

## Security Considerations

**Sensitive Environment Variables Not Validated at Startup:**
- Risk: Missing or invalid API keys/database URLs discovered at runtime, potentially by users
- Files:
  - `src/lib/db/client.ts` (lines 13-21): Throws error inside function, not at startup
  - `src/lib/cache/redis.ts` (lines 7-18): Same pattern
- Current mitigation: Error messages to console; assumes deployment process validates
- Recommendations:
  - Add startup validation script that checks all required env vars before server starts
  - Return descriptive 503 errors if critical services unavailable
  - Separate error messages for logs vs. user responses (don't leak config details)

**API Keys in Headers Without Secret Rotation:**
- Risk: BIRDEYE_API_KEY, COINGECKO_API_KEY, LUNARCRUSH_API_KEY stored as-is in process.env
- Files: `src/lib/apis/birdeye.ts` (lines 12-14), `src/lib/apis/coingecko.ts` (line 34)
- Current mitigation: Assumes secrets managed by deployment platform (Vercel)
- Recommendations:
  - Implement key rotation mechanism (store in secure vault, not env vars for long-lived services)
  - Add request signing/attestation for API calls if providers support it
  - Monitor for unusual API usage patterns that suggest key compromise

**Whale Event Webhook Signature Validation:**
- Risk: `src/app/api/webhooks/alchemy/route.ts` receives whale transaction data but signature verification may be incomplete
- Current mitigation: `verifyCronRequestWithDevBypass()` used
- Recommendations:
  - Verify webhook signatures match Alchemy's HMAC in production
  - Rate-limit webhook endpoint; implement idempotency keys
  - Log all webhook rejections for security monitoring

**AI Chat Tool Execution Without Sandboxing:**
- Risk: AI generates and executes tool calls without explicit user approval or limited scope
- Files: `src/lib/ai/tools.ts`, `src/app/api/chat/route.ts`
- Impact: Tools can query sensitive data (rankings, whale movements) indirectly
- Recommendations:
  - Implement ACL-based tool access (tools available only to authenticated users)
  - Log all tool executions for audit trail
  - Consider read-only mode for tools; prevent data modification

---

## Performance Bottlenecks

**Sequential API Calls in Data Aggregation:**
- Problem: Coin aggregator may fetch from multiple sources one-by-one if Promise.all() fails
- Files: `src/lib/services/coin-aggregator.ts` (lines 50-59)
- Cause: Uses `Promise.all()` but individual sources catch errors and return empty arrays
- Current behavior: If one source is slow, delays entire aggregation
- Improvement path:
  - Use `Promise.allSettled()` instead; process results individually
  - Implement per-source timeouts with independent failures
  - Add concurrency limiting if external APIs rate-limit

**Redis as Single Point of Failure:**
- Problem: Caching via Upstash Redis; if unavailable, cold start for all data
- Files: `src/lib/cache/redis.ts` (lines 7-17, 124-131)
- Current behavior: Returns null on error, app continues but no caching
- Improvement path:
  - Implement local in-memory cache fallback (short TTL only)
  - Add Redis health checks to monitoring dashboard
  - Consider read-through cache strategy (fetch from DB if cache empty)

**Large JSON Responses Stored in Database:**
- Problem: `coinData` and `signals` stored as JSONB in `coinRankings` table without size limits
- Files: `src/lib/db/schema.ts` (lines 48-49)
- Impact: Can grow unbounded; slow queries; expensive backups
- Improvement path:
  - Store only essential fields; move heavy data to separate tables
  - Implement JSON compression if needed
  - Add query-time limits on result set sizes

**Ranking Calculation Without Memoization:**
- Problem: `calculateRankingScore()` called for each coin in snapshot without intermediate caching
- Files: `src/lib/ranking/calculator.ts` (lines 78+)
- Impact: Expensive normalization recalculated per coin
- Improvement path:
  - Cache min/max values once per batch
  - Precompute normalization factors before scoring loop

---

## Fragile Areas

**Sentiment Data Aggregation from Multiple Free Sources:**
- Files: `src/lib/apis/free-data-sources.ts`, `src/lib/apis/local-sentiment.ts`
- Why fragile:
  - RSS feeds can change format or go down without notice
  - Reddit API access depends on specific endpoint format that may change
  - Sentiment scoring uses simple text matching that fails on sarcasm/context
  - CoinGecko categories API may not include all trending tokens
- Safe modification: Add comprehensive error handling per-source; implement circuit breaker; test with sample feeds regularly
- Test coverage:
  - Missing: Unit tests for RSS parsing edge cases
  - Missing: Integration tests for sentiment correlation accuracy
  - Missing: Graceful degradation when sentiment unavailable

**Confluence Detection Algorithm:**
- Files: `src/lib/confluence/calculator.ts`
- Why fragile:
  - Threshold levels (4/5 confluence) are magic numbers
  - Depends on all 5 signal sources being available (sentiment, technical, whale, AI, price)
  - If any source returns null, score calculation may fail
  - Alert deduplication logic uses 6-hour window but no distributed lock
- Safe modification: Add comprehensive null checks; validate thresholds before use; add feature flags
- Test coverage:
  - Missing: Tests for missing signal combinations
  - Missing: Alert deduplication race conditions
  - Risk: Silent failures when one signal source is down

**Whale Event Processing Pipeline:**
- Files: `src/app/api/webhooks/alchemy/route.ts`, `src/lib/db/whale-queries.ts`
- Why fragile:
  - Depends on Alchemy webhook delivery guarantee (eventual consistency)
  - Token mapping lookup can fail if contract address not in database
  - Exchange/whale address classification is manual and incomplete
  - Raw webhook payload stored in DB without validation
- Safe modification: Validate payload schema; add webhook retry logic; implement backfill jobs for missed events
- Test coverage:
  - Missing: Tests for malformed webhook payloads
  - Missing: Tests for unmapped token addresses
  - Risk: Data gaps if webhooks missed; whale metrics incomplete

---

## Scaling Limits

**Database Connection Pool (Neon Serverless):**
- Current capacity: Default Neon connection limit ~100 connections
- Limit: Vercel serverless functions with sustained traffic hit pool limit → connection timeouts
- Scaling path:
  - Use connection pooling middleware (PgBouncer)
  - Implement read replicas for query-heavy operations
  - Move analytics queries to separate read-only database
  - Consider batching/queuing for non-critical writes

**Redis Rate Limiting at High Concurrency:**
- Current capacity: Upstash Redis free tier ~1GB, limited throughput
- Limit: Multiple cron jobs + user traffic → Redis timeout/queue backlogs
- Scaling path:
  - Switch to dedicated Redis instance or Upstash Pro tier
  - Implement token bucket algorithm locally for lightweight limiting
  - Shard cache keys across multiple Redis instances

**Ranking Computation Time:**
- Current: Computes rankings for ~250 top coins every 5 minutes via cron
- Limit: If coin count grows or scoring becomes more complex, computation time > 5 minute interval → backlog
- Scaling path:
  - Implement incremental ranking updates (only recompute changed coins)
  - Parallelize scoring across multiple processes
  - Cache scoring components separately with different TTLs

**API Call Concurrency to External Services:**
- Current: Coin aggregator fetches from 7 sources in Promise.all()
- Limit: CoinGecko free tier 10-30 req/min; other APIs similar limits
- Scaling path:
  - Batch requests to paid tiers of APIs
  - Implement adaptive throttling based on remaining rate limit
  - Use circuit breaker to degrade gracefully when rate limited

---

## Dependencies at Risk

**axios-retry Without Jitter:**
- Risk: All retries use same exponential backoff formula; thundering herd on server recovery
- Package: `axios-retry@4.5.0` (package.json line 43)
- Impact: Cascading failures when external API recovers; retry storms
- Migration plan:
  - Add jitter to retry delays: `delay + Math.random() * (delay * 0.1)`
  - Or switch to `pino-http` + built-in backoff with jitter
  - Or implement custom retry middleware with full Jitter algorithm

**Drizzle ORM Migration Path Uncertain:**
- Risk: Drizzle is relatively new; database schema changes require manual migration files
- Package: `drizzle-orm@0.45.1` (package.json line 47)
- Impact: Schema migrations not version-controlled; risk of sync issues between dev/prod
- Migration plan:
  - Store all migration files in Git (`.drizzle/migrations/`)
  - Test migrations on copy of production DB
  - Document manual steps for complex migrations

**rss-parser No Validation:**
- Risk: Parser accepts any XML; malicious feeds can cause DoS or injection attacks
- Package: `rss-parser@3.13.0` (package.json line 59)
- Impact: News feeds could inject malicious content into sentiment data
- Migration plan:
  - Add XML schema validation before parsing
  - Sanitize all extracted text
  - Consider switching to more robust parser with security features

---

## Missing Critical Features

**No Distributed Transaction Support:**
- Problem: Ranking snapshot and coin_rankings are updated separately; no consistency guarantee if failure between inserts
- Blocks: Reliable data integrity guarantees; atomic updates across tables
- Impact: Partial snapshots stored if process crashes mid-update
- Fix: Use database transactions (PostgreSQL supports them); wrap ranking compute + storage in transaction

**No Data Validation Schema:**
- Problem: API responses from external services not validated against expected schema
- Blocks: Can't guarantee data quality; silent errors when API changes format
- Impact: Ranking calculations with invalid/null data; poor model training
- Fix: Add Zod/Yup validation for all external API responses

**No Audit Logging for Critical Operations:**
- Problem: No audit trail for alert sends, ranking changes, webhook receipts
- Blocks: Can't debug user issues; can't prove data integrity; compliance issues
- Impact: When users report missing alerts, no way to verify what happened
- Fix: Add audit table; log all: alert sends, ranking snapshots, webhook events, configuration changes

**No Graceful Degradation for Sentiment Sources:**
- Problem: If all sentiment sources fail, sentiment score becomes null
- Blocks: Can't provide rankings when sentiment unavailable
- Impact: Service quality degrades; users see incomplete data
- Fix: Add fallback sentiment calculation (e.g., from price momentum), cache historical values

---

## Test Coverage Gaps

**Rate Limiter Edge Cases Untested:**
- What's not tested: Window boundary conditions (when does window increment?), concurrent requests at limit
- Files: `src/lib/rate-limiter/distributed.ts`, `src/lib/cache/redis.ts`
- Risk: Race conditions cause double-counting or incorrect `allowed` result
- Priority: High (affects all external API calls)

**API Error Handling Not Tested:**
- What's not tested: Non-200 responses from CoinGecko, Birdeye, etc.; partial responses; timeout behavior
- Files: `src/lib/apis/coingecko.ts`, `src/lib/apis/birdeye.ts`, etc.
- Risk: App crashes or shows stale data when APIs error; no graceful fallback
- Priority: High (external APIs are unreliable)

**Webhook Duplicate Prevention:**
- What's not tested: What happens if same transaction hash received twice? Does unique index prevent duplicates?
- Files: `src/app/api/webhooks/alchemy/route.ts`, `src/lib/db/schema.ts` (lines 122)
- Risk: Duplicate whale events skew metrics; alerts sent twice
- Priority: Medium (depends on Alchemy delivery guarantees)

**Ranking Score Normalization:**
- What's not tested: Behavior when all coins have same score; behavior with extreme outliers; negative scores
- Files: `src/lib/ranking/calculator.ts` (lines 22-26)
- Risk: Ranking order unstable; potential division by zero if max === min edge case missed
- Priority: Medium (critical for ranking accuracy)

**Cache Invalidation:**
- What's not tested: Do all caches invalidate together or separately? What if one TTL expires before another?
- Files: `src/lib/cache/redis.ts` (lines 84-118)
- Risk: Stale data mixed with fresh; inconsistent state returned to users
- Priority: Medium (can cause confusion with old rankings)

---

*Concerns audit: 2026-01-21*
