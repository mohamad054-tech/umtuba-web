# CURSOR_REPORT — DESKTOP_UMTUBA_LEARNING_TEACHER_STUDENT_PLATFORM_V1

## Summary

Desktop implemented an uncommitted Learning teacher + student platform candidate on isolated worktree `DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1`, branch `desktop/learning-teacher-student-platform-v1`, from authoritative web base `origin/alpha-0.2` SHA `cfc57402e38423231092d9eb80244b333c4cf6a7`. Become a Teacher, Teacher Center, course studio, reviews, earnings architecture, and a non-mandatory welcome-video hook were added on top of the existing Learning OS. Payments stay disabled. Commission % is unset. Teacher approval is never client-granted. Migration `20260934` is local only and was not applied to remote Supabase. Mobile 17cbfef was not touched. Not committed. Not deployed.

```
TASK_ID = DESKTOP_UMTUBA_LEARNING_TEACHER_STUDENT_PLATFORM_V1
STATUS = COMPLETE_CANDIDATE
AUTHORITATIVE_WEB_BASE = cfc57402e38423231092d9eb80244b333c4cf6a7
BRANCH = desktop/learning-teacher-student-platform-v1
CANDIDATE_SHA = cfc57402e38423231092d9eb80244b333c4cf6a7 + UNCOMMITTED_LEARNING_DELTA
BECOME_A_TEACHER = IMPLEMENTED
TEACHER_ONBOARDING = IMPLEMENTED
TEACHER_CENTER = IMPLEMENTED
COURSE_CREATE = IMPLEMENTED
COURSE_EDIT = IMPLEMENTED
COURSE_PERSISTENCE = IMPLEMENTED_UNAPPLIED_SQL
SECTIONS_LESSONS = EXISTING_PLUS_TEACHER_CENTER
VIDEO_LESSON = EXISTING
TEXT_LESSON = EXISTING
QUIZ = EXISTING
RESOURCES = EXISTING
LEARNING_HOME = IMPLEMENTED
COURSE_CATALOG = EXISTING
SEARCH_FILTER = EXISTING
COURSE_DETAIL = IMPLEMENTED
TEACHER_PROFILE = IMPLEMENTED
FREE_ENROLLMENT = EXISTING
MY_LEARNING = EXISTING
PROGRESS_PERSISTENCE = EXISTING
CONTINUE_LEARNING = EXISTING
COURSE_COMPLETION = EXISTING
CERTIFICATES = EXISTING
REVIEWS = IMPLEMENTED_UNAPPLIED_SQL
REAL_COURSE_PAYMENT = DISABLED
REAL_TEACHER_PAYOUT = DISABLED
PAYMENT_PROVIDER_CONNECTED = NO
TEACHER_EARNINGS_ARCHITECTURE = IMPLEMENTED
RLS_TEACHER_ISOLATION = SQL_REVIEWED_UNAPPLIED
STUDENT_PRIVACY = SQL_REVIEWED_UNAPPLIED
WELCOME_VIDEO_INTEGRATION_HOOK = IMPLEMENTED
ARABIC_RTL = I18N_AND_EXISTING_SHELL
LOCALIZATION_NEW_SURFACES = EN_AR
TYPECHECK = PASS
TESTS = PASS
BUILD = PASS
RUNTIME_SMOKE = PARTIAL
MOBILE_17CBFEF_TOUCHED = NO
EAS_BUILD = NO
GOOGLE_PLAY_UPLOAD = NO
DEPLOYED = NO
NEW_DEFECTS = NONE_FROM_LOCAL_GATES
BLOCKERS = REMOTE_MIGRATION_NOT_APPLIED; LOCAL_ENV_ABSENT
READY_FOR_CENTRAL_REVIEW = YES
```

Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1`. Packet: `docs/ops/learning-teacher-student-platform-v1/DESKTOP_UMTUBA_LEARNING_TEACHER_STUDENT_PLATFORM_V1.md`.

## Exact files changed

Worktree product (uncommitted; HEAD remains `cfc5740`):

- `supabase/migrations/20260934_learning_teacher_student_platform_v1.sql`
- `lib/learning/teacherPlatform.ts` + `.test.ts`
- `lib/learning/teacherCenterAccess.ts`
- `lib/learning/teacherCourseStudio.ts` + `.test.ts`
- `lib/learning/teacherEarnings.ts` + `.test.ts`
- `lib/learning/welcomeVideoHook.ts` + `.test.ts`
- `lib/learning/courseReviews.ts` + `.test.ts`
- `lib/i18n/messages/teacherCatalogs.ts`
- `lib/i18n/teacherCatalogs.test.ts`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`, `ar.ts`, `hi.ts`, `id.ts`, `ja.ts`, `ko.ts`, `ru.ts`, `tr.ts`, `zh-CN.ts`
- `app/learning/become-a-teacher/page.tsx`
- `app/learning/teacher/**` (layout, dashboard, courses, create/edit, students, reviews, analytics, earnings, profile, settings, actions)
- `app/learning/teachers/[userId]/page.tsx`
- `app/components/learning/teacher/*`
- `app/components/learning/WelcomeVideoHook.tsx`
- `app/components/learning/CourseReviewForm.tsx`
- `app/components/learning/LearningHub.tsx`
- `app/learning/page.tsx`
- `app/learning/catalog/[courseSlug]/page.tsx`
- `package-lock.json` (npm install in worktree)
- `docs/ops/learning-teacher-student-platform-v1/`

Web parent handoff (docs only; main checkout still `office/profile-hero-completeness-v1`):

- `docs/ai/PROJECT_STATE.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ops/learning-teacher-student-platform-v1/`

## Migrations created

`20260934_learning_teacher_student_platform_v1.sql` — local worktree only. **Not applied to remote Supabase.**

Creates:

- `learning_teacher_profiles` + draft/submit/public/moderate RPCs
- `learning_teacher_course_products`
- `learning_course_reviews`
- `learning_teacher_earnings_entries` (architecture; no provider writes)
- `learning_welcome_video_hooks` (optional, `mandatory` forced false)

## Security review

- FORCE RLS on all new tables. RLS was not disabled.
- Public/anon SELECT policies do not call `is_platform_admin()`.
- Submit cannot set `approved`. Only `moderate_learning_teacher_application` (admin) can approve/reject/suspend.
- Public teacher profile returns approved rows only and strips review internals.
- Unpublished course products are not on the public policy.
- Public reviews null `user_id`.
- Teachers cannot review their own courses.
- Earnings rows are owner/admin SELECT only; no authenticated INSERT.
- No secrets printed. No `.env` read into this report.
- Course ownership still goes through existing `can_manage_learning_course` RPCs.

## Tests

Focused vitest PASS (89): teacher platform/SQL contracts, earnings, welcome hook, course studio, reviews, teacher catalogs, learner delivery, premium surfaces, professional 13-locale catalog.

## TypeScript

`npx tsc --noEmit` PASS in the Learning worktree.

## Build

`npm run build` PASS (Next.js 16.2.11). New routes present: `/learning/become-a-teacher`, `/learning/teacher/*`, `/learning/teachers/[userId]`.

## git diff --check

PASS (no whitespace errors).

## git status --short

Worktree `desktop/learning-teacher-student-platform-v1` @ `cfc57402e38423231092d9eb80244b333c4cf6a7`, dirty with the Learning delta listed above. Not committed.

Parent `office/profile-hero-completeness-v1` remains dirty with historical Android/docs artifacts plus this GO’s handoff docs. Mobile 17cbfef artifacts preserved.

## Open issues

1. `20260934` is not on remote. Live teacher onboarding/reviews/earnings persistence cannot pass until Central applies it.
2. Worktree has no `.env`; local Next runtime of new routes was not started.
3. Interactive browser smoke of new Teacher Center was blocked (no usable Cursor browser tab). Production catalog HTTP 200 only.
4. Arabic Teacher Center UI is localized; RTL layout of new nav was not visually verified in a browser this session.
5. Paid courses are a designation + future price only. Real payment remains disabled.
6. Commission percentage remains unset by design.
7. Central must review/commit/integrate. Desktop did not commit or deploy.
