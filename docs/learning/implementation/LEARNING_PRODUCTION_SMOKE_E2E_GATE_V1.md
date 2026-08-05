# Learning Production Smoke & E2E Gate V1

Capability: `learning.ops.production_smoke_e2e_gate_v1`  
Base tip: AI Tutor thread lesson-binding V1 (`1be73f2`)  
Branch: `office/learning-production-smoke-e2e-gate-v1`

## Purpose

Repository-grounded **production smoke / typecheck gate** on the Learning tutor-binding tip:

1. Isolated worktree/branch from the exact base commit
2. `npx tsc --noEmit` PASS (contract gate)
3. Learning-scoped smoke inventory of critical foundations
4. No migration apply, no protected SoT merge

## Gate commands

```bash
npx tsc --noEmit
npx vitest run lib/learning/productionSmokeE2eGate.test.ts
```

## Out of scope

- Commerce / Stripe / Store
- Collaboration workspace platform enablement
- Migration apply / `supabase db push`
- Force push / reset --hard / rebase / git clean

## Safety

- Fail closed on typecheck errors
- No secrets in this document
- Scope limited to `lib/learning/**`, `e2e/learning/**`, `docs/learning/**`, `scripts/learning-e2e/**`
