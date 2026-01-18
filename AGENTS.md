# AGENTS.md - Crypto Ranking App

## Commands
```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check
```
No test framework. Use Vitest if adding tests.

## Tech Stack
Next.js 16 (App Router) | React 19 | TypeScript 5 (strict) | Tailwind 4 | TanStack Query v5 | Radix UI | Drizzle ORM | Neon Postgres | Upstash Redis/QStash | Clerk Auth | Resend

## Structure
```
src/
├── app/api/               # API routes + cron jobs
├── components/            # ui/, charts/, rankings/, landing/, dashboard/, whale/
├── hooks/                 # TanStack Query hooks
├── lib/apis/              # External API integrations
├── lib/cache/             # Redis + Postgres cache strategy
├── lib/db/                # Drizzle schema + queries
├── lib/qstash/            # Background job scheduling
├── lib/ranking/           # Score calculation
├── lib/types/             # TypeScript interfaces
├── providers/             # React context providers
└── types/                 # Module declarations (.d.ts)
drizzle/                   # Migration files
scripts/                   # Seed + utility scripts
```

## Imports (in order)
```typescript
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CoinRanking } from '@/lib/types';
```
Always use `@/` alias, never relative paths like `../../../`.

## TypeScript
- Strict mode - no implicit any
- Interfaces in `src/lib/types/index.ts`
- Explicit return types for exports
```typescript
interface CoinData { id: string; symbol: string; price: number; }
type SortDirection = 'asc' | 'desc';
```

## Naming
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `RankingsTable` |
| Hooks | `use` prefix | `useRankings` |
| Functions | camelCase | `calculateScore` |
| Interfaces | PascalCase | `CoinRanking` |
| Constants | SCREAMING_SNAKE | `CACHE_DURATION` |
| Files | kebab-case | `rankings-table.tsx` |

## React Components
```typescript
'use client';
interface StatsCardProps { title: string; value: number; }
export function StatsCard({ title, value }: StatsCardProps) {
  return <div>...</div>;
}
```

## API Routes
```typescript
import { NextResponse } from 'next/server';
let cache: Data[] = [];
let lastFetch = 0;
const CACHE_DURATION = 60000;

export async function GET() {
  try {
    if (cache.length && Date.now() - lastFetch < CACHE_DURATION) {
      return NextResponse.json({ data: cache, cached: true });
    }
    // fetch fresh...
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

## Error Handling
Return `null` or fallbacks on failure, log with `console.error`:
```typescript
export async function fetchData(): Promise<Data | null> {
  try { return (await axios.get(URL)).data; }
  catch (error) { console.error('Fetch error:', error); return null; }
}
```

## Styling
Tailwind + `cn()` for conditional classes:
```typescript
<div className={cn('rounded-lg p-4', isActive && 'bg-primary')} />
```

## Environment Variables
```bash
USE_LOCAL_SENTIMENT=true    # Free in-house sentiment
USE_LOCAL_PREDICTION=true   # Free in-house prediction
```

### Data Fetching
```typescript
const { data, isLoading } = useRankings();
```

### Score Normalization (0-100)
```typescript
const normalized = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
```

### Batch Processing
```typescript
for (let i = 0; i < items.length; i += 5) { await Promise.all(items.slice(i, i + 5).map(process)); }
```

## Infrastructure

### Cron Jobs
Routes in `src/app/api/cron/` wrapped with `verifyCronRequestWithDevBypass`.
- Production: QStash signature verification required
- Development: GET requests allowed for local testing

### Caching
L1 (Redis) → L2 (Postgres) cache-aside pattern in `src/lib/cache/strategy.ts`.
- Keys: `CACHE_KEYS` in `src/lib/cache/redis.ts`; TTLs: `CACHE_TTL`

### Rate Limiting
Sliding-window limiter in `src/lib/rate-limiter/distributed.ts`. Fail-open if Redis unavailable.

### Authentication
Clerk auth for protected routes. Use `auth()` from `@clerk/nextjs/server`.

## Forbidden
- `any` type
- `@ts-ignore` / `@ts-expect-error`
- Empty catch blocks
- Committing `.env.local`
- Relative imports when `@/` works
- Comments that restate code