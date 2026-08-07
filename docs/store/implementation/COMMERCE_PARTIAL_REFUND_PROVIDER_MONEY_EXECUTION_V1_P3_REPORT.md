> **P5C2 supersession (2026-08-07):** Active Commerce draft is now **`20260915`**. Do **not** use `20260914` (Translation reserved: `translation_studio_memory_identity_contract_align_v1` on `origin/office/platform-translation-trunk-port-v1`). Rejected also: Learning `20260908`/`20260909`. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C2_ALLOCATION_REPORT.md`.

> **P5C supersession (2026-08-07):** Active Commerce draft is now **`20260914`**. Remote **`20260908`** remains Learning (`learning_personal_notes_hub_v1`); remote **`20260909`** remains Learning (`learning_assessment_due_ux_followthrough_v1`). Do not treat either as the active Commerce migration version. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C_RENUMBER_REPORT.md`.

> **P5A supersession (2026-08-07):** Migration draft is now **`20260909`**. Remote-apply planning must use `20260909`, not rejected Learning-owned `20260908`.
# COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P3_REPORT

**Verdict:** `P3_READY_FOR_P4`

---

## Setup

| Item | Value |
| --- | --- |
| worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| HEAD | `b8be33469f35c5ccb394925d666a5812f4c70c70` (+ uncommitted P1–P3; no commit) |

---

## Migration collision recheck

| Item | Value |
| --- | --- |
| filename | `supabase/migrations/20260909_store_partial_refund_provider_money_execution_v1.sql` |
| P3 change | **None** (continued existing local draft) |
| remote apply | **not performed** |

---

## Exact files added / modified

**Added (P3-focused):**
- `executionMode.ts`, `operatorAck.ts`, `failedRetryPolicy.ts`, `eligibility.ts`, `executeCandidates.ts`, `adminExecuteService.ts`
- `partialRefundProviderMoneyExecution.p3.test.ts`
- `PartialRefundProviderMoneyExecutePanel.tsx`
- `PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P3_RUNBOOK.md`
- this P3 report

**Modified:**
- `orchestrator.ts` (execution-mode on submit path; V1 failed retry message)
- `readiness.ts` (remove hard-disable; expose execution mode)
- `index.ts` exports
- `app/actions/storePartialRefundProviderMoneyExecution.ts` (real fail-closed execute)
- readiness/recovery panels, refunds `page.tsx`
- P1/P2 tests (`gateOnEnv` includes `EXECUTION_MODE=test`)
- docs (`CURRENT_TASK`, `CURSOR_REPORT`, `PROJECT_STATE`, impl note)

---

## Production execute action design

`adminExecutePartialRefundProviderMoneyAction`
→ platform admin authz
→ `assertAdminProviderMoneyExecuteAllowed` (dual gate + execution mode)
→ service-role ledger + execution repos
→ `runAdminExecutePartialRefundProviderMoney`
→ `executeCommittedPartialRefundProviderMoney` (trusted PI resolver)

Any form/query `pi_` / provider ref fields are ignored/rejected.

---

## Admin authz model

- Authenticated user required
- `assertPlatformAdminDb` only
- Service-role backends for ledger + execution persistence
- Store ownership via `expectedStoreId` vs ledger.store_id

---

## Dual-gate + execution-mode design

First-time submit requires **all**:

1. Dedicated gate (`UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ENABLED` + ACK + non-prod fixture when needed)
2. Stripe config readiness
3. Execution mode (`UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE`):
   - default / empty → `off`
   - ambiguous truthy (`1`/`true`/`yes`) → **invalid → off**
   - `test` → Stripe test mode only
   - `production` → production app env + production exec ACK + Stripe live

---

## Explicit ACK contract

Per-request field `operatorMoneyAck` must equal exactly:
`I_ACKNOWLEDGE_THIS_MAY_MOVE_PROVIDER_MONEY`

Distinct from env gate ACK and production execution-mode ACK. Missing/invalid → zero submit.

---

## UI eligibility model

`PartialRefundProviderMoneyExecutePanel` classifies:
- eligible to execute
- execution disabled by gate/mode
- recovery required
- already succeeded
- prior failed (no V1 retry)
- unsupported/missing provider reference
- ledger not committed

Execute form (reason + ACK) only when `eligibleToExecute`.

---

## First-submit lifecycle

Reload ledger → committed check → gates/mode/ACK → trusted PI → claim `prf-prov:{ledgerId}` → inspect state → planned→executing→submit once → succeeded|failed|uncertain.

---

## Failed-execution retry policy

**V1 = `no_retry`.** Confirmed provider failure is terminal. No automatic retry; no admin same-key retry. Future reopen is a separate milestone.

---

## Idempotency behavior

Key `prf-prov:{ledgerId}` end-to-end. Succeeded replay → zero submit. Never mint a new key.

---

## Uncertain / executing behavior

Both → `recovery_required`, **zero submit**. Use lookup recovery path.

---

## Trusted provider-reference behavior

Resolver from capture/attempt facts only. Client `pi_…` rejected. Orchestrator production path always resolves server-side.

---

## Test / sandbox policy

- `execution_mode=test` + Stripe test config for fixture/mock path
- P3 validation uses mocks only — **no real Stripe refund**
- No real card/customer data

---

## Exact proof gates/ACK failures cause zero submit

P3 tests assert `submit` mock `not.toHaveBeenCalled()` for:
- dedicated gate OFF
- execution mode OFF
- Stripe readiness missing
- ACK missing
- invalid operator reason
- store mismatch
- client-supplied `pi_`

---

## Tests added

`partialRefundProviderMoneyExecution.p3.test.ts` (21)

## Tests run + exact pass counts

```
Test Files  14 passed (14)
     Tests  184 passed (184)
```

## TypeScript

PASS — `npx tsc --noEmit`

## git diff --check

PASS

## secret scan

PASS — no real secrets; fixture `sk_test_` / placeholder `sk_live_…V1LiveKeyXX` / `whsec_testplaceholderonly` in tests only

## Forbidden ownership proof

Execute success payloads include `PROVIDER_MONEY_NON_EVENTS` (no compensation/restock/entitlement/settlement/commission/payout/Sync/`commerce_confirm`). Action does not call compensation services.

## git diff --stat

```
 app/admin/store/refunds/page.tsx | 174 +++++++++++++++++++++++++++++++++++++++
 docs/ai/CURRENT_TASK.md          |  42 +++++++---
 docs/ai/CURSOR_REPORT.md         |  39 +++++----
 docs/ai/PROJECT_STATE.md         |   3 +-
 lib/store/stripeApi.ts           |  51 ++++++++++++
 5 files changed, 286 insertions(+), 23 deletions(-)
```

(+ untracked module/panels/migration/docs)

## git status --short

```
 M app/admin/store/refunds/page.tsx
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
 M docs/ai/PROJECT_STATE.md
 M lib/store/stripeApi.ts
?? app/actions/storePartialRefundProviderMoneyExecution.ts
?? app/admin/store/refunds/PartialRefundProviderMoneyExecutePanel.tsx
?? app/admin/store/refunds/PartialRefundProviderMoneyReadinessPanel.tsx
?? app/admin/store/refunds/PartialRefundProviderMoneyRecoveryPanel.tsx
?? docs/store/implementation/COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P0_AUDIT_REPORT.md
?? docs/store/implementation/COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P1_REPORT.md
?? docs/store/implementation/COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P2_REPORT.md
?? docs/store/implementation/PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1.md
?? docs/store/implementation/PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P3_RUNBOOK.md
?? lib/store/partialRefundProviderMoneyExecution/
?? supabase/migrations/20260909_store_partial_refund_provider_money_execution_v1.sql
```

(+ P3 report file once written)

---

## Blockers

None for P4 planning.

---

## Exact recommended P4 deliverable only

**P4 — Remote-apply readiness + controlled test-mode dry-run checklist (still no production enablement by default):**

1. Collision/preflight pack for remote-applying `20260909` only under a separate explicit GO.  
2. Operator checklist for non-production `execution_mode=test` dry-run against isolated Stripe test fixtures (still no live keys).  
3. Observability: safe admin audit of submit vs recovery outcomes and idempotency key.  
4. Explicit production enablement remains a later GO — P4 must not flip production execution mode or dedicated gate on live hosts.

**STOP — do not remote-apply, commit, push, or enable production money without a new GO.**
