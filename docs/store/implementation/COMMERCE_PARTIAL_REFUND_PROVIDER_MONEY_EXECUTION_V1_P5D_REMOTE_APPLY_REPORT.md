# COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5D_REMOTE_APPLY_REPORT

**Verdict:** `REMOTE_APPLY_20260915_VERIFIED_READY_FOR_P6`

**Milestone NOT CLOSED.** Provider-money gates remain OFF. No Stripe/network money action. No commit/push.

---

## Setup

| Item | Value |
| --- | --- |
| worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| HEAD | `b8be33469f35c5ccb394925d666a5812f4c70c70` |
| project ref | `tgucwnjwoyeqoxqaxmew` |
| migration | `supabase/migrations/20260915_store_partial_refund_provider_money_execution_v1.sql` |
| SHA256 (LF) | `68E24761F4357E0516FD4D0F1BF7ADFA0EDE259F4EAEA52351C99BA81B555273` (**MATCH**) |

---

## Just-in-time allocation scan

| Check | Result |
| --- | --- |
| remote `20260915` count | **0** before apply |
| origin `20260915_*` | none |
| worktree `20260915_*` | only this Commerce draft |
| external CURRENT_TASK claim | none |
| provider table absent | PASS (`NULL`) |
| provider RPCs absent | PASS (`0`) |
| ledger prerequisite | PASS |
| neighbors | Learning `08`/`09`; Translation `10–14` (incl. remote `20260914` Translation memory identity) |
| project ref / SHA / HEAD | PASS |

---

## Exact apply command

```text
npx supabase --workdir C:\Users\1\Desktop\umtuba\umtuba-web-commerce-remote-migration-preflight-v1-current db query --linked -f C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1\supabase\migrations\20260915_store_partial_refund_provider_money_execution_v1.sql
```

**Apply result:** exit `0`; empty rows JSON boundary response (DDL apply OK).

---

## Table / schema verification

`public.store_partial_refund_provider_executions` present with columns:
`id`, `store_id`, `ledger_id`, `order_id`, `payment_attempt_id`, `capture_event_id`, `provider_kind`, `provider_payment_ref`, `trusted_amount_minor`, `currency`, `idempotency_key`, `status`, `provider_refund_id`, `provider_status_safe`, `failure_code`, `failure_message_safe`, `operator_user_id`, `operator_reason_safe`, `started_at`, `completed_at`, `last_lookup_at`, `created_at`, `updated_at`.

**Status model:** `planned` \| `executing` \| `succeeded` \| `failed` \| `uncertain`

**Constraints (verified):** amount `> 0`; currency 3-char upper; idempotency unique `(store_id, idempotency_key)`; open/succeeded ledger uniqueness; succeeded-ledger unique; status check; payment/refund ref masks.

**Transition:** `succeeded → failed = false`; `uncertain → failed = true` (uncertain distinct).

---

## RPC verification

All 6 service RPCs present, `SECURITY DEFINER`, `search_path=public`, return `jsonb`:

| RPC | Args (identity) |
| --- | --- |
| claim | store/ledger/order/payment/capture + provider fields + idempotency + operator |
| update | execution_id + to_status + provider/failure fields + touch_lookup |
| get by ledger | ledger_id |
| get by idempotency | store_id + idempotency_key |
| get by id | execution_id |
| list | store_id + status + limit |

Helper `store_partial_refund_provider_exec_transition_allowed` is immutable SQL (not definer) — service_role execute only (by design).

**Grants:** service_role (+ postgres owner) EXECUTE only. anon/authenticated EXECUTE count `0`.  
**Table grants:** service_role + postgres only (no anon/authenticated).  
**RLS:** enabled + forced; policy count `0` (no client mutation policies).  
**Secret columns:** none.

---

## Safe fail-closed checks

| Check | Result |
| --- | --- |
| list empty store UUID | `ok:true`, `executions:[]` |
| get null id | raises `malformed_id` (fail-closed) |
| get missing UUID | `ok:true`, `execution:null` |
| table row count | `0` |
| Stripe submit/lookup | **NOT performed** |

---

## Migration repair

First attempt failed: `LegacyMigrationFileNotFoundError` (file absent in linked preflight WT).

Remediation (local only): temporary copy of SQL into preflight `supabase/migrations/`, then:

```text
npx supabase --workdir <preflight> migration repair --linked --status applied 20260915
```

**Result:** exit `0` — `Repaired migration history: [20260915] => applied`  
Temp copy removed immediately after (not left in preflight WT).

### Final schema_migrations

| version | name |
| --- | --- |
| 20260908 | learning_personal_notes_hub_v1 |
| 20260909 | learning_assessment_due_ux_followthrough_v1 |
| 20260910–13 | Translation studio chain |
| 20260914 | translation_studio_memory_identity_contract_align_v1 |
| **20260915** | **store_partial_refund_provider_money_execution_v1** (exactly one row) |

Post-repair: table present; 6 service RPCs; anon RPC grants `0`.

---

## Gate / mode

- `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ENABLED` default **OFF** (code; env unchanged)
- `UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE` default **`off`** (code; env unchanged)
- No test/production execution performed

**NO Stripe submit/lookup/network money call** — CONFIRMED

---

## Local validation

| Check | Result |
| --- | --- |
| vitest | Test Files **18** passed / Tests **235** passed |
| `npx tsc --noEmit` | PASS |
| `git diff --check` | PASS (CRLF warnings only) |
| secret scan | PASS |

---

## Docs changed

- this P5D report
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/store/implementation/PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1.md`

---

## Explicit confirmation

**NO commit / NO push / NO production enablement / NO money movement**  
**NO** auto-compensation / restock / entitlement / settlement / commission / payout / Sync / `commerce_confirm`

## Exact recommended P6 deliverable only

**P6 — Isolated test-mode dry-run checklist execution** under explicit GO: enable dedicated gate + execution mode `test` only in an isolated env, operator ACK, one controlled test-mode provider refund path with post-run gate OFF — still no production mode / no live money / no auto-compensation.

**STOP.**
