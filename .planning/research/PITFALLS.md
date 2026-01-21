# Pitfalls Research: Birdeye API Migration

**Domain:** CoinGecko to Birdeye API Migration
**Researched:** 2026-01-21
**Confidence:** HIGH (verified against official Birdeye documentation)

## Critical Pitfalls

### 1. Account-Level Rate Limits (Not Per-Endpoint)

**Risk:** Rate limits apply to your ENTIRE ACCOUNT across ALL APIs combined, not per endpoint. Making parallel calls to different endpoints (e.g., fetching token lists + security info + trades simultaneously) will consume from the same rate budget and trigger 429 errors faster than expected.

**Warning Signs:**
- Intermittent 429 errors even when individual endpoint usage seems low
- Failures increase when adding new features that call different endpoints
- Batch operations fail unpredictably

**Prevention:**
- Track total requests per second across ALL Birdeye calls, not just per-endpoint
- Implement a global rate limiter that counts all Birdeye API calls
- Current project has retry logic but no global rate tracking
- Consider a request queue with configurable RPS limit matching your tier

**Phase:** Phase 1 (Foundation) - Implement before any migration work

**Source:** [Birdeye Rate Limiting Documentation](https://docs.birdeye.so/docs/rate-limiting)

---

### 2. Token Address vs Coin ID Data Model Mismatch

**Risk:** CoinGecko uses stable coin IDs (e.g., `bitcoin`, `ethereum`), while Birdeye uses chain-specific token contract addresses (e.g., `So11111111111111111111111111111111111111112` for wrapped SOL). This requires a complete data model redesign, not just API endpoint swaps.

**Warning Signs:**
- Existing database schemas store CoinGecko IDs as primary identifiers
- Frontend expects `coinId` in URLs and state
- Caching keys use CoinGecko IDs
- The existing `symbolToId` mapping in coingecko.ts will not work with Birdeye

**Prevention:**
- Create an abstraction layer that maps between identifier systems
- For existing functionality, consider maintaining CoinGecko for major coins while using Birdeye for Solana/DEX tokens
- Store both identifiers during transition (coingecko_id + token_address)
- Design new database schema with `chain` + `address` as composite key

**Phase:** Phase 1 (Foundation) - Design abstraction before any data migration

**Source:** [Birdeye API Sample Requests](https://docs.birdeye.so/docs/premium-apis-1)

---

### 3. Compute Unit (CU) Cost Explosion

**Risk:** Each API endpoint has different CU costs (ranging from 1 to 500 CUs per call). High-CU endpoints can rapidly exhaust your monthly allocation. The current project's `getTrendingTokens` uses `/defi/tokenlist` (30 CU) and `getTokenSecurity` (50 CU per token) - calling security for 50 tokens = 2,500 CU per batch.

**Warning Signs:**
- Monthly CU usage far exceeds expectations
- Overage charges on the bill
- Features work in development but fail in production due to scale
- Using high-CU endpoints in loops (e.g., `/defi/v3/token/list/scroll` is 500 CU per call)

**Prevention:**
- Map out CU costs for all endpoints you plan to use BEFORE implementation
- Use batch/multi endpoints when available (e.g., `/defi/multi_price` instead of individual `/defi/price` calls)
- Implement CU tracking/monitoring in your application
- Set up alerts at 50%, 75%, 90% of monthly allocation
- Consider caching strategies to reduce repeated calls

**CU Cost Reference for Current Implementation:**
| Endpoint | CU Cost | Current Usage |
|----------|---------|---------------|
| /defi/tokenlist | 30 | getTrendingTokens |
| /defi/token_security | 50 | getTokenSecurity |
| /defi/txs/token | 10 | getRecentTrades |
| /defi/v3/token/list | 100 | (planned) |
| /defi/v3/token/list/scroll | 500 | AVOID unless necessary |

**Phase:** Phase 1 (Foundation) - Cost analysis before feature expansion

**Source:** [Birdeye Compute Unit Costs](https://docs.birdeye.so/docs/compute-unit-cost)

---

### 4. Chain Header Requirement Omission

**Risk:** Every Birdeye API request REQUIRES the `x-chain` header. Missing or incorrect headers result in silent failures or wrong data. Multi-chain queries need `x-chains` (plural) header.

**Warning Signs:**
- Getting Solana data when expecting Ethereum (Solana is default)
- Empty responses for valid token addresses
- Data mismatch between chains

**Prevention:**
- Current birdeye.ts implementation correctly sets `x-chain` header (good)
- Ensure ALL new endpoints include chain header
- For multi-chain features, use `x-chains` with comma-separated values
- Validate chain parameter against `BIRDEYE_CHAINS` constant before API calls
- Add TypeScript enforcement to require chain parameter

**Phase:** Already implemented in current code - maintain discipline for new endpoints

**Source:** [Birdeye Supported Networks](https://docs.birdeye.so/docs/supported-networks)

---

### 5. Chain-Specific Data Availability Gaps

**Risk:** Not all data is available on all chains. Sui network has significant limitations (no wallet APIs, no token_security, no market cap data). Other chains may have subtle differences in data availability.

**Warning Signs:**
- Null/undefined fields for specific chains
- API errors only on certain chains
- Features work on Solana but break on Ethereum

**Prevention:**
- Test ALL endpoints on EACH chain you plan to support
- Document which endpoints work on which chains
- Implement chain-specific fallback logic
- Handle missing data gracefully (already partially done with `mc: t.mc` optional handling)

**Sui-Specific Limitations:**
- Wallet APIs (`/v1/wallet/*`) - NOT SUPPORTED
- `defi/token_security` - NOT SUPPORTED
- `defi/token_creation_info` - NOT SUPPORTED
- `defi/v2/tokens/all` - NOT SUPPORTED
- Market cap (`mc`) and supply - NOT RETURNED in token overview

**Phase:** Phase 2 (Multi-chain expansion) - Test before adding new chains

**Source:** [Birdeye Supported Networks](https://docs.birdeye.so/docs/supported-networks)

---

### 6. Wallet API Severe Rate Limits

**Risk:** Wallet endpoints (`/v1/wallet/*`) have stricter limits: 30 requests per minute (0.5 RPS) regardless of your tier. This is separate from and stricter than general rate limits.

**Warning Signs:**
- Wallet features hitting 429 errors while other features work fine
- Batch wallet operations failing
- User portfolio features unreliable

**Prevention:**
- Implement separate rate limiter for wallet endpoints
- Cache wallet data aggressively
- Batch wallet queries where possible
- Consider WebSocket for real-time wallet tracking (requires Business tier)

**Phase:** Phase 3 (Wallet features) - if/when wallet features are added

**Source:** [Birdeye Rate Limiting](https://docs.birdeye.so/docs/rate-limiting)

---

## Migration-Specific Risks

### 7. No Direct CoinGecko-to-Birdeye Token Mapping

**Risk:** There is no official mapping between CoinGecko coin IDs and Birdeye token addresses. You cannot simply convert `bitcoin` to a Birdeye address - Birdeye uses actual on-chain token addresses.

**Warning Signs:**
- Attempting to use CoinGecko IDs in Birdeye API calls
- Broken links when transitioning URLs
- Missing tokens that exist in CoinGecko but not as on-chain tokens

**Prevention:**
- Understand the fundamental difference: CoinGecko tracks "coins" abstractly, Birdeye tracks on-chain tokens
- For major coins (BTC, ETH), use wrapped token addresses on each chain
- Maintain parallel systems during transition for cross-chain major coins
- Build your own mapping table: `{coingecko_id, chain, token_address}`

**Migration Strategy:**
```
CoinGecko "bitcoin" ->
  Solana: 9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E (wrapped BTC)
  Ethereum: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599 (WBTC)

CoinGecko "solana" ->
  Solana: So11111111111111111111111111111111111111112 (native SOL wrapper)
```

**Phase:** Phase 1 (Foundation) - Design mapping strategy before any migration

---

### 8. Data Field Naming/Structure Differences

**Risk:** CoinGecko and Birdeye return different field names and structures for similar data. Direct field mapping will break.

**CoinGecko vs Birdeye Field Mapping:**
| Concept | CoinGecko Field | Birdeye Field |
|---------|-----------------|---------------|
| 24h Volume | `total_volume` | `v24hUSD` |
| Price Change | `price_change_percentage_24h` | `v24hChangePercent` |
| Market Cap | `market_cap` | `mc` |
| Token ID | `id` (string slug) | `address` (contract address) |
| Image | `image` | `logoURI` |
| Last Update | `last_updated` | Not provided (real-time) |

**Warning Signs:**
- TypeScript errors after switching APIs
- `undefined` values in UI
- Broken charts/displays

**Prevention:**
- Create adapter/transformer functions for each data type
- Current birdeye.ts has good mapping in `getTrendingTokens` - extend this pattern
- Define common internal types that both APIs map to
- Unit test transformers with real API responses

**Phase:** Phase 1 (Foundation) - Build adapters before switching data sources

---

### 9. Loss of CoinGecko-Specific Features

**Risk:** Some features in CoinGecko don't have Birdeye equivalents:
- Category-based queries (`meme-token`, `artificial-intelligence`, `decentralized-finance-defi`)
- Global market data (`/global` endpoint)
- 7-day sparklines in a single request
- Community/social metrics

**Warning Signs:**
- Category pages break after migration
- Global market overview disappears
- Sparkline charts stop working

**Prevention:**
- Audit ALL current CoinGecko features before migration
- Decide: maintain CoinGecko for specific features OR rebuild with Birdeye alternatives
- For categories: Birdeye has `/defi/v3/token/meme/list` for meme tokens only
- For global data: May need to calculate from aggregated token data
- For sparklines: Birdeye OHLCV can build sparklines but requires additional calls

**Current CoinGecko Features to Preserve:**
- `getMemeCoins()` - Birdeye has `/defi/v3/token/meme/list` (partial replacement)
- `getAICoins()` - NO direct Birdeye equivalent
- `getDefiCoins()` - NO direct Birdeye equivalent
- `getGlobalData()` - NO direct Birdeye equivalent
- Sparkline data - Requires separate OHLCV calls in Birdeye

**Phase:** Phase 1 (Foundation) - Feature audit and decision matrix

---

### 10. Pagination Deep Dive Trap

**Risk:** Birdeye uses offset-based pagination, but `/defi/v3/token/list/scroll` (the only cursor-based option) costs 500 CU per call and has 2 RPS limit. Pagination for large datasets becomes expensive and slow.

**Warning Signs:**
- Pagination-heavy features consuming excessive CUs
- Rate limits hit during list traversal
- Incomplete data due to pagination limits

**Prevention:**
- Use offset pagination with reasonable limits (max 100 per page)
- Cache paginated results aggressively
- Avoid scroll endpoint unless absolutely necessary
- Design features to work with "top N" rather than "all"

**Phase:** Phase 2 (Feature development) - Design pagination strategy early

**Source:** [Birdeye Per-API Rate Limits](https://docs.birdeye.so/docs/per-api-rate-limit)

---

## Rate Limit Gotchas

### 11. Free Tier Severely Limited

**Risk:** Free tier (Standard) is essentially unusable for production:
- Only 30,000 CU/month (about 1,000 tokenlist calls)
- 1 RPS maximum
- Limited endpoint access
- No overage allowed

**Warning Signs:**
- Development works, production fails immediately
- CU depleted within hours of launch

**Prevention:**
- Budget for paid tier from the start (Lite $39/mo minimum for real usage)
- Use free tier ONLY for initial development/testing
- Calculate expected CU usage before choosing tier:
  - Example: 1000 users, 10 API calls/user/day = 10,000 calls/day
  - At avg 30 CU/call = 300,000 CU/day = 9M CU/month (needs Premium tier)

**Phase:** Phase 0 (Planning) - Budget and tier selection

**Source:** [Birdeye Pricing](https://docs.birdeye.so/docs/pricing)

---

### 12. 429 Retry Strategy Must Use Exponential Backoff

**Risk:** Aggressive retries after 429 errors will compound the problem and potentially get your API key throttled further.

**Warning Signs:**
- Cascading failures
- Retry storms
- Longer recovery times

**Prevention:**
- Current implementation uses `axiosRetry.exponentialDelay` (good)
- Add jitter to prevent thundering herd
- Implement circuit breaker pattern for prolonged failures
- Consider request queuing with rate limiting

**Phase:** Already partially implemented - enhance with circuit breaker

---

### 13. WebSocket Connection Management

**Risk:** WebSocket connections can silently drop. Without proper ping-pong heartbeat and reconnection logic, real-time features will fail without error indication.

**Warning Signs:**
- Real-time features stop updating without errors
- Stale prices displayed to users
- Memory leaks from zombie connections

**Prevention:**
- Implement ping-pong heartbeat mechanism
- Add reconnection with exponential backoff
- Monitor connection health
- WebSocket requires Business tier ($499/mo minimum)

**Phase:** Phase 3+ (Real-time features) - if WebSocket features planned

**Source:** [Birdeye WebSocket Documentation](https://docs.birdeye.so/docs/websocket)

---

## Moderate Pitfalls

### 14. Price Data Aggregation Delay

**Risk:** Birdeye's aggregated price is updated based on an "internal ranking pool mechanism" - not every transaction results in a price change. This can cause apparent lag vs raw on-chain data.

**Prevention:**
- Set user expectations for slight delay
- Use WebSocket for more real-time needs (Business tier required)
- Don't compare raw trade data to aggregated price and expect exact match

**Source:** [Birdeye SUBSCRIBE_PRICE Documentation](https://docs.birdeye.so/docs/subscribe-price)

---

### 15. Token Security Endpoint Overhead

**Risk:** `getTokenSecurity` is 50 CU per call. Calling it for every token in a list (current pattern) is expensive. For 50 tokens = 2,500 CU just for security checks.

**Prevention:**
- Only fetch security data when user clicks/expands a token
- Cache security data (it doesn't change frequently)
- Consider if security data is needed on every view

---

### 16. Missing Error Response Details

**Risk:** Birdeye error responses may not include detailed information about what went wrong. The documentation lists generic messages.

**Prevention:**
- Log full response bodies on errors
- Build comprehensive error mapping
- Include request details in error logs for debugging

**Source:** [Birdeye Error Handling](https://docs.birdeye.so/docs/error-handling)

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| Phase 1 | Foundation | Data model mismatch | Build abstraction layer first |
| Phase 1 | Foundation | Rate limit architecture | Implement global rate limiter |
| Phase 1 | Foundation | CU budget explosion | Map costs before building |
| Phase 2 | Migration | Feature parity loss | Audit CoinGecko features first |
| Phase 2 | Migration | Token mapping | Build mapping table |
| Phase 3 | Multi-chain | Chain-specific gaps | Test all chains individually |
| Phase 4 | Scale | CU overages | Implement monitoring early |
| Phase 5 | Real-time | WebSocket drops | Heartbeat + reconnection |

---

## Sources

- [Birdeye Rate Limiting](https://docs.birdeye.so/docs/rate-limiting) - HIGH confidence
- [Birdeye Per-API Rate Limits](https://docs.birdeye.so/docs/per-api-rate-limit) - HIGH confidence
- [Birdeye Pricing](https://docs.birdeye.so/docs/pricing) - HIGH confidence
- [Birdeye Compute Unit Costs](https://docs.birdeye.so/docs/compute-unit-cost) - HIGH confidence
- [Birdeye Error Handling](https://docs.birdeye.so/docs/error-handling) - HIGH confidence
- [Birdeye Supported Networks](https://docs.birdeye.so/docs/supported-networks) - HIGH confidence
- [Birdeye WebSocket Documentation](https://docs.birdeye.so/docs/websocket) - HIGH confidence
- [Birdeye API Sample Requests](https://docs.birdeye.so/docs/premium-apis-1) - HIGH confidence
