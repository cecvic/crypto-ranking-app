# Project State: Birdeye API Migration

## Project Reference

**Core Value:** Provide realtime multi-chain crypto rankings with on-chain transaction visibility and liquidity depth

**Current Focus:** Phase 4 - Activity Rankings & Search

## Current Position

**Phase:** 4 of 4 - Activity Rankings & Search
**Plan:** 4 of 4 complete
**Status:** Phase complete
**Last activity:** 2026-01-27 - Completed 04-04-PLAN.md

**Progress:**
```
Phase 1: [########] Core Data Pipeline (8/8 plans) ✓
Phase 2: [        ] Whale Detection
Phase 3: [        ] Token Discovery
Phase 4: [########] Activity Rankings & Search (4/4 plans) ✓
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 2/4 |
| Plans completed | 12 |
| Requirements delivered | 13/20 |

## Accumulated Context

### Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| 3 phases (quick depth) | DATA+CHAIN naturally coupled; WHALE and DISC are distinct feature slices | 2026-01-21 |
| Polling-based (no WebSocket) | WebSocket requires Business tier ($499/mo), defer to v2 | 2026-01-21 |
| 11 chains support | Include all Birdeye-supported chains including sui, aptos, zksync | 2026-01-22 |
| Account-level rate limiting | BIRDEYE_ACCOUNT config for shared quota across all endpoints | 2026-01-22 |
| Composite index (chain, address) | Multi-chain token deduplication via composite unique index | 2026-01-22 |
| 15min base TTL with 30min stale | Dynamic caching based on rate limit headroom percentage | 2026-01-22 |
| 150 tokens per chain | Middle of 100-200 range, balances coverage vs API usage | 2026-01-22 |
| Sequential chain processing | One chain at a time to manage shared account-level rate limit | 2026-01-22 |
| 1min staleTime for hooks | Balances freshness with API efficiency | 2026-01-22 |
| Chain abbreviations as icons | Use SOL/ETH/etc text instead of chain images for simplicity | 2026-01-22 |
| React.ReactElement over JSX.Element | React 19 compatibility for component return types | 2026-01-22 |
| 50 tokens per chain | Birdeye API enforces max 50 per request (not 150 as planned) | 2026-01-22 |
| Request interceptor for API key | Env vars not available at module load time in Next.js | 2026-01-22 |
| Percentile weights 30/25/25/20 | Volume, trade, wallet, momentum balance for activity score | 2026-01-27 |
| Risk multipliers for low liquidity | 0.5x/<$10k, 0.75x/<$50k, 0.9x/<$100k penalizes risky tokens | 2026-01-27 |
| Healthy ratio bonus +15 | Volume/liquidity 0.5-2.0 indicates sustainable trading | 2026-01-27 |
| 50 tokens per chain for activity | Match Birdeye API max per request, ~550 tokens total | 2026-01-27 |
| 2 minute cache TTL for activity API | Balance freshness with load reduction | 2026-01-27 |
| Binary search for percentile rank | TypeScript type issue with simple-statistics | 2026-01-27 |
| Search merge: API over local | API results fresher, local for fast fallback | 2026-01-27 |
| 300ms search debounce | Balance responsiveness with API efficiency | 2026-01-27 |
| 5min search cache TTL | Match API response lifetime | 2026-01-27 |

### Technical Todos

- None yet

### Blockers

- None

### Roadmap Evolution

- Phase 4 added: Activity Rankings & Search (tokens ranked by activity/opportunity with global search)

### Research Flags

| Topic | Phase | Status |
|-------|-------|--------|
| Symbol collision handling | Phase 1 | Pending |
| Token registry seeding | Phase 1 | Resolved (01-02) |

## Session Continuity

**Last session:** 2026-01-27
**Stopped at:** Completed 04-04-PLAN.md (Token Search API & UI)
**Resume file:** None

---
*State initialized: 2026-01-21*
*Last updated: 2026-01-27*
