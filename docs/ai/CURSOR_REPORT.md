# CURSOR_REPORT — DESKTOP_UMTUBA_LEARNING_STAGED_PRODUCTION_DEPLOYMENT_V1

## Summary

Productized Learning is live on production. The accepted SHA `a29a329` is a clean fast-forward of current production/`origin/alpha-0.2` `cfc57402`. Isolated branch pushed. Host release `a29a329d-20260824111302` is current. Owner-approved Discover design is on `https://umtuba.com/learning`. Guest lesson/teacher-write routes require login (not faked). `20260934` not applied. Mobile untouched. Parent dirt not committed or pushed.

```
TASK_ID = DESKTOP_UMTUBA_LEARNING_STAGED_PRODUCTION_DEPLOYMENT_V1
STATUS = COMPLETE
RECONCILIATION = FAST_FORWARD_IDENTICAL
ACCEPTED_LEARNING_SHA = a29a329ddf21c4aa2b7d55887b2b276a12447892
DEPLOYMENT_SOURCE_SHA = a29a329ddf21c4aa2b7d55887b2b276a12447892
DEPLOYMENT_RESULT = PASS
LIVE_RELEASE = /opt/umtuba/production/releases/a29a329d-20260824111302
LIVE_LEARNING_URL = https://umtuba.com/learning
OWNER_APPROVED_DESIGN_PRESERVED = YES
FUNCTIONAL_BASE_PRESERVED = YES
REAL_ROUTES_CONNECTED = YES
REAL_DATA_CONNECTED = YES_PUBLIC_READ
TYPECHECK = PASS
TARGETED_TESTS = PASS_25
PRODUCTION_BUILD = PASS
PRODUCTION_SMOKE = PASS
COURSE_DISCOVERY = PASS
LESSON_PAGE = AUTH_REQUIRED
MY_LEARNING = PASS_GUEST_SURFACE
TEACHER_PROFILE = ROUTE_CONNECTED_NO_PUBLIC_SAMPLE
BECOME_A_TEACHER = NOT_AUTHORIZED
TEACHER_CENTER = NOT_AUTHORIZED
COURSE_BUILDER = NOT_AUTHORIZED
ARABIC_RTL = PASS
LTR = PASS
DESKTOP_RESPONSIVE = PASS
MOBILE_WEB_RESPONSIVE = PASS
AUTH_SESSION_PRESERVED = YES
UNRELATED_PRODUCTION_REGRESSION = NONE_OBSERVED
MIGRATION = NO
MIGRATION_20260934_APPLIED = NO
FAKE_COURSE_CREATED = NO
FAKE_ENROLLMENT_CREATED = NO
MOBILE_NATIVE_TOUCHED = NO
FINAL_LEARNING_PRODUCTION_STATUS = PASS
PUSHED = YES
WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-STAGED-PRODUCTION-DEPLOY-V1
BRANCH = desktop/learning-staged-production-deploy-v1
```

## Exact files changed

Deploy source is the already-committed accepted candidate (no new product commit).

Worktree uncommitted handoff only:

- `docs/ops/learning-staged-production-deploy-v1/` (packet, smoke log, host scripts, production screenshots, capture script)
- `docs/ai/CURSOR_REPORT.md`

Parent working tree (docs only; not part of the deploy):

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ops/learning-staged-production-deploy-v1/`

Accepted productization worktree preserved. Parent `office/profile-hero-completeness-v1` dirt not committed.

## Migrations created

None. Inherited `20260934_learning_teacher_student_platform_v1.sql` is in the deployed tree and was **not** applied.

## Security review

- Production env sourced on host; values never printed.
- No `.env.local` in the release archive.
- Auth/RLS not weakened. Guest lesson and teacher-write routes redirect to login.
- No fake Learning records. No payments.
- Isolated branch only was pushed. No force-push. Parent not pushed.
- `umtuba-mobile` not touched.

## Tests

PASS — 25 targeted vitest on the isolated deploy worktree.

## TypeScript

PASS — `npx tsc --noEmit`

## Build

PASS — local `npm run build` and host `npm run build` (`BUILD_ID=seZg_Z9XGfu6Eu3Vd8g7B`).

## git diff --check

Clean on isolated worktree (no committed diff after deploy; handoff files untracked).

## git status --short

Isolated worktree: `?? docs/ops/learning-staged-production-deploy-v1/`  
Parent: remains dirty with unrelated docs/ops/worktrees plus this GO's docs updates.

## Open issues

- Guest lesson / Become a Teacher / Teacher Center / Course Builder require a real signed-in session. Not exercised.
- `20260934` still unapplied — teacher persistence remains backend-gated.
- Newer Central store commit `1f79dcb` was not live and was not included.
- Rollback target `cfc57402-20260822184650` remains on the host.
