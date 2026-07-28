# AI Platform Workstream (Desktop-owned)

**Branch:** `office/learning-ai-tutor-backend-foundation-v1` (from Shared AI Core `196d774`)

**Ownership:** Desktop owns Shared AI Core, service boundary, providers, persistence, domain capabilities without UI.

**Laptop owns:** all user-facing AI presentation/integration, Home, Navigation, Creator, App Shell, shared UI.

## Status

Shared AI Core Foundation V1 closed.

Learning AI Tutor Backend Foundation V1 implemented (server-side only, no Learning UI wiring).

## Public service boundary

```
UI → typed contract (lib/ai/contracts/public.ts + learningTutor.ts)
  → aiService.runCapability (lib/ai/services/aiService.ts)
  → Shared AI Core gateway
  → Provider adapter
```

## Learning capabilities implemented

| Capability | Status |
| --- | --- |
| `learning.tutor.explain_lesson@1.0.0` | Implemented |
| `learning.tutor.summarize_lesson@1.0.0` | Implemented |
| `learning.tutor.answer_question@1.0.0` | Implemented |
| `learning.tutor.generate_practice@1.0.0` | Implemented (non-graded, AI-labeled) |
| `learning.tutor.explain_wrong_answer` | Deferred — no learner-safe wrong-answer contract |

## Trusted context sources

- `has_learning_course_access` (enrollment/manager/admin)
- `requireLessonUnlockedForLearner`
- Published course → section → lesson → published creatable blocks only
- Activity titles only (no answer keys)
- Does **not** call `loadLessonDelivery` (avoids progress mutation)

## Read-only tools

- `learning.read_lesson_outline`
- `learning.read_published_lesson_blocks`
- `learning.read_enrollment_state`

## Safety rules

Teen-safe refusals; no graded cheating; no answer keys; practice must be AI-labeled; AI is not official course content; no automatic memory persistence.

## Contracts for Laptop

`aiService.runCapability` with `lessonId` / `question` inputs; results include `groundingStatus`, `sourceReferences`, `labeledAiGenerated`, `officialCourseContent: false`, `mutatesProgress/Grades: false`.

## Migration status

Uses existing Shared AI Core migration `20260871` (local only, not remote-applied). No new Learning-specific AI tables.

## Architecture enforcement

Domain AI must not import other Domain AI or React. Learning UI must not import gateway/provider/prompt internals.

## Next backend AI capability

Learner-safe wrong-answer explanation contract (released results + stems without keys), then `learning.tutor.explain_wrong_answer`. Still no Desktop UI.
