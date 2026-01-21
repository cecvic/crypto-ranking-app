# Testing Patterns

**Analysis Date:** 2026-01-21

## Test Framework

**Status:** No test framework currently configured or in use

**Runner:**
- Not detected. No `jest.config.*`, `vitest.config.*`, or test dependencies found in `package.json`

**Assertion Library:**
- Not applicable - no testing framework present

**Run Commands:**
```bash
# No test commands defined in package.json
# Current scripts available:
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run db:generate      # Generate database migrations
npm run db:migrate       # Run database migrations
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio
```

**Note:** The codebase has no `test`, `test:watch`, or `coverage` scripts configured.

## Test File Organization

**Location:**
- No test files detected in the codebase
- No `__tests__/`, `tests/`, `*.test.ts`, `*.spec.ts`, or `*.test.tsx` files found

**Search results:**
```bash
find /src -type f \( -name "*.test.*" -o -name "*.spec.*" \)
# Returns: No results
```

## Testing Strategy

**Current State:** No automated testing infrastructure

**What This Means:**
- All testing is manual/exploratory
- No regression test suite to prevent breaking changes
- No CI/CD testing gates configured
- No test coverage metrics

**High-Risk Areas Without Tests:**
- Core aggregation logic (`src/lib/services/coin-aggregator.ts`)
- Database operations (`src/lib/db/*-queries.ts`)
- API endpoints (`src/app/api/**/*.ts`)
- Rate limiting (`src/lib/rate-limiter/distributed.ts`)
- Cache operations (`src/lib/cache/redis.ts`)
- AI chat tool integration (`src/lib/ai/tools.ts`)

## Common Patterns to Test (If Framework Added)

**Patterns found in codebase that would benefit from testing:**

### Async Data Fetching
```typescript
// From src/lib/services/coin-aggregator.ts
// Should test: timeout handling, error recovery, data normalization
async function aggregateAllCoins(): Promise<AggregationResult> {
  const [
    dexPaprikaTokens,
    dexScreenerBoosted,
    dexScreenerMemes,
    // ... more parallel fetches with .catch() handlers
  ] = await Promise.all([
    fetchWithTimeout(() => dexpaprika.getTopTokens(...), CONFIG.sourceTimeout, 'label'),
    // ...
  ]);
}
```

### Error Handling in Catch Blocks
```typescript
// From src/app/api/opportunities/route.ts
// Should test: graceful degradation, error message formatting
try {
  // ... operation
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

### Database Query Functions
```typescript
// From src/lib/db/alert-queries.ts
// Should test: proper SQL generation, parameter binding, null handling
export async function getSubscription(
  clerkUserId: string
): Promise<AlertSubscription | null> {
  const db = getDb();
  const results = await db
    .select()
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.clerkUserId, clerkUserId))
    .limit(1);
  return results[0] || null;
}
```

### React Hook Patterns
```typescript
// From src/hooks/use-opportunities.ts
// Should test: query configuration, fetch function, stale time behavior
export function useOpportunities(chain?: string) {
  return useQuery({
    queryKey: ['opportunities', chain],
    queryFn: () => fetchOpportunities(chain),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
```

### Component Logic
```typescript
// From src/components/opportunities/opportunity-card.tsx
// Should test: score calculation, badge variants, formatting
function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 75) return 'default';
  if (score >= 50) return 'secondary';
  return 'outline';
}
```

## What Should Be Mocked

**External APIs:**
- CoinGecko API (`src/lib/apis/coingecko.ts`)
- DexScreener API (`src/lib/apis/dexscreener.ts`)
- DexPaprika API (`src/lib/apis/dexpaprika.ts`)
- DeFiLlama API (`src/lib/apis/defillama.ts`)
- WhaleAlert API (`src/lib/apis/whalealert.ts`)
- LunarCrush API (`src/lib/apis/lunarcrush.ts`)
- Alchemy API (`src/lib/apis/alchemy.ts`)
- Santiment API (`src/lib/apis/santiment.ts`)

**External Services:**
- Redis cache (`src/lib/cache/redis.ts`)
- Database client (`src/lib/db/client.ts`)
- OpenAI API (`@ai-sdk/openai`)
- Clerk authentication

**Network Requests:**
- All `fetch()` calls in hooks and API routes
- Timeout simulation

## What NOT to Mock

**Core Business Logic:**
- Data aggregation and deduplication algorithms
- Scoring and ranking calculations
- Filter functions (stablecoin detection, volume filtering, etc.)
- Type normalization functions

**Component Rendering:**
- UI component structure and layout
- Props passed to Radix UI components
- Conditional rendering logic

**Database Schema:**
- Drizzle ORM query construction
- Schema definition (`src/lib/db/schema.ts`)

## Coverage Gaps

**Critical Untested Areas:**

### API Endpoints
- **Files:** `src/app/api/**/*.ts`
- **What's not tested:**
  - Request parameter validation
  - Cache hit/miss scenarios
  - Rate limiting enforcement
  - Error responses
  - Response format compliance
- **Risk:** High - API contracts could break silently

### Aggregation Service
- **Files:** `src/lib/services/coin-aggregator.ts`
- **What's not tested:**
  - Timeout handling for slow sources
  - Deduplication logic correctness
  - Stablecoin filter accuracy
  - Volume filter threshold correctness
  - Error recovery when sources fail
- **Risk:** High - Core data quality depends on this

### Database Operations
- **Files:** `src/lib/db/*-queries.ts`
- **What's not tested:**
  - Query correctness
  - Data integrity
  - Null/undefined handling
  - Update/delete operation safety
- **Risk:** High - Data corruption risk

### AI Chat Tools
- **Files:** `src/lib/ai/tools.ts`
- **What's not tested:**
  - Tool execution correctness
  - Parameter validation
  - Error handling in tool execution
  - Response format compliance
- **Risk:** Medium - Chat quality and reliability

### Rate Limiting
- **Files:** `src/lib/rate-limiter/distributed.ts`
- **What's not tested:**
  - Sliding window calculation correctness
  - Redis key expiration
  - Distributed consistency
- **Risk:** Medium - Could allow abuse or over-restrict

### Cache Operations
- **Files:** `src/lib/cache/redis.ts`
- **What's not tested:**
  - TTL enforcement
  - Cache invalidation
  - Serialization/deserialization
  - Connection error handling
- **Risk:** Medium - Could serve stale data or lose real-time updates

## Recommended Testing Strategy

**Phase 1: Core Business Logic (High Priority)**
- Unit tests for aggregation, filtering, and scoring functions
- Framework: Vitest (lighter than Jest, works well with Next.js)
- Location: `src/**/__tests__/` (co-located with source)

**Phase 2: API Layer (High Priority)**
- Integration tests for API routes
- Mock external APIs with MSW (Mock Service Worker)
- Test caching behavior

**Phase 3: Database (Medium Priority)**
- Integration tests with test database
- Use Docker for test DB
- Test query correctness

**Phase 4: Components & Hooks (Medium Priority)**
- React Testing Library for components
- React Query testing utilities for hooks

**Phase 5: E2E (Low Priority)**
- Playwright for critical user flows
- Dashboard, ranking viewing, opportunity detection

---

*Testing analysis: 2026-01-21*
