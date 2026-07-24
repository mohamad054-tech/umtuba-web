# UM Learning — Assessment Manual Review Foundation V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-assessment-manual-review-foundation-v1`
Parent: `office/learning-assessment-objective-grading-foundation-v1` @ `9ccae4d`

Migration: `supabase/migrations/20260853_learning_assessment_manual_review_foundation_v1.sql`
Adapter: `lib/learning/assessmentManualReview.ts`
Actions: `app/learning/assessmentManualReviewActions.ts`
Staff UI: `/learning/instructor/courses/[courseId]/manual-review`

---

## Scope

| In | Out |
| --- | --- |
| Staff review of pending subjective answers | Progress / certificates / rewards |
| Points 0..points_possible + optional feedback | Objective result override |
| Finalize when no pending remain | AI / bulk / anonymous grading |
| Learner-safe feedback on grade panel | Answer-key exposure |

## Authorization

Uses existing `can_manage_learning_course(course_id, auth.uid())` or
`is_platform_admin`. Course staff must be `status = 'active'` and
`lead_instructor` (helper contract). Inactive/suspended staff fail closed.
Learners without manage rights are rejected.

## Schema

**Reuses** result tables from Scoring / Objective Grading.

**Adds:**
- `learning_attempt_answer_results.reviewer_user_id`, `reviewed_at`, `learner_feedback`
- `result_state` value `manually_reviewed`
- `learning_attempt_results.manual_points_earned`, `final_percentage`

## Review policy

- Only `short_answer` and `fill_blank`
- Only `pending_manual_review` (or correction of `manually_reviewed` while
  `partially_graded`)
- Objective results cannot be changed
- Re-review allowed before finalization (updates reviewer + reviewed_at)
- After `graded`: only identical re-submit is idempotent; otherwise fail closed
- Feedback optional, ≤ 2000 chars, safe-text checked; learner-visible only

## Finalization

After each review, totals recalculate from per-question rows:
- pending remain → `partially_graded`, `passed = null`
- no pending → `graded`, `final_percentage`, `passed` from
  `learning_activity_settings.passing_score` when set; otherwise `passed` stays
  null (no invented threshold)

## RPCs

| RPC | Args |
| --- | --- |
| `get_learning_assessment_manual_review_queue` | `(p_course_id)` |
| `get_learning_assessment_attempt_for_review` | `(p_attempt_id)` |
| `review_learning_assessment_answer` | `(p_attempt_id, p_question_id, p_points_earned, p_feedback default null)` |

`get_my_learning_assessment_grade` extended for learner feedback + finals.

## No remote apply

Migration is Git-only until explicitly applied.
