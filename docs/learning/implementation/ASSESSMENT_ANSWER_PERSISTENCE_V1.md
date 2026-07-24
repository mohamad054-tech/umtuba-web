# UM Learning — Assessment Answer Persistence Foundation V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-assessment-answer-persistence-v1`
Parent: `office/learning-assessment-attempt-foundation-v1` @ `34e6aa4`

Migration: `supabase/migrations/20260850_learning_assessment_answer_persistence_v1.sql`
Adapter: `lib/learning/assessmentAnswerPersistence.ts`
Actions: `app/learning/assessmentAnswerActions.ts`

---

## Scope

| In | Out |
| --- | --- |
| Save / restore learner answers | Submit / complete attempt |
| Active-attempt writes only | Scoring / grading / correctness |
| Snapshot membership validation | Answer-key access |
| Idempotent upsert per question | Progress / certificates / analytics |
| Minimal save UI on attempt page | Instructor review |

## Schema

**Reuses** existing `learning_attempt_answers` (`UNIQUE(attempt_id, question_id)`).
No new table. No second attempts system.

## Architecture

```
Attempt page
  → loadAssessmentAnswers / saveAssessmentAnswerAction
  → get_my_learning_assessment_answers / save_my_learning_assessment_answer
       → save_learning_attempt_answer (existing)
            → expire_if_due + owner + active
            → snapshot membership
            → structural validate
            → upsert learning_attempt_answers
```

Get answers is read-only (no `expire_if_due` mutation).

## RPCs

| RPC | Args |
| --- | --- |
| `save_my_learning_assessment_answer` | `(p_attempt_id, p_question_id, p_answer)` |
| `get_my_learning_assessment_answers` | `(p_attempt_id)` |

## Supported answer payloads

| Type | Payload |
| --- | --- |
| `multiple_choice_single` | `{ selected_key }` |
| `multiple_choice_multiple` | `{ selected_keys: string[] }` |
| `true_false` | `{ value: boolean }` |
| `short_answer` | `{ text }` |
| `fill_blank` | `{ blanks: { [key]: text } }` |
| `numeric` | `{ value: number }` |

## Authorization / lifecycle

- `auth.uid()` required
- Owner-only
- Save: active only (after existing lazy expiry inside save path)
- Reject cancelled / submitted / expired / foreign / non-snapshot questions
- Forbidden authoritative keys rejected in wrapper + TS layer
- Never joins answer keys

## No remote apply

Migration is Git-only until explicitly applied.
