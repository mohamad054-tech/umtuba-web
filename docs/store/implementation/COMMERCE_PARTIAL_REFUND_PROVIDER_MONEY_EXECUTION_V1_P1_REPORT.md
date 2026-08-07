> **P5C2 supersession (2026-08-07):** Active Commerce draft is now **`20260915`**. Do **not** use `20260914` (Translation reserved: `translation_studio_memory_identity_contract_align_v1` on `origin/office/platform-translation-trunk-port-v1`). Rejected also: Learning `20260908`/`20260909`. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C2_ALLOCATION_REPORT.md`.

> **P5C supersession (2026-08-07):** Active Commerce draft is now **`20260914`**. Remote **`20260908`** remains Learning (`learning_personal_notes_hub_v1`); remote **`20260909`** remains Learning (`learning_assessment_due_ux_followthrough_v1`). Do not treat either as the active Commerce migration version. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C_RENUMBER_REPORT.md`.

> **P5A supersession (2026-08-07):** Final local draft is **`20260909_store_partial_refund_provider_money_execution_v1.sql`**. Historical P1 choice `20260908` was later rejected after Learning claimed remote `20260908`.
# COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P1_REPORT

**Verdict:** `P1_READY_FOR_P2`

---

## Setup

| Item | Value |
| --- | --- |
| worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| HEAD | `b8be33469f35c5ccb394925d666a5812f4c70c70` (+ uncommitted P1 work; no commit) |

---

## Migration collision audit

| Source | Finding |
| --- | --- |
| Local Git / this worktree | No `20260908` / `20260909` files before P1 |
| Other Commerce worktrees scanned | Tip at `20260907` compensate; no `20260908` |
| Origin branch file history | No `20260908*` added |
| Remote `schema_migrations` (`tgucwnjwoyeqoxqaxmew`, read-only query) | Present: `20260900,01,02,05,06,07,10,11,12`. **Absent: `20260908`, `20260909`** |

**Chosen migration version (historical P1; superseded by P5A):** `20260908` → **`20260909`**  
**Filename:** `supabase/migrations/20260909_store_partial_refund_provider_money_execution_v1.sql`  
**Remote apply:** **not performed**

---

## Execution schema / status model

Table: `store_partial_refund_provider_executions`

Statuses: `planned` → `executing` → `succeeded` | `failed` | `uncertain`  
(`uncertain` → `succeeded` | `failed` via recovery only)

Key constraints:

- `unique (store_id, idempotency_key)`
- unique open/succeeded per `ledger_id`
- unique succeeded per `ledger_id`
- `trusted_amount_minor > 0`
- currency 3-letter upper
- service_role EXECUTE only on claim/update/get RPCs

---

## Exact files added / modified

**Added**

- `supabase/migrations/20260909_store_partial_refund_provider_money_execution_v1.sql`
- `lib/store/partialRefundProviderMoneyExecution/` (capability, gate, idempotency, types, validate, stateMachine, providerPort, stripeAdapter, repository, memoryRepository, orchestrator, readiness, index, tests)
- `app/actions/storePartialRefundProviderMoneyExecution.ts`
- `app/admin/store/refunds/PartialRefundProviderMoneyReadinessPanel.tsx`
- `docs/store/implementation/PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1.md`
- (from P0) `docs/store/implementation/COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P0_AUDIT_REPORT.md`

**Modified**

- `lib/store/stripeApi.ts` — `createStripeRefund` / `retrieveStripeRefund`
- `app/admin/store/refunds/page.tsx` — readiness panel wiring
- `docs/ai/CURRENT_TASK.md`, `CURSOR_REPORT.md`, `PROJECT_STATE.md`

---

## Provider port design

`PartialRefundProviderPort`:

- `submitPartialRefund({ providerPaymentRef, amountMinor, currency, idempotencyKey })`
- `lookupPartialRefund({ providerRefundId?, providerPaymentRef?, idempotencyKey })`

Outcome kinds: `succeeded` | `failed` | `uncertain` (timeout/network/ambiguous never collapsed to failed).

---

## Stripe adapter design

`createStripePartialRefundProviderPort` uses existing `stripeConfig` + new `stripeApi` refund helpers.

- Refund against PaymentIntent (`pi_…`)
- Integer minor amount
- `Idempotency-Key = prf-prov:{ledgerId}`
- Safe field normalization; no secret persistence
- No status / 5xx / network → `uncertain`; definitive 4xx → `failed`
- Pending/unknown Stripe status → `uncertain`

---

## Gate design + default state

Dedicated env: `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ENABLED` (**default OFF**)  
ACK: `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK` = `I_UNDERSTAND_PARTIAL_REFUND_PROVIDER_MONEY_MOVES_REAL_FUNDS`  
Non-prod fixture token required when flag on outside production.

Execution requires **both** dedicated gate **and** Stripe config readiness.

---

## Orchestration lifecycle

```
committed ledger facts
  → validate ownership / amount / currency / pi_ ref
  → dual-gate check (fail closed; no provider call)
  → claim idempotent execution (prf-prov:{ledgerId})
  → if succeeded: replay, providerCalled=false
  → if uncertain|executing: recovery_required, no blind resubmit
  → planned → executing → provider submit once
  → persist succeeded | failed | uncertain
```

Recovery helper: `recoverPartialRefundProviderMoneyLookup` (retrieve by `re_…` only in P1; no new key).

---

## Idempotency behavior

- Key source: `prf-prov:{ledgerId}`
- Same key to Stripe
- Duplicate submit after success: replay, no second call
- Uncertain: block resubmit on execute path

---

## Uncertain-outcome behavior

- Persist `uncertain`
- Return `recovery_required` on re-execute
- **Never** auto-compensate
- **Never** mint new idempotency key

---

## Money correctness invariants

- Positive integer minor units only
- Currency exact match (ledger ↔ provider)
- Amount must equal committed ledger `refundAmountMinor`
- No floating-point math
- Missing/invalid `pi_` rejected
- Provider amount/currency mismatch → `uncertain` (not silent success)
- Duplicate success prevented by unique constraints + orchestration replay

---

## Explicit ownership boundaries

Owns: provider money execution gate, persistence, orchestration, Stripe refund adapter.  
Does **not** own: ledger `committed` meaning, auto-compensation on uncertain, restock, entitlement, settlement, commission, payout, Sync partial, `commerce_confirm`.

---

## Admin scaffolding

- Readiness panel on `/admin/store/refunds` (status only; no submit control)
- `adminGetPartialRefundProviderMoneyReadinessAction`
- `adminExecutePartialRefundProviderMoneyAction` always redirects with hard-disable message (`live_clickable_flow_disabled`) even if gates on

---

## Tests added

`lib/store/partialRefundProviderMoneyExecution/partialRefundProviderMoneyExecution.test.ts` (24 tests): gates, adapter, orchestration, migration/ownership contracts.

---

## Tests run + exact pass counts

```
Test Files  12 passed (12)
     Tests  145 passed (145)
```

Suites: provider money P1 + partialRefundLedger + committedCompensation + reservation (+ accounting) + livePaymentCaptureAdapter + livePaymentProductionGate.

---

## TypeScript

PASS — `npx tsc --noEmit`

## git diff --check

PASS

## secret scan

PASS (no unexpected secret material in changed/untracked files)

## git diff --stat

Tracked modifications (untracked not in diff --stat):

```
 app/admin/store/refunds/page.tsx |  5 ++++
 docs/ai/CURRENT_TASK.md          | …
 docs/ai/CURSOR_REPORT.md         | …
 docs/ai/PROJECT_STATE.md         | …
 lib/store/stripeApi.ts           | 51 ++++++++++++++++++++++++++++++++++++++++
```

Plus untracked module/migration/action/panel/docs (see status).

## git status --short

Dirty working tree with P1 files; **no commit**; **no push**.

---

## Blockers

None for P2 foundation planning. Remaining product gaps (not P1 blockers):

- Service-role repository adapter to real RPCs (P1 uses memory repo in tests; SQL draft ready)
- Trusted PI resolution from `payment_attempts` / capture outcomes (caller must pass `pi_…` today)
- Recovery UX for uncertain rows
- Remote apply + gate enablement require separate GOs

---

## Exact recommended P2 deliverable only

**P2 — Service-role execution repository + trusted PaymentIntent resolution + recovery admin surface (still gate-default-OFF; no remote apply; no live money):**

1. Wire `PartialRefundProviderExecutionRepository` to the `20260909` service_role RPCs.  
2. Server-side resolve authoritative Stripe `pi_…` from trusted payment attempt / capture facts (reject session-only refs).  
3. Admin recovery action for `uncertain`/`executing` via lookup (still hard-fail closed when gates OFF).  
4. Contract tests for RPC mapping + PI resolution + recovery; still no Sync/restock/settlement/commission/payout.  

**STOP — do not remote-apply, commit, push, or enable gates without a new GO.**
