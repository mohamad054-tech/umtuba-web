# UM Learning — Assessment Delivery Minimal V1

Status: **BLOCKED — schema gap (no migration created)**

Branch: `office/learning-assessment-delivery-minimal-v1`  
Parent: `office/learning-assessment-authoring-minimal-v1` @ `cf9011a`

---

## Goal (requested)

Deliver an authored assessment (published activity questions) to an entitled
learner as a **read-only** surface:

- Resolve assessment + questions through existing server-side services only
- Respect authentication / entitlement
- No grading, scoring, submissions, attempts, timing, analytics, certificates,
  progress mutation, or answer persistence
- No direct Learning table access from UI
- No Supabase migrations in this slice

## Verdict

**Cannot implement product delivery without a new authenticated learner-safe
RPC (or equivalent grant).** Implementing via workarounds would violate the
stated security or scope constraints.

## Exact evidence (no guessing)

### 1) Questions table is staff-only for SELECT

From `20260837_learning_questions_foundation_v1.sql` and
`lib/learning/questionsFoundation.ts`:

- RLS policies exist for course staff / question managers / platform admins
- **No learner SELECT policy** on `learning_questions`
- **No learner SELECT policy** on `learning_question_answer_keys`
- Ordinary space membership grants nothing

Therefore JWT `supabase.from("learning_questions").select(...)` cannot be the
learner delivery path.

### 2) Snapshot builder exists but is not callable by learners

`learning_attempt_build_questions_snapshot(activity_id)` builds the
learner-safe published-question payload (prompt + options/blanks; never keys).

From `20260838_learning_attempts_foundation_v1.sql`:

```sql
revoke all on function public.learning_attempt_build_questions_snapshot(uuid)
  from public, anon, authenticated;
```

It is an **internal** helper invoked inside `start_learning_attempt`, not a
client-facing delivery RPC.

### 3) Existing learner-callable paths create or require attempts

| Existing surface | Why it fails this scope |
| --- | --- |
| `start_learning_attempt` | Creates / resumes an **attempt** (forbidden) |
| `get_my_learning_attempt` | Requires an attempt; returns answers / session state |
| `save_learning_attempt_answer` / `submit_learning_attempt` | Persistence / submission (forbidden) |
| Activity gate (`loadPublishedActivityGate`) | Metadata + hints only; **no questions** |

### 4) No later migration added a delivery RPC

Searched Learning migrations through Progress / Result Policy slices: no
`get_learning_*question*`, no grant of the snapshot builder to
`authenticated`, and no learner SELECT widening on question tables.

## What would unblock (migration required — not created here)

Add a **new** SECURITY DEFINER RPC, for example:

`get_my_learning_activity_assessment(p_activity_id uuid) → jsonb`

Required behavior (mirrors snapshot firewall + attempt start gates):

1. `auth.uid()` required
2. Lock/resolve activity → lesson → section → course → program → space
3. Require active space + **published** program/course/section/lesson/activity
4. Require `has_learning_course_access(course_id, auth.uid())` (or equivalent)
5. Return learner-safe published questions only (same field set as
   `learning_attempt_build_questions_snapshot`, including optional `points`)
6. **Never** read/join/return `learning_question_answer_keys`
7. **Never** create attempts, answers, scores, or progress rows
8. `GRANT EXECUTE` to `authenticated`; revoke from `anon`/`public` as usual
9. Safe audit optional (`assessment.view` without question payloads)

After that migration lands, Assessment Delivery Minimal V1 can be a thin
TypeScript wrapper + read-only UI on top of the RPC (same pattern as
`learnerDelivery.ts`).

## Explicit non-actions taken

- No new migration file created
- No remote migration apply
- No learner SELECT against `learning_questions` / answer keys
- No service-role bypass
- No attempt start / save / submit / score / progress mutation
- No Games / Ads / Store / World changes
- Assessment Authoring Minimal V1 left unmodified
- `alpha-0.2` not checked out or merged

## Files in this blocker handoff

- `docs/learning/implementation/ASSESSMENT_DELIVERY_MINIMAL_V1.md` (this file)
- `lib/learning/assessmentDelivery.ts` — fail-closed constants / loader stub
- `lib/learning/assessmentDelivery.test.ts` — contract proofs of the gap

## Next Learning slice (when migration is approved)

1. Ship the RPC migration above
2. Wire `loadAssessmentDelivery` to the RPC
3. Add `/learning/activities/[activityId]/assessment` read-only UI
4. Link from the activity gate without starting an attempt
