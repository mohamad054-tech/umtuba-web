# Store Analytics & Finance Foundation V1

Seller-facing reporting and accounting groundwork on authoritative order rows.

## Scope

- Financial metric definitions (`lib/store/analyticsFinance.ts`)
- Seller analytics RPCs (`20260817_store_analytics_finance_foundation_v1.sql`)
- Seller route `/seller/store/analytics`
- Finance placeholder models (not configured — no invented fees or payouts)

## Out of scope

- Real seller payouts, bank transfers, gateway settlement, tax filing, invoices
- Payment attempt–based revenue (duplicate-safe: uses `orders` only)
- Buyer PII in aggregates (no buyer_id in RPC outputs)

## Financial metric definitions

| Metric | Source | Notes |
| --- | --- | --- |
| Gross merchandise value | `sum(subtotal_minor)` on paid, non-cancelled/refunded orders | Provisional. `subtotal_minor` is pre-discount merchandise total. |
| Merchandise subtotal | Same as GMV in V1 | Provisional |
| Discounts | `sum(discount_total_minor)` on realized paid orders | Provisional |
| Shipping charged | `sum(shipping_total_minor)` | **Pass-through** — not seller merchandise revenue |
| Taxes charged | `sum(tax_total_minor)` | **Pass-through** — not seller merchandise revenue |
| Refunds | `sum(grand_total_minor)` on refunded orders | Finalized per order/payment status. V1 supports full-order refund accounting only (no partial-refund split). |
| Net sales (provisional) | `(sum(subtotal_minor - discount_total_minor) on realized paid orders) - (same expression on refunded orders)` | Provisional, floor at 0 |
| Paid / unpaid / cancelled / returned / refunded counts | Order + fulfillment authoritative state | See RPC |

**Realized paid order:** `payment_status = 'paid'` AND `status NOT IN ('cancelled','refunded')`.

**Unpaid/pending:** `payment_status IN ('pending','authorized')` AND not cancelled/refunded.

**Refunded:** `payment_status = 'refunded'` OR `status = 'refunded'`.

## RPCs

All require auth + `is_store_member_with_role(store_id, ['owner','manager'])` or platform admin.

| RPC | Purpose |
| --- | --- |
| `seller_analytics_summary` | KPI totals JSONB |
| `seller_analytics_order_status_counts` | Status breakdown |
| `seller_analytics_sales_series` | Daily UTC buckets |
| `seller_analytics_top_products` | Top N products (limit ≤ 50) |
| `seller_analytics_coupon_performance` | Coupon redemptions on paid orders |
| `seller_analytics_fulfillment_summary` | Lifecycle counts + avg ship→deliver |
| `seller_analytics_refunds_returns` | Refunds/returns summary |

Date range: UTC, max 366 days, `p_from` inclusive / `p_to` exclusive pattern in queries.
Daily bucket series also follows exclusive `p_to`; boundary day uses `p_to - 1 microsecond` so adjacent ranges do not double-count a day.

Multi-currency safety: analytics fail closed when more than one order currency appears in the selected period (no conversion and no mixed-currency sums).

## Finance foundation (future)

`FINANCE_FOUNDATION_PLACEHOLDER` documents platform commission, net proceeds, processing fees, reserves, adjustments, settlement periods, and payout status — analytics surfaces remain **not configured** until explicitly approved.

Trusted calculation SSOT (no active commercial rates seeded): `commerce.revenue.commission_policy_foundation_v1` (`COMMISSION_POLICY_FOUNDATION_V1.md`).

## UI

- Route: `/seller/store/analytics`
- Period presets: 7 / 30 / 90 days
- Graceful unavailable banner when migration not applied
- Accessible tables (no chart dependency)

## Dependencies

- `20260811` orders / order_items
- `20260812` checkout / coupon redemptions
- `20260815` fulfillments (fulfillment summary)
- Apply `20260817` locally/remotely before RPCs work in production
