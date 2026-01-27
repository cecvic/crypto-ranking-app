# Project State: Birdeye API Migration

## Project Reference

**Core Value:** Provide realtime multi-chain crypto rankings with on-chain transaction visibility and liquidity depth

**Current Focus:** Phase 2 - Whale Detection

## Current Position

**Phase:** 2 of 3 - Whale Detection
**Plan:** 1 of 3 complete
**Status:** In progress
**Last activity:** 2026-01-27 - Completed 02-01-PLAN.md

**Progress:**
```
Phase 1: [########] Core Data Pipeline (8/8 plans) ✓
Phase 2: [##      ] Whale Detection (1/3 plans)
Phase 3: [        ] Token Discovery
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 1/3 |
| Plans completed | 9/11 |
| Requirements delivered | 10/15 |

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
| $100k whale threshold | Default minimum volume for whale trade detection | 2026-01-27 |
| Separate BirdeyeWhaleTrade type | Distinct type for whale trades vs regular trades for clarity | 2026-01-27 |

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

**Last session:** 2026-01-27
**Stopped at:** Completed 02-01-PLAN.md (Whale Data Foundation)
**Resume file:** None

---
*State initialized: 2026-01-21*
*Last updated: 2026-01-27*
