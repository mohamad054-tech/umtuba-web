# Session Handoff

## Active milestone

`commerce.seller_live_payout_provider_v1` (Slices S1–S8)

Status: **COMPLETE (code + docs)** — Manual Ops Live seller payout path implemented and documented; production gate remains **OFF**; **no real payout performed**; migration `20260896` **not remote-applied**.

## Source of truth (this milestone)

- Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-seller-live-payout-provider-v1`
- Branch: `office/commerce-seller-live-payout-provider-v1`
- S7 tip / S8 base: `a77094f272df8178e422303b3e60d1cbac6bf7ae`
- Docs: `docs/store/implementation/SELLER_LIVE_PAYOUT_PROVIDER_V1.md`
- Runbook: `docs/store/operations/SELLER_LIVE_PAYOUT_PROVIDER_RUNBOOK_V1.md`

Desktop remains the sole active Commerce workstation. Laptop Commerce work stays stopped (Learning).

## What shipped (S1–S7)

- S1 gate + provider port
- S2 migration `20260896` (local)
- S3 Manual Ops Live provider + destination/execution helpers
- S4 orchestrator (submit / attest / confirm-fail)
- S5 seller + admin server actions
- S6 admin durable live queue UI
- S7 seller destination + request UI
- S8 documentation + AI handoff closeout

## Money flow

capture → settlement RELEASED → payout submit → IN_TRANSIT → Manual Ops attestation → confirm or fail

Uncertain / `succeeded_pending_confirm` require reconciliation — **no auto-fail**.

## Current safety gates

- `SELLER_LIVE_PAYOUTS_ENABLED` default OFF (fail-closed)
- `commerce_confirm_enabled = 0`
- Stripe production gate code fail-closed; Stripe live environment not configured for payouts
- Stripe Connect / Wise / PayPal remain unsupported for live seller payouts
- Manual Ops Live has **no bank API network call** in V1
- Buyer Stripe payment path unchanged

## Migrations

| Migration | Role | Remote |
| --- | --- | --- |
| `20260881–83` | Payout foundation / read / recon prerequisites | Not assumed applied — explicit GO only |
| `20260896` | Live destinations + executions | **Local only — not remote-applied** |
| Remote verified chain | `20260822/23/24/77/84–95` | Unchanged by this milestone |

## Remote project (unchanged)

- Supabase project: `umtuba`
- Project ref: `tgucwnjwoyeqoxqaxmew`

## Exact next steps (separate GOs)

1. Do **not** auto-start another milestone from this closeout.
2. When ready: explicit remote-apply GO for `20260881–83` (if still needed) then `20260896`.
3. Controlled Manual Ops Live drill with gate still carefully managed.
4. Separate track remains: Stripe production env → gate audit → E2E → consider `commerce_confirm`.
5. Do **not** enable live payout gate, perform real payouts, or enable Connect/Wise/PayPal without explicit GO.

## Deferred / out of scope for V1

Bank API network transfers; Stripe Connect; Wise; PayPal; second payout ledger; client-trusted money; auto-fail on uncertain.

## Coordination

Desktop-only Commerce. Follow `docs/DEVELOPMENT_WORKFLOW.md`. Full earlier checkpoint: `docs/store/operations/COMMERCE_CURRENT_STATE_2026-08-02.md`.
