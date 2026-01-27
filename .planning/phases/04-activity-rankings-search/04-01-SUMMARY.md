---
phase: 04-activity-rankings-search
plan: 01
subsystem: database, scoring
tags: [drizzle, postgresql, percentile, scoring, activity, simple-statistics]

# Dependency graph
requires:
  - phase: 01-core-data-pipeline
    provides: birdeyeTokens table schema, Birdeye API client
provides:
  - Extended birdeyeTokens schema with activity columns (trade24h, uniqueWallet24h, buy24h, sell24h)
  - Computed score columns (activityScore, opportunityScore)
  - Indexes for score-based sorting
  - Percentile-based normalizer functions (buildPercentileLookup, percentileRank)
  - Activity score calculation (volume, trade, wallet, momentum weights)
  - Opportunity score calculation with risk adjustment and healthy ratio bonus
affects:
  - 04-02-external-interfaces (Birdeye Token Overview API fetches activity data)
  - 04-03-cron-refresh (cron job calculates and stores scores)
  - 04-04-rankings-ui (UI displays activity/opportunity rankings)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Percentile-based normalization for outlier robustness
    - Risk-adjusted scoring with liquidity multipliers
    - Pure scoring functions (no side effects, no API calls)

key-files:
  created:
    - src/lib/scoring/normalizers.ts
    - src/lib/scoring/activity-score.ts
    - src/lib/scoring/opportunity-score.ts
    - src/lib/scoring/index.ts
    - drizzle/0002_bent_nehzno.sql
  modified:
    - src/lib/db/schema.ts
    - drizzle/meta/_journal.json

key-decisions:
  - "Percentile weights: volume 30%, trade 25%, wallet 25%, momentum 20%"
  - "Risk multipliers: 0.5x for <$10k, 0.75x for <$50k, 0.9x for <$100k liquidity"
  - "Healthy ratio bonus: +15 points for volume/liquidity between 0.5 and 2.0"
  - "simple-statistics quantileRank for percentile calculation"

patterns-established:
  - "Scoring pattern: pure functions with PercentileLookup injection"
  - "Score interface pattern: total + component breakdown (volumeScore, tradeScore, etc.)"
  - "Risk adjustment pattern: multiplier applied after base score calculation"

# Metrics
duration: 3min
completed: 2026-01-27
---

# Phase 04 Plan 01: Scoring Libraries & Schema Extension Summary

**Percentile-based activity and opportunity scoring with extended birdeyeTokens schema for trade counts, wallet metrics, and computed scores**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-27T09:06:00Z
- **Completed:** 2026-01-27T09:09:20Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Extended birdeyeTokens schema with 6 new columns (trade24h, uniqueWallet24h, buy24h, sell24h, activityScore, opportunityScore)
- Created scoring library with percentile-based normalization using simple-statistics
- Implemented activity score with weighted components (volume, trade, wallet, momentum)
- Implemented opportunity score with risk adjustment and healthy trading ratio bonus
- Added indexes for activity_score and opportunity_score sorting

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend birdeyeTokens schema with activity columns** - `f64d511` (feat)
2. **Task 2: Create scoring library with normalizers and activity/opportunity score functions** - `437ec42` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` - Extended birdeyeTokens with activity metrics and score columns
- `src/lib/scoring/normalizers.ts` - Percentile rank utilities using simple-statistics
- `src/lib/scoring/activity-score.ts` - Activity score calculation (volume, trade, wallet, momentum)
- `src/lib/scoring/opportunity-score.ts` - Opportunity score with risk adjustment
- `src/lib/scoring/index.ts` - Barrel exports for scoring library
- `drizzle/0002_bent_nehzno.sql` - Migration for new columns and indexes

## Decisions Made

- **Percentile weights:** volume 30%, trade 25%, wallet 25%, momentum 20% - balances breadth of activity metrics
- **Risk multipliers:** 0.5x/0.75x/0.9x/1.0x based on liquidity thresholds ($10k/$50k/$100k) - penalizes low liquidity tokens
- **Healthy ratio bonus:** +15 points for volume/liquidity 0.5-2.0 - rewards sustainable trading patterns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Database push not possible:** .env.local file with DATABASE_URL is not present in this environment. Migration file generated successfully but `pnpm db:push` requires database credentials. User must run `pnpm db:push` after setting up environment.
- **Build test limitation:** `pnpm build` fails due to missing environment variables (UPSTASH_REDIS_REST_URL, etc.) but TypeScript compilation of schema and scoring files succeeded.

## User Setup Required

Before using the new schema columns, run:
```bash
pnpm db:push
```

This requires DATABASE_URL to be set in .env.local.

## Next Phase Readiness

- Schema extended and ready for activity data storage
- Scoring functions ready for use in cron jobs
- Next step: 04-02 External Interfaces to add Birdeye Token Overview API endpoint
- Blocker: Migration must be applied to database before activity data can be stored

---
*Phase: 04-activity-rankings-search*
*Completed: 2026-01-27*
