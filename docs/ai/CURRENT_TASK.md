# Current Task

## Task title

UM Learning AI Tutor Backend — Structured Oversize Serialization V1

## Status

`verification-pass` — **STAGED** — awaiting trailer-free commit/push GO

## Branch

`office/learning-ai-tutor-structured-oversize-serialization-v1`

## Base

`office/learning-ai-tutor-thread-resume-history-v1` @ `6930d8696fe8b7aed7a7190a8d9fd25781f6d5d7`

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-learning-ai-tutor-structured-oversize-serialization-v1`

## Milestone

`learning.tutor.structured_oversize_serialization_v1`

## Why this milestone

After closed Resume / History Read (`6930d86`), `docs/ai/workstreams/AI_PLATFORM.md` listed **Structured oversize serialization** as the next non-deferred follow-up. **Thread Lifecycle Foundation V1 is not documented in SSOT** and was not implemented (no invented roadmap).

## Delivered

- `serializeJsonObjectWithinLimit` — valid JSON within 20k bound
- Assistant persistence uses structured shrink/drop instead of mid-slice clamp
- Focused bridge tests for oversize validity / secondary-field drop / fail-closed
- No migration (app-layer only)

## Forbidden

- Thread Lifecycle inventing
- Provider / Gemini / UI redesign
- Commit / push / remote migration apply without GO
