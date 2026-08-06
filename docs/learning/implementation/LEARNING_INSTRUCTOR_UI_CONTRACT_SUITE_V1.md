# Learning Instructor UI Contract Suite V1

Capability: `learning.instructor.ui_contract_suite_v1`
Base tip: Learning SoT (`0c7793c`)
Branch: `office/learning-instructor-ui-contract-suite-v1`

## Purpose

Deterministic source-contract coverage for instructor-facing Learning UI surfaces
already present in the tree — tests-only, no redesign, no CSS, no migrations,
no live E2E, no new instructor features.

## Surfaces audited

- Instructor dashboard (`app/learning/instructor/page.tsx`)
- Course authoring shell/tree (`app/learning/instructor/courses/[courseId]/page.tsx`)
- Lesson content-block editor (`.../lessons/[lessonId]/page.tsx`)
- Assessment questions authoring (`.../activities/[activityId]/questions/page.tsx`)
- Assignment authoring (`.../activities/[activityId]/assignment/page.tsx`)
- Review queue (`app/learning/instructor/review/page.tsx`)
- `InstructorActionForm` + lifecycle helpers / route truth modules

## Covered contracts

- Instructor-only entry points and empty manageable-course state
- Section → lesson → activity hierarchy + create/edit/reorder actions
- `canManage` / draft-aware publish-archive guards
- Minimal content-block authoring types; reserved/deferred types unavailable
- No `dangerouslySetInnerHTML` / raw HTML path
- Assessment/assignment authoring routes; no learner attempt/submission players
- Canonical `LEARNING_INSTRUCTOR_*` / assessment / assignment route builders
- Learner vs instructor hub separation

## Gate commands

```bash
npx vitest run lib/learning/instructorUiContract.test.ts
npx vitest run \
  lib/learning/instructorAuthoring.test.ts \
  lib/learning/instructorExperience.test.ts \
  lib/learning/instructorBootstrap.test.ts \
  lib/learning/lessonContentBlocksFoundation.test.ts \
  lib/learning/assessmentAuthoring.test.ts \
  lib/learning/assignmentsCoursework.test.ts \
  lib/learning/publicCatalog.test.ts \
  lib/learning/learnerDelivery.test.ts \
  lib/learning/learnerUiContract.test.ts
npx tsc --noEmit
```
