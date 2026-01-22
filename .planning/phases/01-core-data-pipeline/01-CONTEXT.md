# Phase 1: Core Data Pipeline - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace CoinGecko with Birdeye API for multi-chain token price data. Includes price fetching, volume data, 24h changes, rate limiting, Redis caching, and support for all 11 Birdeye chains. Whale detection and trending tokens are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Data freshness
- Relaxed refresh interval (15min+) — prioritize staying under rate limits
- Dynamic intervals based on rate limit headroom — speed up when available, slow down when tight
- When rate limits are approached: reduce token count but maintain refresh frequency (fewer tokens, fresher data)

### Token coverage
- Seed with top N tokens by market cap per chain (fetch from Birdeye rankings)
- Track 100-200 tokens per chain (medium coverage)
- Token list refreshes periodically — tokens can enter/exit based on updated rankings
- Symbol collisions across chains (e.g., USDC on multiple chains): Claude decides best UX approach

### Claude's Discretion
- Whether to show "last updated" timestamp in UI
- How to handle symbol collisions (separate entries vs aggregated)
- Exact dynamic interval algorithm
- Cache TTL values

</decisions>

<specifics>
## Specific Ideas

- Rate limits are account-level and shared across all endpoints — this is the primary constraint
- Research flags from planning: symbol collision handling, token registry seeding patterns

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-data-pipeline*
*Context gathered: 2026-01-22*
