# Coding Conventions

**Analysis Date:** 2026-01-21

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `DashboardHeader.tsx`, `OpportunityCard.tsx`)
- Hook files: kebab-case with `use-` prefix (e.g., `use-opportunities.ts`)
- Utility files: kebab-case (e.g., `coin-utils.ts`, `coin-aggregator.ts`)
- API routes: kebab-case in nested directories (e.g., `/api/whale/top-movements/route.ts`)
- Database query files: kebab-case with `-queries` suffix (e.g., `alert-queries.ts`)
- Service files: kebab-case (e.g., `coin-aggregator.ts`)

**Functions:**
- Exported async functions: camelCase prefixed with action verb (e.g., `aggregateAllCoins()`, `getActiveSubscriptions()`, `fetchOpportunities()`)
- React components: PascalCase (e.g., `OpportunityCard`, `DashboardHeader`, `function DashboardHeader() {}`)
- Helper/private functions: camelCase (e.g., `getScoreBadgeVariant()`, `getScoreLabel()`, `fetchWithTimeout()`)
- React hooks: camelCase with `use` prefix (e.g., `useOpportunities()`, `useQuery()`)

**Variables:**
- Constants in UPPERCASE_SNAKE_CASE when module-level (e.g., `const CONFIG = {...}`, `const CACHE_TTL = {...}`)
- Regular variables: camelCase (e.g., `normalized`, `deduped`, `filtered`, `cacheKey`)
- React props: camelCase (e.g., `opportunity`, `chain`, `minScore`)
- Interface props: suffix with `Props` (e.g., `OpportunityCardProps`)

**Types:**
- Interfaces: PascalCase, no `I` prefix (e.g., `CoinPrice`, `SentimentData`, `OpportunityData`)
- Type aliases: PascalCase (e.g., `AggregationResult`)
- Database schemas: camelCase (e.g., `alertSubscriptions`, `alertHistory`)
- Enums: PascalCase with string values (e.g., `'strong_buy' | 'buy' | 'neutral' | 'sell'`)

## Code Style

**Formatting:**
- Indentation: 2 spaces
- Line length: Implicit soft limit around 100 characters
- Semicolons: Required
- Quotes: Double quotes for strings
- Trailing commas: Used in multiline structures

**Linting:**
- Tool: ESLint 9 with Next.js and TypeScript configs
- Config file: `eslint.config.mjs` (new flat config format)
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No custom formatting tool (Prettier) detected; rely on ESLint
- Common ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

**Strict TypeScript:**
- `strict: true` in `tsconfig.json`
- `noEmit: true` during type checking
- Type annotations required for function parameters and return types
- Explicit type casting with `as` when necessary (e.g., `(e as Error).message`)

## Import Organization

**Order:**
1. Third-party React and framework imports (React, Next.js, etc.)
2. Third-party library imports (UI libraries, utilities, etc.)
3. Internal lib imports (services, APIs, utils, types, etc.)
4. Internal component imports
5. Internal hook imports
6. Directive imports (`'use client'` at top of client components)

**Example from codebase:**
```typescript
// src/app/api/chat/route.ts
import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { cryptoTools, defiTools } from '@/lib/ai/tools';
import { systemPrompt } from '@/lib/ai/prompts';
import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '@/lib/cache/redis';
```

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Used throughout codebase (e.g., `@/lib/utils`, `@/components/ui/button`, `@/hooks/use-opportunities`)

## Error Handling

**Patterns:**
- Standard try-catch blocks in API routes and async functions
- Error type checking with `instanceof Error` for accessing `.message` property
- Catch handlers that gracefully degrade (return null, empty array, or partial results)
- Detailed console error logging with context (e.g., `console.error('[API /opportunities] Error:', error)`)
- API responses always include `success` boolean and `timestamp`
- Error responses follow structure: `{ success: false, error: string, timestamp: string }`

**Example error handling pattern:**
```typescript
// src/app/api/opportunities/route.ts
try {
  // ... operation code
} catch (error) {
  console.error('[API /opportunities] Error:', error);
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}
```

**Error recovery in Promise chains:**
```typescript
// src/lib/services/coin-aggregator.ts
coingecko.getMemeCoins(100).catch(() => []),  // Default to empty array
getAggregatedSentiment(coin.id, coin.symbol).catch(() => null),  // Default to null
```

## Logging

**Framework:** `console` for logging

**Patterns:**
- Prefix log messages with service/module context in brackets (e.g., `[Aggregator]`, `[API /opportunities]`, `[Aggregator-Quick]`)
- Log informational messages with `console.log()`
- Log warnings with `console.warn()`
- Log errors with `console.error()`
- Include relevant context variables in logs
- Detailed logging during data aggregation with operation counts and timings

**Example logging:**
```typescript
console.log('[Aggregator] Starting multi-source coin aggregation...');
console.log('[Aggregator] Source counts:');
console.log(`  - DexPaprika: ${dexPaprikaTokens.length} tokens`);
console.log(`[Aggregator] Completed in ${result.metadata.fetchDurationMs}ms`);
console.warn(`[Aggregator] Errors encountered: ${errors.join(', ')}`);
```

## Comments

**When to Comment:**
- File-level comments describing module purpose (e.g., `// Coin Aggregator Service`)
- JSDoc comments for exported functions with parameters and return types
- Inline comments for complex logic or non-obvious decisions
- Section headers for grouping related functions (e.g., `// ============================================`)

**JSDoc/TSDoc:**
- Used for exported public functions
- Includes description, param types, and return type
- Concise single-line or multi-line format

**Example:**
```typescript
/**
 * Aggregate coins from all sources
 * This is the main entry point for the cron job
 */
export async function aggregateAllCoins(): Promise<AggregationResult> {
  // ...
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout<T>(
  fetcher: () => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  // ...
}
```

## Function Design

**Size:** Functions generally 50-100 lines; larger functions decomposed with helper functions at module level

**Parameters:**
- Named parameters preferred over multiple positional arguments
- Destructuring used for complex parameter objects
- Optional parameters indicated with `?`
- Explicit types for all parameters

**Return Values:**
- Explicit Promise types for async functions (e.g., `Promise<AggregatedCoin[]>`)
- Void when no return needed
- Union types used when multiple types possible (e.g., `AlertSubscription | null`)
- Always return consistent types, no implicit undefined

## Module Design

**Exports:**
- Named exports for functions, types, constants
- Default exports avoided (except for React components in some cases)
- Exported types with matching names to their usage

**Barrel Files:**
- Not extensively used; imports tend to be direct from source files
- Some directories export collections (e.g., `@/lib/ai/tools` re-exports `cryptoTools` and `defiTools`)

**Module organization:**
- Related functions grouped together (e.g., all CRUD operations in one section)
- Section separators used: `// ============================================`
- Helpers placed at end of module after main exports

---

*Convention analysis: 2026-01-21*
