# Requirements: Birdeye API Migration

**Defined:** 2026-01-21
**Core Value:** Provide realtime multi-chain crypto rankings with on-chain transaction visibility and liquidity depth

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Collection

- [ ] **DATA-01**: App fetches token prices from Birdeye `/defi/price` endpoint instead of CoinGecko
- [ ] **DATA-02**: App fetches token volume data from Birdeye market data endpoint
- [ ] **DATA-03**: App displays 24h price change from Birdeye data
- [ ] **DATA-04**: Birdeye API client handles rate limiting (account-level limits)
- [ ] **DATA-05**: Birdeye data cached in Redis with appropriate TTLs

### Multi-Chain Support

- [ ] **CHAIN-01**: App supports all 11 Birdeye chains (solana, ethereum, arbitrum, avalanche, bsc, optimism, polygon, base, zksync, sui, aptos)
- [ ] **CHAIN-02**: API client uses x-chain header for chain-specific requests
- [ ] **CHAIN-03**: Token addresses stored and indexed per chain
- [ ] **CHAIN-04**: Cron job collects data from all chains sequentially

### Whale Detection

- [ ] **WHALE-01**: App fetches large DEX trades from Birdeye `/defi/v3/trades/token-by-volume` endpoint
- [ ] **WHALE-02**: Whale data integrated into existing whale activity score calculation
- [ ] **WHALE-03**: Dashboard displays DEX-sourced whale activity metrics

### Token Discovery

- [ ] **DISC-01**: App fetches trending tokens from Birdeye `/defi/token_trending` endpoint
- [ ] **DISC-02**: Dashboard displays trending tokens section
- [ ] **DISC-03**: Trending tokens refresh on configurable interval

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Data Optimization

- **BATCH-01**: Use multi_price endpoint for batch token fetching (up to 100 tokens)
- **HYBRID-01**: Maintain CoinGecko for market_cap_rank since Birdeye lacks it

### Multi-Chain Enhancement

- **AGG-01**: Aggregate same token across multiple chains (e.g., USDC on ETH + Solana)
- **FILTER-01**: User can filter rankings by blockchain

### Token Discovery Enhancement

- **LIST-01**: Display newly listed tokens from Birdeye
- **SEC-01**: Show token security scores (freeze authority, mint authority, rug indicators)

### Real-Time

- **WS-01**: WebSocket integration for real-time price updates (requires Business tier)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Chart data migration | TradingView handles charting, not changing |
| Scoring algorithm changes | Existing sentiment/technical/AI/whale scoring stays as-is |
| Historical data backfill | Start fresh with Birdeye data going forward |
| WebSocket in v1 | Requires Business tier ($499/mo), defer to v2 |
| CoinGecko categories | AI/Meme/DeFi categories from CoinGecko not replicated |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| CHAIN-01 | Phase 1 | Pending |
| CHAIN-02 | Phase 1 | Pending |
| CHAIN-03 | Phase 1 | Pending |
| CHAIN-04 | Phase 1 | Pending |
| WHALE-01 | Phase 2 | Pending |
| WHALE-02 | Phase 2 | Pending |
| WHALE-03 | Phase 2 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-21 after roadmap creation*
