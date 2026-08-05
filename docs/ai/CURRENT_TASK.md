# Current Task

## Task title

UM Learning AI Tutor Backend — Thread Lesson Binding Hardening V1

## Status

`verification-pass` — **COMMITTED + PUSHED** @ `b85081b` — branch synced `0 0` with `origin/office/learning-ai-tutor-thread-lesson-binding-v1`. Awaiting separate apply GO for `20260874` only.

## Branch

`office/learning-ai-tutor-thread-lesson-binding-v1`

## Base

`office/learning-ai-tutor-thread-metadata-read-v1` @ `9e90448ce8e4566fd369476a2571844378b0950c`

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web` (no alternate worktree)

## Milestone

`learning.tutor.thread_lesson_binding_hardening_v1`

## Delivered

- Migration (local only): `20260874_learning_ai_tutor_thread_lesson_binding_v1.sql`
- Drops 4-arg `append_my_learning_ai_tutor_exchange(uuid, text, text, text)`
- Creates 5-arg RPC with SQL `thread.lesson_id = p_lesson_id` + lesson∈course + course membership + auth.uid ownership
- Foundation + bridge + integration pass `lessonId` / `p_lesson_id`
- Bridge maps mismatch / auth / entitlement fail-closed; validates threadId+lessonId UUIDs
- Lean metadata validation retained as defense in depth

## Verification (local)

- Narrow + affected Tutor suites: **115 passed**
- `npx tsc --noEmit`: PASS
- `git diff --check`: PASS
- `npm run build`: not run (policy)
- Migration: **not applied** remotely

## Machine policy

AI Tutor Backend laptop only. Do **not** touch `alpha-0.2` / Web UI / Provider / Gemini. No `npm run build`. Do not apply migration remotely without explicit GO.

## Allowed scope

- `supabase/migrations/20260874_learning_ai_tutor_thread_lesson_binding_v1.sql`
- `lib/learning/aiTutorFoundation.ts` (+ tests)
- `lib/ai/capabilities/learning/threadPersistenceBridge.ts` (+ tests)
- `lib/ai/services/learningTutorIntegration.ts` (pass lessonId only)
- `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Provider Foundation / Gemini
- alpha-0.2 / Web UI
- New Tutor capabilities
- Commit / push / remote migration apply without GO

## Next

Separate apply GO for migration `20260874` only (do not re-commit feature work).
