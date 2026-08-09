# Partial Refund Provider Money Execution V1 — Reconciliation / Admin / E2E Safety Plan

**Task:** `COMMERCE_PROVIDER_EXEC_RECONCILIATION_ADMIN_E2E_SAFETY_PLAN_V1`  
**Owner device:** DESKTOP-A3  
**Base tip:** `4291bdbfb395b00a9c9cc5aa0d05d560a1e672ab`  
**Status:** Safety pack design + non-provider-live regression contracts  
**Provider activation:** **NOT** in scope. Gates remain OFF. Mode remains `off`.

---

## 1. Purpose

Independent pre-activation safety pack covering reconciliation evidence, admin visibility, unauthorized denial, reservation→execution coupling, idempotency / duplicate prevention, failure & retry posture, and browser E2E *scenarios* (design). Complements Stripe TEST fixture readiness (DESKTOP-A2) without overlapping gate/env/fixture helper edits.

## 2. Hard constraints

| Constraint | Rule |
| --- | --- |
| Provider gate | Must stay OFF in this pack |
| Execution mode | Must stay `off` in real env |
| Stripe network | Forbidden in this pack’s tests |
| Production DB | No mutation / no migration apply |
| `_port_extract` | Protected — never touch |
| Money movement | None |

## 3. State model under test

Statuses: `planned` → `executing` → (`succeeded` \| `failed` \| `uncertain`).

| From \ To | planned | executing | succeeded | failed | uncertain |
| --- | --- | --- | --- | --- | --- |
| planned | ✓ | ✓ | ✗ | ✓ | ✗ |
| executing | ✗ | ✓ | ✓ | ✓ | ✓ |
| uncertain | ✗ | ✗ | ✓ (recovery) | ✓ (recovery) | ✓ |
| succeeded | ✗ | ✗ | ✓ (idempotent) | ✗ | ✗ |
| failed | ✗ | ✗ | ✗ | ✓ (terminal; no V1 retry) | ✗ |

**Recovery rule:** `uncertain` / stale `executing` → LOOKUP only. Never blind resubmit. Never auto-compensate ledger / restock / Sync.

**Failed retry policy V1:** `no_retry` under the same idempotency key `prf-prov:{ledgerId}`.

## 4. Reservation → provider execution relationship

| Fact | Expectation |
| --- | --- |
| Ledger status | Must be `committed` before first-time execute eligibility |
| Ownership | Store / order / payment attempt / capture must match trusted facts |
| Money source | Trusted ledger minor units only — reject client money fields |
| PI source | Trusted PaymentIntent resolution only — reject client `pi_` |
| Capability boundary | Provider money does **not** own ledger committed meaning, restock, entitlement, settlement, commission, payout, Sync partial, commerce_confirm |

## 5. Reconciliation evidence (admin-safe)

Audit view (`toProviderMoneyAuditView`) must expose only:

- ids: execution / ledger / store / order / paymentAttempt
- money: amountMinor + currency
- providerKind, idempotencyKey, status
- providerRefundId + providerStatusSafe (safe strings)
- failureCode
- timestamps + derived `latestOperation` ∈ {`SUBMIT`,`LOOKUP`,`NONE`}

Must **not** expose: secret keys, raw Stripe payloads, card data, customer PII, env ACK values.

Reconciliation operator checklist (manual, when activation is later authorized):

1. Locate execution by ledgerId / idempotencyKey.
2. Confirm status + latestOperation.
3. If `uncertain`/`executing`: run recovery LOOKUP; confirm zero submit.
4. If `succeeded`: confirm providerRefundId present; replay execute → zero submit.
5. If `failed`: confirm no retry path available under same key.
6. Confirm ledger reservation remains committed (no silent compensate).

## 6. Admin visibility

Surfaces on `/admin/store/refunds` (platform admin only):

| Panel | testid | Role |
| --- | --- | --- |
| Readiness | (readiness panel) | Gate/mode/readiness — fail-closed |
| First-time execute | `partial-refund-provider-money-execute-panel` | Eligible candidates + ACK + reason |
| Recovery | `partial-refund-provider-money-recovery-panel` | LOOKUP only |

Flash query params (safe): `prProvExecOk`, `prProvExecStatus`, `prProvExecError`, ledger/execution ids, submit flag — no secrets.

## 7. Seller-visible state

V1 expectation: **seller UI must not** expose provider-money execute/recovery controls. Seller may see reservation/refund operation states owned by other modules; provider execution is admin/platform-gated. Safety pack asserts seller app trees do not import provider-money execute actions/panels.

## 8. Unauthorized access denial

| Actor | Expected |
| --- | --- |
| Anonymous | readiness action → `unauthorized`; execute/recover → login redirect |
| Authenticated non-admin | readiness → `ADMIN_STORE_UNAUTHORIZED`; execute/recover → home + unauthorized |
| Admin cross-store mismatch | blocked (`missing_ownership` / store mismatch) |
| Client-supplied PI / money fields | rejected; zero submit |

## 9. Browser E2E scenarios (design — no live provider)

These are **scenarios for a future Playwright suite** under an activation GO. This pack does **not** run Stripe or flip gates.

### E2E-S1 — Default-off admin page
1. Platform admin opens `/admin/store/refunds`.
2. Expect execute panel visible but first-time submit **not** allowed (mode/gate fail-closed).
3. No Stripe network.

### E2E-S2 — Unauthorized denial
1. Non-admin session hits readiness action / admin refunds.
2. Expect unauthorized denial / redirect; no candidate submit control usable.

### E2E-S3 — Eligibility matrix (mocked service-role / fixture env in isolated TEST host only)
1. committed + PI + gates test → eligible label.
2. non-committed → ledger_not_committed.
3. prior succeeded → already_succeeded.
4. prior failed → prior_failed_no_retry.
5. uncertain/executing → recovery_required.

### E2E-S4 — Idempotent replay (TEST host only, coordinator GO)
1. First execute succeeds once.
2. Second execute → replay, submit=0.
3. Audit shows succeeded + idempotency key stable.

### E2E-S5 — Uncertain recovery (TEST host only, coordinator GO)
1. Force uncertain (or fixture).
2. Recovery LOOKUP only → succeeded/failed/uncertain.
3. Prove zero second submit.

### E2E-S6 — Seller surface absence
1. Seller store dashboard / refund views.
2. Assert no provider-money execute/recovery panels/testids.

## 10. Rollback / recovery expectations

| Situation | Operator action | Forbidden |
| --- | --- | --- |
| Gate accidentally enabled | Immediate OFF gate + mode=`off` | Leave enabled “to finish” |
| Uncertain after submit | Recovery LOOKUP | Resubmit / new idempotency key |
| Persist fail after provider success | Treat as executing/uncertain; lookup | Blind resubmit |
| Confirmed failed | Stop; await future retry milestone | Same-key retry |
| Wrong env / live keys suspected | Halt; rotate/isolate; do not enable | Continue TEST with live keys |

App rollback: redeploy prior SHA; gates remain env-controlled fail-closed. DB: `20260915` additive — do not drop in panic; disable via gates.

## 11. Non-provider-live regression pack (this milestone)

File: `lib/store/partialRefundProviderMoneyExecution/partialRefundProviderMoneyExecution.safety.test.ts`

Covers: transition matrix, reservation coupling, idempotency key contracts, failed no-retry, audit reconciliation fields, admin unauthorized source contracts, seller non-wiring, E2E testid anchors, rollback/recovery source contracts, default-off posture.

## 12. Gap register (pre-pack → post-pack)

| Area | Pre-pack | Post-pack |
| --- | --- | --- |
| State transitions | Partial (P7 samples) | Exhaustive matrix in safety.test |
| Idempotency / duplicate submit | Strong (P2/P3/P7) | Reinforced contracts |
| Reservation → execution | Implicit in orchestrator tests | Explicit eligibility/candidate coupling |
| Failure visibility | Status + flash | Audit view + eligibility codes |
| Committed/failed/retry | Strong | Reinforced |
| Reconciliation evidence | Observability helpers | Safety assertions on audit shape |
| Admin visibility | Source contracts | Extended action auth contracts |
| Seller-visible | Assumed absent | Explicit seller-tree scan |
| Unauthorized denial | Partial source scans | Explicit multi-action contracts |
| Browser E2E | None | Scenario design only (S1–S6) |
| Rollback/recovery | Runbook fragments | Consolidated plan + source asserts |

**Remaining after this pack (activation milestone, not A3):** real Playwright suite; Stripe TEST dry-run under coordinator GO; production enablement review.

## 13. Disjointness vs DESKTOP-A2

A2 owns Stripe TEST fixture/env readiness (`.env.example`, fixture helpers, gate/env templates).  
A3 owns reconciliation/admin/E2E **safety plan + non-live safety tests**.  
A3 does **not** edit `gate.ts` / `executionMode.ts` / `.env.example` / Stripe fixture helpers.
