---
phase: 01-core-data-pipeline
plan: 06
subsystem: hooks
tags: [react-query, tanstack-query, birdeye, hooks, frontend]

# Dependency graph
requires:
  - phase: 01-03
    provides: /api/tokens endpoint to fetch from
  - phase: 01-04
    provides: BirdeyeTokenResponse type structure
provides:
  - useBirdeyeTokens hook with React Query integration
  - Chain filtering via options.chain parameter
  - Convenience hooks for Solana, Ethereum, Base chains
  - useBirdeyeChains for available chain list
  - useBirdeyeToken for single token lookup
affects: [01-07, 01-08, phase-2, phase-3]

# Tech tracking
tech-stack:
  added: []
  patterns: [react-query-hook, chain-filtering, convenience-hooks]

key-files:
  created:
    - src/hooks/use-birdeye-tokens.ts
  modified:
    - src/lib/types/index.ts

key-decisions:
  - "1min staleTime, 5min gcTime for token data freshness"
  - "Convenience hooks for popular chains (Solana, Ethereum, Base)"

patterns-established:
  - "useBirdeyeTokens: Primary hook with options object pattern"
  - "Chain-specific convenience hooks wrap primary hook"

# Metrics
duration: 3min
completed: 2026-01-22
---

# Phase 1 Plan 6: Birdeye Tokens Hook Summary

**React Query hook for multi-chain Birdeye token data with chain filtering and convenience wrappers**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-22T01:56:43Z
- **Completed:** 2026-01-22T01:59:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- BirdeyeTokenResponse and BirdeyeTokensAPIResponse types for API integration
- useBirdeyeTokens hook with chain, limit, sortBy options
- Convenience hooks for Solana, Ethereum, Base chains
- useBirdeyeChains returns all 11 supported chains
- useBirdeyeToken for single token lookup by address

## Task Commits

Each task was committed atomically:

1. **Task 1: Add BirdeyeTokenResponse type** - `73fd8b7` (feat)
2. **Task 2: Create useBirdeyeTokens hook** - `738a850` (feat)

## Files Created/Modified
- `src/lib/types/index.ts` - Added BirdeyeTokenResponse and BirdeyeTokensAPIResponse interfaces
- `src/hooks/use-birdeye-tokens.ts` - React Query hooks for fetching Birdeye token data

## Decisions Made
- 1min staleTime balances freshness with API efficiency
- 5min gcTime allows cached data to persist across navigations
- Convenience hooks simplify common chain-specific use cases
- useBirdeyeToken uses larger limit (500) to find tokens in listings

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Frontend components can now consume Birdeye token data via hooks
- Ready for UI components in plans 07-08
- Chain filtering and React Query integration complete

---
*Phase: 01-core-data-pipeline*
*Completed: 2026-01-22*
