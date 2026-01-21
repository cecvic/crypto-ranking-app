# External Integrations

**Analysis Date:** 2026-01-21

## APIs & External Services

**Cryptocurrency Data:**
- CoinGecko API - Market data, price history, coin information
  - SDK/Client: axios wrapper in `src/lib/apis/coingecko.ts`
  - Auth: `COINGECKO_API_KEY` (optional, improves rate limits)
  - Free tier: 10-30 calls/minute
  - Includes: OHLC data, sparklines, categories (meme-tokens, AI, DeFi)
  - Implements: exponential backoff retry logic

- LunarCrush API - Social sentiment and intelligence
  - SDK/Client: axios wrapper in `src/lib/apis/sentiment.ts`
  - Auth: `LUNARCRUSH_API_KEY` (required)
  - Used for: social_score, galaxy_score, altRank, sentiment
  - Batch operations: Fetch up to 100 coins at once

- CryptoPanic API - News sentiment and market events
  - SDK/Client: axios wrapper in `src/lib/apis/sentiment.ts`
  - Auth: `CRYPTOPANIC_API_KEY` (required)
  - Used for: News voting analysis (positive/negative counts)
  - Endpoint: /posts/ with filter=hot

- Alternative.me Fear & Greed Index - Market sentiment indicator
  - SDK/Client: axios wrapper in `src/lib/apis/sentiment.ts`
  - Auth: None required (public API)
  - Used for: Market-wide sentiment classification

- Birdeye API - Token tracking and security
  - SDK/Client: axios wrapper in `src/lib/apis/birdeye.ts`
  - Auth: `BIRDEYE_API_KEY` (optional)
  - Chains supported: Solana, Ethereum, Base, Arbitrum
  - Used for: Trending tokens, token details, security checks
  - Batch operations: Support for efficient token list fetching

- DEX Screener API - DEX trading data and trending
  - SDK/Client: axios wrapper in `src/lib/apis/dexscreener.ts`
  - Auth: None required
  - Used for: Boosted tokens, pair data, liquidity information

- DefiPaprika API - DeFi protocol information
  - SDK/Client: axios wrapper in `src/lib/apis/dexpaprika.ts`
  - Auth: None required
  - Used for: Protocol metadata, market data

**DeFi Protocols:**
- DefiLlama API - TVL tracking and protocol analytics (FREE)
  - SDK/Client: axios wrapper in `src/lib/apis/whale.ts`
  - Auth: None required
  - Used for: Protocol TVL, chain TVL, stablecoin flows
  - Endpoints: /protocol/{slug}, /v2/chains, /stablecoins

- Whale Alert API - Large transaction tracking
  - SDK/Client: axios wrapper in `src/lib/apis/whale.ts`
  - Auth: `WHALE_ALERT_API_KEY`
  - Minimum threshold: $500,000 USD
  - Used for: Exchange inflow/outflow detection, whale transaction analysis

**Technical Analysis:**
- TaAPI API - Technical indicators and analysis
  - Auth: `TAAPI_API_KEY` (optional)
  - Used for: RSI, MACD, moving averages, Bollinger Bands
  - Client: Abstracted in `src/lib/apis/technical.ts`

- TokenMetrics API - Token-specific metrics
  - Auth: `TOKEN_METRICS_API_KEY` (optional)
  - Client: Referenced but conditionally used

**AI & Language Models:**
- OpenAI GPT-4o - Chat and conversational AI
  - SDK/Client: @ai-sdk/openai (3.0.12)
  - Auth: `OPENAI_API_KEY`
  - Used in: `src/app/api/chat/route.ts` for streaming chat responses
  - Vercel AI SDK integration with crypto/DeFi tools

## Data Storage

**Databases:**
- Neon PostgreSQL
  - Connection: `DATABASE_URL` environment variable
  - Client: @neondatabase/serverless (1.0.2) - Serverless driver
  - ORM: Drizzle ORM (0.45.1)
  - Schemas in: `src/lib/db/schema.ts`
  - Tables:
    - `ranking_snapshots` - Periodic ranking computations
    - `coin_rankings` - Individual coin scores per snapshot
    - `api_cache` - Cached API responses with TTL
    - `whale_events` - Real-time whale transaction events from Alchemy
    - `whale_metrics` - Aggregated whale activity metrics
    - `alert_subscriptions` - User email alert preferences
    - `confluence_alerts_sent` - Alert delivery history

**File Storage:**
- Local filesystem only (email templates in `src/lib/email/templates/`)
- No S3 or cloud storage integration detected

**Caching:**
- Upstash Redis (serverless)
  - Connection: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Client: @upstash/redis (1.36.1)
  - Cache operations: `src/lib/cache/redis.ts`
  - TTL ranges:
    - Rankings: 60 seconds
    - Prices: 120 seconds (2 minutes)
    - Sentiment: 1200 seconds (20 minutes)
    - Technical analysis: 4500 seconds (75 minutes)
    - Opportunities: 120 seconds (2 minutes)
  - Rate limiting: Built-in sliding window implementation
  - Cache keys: Organized by feature (rankings, prices, sentiment, technical, predictions)

## Authentication & Identity

**Auth Provider:**
- Clerk (Hosted authentication)
  - Implementation: `@clerk/nextjs` (6.36.7)
  - Publishable Key: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Secret Key: `CLERK_SECRET_KEY`
  - Sign-in URL: `/sign-in`
  - Sign-up URL: `/sign-up`
  - Redirect after sign-in: `/dashboard`
  - Redirect after sign-up: `/dashboard`
  - Usage: `src/app/layout.tsx` wraps app in `<ClerkProvider>`

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Logs:**
- console.log/console.error throughout codebase
- Structured logging in API routes with prefixes: `[CoinGecko]`, `[LunarCrush]`, `[Alchemy]`, `[QStash]`, `[email]`
- No centralized logging service integration

## CI/CD & Deployment

**Hosting:**
- Vercel (Next.js native platform)
- Framework: Next.js with App Router

**CI Pipeline:**
- Not detected (likely handled by Vercel on push)

**Cron Jobs:**
- QStash (Upstash background job service)
  - Signed with: `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
  - Verification: `src/lib/qstash/verify.ts` with HMAC-SHA256
  - Cron endpoints in: `src/app/api/cron/*`
    - `/api/cron/cleanup` - Scheduled via Vercel cron (0 3 * * * - daily at 3am UTC)
    - `/api/cron/collect-prices` - Fetch price data from CoinGecko
    - `/api/cron/collect-sentiment` - Aggregate sentiment from multiple sources
    - `/api/cron/compute-rankings` - Calculate composite rankings
    - `/api/cron/check-confluence` - Identify confluence signals
    - `/api/cron/poll-opportunities` - Poll DEX data for emerging opportunities

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `UPSTASH_REDIS_REST_URL` - Cache endpoint
- `UPSTASH_REDIS_REST_TOKEN` - Cache auth token
- `OPENAI_API_KEY` - GPT-4o API key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `QSTASH_URL` - QStash message queue endpoint
- `QSTASH_TOKEN` - QStash authentication
- `QSTASH_CURRENT_SIGNING_KEY` - Current signing key for webhook verification
- `QSTASH_NEXT_SIGNING_KEY` - Upcoming signing key for key rotation

**Optional env vars:**
- `COINGECKO_API_KEY` - Enhanced rate limits for CoinGecko
- `LUNARCRUSH_API_KEY` - Social sentiment data (recommended)
- `CRYPTOPANIC_API_KEY` - News sentiment data
- `WHALE_ALERT_API_KEY` - Whale transaction API (requires paid subscription)
- `TAAPI_API_KEY` - Technical analysis indicators
- `TOKEN_METRICS_API_KEY` - Token-specific metrics
- `BIRDEYE_API_KEY` - Token data (optional, some endpoints free)
- `ALCHEMY_API_KEY` - Ethereum and EVM chain webhooks
- `ALCHEMY_WEBHOOK_SIGNING_KEY` - Webhook signature verification
- `RESEND_API_KEY` - Email service for alerts
- `RESEND_FROM_EMAIL` - Sender email address
- `NEXT_PUBLIC_BASE_URL` - Application base URL

**Secrets location:**
- `.env.local` file (git-ignored, local development only)
- Production secrets stored in Vercel Environment Variables dashboard

## Webhooks & Callbacks

**Incoming:**
- Alchemy Webhooks - Real-time Ethereum transfer events
  - Endpoint: `src/app/api/webhooks/alchemy/route.ts`
  - Signature verification: HMAC-SHA256 with `ALCHEMY_WEBHOOK_SIGNING_KEY`
  - Payload: Transfer events with token address, value, from/to addresses
  - Processing: Mapped to CoinGecko IDs and stored in `whale_events` table
  - Features: Large transfer threshold (`WHALE_MIN_VALUE_USD=100000`)
  - Status: `USE_ALCHEMY_WHALE=true` feature flag

**Outgoing:**
- None detected (application is pull-based only)

## Rate Limiting

**Implementation:**
- Upstash Ratelimit (@upstash/ratelimit 2.0.8)
- Chat API: 10 requests per minute per IP/user
- Redis-backed sliding window implementation
- Graceful degradation: Allows on error to prevent blocking

**API Retry Strategy:**
- Exponential backoff with axios-retry
- CoinGecko: 3 retries, handles 429 (rate limit) and 503 (service unavailable)
- Birdeye: 3 retries, same backoff logic
- Other APIs: Custom try-catch with logging

---

*Integration audit: 2026-01-21*
