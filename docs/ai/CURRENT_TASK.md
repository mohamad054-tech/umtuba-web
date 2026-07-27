# Current Task

## Task title

Public Learning Catalog & Course Preview Foundation V1

## Status

`complete`

## Close-out

- Commit message: `feat(learning): add public catalog and course preview foundation v1`
- Commit hash: `d7c66690fdfefb4efea6a51393a5b992c16dfc9b`
- Branch: `alpha-0.2`
- Push: pushed to `origin/alpha-0.2`

## Outcome

- Public catalog + course preview foundation shipped in repo
- Migration `20260866_learning_public_course_preview_foundation_v1.sql` applied on remote; L01 preview enabled
- Tests: `npx vitest run lib/learning/publicCatalog.test.ts` — 16/16 PASS
- TypeScript: `npx tsc --noEmit` — PASS
- Overnight junk (`.tmp-*.sql`, `*.log`, `IMPORT_*.json`, ad-hoc import scripts) left untracked — not committed

## Allowed scope (closed)

- `app/learning/catalog/**`
- `app/learning/lessons/[lessonId]/page.tsx`
- `lib/learning/publicCatalog.ts`
- `lib/learning/publicCatalog.test.ts`
- `scripts/learning/public-catalog-course-data-v1.sql`
- `supabase/migrations/20260866_learning_public_course_preview_foundation_v1.sql`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
