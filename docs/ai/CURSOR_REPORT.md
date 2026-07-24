# CURSOR_REPORT

## Summary

UM Learning continuation review on `office/learning-progress-mutations-v1`
(synced with origin: 0 ahead / 0 behind). **No code changes.** Review-only.

Learning foundations through **Progress Mutations V1 (`20260845`)** are
implemented in Git as a dependency-ordered stack (Spaces → … → score-gated
lesson progress). Entire migration chain remains **not applied** to remote
Supabase. Learner delivery UI exists for catalog → lesson → attempt → aggregate
results; staff authoring / result-policy tools and non-`score` completion modes
are still open.

**Next dependency-correct feature (proposed, not implemented):**
**Completion-mode progress V1** — wire `completion_mode` `view` / `submit`
(and clarify `manual`) into DB-authoritative lesson progress, continuing the
contract Progress Mutations V1 explicitly deferred.

## Exact files changed

None (review only). This report file updated.

## Migrations created

None

## Security review

N/A — no implementation. Observed architecture remains DB-authoritative:
RPC/DEFINER writes, FORCE RLS, answer-key firewall, learner aggregate-only
results, no client authority over progress percent / identity columns.

## Tests

Not run (review only)

## TypeScript

Not run (review only)

## Build

Not run (review only)

## git diff --check

Not applicable (no implementation diff)

## git status --short

Review branch reported clean and even with
`origin/office/learning-progress-mutations-v1` at review time.

## Open issues

- Learning migrations `20260828`–`20260845` Git-only until explicit apply approval
- `completion_mode` `view` / `submit` / `manual` still do not auto-mutate progress
- Staff RPCs for result policy (`set_learning_activity_results_available_at`,
  `release_learning_attempt_result`) have no instructor UI
- No instructor/authoring UI; content creation is RPC/SQL only
- Deferred product domains: certificates, assignments engines, manual/AI grading,
  `learning_lesson_items`, activity-level progress, media storage, analytics,
  UM Points
- `docs/ai/CURRENT_TASK.md` still points at Ads Reporting on `alpha-0.2` (stale
  relative to this Learning review request)
