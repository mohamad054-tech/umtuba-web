# Learning Attempt Player Autosave Flush Coverage V1

Capability: `learning.learner.attempt_player_autosave_flush_coverage_v1`
Base tip: Learning SoT (`f3987cc`)
Branch: `office/learning-attempt-player-autosave-flush-coverage-v1`

## Purpose

Dedicated deterministic coverage for `AttemptPlayer` autosave behavior around
submit, cancel, terminal, and locked states — preventing answer loss on submit
and delayed saves after terminal actions.

Tests-only. No Learning business redesign. No migrations. No live E2E.

## Covered behavior

1. Submit calls `flushPendingAnswers` before `submitLearningAttempt`
2. Flush failure aborts submit and surfaces `SAVE_FAIL_MESSAGE`
3. Cancel discards pending autosave before cancel RPC / terminal latch
4. Terminal + locked guards block persist, queue, submit, and cancel
5. Busy/terminal guards prevent duplicate terminal submit actions
6. Successful flush clears timers and requires empty pending queue
7. Persist deletes flushed question ids from the pending map

## Gate commands

```bash
npx vitest run lib/learning/attemptPlayerAutosave.test.ts
npx vitest run \
  lib/learning/assessmentAnswerPersistence.test.ts \
  lib/learning/assessmentSubmissionFoundation.test.ts \
  lib/learning/attemptsFoundation.test.ts
npx tsc --noEmit
```
