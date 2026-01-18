# Child AGENTS.md Template

Use this template for all subdirectory AGENTS.md files. Keep each file ≤80 lines.

---

```markdown
# AGENTS.md - {Directory Name}

> See root [AGENTS.md](../../AGENTS.md) for project-wide conventions.

## Purpose
{1-2 sentences: what this module does and who works here}

## Structure
```
{directory}/
├── {file1.ts}    # {brief purpose}
├── {file2.ts}    # {brief purpose}
└── ...
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| {common task 1} | `{file}` | {brief note} |
| {common task 2} | `{file}` | {brief note} |

## Conventions (This Directory)
- {Convention specific to this directory}
- {Another convention}

## Anti-Patterns (This Directory)
- {Forbidden pattern specific here}

## Cross-References
- Related: `{path/to/related}`
- See also: `{another/path}`
```

---

## Directory-Specific Guidance

### src/lib/db
- Purpose: Drizzle ORM schema + database queries
- Key files: schema.ts, client.ts, whale-queries.ts
- Conventions: Use Drizzle query builder, lazy client init
- Cross-refs: drizzle/ (migrations), lib/cache (caching layer)

### src/app/api/cron
- Purpose: Background job routes triggered by QStash
- Key files: compute-rankings/route.ts, collect-prices/route.ts
- Conventions: Wrap with verifyCronRequestWithDevBypass, GET for local testing only
- Cross-refs: lib/qstash (verification), lib/ranking (calculator)

### src/lib/apis
- Purpose: External API integrations (CoinGecko, Whale Alert, etc.)
- Key files: coingecko.ts, whale.ts, free-data-sources.ts, technical.ts
- Conventions: Return null on failure, use rate limiter, batch requests
- Cross-refs: lib/cache (caching), lib/rate-limiter (protection)

### src/lib/ranking
- Purpose: Core 5-factor scoring algorithm
- Key files: calculator.ts
- Conventions: normalize() for 0-100 scale, clamp values, pure functions
- Cross-refs: app/api/cron (triggers), lib/types (CoinRanking interface)

### src/lib/qstash
- Purpose: QStash client + cron verification
- Key files: client.ts, verify.ts
- Conventions: Never expose tokens, use dev bypass for local testing
- Cross-refs: app/api/cron (protected routes)

### src/app/api/whale
- Purpose: Whale tracking API endpoints
- Key files: metrics/route.ts, activity/route.ts
- Conventions: Require Clerk auth, return standardized JSON
- Cross-refs: lib/db/whale-queries.ts, components/whale

### src/components/whale
- Purpose: Whale tracking UI components
- Key files: whale-flow-analysis.tsx, whale-activity-feed.tsx
- Conventions: Use TanStack Query hooks, cn() for styling
- Cross-refs: hooks/use-whale-data.ts, app/api/whale

### drizzle
- Purpose: Database migrations managed by Drizzle Kit
- Key files: meta/, SQL files
- Conventions: Never edit generated files manually, run drizzle-kit push
- Cross-refs: lib/db (schema source)

### src/hooks
- Purpose: TanStack Query data fetching hooks
- Key files: use-rankings.ts, use-whale-data.ts
- Conventions: use prefix, return { data, isLoading, error }
- Cross-refs: lib/types, app/api routes

### src/components/ui
- Purpose: Radix UI primitive wrappers
- Key files: button.tsx, card.tsx, table.tsx, etc.
- Conventions: Use cn() for class merging, keep props minimal
- Cross-refs: Root conventions apply

### src/lib/types
- Purpose: TypeScript interfaces and types
- Key files: index.ts, confluence.ts
- Conventions: PascalCase interfaces, export from index.ts
- Cross-refs: Used throughout codebase

### scripts
- Purpose: Utility scripts for seeding, data management
- Key files: seed-*.ts
- Conventions: Run with tsx, document usage in file header
- Cross-refs: lib/db (database access)
