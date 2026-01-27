# Phase 2: Whale Detection - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Display DEX-sourced whale activity from on-chain trades via Birdeye API. Users see whale indicators on tokens and can identify tokens with recent large trade activity. The existing whale score in the 5-factor ranking gets replaced with real DEX data.

</domain>

<decisions>
## Implementation Decisions

### Whale Threshold Definition
- Claude determines threshold based on Birdeye API capabilities
- Claude decides whether thresholds vary by chain
- Claude decides lookback window for whale activity
- Claude decides whether to distinguish buy vs sell direction

### Display Presentation
- Green color for whale buys, red for whale sells (user decision)
- Claude decides visual treatment (badge, chart, indicator style)
- Claude decides whether to show individual trade list vs aggregated metrics
- Claude decides placement (table column, detail page, or both)

### Data Freshness
- Claude decides refresh frequency based on API rate limits
- Claude decides whether to show "last updated" timestamp
- Claude decides empty state handling when data unavailable
- Claude decides token prioritization for data fetching

### Score Integration
- **Replace existing whale score entirely** with Birdeye DEX data (user decision)
- Claude decides whale score weight in overall ranking
- Claude decides buy/sell impact formula on score
- Claude decides whether to expose whale score breakdown to users

### Claude's Discretion
- All threshold definitions and lookback windows
- Visual presentation style and placement
- Refresh frequency and caching strategy
- Score formula and weight adjustments
- Empty state handling

</decisions>

<specifics>
## Specific Ideas

- Green for buys, red for sells — user wants directional color coding
- Replace (not supplement) the existing whale score with real DEX data
- Should integrate cleanly with the existing 5-factor ranking system

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-whale-detection*
*Context gathered: 2026-01-27*
