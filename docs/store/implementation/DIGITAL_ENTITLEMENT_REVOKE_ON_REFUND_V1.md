# Commerce Digital Entitlement Revoke on Refund V1

Capability: `commerce.digital.entitlement_revoke_on_refund_v1`  
Branch: `office/commerce-digital-entitlement-revoke-on-refund-v1`  
Migration (local only): `20260889_store_digital_entitlement_revoke_on_refund_v1.sql`

Depends on:

- Post-Capture Digital Entitlement Grant V1 (`store_digital_entitlements` status `active`/`revoked`)
- Full Order Refund Path V1 (`applyFullOrderRefund`)
- Payment Outcome Sync V1 (trusted `refunded` outcome)

## Purpose

After a trusted **full-order** refund is finalized, revoke buyer digital entitlements for that payment attempt so delivery mint / list paths fail closed.

## Lifecycle

1. Refund ops (or other trusted caller) runs `applyFullOrderRefund`.
2. Settlement unwind + Sync `refunded` succeed (existing path).
3. `revoke_store_digital_entitlements_after_refund` sets all active entitlements for the attempt to `status=revoked` (+ `revoked_at`).
4. Buyer list RPC continues to return only `active` rows; mint rejects non-`active`.

## Module

| Layer | Path |
| --- | --- |
| SQL RPC | `revoke_store_digital_entitlements_after_refund` |
| Idempotency | `store_digital_entitlement_revoke_events` |
| TS | `lib/store/digitalEntitlementRevoke.ts` |
| Wire-in | `applyFullOrderRefund` success + Sync replay paths |

## Guarantees

- Revoke only after a trusted `refunded` Sync outcome exists
- Fail closed if any `active` entitlement remains after revoke/replay
- Idempotent via revoke `event_key` = `${captureEventKey}:entitlement:revoke`
- Physical-only / no-entitlement orders succeed with `entitlements_revoked=0`
- Service-role execute only; no authenticated client writes
- Refund orchestration fails closed when revoke hard-errors (retry heals via replay path)

## Out of scope

- Partial refunds / line-level revoke
- Stripe/PSP refund rail adapters
- Payout clawback, commission redesign, settlement redesign
- Delivery mint redesign (already requires `active`)
- CDN, Learning/AI/Home/Creator/Navigation
