# Roadmap: Birdeye API Migration

**Created:** 2026-01-21
**Depth:** quick
**Phases:** 3

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Core Data Pipeline | App displays multi-chain token prices from Birdeye | DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04 | 5 |
| 2 | Whale Detection | Dashboard shows DEX-sourced whale activity | WHALE-01, WHALE-02, WHALE-03 | 3 |
| 3 | Token Discovery | Dashboard displays trending tokens across chains | DISC-01, DISC-02, DISC-03 | 3 |

## Phase Details

### Phase 1: Core Data Pipeline

**Goal:** App displays multi-chain token prices from Birdeye instead of CoinGecko

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

## Coverage

| Category | Requirements | Phase | Status |
|----------|-------------|-------|--------|
| Data Collection | DATA-01, DATA-02, DATA-03, DATA-04, DATA-05 | Phase 1 | Pending |
| Multi-Chain | CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04 | Phase 1 | Pending |
| Whale Detection | WHALE-01, WHALE-02, WHALE-03 | Phase 2 | Pending |
| Token Discovery | DISC-01, DISC-02, DISC-03 | Phase 3 | Pending |

**Total:** 15/15 requirements mapped

---
*Roadmap created: 2026-01-21*
