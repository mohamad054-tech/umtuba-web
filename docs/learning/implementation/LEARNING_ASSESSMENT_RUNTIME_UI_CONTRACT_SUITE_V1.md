# Learning Assessment Runtime UI Contract Suite V1

Capability: `learning.assessment.runtime_ui_contract_suite_v1`
Base tip: Learning SoT (`525c046`)
Branch: `office/learning-assessment-runtime-ui-contract-suite-v1`

## Purpose

Deterministic source-contract coverage for learner assessment runtime UI:

- `AttemptPlayer`
- `AttemptQuestion`
- `AttemptStatusBanner`
- `AssessmentSubmitForm`
- `AssessmentAnswerSaveForm`
- `AssessmentGradePanel`
- `LearnerResultSummary`

Tests-only. No redesign. No CSS. No migrations. No live E2E.

## Covered contracts

- Locked / terminal input fail-closed
- Submit flush-before-RPC + save-failure messaging
- Confirmation-gated assessment submit
- Answer save disabled/error paths
- Grade panel: no answer keys; gated grade/progress actions
- Result summary: aggregate-only when visibility available
- Learner-only routes; no instructor authoring actions
- No `dangerouslySetInnerHTML`

## Gate commands

```bash
npx vitest run lib/learning/assessmentRuntimeUiContract.test.ts
npx vitest run \
  lib/learning/attemptPlayerAutosave.test.ts \
  lib/learning/assessmentDelivery.test.ts \
  lib/learning/assessmentAttemptFoundation.test.ts \
  lib/learning/assessmentSubmissionFoundation.test.ts \
  lib/learning/learnerResultDelivery.test.ts \
  lib/learning/learnerResultPolicy.test.ts \
  lib/learning/learnerDelivery.test.ts \
  lib/learning/learnerUiContract.test.ts
npx tsc --noEmit
```
