# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop  
**Active work:** Learning AI Tutor Backend Integration Foundation V1

| Item | Value |
| --- | --- |
| Active branch | `office/learning-ai-tutor-backend-foundation-v1` |
| Base HEAD | `76cbb96` — learner-safe wrong-answer explanation |
| Parent Shared AI Core | `196d774` on `office/ai-core-platform-foundation-v1` (closed/approved) |
| Remote | In sync before this task; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Learning-only integration boundary (`learningTutorIntegration`) over `aiService.runCapability`
2. Action-discriminated request union (not free-form capability strings)
3. Explicit allowlist of the five Learning Tutor capabilities
4. Integration tests proving mapping + fail-closed security

**NOT done / do not touch by mistake:**
- Learning UI / Home / Navigation / Creator / App Shell / Shared UI (Laptop)
- Unrelated local dirty Learning/Nexus/`globals.css` files — leave unstaged
- Do not remote-apply `20260871` without explicit approval
- No new migration for this integration layer

---

**Ownership:** Desktop owns Shared AI Core + Learning Tutor backend capabilities/integration (no UI).
**Laptop owns:** user-facing AI presentation/integration wiring, Home, Navigation, Creator, App Shell, shared UI.

## Status

Shared AI Core Foundation V1 closed.
Learning AI Tutor Backend Foundation V1 closed (five capabilities).
Learning AI Tutor Backend Integration Foundation V1 implemented (server-side only).

## Public service boundary

```
Future Learning UI / server action
  → learningTutorIntegration.run (action-discriminated request)
  → aiService.runCapability (allowlisted capability only)
  → tutorRunner + contracts/safety/wrong-answer
  → Shared AI Core gateway
  → Provider adapter
```

Do **not** call gateway / tutorRunner / providers directly from UI.

## Learning Tutor integration (V1)

| Public action | Mapped capability |
| --- | --- |
| `explain_lesson` | `learning.tutor.explain_lesson` |
| `summarize_lesson` | `learning.tutor.summarize_lesson` |
| `answer_question` | `learning.tutor.answer_question` |
| `generate_practice` | `learning.tutor.generate_practice` |
| `explain_wrong_answer` | `learning.tutor.explain_wrong_answer` |

**Entry:** `runLearningTutorIntegration` / `learningTutorIntegration.run`
**Contracts:** `lib/ai/contracts/learningTutorIntegration.ts`
**Service:** `lib/ai/services/learningTutorIntegration.ts`

**Boundary guarantees:**
- Action allowlist only — unknown actions rejected before `aiService`
- Runtime validation of action-specific inputs (UUIDs / required fields)
- Rejects provider/model/prompt/system instructions/version/safety/metadata smuggling
- Does not re-implement auth, unlock, course access, wrong-answer contract, prompts, or provider selection
- Safe error messages for future UI (no stack traces)
- Wrong-answer remains behind the learner-safe contract via existing capability path

## Learning capabilities implemented

| Capability | Status |
| --- | --- |
| `learning.tutor.explain_lesson@1.0.0` | Implemented |
| `learning.tutor.summarize_lesson@1.0.0` | Implemented |
| `learning.tutor.answer_question@1.0.0` | Implemented |
| `learning.tutor.generate_practice@1.0.0` | Implemented (non-graded, AI-labeled) |
| `learning.tutor.explain_wrong_answer@1.0.0` | Implemented — learner-safe wrong-answer contract |

## Learner-safe wrong-answer contract

Resolver: `resolveLearnerSafeWrongAnswerContract` in `lib/ai/capabilities/learning/wrongAnswerContract.ts`.

Integration action `explain_wrong_answer` requires `attemptId` + `questionId` and still flows through the same contract via `aiService`.

## Migration status

Uses existing Shared AI Core migration `20260871` (local only, not remote-applied). **No new migration** for integration foundation.

## Next (after commit approval)

Laptop may wire Learning UI server actions to `learningTutorIntegration.run` using the action union. Desktop optional: Nexus Assistant backend consumer (still no Desktop UI).
