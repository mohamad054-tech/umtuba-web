# UM Learning — Assessment Attempt Foundation V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-assessment-attempt-foundation-v1`
Parent: `office/learning-assessment-delivery-minimal-v1` @ `00b2798`

Migration: `supabase/migrations/20260849_learning_assessment_attempt_foundation_v1.sql`
Adapter: `lib/learning/assessmentAttemptFoundation.ts`
Actions: `app/learning/assessmentAttemptActions.ts`
Route: `/learning/activities/[activityId]/assessment-attempts/[attemptId]`

---

## Scope

| In | Out |
| --- | --- |
| Start / resume assessment attempt | Answer save / submit |
| One active attempt (existing DB policy) | Scoring / grading / correctness |
| Lifecycle + start timestamps | Progress completion |
| Expiration metadata (`expires_at`, remaining) | Certificates / analytics |
| Minimal start/cancel UI | Full attempt player |

## Architecture

```
Assessment preview UI
  → startAssessmentAttemptAction (auth)
  → start_my_learning_assessment_attempt
       → get_my_learning_activity_assessment  (reuse delivery)
       → start_learning_attempt               (existing row + one-active)

Attempt page
  → get_my_learning_assessment_attempt
       → expire_if_due (metadata)
       → owner + has_learning_course_access
       → questions_snapshot only (no answers)
```

No second attempts table. No service role from the app.

## RPCs

| RPC | Role |
| --- | --- |
| `start_my_learning_assessment_attempt(activity_id)` | Start/resume |
| `get_my_learning_assessment_attempt(attempt_id)` | Lifecycle + questions + expiry metadata |
| `cancel_my_learning_assessment_attempt(attempt_id)` | Cancel active |

## Security

- `auth.uid()` required
- Delivery RPC reused for entitlement + published chain on start
- Get revalidates `has_learning_course_access`
- Owner-only attempt reads/cancels
- SECURITY DEFINER + `search_path = public`
- Revoke `public/anon`; grant `authenticated`
- Never returns answer keys, answers, scores

## No remote apply

Migration is Git-only until explicitly applied.
