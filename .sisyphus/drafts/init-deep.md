# Draft: init-deep AGENTS refresh

## Requirements (confirmed)
- User triggered `/init-deep` flow to regenerate hierarchical AGENTS.md guidance with scoring + review workflow.
- Mode confirmed: update (modify existing AGENTS.md files as needed).
- Directory depth: use default max depth (3 levels).
- Use scoring heuristics to determine subdirectories needing AGENTS coverage.

## Technical Decisions
- Phase tracking enforced via TodoWrite (discovery, scoring, generate, review).
- Discovery requires concurrent background explore tasks + structural bash/LSP analysis.
- Scoring heuristics include file count weight, subdir count, unique stack elements (drizzle, qstash, whale), presence of large files, directory depth, cross-cutting importance.

## Research Findings
- Existing AGENTS.md only at project root.
- Codebase significantly larger than structure section implies (additional dirs: components/landing, components/dashboard, whale modules, lib/confluence, lib/services, lib/db, scripts, thoughts/ handoffs).
- Project scale: ~2081 files, >2.7M LOC, max depth 9, >200 large files (>500 LOC) => requires additional explore agents (spawned large-file, deep-module, cross-cutting analyses).
- Conventions confirmed from AGENTS.md: Next.js 16 App Router, React 19, TS strict, Tailwind 4, TanStack Query v5, Radix UI.
- Stack additions not documented: Drizzle ORM + Neon Postgres, Upstash Redis/QStash, Resend email, Playwright dependency (unused), Rabbit of aggregator pipeline.
- Existing command usage: npm run dev/build/lint, npx tsc --noEmit (no test framework yet; Vitest recommended if added).
- Cron routes secured via `verifyCronRequestWithDevBypass`; GET handlers only for local testing (405 in prod).
- API routes use Clerk auth, timestamped JSON responses, caching guards, `console.error` logging.
- Cross-cutting utilities concentrated in `src/lib/utils.ts`, `src/lib/utils/coin-utils.ts`, `src/lib/ranking/calculator.ts`, `src/lib/confluence/calculator.ts`, `src/lib/constants/stablecoins.ts`.
- Anti-patterns: forbid `any`, `@ts-ignore`, empty catch blocks, relative imports when alias works, redundant comments, committing `.env.local`.
- Cron + aggregator pipeline uses Redis cache, QStash scheduling, optional signals (technical analysis, AI predictions) with fail-soft design.
- Directory scoring output:
  - `/src/lib/db` score 90 (Drizzle schema + whale queries; core persistence)
  - `/src/app/api/cron` score 85 (QStash job orchestrators)
  - `/src/lib/apis` score 80 (external integrations)
  - `/src/lib/ranking` score 75 (business logic core)
  - `/src/lib/qstash` score 70 (job scheduling security)
  - `/src/app/api/whale` score 65 (whale endpoints)
  - `/src/components/whale` score 60 (feature UI)
  - `/drizzle` score 55 (migration state)
  - `/src/hooks` score 50 (data plumbing)
  - `/src/components/ui` score 40 (shared UI primitives)
  - `/src/lib/types` score 40 (types)
  - `/scripts` score 35 (seed/utilities)
  - `/thoughts` score 15 (docs)
- Cache + infra directories (cache, qstash, rate-limiter) handle resilience: Proxy-based lazy initialization, centralized keys, sliding-window rate limiting, fail-open behavior, security verification wrappers, dev bypass secret.

## Open Questions
- None.

## Scope Boundaries
- INCLUDE: Planning workflow for `/init-deep` update-mode execution with default depth and heuristic-based scoring.
- EXCLUDE: Actual AGENTS.md editing/generation until plan requested.
