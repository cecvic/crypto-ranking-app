# Roadmap: Birdeye API Migration

**Created:** 2026-01-21
**Depth:** quick
**Phases:** 4

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Core Data Pipeline | App displays multi-chain token prices from Birdeye | DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04 | 5 |
| 2 | Whale Detection | Dashboard shows DEX-sourced whale activity | WHALE-01, WHALE-02, WHALE-03 | 3 |
| 3 | Token Discovery | Dashboard displays trending tokens across chains | DISC-01, DISC-02, DISC-03 | 3 |
| 4 | Activity Rankings & Search | Tokens ranked by activity/opportunity with global search | RANK-01, RANK-02, RANK-03, SEARCH-01, SEARCH-02 | 4 |

## Phase Details

### Phase 1: Core Data Pipeline

**Goal:** App displays multi-chain token prices from Birdeye instead of CoinGecko

**Plans:** 8 plans

Plans:
- [x] 01-01-PLAN.md - Birdeye API client + schema + rate limiting foundation
- [x] 01-02-PLAN.md - Database queries + Redis cache keys
- [x] 01-03-PLAN.md - Price polling cron job
- [x] 01-04-PLAN.md - Token seeding cron job
- [x] 01-05-PLAN.md - API endpoints (/api/tokens)
- [x] 01-06-PLAN.md - React hook (useBirdeyeTokens)
- [x] 01-07-PLAN.md - UI components (table + chain selector)
- [x] 01-08-PLAN.md - Tokens page + navigation + integration test

**Requirements:**
- DATA-01: App fetches token prices from Birdeye `/defi/price` endpoint instead of CoinGecko
- DATA-02: App fetches token volume data from Birdeye market data endpoint
- DATA-03: App displays 24h price change from Birdeye data
- DATA-04: Birdeye API client handles rate limiting (account-level limits)
- DATA-05: Birdeye data cached in Redis with appropriate TTLs
- CHAIN-01: App supports all 11 Birdeye chains (solana, ethereum, arbitrum, avalanche, bsc, optimism, polygon, base, zksync, sui, aptos)
- CHAIN-02: API client uses x-chain header for chain-specific requests
- CHAIN-03: Token addresses stored and indexed per chain
- CHAIN-04: Cron job collects data from all chains sequentially

**Success Criteria:**
1. User sees token prices on dashboard that update from Birdeye data (not CoinGecko)
2. User can view tokens from any of the 11 supported chains in the rankings table
3. User sees 24h price change and volume for tokens across all chains
4. Dashboard continues working when API rate limits are approached (graceful degradation)
5. Token data loads quickly from cache on repeat visits (sub-second response)

**Dependencies:** None

---

### Phase 2: Whale Detection

**Goal:** Dashboard shows DEX-sourced whale activity from on-chain trades

**Plans:** 0 plans

Plans:
- [ ] TBD (created by /gsd:plan-phase)

**Requirements:**
- WHALE-01: App fetches large DEX trades from Birdeye `/defi/v3/trades/token-by-volume` endpoint
- WHALE-02: Whale data integrated into existing whale activity score calculation
- WHALE-03: Dashboard displays DEX-sourced whale activity metrics

**Success Criteria:**
1. User sees whale activity indicators on token cards reflecting actual DEX large trades
2. User can identify tokens with recent whale buying/selling activity in the rankings
3. Whale score calculation incorporates DEX trade data from Birdeye

**Dependencies:** Phase 1

---

### Phase 3: Token Discovery

**Goal:** Dashboard displays trending tokens for new opportunity detection

**Plans:** 0 plans

Plans:
- [ ] TBD (created by /gsd:plan-phase)

**Requirements:**
- DISC-01: App fetches trending tokens from Birdeye `/defi/token_trending` endpoint
- DISC-02: Dashboard displays trending tokens section
- DISC-03: Trending tokens refresh on configurable interval

**Success Criteria:**
1. User sees a trending tokens section on the dashboard
2. User can discover new tokens that are gaining momentum across chains
3. Trending data refreshes automatically without manual intervention

**Dependencies:** Phase 1

---

### Phase 4: Activity Rankings & Search

**Goal:** Tokens ranked by activity and opportunity metrics with global search to find any coin

**Plans:** 5 plans

Plans:
- [ ] 04-01-PLAN.md - Database schema + scoring library (activity/opportunity score functions)
- [ ] 04-02-PLAN.md - Birdeye API extension (Token Overview, Search) + shadcn Command install
- [ ] 04-03-PLAN.md - Activity data cron job + activity-ranked API endpoint
- [ ] 04-04-PLAN.md - Search API + useTokenSearch hook + GlobalSearch component
- [ ] 04-05-PLAN.md - UI integration (score badges, table update, search in header)

**Requirements:**
- RANK-01: App ranks tokens by activity score (volume, trades, unique wallets) instead of market cap
- RANK-02: App calculates opportunity score combining activity metrics, price momentum, and liquidity
- RANK-03: Rankings table displays activity and opportunity scores with visual indicators
- SEARCH-01: Global search bar searches all tokens across all chains by name, symbol, or address
- SEARCH-02: Search results display with relevant token info and link to token details

**Success Criteria:**
1. User sees tokens ranked by activity/opportunity by default (not market cap)
2. User understands why a token ranks high via visible activity metrics
3. User can search for any token using the top search bar
4. Search returns results across all 11 supported chains

**Dependencies:** Phase 1

---

## Coverage

| Category | Requirements | Phase | Status |
|----------|-------------|-------|--------|
| Data Collection | DATA-01, DATA-02, DATA-03, DATA-04, DATA-05 | Phase 1 | Complete |
| Multi-Chain | CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04 | Phase 1 | Complete |
| Whale Detection | WHALE-01, WHALE-02, WHALE-03 | Phase 2 | Pending |
| Token Discovery | DISC-01, DISC-02, DISC-03 | Phase 3 | Pending |
| Activity Rankings | RANK-01, RANK-02, RANK-03 | Phase 4 | Pending |
| Token Search | SEARCH-01, SEARCH-02 | Phase 4 | Pending |

**Total:** 20/20 requirements mapped

---
*Roadmap created: 2026-01-21*
*Phase 1 planned: 2026-01-22*
*Phase 4 planned: 2026-01-27*
