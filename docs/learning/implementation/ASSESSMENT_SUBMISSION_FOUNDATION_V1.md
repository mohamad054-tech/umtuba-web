# UM Learning — Assessment Submission Foundation V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-assessment-submission-foundation-v1`
Parent: `office/learning-assessment-answer-persistence-v1` @ `de96ccc`

Migration: `supabase/migrations/20260851_learning_assessment_submission_foundation_v1.sql`
Adapter: `lib/learning/assessmentSubmissionFoundation.ts`
Actions: `app/learning/assessmentSubmissionActions.ts`

---

## Scope

| In | Out |
| --- | --- |
| Submit own active attempt | Scoring / grading / correctness |
| Lock answers after submit | Answer-key access |
| Submission lifecycle metadata | Progress / certificates / analytics |
| Completeness vs snapshot | Instructor review / retakes |
| Idempotent re-submit | Automatic grading jobs |

## Schema

**Reuses** `learning_attempts.status` + `submitted_at` as authoritative submission state.
**Reuses** `learning_attempt_answers` for completeness checks only.
No new submission table. No second attempts system.
Question snapshot remains immutable.

## Architecture

```
Attempt page
  → AssessmentSubmitForm (confirm) / loadAssessmentSubmission
  → submitAssessmentAttemptAction / submitAssessmentAttempt
  → submit_my_learning_assessment_attempt
       → learning_attempt_expire_if_due (FOR UPDATE + lazy expire)
       → ownership + active lifecycle
       → snapshot completeness (required by default)
       → atomic active → submitted + server submitted_at
```

`get_my_learning_assessment_submission` returns lifecycle metadata only
(status, timestamps, counts). No answer payloads, keys, or scores.

## Completeness policy

1. Validate only against the immutable attempt `questions_snapshot`.
2. Every snapshotted question is **required by default**.
3. A question is **optional** only when the snapshot object explicitly sets
   boolean `is_required: false` or `required: false`.
4. Optional unanswered questions do **not** block submission.
5. Required unanswered questions block with `Required question is unanswered`.
6. Malformed snapshot (non-array, non-object elements, invalid `question_id`,
   non-boolean required flags, empty snapshot) **fails closed**.
7. Never joins or reads answer keys. Never evaluates correctness.

Note: the current snapshot builder does not emit optional flags, so all
published questions behave as required until authoring adds optional markers.

## Concurrency / atomicity

- `learning_attempt_expire_if_due` takes `FOR UPDATE` on the attempt row.
- Completeness + status transition run under that lock in one transaction.
- Existing `save_learning_attempt_answer` also locks via expire_if_due and
  rejects non-`active` attempts — a concurrent save after submit cannot write.
- Update uses `WHERE status = 'active'` so concurrent terminal transitions fail closed.
- Idempotent re-submit returns existing `submitted_at` without creating duplicates.

## RPCs

| RPC | Args |
| --- | --- |
| `submit_my_learning_assessment_attempt` | `(p_attempt_id)` |
| `get_my_learning_assessment_submission` | `(p_attempt_id)` |

## Authorization

- `auth.uid()` required
- Owner-only
- Submit: active only (after lazy expiry)
- Reject foreign / cancelled / expired / malformed
- Already submitted: idempotent return
- No caller-controlled identity, `submitted_at`, status, score, or grading fields
- Revoke `PUBLIC`/`anon`; grant `EXECUTE` to `authenticated` (+ `service_role` for ops)
- Explicit `search_path = public` on SECURITY DEFINER functions
- Application uses user JWT client only (no service-role)

## UI

- Confirmation checkbox before final submit
- Clear copy that answers cannot change after submission
- Post-submit: read-only forms (`disabled`), show `submitted_at` + status
- No scores, grades, correctness, or feedback

## No remote apply

Migration is Git-only until explicitly applied.
