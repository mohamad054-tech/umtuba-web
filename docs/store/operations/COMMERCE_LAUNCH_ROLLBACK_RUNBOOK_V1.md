# Commerce Launch & Rollback Runbook V1

Capability: `commerce.ops.launch_readiness_v1`
Audience: another operator â€” follow in order; do not improvise money SQL.
Laptop owns readiness docs/tests; **Desktop** owns Supabase applies and commission/refund-sensitive repairs.

Related: `COMMERCE_LAUNCH_READINESS_CHECKLIST_V1.md`, `COMMERCE_PRODUCTION_ROLLOUT.md`, `LIVE_PAYMENT_PRODUCTION_GATE_V1.md`

---

## 0. Preconditions

| Check | Expected |
| --- | --- |
| Git tip | Approved launch tip (this branch based on `be87fb3` or later approved SHA) |
| Remote Store baseline | At least `20260809â€“20260821` applied historically |
| Confirm gate | `commerce_confirm_enabled = 0` |
| Physical sell | Live Stripe digital-only (`20260876`) |
| Secrets | Present in host env only â€” never commit |

If any money migration already partially applied, **stop** and reconcile Desktop inventory before continuing.

---

## 1. Deploy application

1. Deploy the approved artifact (includes post-capture wire + refund revoke).
2. Smoke: app boots; `/api/store/payments/stripe/webhook` returns non-HTML (config may 503 until secrets set â€” expected).
3. Do **not** enable confirm yet.

---

## 2. Apply migrations (Desktop)

Apply only the ordered list in `COMMERCE_LAUNCH_READINESS_CHECKLIST_V1.md` Â§B.

Rules:

- One file at a time; abort wave on first error
- Never renumber; never edit already-applied files
- Skip Learning/World/Ads
- After wave: verify schema_migrations + spot-check RPCs exist:
  - `create_my_store_stripe_payment_attempt`
  - `apply_store_payment_outcome` / settlement apply
  - `grant_store_digital_entitlements_after_capture`
  - `revoke_store_digital_entitlements_after_refund`
  - `activate_store_commission_policy` / decomposition apply
  - refund ops surface RPCs from `20260888`

---

## 3. Configure Stripe (test first)

1. Set test keys + `STRIPE_MODE=test` + webhook secret.
2. Point Stripe webhook to `https://<prod-host>/api/store/payments/stripe/webhook`.
3. Enable events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`.
4. Confirm server has `SUPABASE_SERVICE_ROLE_KEY` (never expose to client).
5. Live cutover only when Production Gate checklist is complete (`LIVE_PAYMENT_PRODUCTION_GATE_V1.md`).

---

## 4. Commission policy (if required)

1. Insert draft policy for launch currency (ops SQL / approved helper â€” Desktop).
2. Activate via `activate_store_commission_policy` (`20260891`).
3. If skipped: capture path still releases seller payable; decomposition reports `not_configured` (soft). Record the decision.

Do **not** change `commissionPolicy*` / `commissionDecomposition*` / `fullOrderRefundPath*` code from laptop without a confirmed defect + GO.

---

## 5. Controlled probe (confirm ON briefly)

1. Record start time + operator.
2. `admin_set_commerce_confirm_enabled(true)`.
3. Run digital path smoke (checklist Â§D).
4. Verify: Sync captured â†’ allocate â†’ grant â†’ release; then refund â†’ revoke.
5. If any hard failure: execute Â§7 Rollback immediately.
6. If pass: either leave ON with monitoring owner **or** turn OFF until full launch window.

---

## 6. Steady-state launch

1. Confirm gate policy decided and written down.
2. Monitoring owner watches: webhook errors, soft-fail post-capture statuses, refund/revoke failures, Stripe Dashboard drift.
3. Physical products: may exist in catalog but must not complete live Stripe checkout.

---

## 7. Rollback (money stop)

Execute in order until money path is closed:

1. `admin_set_commerce_confirm_enabled(false)` â†’ verify `commerce_confirm_enabled = 0`
2. Set `STORE_COMMERCE_CONFIRM_KILL_SWITCH=1` on app hosts (optional belt-and-suspenders)
3. If live funds at risk: disable `STRIPE_LIVE_PAYMENTS_ENABLED` / pause webhook in Stripe Dashboard
4. Redeploy previous artifact only if the defect is in app code
5. Soft containment: unpublish/hide listings; suspend seller; do not DELETE payment rows
6. Forward-fix preferred: replay with same Sync / revoke `event_key`s after fix
7. DB restore from backup only under explicit ops plan â€” not a casual step

---

## 8. Incident packet (always collect)

- Time (UTC), operator, tip SHA
- Stripe event id / session id / PaymentIntent id
- `payment_attempt_id`, order id, store id
- Sync / settlement / entitlement `event_key`s
- HTTP status from webhook/return
- Whether confirm gate / kill switch / live flag were ON

---

## 9. Handoff between machines

| Laptop | Desktop |
| --- | --- |
| Audit, tests, docs, readiness PASS/FAIL | Apply migrations `20260869+` / money wave |
| Reproduce app failures with tests | Commission/refund SQL anomalies |
| No remote migration apply | No drive-by renumber / no force push |

---

## 10. Definition of Go

**Go** only when:

- Migrations Â§B applied and verified
- Stripe test (or gated live) webhook verified end-to-end
- Digital smoke Â§D green
- Rollback Â§7 rehearsed once
- Physical live capture still rejected
- Owners named for payments / refunds / entitlements

Otherwise **No-Go** â€” keep confirm OFF.
