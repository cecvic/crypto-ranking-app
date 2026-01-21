# Technology Stack

**Analysis Date:** 2026-01-21

## Languages

**Primary:**
- TypeScript 5.x - Entire codebase, strict mode enabled
- JavaScript/JSX - React components

**Secondary:**
- CSS - Tailwind with PostCSS

## Runtime

**Environment:**
- Node.js (via Next.js 16.1.1)
- Browser (React 19.2.3)

**Package Manager:**
- pnpm 10.14.0
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Next.js 16.1.1 - Full-stack React framework with App Router
- React 19.2.3 - UI component library
- React DOM 19.2.3 - DOM rendering

**UI & Components:**
- Radix UI (@radix-ui/*) - Headless UI component library
  - @radix-ui/react-avatar (1.1.11)
  - @radix-ui/react-dropdown-menu (2.1.16)
  - @radix-ui/react-progress (1.1.8)
  - @radix-ui/react-scroll-area (1.2.10)
  - @radix-ui/react-select (2.2.6)
  - @radix-ui/react-separator (1.1.8)
  - @radix-ui/react-slot (1.2.4)
  - @radix-ui/react-switch (1.2.6)
  - @radix-ui/react-tabs (1.1.13)
  - @radix-ui/react-toggle (1.1.10)
  - @radix-ui/react-toggle-group (1.1.11)
  - @radix-ui/react-tooltip (1.2.8)

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS plugin for Tailwind
- class-variance-authority (0.7.1) - Utility for component variants
- clsx (2.1.1) - Conditional className utility
- tailwind-merge (3.4.0) - Merge Tailwind classes intelligently

**Testing:**
- Not detected in package.json (likely handled via separate test runner)

**Build/Dev:**
- TypeScript 5.x - Language compiler and type checking
- ESLint 9.39.2 - Linting
- eslint-config-next 16.1.1 - Next.js ESLint config
- Babel Compiler (1.0.0) - React compiler for optimization
- dotenv 17.2.3 - Environment variable management
- PostCSS - CSS transformation

**ORM/Database:**
- Drizzle ORM (0.45.1) - SQL ORM for type-safe database queries
- Drizzle Kit (0.31.8) - Schema migration and management tool

## Key Dependencies

**Critical:**
- @ai-sdk/openai (3.0.12) - OpenAI API integration for GPT-4o
- @ai-sdk/react (3.0.41) - React hooks for Vercel AI SDK
- ai (6.0.39) - Vercel AI SDK core library
- @neondatabase/serverless (1.0.2) - Neon PostgreSQL serverless driver

**Infrastructure & Caching:**
- @upstash/redis (1.36.1) - Serverless Redis client for caching
- @upstash/qstash (2.8.4) - Serverless message queue for scheduled jobs
- @upstash/ratelimit (2.0.8) - Rate limiting built on Upstash Redis

**HTTP/API:**
- axios (1.13.2) - HTTP client for API calls
- axios-retry (4.5.0) - Automatic retry logic with exponential backoff

**Authentication:**
- @clerk/nextjs (6.36.7) - User authentication and management

**Email:**
- Resend (6.7.0) - Email service for transactional emails
- @react-email/components (1.0.4) - React components for email templates
- react-email (5.2.1) - Email template framework

**Data & State Management:**
- @tanstack/react-query (5.90.16) - Server state management and caching
- @tanstack/react-query-devtools (5.91.2) - Debugging tools for React Query
- @tanstack/react-table (8.21.3) - Headless table component library
- @tanstack/react-virtual (3.13.18) - Virtualization for large lists
- zustand (5.0.10) - Lightweight state management library

**Analytics & Sentiment:**
- sentiment (5.0.2) - Natural language sentiment analysis
- simple-statistics (7.8.8) - Statistical analysis utilities
- rss-parser (3.13.0) - RSS feed parsing

**Charts & Visualization:**
- recharts (3.6.0) - React charting library
- lightweight-charts (5.1.0) - TradingView Lightweight Charts
- framer-motion (12.25.0) - Animation library

**Content & Parsing:**
- react-markdown (10.1.0) - Markdown rendering in React
- remark-gfm (4.0.1) - GitHub Flavored Markdown support
- vaul (1.1.2) - Drawer component library

**Validation:**
- zod (4.3.5) - TypeScript-first schema validation

**Icons:**
- lucide-react (0.562.0) - Icon library

**Utilities:**
- date-fns (4.1.0) - Date manipulation utilities

## Configuration

**Environment:**
- Configuration via `.env.local` (local development)
- Environment variables required:
  - Database: `DATABASE_URL` (Neon PostgreSQL)
  - Caching: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - AI/Chat: `OPENAI_API_KEY`
  - Auth: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - Background Jobs: `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
  - External APIs: `COINGECKO_API_KEY`, `LUNARCRUSH_API_KEY`, `CRYPTOPANIC_API_KEY`, `WHALE_ALERT_API_KEY`, `TAAPI_API_KEY`, `TOKEN_METRICS_API_KEY`, `BIRDEYE_API_KEY`
  - Webhooks: `ALCHEMY_API_KEY`, `ALCHEMY_WEBHOOK_SIGNING_KEY`
  - Email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
  - App: `NEXT_PUBLIC_BASE_URL`

**Build:**
- `tsconfig.json` - TypeScript configuration with strict mode, path aliases (`@/*`)
- `next.config.js` - Next.js build configuration (inferred, not visible)
- `drizzle.config.ts` - Database schema configuration (inferred)
- `vercel.json` - Vercel deployment configuration with cron schedules
- `postcss.config.mjs` - PostCSS configuration for Tailwind

**Feature Flags:**
- `USE_PERSISTENT_STORAGE=true` - Use database for persistent storage
- `USE_LOCAL_SENTIMENT=true` - Use local sentiment analysis over API calls
- `USE_LOCAL_PREDICTION=true` - Use local prediction model over API calls
- `USE_ALCHEMY_WHALE=true` - Enable Alchemy webhook-based whale tracking

## Platform Requirements

**Development:**
- Node.js 18+ (implied by Next.js 16 and modern tooling)
- pnpm 10.14.0
- PostgreSQL compatible database (Neon)
- Redis-compatible cache (Upstash)

**Production:**
- Vercel (primary deployment platform)
- Neon PostgreSQL (database)
- Upstash Redis (caching)
- Upstash QStash (background jobs)
- Alchemy (webhooks for real-time whale tracking)

---

*Stack analysis: 2026-01-21*
