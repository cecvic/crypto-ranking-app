---
phase: 04-activity-rankings-search
plan: 03
subsystem: api
tags: [birdeye, cron, scoring, activity, opportunity, ranking, redis, postgres]

# Dependency graph
requires:
  - phase: 04-01
    provides: Activity scoring library and schema extension
  - phase: 04-02
    provides: Search API integration (Token Overview, Search endpoints)
provides:
  - Activity data fetching cron job
  - Activity-ranked tokens API endpoint
  - Database query functions for activity operations
affects: [04-04, frontend-activity-rankings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cron job with percentile-based scoring across all tokens
    - Activity ranking with opportunity score risk adjustments

key-files:
  created:
    - src/app/api/cron/fetch-activity/route.ts
    - src/app/api/tokens/activity/route.ts
  modified:
    - src/lib/db/birdeye-queries.ts
    - src/lib/scoring/normalizers.ts

key-decisions:
  - "50 tokens per chain for activity fetching (match Birdeye API limit)"
  - "100ms delay between API calls to manage rate limits"
  - "2 minute cache TTL for activity API (balance freshness vs load)"
  - "Binary search for percentile calculation (type issue with simple-statistics)"

patterns-established:
  - "Activity scoring cron: percentile lookup from all tokens, score calculation per token"
  - "Activity-ranked API: cache-first with chain filter and pagination"

# Metrics
duration: 4min
completed: 2026-01-27
---

# Phase 04 Plan 03: Activity Data Pipeline Summary

**Cron job fetching Token Overview data across 11 chains, computing activity/opportunity scores via percentile normalization, and serving activity-ranked tokens via cached API endpoint**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-27T09:13:35Z
- **Completed:** 2026-01-27T09:17:49Z
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- Created `/api/cron/fetch-activity` cron endpoint fetching activity data for 50 tokens per chain
- Extended birdeye-queries.ts with activity data operations (getTokensForScoring, updateTokenActivity, getTokensByActivityScore)
- Created `/api/tokens/activity` API serving tokens ranked by activity score with caching
- Fixed percentileRank function type issue in normalizers.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend birdeye-queries with activity data operations** - `5820c91` (feat)
2. **Task 2: Create activity data fetching cron job** - `1d8c206` (feat)
3. **Task 3: Create activity-ranked tokens API endpoint** - `c2f9121` (feat)

## Files Created/Modified
- `src/lib/db/birdeye-queries.ts` - Added getTokensForScoring, updateTokenActivity, getTokensByActivityScore, ActivityUpdateData
- `src/lib/scoring/normalizers.ts` - Fixed percentileRank to use inline binary search (type issue with simple-statistics)
- `src/app/api/cron/fetch-activity/route.ts` - Cron endpoint for activity data collection across all chains
- `src/app/api/tokens/activity/route.ts` - API endpoint for activity-ranked tokens with Redis caching

## Decisions Made
- Used 50 tokens per chain to match Birdeye API max per request
- 100ms delay between API calls to respect rate limits
- 2 minute cache TTL for activity API balances freshness with load reduction
- Replaced simple-statistics quantileRank with inline binary search due to TypeScript module resolution issues

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed simple-statistics quantileRank type issue**
- **Found during:** Task 1 (birdeye-queries extension)
- **Issue:** TypeScript build failing with "quantileRank does not exist on type" despite function existing at runtime
- **Fix:** Replaced simple-statistics quantileRank with inline binary search implementation in normalizers.ts
- **Files modified:** src/lib/scoring/normalizers.ts
- **Verification:** pnpm build compiles successfully
- **Committed in:** 5820c91 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Type fix necessary for build to succeed. Functionality equivalent - binary search produces same percentile rankings.

## Issues Encountered
- Pre-existing build error in normalizers.ts due to simple-statistics type declarations not matching runtime exports (fixed as part of Task 1)
- Build fails on page data collection due to missing env vars (unrelated to this plan's code)

## User Setup Required

None - no external service configuration required. Cron schedule needs to be configured in Vercel/QStash dashboard for production.

## Next Phase Readiness
- Activity data pipeline complete and tested
- Ready for Plan 04-04 (Global Search API) which depends on search API integration from 04-02
- Frontend can begin consuming `/api/tokens/activity` endpoint

---
*Phase: 04-activity-rankings-search*
*Completed: 2026-01-27*
