# Cursor Report

## Summary

**PASS (uncommitted)** for `commerce.revenue.commission_policy_activation_v1` on `office/commerce-commission-policy-activation-v1` (base `d47f825`).

## Activation behavior

- Seeds active `store.launch.commission.v1` for UEOS fiat_minor: USD, EUR, ILS, JOD, SAR, AED, EGP
- Split: platform 10% / seller 85% / supplier 5%
- Skips currency when any active policy already exists (no overwrite)
- Rejects conflicting distinct active policy_code per currency
- Unsupported currencies remain fail-closed

## Migration

`20260887_store_commission_policy_activation_v1.sql` — **local only**, not applied remotely.

## Boundaries

No Stripe, no payout rails, no wallet mutations, no Commerce UI, no commit/push/merge, no remote apply.
