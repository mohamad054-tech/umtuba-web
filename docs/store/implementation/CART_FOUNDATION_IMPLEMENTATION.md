# Cart Foundation Implementation (Phase 3C)

Status: implemented in `umtuba-web`  
Migration: `supabase/migrations/20260729_store_cart_foundation_v1.sql`

## Scope

Secure cart foundation for UMTUBA Store:

- Active cart per user per currency
- Cart line items with server-side price snapshots
- Inventory-aware quantity rules
- Buyer-only RLS
- Product detail Add to Cart + `/store/cart` UI

**Out of scope:** checkout, orders, payments, shipping, taxes, coupons, payouts.

## Database objects

### Tables

| Table | Purpose |
| --- | --- |
| `carts` | Buyer cart header (`user_id`, `status`, `currency`) |
| `cart_items` | Lines with quantity + price/title/media snapshots |

### Constraints

- Unique **one active cart per user per currency**
- Unique **variant per cart**
- `quantity > 0` (and ≤ 9999)
- Currency format checks
- Item currency must match cart currency (trigger)
- Fail-closed FKs to users, variants, stores

### Helpers

- `owns_active_cart(cart_id)` — security definer ownership check for RLS

## RLS summary

| Actor | Access |
| --- | --- |
| Anonymous | None |
| Authenticated buyer | Read/write **own active** cart + items only |
| Store seller / viewer / manager | **No** cart access via membership (ownership is `user_id` only) |
| Service role | Bypasses RLS for administrative recovery |

Soft-status carts: buyers cannot `DELETE` cart rows (items may be deleted/cleared).

## Domain modules

| Module | Role |
| --- | --- |
| `lib/store/cartRules.ts` | Pure eligibility, merge, currency, summary rules |
| `lib/store/cart.ts` | Supabase-backed cart mutations/queries |
| `app/actions/storeCart.ts` | Server actions |

### API

- `addToCart` — validates product/variant/price/inventory; server price snapshot; merges duplicate variants
- `updateCartQuantity`
- `removeCartItem`
- `clearCart`
- `getActiveCart`
- `getCartSummary`

### Rules enforced server-side

1. Only active store + active + approved product
2. Only active variant + active price
3. Quantity cannot exceed available stock unless backorder allowed
4. Client cannot choose price (`unit_price_minor_snapshot` from DB)
5. Cross-currency mixing rejected
6. Ownership checked before mutate

## Routes / UI

| Route / component | Purpose |
| --- | --- |
| `/store/cart` | Cart page (auth required) |
| `CartIconButton` | Nav badge with item count |
| `CartView` | Grouped by store, qty controls, remove, subtotal |
| Product detail | Enabled **Add to Cart** |

Checkout button disabled: **Checkout coming next**.

Auth: `/store/cart` added to `PROTECTED_PREFIXES` (public `/store` remains open).

## Rate limiting

No project-wide action rate-limit convention exists for store mutations (referral limits are domain-specific SQL). Cart mutations rely on auth + RLS + server validation. A shared rate-limit utility can be added later without schema changes.

## Tests

`lib/store/cartFoundation.test.ts` covers:

- Own-cart isolation / seller-viewer denial
- Server price snapshot behavior
- Inactive product / unavailable variant rejection
- Overstock rejection (+ backorder allow)
- Duplicate variant quantity merge
- Cross-currency rejection
- Summary totals / grouping
- Corrupted quantity inputs

Auth gate: `/store/cart` protected, `/store` public.

## Limitations / TODOs

1. Apply migration to Supabase before live cart use
2. Checkout / order creation next phase
3. Multi-currency simultaneous active carts with empty unused carts cleanup
4. Reserved inventory on add (currently availability check only; no reservation ledger)
5. Optional shared rate-limit helper if platform convention is introduced
6. Guest/anonymous carts not supported (auth required)
