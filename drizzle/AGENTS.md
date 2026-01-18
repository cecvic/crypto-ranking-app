# AGENTS.md - drizzle

> See root [AGENTS.md](../AGENTS.md) for project-wide conventions.

## Purpose
Database migrations managed by Drizzle Kit. Contains SQL migration files and metadata.

## Structure
```
drizzle/
├── meta/                    # Migration metadata (auto-generated)
├── 0000_*.sql              # Initial schema
└── 0001_*.sql              # Subsequent migrations
```

## Commands
```bash
npx drizzle-kit push        # Apply schema changes to database
npx drizzle-kit generate    # Generate new migration file
npx drizzle-kit studio      # Open Drizzle Studio UI
```

## Where to Look

| Task | File | Notes |
|------|------|-------|
| View current schema | `*.sql` files | SQL definitions |
| Check migration order | `meta/_journal.json` | Migration history |

## Conventions (This Directory)
- Never manually edit generated SQL files
- Schema changes go in `lib/db/schema.ts`, then run `drizzle-kit push`
- Migration files are append-only (never delete)

## Anti-Patterns (This Directory)
- Manual SQL edits to migration files
- Deleting or renaming migration files
- Running migrations without schema.ts changes

## Cross-References
- Schema source: [`lib/db/schema.ts`](../src/lib/db/schema.ts)
- Config: [`drizzle.config.ts`](../drizzle.config.ts)
