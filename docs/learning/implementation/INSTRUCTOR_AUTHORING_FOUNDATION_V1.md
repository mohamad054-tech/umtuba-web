# UM Learning — Instructor Authoring Foundation V1

Status: **Phase 0–3 + 4A + 4B + 4C + 4D implemented**
(space + program + course + section + lesson).
No migrations. No RPC redesign. Uses existing Learning RPCs (`20260828+`).

## Goal

Ship instructor-facing surface under `/learning/instructor` so staff can create
and publish Learning spaces, programs, courses, sections, and lessons via user
JWT + existing RPCs. Activity UI is deferred.

## Architecture

- Server Components + user JWT Supabase client (`createClient` / `getServerUser`)
- Mutations only via existing `LEARNING_SPACE_RPCS` / `LEARNING_PROGRAM_RPCS` /
  `LEARNING_COURSE_RPCS` / `LEARNING_SECTION_RPCS` / `LEARNING_LESSON_RPCS`
- Program create requires parent space `status = active`
- Course create requires parent program `draft|published` and space `active`
- Section create requires parent course `draft|published`, program
  `draft|published`, and space `active`
- Lesson create requires parent section `draft|published`, course
  `draft|published`, program `draft|published`, and space `active`
- Reads via RLS (`Members read own spaces` / admin policies)
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
| `/learning/instructor/lessons/[lessonId]` | Lesson detail + publish/archive |

## Out of scope (later phases)

- Activity UI
- Content blocks / questions editors
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
