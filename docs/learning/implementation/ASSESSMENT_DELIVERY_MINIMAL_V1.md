# UM Learning — Assessment Delivery Minimal V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-assessment-delivery-minimal-v1`
Parent blocker: `6563fe4`

Migration: `supabase/migrations/20260848_learning_assessment_delivery_minimal_v1.sql`
Adapter: `lib/learning/assessmentDelivery.ts`
Route: `/learning/activities/[activityId]/assessment`

---

## Scope

| In | Out |
| --- | --- |
| Read-only published assessment delivery | Attempts / submissions / answer save |
| Ordered published questions + learner content | Scoring / grading / results |
| Entitlement + published-chain gates | Progress mutation |
| Activity gate link to preview | Answer keys / correctness |
| JWT `rpc` only | Direct question-table SELECT from UI |

## Architecture

```
Learner UI (RSC)
  → getServerUser + createClient (JWT)
  → loadAssessmentDelivery
  → supabase.rpc('get_my_learning_activity_assessment')
  → SECURITY DEFINER SQL
       → has_learning_course_access
       → published/active chain checks
       → learning_attempt_build_questions_snapshot (internal)
```

No service role. Snapshot builder remains revoked from clients.

## Routes

| Path | Role |
| --- | --- |
| `/learning/activities/[activityId]` | Gate + link to preview + start attempt |
| `/learning/activities/[activityId]/assessment` | Read-only published questions |

## RPC

`get_my_learning_activity_assessment(p_activity_id uuid) → jsonb`

Returned learner-safe fields:

- `activity_id`, `lesson_id`, `course_id`
- `name`, `slug`, `type`, `description`
- `hints`: `{ is_required, max_attempts, time_limit_seconds }` only
- `questions`: ordered array from snapshot builder (`question_id`, `question_type`, `position`, `content`, `points`)
- `question_count`

Never returned: answer keys, correct_*, accepted answers, grading rules,
scoring internals, staff notes, unpublished questions, full activity settings.

## Authorization

1. `auth.uid()` required
2. `has_learning_course_access(course_id, uid)`
3. Space `active`
4. Program / course / section / lesson / activity all `published`
5. Fail closed otherwise (sanitized UI errors)

## Lifecycle / writes

**None.** Function is `stable`, performs no INSERT/UPDATE/DELETE, creates no
attempts, answers, scores, or progress rows.

## No remote apply

Migration is Git-only until explicitly applied by humans. This slice does not
run `supabase db push` / remote migrate.

## Validation

- SQL contract tests + adapter tests in `assessmentDelivery.test.ts`
- Full `lib/learning` suite
- `tsc --noEmit`, scoped eslint, build when required
