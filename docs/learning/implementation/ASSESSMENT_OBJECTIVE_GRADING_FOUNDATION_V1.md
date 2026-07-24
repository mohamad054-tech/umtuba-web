# UM Learning — Assessment Objective Grading Foundation V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-assessment-objective-grading-foundation-v1`
Parent: `office/learning-assessment-submission-foundation-v1` @ `c6ee00b`

Migration: `supabase/migrations/20260852_learning_assessment_objective_grading_foundation_v1.sql`
Adapter: `lib/learning/assessmentObjectiveGrading.ts`
Actions: `app/learning/assessmentGradingActions.ts`

---

## Scope

| In | Out |
| --- | --- |
| Objective exact-match grading | Progress / certificates / rewards |
| Pending manual review for subjective | Instructor review UI |
| Learner-safe grade summary | Answer-key exposure |
| Idempotent re-grade | AI / semantic grading |
| Minimal grade UI on submitted attempt | Pass/fail while pending |

## Schema

**Reuses** `learning_attempt_results`, `learning_attempt_answer_results`,
`learning_question_answer_keys` (DEFINER-only), `learning_scoring_evaluate_answer`
(objective types only).

**Minimal extensions:**
- `learning_attempt_results.status` allows `partially_graded` | `graded` | `grading_failed` (+ legacy `scored`)
- objective / pending score columns on attempt results
- `learning_attempt_answer_results.result_state`
- `is_correct` nullable for pending / unsupported

## Completeness of grading types

### Automatically graded (objective)
- `multiple_choice_single` — `selected_key` ≡ `correct_key`
- `multiple_choice_multiple` — set equality on `selected_keys` / `correct_keys` (order-insensitive, duplicate-safe)
- `true_false` — boolean `value` ≡ `correct`
- `numeric` — `abs(learner - key.value) <= coalesce(tolerance, 0)`

### Pending manual review (subjective)
- `short_answer`
- `fill_blank`

Even though Scoring Foundation can exact-match these, Assessment Objective
Grading V1 **does not** auto-mark them. Answered subjective →
`pending_manual_review`. Unanswered → `not_answered` (points still counted in
`pending_manual_points` so they are not silently finalized at zero).

## Score policy

- Points from immutable snapshot only
- `objective_points_earned` / `objective_points_possible`
- `pending_manual_points` for subjective/unsupported pending scope
- `total_points_possible` = all snapshot points
- `objective_percentage` only over objective scope (labeled objective-only)
- `passed` always null in this path (no pass/fail while pending; no progress hook)
- Unanswered objective → `not_answered`, earned 0
- Malformed snapshot / objective key / answer payload → fail closed (no trusted final)

## Concurrency

- `learning_attempt_expire_if_due` locks attempt row
- Apply helper re-locks `FOR UPDATE`
- Delete + insert answer results under that lock (UNIQUE attempt+question)
- Deterministic re-grade is idempotent

## RPCs

| RPC | Args |
| --- | --- |
| `grade_my_learning_assessment_attempt` | `(p_attempt_id)` |
| `get_my_learning_assessment_grade` | `(p_attempt_id)` |

## Authorization

- Owner-only via `auth.uid()`
- Submitted attempts only
- Keys never returned; no authenticated SELECT widening on key tables
- Revoke PUBLIC/anon; grant EXECUTE to authenticated
- No application service-role usage

## No remote apply

Migration is Git-only until explicitly applied.
