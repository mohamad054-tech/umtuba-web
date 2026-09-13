# DESKTOP_UMTUBA_LEARNING_WORLD_CLASS_VISUAL_DESIGN_V1

Date: 2026-08-23  
Machine: DESKTOP  
Operator: DESKTOP / WEB LEARNING DESIGN  
Mode: DESIGN_FIRST + DEMO_CONTENT + INTERACTIVE_PROTOTYPE  

This is a visual/product experience pass over the accepted Learning functional candidate. DESIGN PASS is **not** claimed. Final visual approval belongs to the owner / Central.

```
TASK_ID = DESKTOP_UMTUBA_LEARNING_WORLD_CLASS_VISUAL_DESIGN_V1
STATUS = COMPLETE_CANDIDATE_FOR_OWNER_VISUAL_REVIEW
BASE = e7c84c668c251ca6b386a60b2b3c01a89eeb7e1b
SHA_OBJECT_AVAILABLE = NO
LOCAL_CHECKOUT = cfc57402e38423231092d9eb80244b333c4cf6a7 + ACCEPTED_FUNCTIONAL_DELTA + VISUAL_LAYER
DESIGN_BRANCH = desktop/learning-world-class-visual-design-v1-e7
DESIGN_WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-WORLD-CLASS-VISUAL-DESIGN-V1-E7
PRIOR_DESIGN_WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-WORLD-CLASS-VISUAL-DESIGN-V1
FUNCTIONAL_WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1
FUNCTIONAL_CANDIDATE_PRESERVED = YES
```

## Authorized base

Central authorized `LEARNING_CANDIDATE_SHA = e7c84c668c251ca6b386a60b2b3c01a89eeb7e1b` (`SOURCE_CANDIDATE_ACCEPTED_NOT_PRODUCTION`). After `git fetch --prune` / `git fetch --all` / direct `git fetch origin <sha>` / GitHub API / local clone scan, **the object is not present**. Origin still tips `cfc5740` on `alpha-0.2`. No commit was invented.

The new isolated design worktree starts at `cfc5740` and overlays:

1. The accepted uncommitted Learning functional delta (same files as `DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1`, left historical and untouched).
2. Visual/demo/fixture layers only.

## Runnable prototype

```
LOCAL_PREVIEW_URL = http://localhost:3017/learning
START = npx next dev -p 3017 --webpack
ENV = worktree .env.local with UMTUBA_LEARNING_VISUAL_DEMO=1 only (no secrets)
```

Webpack is required because Turbopack rejects the `node_modules` junction (`points out of the filesystem root`). `next.config.ts` pins `turbopack.root` to `process.cwd()` for future Turbopack use.

### Paths

| Screen | URL |
| --- | --- |
| Learning Home | http://localhost:3017/learning |
| My Learning | http://localhost:3017/learning?surface=library |
| Course | http://localhost:3017/learning/catalog/signals-of-thought-ai-studio |
| Lesson | http://localhost:3017/learning/lessons/a2222222-2222-4222-8222-222222222222 |
| Teacher profile | http://localhost:3017/learning/teachers/demo-teacher-nour-qamar |
| Become a Teacher | http://localhost:3017/learning/become-a-teacher |
| Teacher Center | http://localhost:3017/learning/teacher |
| Course Builder | http://localhost:3017/learning/teacher/courses/new |
| Arabic RTL | http://localhost:3017/learning?hl=ar |

## Demo world

Fictional, local, fixture-only. Identities contain `Demo` / `ديمو`. No production writes. No real people.

- **Teachers (6):** Nour Qamar-Demo, Kareem Pixel-Demo, Layla Horizon-Demo, Sami Atlas-Demo, Mira North-Demo, Yusuf Vector-Demo
- **Students (4):** Lina Grove-Demo (viewer), Amina Cedar-Demo, Rami Orchid-Demo, Hana Harbor-Demo
- **Courses (9):** AI, Mobile, UI/UX, Photography, Languages, Business, Mathematics, Digital Marketing, Programming
- **Assets:** 19 generated SVG covers/portraits under `public/demo/learning/` plus optional `covers/ai.png`

## Screens (visual layer)

1. Learning Home — greeting, Continue Learning hero, Recommended / Trending / Free / New, categories, featured teachers, achievements / UM Points, search + filters
2. Course Detail — cinematic hero, teacher, rating, students, duration, level, language, objectives, prerequisites, curriculum, reviews, related, Start/Continue
3. Lesson — video-first player surface, curriculum panel, progress, notes, resources, questions, prev/next, completion toast
4. My Learning — active / completed / saved / certificates copy / streak / recommendations
5. Teacher Profile — portrait, bio, specialties, rating, students, courses, reviews, achievements
6. Become a Teacher — benefits, step progress, profile / subjects / experience / review. Status stays **draft**. Approval is not faked
7. Teacher Center — students, courses, completion, ratings, reviews, **earnings placeholder disabled**, activity, Create Course
8. Course Builder — visual Course → Chapters → Lessons, Video/Text/Quiz/Resource, add/reorder. No new backend

## Before / after

**Before:** Learning hub redirected guests to an empty catalog; Teacher Center / Become a Teacher required auth + Supabase; pages looked like a narrow admin shell (`max-w-2xl`, dark cards, no imagery, no populated discovery).

**After (demo mode):** Existing routes render a populated UMTUBA navy/purple/blue Learning world from local fixtures when `UMTUBA_LEARNING_VISUAL_DEMO=1` or when Supabase public URL is absent. Functional RPC/SQL/RLS files are unchanged in behavior; pages short-circuit **before** `createClient()` / `getServerUser()`.

## Functional candidate reused unchanged

- `lib/learning/teacherPlatform.ts` and Teacher Center access / course studio / earnings / reviews
- `lib/learning/learnerDelivery.ts`, `publicCatalog.ts`, lesson engine
- `supabase/migrations/20260934_learning_teacher_student_platform_v1.sql` (present, **not applied**)
- Existing teacher forms, instructor routes, completion / enrollment RPCs
- AppTopNav / i18n runtime / Learning DS tokens (not rewritten)

## Visual additions not functionally wired

- Demo enroll / save / lesson-complete toasts (client-only)
- Course builder add/reorder (local React state only)
- Become a Teacher draft/submit buttons (toast only; no RPC)
- Earnings CTA disabled placeholder
- Discovery rails (Recommended / Trending / New) are fixture slices, not personalization RPCs
- Notes textarea is local state

## Review package

HTML snapshots (all 9 routes HTTP 200 with demo markers), Arabic `lang=ar dir=rtl`:

`docs/ops/learning-world-class-visual-design-v1/html-snapshots/`

PNG screenshots (Playwright + installed Chrome; English forced via `hl=en` + `en-US` locale; Arabic via `hl=ar`):

`docs/ops/learning-world-class-visual-design-v1/screenshots/`

| File | Surface |
| --- | --- |
| `01-learning-home-desktop.png` | Learning Home desktop EN |
| `02-learning-home-mobile.png` | Learning Home mobile EN |
| `03-course-page.png` | Course detail EN |
| `04-lesson-page.png` | Lesson EN |
| `05-my-learning.png` | My Learning EN |
| `06-teacher-profile.png` | Teacher profile EN |
| `06b-become-a-teacher.png` | Become a Teacher EN |
| `07-teacher-center.png` | Teacher Center EN |
| `08-course-builder.png` | Course Builder EN |
| `09-arabic-rtl.png` | Learning Home Arabic RTL desktop |
| `10-arabic-rtl-mobile.png` | Learning Home Arabic RTL mobile |

## Quality

- Visual demo tests: PASS (2)
- Teacher catalog tests: PASS (1)
- `npx tsc --noEmit`: FAIL on corrupted `.next/dev/types` generated by webpack mid-run (not source)
- `git diff --check`: clean (LF warning only on `docs/ai/CURRENT_TASK.md`)
- Build: not required (preview running)
- `20260934` applied: NO
- Mobile touched: NO
- Deployed: NO
- Real payment: NO

## Out of scope (not closed)

```
MIGRATION_20260934_NOT_APPLIED
RLS_RUNTIME_NOT_RUN
PERSISTENCE_NOT_RUN
RUNTIME_SMOKE_NOT_RUN
13_LOCALE_NATIVE_CATALOGS_INCOMPLETE
AUTHENTICATED_APPROVED_TEACHER_ROW_LEAKS_REVIEW_FIELDS
```

## Next

STOP_AND_WAIT_FOR_OWNER/CENTRAL. Do not claim DESIGN PASS.
