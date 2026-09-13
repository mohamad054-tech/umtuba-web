# CURSOR_REPORT — DESKTOP_LEARNING_INTERMITTENT_BLANK_LOADING_V1

## Summary

Production Learning no longer sits on a featureless dark screen while public catalog/course RSC waterfalls finish. Root cause was **DATA_FETCH_LATENCY** (full-catalog recount on every course page, sequential Supabase reads, guest `getUser()`, async `loading.tsx`). Fix cherry-picked onto live Store tip `6d1a2b4` and deployed as `db1b6bad-20260824171946`. Live `ja-18` TTFB dropped from 1.5–2.3s to typically 0.36–0.78s. Navy Learning design preserved. `20260934` not applied. Mobile untouched. Parent dirt not committed.

```
TASK_ID = DESKTOP_LEARNING_INTERMITTENT_BLANK_LOADING_V1
STATUS = COMPLETE
ROOT_CAUSE = DATA_FETCH_LATENCY
REPRODUCED = YES
FIX = YES
SOURCE_SHA = db1b6bad924b7f654537dbdc182fce067ef8f298
TESTS = PASS
TYPECHECK = PASS
BUILD = PASS
REPEATED_NAVIGATION = PASS
LIVE_DEPLOYED = YES
LIVE_RELEASE = /opt/umtuba/production/releases/db1b6bad-20260824171946
LIVE_RETEST = PASS
FINAL_STATUS = PASS
LIVE_LEARNING_URL = https://umtuba.com/learning
WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-INTERMITTENT-BLANK-LOADING-V1
BRANCH = desktop/learning-intermittent-blank-loading-v1-live
MIGRATION_20260934_APPLIED = NO
MOBILE_NATIVE_TOUCHED = NO
```

## Exact files changed

Isolated commit `db1b6ba` (cherry-pick of `99bb02c` onto `6d1a2b4`):

- `app/learning/loading.tsx`
- `app/components/learning/visual/LearningRouteLoading.tsx`
- `app/learning/catalog/[courseSlug]/page.tsx`
- `lib/learning/productization/loadSurfaces.ts`
- `lib/learning/productization/requestCache.ts`
- `lib/learning/publicCatalog.ts`
- `lib/learning/publicCatalog.test.ts`
- `lib/learning/learningViewer.ts`
- `lib/learning/learningViewer.test.ts`
- `lib/learning/publicSupabase.ts`
- `lib/learning/productization/loadingFix.test.ts`
- `docs/ops/learning-intermittent-blank-loading-v1/` host + nav scripts

Parent working tree: docs/ai + packet copy only. Not committed.

## Migrations created

None. `20260934` not applied.

## Security review

- Guest Auth skip is cookie-absence only. Session cookies still validate with `getUser()`.
- Public catalog cache uses the publishable anon client, no service role.
- No auth/RLS weakening. No `.env` printed.
- Isolated branch push only. No force-push.

## Tests

PASS — targeted Learning vitest (productization / viewer / loading-fix / visual / teacher set). 10/10 on the live-based SHA after cherry-pick.

## TypeScript

PASS — `npx tsc --noEmit`

## Build

PASS — local `npm run build`. Host `npm ci --include=dev` + `npm run build` → `BUILD_ID=0sv3vdbmI1RYKfZ55P0Nn`.

## git diff --check

Clean on the isolated commit.

## git status --short

Isolated worktree: untracked packet/screenshots/REL/upload helper after deploy. Source commit is clean.

Parent: remains dirty with unrelated docs/ops/worktrees plus this GO's docs updates.

## Open issues

- Occasional 3s live DCL still possible on a cold/spike request; the navy shell/content now stay on screen.
- Guest lesson / teacher-write routes still require login.
- `20260934` still unapplied.
- Production had already moved from `a29a329` to `6d1a2b4` (Store). This fix is on that tip. Rollback is `6d1a2b45-20260824115820`.
