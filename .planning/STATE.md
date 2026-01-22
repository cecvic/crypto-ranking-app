# Project State: Birdeye API Migration

## Project Reference

**Core Value:** Provide realtime multi-chain crypto rankings with on-chain transaction visibility and liquidity depth

**Current Focus:** Phase 1 - Core Data Pipeline

## Current Position

**Phase:** 1 of 3 - Core Data Pipeline
**Plan:** 5 of 8 complete
**Status:** In progress

**Progress:**
```
Phase 1: [#####---] Core Data Pipeline (5/8 plans)
Phase 2: [        ] Whale Detection
Phase 3: [        ] Token Discovery
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 0/3 |
| Plans completed | 5/8 |
| Requirements delivered | 0/15 |

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

### Technical Todos

- None yet

### Blockers

- None

### Research Flags

| Topic | Phase | Status |
|-------|-------|--------|
| Symbol collision handling | Phase 1 | Pending |
| Token registry seeding | Phase 1 | Resolved (01-02) |

## Session Continuity

**Last session:** 2026-01-22
**Stopped at:** Completed 01-05-PLAN.md (Token API Endpoints)
**Resume file:** None

---
*State initialized: 2026-01-21*
*Last updated: 2026-01-22*
