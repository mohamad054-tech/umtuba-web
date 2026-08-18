# CURSOR_REPORT — Ingest UMTUBA Originals into executable Learning sandbox V1

```text
SOURCE_DEVICE = CENTRAL / SERVER
DEVICE_ROLE = IMPLEMENTATION
TASK_ID = CENTRAL_INGEST_UMTUBA_ORIGINALS_SANDBOX_V1
REPORT_TYPE = PRODUCT_INTEGRATION_ONLY
TIMESTAMP_LOCAL = 2026-08-18 ~23:00 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
PUSH = NO
PRODUCTION_MUTATED = NO
REMOTE_MIGRATION_APPLIED = NO
SQL_20260929_APPLIED = NO
SQL_20260930_REAPPLIED = NO
MOBILE_SOURCE_CHANGED = NO
MOBILE_RELEASE_TRAIN_DISTURBED = NO
STORE_DEMO_PREVIEW_SET = NO
SANDBOX_HUB_PRESERVED = YES
STORE_V2_PRESERVED = YES
LEARNING_V2_PRESERVED = YES
CATALOG_910fb3b8_PRESERVED = YES
ACCESS_CONTROL_PRESERVED = YES
NOINDEX_PRESERVED = YES
CONTENT_REWRITTEN = NO
PRIVATE_SANDBOX_DEPLOYED = NO
```

## Summary

Ingested the three UMTUBA Originals draft courses into the private Learning sandbox without rewriting lesson bodies. PC2 packet `PC2_UMTUBA_ORIGINALS_CONTENT_BUILD_V1` was not on disk; authoritative bodies came from pre-company pilot `cd39b883`. Stacked onto Desktop catalog commit `910fb3b8` (parent live `fbb6b364`) so the 26-SKU productization is not dropped. `lib/store/demo` and `910fb3b8` catalog files were not modified. Live Hetzner remains `fbb6b364-20260818222318`. No deploy.

Counts: COURSES=3 MODULES=12 LESSONS=36 MODULE_QUIZZES=12 FINALS=pe-final/ds-final/ai-final (4/5, unlimited, SCORE) LESSON_EXERCISES=24 COURSE_EXERCISES=8 (all authored; packet asked 6). Completion follows PC2 (lessons + module quizzes + final); exercises are not a silent extra gate for Originals. Partner AI stays blocked.

## Exact files changed

- `app/components/sandbox/learning/LearningActions.tsx`
- `app/components/sandbox/learning/LearningSandbox.tsx`
- `lib/sandbox/fixtures/courses.ts`
- `lib/sandbox/fixtures/originals.ts` (deleted; replaced by directory)
- `lib/sandbox/fixtures/originals/**` (pilot copy + adapt)
- `lib/sandbox/fixtures/types.ts`
- `lib/sandbox/i18n.ts`
- `lib/sandbox/learning/catalog.ts`
- `lib/sandbox/learning/certificates.ts`
- `lib/sandbox/learning/completion.ts`
- `lib/sandbox/learning/index.ts`
- `lib/sandbox/learning/learning.executable.test.ts`
- `lib/sandbox/learning/originals.ingest.test.ts`
- `lib/sandbox/learning/state.ts`
- `lib/sandbox/learning/tutor.ts`
- `scripts/verify-originals-ingest.mts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

Not changed: `lib/store/demo/**`, `lib/sandbox/fixtures/store.ts`, `lib/sandbox/fixtures/catalog.test.ts`, Store shopper files, production `/learning`.

## Migrations created

None.

## Security review

- Private sandbox only; public catalog flags remain false; drafts unpublished.
- No production enrollments or certificates created.
- Certificate preview marked SANDBOX/DEMO, ISSUER=UMTUBA, no accreditation/degree claims.
- Partner `AI_USAGE_ALLOWED` stays denied; tutor is local and does not send to external AI.
- Mock Learning payments remain isolated (`LearningPaymentOutcome`).
- Catalog 26-SKU files from `910fb3b8` untouched.
- No secrets printed. SQL 20260929/20260930 not applied. Mobile not touched.

## Tests

PASS — 78 tests / 14 files including `originals.ingest.test.ts`, `learning.executable.test.ts`, `catalog.test.ts`, `lib/store/demo/catalog.test.ts`, Store V2 shopper/payment/session tests, access/containment.

Verifier: lessons=36 quizzes=12 lessonExercises=24 courseExercises=8 finals=pe-final,ds-final,ai-final. Failed final <4/5 covered. Three-course QA covered.

## TypeScript

PASS — `npx tsc --noEmit`

## Build

PASS — `npm run build` on `central/ingest-umtuba-originals-on-910fb3b8` (not deployed).

## git diff --check

PASS

## git status --short

Local commit on `central/ingest-umtuba-originals-on-910fb3b8` stacked on `910fb3b8`. Live `origin/alpha-0.2` remains `fbb6b364`. `PUSHED=NO` `DEPLOYED=NO`.

## Open issues

- PC2 packet file missing; source is pre-company pilot `cd39b883`.
- Course exercises wired = 8 (authored), packet asked 6.
- Lesson exercises 24 are chrome/resource-derived practice slots, not a separate PC2 exercise packet.
- Source finals are 8 questions / 70%; sandbox scores first 5 at 4/5 and keeps the rest in `reviewBank` (no new prose). Production `/learning` does not persist this contract (`PRODUCTION_COMPLETION_GAP`).
- Browser MCP authorized walkthrough not claimed PASS (no platform_admins session fabricated).
- Live combined SHA remains `fbb6b364` until an explicit deploy GO.
