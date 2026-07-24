# UM Learning — Question & Assessment Authoring Minimal V1

Status: **implemented** (no migration)

Branch: `office/learning-assessment-authoring-minimal-v1`  
Parent: `office/learning-instructor-authoring-minimal-v1` @ `73e9eda`

Constants / wrappers: `lib/learning/assessmentAuthoring.ts`  
Server actions: `app/learning/instructor/assessmentActions.ts`  
Route: `app/learning/instructor/courses/[courseId]/activities/[activityId]/questions`

---

## Scope

| In | Out |
| --- | --- |
| Questions create/update/publish/unpublish/archive/reorder | Moderate / unsuspend |
| Answer key set via trusted RPC only | Question banks / reuse / pools |
| Options & blanks as content JSON | Randomization engine |
| Per-question `points` (minimal scoring config) | Activity settings / result-policy edits |
| Instructor UI linked from course activity list | Visual assessment builder |
| Staff RLS reads for question list | Learner question authoring |

## Architecture

```
Instructor UI forms
  → assessmentActions (auth + FormData parse)
  → assessmentAuthoring.build/run
  → supabase.rpc(existing question RPCs)

Reads (staff only):
  JWT SELECT on learning_activities / learning_questions
  SELECT question_id ONLY from learning_question_answer_keys (presence flag)
```

- No authenticated INSERT/UPDATE/DELETE on Learning tables
- Allowlisted operations only
- Unknown / authoritative fields rejected in TypeScript
- DB RPC authorization remains final authority

## Routes

| Path | Role |
| --- | --- |
| `/learning/instructor/courses/[courseId]` | Course hierarchy + **Questions** link per activity |
| `/learning/instructor/courses/[courseId]/activities/[activityId]/questions` | Question list, create/edit, answer key, lifecycle, reorder |

## Supported question types

Creatable (immutable after create):

- `multiple_choice_single`
- `multiple_choice_multiple`
- `true_false`
- `short_answer`
- `fill_blank`
- `numeric`

Reserved / deferred types are rejected in the TypeScript layer and by SQL.

Options live in `content.options` (`{ key, text }[]`) — there is **no** separate options table or RPC.

## Authorization

| Action | Existing helper / RPC gate |
| --- | --- |
| Create | `can_create_learning_question` inside `create_learning_question` |
| Update / set answer key | `can_manage_learning_question` **or** course staff ≥ instructor |
| Publish / unpublish / archive | `can_manage_learning_question` |
| Reorder | `can_manage_learning_activity` or space manage |
| Reads | Staff/manager RLS on questions; learners get no SELECT |

UX pre-checks call `can_create_learning_question` / `can_manage_learning_activity`. Cross-space and cross-course access fail closed (RPC + course membership check on load).

Unauthenticated users are denied in server actions (`Sign in required`) and redirected to login on the page.

## Answer-key security

- Written **only** via `set_learning_question_answer_key`
- RPC return is `{ question_id, answer_key_set }` — never the key payload
- Instructor list loads **`question_id` only** from `learning_question_answer_keys` for a presence flag
- Staff UI never prefills key values into client forms
- Learner delivery / attempt / result modules unchanged and still forbid key tables
- Correctness fields rejected if embedded in `content` updates

## Lifecycle

| Transition | RPC | Notes |
| --- | --- | --- |
| create → draft | `create_learning_question` | Position assigned server-side |
| draft ↔ published | `publish` / `unpublish` | Publish/unpublish are idempotent for already-published / already-draft |
| → archived | `archive_learning_question` | Suspended → platform moderate only (excluded here) |
| reorder | `reorder_learning_questions` | Requires **complete** unique id list for the activity |

Invalid transitions surface sanitized errors (no SQL/policy leakage).

## RPC-only write rule

All trusted writes use:

- `create_learning_question`
- `update_learning_question`
- `publish_learning_question`
- `unpublish_learning_question`
- `archive_learning_question`
- `reorder_learning_questions`
- `set_learning_question_answer_key`

Helpers (UX only): `can_create_learning_question`, `can_manage_learning_activity`.

## Limitations

- No DnD reorder (id-list textarea)
- Answer-key forms overwrite without prefill
- Create form shares option/blank fields; wrong type fields are ignored by content builders / rejected by SQL
- No activity settings (passing_score / show_result_policy) edits in this slice
- No moderate UI
- No media / AI / certificates / enrollment / progress / result-policy changes

## No migration

**No new migration.** Reuses `20260837` question foundation RPCs/tables/RLS. No schema gap required for Minimal V1.

## Validation

- `npx vitest run lib/learning` — **627/627** (18 assessment authoring tests)
- `npx tsc --noEmit` — pass
- Scoped eslint on assessment authoring paths — pass
- `npm run build` — pass (questions route present)
- `git diff --check` — pass
- No migration created or modified; Games/Ads/Store/World untouched
- Progress / Result Policy modules untouched
