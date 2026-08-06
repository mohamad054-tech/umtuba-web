# Learning Learner UI Contract Suite V1

Capability: `learning.learner.ui_contract_suite_v1`
Base tip: Learning SoT (`dd7aff0`)
Branch: `office/learning-learner-ui-contract-suite-v1`

## Purpose

Deterministic source-contract coverage for learner-facing UI surfaces:

- `LearningHub`
- `CourseOutline`
- `LessonViewer`

Tests-only. No visual redesign. No CSS changes. No migrations. No live E2E.

## Covered contracts

### LearningHub
- Stable E2E testids + Resume primary CTA
- Empty enrollment state
- Enrolled course links via `LEARNING_LEARNER_ROUTES`
- Continue/resume only from `continue_href` (no invented lesson targets)

### CourseOutline
- Section/lesson map order + progress labels
- Lesson links via `LEARNING_LEARNER_ROUTES.lesson`
- No instructor/admin actions
- Lock gating owned by LessonViewer (current proven behavior)

### LessonViewer
- Browser E2E testids
- Verified-engine-only protected content
- Locked fail-closed
- Completion handoff kinds
- No `dangerouslySetInnerHTML`

### Shared
- Canonical `LEARNING_LEARNER_ROUTES` templates
- No hardcoded `/learning/courses|lessons/...` string paths in the three surfaces

## Gate commands

```bash
npx vitest run lib/learning/learnerUiContract.test.ts
npx vitest run \
  lib/learning/learnerDelivery.test.ts \
  lib/learning/lessonContentAccess.test.ts \
  lib/learning/lessonEngineFoundation.test.ts \
  lib/learning/lessonUnlockFoundation.test.ts \
  lib/learning/contentBlockRender.test.ts \
  lib/learning/browserE2eFoundation.test.ts \
  lib/learning/productionSmokeE2eGate.test.ts
npx tsc --noEmit
```
