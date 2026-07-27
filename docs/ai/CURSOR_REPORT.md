# CURSOR_REPORT

## Summary

Public Learning Catalog & Course Preview Foundation V1 — **PASS** / **COMPLETE**.

Committed and pushed on `alpha-0.2` as `feat(learning): add public catalog and course preview foundation v1` `643cae9baab30152abbfb709fde669ee25d9d16f`. Migration `20260866` applied remotely; L01 preview enabled. Guest catalog/course pages use sanitized public DTOs; full lesson route redirects guests to catalog.

## Exact files changed

- `supabase/migrations/20260866_learning_public_course_preview_foundation_v1.sql` (new)
- `lib/learning/publicCatalog.ts` (new)
- `lib/learning/publicCatalog.test.ts` (new)
- `app/learning/catalog/page.tsx` (new)
- `app/learning/catalog/[courseSlug]/page.tsx` (new)
- `app/learning/catalog/actions.ts` (new)
- `app/learning/lessons/[lessonId]/page.tsx` (guest redirect → `/learning/catalog?lesson=`)
- `scripts/learning/public-catalog-course-data-v1.sql` (new; data fix script)
- `docs/ai/CURSOR_REPORT.md` (this report)
- `docs/ai/CURRENT_TASK.md` (task status)

Not committed (left untracked junk): `scripts/learning/.tmp-*.sql`, `*.log`, `IMPORT_*.json`, ad-hoc import `.mjs` / `_patch-fast.js`.

## Migrations created

| File | Applied remotely? |
| --- | --- |
| `20260866_learning_public_course_preview_foundation_v1.sql` | **Yes** (per close-out task state; L01 preview enabled) |

## Security review

| Check | Result |
| --- | --- |
| No service role / live `sk-` secrets in catalog UI | PASS (spot-check) |
| `umtuba-package://` not rendered in catalog UI strings | PASS (stripped via `sanitizePublicText`; hits only in tests + SQL cleanup) |
| `service_role` only in migration grants / RPC grants | PASS (expected) |
| No public SELECT on content blocks / resources | PASS |
| Guest full lesson blocked (redirect before load) | PASS |
| `/learning` still requires login (My Learning) | PASS |
| Preview fail-closed until enabled + public chain | PASS |
| Enroll uses JWT client + `enroll_in_learning_course` RPC | PASS |

## Tests

```
npx vitest run lib/learning/publicCatalog.test.ts
```

**PASS** — 16/16.

## TypeScript

```
npx tsc --noEmit
```

**PASS** (exit 0).

## Build

Not required for this foundation slice. Not run.

## git diff --check

**PASS** on scoped committed files.

## git status --short

```
## alpha-0.2...origin/alpha-0.2
(ahead then pushed; overnight scripts/learning junk left untracked)
```

## Open issues

1. Overnight import/tmp artifacts remain untracked under `scripts/learning/` — safe to delete locally; do not commit.
2. Video Preview streaming — OUT OF SCOPE for V1.

## Final checklist - Public Learning Catalog V1

| Item | Result |
| --- | --- |
| **Overall** | **PASS / COMPLETE** |
| Public Catalog | PASS |
| Public Course Page | PASS |
| Guest Curriculum | PASS |
| Preview | PASS (migration applied; L01 preview enabled) |
| Full Lesson Protection | PASS |
| Enrollment Flow | PASS |
| Course appears publicly | Yes |
| Routes | `/learning/catalog`, `/learning/catalog/[courseSlug]` |
| Migration required | Yes |
| Migration applied | Yes |
| Tests | 16/16 |
| tsc | PASS |
| Commit created | Yes — `643cae9baab30152abbfb709fde669ee25d9d16f` |
| Push | Yes |
