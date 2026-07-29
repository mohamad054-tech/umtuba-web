# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop  
**Active work:** Learning AI Tutor Server Actions Foundation V1

| Item | Value |
| --- | --- |
| Active branch | `office/learning-ai-tutor-backend-foundation-v1` |
| Base HEAD | `78003e5` — learning tutor integration boundary |
| Remote | In sync before this task; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Named Learning Tutor server actions (`app/actions/learningTutor.ts`)
2. Testable core (`lib/ai/services/learningTutorServerActions.ts`) over `learningTutorIntegration` only
3. Server-action contracts + tests
4. Docs updated

**NOT done / do not touch by mistake:**
- Learning UI / Home / Navigation / Creator / App Shell / Shared UI (Laptop)
- Unrelated local dirty Learning/Nexus/`globals.css` files — leave unstaged
- Do not remote-apply `20260871` without explicit approval
- No new migration for this layer

---

**Ownership:** Desktop owns Shared AI Core + Learning Tutor backend capabilities/integration/server actions (no UI pages/components).
**Laptop owns:** user-facing AI presentation wiring, Home, Navigation, Creator, App Shell, shared UI.

## Status

Shared AI Core Foundation V1 closed.
Learning AI Tutor Backend Foundation V1 closed (five capabilities).
Learning AI Tutor Backend Integration Foundation V1 closed.
Learning AI Tutor Server Actions Foundation V1 implemented (server-side only, no UI).

## Public service boundary

```
Future Learning UI
  → named server actions (app/actions/learningTutor.ts)
  → learningTutorServerActions core
  → learningTutorIntegration.run (action-discriminated)
  → aiService.runCapability
  → tutorRunner + contracts/safety/wrong-answer
  → Shared AI Core gateway
  → Provider adapter
```

## Learning Tutor server actions (V1)

| Server action export | Integration action |
| --- | --- |
| `explainLessonLearningTutorAction` | `explain_lesson` |
| `summarizeLessonLearningTutorAction` | `summarize_lesson` |
| `answerQuestionLearningTutorAction` | `answer_question` |
| `generatePracticeLearningTutorAction` | `generate_practice` |
| `explainWrongAnswerLearningTutorAction` | `explain_wrong_answer` |

**Guarantees:**
- Named functions only — no free-form action/capability string dispatcher
- Calls `learningTutorIntegration` only (never `aiService` directly)
- Auth via `getServerUser` + existing Learning access chain inside integration/capabilities
- Strips `modelId` / `promptVersion` / provider fields from UI-facing success payloads
- Safe error envelope with optional `requiresAuth`
- No App Router pages / React components in this deliverable

## Learning capabilities implemented

| Capability | Status |
| --- | --- |
| `learning.tutor.explain_lesson@1.0.0` | Implemented |
| `learning.tutor.summarize_lesson@1.0.0` | Implemented |
| `learning.tutor.answer_question@1.0.0` | Implemented |
| `learning.tutor.generate_practice@1.0.0` | Implemented |
| `learning.tutor.explain_wrong_answer@1.0.0` | Implemented |

## Migration status

Uses existing Shared AI Core migration `20260871` (local only, not remote-applied). **No new migration.**

## Next (after commit approval)

Laptop may wire Learning UI to the five named server actions. No Desktop UI.
