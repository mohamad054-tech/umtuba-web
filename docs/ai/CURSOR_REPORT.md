# CURSOR_REPORT — Lesson Unlock Fail-Closed Hardening V1

## Summary

**PASS** — Closed the learner lesson delivery fail-open path on
`office/learning-ai-tutor-learner-ui-integration-v1` (base `d717459`).

Previously, when `get_my_learning_lesson_engine` failed or returned null,
`LessonViewer` treated the lesson as unlocked and rendered
`loadLessonDelivery` content blocks. Access is now fail-closed: protected
content renders only after a positively verified engine payload.

## Exact files changed

- `lib/learning/lessonEngineFoundation.ts`
- `lib/learning/lessonContentAccess.test.ts` (new)
- `app/components/learning/LessonViewer.tsx`
- `app/learning/lessons/[lessonId]/page.tsx`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Exact fail-open root cause

1. Lesson page passed `engine={engineResult.ok ? engineResult.data : null}`.
2. `isLessonPointLocked(null)` returned `false`.
3. Viewer fell back to `delivery.blocks` / `delivery.activities` from direct
   `learning_lesson_content_blocks` SELECT, bypassing engine unlock redaction.

## Exact security decision implemented

- `resolveLessonContentAccess(engineResult)` is the sole content gate.
- Positive render requires engine OK + parseable unlock +
  (`unlock_required === false`, including instructor/manage when unlock row
  still reports `locked: true`).
- Engine failure / null / malformed unlock → `engine_unavailable` or
  `access_unverified`; no protected content.
- Point-locked learners (`unlock_required === true`) → `locked`; unlock CTA only.
- Page strips delivery blocks/activities before LessonViewer props so RSC
  serialization cannot leak direct SELECT content.
- Viewer never reads `delivery.blocks` / `delivery.activities`.

## Behavior

| Case | Result |
| --- | --- |
| Verified unlocked / free | Engine blocks + activities render |
| Verified locked | Unlock CTA; content hidden |
| Engine RPC failure / null / malformed | Safe alert; content hidden |
| Instructor/manage (`unlock_required: false`) | Content remains accessible |

## Security review

- No service-role client; JWT + existing SECURITY DEFINER engine RPC
- No client-side SQL authorization duplicate; DB remains authority
- Sanitized user-facing messages; no raw Supabase/DB details added
- No secrets in diff
- AI Tutor / Commerce / Collaboration / Guardian untouched

## Tests

`npx vitest run lib/learning/lessonContentAccess.test.ts lib/learning/lessonEngineFoundation.test.ts lib/learning/learnerDelivery.test.ts`

- **68 passed** / 0 failed
  - `lessonContentAccess.test.ts`: 12
  - `lessonEngineFoundation.test.ts`: 7
  - `learnerDelivery.test.ts`: 49

## TypeScript

`npx tsc --noEmit` — PASS (exit 0)

## Build

Not run (policy).

## git diff --check

PASS (exit 0)

## git status --short

Local uncommitted changes only (stop before commit per task).

## Open issues

- Remote Learning schema apply remains a separate ops concern (unchanged)
- Point-lock RLS on direct block SELECT (if any) is still a DB concern; UI
  no longer trusts that path for rendering
