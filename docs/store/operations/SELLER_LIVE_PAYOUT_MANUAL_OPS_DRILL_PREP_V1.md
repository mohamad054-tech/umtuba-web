# Seller Live Payout — Manual Ops Controlled Drill Preparation V1

Companion to `SELLER_LIVE_PAYOUT_PROVIDER_RUNBOOK_V1.md`.

**Status of this document:** preparation / read-only preflight only.  
**Actual live drill:** requires a **separate explicit GO**.  
**This preparation pass did not enable the gate and did not execute any payout.**

---

## Proof — no real drill has started (prep timestamp)

Recorded during Manual Ops Drill Preparation V1 (read-only remote aggregates):

| Probe | Value |
| --- | --- |
| `store_commerce_confirm_enabled()` | `false` |
| `store_payout_events` rows | `0` |
| `store_payout_executions` rows | `0` |
| `store_payout_destinations` rows | `0` |
| verified active destinations | `0` |
| `store_settlement_active_allocations` rows | `0` |
| settlement `release` events | `0` |
| Live payout gate (default / empty env) | OFF (`live_flag_disabled`) |

**Eligible named drill candidate:** **none** (no RELEASED capture landscape + no verified destination). Do not invent synthetic production payout data to unblock.

---

## Operator authorization checklist (before any drill GO)

```
□ Explicit human GO names this drill (window, environment, store)
□ Gate remains OFF until that GO; prep does not set host secrets
□ commerce_confirm remains false (independent Stripe track)
□ No Stripe Connect / Wise / PayPal / bank API
□ No remote migration apply / repair in the drill GO unless separately named
□ Platform admin + seller owner/manager operators identified
□ Host secret store owners ready (values never pasted into chat/git/logs)
□ Rollback owner assigned to force gate OFF immediately after drill
□ Approved window / stop time agreed
```

---

## Pre-drill checklist (repo + remote)

```
□ Branch tip includes payout provider V1 + remote migration closeout
□ Remote migrations present: 20260881, 20260882, 20260883, 20260898
□ Learning 20260896 / 20260897 unchanged
□ Gate env names configured only in host secret store (never in git)
□ SELLER_LIVE_PAYOUTS_ENABLED false/unset until drill GO
□ SELLER_LIVE_PAYOUT_PROVIDER = manual_ops_live (when enabling)
□ ACK constant known by ops (value from code — do not commit alternate ACK)
□ Admin UI /admin/store/payouts reachable for platform admin
□ Seller Store payout surface reachable for owner/manager
□ Eligible RELEASED capture nominated (criteria below)
□ Verified active masked destination for same store + currency
□ Zero-secret logging rules acknowledged
```

---

## Eligible capture selection criteria (RELEASED)

Do **not** print store/buyer PII or full bank data. Operators select via trusted seller/admin UI or private ops notes.

A capture is drill-eligible only when **all** are true:

1. Trusted capture exists for the store (payment attempt + capture event).
2. Settlement state is **`RELEASED`** (settlement event `action = release` with journal; no later `reverse` blocking).
3. Payout foundation state is **`NONE` / available** (not `IN_TRANSIT`, not `COMPLETED`).
4. Seller eligibility surface lists it as a **request candidate** (`settlementState=RELEASED` and payout status `available`).
5. Amount/currency come only from trusted server context (never client money fields).
6. Matching **verified + active** Manual Ops destination exists for the same store and currency (`provider_id = manual_ops_live`).
7. Live payout gate will be intentionally satisfied only during the approved drill window.

**Booking helper source of truth:** `loadTrustedPayoutBookingContext` / `assertPayoutMoneyChecks` in `lib/store/payoutBookingOpsHelpers.ts` require `settlementState === "RELEASED"` before submit.

---

## Success-path evidence checklist

```
□ Gate intentionally ON only for approved window (separate GO)
□ Seller requests payout for nominated RELEASED available capture
□ Durable execution appears awaiting_attestation (Manual Ops Live; no bank API)
□ Foundation payout state moves NONE → IN_TRANSIT on submit booking
□ Admin attests success with safe attestation_ref (no secrets)
□ Orchestrator confirm booking → COMPLETED
□ Admin queue shows terminal completed / read-only
□ Evidence captured without secret values (execution id, phases, timestamps only)
```

---

## Controlled-failure evidence checklist

```
□ Separate execution (or post-fail re-submit path) reaches awaiting_attestation
□ Admin uses approved fail attestation path
□ Foundation fail booking returns payout state toward NONE / available
□ Seller request controls remain honest; no bank API claimed
□ Evidence recorded (phase=failed or equivalent safe projection)
```

---

## Uncertain-state / no-auto-fail checklist

```
□ Execution can be marked / treated as uncertain per Manual Ops rules
□ Admin does not auto-fail uncertain
□ Offline funds reconciliation performed before success attest after uncertain
□ succeeded_pending_confirm (if observed) uses confirm recovery — no auto-fail
□ Evidence notes “no auto-fail”
```

---

## Immediate gate-OFF rollback checklist

Implementation guarantees fail-closed restore:

1. Unset / set `SELLER_LIVE_PAYOUTS_ENABLED` to false in the host environment.
2. Optionally remove `SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK`.
3. Redeploy / reload env so server processes observe the change.
4. Confirm admin `LivePayoutGateBadge` shows not ready / disabled.
5. Confirm seller request controls disabled.
6. Do **not** mass auto-fail any IN_TRANSIT rows — reconcile manually.

Code proof: empty/default env → `evaluateSellerLivePayoutGate` → `ok:false`, `code: live_flag_disabled`.

---

## Zero-secret logging requirements

```
□ Never log ACK values, service-role keys, Stripe keys, or bank PANs
□ Log only: store id (if already ops-known), execution id, phase, safe failure codes
□ Attestation refs must be non-secret ops labels
□ Destination labels remain masked (no 8+ digit runs)
□ Chat / git / tickets must not paste host secret values
```

---

## Existing Manual Ops entry points (do not invent new ones)

| Layer | Entry |
| --- | --- |
| Seller actions | `upsertSellerPayoutDestinationAction`, `requestSellerLivePayoutAction` (`app/actions/storeSellerLivePayout.ts`) |
| Seller UI | `SellerPayoutDestinationForm`, `SellerPayoutRequestButton` + seller store page |
| Admin actions | `adminListLivePayoutExecutionsAction`, attest/fail actions (`app/actions/storeAdminLivePayout.ts`) |
| Admin UI | `/admin/store/payouts` → `AdminLivePayoutQueue` + `AdminLivePayoutAttestForm` |
| Provider | `lib/store/sellerLivePayout/providers/manualOpsLive.ts` (no bank network) |
| Orchestrator | `orchestrateSellerLivePayoutSubmit`, `orchestrateSellerLivePayoutResolveAttestation` |
| Gate | `evaluateSellerLivePayoutGate` / `buildSellerLivePayoutGateReadinessReport` |

---

## Gate environment variable names only

- `SELLER_LIVE_PAYOUTS_ENABLED`
- `SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK`
- `SELLER_LIVE_PAYOUT_PROVIDER`
- `SELLER_LIVE_PAYOUT_ALLOW_IN_NON_PRODUCTION` (fixtures only — never real money)
- `VERCEL_ENV` / `NODE_ENV`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never print)

---

## Code / migration requirement (prep conclusion)

| Item | Required for prep? | Required for later drill GO? |
| --- | --- | --- |
| Application code changes | **No** | Not expected if eligibility exists |
| New migrations | **No** | **No** (81–83–98 already remote) |
| Host gate secrets + operator nomination of RELEASED capture + verified destination | N/A (prep) | **Yes** |

---

## Final prep verdict (this pass)

**`NOT_READY_FOR_CONTROLLED_LIVE_DRILL`** — no RELEASED settlement landscape and no verified destinations remotely; do not start a live drill GO until operators can safely nominate an eligible capture + verified destination without inventing production data.

Preparation closeout verdict: **`MANUAL_OPS_DRILL_PREPARATION_CLOSED_NOT_READY`** (prep artifacts preserved; live drill still not executed).
