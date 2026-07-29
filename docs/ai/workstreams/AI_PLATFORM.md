# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop  
**Active work:** Learning AI Tutor — learner-safe wrong-answer contract + capability

| Item | Value |
| --- | --- |
| Active branch | `office/learning-ai-tutor-backend-foundation-v1` |
| Base HEAD before this task | `372cd8c` — docs save point |
| Parent Shared AI Core | `196d774` on `office/ai-core-platform-foundation-v1` (closed/approved) |
| Remote | Branch previously in sync; **no commit/push until verification report approved** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Learner-safe wrong-answer contract (`lib/ai/capabilities/learning/wrongAnswerContract.ts`)
2. `learning.tutor.explain_wrong_answer@1.0.0` via `aiService.runCapability` (server-side only)
3. Contract + capability security tests

**NOT done / do not touch by mistake:**
- Learning UI / Home / Navigation / Creator / App Shell / Shared UI (Laptop)
- Unrelated local dirty Learning/Nexus/`globals.css` files — leave unstaged
- Do not remote-apply `20260871` without explicit approval
- No new migration required for this capability

---

**Branch:** `office/learning-ai-tutor-backend-foundation-v1` (from Shared AI Core `196d774`)

**Ownership:** Desktop owns Shared AI Core, service boundary, providers, persistence, domain capabilities without UI.

**Laptop owns:** all user-facing AI presentation/integration, Home, Navigation, Creator, App Shell, shared UI.

## Status

Shared AI Core Foundation V1 closed.

Learning AI Tutor Backend Foundation V1 implemented (server-side only, no Learning UI wiring), including wrong-answer explanation behind a learner-safe contract.

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
| `learning.tutor.explain_wrong_answer@1.0.0` | Implemented — requires learner-safe wrong-answer contract |

## Learner-safe wrong-answer contract

Resolver: `resolveLearnerSafeWrongAnswerContract` in `lib/ai/capabilities/learning/wrongAnswerContract.ts`.

**Inputs:** authenticated `userId`, owner `attemptId`, `questionId`.

**Provides only:**
- Sanitized learner-visible question stem/context
- Caller's own incorrect answer payload
- Released feedback (`resultState=incorrect`, `feedbackCode`, optional `learnerFeedback`, points)
- Released aggregate score summary
- Enough grounding to explain the mistake (plus published lesson pack)

**Forbidden / fail-closed:**
- `answer_key` / stored correct answers / secret grading internals
- Unreleased results (`visibility !== available`)
- Non-incorrect question results
- Missing stem or missing learner answer
- Attempts/questions that are not the caller's
- Unauthorized course access

**Uses existing owner-scoped Learning RPCs only** (no new migration):
- `get_my_learning_attempt_result`
- `get_my_learning_assessment_attempt`
- `get_my_learning_assessment_grade`
- `get_my_learning_assessment_answers`
- `has_learning_course_access` + lesson unlock via existing tutor context adapter

**Capability input:** `attemptId` + `questionId` (lesson resolved from attempt).

## Trusted context sources

- `has_learning_course_access` (enrollment/manager/admin)
- `requireLessonUnlockedForLearner`
- Published course → section → lesson → published creatable blocks only
- Activity titles only (no answer keys)
- Wrong-answer path: released owner attempt grade + answers only
- Does **not** call `loadLessonDelivery` (avoids progress mutation)

## Read-only tools

- `learning.read_lesson_outline`
- `learning.read_published_lesson_blocks`
- `learning.read_enrollment_state`

## Safety rules

Teen-safe refusals; no graded cheating; no answer keys; practice must be AI-labeled; wrong-answer output must set `revealsAnswerKey: false`; AI is not official course content; no automatic memory persistence.

## Contracts for Laptop

`aiService.runCapability` with:
- Lesson capabilities: `lessonId` / `question`
- Wrong-answer: `attemptId` + `questionId`

Results include `groundingStatus`, `sourceReferences`, `labeledAiGenerated`, `officialCourseContent: false`, `mutatesProgress/Grades: false`. Wrong-answer also guarantees `revealsAnswerKey: false`.

## Migration status

Uses existing Shared AI Core migration `20260871` (local only, not remote-applied). **No new Learning-specific AI tables** for wrong-answer.

## Architecture enforcement

Domain AI must not import other Domain AI or React. Learning UI must not import gateway/provider/prompt internals.

## Next backend AI capability (after commit approval)

Optional: Nexus Assistant backend consumer of Shared AI Core (still no Desktop UI), or Laptop handoff for wiring Learning Tutor UI to these contracts.
