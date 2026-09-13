# DESKTOP_UMTUBA_LEARNING_TEACHER_STUDENT_PLATFORM_V1

Date: 2026-08-23  
Machine: DESKTOP  
Operator: DESKTOP  
Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1`  
Branch: `desktop/learning-teacher-student-platform-v1`  
Authoritative web base: `cfc57402e38423231092d9eb80244b333c4cf6a7` (`origin/alpha-0.2` = `origin/central/web-nextjs-cve-2026-64643-p1-v2`)  
Candidate: `cfc57402e38423231092d9eb80244b333c4cf6a7` + **UNCOMMITTED_LEARNING_DELTA**  
Commit: NO  
Push: NO  
Deploy: NO  
Remote Supabase apply: NO

## Objective

Develop UMTUBA Learning into a complete teacher + student platform while payment infrastructure is prepared. Extend existing Learning OS (catalog, instructor authoring, enrollments, progress, quizzes, certificates). Do not fake teacher approval. Do not invent commission %.

## What was built

### A — Become a Teacher
- Route `/learning/become-a-teacher`
- Fields: professional name, biography, subjects, teaching languages, experience, qualifications, profile image URL, teaching description
- Lifecycle: `draft` → `pending_review` → (`approved` | `rejected` | `suspended`)
- Submit sets `pending_review` only. `moderate_learning_teacher_application` requires `is_platform_admin()`. Clients cannot self-approve.

### B — Teacher Center
- First-class `/learning/teacher` shell (UMTUBA dark brand, RTL-safe nav)
- Dashboard, My Courses, Create Course, Edit Course, Students, Reviews, Analytics, Earnings, Teacher Profile, Settings
- Gated until approved; existing instructor courses remain visible as legacy

### C/D — Course + lessons
- Create Course auto-builds Space (`creator_academy`) → Program (`self_paced`) → Course via existing staff RPCs
- Product overlay: subtitle, objectives, prerequisites, free/paid, future price
- Sections/lessons/video/text/quiz/resources reuse existing instructor authoring + content blocks + assessment RPCs

### E/F/G/H/I — Student
- Existing Learning home, catalog, search/filters, course detail, enroll, player, prev/next, progress, continue, My Learning, completion, certificates
- Free self-enroll remains `published + public + not marketplace_ready`
- Certificates still require completion foundation (not “last lesson opened”)
- Course reviews added for enrolled learners

### J — Teacher economics
- Ledger kinds persisted in SQL check: COURSE_PRICE, GROSS_REVENUE, PLATFORM_COMMISSION, TEACHER_NET, REFUNDS, PAYOUT_PENDING, PAYOUT_AVAILABLE, PAYOUT_PAID
- UI placeholders. Commission percent = unset. Payments/payouts disabled. No provider connected.

### K — Security
- FORCE RLS on new tables. Public/anon policies never call `is_platform_admin()`
- Unpublished teacher applications and unpublished course products do not use public read
- Public reviews strip learner `user_id`
- Teachers cannot review their own courses
- Course writes remain existing `can_manage_learning_course` RPCs
- Migration **not** applied to remote

### L/M/N
- New strings via `teacherCatalogs` (EN + AR). Other locales inherit EN fallback — 13-locale worktrees not reopened
- Welcome video hook: optional, never mandatory, no video created. Env `UMTUBA_LEARNING_WELCOME_VIDEO_URL`

## Quality

| Gate | Result |
| --- | --- |
| Focused vitest | PASS (89) |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (Next.js 16.2.11; new Teacher Center routes in app table) |
| `git diff --check` | PASS |
| Live teacher RPC persistence | NOT_VERIFIED — `20260934` not on remote; worktree has no `.env` |
| Production catalog HTTP | 200 (`https://umtuba.com/learning/catalog`) |
| Browser interactive smoke | BLOCKED — no usable browser tab; no local env |

## Required return

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

## Central next

1. Review uncommitted delta on `desktop/learning-teacher-student-platform-v1`
2. Security-review `20260934_learning_teacher_student_platform_v1.sql`
3. Apply remotely only after Central approval (Desktop must not apply)
4. Do not invent commission %. Do not connect payment providers from this packet.
