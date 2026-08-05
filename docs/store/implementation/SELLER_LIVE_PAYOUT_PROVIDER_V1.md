# Seller Live Payout Provider V1

Capability: `commerce-seller-live-payout-provider-v1`  
Branch: `office/commerce-seller-live-payout-provider-v1`  
Tip (S7 close / S8 base): `a77094f272df8178e422303b3e60d1cbac6bf7ae`  
Module: `lib/store/sellerLivePayout/`  
Seller actions: `app/actions/storeSellerLivePayout.ts`  
Admin actions: `app/actions/storeAdminLivePayout.ts`  
Seller UI: seller store dashboard eligibility + destination/request controls  
Admin UI: `/admin/store/payouts` durable live queue  

Companion runbook: `docs/store/operations/SELLER_LIVE_PAYOUT_PROVIDER_RUNBOOK_V1.md`

---

## Status (honest)

| Item | State |
| --- | --- |
| Code slices S1–S7 | **COMPLETE** (committed + pushed on branch) |
| Documentation / closeout S8 | This document |
| Production gate | **OFF by default** — live payouts have **not** been enabled |
| Real payouts performed | **None** |
| Migration `20260896` | Present locally; **not remote-applied** |
| Payout foundation `20260881–83` | Required prerequisites for booking path; treat as **local / not assumed remote-applied** until an explicit remote-apply GO |
| `commerce_confirm` | Unchanged and independent — remains off until separate Stripe GO |
| Buyer Stripe payment path | Unchanged and independent |

Do **not** claim production enablement or that live payouts have occurred.

---

## What V1 implements

V1 adds a **gated Manual Ops Live** seller payout path on top of the existing settlement + payout foundation booking helpers:

- Durable payout destinations (masked display labels only)
- Durable payout executions
- Server orchestrator that sequences gate → trusted capture context → submit booking → Manual Ops Live provider → attestation → confirm/fail booking
- Seller owner/manager destination + request UI
- Platform-admin live payout queue + attestation UI

V1 does **not**:

- Call a bank API or move funds via network transfer automation
- Enable Stripe Connect, Wise, or PayPal
- Invent a second payout ledger state machine (ledger remains foundation `NONE` / `IN_TRANSIT` / `COMPLETED`)
- Accept client-trusted money fields
- Change buyer Stripe capture or `commerce_confirm`

### Manual Ops Live characteristics

| Property | V1 truth |
| --- | --- |
| Durable | Yes — destinations + executions in Postgres (`20260896`) |
| Gated | Yes — fail-closed production gate (default OFF) |
| Human-attested | Yes — platform admin records success/failure attestation |
| Bank API network call | **No** in V1 |
| Auto-confirm on create | **No** |
| Auto-fail on uncertain | **No** |

---

## Money flow (authoritative)

```
capture (payment outcome)
  → settlement RELEASED
  → seller request / orchestrator submit
  → payout booking submit → IN_TRANSIT
  → Manual Ops Live transfer record (awaiting attestation)
  → admin Manual Ops attestation
      → succeeded → confirm booking → COMPLETED
      → failed    → fail booking    → available again (foundation fail path)
      → uncertain → leave IN_TRANSIT; reconciliation required (no auto-fail)
```

Trusted amount and currency always come from server-side capture/settlement context inside the orchestrator. Clients may send identifiers only (`storeId`, `paymentAttemptId`, `destinationId`, `orchestrationKey`).

---

## Slice map (S1–S8)

| Slice | Commit (subject) | Deliverable |
| --- | --- | --- |
| S1 | `f773788` gate + provider port | Gate, types, provider contracts |
| S2 | `756057b` destinations/executions migration | `20260896` schema + RPCs (local) |
| S3 | `91dc26b` Manual Ops Live adapters | Provider + destination/execution helpers |
| S4 | `63758da` orchestrator | Submit + resolve attestation |
| S5 | `d311e6c` server actions | Seller + admin actions |
| S6 | `253552f` admin queue UI | Durable admin queue + attest form |
| S7 | `a77094f` seller request/destination UI | Seller destination + request controls |
| S8 | this closeout | Docs + handoff |

---

## Unsupported providers

Blocked for V1 live selection and port resolution:

- `stripe_connect` (reserved id only — not enabled)
- `wise`
- `paypal`

Only `manual_ops_live` is the V1 live provider when the gate is satisfied.

Separate mock rails (`lib/store/sellerPayoutRails`, providers `mock_clearing` / `manual_ops`) remain mock-only (`supportsLiveTransfer: false`) and are not the live path.

---

## Production gate (env names only — never secret values)

Gate evaluation is fail-closed. Empty/default env → live OFF.

| Variable | Role |
| --- | --- |
| `SELLER_LIVE_PAYOUTS_ENABLED` | Master flag (`true`/`1`/`yes`/`on`) |
| `SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK` | Must equal the explicit ACK constant in code (`I_UNDERSTAND_LIVE_SELLER_PAYOUTS_MOVE_REAL_MONEY`) |
| `SELLER_LIVE_PAYOUT_PROVIDER` | Optional; must be `manual_ops_live` for V1 readiness |
| `SELLER_LIVE_PAYOUT_ALLOW_IN_NON_PRODUCTION` | Test/fixture token only — never for real money |
| `VERCEL_ENV` / `NODE_ENV` | Environment classification for non-production restrictions |
| `NEXT_PUBLIC_SUPABASE_URL` | Server client URL (not a payout secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role for orchestrator booking path only (server) — **never expose to client / docs as a value** |

Never paste secret values into docs, commits, or tickets.

`commerceRevenueBridge.payoutsEnabled` is `true` only when the live gate and V1 provider are ready; default remains `false`.

---

## Seller workflow

1. Store **owner or manager** opens Seller Store dashboard.
2. Reviews payout eligibility (trusted read model balances).
3. Adds/updates a **masked** destination label (`upsertSellerPayoutDestinationAction`).
   - Cannot self-verify (`verification_state` is platform-controlled).
4. When gate ready + verified active destination + eligible RELEASED available capture:
   - Clicks **Request payout** (`requestSellerLivePayoutAction`).
5. Sees in-transit / completed status from the read model; cannot duplicate in-transit/completed requests.
6. Other store roles do not receive live destination/request controls.

---

## Admin workflow

1. Platform admin opens `/admin/store/payouts`.
2. Sees production gate badge (enabled / disabled / incomplete).
3. Loads durable live queue via `adminListLivePayoutExecutionsAction` (safe fields only).
4. For `awaiting_attestation`: records Manual Ops attestation success or reviewed failure.
5. For `uncertain`: reconciliation required — confirm only after ops review; **no unsafe auto-fail shortcut**.
6. Completed executions are read-only.
7. Mock rails diagnostics remain secondary/collapsed developer information.

---

## Uncertain and `succeeded_pending_confirm` recovery

| Phase / status | Meaning | Safe action |
| --- | --- | --- |
| `uncertain` | Provider/ops outcome not known; booking left **IN_TRANSIT** | Reconcile offline; attest succeeded only when funds movement is known; **do not auto-fail** |
| `succeeded_pending_confirm` | Attestation said succeeded but confirm booking failed | Safe recovery required; re-drive confirm path via approved admin resolve; **do not auto-fail** |
| `failed` | Reviewed fail path completed through orchestrator | Capture may return to available per foundation rules |
| `succeeded` / ledger `COMPLETED` | Terminal success | Read-only |

---

## Idempotency rules

- Seller/admin supply an `orchestrationKey` (8–120 chars).
- Booking action keys are derived as `${orchestrationKey}:submit|fail|confirm` (≤ 128).
- Durable execution uniqueness: store + idempotency key; open-capture constraints in `20260896`.
- Orchestrator replays idempotently for already-submitted / terminal / uncertain states without inventing money.
- Duplicate request for IN_TRANSIT / COMPLETED captures is blocked.

---

## Security and authorization

| Boundary | Rule |
| --- | --- |
| Seller actions | Authenticated + store owner/manager (`canManageStoreSettings`) |
| Admin actions / page | Platform admin (`assertPlatformAdminDb`) |
| Client money | Rejected (`amount`, `amountMinor`, `fee`, `commission`, settlement amounts, self-verify) |
| Destinations | Masked labels only; long digit runs rejected |
| UI | Must not call Supabase / UEOS / booking helpers / orchestrator directly |
| Actions | Route booking through S4 orchestrator only |
| Secrets | Never rendered; safe projections omit `providerRef` / attestation refs from seller views |
| UEOS | Not posted from this capability; foundation booking helpers remain authoritative |

---

## Migration prerequisites

| Migration | Role | Remote status for this milestone |
| --- | --- | --- |
| `20260881` | Seller payout foundation booking | **Not assumed remote-applied** — local prerequisite for live booking path |
| `20260882` | Seller payout read model | **Not assumed remote-applied** |
| `20260883` | Settlement/payout reconciliation reads (as applicable) | **Not assumed remote-applied** |
| `20260896` | Live destinations + executions + admin/seller RPCs | **Local only — not remote-applied** |

Remote apply of these migrations requires an **explicit separate GO**. This milestone did not apply them remotely.

---

## Independence from buyer payment / confirm

- Buyer Stripe payment adapter and capture path: **unchanged**
- `commerce_confirm_enabled`: **unchanged** (remains off until separate Stripe E2E GO)
- Live claim payout path does not enable buyer confirm

---

## Production enablement (high level)

See runbook. Summary:

1. Remote-apply prerequisite migrations only on explicit GO.
2. Configure gate env names (values via secure host secrets — not in git).
3. Keep gate OFF until ops drill PASS.
4. Enable only with ACK + provider `manual_ops_live` + explicit production decision.
5. Never enable Stripe Connect / Wise / PayPal in V1.

---

## Rollback / emergency gate-off

Set `SELLER_LIVE_PAYOUTS_ENABLED` off (or remove ACK). Live request/attest controls disable; foundation ledger states remain. Details in the runbook.

---

## Key files

```
lib/store/sellerLivePayout/
app/actions/storeSellerLivePayout.ts
app/actions/storeAdminLivePayout.ts
app/components/store/AdminLivePayoutQueue.tsx
app/components/store/AdminLivePayoutAttestForm.tsx
app/components/store/LivePayoutGateBadge.tsx
app/components/store/SellerPayoutDestinationForm.tsx
app/components/store/SellerPayoutRequestButton.tsx
app/components/store/SellerPayoutEligibility.tsx
app/admin/store/payouts/page.tsx
app/seller/store/page.tsx
supabase/migrations/20260896_store_seller_live_payout_provider_v1.sql
```
