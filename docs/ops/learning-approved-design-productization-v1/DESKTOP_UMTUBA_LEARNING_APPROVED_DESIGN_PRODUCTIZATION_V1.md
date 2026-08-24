# DESKTOP_UMTUBA_LEARNING_APPROVED_DESIGN_PRODUCTIZATION_V1

Date: 2026-08-24
Machine: DESKTOP
Operator: DESKTOP / WEB LEARNING
Mode: IMPLEMENT_APPROVED_DESIGN + PRESERVE_FUNCTIONAL_SOURCE + REAL_PRODUCT_INTEGRATION

This packet productizes the owner-approved Learning visual language on top of the accepted functional Learning source. It is not a redesign. It is not a production deploy.

```
TASK_ID = DESKTOP_UMTUBA_LEARNING_APPROVED_DESIGN_PRODUCTIZATION_V1
STATUS = COMPLETE_CANDIDATE
OWNER_APPROVED_DESIGN_PRESERVED = YES
FUNCTIONAL_BASE_PRESERVED = YES
PRODUCTIZATION_COMPLETE = YES
REAL_ROUTES_CONNECTED = YES
REAL_DATA_CONNECTED = PARTIAL
DEMO_ONLY_REMAINDERS = YES_LABELED
BACKEND_BLOCKERS = MIGRATION_20260934_NOT_APPLIED; LOCAL_SUPABASE_ENV_ABSENT; SHA_OBJECT_STILL_NOT_FETCHABLE
FILES_CHANGED = SEE_BELOW
TESTS = PASS (23 targeted)
TYPECHECK = PASS
BUILD = FAIL_WORKTREE_NODE_MODULES_JUNCTION
ARABIC_RTL = PASS
DESKTOP_RESPONSIVE = PASS
MOBILE_WEB_RESPONSIVE = PASS
LOCAL_PREVIEW_URL = http://localhost:3018/learning
SCREENSHOT_PATH = docs/ops/learning-approved-design-productization-v1/screenshots/
SOURCE_SHA = cfc57402e38423231092d9eb80244b333c4cf6a7 + UNCOMMITTED_LEARNING_DELTA + APPROVED_VISUAL_LAYER + PRODUCTIZATION
BRANCH = desktop/learning-approved-design-productization-v1
WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-APPROVED-DESIGN-PRODUCTIZATION-V1
DEPLOYED = NO
NEW_MIGRATION = NO
MIGRATION_20260934_APPLIED = NO
MOBILE_NATIVE_TOUCHED = NO
COMMIT = NO
PUSH = NO
```

## Reconcile

| Source | Result |
| --- | --- |
| A — Approved visual worktree `DESKTOP-LEARNING-WORLD-CLASS-VISUAL-DESIGN-V1-E7` | Preserved dirty. Visual layer copied, not destroyed. |
| B — Functional worktree `DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1` | Preserved dirty. Functional files copied. |
| C — Parent `office/profile-hero-completeness-v1` @ `380a366` | Not merged, not reset, not stashed. |
| `e7c84c668c251ca6b386a60b2b3c01a89eeb7e1b` | `SHA_OBJECT_STILL_NOT_FETCHABLE` after `git fetch --prune`. Practical base remains `cfc5740` + uncommitted Learning delta. Not a stop. |

New isolated tree: `worktrees/DESKTOP-LEARNING-APPROVED-DESIGN-PRODUCTIZATION-V1` on `desktop/learning-approved-design-productization-v1`.

## What productization changed

Approved visual views remain the Learning chrome (IA, cards, navy/purple identity, RTL, responsive).

Pages no longer short-circuit the whole product to demo merely because Supabase URL is absent.

Live-first loaders in `lib/learning/productization/`:

1. Prefer public catalog / hub / teacher / lesson data when `isSupabasePublicConfigured()`.
2. Map live rows into the approved visual models.
3. Fall back to labeled demo fixtures when env is missing or a live load fails.
4. Wire Start / Continue / Resume / enroll / mark-complete / Become a Teacher / Teacher Center / Course Builder to existing routes and server actions.

Guest `/learning` is the approved discovery home (not a redirect to an empty admin catalog). Become a Teacher and Teacher Center still require login when a real backend env is present.

## Real routes connected

| Flow | Routes |
| --- | --- |
| Discovery → course → lesson → My Learning | `/learning`, `/learning/catalog`, `/learning/catalog/[slug]`, `/learning/lessons/[id]`, `/learning?surface=library` |
| Teacher profile → Become a Teacher → Teacher Center → Course Builder | `/learning/teachers/[id]`, `/learning/become-a-teacher`, `/learning/teacher`, `/learning/teacher/courses/new` |

Live actions used when backend env exists:

- `enrollInPublicCourseAction`
- `completeLearningLessonAction`
- `TeacherApplicationForm` → draft/submit RPCs
- `TeacherCourseForm` → `createTeacherCourseAction` / `updateTeacherCourseAction`

## Demo-only remainders (labeled)

Shown with `learning.visual.demoFallbackBanner` when live data cannot load:

- Fixture catalog (6 teachers / 4 students / 9 courses) under `lib/learning/visualDemo` + `public/demo/learning`
- Local save/wishlist toast (no saved-courses backend)
- Local lesson notes textarea
- Visual chapter add/reorder in Course Builder (create/edit course form is the real action when live)
- Earnings CTA remains disabled. Payments not connected. Teacher approval not faked.

This machine has no worktree Supabase env. Preview therefore uses the labeled fallback. `REAL_DATA_CONNECTED = PARTIAL`.

## Backend blockers

```
SHA_OBJECT_STILL_NOT_FETCHABLE = e7c84c668c251ca6b386a60b2b3c01a89eeb7e1b
MIGRATION_20260934_NOT_APPLIED
LOCAL_SUPABASE_ENV_ABSENT
RLS_RUNTIME_NOT_RUN
PERSISTENCE_NOT_RUN
13_LOCALE_NATIVE_CATALOGS_INCOMPLETE
```

No new migration was created. `20260934` is present in the tree and was not applied.

## Quality

| Gate | Result |
| --- | --- |
| Targeted vitest | PASS 23 (`productization`, `visualDemo`, teacher catalogs/platform/studio/reviews/welcome) |
| `npx tsc --noEmit` | PASS |
| `npm run build` (Turbopack) | FAIL — `node_modules` junction points out of the filesystem root |
| `npx next build --webpack` | FAIL — pre-existing `livekit-server-sdk` `node:crypto` UnhandledSchemeError |
| Local preview webpack | PASS `http://localhost:3018/learning` — all 9 product routes HTTP 200 |
| `git diff --check` | PASS |
| Arabic `lang=ar dir=rtl` | PASS |
| Desktop 1440 + mobile 390 | PASS (fresh screenshots) |

Yesterday’s prototype PNGs were not reused.

## Screenshots (fresh productization evidence)

`docs/ops/learning-approved-design-productization-v1/screenshots/`

- `01-learning-home-desktop.png`
- `02-learning-home-mobile.png`
- `03-course-page.png`
- `04-lesson-page.png`
- `05-my-learning.png`
- `06-teacher-profile.png`
- `06b-become-a-teacher.png`
- `07-teacher-center.png`
- `08-course-builder.png`
- `09-arabic-rtl.png`
- `10-arabic-rtl-mobile.png`

## Exact files changed (productization worktree)

Ported functional + visual sources, then productized:

- `lib/learning/productization/**`
- `lib/learning/visualDemo/mode.ts` (forced-demo only; missing env is fallback, not prototype mode)
- `app/components/learning/visual/*` (approved chrome + live model props)
- `app/learning/page.tsx`, `catalog/page.tsx`, `catalog/[courseSlug]/page.tsx`, `lessons/[lessonId]/page.tsx`
- `app/learning/teachers/[userId]/page.tsx`, `become-a-teacher/page.tsx`
- `app/learning/teacher/layout.tsx`, `teacher/page.tsx`, `teacher/courses/new/page.tsx`, `teacher/courses/[courseId]/edit/page.tsx`
- `app/components/learning/teacher/TeacherCenterShell.tsx` (approved visual chrome, real teacher nav)
- `lib/i18n/messages/types.ts`, `teacherCatalogs.ts`
- Inherited functional/visual files listed in `git status --short`

## Security review

- No secrets or parent `.env` copied. Worktree `.env.local` has demo flags only (`UMTUBA_LEARNING_VISUAL_DEMO=0`).
- Teacher approval not faked. Payments remain disabled.
- Public catalog mapping uses existing public RPCs/tables only.
- `_port_extract` not touched. Windows Desktop not used as an artifact destination.
- `umtuba-mobile` not touched.

## Open issues

1. Connect a local public Supabase env to flip `REAL_DATA_CONNECTED` from PARTIAL to YES without changing UI.
2. Apply `20260934` only after Central authorizes (Desktop must not apply).
3. Worktree production `next build` needs a non-junction `node_modules` or a Turbopack-safe install.
4. `e7c84c66` remains missing from remotes.

## Next

Central reviews this isolated candidate. Do not commit. Do not push. Do not deploy. Do not apply `20260934`.
