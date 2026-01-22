---
phase: 01-core-data-pipeline
plan: 03
subsystem: api
tags: [birdeye, cron, polling, multi-chain, rate-limiting, redis]

# Dependency graph
requires:
  - phase: 01-02
    provides: birdeye-queries.ts (getTokenAddresses, updateTokenPrices), redis.ts (cache keys, dynamic TTL)
provides:
  - Scheduled price polling cron job for all 11 chains
  - Sequential chain polling with rate limit awareness
  - Redis cache aggregation for all chain prices
affects: [01-05, 01-06, 01-07, 01-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Headroom-based rate limiting: check remaining quota before each operation"
    - "Priority-ordered chain polling: highest volume chains polled first"
    - "Dynamic token count: reduce coverage under tight rate limits"

key-files:
  created:
    - src/app/api/cron/poll-birdeye/route.ts
  modified:
    - vercel.json

key-decisions:
  - "Sequential chain polling to manage rate limits predictably"
  - "Priority order by volume (solana first, aptos last)"
  - "15-minute cron interval matching CONTEXT.md decision"

patterns-established:
  - "Cron endpoint pattern: verifyCronRequestWithDevBypass wrapper with GET for dev testing"
  - "Headroom abort: skip run when <10% rate limit remaining"
  - "Dynamic reduction: 50 tokens/chain when <30% headroom"

# Metrics
duration: 4min
completed: 2026-01-22
---

# Phase 1 Plan 3: Poll-Birdeye Cron Job Summary

**Multi-chain Birdeye price polling cron with headroom-based rate limiting and sequential chain processing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-22T01:52:38Z
- **Completed:** 2026-01-22T01:56:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created poll-birdeye cron endpoint that polls all 11 chains sequentially
- Implemented headroom-based throttling to prevent rate limit exhaustion
- Added dynamic token count reduction under tight rate limits
- Configured 15-minute Vercel cron schedule

## Task Commits

Each task was committed atomically:

1. **Task 1: Create poll-birdeye cron endpoint** - `9aa5345` (feat)
2. **Task 2: Add cron schedule to vercel.json** - `d4a8ae5` (chore)

## Files Created/Modified
- `src/app/api/cron/poll-birdeye/route.ts` - Cron handler with sequential chain polling, rate limit checks, database updates, and Redis caching
- `vercel.json` - Added poll-birdeye cron schedule (every 15 minutes)

## Decisions Made
- **Sequential polling**: Chains polled one at a time to manage rate limits predictably (vs parallel which could spike usage)
- **Priority order**: solana > ethereum > base > arbitrum > bsc > polygon > optimism > avalanche > zksync > sui > aptos (by volume)
- **100ms inter-chain delay**: Small delay between chains to spread rate limit usage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Poll-birdeye cron ready to execute once tokens are seeded
- Depends on seed-birdeye (Plan 04) to have tokens in database
- Ready for API endpoint plans (05-08) to consume cached data

---
*Phase: 01-core-data-pipeline*
*Completed: 2026-01-22*
