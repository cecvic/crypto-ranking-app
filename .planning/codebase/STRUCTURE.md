# Codebase Structure

**Analysis Date:** 2026-01-21

## Directory Layout

```
crypto-ranking/
├── src/
│   ├── app/                          # Next.js App Router pages, API routes, layouts
│   │   ├── api/                      # API route handlers (REST endpoints, webhooks, crons)
│   │   │   ├── chat/                 # AI chat endpoint
│   │   │   ├── coins/                # Coin data endpoints (detail, chart)
│   │   │   ├── cron/                 # Background job endpoints (collect, compute, check)
│   │   │   ├── fear-greed/           # Fear & Greed index endpoint
│   │   │   ├── health/               # Health check endpoint
│   │   │   ├── opportunities/        # Trading opportunity detection
│   │   │   ├── rankings/             # Main rankings aggregation endpoint
│   │   │   ├── trending/             # Trending coins endpoint
│   │   │   ├── whale/                # Whale activity aggregation (metrics, events, top-movements)
│   │   │   ├── alerts/               # Alert subscription management
│   │   │   ├── webhooks/             # Incoming webhooks (Alchemy ERC20 transfers)
│   │   │   └── ohlc/                 # OHLC chart data endpoint
│   │   ├── dashboard/                # Dashboard pages (authenticated)
│   │   │   ├── page.tsx              # Main rankings dashboard
│   │   │   ├── chat/page.tsx         # AI chat dashboard
│   │   │   └── whale-alerts/page.tsx # Whale transaction alerts
│   │   ├── coin/                     # Coin detail page
│   │   │   └── [coinId]/page.tsx     # Dynamic coin detail page
│   │   ├── opportunities/page.tsx    # Trading opportunities discovery page
│   │   ├── sign-in/                  # Clerk authentication
│   │   ├── sign-up/                  # Clerk registration
│   │   ├── layout.tsx                # Root layout with providers
│   │   └── globals.css               # Global styles
│   │
│   ├── components/                   # React components (organized by feature)
│   │   ├── ui/                       # Radix UI + Tailwind primitives
│   │   │   ├── card.tsx              # Card container component
│   │   │   ├── button.tsx            # Button component
│   │   │   ├── table.tsx             # Data table component
│   │   │   ├── badge.tsx             # Badge/tag component
│   │   │   ├── dialog.tsx            # Modal/dialog component
│   │   │   ├── select.tsx            # Dropdown select component
│   │   │   ├── tabs.tsx              # Tabbed interface
│   │   │   ├── tooltip.tsx           # Tooltip component
│   │   │   ├── scroll-area.tsx       # Scrollable area
│   │   │   ├── dropdown-menu.tsx     # Menu component
│   │   │   └── ... (others)          # Additional UI primitives
│   │   ├── dashboard/                # Dashboard feature components
│   │   │   ├── header.tsx            # Navigation header
│   │   │   ├── stats-cards.tsx       # KPI stat cards
│   │   │   ├── top-movers.tsx        # Top gainers/losers section
│   │   │   ├── confluence-opportunities.tsx  # Technical confluence radar
│   │   │   └── AGENTS.md             # Feature documentation
│   │   ├── rankings/                 # Rankings display components
│   │   │   ├── rankings-table.tsx    # Sortable rankings table
│   │   │   └── AGENTS.md             # Component docs
│   │   ├── charts/                   # Chart visualization components
│   │   │   ├── price-chart.tsx       # Price movement chart
│   │   │   ├── ranking-chart.tsx     # Ranking score chart
│   │   │   ├── fear-greed-gauge.tsx  # Fear & Greed gauge chart
│   │   │   └── ... (others)          # Various chart components
│   │   ├── whale/                    # Whale tracking components
│   │   │   ├── whale-transactions.tsx # Large transaction display
│   │   │   ├── whale-metrics.tsx     # Whale activity metrics
│   │   │   └── ... (others)          # Whale-related components
│   │   ├── chat/                     # AI chat interface components
│   │   │   ├── chat-container.tsx    # Main chat UI
│   │   │   ├── message.tsx           # Chat message display
│   │   │   ├── chat-input.tsx        # Message input
│   │   │   └── ... (others)          # Chat-related components
│   │   ├── alerts/                   # Alert management components
│   │   │   ├── alert-subscription-card.tsx  # Subscribe to alerts UI
│   │   │   └── ... (others)          # Alert-related components
│   │   ├── opportunities/            # Trading opportunity components
│   │   │   ├── opportunity-card.tsx  # Single opportunity display
│   │   │   └── ... (others)          # Opportunity-related components
│   │   ├── defi/                     # DeFi protocol components
│   │   │   └── ... (DeFi-related UI) # DeFi display components
│   │   └── landing/                  # Landing page components
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-rankings.ts           # Hook for fetching rankings data
│   │   ├── use-whale-data.ts         # Hook for fetching whale metrics
│   │   ├── use-opportunities.ts      # Hook for fetching trading opportunities
│   │   └── AGENTS.md                 # Hooks documentation
│   │
│   ├── lib/                          # Core business logic and utilities
│   │   ├── apis/                     # External API client wrappers
│   │   │   ├── coingecko.ts          # CoinGecko API wrapper
│   │   │   ├── sentiment.ts          # LunarCrush/CryptoPanic API wrapper
│   │   │   ├── technical.ts          # TAAPI technical analysis wrapper
│   │   │   ├── whale.ts              # Whale alert APIs wrapper
│   │   │   ├── prediction.ts         # AI prediction API wrapper
│   │   │   ├── local-prediction.ts   # Local/internal prediction model
│   │   │   ├── local-sentiment.ts    # Local sentiment analysis
│   │   │   ├── free-data-sources.ts  # Free API sources aggregator
│   │   │   ├── birdeye.ts            # Birdeye DEX API wrapper
│   │   │   ├── dexscreener.ts        # DexScreener API wrapper
│   │   │   ├── dexpaprika.ts         # DexPaprika API wrapper
│   │   │   ├── AGENTS.md             # API integration documentation
│   │   │
│   │   ├── db/                       # Database access layer
│   │   │   ├── client.ts             # Neon + Drizzle ORM client initialization
│   │   │   ├── schema.ts             # Database schema definitions (Drizzle)
│   │   │   ├── queries.ts            # Common database queries (rankings, snapshots)
│   │   │   ├── whale-queries.ts      # Whale event queries
│   │   │   ├── opportunity-queries.ts # Opportunity queries
│   │   │   ├── alert-queries.ts      # Alert/subscription queries
│   │   │
│   │   ├── cache/                    # Caching strategies
│   │   │   ├── redis.ts              # Upstash Redis client + CACHE_KEYS constants
│   │   │   └── strategy.ts           # Cache read/write strategies
│   │   │
│   │   ├── ranking/                  # Ranking computation engine
│   │   │   ├── calculator.ts         # Core scoring algorithm + weight system
│   │   │   └── AGENTS.md             # Ranking logic documentation
│   │   │
│   │   ├── types/                    # Shared TypeScript interfaces
│   │   │   └── index.ts              # Core types (CoinPrice, CoinRanking, signals)
│   │   │
│   │   ├── services/                 # High-level business logic
│   │   │   └── coin-aggregator.ts    # Multi-source coin aggregation service
│   │   │
│   │   ├── rate-limiter/             # API rate limiting
│   │   │   └── distributed.ts        # Upstash-based distributed rate limiter
│   │   │
│   │   ├── qstash/                   # Background job orchestration
│   │   │   ├── verify.ts             # QStash webhook verification
│   │   │   └── ... (QStash helpers)  # Background job utilities
│   │   │
│   │   ├── confluence/               # Technical confluence detection
│   │   │   └── ... (confluence logic) # Confluence signal algorithms
│   │   │
│   │   ├── opportunity/              # Trading opportunity detection
│   │   │   └── ... (opportunity logic) # Opportunity scanning algorithms
│   │   │
│   │   ├── defi/                     # DeFi protocol analysis
│   │   │   └── ... (DeFi helpers)    # DeFi-related utilities
│   │   │
│   │   ├── email/                    # Email notification system
│   │   │   ├── templates/            # Email template components (React Email)
│   │   │   └── ... (email helpers)   # Email sending utilities
│   │   │
│   │   ├── ai/                       # AI/ML integration
│   │   │   └── ... (AI helpers)      # AI-related utilities
│   │   │
│   │   ├── crypto/                   # Crypto-specific utilities
│   │   │   └── ... (crypto helpers)  # Utility functions for crypto operations
│   │   │
│   │   ├── constants/                # Application constants
│   │   │   └── ... (constant definitions) # Config constants
│   │   │
│   │   └── utils/                    # Generic utility functions
│   │       └── coin-utils.ts         # Coin data normalization and filtering
│   │
│   ├── providers/                    # React context providers
│   │   └── query-provider.tsx        # React Query + TanStack Query setup
│   │
│   └── types/                        # Additional type definitions (if needed)
│
├── drizzle/                          # Drizzle ORM migrations and meta
│
├── public/                           # Static assets (images, icons, fonts)
│
├── .next/                            # Next.js build output (git ignored)
│
├── scripts/                          # Utility scripts
│
├── .planning/                        # GSD planning documents
│   └── codebase/                     # Architecture and structure docs
│       ├── ARCHITECTURE.md           # This file's companion
│       ├── STRUCTURE.md              # This file
│       └── ...                       # Other planning docs
│
├── .claude/                          # Claude-related configuration
│
├── .sisyphus/                        # Sisyphus (GSD) work tracking
│   ├── plans/                        # Phase plans
│   ├── drafts/                       # Draft documents
│   └── notepads/                     # Working notes
│
├── package.json                      # Dependencies, scripts, metadata
├── pnpm-lock.yaml                    # Locked dependency versions
├── pnpm-workspace.yaml               # Workspace configuration
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── postcss.config.mjs                # PostCSS configuration
├── drizzle.config.ts                 # Drizzle ORM configuration
├── eslint.config.mjs                 # ESLint configuration
├── components.json                   # Shadcn/UI component registry
└── README.md                         # Project documentation
```


## Directory Purposes

**src/app/**
- Purpose: Next.js App Router entry point; defines all pages and API routes
- Contains: Route handlers (GET/POST), page components, layouts, error boundaries
- Key files: `layout.tsx` (root provider setup), `dashboard/page.tsx` (main app)

**src/app/api/**
- Purpose: RESTful API endpoints serving data to frontend and external systems
- Contains: HTTP handlers organized by feature (rankings, coins, whale, alerts, cron, webhooks)
- Key files: `rankings/route.ts` (main endpoint), `cron/compute-rankings/route.ts` (background job)

**src/components/**
- Purpose: Reusable React components organized by feature domain
- Contains: UI primitives (Radix-based), feature components (rankings, charts, chat, whale), layouts
- Key files: `dashboard/`, `charts/`, `ui/` subdirectories

**src/hooks/**
- Purpose: Custom React hooks for data fetching and state management
- Contains: React Query hooks wrapping API endpoints
- Key files: `use-rankings.ts`, `use-whale-data.ts`, `use-opportunities.ts`

**src/lib/**
- Purpose: Core business logic, data access, and utilities
- Contains: API clients, database queries, ranking algorithms, caching, type definitions
- Key files: `ranking/calculator.ts` (scoring), `db/schema.ts` (database), `cache/redis.ts` (caching)

**src/lib/apis/**
- Purpose: Wrapper clients for external data sources
- Contains: CoinGecko, LunarCrush, TAAPI, Whale APIs, DeFi data, DEX data
- Key files: `coingecko.ts` (prices), `sentiment.ts` (social), `technical.ts` (TA), `whale.ts` (large txns)

**src/lib/db/**
- Purpose: Database abstraction with Drizzle ORM
- Contains: Schema definitions, query builders, client initialization
- Key files: `schema.ts` (table definitions), `client.ts` (connection pool), `queries.ts` (common queries)

**src/lib/cache/**
- Purpose: Multi-tier caching strategy
- Contains: Redis client wrapper, cache key constants, fallback strategies
- Key files: `redis.ts` (Upstash integration), `strategy.ts` (read/write logic)

**src/lib/ranking/**
- Purpose: Core ranking algorithm
- Contains: Weighted scoring, normalization, coin ranking computation
- Key files: `calculator.ts` (DEFAULT_WEIGHTS: sentiment 0.20, technical 0.25, whale 0.20, ai 0.20, pricePerf 0.15)

**src/lib/types/**
- Purpose: Shared TypeScript interfaces for type safety across layers
- Contains: CoinPrice, CoinRanking, SentimentData, TechnicalAnalysis, WhaleActivity, AIPrediction, FearGreedIndex
- Key files: `index.ts` (all core types)

**src/providers/**
- Purpose: React context providers for global state
- Contains: React Query client setup with staleTime (30s), gcTime (5min), retry (3x)
- Key files: `query-provider.tsx` (QueryClientProvider wrapper)

**public/**
- Purpose: Static assets served directly by Next.js
- Contains: Images, icons, fonts, favicon
- Generated: Some images loaded from external sources (CoinGecko, LinkedIn)


## Key File Locations

**Entry Points:**

- `src/app/layout.tsx`: Root layout with ClerkProvider (auth) and QueryProvider (data fetching)
- `src/app/dashboard/page.tsx`: Main rankings dashboard, uses `useRankings()` hook
- `src/app/api/rankings/route.ts`: Primary API endpoint for fetching rankings with 3-tier cache
- `src/app/api/cron/compute-rankings/route.ts`: Background job computing rankings every 5 minutes

**Configuration:**

- `.env.local`: Environment variables (DATABASE_URL, UPSTASH_REDIS_*, OpenAI key, etc.)
- `next.config.ts`: Image remote patterns (CoinGecko, LinkedIn, Coingecko assets)
- `drizzle.config.ts`: Database migrations and introspection
- `tsconfig.json`: TypeScript compiler options + path aliases (@/*)

**Core Logic:**

- `src/lib/ranking/calculator.ts`: Weighted score calculation with DEFAULT_WEIGHTS
- `src/lib/services/coin-aggregator.ts`: Multi-source coin aggregation (DexPaprika, DexScreener, CoinGecko)
- `src/lib/db/schema.ts`: Drizzle schema (ranking_snapshots, coin_rankings, whale_events, api_cache, etc.)
- `src/lib/apis/coingecko.ts`: Top coins, market cap, price history

**Testing:**

- No test directory visible (testing patterns not yet established, likely a future concern)

**Utilities:**

- `src/lib/utils.ts`: Generic utility export
- `src/lib/utils/coin-utils.ts`: Coin deduplication, filtering, normalization


## Naming Conventions

**Files:**

- **Pages**: `page.tsx` (Next.js convention)
- **Route handlers**: `route.ts` (Next.js convention)
- **Layouts**: `layout.tsx` (Next.js convention)
- **Components**: PascalCase (e.g., `StatsCards.tsx`, `RankingsTable.tsx`)
- **Hooks**: camelCase with `use-` prefix (e.g., `use-rankings.ts`)
- **Utilities**: camelCase (e.g., `coin-aggregator.ts`)
- **Types**: PascalCase (e.g., `CoinPrice`, `SentimentData`)
- **API clients**: lowercase with module name (e.g., `coingecko.ts`, `sentiment.ts`)

**Directories:**

- **Feature folders**: lowercase, plural for collections (e.g., `components/`, `hooks/`)
- **API route folders**: lowercase matching endpoint path (e.g., `api/rankings/`, `api/cron/`)
- **Page folders**: dynamic segments in brackets (e.g., `coin/[coinId]/`)

**Functions & Variables:**

- **Component names**: PascalCase (e.g., `DashboardHeader`, `StatsCards`)
- **Function names**: camelCase (e.g., `calculateRankingScore()`, `fetchRankings()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_WEIGHTS`, `CACHE_KEYS`)
- **Class names**: PascalCase (none currently visible, types preferred)
- **Type names**: PascalCase interfaces (e.g., `CoinPrice`, `RankingWeights`)


## Where to Add New Code

**New Feature (e.g., Risk Assessment):**

1. **Business Logic**: Create `src/lib/risk/` with scoring function (e.g., `calculator.ts`)
2. **API Endpoint**: Create `src/app/api/risk/route.ts` that uses scoring function
3. **Database**: Add tables to `src/lib/db/schema.ts` (e.g., `riskSnapshots`)
4. **Queries**: Add query functions to `src/lib/db/queries.ts` or new `risk-queries.ts`
5. **Cache**: Add CACHE_KEYS entries to `src/lib/cache/redis.ts`
6. **Types**: Add interfaces to `src/lib/types/index.ts`
7. **Components**: Create `src/components/risk/` with UI components
8. **Hook**: Create `src/hooks/use-risk.ts` for client-side fetching
9. **Cron**: Create `src/app/api/cron/compute-risk/route.ts` if background job needed

**New API Integration (e.g., BlockchainIntel API):**

1. **Client Wrapper**: Create `src/lib/apis/blockchainintel.ts` with fetch + error handling
2. **Types**: Add response/data types to `src/lib/types/index.ts`
3. **Normalization**: If combining with other sources, add to aggregator in `src/lib/services/`
4. **Caching**: Add cache keys to `src/lib/cache/redis.ts`
5. **Endpoint**: If new endpoint needed, create `src/app/api/[feature]/route.ts`

**New Component:**

1. Location: `src/components/[feature]/[ComponentName].tsx`
2. Pattern: Export default function (functional component), accept typed props
3. Usage: Import into page components or other components
4. Styling: Use Tailwind classes, import Radix UI primitives from `@/components/ui/`
5. Example: `src/components/dashboard/stats-cards.tsx` follows this pattern

**New Page:**

1. Location: `src/app/[feature]/page.tsx` or `src/app/[feature]/[param]/page.tsx`
2. Pattern: Default export of React component
3. Layout: Optional `layout.tsx` in same directory for shared structure
4. Data fetching: Use hooks (client component) or Server Components pattern
5. Authentication: Check `userId` via `auth()` if protected

**New Hook:**

1. Location: `src/hooks/use-[feature].ts`
2. Pattern: Wrap React Query `useQuery()` or `useMutation()`
3. Export: Named export matching file name
4. Example: `useRankings()` from `use-rankings.ts`

**Cron Job:**

1. Location: `src/app/api/cron/[job-name]/route.ts`
2. Pattern: Verify request via `verifyCronRequestWithDevBypass()`, execute, return NextResponse
3. Register: Add URL to Upstash QStash scheduler
4. Example: `compute-rankings` runs every 5 minutes


## Special Directories

**drizzle/:**
- Purpose: Database schema migrations and metadata
- Generated: Yes (from Drizzle Kit commands: `db:generate`, `db:migrate`, `db:push`)
- Committed: Yes (migrations are version controlled)

**.next/:**
- Purpose: Next.js build output and cache
- Generated: Yes (created by `npm run build`)
- Committed: No (.gitignore)

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (from pnpm install)
- Committed: No (.gitignore)

**.planning/:**
- Purpose: GSD codebase mapping and phase planning documents
- Generated: Yes (by GSD agents)
- Committed: Yes (architecture/strategy docs)

**.sisyphus/:**
- Purpose: Work tracking for GSD orchestrator
- Contents: Plans, drafts, notepads
- Committed: Yes (work history)

---

*Structure analysis: 2026-01-21*
