# Plan: init-deep AGENTS refresh

## Context

### Original Request
Update the AGENTS.md hierarchy using `/init-deep` (update mode, default depth=3) so the documentation reflects actual project structure and high-complexity areas scored via heuristics.

### Interview + Discovery Summary
- Existing AGENTS.md only exists at repo root and omits major domains (Drizzle ORM, Neon DB, Upstash Redis/QStash, whale tracking stack, landing/dashboard components, scripts, thoughts).
- Project scale: ~2081 files, >2.7M LOC, directory depth up to 9, >200 large files (>500 LOC). Requires dynamic agent spawning + strict scope control.
- High-impact directories (scores ≥35) needing coverage: `/.` (root), `src/lib/db`, `src/app/api/cron`, `src/lib/apis`, `src/lib/ranking`, `src/lib/qstash`, `src/app/api/whale`, `src/components/whale`, `drizzle/`, `src/hooks`, `src/components/ui`, `src/lib/types`, `scripts/`, `thoughts/`.
- Cron routes use `verifyCronRequestWithDevBypass`; GET handlers run only locally. API routes require Clerk auth and standard JSON structures with timestamps/logging.
- Cache + rate limiting rely on Upstash Redis (lazy proxy clients), QStash for scheduling, sliding-window distributed limiter, and Postgres fallbacks.
- Anti-patterns from root AGENT: forbid `any`, `@ts-ignore`, empty catch, relative imports where `@/` works, redundant comments, committing `.env.local`.

### Research Highlights
- Root AGENT commands: `npm run dev/build/lint`, `npx tsc --noEmit`. No automated tests (Vitest suggested if added) → manual verification required.
- Cross-cutting utilities centralized in `src/lib/utils.ts`, `src/lib/utils/coin-utils.ts`, `src/lib/ranking/calculator.ts`, `src/lib/confluence/calculator.ts`, `src/lib/constants/stablecoins.ts`.
- Large-file hotspots: `src/components/rankings/rankings-table.tsx`, `src/lib/apis/free-data-sources.ts`, `src/lib/apis/whale.ts`, `src/lib/ranking/calculator.ts`.

### Metis Review (Gaps + Resolutions)
- **Parent/child inheritance**: Child AGENTS.md files must reference root and document only directory-specific deviations (plan includes guardrail + template).
- **Root update strategy**: Merge missing stack + constraints into existing file before creating children (Task 2).
- **Directory inclusion guardrail**: Max 12 child directories using scoring threshold + manual sanity checks (Tasks 3–4).
- **Security-sensitive info**: Document auth/cache conventions at high level; no secrets or operational tokens; cron bypass secret referenced abstractly.
- **Scope creep**: Explicitly exclude code refactors, test creation, or auto-tooling. Documentation only.
- **Validation**: Manual spot-check of 3 generated files vs. code before marking plan complete (Task 9 acceptance criteria).

---

## Work Objectives

### Core Objective
Produce an updated, accurate AGENTS.md hierarchy (root + high-scoring subdirectories) that captures real architectural patterns, guardrails, and anti-patterns without duplicating content or exposing secrets.

### Deliverables
- Updated root `AGENTS.md` including current stack, infra, and guardrails.
- New AGENTS.md files for each scored directory (max 12) adhering to a shared template and referencing the root file.
- Discovery artefacts (scoring table, directory inclusion/exclusion reasoning) documented in plan history/logs.

### Definition of Done
- [x] Root AGENT updated with missing stack components + guardrails noted.
- [x] Child AGENTS.md files created for every directory in the inclusion list (and none outside it).
- [x] Each child file follows the agreed template, references the root, contains ≤150 lines, and excludes sensitive data.
- [x] Manual verification performed on at least 3 randomly selected AGENTS files (root + 2 child) confirming accuracy against code.
- [x] Todo checklist from `/init-deep` instructions marked complete (discovery → scoring → generate → review).

### Must Haves
- Scoring-based inclusion list defined before generation.
- Child files mention cross-directory links (e.g., whale API ↔ whale components) where relevant.
- Explicit callouts for anti-patterns and project-specific constraints inside each file.

### Must NOT Haves (Guardrails)
- No AGENTS.md under generated or tiny directories (<3 source files).
- No duplication of root content; child files only describe deltas/specifics.
- No secrets, tokens, env values, or credential instructions.
- No code or test changes; documentation only.
- Max 12 child AGENTS.md outputs.

---

## Verification Strategy (Manual)
- **Content QA**: For each generated AGENTS file, manually compare against directory contents to ensure accuracy (use `ls`, `rg`, `sed -n` as needed).
- **Spot Checks**: Randomly pick 3 AGENTS.md files (root + 2 children) and verify key claims with code references before completion.
- **Line Count**: Confirm each file ≤150 lines (`wc -l path/to/AGENTS.md`).
- **Linking**: Ensure each child AGENT references the root file (search for "See root AGENTS.md").

Commands (manual execution by implementer):
```bash
ls -R src/lib/db | head -40            # confirm files referenced in AGENT exist
rg -n "verifyCronRequest" src/app/api/cron -g"*.ts"  # validate cron security notes
wc -l AGENTS.md                        # ensure root file within limits post-update
wc -l src/lib/db/AGENTS.md             # repeat for child files
```

---

## Task Flow
```
1 → 2 → 3 → 4
        ↘ 5 → 6 → 7
                  ↘ 8 → 9
```

| Task | Depends On | Notes |
|------|------------|-------|
|1. Prep workspace + capture baseline scoring artifacts|—|Gather stats from discovery for reference|
|2. Update root AGENT|1|Must integrate new stack info + guardrails first|
|3. Finalize directory inclusion/exclusion list|1|Lock list before generation|
|4. Create template + guidance snippets|2|Needed before child generation|
|5. Generate child AGENTS (batch 1)|4|High-priority dirs: lib/db, app/api/cron, lib/apis|
|6. Generate child AGENTS (batch 2)|5|Next tier dirs: lib/ranking, lib/qstash, app/api/whale|
|7. Generate child AGENTS (batch 3)|6|Remaining dirs: components/whale, drizzle, hooks, components/ui, lib/types, scripts, thoughts|
|8. Review & deduplicate|5–7|Ensure no duplication, enforce guardrails|
|9. Verification + wrap-up|8|Manual spot-checks + todo completion|

---

## TODOs

- [x] **1. Prep Workspace & Inputs**
  - Consolidate discovery artefacts (scoring table, explore outputs) into working notes.
  - Snapshot current `AGENTS.md` (root) for diffing later (`cp AGENTS.md AGENTS.root.bak`).
  - Acceptance: backup created; reference materials organized.

- [x] **2. Update Root AGENT**
  - Merge missing stack components (Drizzle, Neon, Upstash Redis/QStash, Resend, Playwright) into `./AGENTS.md` under Tech Stack/Structure.
  - Add sections for cron security pattern, cache/rate-limiter infrastructure, manual testing reality.
  - Document guardrails + forbidden patterns explicitly.
  - Acceptance: `git diff AGENTS.md` shows new sections; file <150 lines; references verified via `rg` for mentioned files.

- [x] **3. Lock Directory Inclusion List**
  - Use scoring results to finalize the child directories (max 12). List + rationale appended to plan log or comments.
  - Explicitly record exclusions (e.g., generated directories, small folders).
  - Acceptance: Written list with scores → shared in plan log/draft; no unapproved dirs proceed.

- [x] **4. Define Child Template & Guidance Library**
  - Draft markdown snippet for child AGENT structure:
    1. Overview (purpose + audience)
    2. Structure (folders/files unique to dir)
    3. Where to Look table (task → file)
    4. Conventions & Anti-patterns (delta vs. root)
    5. Cross-References ("See root AGENT" and related dirs)
  - Prepare quick reference bullets per directory (e.g., key files, commands, APIs) using discovery notes.
  - Acceptance: Template stored (e.g., scratch file or snippet) and referenced during generation.

- [x] **5. Generate Child AGENTS – Batch 1 (Highest Priority)**
  - Directories: `src/lib/db`, `src/app/api/cron`, `src/lib/apis`.
  - Use template; highlight Drizzle schema organization, cron verification pattern, external API aggregation.
  - Include cross-links (e.g., cron ↔ qstash; db ↔ drizzle migrations).
  - Acceptance: Files created with ≤150 lines, referencing root, no duplicate boilerplate; manual `rg` spot-check ensures mentioned files exist.

- [x] **6. Generate Child AGENTS – Batch 2 (Core Logic/Infra)**
  - Directories: `src/lib/ranking`, `src/lib/qstash`, `src/app/api/whale`.
  - Document ranking calculator hotspots, QStash scheduling + verification, whale API contracts + Clerk requirements.
  - Acceptance: Same criteria as Task 5; ensure QStash section warns against exposing secrets.

- [x] **7. Generate Child AGENTS – Batch 3 (Supporting Domains)**
  - Directories: `src/components/whale`, `drizzle`, `src/hooks`, `src/components/ui`, `src/lib/types`, `scripts`.
  - Tailor to audience (UI patterns, migration workflows, hook usage).
  - Acceptance: Files adhere to template; highlight unique conventions (e.g., `drizzle/meta`, hook naming, UI `cn()` usage).

- [x] **8. Review & Deduplicate**
  - Run linting pass if markdown lint available (optional); otherwise manual review.
  - Check for duplicated sentences vs. root; ensure each child references root and stays under length limit.
  - Remove backups (`AGENTS.root.bak`) once diff is reviewed.
  - Acceptance: Manual checklist signed off; duplicates removed; plan guardrails satisfied.

- [x] **9. Verification & Finalization**
  - Spot-check 3 files (root + 2 child) against actual directories using `rg`/`ls` to confirm accuracy.
  - Confirm todo list from `/init-deep` (discovery, scoring, generate, review) marked complete.
  - Record final summary (files updated, directories covered) in PR/notes.
  - Acceptance: Evidence of spot-checks captured (notes or log), todo statuses updated, ready for `/start-work` handoff.

---

## Success Criteria
- Updated AGENTS hierarchy accurately reflects current architecture, infra, and conventions.
- Child AGENTS limited to scoped directories, each referencing root and tailored to domain-specific patterns.
- No sensitive data exposed; files within size limits; duplicates removed.
- Manual verification performed before completion, ensuring usability by future contributors.
