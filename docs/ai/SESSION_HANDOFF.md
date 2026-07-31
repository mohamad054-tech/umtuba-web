# Session Handoff — UMTUBA Learning AI Tutor

**Updated:** 2026-07-31

## Closed (do not modify)

| Milestone | Tip |
| --- | --- |
| Thread Lesson Binding V1 | `b85081b` |
| Thread Resume / History Read Foundation V1 | `6930d86` |
| Structured Oversize Serialization V1 | `7d03178` |

## Active (PASS + STAGED — no commit yet)

| Milestone | Branch / worktree |
| --- | --- |
| Thread Lifecycle Foundation V1 (`learning.tutor.thread_lifecycle_foundation_v1`) | Branch: `office/learning-ai-tutor-thread-lifecycle-foundation-v1` · Worktree: `C:\Users\Admin\Desktop\umtuba\umtuba-web-learning-ai-tutor-next-milestone-proposal-v1` · Base: `7d03178` |

### Lifecycle contract

- States: `active` | `archived`
- Ensure = get-or-create single active thread for `(auth.uid, course_id, lesson_id)`
- Never reuse across lesson / course / learner; archived → new active on ensure
- Migration: `20260876` local only

## Still deferred / blocked

- Conversation History Summarization — **deferred**, no unblock condition
- `code_review` capability — blocked
- Remote apply of Tutor migrations — requires explicit apply GO

## Do not

- Start summarization while deferred
- Amend closed tips
- Commit / push / remote-apply from Cursor unless asked
