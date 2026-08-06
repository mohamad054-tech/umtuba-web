# Seller Live Payout Provider Runbook V1

Operational companion to `docs/store/implementation/SELLER_LIVE_PAYOUT_PROVIDER_V1.md`.

**Goal:** Operate the gated Manual Ops Live seller payout path safely.  
**Non-goals:** Enabling buyer `commerce_confirm`, configuring Stripe live payments, enabling Stripe Connect / Wise / PayPal, or performing undocumented real payouts.

---

## Current operational truth

- Code capability S1–S8 is implemented; remote migration closeout applied `20260881` → `20260882` → `20260883` → `20260898` (tip `20260898`).
- Production gate defaults **OFF**.
- **No real payout** has been performed as part of provider + migration closeout.
- Manual Ops controlled drill requires a **separate explicit GO** — see `SELLER_LIVE_PAYOUT_MANUAL_OPS_DRILL_PREP_V1.md`.
- Buyer Stripe payment path and `commerce_confirm` are independent and unchanged.

---

## Preconditions checklist

```
□ Git tip includes S1–S8 closeout docs
□ 20260881 / 20260882 / 20260883 present and applied only if explicitly approved
□ 20260898 present and applied only if explicitly approved
□ commerce_confirm_enabled remains 0 (unless a separate Stripe GO says otherwise)
□ SELLER_LIVE_PAYOUTS_ENABLED is false / unset in production until enablement GO
□ Platform admin accounts known
□ Seller owner/manager test store known
□ No bank API credentials required for V1 Manual Ops Live
```

---

## Migration apply policy

| Migration | Apply policy |
| --- | --- |
| `20260881` | Remote-applied (payout foundation) — do not re-apply without GO |
| `20260882` | Remote-applied (read model) |
| `20260883` | Remote-applied (recon read) |
| `20260898` | Remote-applied (live destinations + executions; tip) |

Never remote-apply from an AI agent session without an explicit human GO that names the migrations.

---

## Gate variables (names only)

Configure in the host secret store. **Never commit values.**

- `SELLER_LIVE_PAYOUTS_ENABLED`
- `SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK`
- `SELLER_LIVE_PAYOUT_PROVIDER` (must be `manual_ops_live` for V1)
- `SELLER_LIVE_PAYOUT_ALLOW_IN_NON_PRODUCTION` (fixtures/tests only)
- `VERCEL_ENV` / `NODE_ENV`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)

ACK must match the code constant `I_UNDERSTAND_LIVE_SELLER_PAYOUTS_MOVE_REAL_MONEY`.

---

## Seller workflow (ops)

1. Seller owner/manager signs in → Seller Store dashboard.
2. Under payout eligibility, add a **masked** destination (example shape: `Ops clearing •••• 42`).
3. Request platform review; wait until verification state is `verified` and destination is active.
4. When gate is ready and an eligible RELEASED capture is available, use **Request payout**.
5. Do not ask sellers for full account numbers, IBAN, routing, or raw bank payloads.
6. Non-owner/non-manager roles must not see request/destination controls.

If gate is off/incomplete: seller sees honest disabled messaging; request is unavailable.

---

## Admin workflow (ops)

1. Platform admin opens `/admin/store/payouts`.
2. Confirm gate badge state before acting.
3. Use the **durable live payout queue** (not mock rails diagnostics).
4. For awaiting attestation:
   - Success → submit attestation succeeded with a safe attestation reference.
   - Failure → use the approved fail path after review.
5. For **uncertain**:
   - Mark reconciliation required.
   - Confirm offline funds movement.
   - Attest succeeded only after reconciliation.
   - **Do not auto-fail.**
6. For **succeeded_pending_confirm**:
   - Confirm booking failed after a success attestation.
   - Re-drive safe confirm recovery; **do not auto-fail**.
7. Completed rows are read-only.

---

## Production enablement steps

Only after explicit human GO:

1. Verify remote migration prerequisites (`20260881–83`, then `20260898`) against the target project.
2. Confirm buyer Stripe live env readiness is a **separate** track; do not couple enablement.
3. Set host secrets for gate variables (names above) — values never in git.
4. Keep `SELLER_LIVE_PAYOUT_PROVIDER=manual_ops_live`.
5. Run a controlled drill with a known store and known RELEASED capture.
6. Verify:
   - submit → IN_TRANSIT
   - admin attest success → COMPLETED
   - fail path returns funds to available per foundation
   - uncertain path does not auto-fail
7. Only then leave the gate ON in production.

**V1 still has no bank API network call.** Ops must move/confirm funds out-of-band and attest honestly.

---

## Emergency gate-off / rollback

Immediate kill switch:

1. Set `SELLER_LIVE_PAYOUTS_ENABLED` to false / unset in the host environment.
2. Optionally remove `SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK`.
3. Redeploy / reload env so server processes see the change.
4. Confirm admin gate badge shows disabled/incomplete.
5. Confirm seller request controls are disabled.
6. Existing IN_TRANSIT rows require manual reconciliation — do not mass auto-fail.

Schema rollback is **not** the first response. Prefer gate-off + ops reconciliation.

---

## Incident notes

| Symptom | Likely cause | Response |
| --- | --- | --- |
| Request always disabled | Gate OFF / incomplete | Expected until enablement GO |
| Destination cannot request | Not verified / inactive | Platform verify; never seller self-verify |
| Uncertain queue row | Provider/ops ambiguity | Reconcile; no auto-fail |
| succeeded_pending_confirm | Confirm booking failed after success attest | Safe confirm recovery |
| Forbidden provider | stripe_connect / wise / paypal | Keep blocked in V1 |

---

## Independence checklist

```
□ commerce_confirm unchanged
□ buyer Stripe payment code unchanged
□ UEOS not posted from live payout UI/actions
□ no second payout ledger invented
□ unsupported providers remain blocked
□ no secret values stored in docs or git
```

---

## Exit criteria for a controlled enablement drill

```
□ migrations applied under explicit GO
□ gate intentionally enabled in non-prod or approved prod window
□ one submit → attest success → COMPLETED
□ one fail path verified
□ one uncertain path verified (no auto-fail)
□ gate returned OFF unless production stay-on GO exists
□ no bank API integration claimed
```
