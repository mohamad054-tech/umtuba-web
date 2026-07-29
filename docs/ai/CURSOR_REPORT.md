# CURSOR_REPORT — Learning Tutor explain_wrong_answer (Desktop)

## Summary

Implemented the learner-safe wrong-answer contract and wired `learning.tutor.explain_wrong_answer@1.0.0` through `aiService.runCapability` on branch `office/learning-ai-tutor-backend-foundation-v1`. Server-side only. No UI. No new migration. No commit/push pending review of this report.

## Exact files changed

### Created
- `lib/ai/capabilities/learning/wrongAnswerContract.ts`
- `lib/ai/capabilities/learning/wrongAnswerContract.test.ts`

### Modified
- `lib/ai/capabilities/learning/tutorRunner.ts`
- `lib/ai/capabilities/learning/prompts.ts`
- `lib/ai/capabilities/learning/safety.ts`
- `lib/ai/capabilities/learning/learningTutor.test.ts`
- `lib/ai/services/aiService.ts`
- `lib/ai/contracts/public.ts`
- `lib/ai/contracts/learningTutor.ts`
- `lib/ai/providers/adapters.ts`
- `docs/ai/workstreams/AI_PLATFORM.md`

## Migrations created

None. Reuses existing owner-scoped Learning RPCs + Shared AI Core `20260871` (still local-only / not remote-applied).

## Security review

- Unauthenticated → rejected.
- Unauthorized course access → `permission_denied`.
- Non-owner attempt → `permission_denied`.
- Unreleased results (`visibility !== available`) → fail-closed.
- Missing incorrect released grade / missing answer / missing stem → fail-closed.
- Grade/answer payloads with `answer_key` (and related forbidden keys) rejected.
- Output must set `revealsAnswerKey: false`; key-like structured fields blocked.
- No progress/grade mutation; no answer-key tables; no UI wiring.

## Tests

```
npx vitest run lib/ai/capabilities/learning/wrongAnswerContract.test.ts \
  lib/ai/capabilities/learning/learningTutor.test.ts \
  lib/ai/architectureBoundary.test.ts
```

Result: **35 passed** (16 contract/capability + 14 tutor + 5 architecture).

## TypeScript

`npx tsc --noEmit` → **PASS**

## Build

Not run (no app UI/entry-point change; backend AI + docs only).

## git diff --check

**PASS** (scoped to `lib/ai` + `docs/ai/workstreams/AI_PLATFORM.md`)

## git status --short

Scoped AI changes only (unrelated Learning/Nexus dirty tree left untouched):

```
 M docs/ai/workstreams/AI_PLATFORM.md
 M lib/ai/capabilities/learning/learningTutor.test.ts
 M lib/ai/capabilities/learning/prompts.ts
 M lib/ai/capabilities/learning/safety.ts
 M lib/ai/capabilities/learning/tutorRunner.ts
 M lib/ai/contracts/learningTutor.ts
 M lib/ai/contracts/public.ts
 M lib/ai/providers/adapters.ts
 M lib/ai/services/aiService.ts
?? lib/ai/capabilities/learning/wrongAnswerContract.test.ts
?? lib/ai/capabilities/learning/wrongAnswerContract.ts
```

## Open issues

- Awaiting review approval before commit/push.
- Laptop still owns any future UI wiring to `attemptId` + `questionId`.
- Unrelated local dirty Learning/Nexus/shell files remain unstaged on purpose.
