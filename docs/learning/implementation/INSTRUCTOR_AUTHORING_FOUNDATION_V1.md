# UM Learning — Instructor Authoring Foundation V1

Status: **Phase 0–3 implemented** (space shell + create/publish).  
No migrations. No RPC redesign. Uses existing Learning RPCs (`20260828+`).

## Goal

Ship the first instructor-facing surface under `/learning/instructor` so staff
can create and publish Learning spaces via user JWT + existing
`create_learning_space` / `publish_learning_space` / `archive_learning_space`
RPCs. Curriculum tree CRUD (program → activity) is deferred to later phases.

## Architecture

- Server Components + user JWT Supabase client (`createClient` / `getServerUser`)
- Mutations only via existing `LEARNING_SPACE_RPCS`
- Reads via RLS (`Members read own spaces` / admin policies)
- **No service role**
- **No TypeScript authorization substitute**
- Learner routes under `/learning` (non-instructor) are untouched

## Routes (this slice)

| Route | Role |
| --- | --- |
| `/learning/instructor` | Dashboard — spaces the member can read |
| `/learning/instructor/spaces/new` | Create space form |
| `/learning/instructor/spaces/[spaceId]` | Space detail + publish/archive |

## Out of scope (later phases)

- Program / course / section / lesson / activity UI
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
