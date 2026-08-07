> **P5C2 supersession (2026-08-07):** Active Commerce draft is now **`20260915`**. Do **not** use `20260914` (Translation reserved: `translation_studio_memory_identity_contract_align_v1` on `origin/office/platform-translation-trunk-port-v1`). Rejected also: Learning `20260908`/`20260909`. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C2_ALLOCATION_REPORT.md`.

> **P5C supersession (2026-08-07):** Active Commerce draft is now **`20260914`**. Remote **`20260908`** remains Learning (`learning_personal_notes_hub_v1`); remote **`20260909`** remains Learning (`learning_assessment_due_ux_followthrough_v1`). Do not treat either as the active Commerce migration version. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C_RENUMBER_REPORT.md`.

> **P5A supersession (2026-08-07):** Migration draft is now **`20260909`**. References below to Commerce owning `20260908` are historical and superseded.
# COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P2_REPORT

**Verdict:** `P2_READY_FOR_P3`

---

## Setup

| Item | Value |
| --- | --- |
| worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| HEAD | `b8be33469f35c5ccb394925d666a5812f4c70c70` (+ uncommitted P1+P2; no commit) |

---

## Migration version / collision recheck

| Item | Value |
| --- | --- |
| filename | `supabase/migrations/20260909_store_partial_refund_provider_money_execution_v1.sql` |
| version | **`20260909`** (P5A renumber; same SQL draft as P2-amended) |
| remote recheck | `schema_migrations` query for `20260908`/`20260909` → **empty** (still free) |
| remote apply | **not performed** |

### P2 schema/RPC additions (same file)

- `service_get_store_partial_refund_provider_execution(uuid)`
- `service_list_store_partial_refund_provider_executions(uuid, text, int)`
- Explicit terminal-success immutability on update (`succeeded` cannot downgrade)

---

## Repository design

`ServiceRolePartialRefundProviderExecutionRepository` over injected RPC port (service_role only).

### Exact RPC / repository operations

| Operation | RPC | Behavior |
| --- | --- | --- |
| claim | `service_claim_store_partial_refund_provider_execution` | Idempotent create/replay |
| update | `service_update_store_partial_refund_provider_execution` | planned→executing→succeeded\|failed\|uncertain; lookup touch |
| getByLedger | `…_by_ledger` | Prefer open/succeeded row |
| getByIdempotency | `…_by_idempotency` | Exact key |
| getById | `service_get_store_partial_refund_provider_execution` | By execution id |
| list | `service_list_store_partial_refund_provider_executions` | Admin review |

Fail-closed parse via `rpcParse.ts`. Memory repository retained for unit tests.

---

## Trusted PaymentIntent / reference resolution

**Source (priority):**

1. `store_payment_outcome_events.provider_reference` when `pi_…` and outcome=`captured`
2. Else parse `event_key` `stripe:(pi_…):captured`
3. Else `payment_attempts.provider_reference` when `pi_…`

**Ownership validation:** order.store_id, attempt.order_id, capture.payment_attempt_id/order_id, provider=`stripe`, outcome=`captured`.

**Client `pi_…`:** rejected (`clientProviderPaymentRef` fail-closed).

Production path: `executeCommittedPartialRefundProviderMoney` always resolves via this helper.

---

## Uncertain recovery lifecycle

```
uncertain | stale executing
  → Stripe-config gate only (no dedicated submit gate)
  → LOOKUP ONLY (lookupPartialRefund)
  → succeeded | failed | remain uncertain
```

`providerSubmitCalled: false` always on recovery result.

---

## Crash-window / stale executing

- Any `executing` on re-execute → `recovery_required` (**no submit**)
- Fresh executing (< `PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS` = 60s): recovery action returns `recovery_required` without lookup
- Stale executing (≥ 60s): eligible for lookup recovery
- Same idempotency key preserved (`prf-prov:{ledgerId}`)

---

## Admin recovery surface / action

- Panel: `PartialRefundProviderMoneyRecoveryPanel` on `/admin/store/refunds`
- Shows status, ledger/order, amount/currency, provider kind, refund ref, last lookup, failure code, recovery-required
- Action: `adminRecoverPartialRefundProviderMoneyLookupAction` — platform admin + service-role repo + lookup only
- First-time execute action remains hard-disabled (`live_clickable_flow_disabled`)

---

## Gate behavior

| Path | Dedicated money gate | Stripe config |
| --- | --- | --- |
| First-time submit | Required (default OFF) + UI hard-disabled | Required |
| Recovery lookup | **Not required** (no money move) | Required |

---

## Exact files added / modified

**Added (P2-focused):** `rpcContracts.ts`, `rpcParse.ts`, `serviceRoleRepository.ts`, `serviceRoleBootstrap.ts`, `resolveTrustedPaymentIntent.ts`, `staleExecuting.ts`, `recoveryService.ts`, `partialRefundProviderMoneyExecution.p2.test.ts`, `PartialRefundProviderMoneyRecoveryPanel.tsx`, P2 report.

**Modified:** `20260909` migration, `orchestrator.ts`, `repository.ts`, `memoryRepository.ts`, `index.ts`, admin actions, refunds `page.tsx`, docs.

---

## Tests

Added: `partialRefundProviderMoneyExecution.p2.test.ts` (17).

### Tests run + pass counts

```
Test Files  13 passed (13)
     Tests  162 passed (162)
```

## TypeScript

PASS — `npx tsc --noEmit`

## git diff --check

PASS

## secret scan

PASS

## Explicit proof recovery never submits

P2 tests assert `submit` mock `not.toHaveBeenCalled()` across uncertain→succeeded/failed/uncertain and stale-executing recovery; recovery result includes `providerSubmitCalled: false`.

## Explicit forbidden ownership boundaries

No auto-compensation; no restock/entitlement/settlement/commission/payout; no Sync partial; no `commerce_confirm`; no first-time live execute enablement.

## git diff --stat

```
 app/admin/store/refunds/page.tsx | 52 ++++++++++++++++++++++++++++++++++++++++
 docs/ai/CURRENT_TASK.md          | 42 ++++++++++++++++++++++++--------
 docs/ai/CURSOR_REPORT.md         | 25 +++++++++----------
 docs/ai/PROJECT_STATE.md         |  3 ++-
 lib/store/stripeApi.ts           | 51 +++++++++++++++++++++++++++++++++++++++
 5 files changed, 150 insertions(+), 23 deletions(-)
```

Plus untracked: `lib/store/partialRefundProviderMoneyExecution/*`, migration `20260909`, admin actions/panels, P0/P1/P2 docs.

## git status --short

```
 M app/admin/store/refunds/page.tsx
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
 M docs/ai/PROJECT_STATE.md
 M lib/store/stripeApi.ts
?? app/actions/storePartialRefundProviderMoneyExecution.ts
?? app/admin/store/refunds/PartialRefundProviderMoneyReadinessPanel.tsx
?? app/admin/store/refunds/PartialRefundProviderMoneyRecoveryPanel.tsx
?? docs/store/implementation/COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P0_AUDIT_REPORT.md
?? docs/store/implementation/COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P1_REPORT.md
?? docs/store/implementation/COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P2_REPORT.md
?? docs/store/implementation/PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1.md
?? lib/store/partialRefundProviderMoneyExecution/
?? supabase/migrations/20260909_store_partial_refund_provider_money_execution_v1.sql
```

Dirty P1+P2 working tree; **no commit; no push**.

---

## Blockers

None for P3 planning.

---

## Exact recommended P3 deliverable only

**P3 — Controlled first-time execute enablement prep (still no remote apply / no live money by default):**

1. Wire production execute action behind dual gates + trusted PI resolver (remove hard-disable only when gates satisfied and explicit env allowlist).  
2. Admin execute UI still fail-closed unless dual gates + ACK + non-prod fixture rules pass.  
3. End-to-end contract tests proving: gates OFF → zero submit; gates ON (fixture) → one submit with `prf-prov:{ledgerId}`; uncertain path never double-submits.  
4. Docs/runbook for test-mode only; **no** remote apply; **no** production gate enablement without a separate GO.

**STOP — do not remote-apply, commit, push, or enable live money without a new GO.**
