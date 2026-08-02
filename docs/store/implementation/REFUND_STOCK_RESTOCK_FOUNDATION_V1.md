# Refund Stock Restock Foundation V1

Capability: `commerce.inventory.refund_stock_restock_foundation_v1`
Branch: `office/refund-stock-restock-foundation-v1`
Base: `c3cbe9f0e5d16df9b78b35ad441a79f0e9ad200d` (`origin/office/purchase-stock-decrement-runtime-v1`)

## Repository audit (commitment point)

| Stage | Restocks `on_hand`? | Evidence |
| --- | --- | --- |
| Cancel / reservation release | **No** — `reserved -=` only | Commerce Safety release RPCs |
| Trusted payment capture | Decrements finite stock | `decrement_store_purchase_stock_after_capture` |
| Trusted Sync `refunded` | **Runtime:** `restock_store_purchase_stock_after_refund` | See `REFUND_STOCK_RESTOCK_RUNTIME_V1.md` |
| Entitlement revoke | Access only | `revoke_store_digital_entitlements_after_refund` |
| Partial refund | **Forbidden** | Full Order Refund Path contracts |
| Stripe webhook today | Capture sessions only | No `charge.refunded` handler |

**Chosen commitment:** `trusted_payment_refund` (after Sync `refunded`).
**Runtime wire-in:** after Sync in `applyFullOrderRefund`, before entitlement revoke — not at cancel/ops approve.

## Restock model (contract only)

Finite (`physical` / `booking`) with proven prior purchase-stock decrement:

1. Movement: `return_increment` — `deltaOnHand = +qty`, `deltaReserved = 0`
2. Quantity source: prior purchase decrement / consumed reservation qty only
3. `applied` / `recorded` always `false`

Unlimited (`digital` / `service` / `subscription` / `bundle`): **noop**.
Prior purchase-stock noop: **noop** (do not invent stock).
Missing prior decrement evidence: **fail closed**.

## Idempotency (contract)

- `${captureEventKey}:purchase_stock:restock`
- `${captureEventKey}:purchase_stock:restock:{reservationId}`

Persisted uniqueness + replay no-op are implemented by Runtime migration `20260894`.

## Scope

- Owns: commitment guard, relation checks, prior-decrement prerequisite, return_increment projection, read-row normalize, presentation copy, client-execution reject
- Does **not** own: apply RPC, migration, cancel restock, partial restock, refund money path

## Out of scope (Foundation)

Runtime apply (see Runtime doc), warehouses, supplier sync, preorder/backorder, shipping, pricing, AI/Learning/Navigation/Home.
