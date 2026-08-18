# CURSOR_REPORT — Learning sandbox exercise runtime fix V1

```text
TASK_ID = CENTRAL_LEARNING_SANDBOX_EXERCISE_RUNTIME_FIX_V1
STATUS = IMPLEMENTED
DEFECT_REPRODUCED = YES
ROOT_CAUSE = useSyncExternalStore getSnapshot returned a new object on every localStorage read, so the first hydrated Learning action (pe-m1-l1-ex) infinite-looped into the generic page-load error. The exercise ID is valid.
FAILED_EXERCISE_ID = pe-m1-l1-ex
TOTAL_LESSON_EXERCISES = 24
TOTAL_COURSE_EXERCISES = 8
ALL_EXERCISE_IDS_VALID = YES
ALL_EXERCISE_ROUTES_VALID = YES
CONTENT_REWRITTEN = NO
EXERCISE_RUNTIME = FIXED
EXERCISE_COMPLETION = FIXED
PROGRESS_UPDATE = YES
PLATFORM_ESSENTIALS = PASS
DIGITAL_SAFETY = PASS
AI_FUNDAMENTALS = PASS
TESTS = PASS
TYPECHECK = PASS
LINT = PASS
BUILD = PASS
SOURCE_SHA = (commit pending)
DEPLOY_PERFORMED = NO
SANDBOX_SHA_AFTER = (pending)
PRODUCTION_LEARNING_DISTURBED = NO
STORE_SANDBOX_DISTURBED = NO
MOBILE_DISTURBED = NO
ANONYMOUS_DENIED = YES
```

## Summary

Fixed the private Learning sandbox exercise crash. `pe-m1-l1-ex` is a real lesson exercise. The generic “This page couldn’t load” came from an unstable `useSyncExternalStore` snapshot, not a missing fixture. Cached the client store, completed lesson→exercise→save→progress→return, audited all 24+8 Originals exercise IDs/routes, and added Learning-specific unavailable UX for missing/invalid IDs without masking real exceptions.

## Exact files changed

- `app/components/sandbox/learning/LearningActions.tsx`
- `app/components/sandbox/learning/LearningSandbox.tsx`
- `app/sandbox/business-preview/error.tsx`
- `lib/sandbox/i18n.ts`
- `lib/sandbox/learning/clickPath.ts`
- `lib/sandbox/learning/clientStore.ts`
- `lib/sandbox/learning/clientStore.test.ts`
- `lib/sandbox/learning/exerciseRuntime.ts`
- `lib/sandbox/learning/exercise.runtime.test.ts`
- `lib/sandbox/learning/exercise.render.test.ts`
- `lib/sandbox/learning/i18n.learning.test.ts`
- `lib/sandbox/learning/index.ts`
- `lib/sandbox/learning/routes.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Sandbox remains AUTH_REQUIRED / private
- Guest deny unchanged
- No production `/learning` persistence
- No secrets printed
- Store 26-SKU and mobile untouched
- Rewards / locale branches not mixed

## Tests

`npx vitest run lib/sandbox` PASS (86). Exercise render tests PASS (`pe-m1-l1-ex` + unavailable).

## TypeScript

`npx tsc --noEmit` PASS.

## Build

`npm run build` PASS in a clean dependency tree (Next 16.2.10). Sandbox routes `/sandbox/business-preview`, `[...section]`, and `/enter` are in the route table.

## git diff --check

PASS.

## git status --short

See live `git status` at commit time.

## Open issues

- Authorized live browser walkthrough still needs the PO signed-in `platform_admins` session
- Locale auto-detection waits for `EXERCISE_FINAL_BASE_SHA` after this cutover
