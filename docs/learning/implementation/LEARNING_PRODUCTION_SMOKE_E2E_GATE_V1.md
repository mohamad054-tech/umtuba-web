# Learning Production Smoke & E2E Gate V1

Capability: `learning.ops.production_smoke_e2e_gate_v1`
Base tip: Learning SoT resume/composite tip (`15b1d7b`)
Branch: `office/learning-production-smoke-e2e-gate-onto-sot-v1`
Historical source: `6e74333` (production smoke gate on tutor-binding tip)

## Purpose

Repository-grounded **production smoke / typecheck gate** on the current Learning Source of Truth:

1. Isolated worktree/branch from the exact SoT tip
2. `npx tsc --noEmit` PASS (contract gate)
3. Learning-scoped smoke inventory of critical foundations (retargeted to SoT)
4. No migration apply, no protected SoT merge, no real browser E2E runners

## Inventory coverage (SoT)

- Lesson delivery — `lib/learning/learnerDelivery.ts`
- Lesson engine access composition — `lib/learning/lessonEngineFoundation.ts`
- Unlock fail-closed — `lib/learning/lessonUnlockFoundation.ts`
- Resume-accessible target validation — `lib/learning/learnerDelivery.ts` (+ delivery tests)
- Courses and lessons — `coursesFoundation.ts`, `lessonsFoundation.ts`
- Enrollment and progress — `enrollmentsFoundation.ts`, `progressFoundation.ts`
- Assessments / completion — `assessmentDelivery.ts`, `completionFoundation.ts`

## Gate commands

```bash
npx tsc --noEmit
npx vitest run lib/learning/productionSmokeE2eGate.test.ts
npx vitest run \
  lib/learning/lessonContentAccess.test.ts \
  lib/learning/lessonEngineFoundation.test.ts \
  lib/learning/learnerDelivery.test.ts \
  lib/learning/lessonUnlockFoundation.test.ts
```

## Out of scope

- Commerce / Stripe / Store
- Collaboration workspace platform enablement
- AI Platform / Guardian / Mobile / infrastructure
- Migration apply / `supabase db push`
- Real browser E2E runners under `e2e/`
- Force push / reset --hard / rebase / git clean
- Learning business behavior changes

## Safety

- Fail closed on typecheck / inventory miss
- Additive only — no product flag flips, no migrations
- No secrets in this document
- Scope limited to `lib/learning/**` and `docs/learning/**` for this port
