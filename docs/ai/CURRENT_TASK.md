# Current Task

## Task title

UM Learning AI Tutor Backend — Thread Resume / History Read Foundation V1

## Status

`verification-pass` — **STAGED** — awaiting trailer-free commit/push GO, then separate apply GO for `20260875`

## Branch

`office/learning-ai-tutor-thread-resume-history-v1`

## Base

`office/learning-ai-tutor-thread-lesson-binding-v1` @ `b85081bf083b132250e06e398b24c993e59f6274`

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-learning-ai-tutor-thread-resume-history-v1`

## Milestone

`learning.tutor.thread_resume_history_read_v1`

## Why this milestone

After closed Lesson Binding (`b85081b`), `docs/ai/workstreams/AI_PLATFORM.md` listed **Trusted-producer transcript integrity** as the next follow-up. Metadata Read intentionally excluded message history; the prior unbounded `get_my_learning_ai_tutor_thread_messages(uuid)` lacked course/lesson binding and live entitlement. This milestone is the concrete Resume / History Read foundation that implements that integrity follow-up.

## Delivered

- Migration (local only): `20260875_learning_ai_tutor_thread_resume_history_read_v1.sql`
- Drops unbounded `get_my_learning_ai_tutor_thread_messages(uuid)`
- Creates `resume_my_learning_ai_tutor_thread(p_thread_id, p_course_id, p_lesson_id, p_limit)` with ownership, entitlement, exact course+lesson match, lesson∈course, ordered + bounded history
- Foundation `resumeMyAiTutorThread` + bridge `resumeLearningTutorThread`
- Minimal AI Tutor page call-site wiring to pass courseId+lessonId (no UI redesign)

## Verification (local)

- Affected Tutor suites: **130 passed**
- `npx tsc --noEmit`: PASS
- `git diff --check`: PASS
- `npm run build`: not run (Tutor backend policy)
- Migration: **not applied** remotely

## Machine policy

AI Tutor Backend laptop only. Do **not** touch Provider / Gemini / alpha / broad Web UI. No remote migration apply without GO. No commit/push from Cursor unless asked.

## Forbidden scope

- Provider Foundation / Gemini
- New Tutor capabilities beyond resume/history
- Home / Commerce / Profile / App Shell / Translation
- Commit / push / remote migration apply without GO

## Next

Trailer-free commit/push GO, then separate apply GO for `20260875` (and any still-pending prior Tutor migrations as separately approved).
