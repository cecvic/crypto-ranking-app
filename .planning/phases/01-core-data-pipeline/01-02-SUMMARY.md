---
phase: 01-core-data-pipeline
plan: 02
subsystem: database
tags: [drizzle, redis, birdeye, token-registry, cache]

# Dependency graph
requires:
  - phase: 01-core-data-pipeline
    plan: 01
    provides: birdeyeTokens schema, getTokenList API function, BIRDEYE_ACCOUNT rate limit
provides:
  - Token registry seeding from Birdeye API
  - Bulk price update operations
  - Redis cache keys for Birdeye data
  - Dynamic TTL based on rate limit headroom
affects: [01-03 price-polling-cron, 01-04 api-endpoints]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - getDb() lazy initialization for database operations
    - Map<string, T> for bulk price data handling
    - Dynamic TTL calculation based on rate limit headroom

key-files:
  created:
    - src/lib/db/birdeye-queries.ts
  modified:
    - src/lib/cache/redis.ts

key-decisions:
  - "15min base TTL with 30min stale-while-revalidate for rate limit awareness"

patterns-established:
  - "getBirdeyeDynamicTTL pattern: adjust cache TTL based on rate limit headroom percentage"
  - "seedTokensFromBirdeye pattern: rate-limit-first check before API calls"

# Metrics
duration: 8min
completed: 2026-01-22
---

# Phase 01 Plan 02: Database Queries and Cache Keys Summary

**Token registry CRUD operations in birdeye-queries.ts with Redis cache keys supporting 15-30min dynamic TTL**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-22T16:30:00Z
- **Completed:** 2026-01-22T16:38:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created birdeye-queries.ts with 6 database operations for token registry management
- Added Birdeye-specific cache keys to Redis configuration (BIRDEYE_PRICES_ALL, BIRDEYE_PRICES_CHAIN, BIRDEYE_TOKEN)
- Implemented getBirdeyeDynamicTTL function for rate-limit-aware caching

## Task Commits

Each task was committed atomically:

1. **Task 1: Create birdeye-queries.ts with token registry operations** - `a7fe755` (feat)
2. **Task 2: Add Birdeye cache keys and TTLs to Redis config** - `b2fdd92` (feat)

## Files Created/Modified
- `src/lib/db/birdeye-queries.ts` - Database operations: seedTokensFromBirdeye, updateTokenPrices, getTokenAddresses, getTokensByChain, getAllTokens, getTokenCountByChain
- `src/lib/cache/redis.ts` - Added BIRDEYE_PRICES_ALL, BIRDEYE_PRICES_CHAIN, BIRDEYE_TOKEN cache keys; BIRDEYE_PRICES (900s), BIRDEYE_PRICES_STALE (1800s) TTLs; getBirdeyeDynamicTTL helper

## Decisions Made
- 15-minute base TTL (BIRDEYE_PRICES: 900s) for normal operation
- 30-minute stale TTL (BIRDEYE_PRICES_STALE: 1800s) for stale-while-revalidate pattern
- Dynamic TTL thresholds: >50% headroom = 15min, >20% = 20min, else = 30min

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Token registry queries ready for cron job integration (Plan 03)
- Cache keys structured for chain-specific and all-chain queries
- Dynamic TTL function ready for use in polling service

---
*Phase: 01-core-data-pipeline*
*Completed: 2026-01-22*
