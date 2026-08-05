# CURSOR_REPORT — Learning Tutor thread lesson binding hardening

## Summary

**PASS** — Completed and verified **`learning.tutor.thread_lesson_binding_hardening_v1`** on
`office/learning-ai-tutor-thread-lesson-binding-v1` from metadata-read tip `9e90448`.

- Local migration `20260874` drops 4-arg exchange overload and creates 5-arg RPC with SQL lesson binding.
- Foundation / bridge / integration pass `lessonId` → `p_lesson_id`.
- Bridge fail-closed for mismatch, auth, entitlement, and invalid ids; metadata validation retained.
- Migration **not** applied remotely.
- Feature commit **pushed**: `b85081b` on `office/learning-ai-tutor-thread-lesson-binding-v1` (synced `0 0`).

## Exact files changed

- `supabase/migrations/20260874_learning_ai_tutor_thread_lesson_binding_v1.sql` (new)
- `lib/learning/aiTutorFoundation.ts`
- `lib/learning/aiTutorFoundation.test.ts`
- `lib/ai/capabilities/learning/threadPersistenceBridge.ts`
- `lib/ai/capabilities/learning/threadPersistenceBridge.test.ts`
- `lib/ai/services/learningTutorIntegration.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

`supabase/migrations/20260874_learning_ai_tutor_thread_lesson_binding_v1.sql` (local only; **not** applied).

## Behavior implemented

- Exchange persistence requires `lessonId` end-to-end (integration → bridge → foundation → RPC `p_lesson_id`).
- SQL enforces `auth.uid` ownership, live course entitlement, exact `thread.lesson_id = p_lesson_id`, and lesson belongs to `thread.course_id`.
- Old 4-arg overload dropped so callers cannot bypass binding.
- App maps lesson mismatch → `invalid_input`; auth/entitlement/not-found → `permission_denied`.

## Security review

- `SECURITY DEFINER` + `search_path = public`
- `auth.uid()` ownership; course entitlement re-check
- Exact `thread.lesson_id = p_lesson_id`; lesson must belong to `thread.course_id`
- Old 4-arg overload dropped (cannot bypass binding)
- Revoke public/anon; grant authenticated (+ service_role convention)
- App path: authenticated client only; no service-role client
- Idempotent function replace + drop-if-exists; no table/column create/drop; stub append preserved

## Tests

- Narrow: foundation + bridge — **56 passed**
- Affected Tutor surface (`lib/ai/capabilities/learning` + foundation + integration + server actions): **115 passed**
- Includes: correct binding, mismatch rejection, unauthorized/auth rejection, missing/invalid ids, valid persist, no capability regression

## TypeScript

`npx tsc --noEmit` — PASS (exit 0)

## Build

Not run (policy).

## git diff --check

PASS (exit 0)

## git status --short

Clean on branch after docs handoff sync (feature already at `b85081b`).

## Open issues

- Do not remote-apply `20260874` without explicit GO
- Do not touch Provider / Gemini / alpha / Web UI from this laptop
