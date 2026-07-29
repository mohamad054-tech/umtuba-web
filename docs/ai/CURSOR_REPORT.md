# CURSOR_REPORT — Learning Tutor give_hint backend

## Summary

Implemented **`learning.tutor.give_hint`** on `office/learning-ai-tutor-backend-foundation-v1` as the next dependency-correct backend capability after wrong-answer explanation / integration / server actions. No UI. No merge to alpha. No commit/push pending explicit GO.

## Exact files changed

- `lib/ai/contracts/learningTutor.ts`
- `lib/ai/contracts/public.ts`
- `lib/ai/contracts/learningTutorIntegration.ts`
- `lib/ai/contracts/learningTutorServerActions.ts`
- `lib/ai/capabilities/learning/prompts.ts`
- `lib/ai/capabilities/learning/safety.ts`
- `lib/ai/capabilities/learning/tutorRunner.ts`
- `lib/ai/capabilities/learning/learningTutor.test.ts`
- `lib/ai/services/learningTutorIntegration.ts`
- `lib/ai/services/learningTutorIntegration.test.ts`
- `lib/ai/services/learningTutorServerActions.ts`
- `lib/ai/services/learningTutorServerActions.test.ts`
- `lib/ai/services/aiService.ts`
- `lib/ai/providers/adapters.ts`
- `lib/ai/index.ts`
- `app/actions/learningTutor.ts` (named server action only — no UI)
- `docs/ai/workstreams/AI_PLATFORM.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Fail-closed: `revealsAnswerKey` must be false; blocks answerKey/correctAnswer/fullAnswer fields
- Requires `labeledAiGenerated: true`
- hintLevel restricted to gentle|moderate|strong
- Still routes through integration → aiService → tutorRunner → gateway
- No progress/grade mutation flags

## Tests

Focused Learning Tutor backend Vitest: **54/54 passed**
- `learningTutor.test.ts` — 16
- `wrongAnswerContract.test.ts` — 16
- `learningTutorIntegration.test.ts` — 15
- `learningTutorServerActions.test.ts` — 7

## TypeScript

`npx tsc --noEmit`: **passed** (exit 0) after removing broken dead exports to missing Provider Foundation modules (pre-existing incomplete index exports on this branch).

## Build

**Skipped intentionally** — this laptop is backend-only; no `npm run build` / Next.js production build.

## Open issues

- Commit/push only on explicit GO
- Do not merge into alpha from this laptop
- Optional next: `explain_again`
