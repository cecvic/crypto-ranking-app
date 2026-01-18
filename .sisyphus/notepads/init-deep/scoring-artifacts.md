# Scoring Artifacts - init-deep

## Directory Scoring Results

| Path | Files | Score | Notes |
|------|-------|-------|-------|
| `/src/lib/db` | 5 | 90 | Critical - Drizzle schema + whale queries |
| `/src/app/api/cron` | 5 | 85 | High - QStash job orchestrators |
| `/src/lib/apis` | 10 | 80 | Integration core - external data fetching |
| `/src/lib/ranking` | 1 | 75 | Business heart - scoring calculator |
| `/src/lib/qstash` | 2 | 70 | Infra bridge - job scheduling security |
| `/src/app/api/whale` | 3 | 65 | Feature API - whale endpoints |
| `/src/components/whale` | 4 | 60 | Specialized UI - whale visualization |
| `/drizzle` | 3 | 55 | Schema state - migrations |
| `/src/hooks` | 2 | 50 | Data plumbing - TanStack Query |
| `/src/components/ui` | 15 | 40 | UI library - Radix wrappers |
| `/src/lib/types` | 2 | 40 | Type safety - core interfaces |
| `/scripts` | 2 | 35 | Utilities - seeding |
| `/thoughts` | 13 | 15 | Documentation - research logs |

## Discovery Summary

### Tech Stack (Current vs Documented)
- **Documented**: Next.js 16, React 19, TS 5 strict, Tailwind 4, TanStack Query v5, Radix UI
- **Missing from docs**: Drizzle ORM, Neon Postgres, Upstash Redis/QStash, Resend email, Playwright (unused), Clerk auth

### Infrastructure Patterns
- Cron routes use `verifyCronRequestWithDevBypass` wrapper
- GET handlers only allowed locally (405 in prod)
- API routes require Clerk auth + standardized JSON responses
- Cache: Redis L1, Postgres L2 fallback, lazy proxy init
- Rate limiting: sliding-window distributed limiter

### Cross-Cutting Utilities
- `src/lib/utils.ts` - Tailwind `cn()` helper
- `src/lib/utils/coin-utils.ts` - normalization, deduplication
- `src/lib/ranking/calculator.ts` - scoring algorithm
- `src/lib/confluence/calculator.ts` - signal analysis
- `src/lib/constants/stablecoins.ts` - filtering

### Large File Hotspots
- `src/components/rankings/rankings-table.tsx` (506 lines)
- `src/lib/apis/free-data-sources.ts` (480 lines)
- `src/lib/apis/whale.ts` (365 lines)
- `src/lib/ranking/calculator.ts` (240 lines)

### Anti-Patterns (from root AGENT)
- Forbid `any` type
- Forbid `@ts-ignore` / `@ts-expect-error`
- Forbid empty catch blocks
- Forbid relative imports when `@/` works
- Forbid redundant comments
- Forbid committing `.env.local`

## Inclusion List (Max 12 Child Directories)

### INCLUDED (score ≥35)
1. `src/lib/db` (90)
2. `src/app/api/cron` (85)
3. `src/lib/apis` (80)
4. `src/lib/ranking` (75)
5. `src/lib/qstash` (70)
6. `src/app/api/whale` (65)
7. `src/components/whale` (60)
8. `drizzle` (55)
9. `src/hooks` (50)
10. `src/components/ui` (40)
11. `src/lib/types` (40)
12. `scripts` (35)

### EXCLUDED
- `thoughts` (15) - documentation only, no code
- Generated directories (`.next`, `node_modules`)
- Directories with <3 source files
