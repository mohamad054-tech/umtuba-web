# Store Admin UI Foundation V1

Seller/admin interfaces for coupons, shipping configuration, fulfillment lifecycle, and dashboard counts — built on Promotions & Fulfillment Foundation V1.

## Scope

- Coupon management UI (`/seller/store/promotions`)
- Shipping providers / zones / rates UI (`/seller/store/shipping`)
- Order fulfillment panel on seller order detail
- Seller dashboard fulfillment cards with quick nav
- Additive list/dashboard RPCs (`20260816_store_admin_ui_foundation_v1.sql`)

## Out of scope

- Carrier API integrations
- Payment gateway changes
- Watch / Discover / Live / Messenger / Rewards / Ads / Search / Auth
- Remote migration apply (local Git only until operators apply)

## Routes

| Route | Purpose |
| --- | --- |
| `/seller/store` | Dashboard cards + links to promotions/shipping/orders |
| `/seller/store/promotions` | List/create/edit/activate coupons |
| `/seller/store/shipping` | Providers, zones, rates |
| `/seller/store/orders/[orderId]` | Coarse order detail + fulfillment lifecycle panel |

## Authorization

- All mutations use `requireStorePromotionsAdmin` (owner/manager or platform admin via DB).
- Promotions/shipping pages redirect non-managers to seller store (fail closed on direct URL).
- Rate upsert verifies zone and provider belong to the authenticated store before RPC.
- Coupon edit verifies coupon id belongs to store listing before upsert.
- Fulfillment/tracking/delivery actions rely on existing SECURITY DEFINER RPCs with store membership checks.
- List/dashboard RPCs enforce owner/manager (counts: any store member); EXECUTE revoked from PUBLIC/anon.

## Security hardening (review pass)

- `admin_upsert_shipping_rate` validates provider belongs to zone store, fee ≥ 0, currency, service type.
- Coupon admin payload strips type-inappropriate fields (free shipping cannot submit percent/fixed/max).
- Server validates campaign dates, usage limits, sort priority bounds before RPC.
- UI confirms deactivate/activate coupon and seller delivery confirmation.
- Terminal fulfillment states hide lifecycle/tracking mutation forms.

## UX states

- Loading: `aria-busy` + disabled submit buttons during transitions
- Empty: `StoreEmptyState` for coupons/providers/zones/rates
- Error: `StoreErrorState` + `aria-live="assertive"`
- Responsive: stacked forms on mobile; grid from `md`

## Migration notes

`20260816_store_admin_ui_foundation_v1.sql` adds:

- `store_shipping_providers.sort_priority`
- `admin_list_shipping_providers|zones|rates`
- `admin_coupon_targeting_summary`
- `seller_fulfillment_dashboard_counts`
- Replaces `admin_upsert_shipping_provider` with `p_sort_priority` (drops prior overload)

Until applied remotely, shipping list pages and dashboard counts will surface RPC errors / unavailable messaging; coupon and fulfillment mutation paths from `20260815` remain unchanged.

## Dependencies

- `20260815_store_promotions_fulfillment_foundation_v1.sql`
- Existing seller store shell and design tokens
