# Commerce Current State — 2026-08-02

Authoritative Commerce checkpoint after SoT unification, remote Wave A / money / stock apply, and commission seed+activate. Documentation only.

---

## Source of truth

| Field | Value |
| --- | --- |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-sot-unification-stock-drift-v1` |
| Branch | `office/commerce-sot-unification-stock-drift-v1` |
| Base implementation HEAD (before docs commit) | `91e90e456971f498b7b8f9382dda9b609da7ef3d` |
| Desktop | Sole active Commerce workstation |
| Laptop | Commerce work stopped; assigned to Learning |

---

## Unification

- Money and inventory histories were unified.
- 20 laptop inventory commits were integrated.
- 29 focused files / 276 tests PASS.
- `tsc --noEmit` PASS.
- Secret scan CLEAN.
- No default commission seed introduced during unification.

---

## Remote project

| Field | Value |
| --- | --- |
| Supabase project | `umtuba` |
| Project ref | `tgucwnjwoyeqoxqaxmew` |

---

## Remote migrations verified

- `20260822`
- `20260823`
- `20260824`
- `20260877`
- `20260884`
- `20260885`
- `20260886`
- `20260887`
- `20260888`
- `20260889`
- `20260890`
- `20260891`
- `20260892`
- `20260893`
- `20260894`
- `20260895`

---

## Remote capabilities closed

- Taxonomy seed: 12 launch categories
- Seller listing create hardening
- Transactional commerce notifications
- Refund operations
- Commission decomposition and activation
- Inventory availability, reservation, decrement, restock and cancellation safety
- Digital entitlement grant and revoke
- Settlement foundation

---

## Active commission policy

| Field | Value |
| --- | --- |
| policy_code | `umtuba_launch_usd_v1` |
| version | `1` |
| currency | `USD` |
| basis | `merchandise_net` |
| platform | `1500` bps |
| seller | `8500` bps |
| supplier / affiliate / partner | `0` |
| policy_rows | `1` |
| active | `1` |

---

## Current safety gates

- `commerce_confirm_enabled = 0`
- Stripe production gate code is fail-closed
- Stripe live environment is not configured
- No live payout provider
- Payout rails remain mock/manual

---

## Exact next Commerce step

1. Provision Stripe production environment externally:
   - HTTPS app URL
   - `STRIPE_MODE`
   - live secret key
   - publishable key
   - webhook endpoint and signing secret
   - `STRIPE_LIVE_PAYMENTS_ENABLED`
   - production ACK
2. Re-run Stripe Production Gate Readiness Audit.
3. Require `READY_FOR_STRIPE_LIVE_TEST`.
4. Run controlled Stripe E2E drill.
5. Only after a full PASS, consider controlled `commerce_confirm` enable.

---

## Deferred / post-launch

- Remote payout foundations `20260881–83`
- Real payout provider
- Monitoring / load / security hardening
- Partial refunds
- Email / SMS / push
- Additional performance work

---

## Stop conditions

- Do not enable `commerce_confirm` before Stripe E2E PASS.
- Do not place secrets in Git.
- Do not print Stripe keys.
- Do not seed another commission policy without an explicit commercial GO.
- Do not resume Commerce work on the laptop.
