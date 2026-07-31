# CURSOR_REPORT — Learning Tutor Thread Resume / History Read Foundation V1

## Summary

**PASS** — Implemented **`learning.tutor.thread_resume_history_read_v1`** on
`office/learning-ai-tutor-thread-resume-history-v1` from closed Lesson Binding tip `b85081b`.

- Local migration `20260875` drops unbounded messages RPC and creates lesson/course-bound resume RPC with bounded history.
- Foundation + bridge resume contracts fail-closed; lean payload (no `user_id` / provider internals).
- Minimal page call-site update only.
- Migration **not** applied. Staged only — **no commit/push**.

## Exact files changed

- `supabase/migrations/20260875_learning_ai_tutor_thread_resume_history_read_v1.sql` (new)
- `lib/learning/aiTutorFoundation.ts`
- `lib/learning/aiTutorFoundation.test.ts`
- `lib/ai/capabilities/learning/threadPersistenceBridge.ts`
- `lib/ai/capabilities/learning/threadResumeHistory.test.ts` (new)
- `app/learning/lessons/[lessonId]/ai-tutor/page.tsx` (call-site only)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ai/workstreams/AI_PLATFORM.md`

## Migrations created

`supabase/migrations/20260875_learning_ai_tutor_thread_resume_history_read_v1.sql` (local only; **not** applied).

## Behavior implemented

- Resume requires authenticated owner + `courseId` + `lessonId` + `threadId`.
- SQL enforces ownership, live entitlement, exact course/lesson match, lesson∈course.
- Messages ordered by `created_at asc, id asc`; limit default 50 / hard max 100.
- No silent fallback to another thread/lesson/course.
- Response omits `user_id` and provider/prompt internals.

## Security review

- `SECURITY DEFINER` + `search_path = public`
- Non-enumerating `Thread not found` for missing/foreign threads
- Revoke public/anon; grant authenticated (+ service_role convention)
- Idempotent create-or-replace + drop-if-exists; no table/data destruction

## Tests

- Affected Tutor surface: **130 passed** (includes new resume suite 15 + foundation/bridge/integration/capabilities)

## TypeScript

`npx tsc --noEmit` — PASS

## Build

Not run (Tutor backend policy).

## git diff --check

PASS

## Open issues

- Await trailer-free commit/push GO
- Do not remote-apply `20260875` without explicit GO
