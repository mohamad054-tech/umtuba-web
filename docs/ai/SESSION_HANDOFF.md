# Session Handoff — UMTUBA

**Updated:** 2026-07-28

## Commerce program status

Consolidation complete. Implementation track active.

### Completed implementation

1. Storefront foundation
2. Cart & Checkout
3. Buyer Orders
4. Seller Orders Operations
5. Seller Catalog & Product Management
6. Seller Inventory & Reservation Visibility
7. Seller Dashboard & Operational Insights
8. Trading Domain Alignment & Integrity V1 (current) — `office/commerce-trading-domain-alignment-integrity-v1`

## Canonical trading path (code)

1. **Catalog Offer** — active `product_prices` (`amount_minor`, compare-at only when strictly greater)
2. **Cart Snapshot** — server `cart_items.unit_price_minor_snapshot` + currency (client prices rejected)
3. **Checkout Quote** — `create_store_checkout_quote` (TTL recreate; no client money)
4. **Order Snapshot** — `confirm_store_checkout_quote` freezes order / order_item money
5. **Payment State** — `orders.payment_status` (order existence ≠ paid)

Shared map: `lib/store/tradingContracts.ts` (`TRADING_PATH_SUMMARY`).

## Frozen architecture

Do not modify `docs/commerce/**` frozen foundations / Physical SAs / Manifesto.

## Next

Settlement/payout visibility when ledger is connected, or real payment-provider integration **only if explicitly requested**. No Warehouse / Shipping Network unless asked.
