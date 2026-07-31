# Current Task

## Task title

UM Learning AI Tutor — Thread Lifecycle Foundation V1

## Status

`pass-staged` — implementation complete; **STAGED only** (no commit / no push / no remote migration apply)

## Milestone id

`learning.tutor.thread_lifecycle_foundation_v1`

## Branch

`office/learning-ai-tutor-thread-lifecycle-foundation-v1`

## Base

`office/learning-ai-tutor-structured-oversize-serialization-v1` @ `7d03178e4b10d09c514386804405154c785c1031`

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-learning-ai-tutor-next-milestone-proposal-v1`

## Allowed scope

- Lifecycle contract: `active` | `archived`
- Get-or-create / reuse single active thread per `(auth.uid, course_id, lesson_id)`
- Archive → replacement active on next ensure
- Migration `20260876` (local only)
- Foundation + bridge APIs + focused tests
- SSOT docs for this milestone

## Forbidden scope

- Conversation History Summarization (still deferred)
- Provider / Gemini / alpha / Web UI redesign
- Reopening closed Tutor tips (Binding / Resume / Oversize)
- Commit, push, remote migration apply

## Done

- SSOT approved Lifecycle as the official next milestone after Oversize Serialization
- Migration + ensure/archive RPCs + unique active index
- Foundation/bridge wiring; create-with-lesson uses ensure
- Focused + regression tests

## Next (human)

1. Review staged diff; commit trailer-free outside Cursor if approved
2. Remote-apply `20260876` only with explicit apply GO
3. Summarization remains deferred until SSOT undefer + GO
