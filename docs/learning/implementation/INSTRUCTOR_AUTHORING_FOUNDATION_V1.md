# UM Learning — Instructor Authoring Foundation V1

Status: **Phase 0–3 + 4A–4E implemented**
(space + program + course + section + lesson + activity).
No migrations. No RPC redesign. Uses existing Learning RPCs (`20260828+`).

## Goal

Ship instructor-facing surface under `/learning/instructor` so staff can create
and publish Learning spaces through activities via user JWT + existing RPCs.
Content-block / question / grading / attempts UI is deferred.

## Architecture

- Server Components + user JWT Supabase client (`createClient` / `getServerUser`)
- Mutations only via existing Learning RPCs through Activity
- Activity create requires parent lesson/section/course `draft|published`,
  program `draft|published`, and space `active`
- Activity settings (`completion_mode`, `config`) via
  `update_learning_activity_settings`
- Reads via RLS (activities have no anonymous SELECT in V1)
- **No service role**
- **No TypeScript authorization substitute**
- Learner routes under `/learning` (non-instructor) are untouched

## Routes (this slice)

| Route | Role |
| --- | --- |
| `/learning/instructor` | Dashboard — spaces the member can read |
| `/learning/instructor/spaces/new` | Create space form |
| `/learning/instructor/spaces/[spaceId]` | Space detail + programs list + publish/archive |
| `/learning/instructor/spaces/[spaceId]/programs/new` | Create program (active space only) |
| `/learning/instructor/programs/[programId]` | Program detail + courses list + publish/archive |
| `/learning/instructor/programs/[programId]/courses/new` | Create course |
| `/learning/instructor/courses/[courseId]` | Course detail + sections list + publish/archive |
| `/learning/instructor/courses/[courseId]/sections/new` | Create section |
| `/learning/instructor/sections/[sectionId]` | Section detail + lessons list + publish/archive |
| `/learning/instructor/sections/[sectionId]/lessons/new` | Create lesson |
| `/learning/instructor/lessons/[lessonId]` | Lesson detail + activities list + publish/archive |
| `/learning/instructor/lessons/[lessonId]/activities/new` | Create activity |
| `/learning/instructor/activities/[activityId]` | Activity detail + settings + publish/archive |

## Out of scope (later phases)

- Content blocks / questions editors
- Grading UI / attempts UI
- Staff assign, invites, enrollments
- Moderation UI, learner nav entry in `APP_ROUTES`
- New migrations / RPC changes
- Space metadata update (no `update_learning_space` RPC exists)

## Files

- `lib/learning/instructorAuthoring.ts`
- `lib/learning/instructorAuthoring.test.ts`
- `app/learning/instructor/**`
- `app/components/learning/instructor/**`
- `docs/learning/implementation/INSTRUCTOR_AUTHORING_FOUNDATION_V1.md`
