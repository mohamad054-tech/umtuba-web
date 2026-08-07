> **P5C2 supersession (2026-08-07):** Active Commerce draft is now **`20260915`**. Do **not** use `20260914` (Translation reserved: `translation_studio_memory_identity_contract_align_v1` on `origin/office/platform-translation-trunk-port-v1`). Rejected also: Learning `20260908`/`20260909`. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C2_ALLOCATION_REPORT.md`.

> **P5C supersession (2026-08-07):** Active Commerce draft is now **`20260914`**. Remote **`20260908`** remains Learning (`learning_personal_notes_hub_v1`); remote **`20260909`** remains Learning (`learning_assessment_due_ux_followthrough_v1`). Do not treat either as the active Commerce migration version. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C_RENUMBER_REPORT.md`.

> **P5A supersession (2026-08-07):** Collision cleared by renumbering to **`20260909`**. This P4 report remains the historical `P4_BLOCKED` record for Learning-owned `20260908`. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5A_RENUMBER_REPORT.md`.
# COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P4_REPORT

**Verdict:** `P4_BLOCKED`

**Blocker:** Remote `schema_migrations` already registers **`20260908` = `learning_personal_notes_hub_v1`**. Local Commerce draft filename/version collides. **Do NOT renumber silently.** No remote apply.

---

## Setup

| Item | Value |
| --- | --- |
| worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| HEAD | `b8be33469f35c5ccb394925d666a5812f4c70c70` (+ uncommitted P1–P4; no commit) |

## Migration version + filename

| Item | Value |
| --- | --- |
| filename | `supabase/migrations/20260909_store_partial_refund_provider_money_execution_v1.sql` |
| version | `20260908` (**blocked**) |
| SHA256 | `32962DC09983A96306C82BA49F2E00EBB8EFA2A7728CFFE775675BE9204E7E25` |

---

## Local / worktree / origin / remote collision audit

| Source | `20260906` | `20260907` | `20260908` | `20260909` | `20260910–12` |
| --- | --- | --- | --- | --- | --- |
| This worktree SQL | absent | Commerce compensate | **This draft** | absent | absent |
| Other Desktop Commerce WTs | — | present (compensation) | **only this WT** | — | — |
| `origin/alpha-0.2` tree | no `202609*` files in tip listing | — | not in committed tree | — | — |
| Local git index | draft **untracked** | tracked prior | untracked | — | — |
| Remote `schema_migrations` (`tgucwnjwoyeqoxqaxmew`) | Learning due-dates | Commerce compensate | **Learning `learning_personal_notes_hub_v1`** | **absent (count=0)** | Translation studio |

**Object probe:** `store_partial_refund_provider_executions` = **NULL** (Commerce objects not applied).  
**Collision evidence:** remote history owns `20260908` for Learning; local Commerce draft cannot register under the same version.

Candidate free version observed (informational only): **`20260909`**. Renumber only under a separate explicit GO.

---

## SQL safety audit

Local draft (still not applied) reviewed:

| Check | Result |
| --- | --- |
| Additive / non-destructive | PASS (`create table if not exists`; no `drop table`) |
| Existing-data compatibility | PASS (new table; FKs restrict) |
| Status constraints | PASS (`planned\|executing\|succeeded\|failed\|uncertain`) |
| Uniqueness / idempotency | PASS (`(store_id, idempotency_key)`; open/succeeded ledger unique) |
| No broad cascade | PASS (`on delete restrict` / `set null` only) |
| FK ownership | PASS (stores, ledger commits, auth.users operator) |
| amount > 0 | PASS |
| currency constraints | PASS (3-char upper) |
| Terminal-success immutability | PASS (update rejects succeeded downgrade) |
| Uncertain semantics | PASS (uncertain → succeeded\|failed\|uncertain) |
| Recovery lookup fields | PASS (`last_lookup_at`, `p_touch_lookup`) |
| Timestamps/defaults | PASS |
| No provider secrets columns | PASS (safe refs/status/failure only; digit-run masks) |

---

## RPC / security / grant audit

| RPC | Matches app contract |
| --- | --- |
| `service_claim_store_partial_refund_provider_execution` | yes (`rpcContracts.claim`) |
| `service_update_store_partial_refund_provider_execution` | yes |
| `service_get_…_by_ledger` / `_by_idempotency` / get-by-id / list | yes |

All: `SECURITY DEFINER`, `search_path = public`, revoke from `public, anon, authenticated`, grant execute to `service_role` only. Table RLS forced; client mutation revoked.

---

## End-to-end execute mapping

```
Admin Execute UI (ACK + reason)
  → adminExecutePartialRefundProviderMoneyAction
  → platform admin authz
  → assertAdminProviderMoneyExecuteAllowed (dedicated + Stripe + execution mode)
  → operator ACK + reason sanitize
  → service-role ledger getByLedgerId + ownership
  → executeCommittedPartialRefundProviderMoney
  → resolveTrustedStripePaymentIntentRef (rejects client pi_)
  → claim prf-prov:{ledgerId}
  → inspect succeeded/uncertain/executing/failed
  → Stripe adapter submitPartialRefund (once if planned)
  → persist succeeded|failed|uncertain
```

No bypass of trusted PI, idempotency, dual gates + mode, ACK, or service-role boundary on the first-time path.

## Recovery mapping

```
uncertain | stale executing
  → adminRecoverPartialRefundProviderMoneyLookupAction
  → recoverPartialRefundProviderMoneyLookup
  → lookupPartialRefund ONLY
  → persist succeeded|failed|uncertain
```

Dedicated submit gate / execution mode not required for lookup; Stripe config required; **zero submit**.

---

## Crash / unknown-outcome audit

| Scenario | Behavior | Blind second submit? |
| --- | --- | --- |
| Timeout / ambiguous provider | persist `uncertain` | No |
| Provider success + crash before DB success | row may be `executing`/`uncertain` | No — re-execute → `recovery_required` |
| Persisted `executing` | recovery_required / stale lookup | No |
| Uncertain lookup still unknown | remain `uncertain` | No |
| Duplicate admin submit / double-click / retry | claim replay / recovery_required / succeeded replay | No |
| Stale executing recovery | LOOKUP only | No |
| Failed V1 | terminal; no retry | No |

**Invariant:** NO blind second submit after ambiguous outcome (P2/P3 tests + orchestration).

## Idempotency proof

Key `prf-prov:{ledgerId}` used for claim + Stripe Idempotency-Key. Unique `(store_id, idempotency_key)`.

---

## Observability / audit surface

P4 added `observability.ts` + recovery panel enrichment (no new DB column; derivation from existing timestamps):

Shows: execution id, ledger/store/order, amount/currency, provider kind, idempotency key, status, safe refund id/status/failure, created/started/completed, last lookup, **latest operation SUBMIT|LOOKUP|NONE**.

Does **not** show secrets, card data, raw Stripe payloads.

**Exact schema changes in P4:** none (collision blocked renumber/apply; observability derived). Migration header comment only updated to record P4 collision finding.

---

## Test-mode dry-run checklist

See `PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P4_TEST_MODE_DRY_RUN_CHECKLIST.md` (not executed).

## Production enablement prerequisites

See `PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P4_PRODUCTION_ENABLEMENT_PREREQUISITES.md` (env not flipped).

## Exact targeted remote-apply plan / commands

See `PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P4_TARGETED_REMOTE_APPLY_PLAN.md` — **not executed**; blocked until renumber GO.

## Rollback / recovery plan

| Failure mode | Action |
| --- | --- |
| SQL fails before history | Fix SQL; re-run targeted file; do not register history |
| Objects exist; verify fails | Inspect grants/RPCs; corrective additive SQL under new version if needed; **do not** touch Learning/Translation rows |
| History registration fails after SQL success | Re-attempt history insert only after object verify PASS; never `db reset` |
| History registered; later defect | New additive migration; disable gates; no broad rollback; no Learning/Translation edits |

---

## Tests run + exact pass counts

```
Test Files  15 passed (15)
     Tests  191 passed (191)
```

Includes P1–P4 provider-money + reservation/ledger/compensation + live payment suites.

## TypeScript

PASS — `npx tsc --noEmit`

## git diff --check

PASS

## secret scan

PASS — no real secrets; fixture placeholders only in tests

## Forbidden ownership proof

No restock/entitlement/settlement/commission/payout/Sync/`commerce_confirm`/auto-compensate. Production gates remain OFF. No Stripe refund executed in P4.

## git diff --stat

```
 app/admin/store/refunds/page.tsx | 174 +
 docs/ai/CURRENT_TASK.md          | …
 docs/ai/CURSOR_REPORT.md         | …
 docs/ai/PROJECT_STATE.md         | …
 lib/store/stripeApi.ts           | 51 +
 5 files changed, 273 insertions(+), 23 deletions(-)
```

(+ untracked module/panels/migration/docs including P4 report/checklists)

## git status --short

Dirty P1–P4 working tree; **no commit; no push**.

## Blockers

1. **Hard:** `20260908` remote collision with Learning `learning_personal_notes_hub_v1`.
2. Soft: dry-run / remote apply cannot proceed until renumber + re-preflight under new GO.

## Exact recommended P5 deliverable only

**P5 — Renumber local draft off Learning `20260908` (candidate `20260909` if still free) + collision re-audit + optional remote-apply GO pack:**

1. Explicitly rename/renumber the local SQL to a proven-free version (recheck remote + worktrees + origin).  
2. Update app/docs/tests SHA256 + filenames.  
3. Re-run P4 collision/SQL audits to clear `P4_BLOCKED`.  
4. Only then, under a **separate** apply GO, execute the targeted apply plan (still no production money enablement).

**STOP — do not remote-apply, commit, push, or renumber without a new GO.**
