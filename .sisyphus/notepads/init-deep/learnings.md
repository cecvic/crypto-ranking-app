# Learnings - init-deep

## Session: 2026-01-18

### Successful Approaches
- Batch generation of child AGENTS.md (3 per batch) worked well for parallel verification
- Template-first approach ensured consistency across all 12 child files
- Keeping files under 50 lines (vs 150 limit) made review easier
- Cross-references between related directories (e.g., cron ↔ qstash) improve navigation

### Conventions Discovered
- All child AGENTS.md must start with: `> See root [AGENTS.md](path) for project-wide conventions.`
- Structure section uses code block with tree format
- "Where to Look" table format: Task | File | Notes
- Anti-patterns section is directory-specific, not duplicating root

### Technical Gotchas
- Root AGENTS.md was 148 lines originally - had to condense code examples to fit new Infrastructure section within 150-line limit
- Relative paths in child files vary by depth (../../ vs ../../../)
- `thoughts/` directory excluded from children (score 15, documentation only - no code patterns to document)

### Commands That Worked
- `find . -name "AGENTS.md" -not -path "*/node_modules/*" -exec wc -l {} \;` - verify all line counts
- `grep -l "root.*AGENTS.md" src/*/AGENTS.md` - verify root references
- `diff AGENTS.root.bak AGENTS.md` - review changes before removing backup

### Files Created
- Root: `./AGENTS.md` (updated, 149 lines)
- Children: 12 files in scored directories (39-49 lines each)
- Template: `.sisyphus/notepads/init-deep/child-template.md`
- Scoring: `.sisyphus/notepads/init-deep/scoring-artifacts.md`
