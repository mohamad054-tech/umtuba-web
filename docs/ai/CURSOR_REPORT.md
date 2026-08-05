# CURSOR_REPORT — Learner Lesson Delivery Defense-in-Depth V1

## Summary

Closed the Learning-owned data-plane hole where `/learning/lessons/[lessonId]`
loaded protected content blocks / activities and mutated progress
(`start`/`touch`) in parallel with the lesson engine — before unlock was
positively proven. Delivery is now engine-first and split into metadata-only
vs verified-full paths.

## Exact files changed

- `lib/learning/learnerDelivery.ts`
- `lib/learning/learnerDelivery.test.ts`
- `lib/learning/lessonContentAccess.test.ts`
- `app/learning/lessons/[lessonId]/page.tsx`
- `app/learning/lessons/[lessonId]/ai-tutor/page.tsx`
- `app/components/learning/LessonViewer.tsx`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Protected SELECTs (`learning_lesson_content_blocks`, `learning_activities`)
  and progress mutations only run after `verified_unlocked`.
- Metadata-only type has no `blocks`/`activities` fields (no accidental
  fallback).
- LessonViewer still renders protected content only from verified engine.
- AI Tutor keeps unlock gate; uses metadata-only (no delivery progress mutation).

## Tests

```
npx vitest run lib/learning/learnerDelivery.test.ts
npx vitest run lib/learning/lessonContentAccess.test.ts
```

69 passed (55 + 14). Also ran AI Tutor regression suites (36 passed).

## TypeScript

`npx tsc --noEmit` — PASS

## Build

Not required (no app entry / package change beyond Learning routes).

## git diff --check

PASS

## git status --short

```
 M app/components/learning/LessonViewer.tsx
 M app/learning/lessons/[lessonId]/ai-tutor/page.tsx
 M app/learning/lessons/[lessonId]/page.tsx
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
 M lib/learning/learnerDelivery.test.ts
 M lib/learning/learnerDelivery.ts
 M lib/learning/lessonContentAccess.test.ts
```

## Open issues

- Awaiting commit GO (no commit/push performed)
