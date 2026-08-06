# Learning Accessibility Contract Suite V1

Capability: `learning.accessibility.ui_contract_suite_v1`
Base tip: Learning SoT (`f2f5ed2`)
Branch: `office/learning-accessibility-contract-suite-v1`

## Purpose

Deterministic accessibility source-contract coverage for existing Learning UI
surfaces — primarily tests, with smallest scoped `aria-label` fixes only where
instructor authoring controls previously relied on placeholder-only naming.

## Surfaces audited

- LearningHub, CourseOutline, LessonViewer
- AttemptPlayer / AttemptQuestion / AssessmentSubmitForm
- Public catalog listing + course detail
- Instructor dashboard, course authoring tree, lesson content-block editor
- LearningShell, ContentBlockRenderer, InstructorActionForm, BootstrapField

## Fixes in this milestone

Instructor create/update/reorder controls lacked accessible names (placeholder
or unlabeled inputs). Added behavior-preserving `aria-label` attributes on:

- `app/learning/instructor/courses/[courseId]/page.tsx`
- `app/learning/instructor/courses/[courseId]/lessons/[lessonId]/page.tsx`

No CSS or visual redesign.

## Gate commands

```bash
npx vitest run lib/learning/accessibilityUiContract.test.ts
npx vitest run \
  lib/learning/learnerUiContract.test.ts \
  lib/learning/instructorUiContract.test.ts \
  lib/learning/assessmentRuntimeUiContract.test.ts \
  lib/learning/publicCatalogUiContract.test.ts \
  lib/learning/browserE2eFoundation.test.ts
npx tsc --noEmit
```
