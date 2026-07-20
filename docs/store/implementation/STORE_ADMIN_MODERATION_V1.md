# Store Admin Moderation Console V1

Status: implemented in `umtuba-web`  
Migration: `supabase/migrations/20260809_store_admin_moderation_foundation_v1.sql`

## Scope

In-app operator console for platform admins to process:

1. Seller applications (approve / reject with reason / suspend)
2. Product moderation (approve only in V1)

**Out of scope:** checkout, orders, payments, shipping, payouts, Storage media
upload, product reject/return-for-revision UI, Ads/Search/Watch changes.

## Architecture

```
/admin/store/* (platform admins only)
  → requireAdminStoreSession → assertPlatformAdminDb (is_platform_admin RPC)
  → Server Actions (app/actions/storeAdmin.ts)
  → lib/store/adminReview + adminQueries
  → SECURITY DEFINER RPCs (admin_*)
       require_platform_admin() → lifecycle updates
```

No `SUPABASE_SERVICE_ROLE_KEY` in the Next.js app. Privileged work uses
`SECURITY DEFINER` RPCs gated by `public.require_platform_admin()`, matching
the Ads Admin Review Foundation pattern.

Legacy automation RPCs remain **service_role only**:

- `approve_seller_application`
- `reject_seller_application`
- `suspend_seller_application`
- `approve_store_product`

## Routes

| Route | Purpose |
| --- | --- |
| `/admin/store` | Queue counts + links |
| `/admin/store/sellers` | Seller application queue + actions |
| `/admin/store/products` | Product moderation queue + approve |

`/admin` is already in `PROTECTED_PREFIXES`. Pages additionally require
`is_platform_admin` via DB RPC. No public nav links to this console.

## Authorization

| Layer | Rule |
| --- | --- |
| DB | Row in `public.platform_admins` via `require_platform_admin()` |
| Next.js | `requireAdminStoreSession` / action `requirePlatformAdmin` |
| Browser | Never receives service-role credentials |

## RPCs reused / added

| New platform-admin RPC | Mirrors |
| --- | --- |
| `admin_approve_seller_application` | `approve_seller_application` |
| `admin_reject_seller_application` | `reject_seller_application` (+ required note) |
| `admin_suspend_seller_application` | `suspend_seller_application` |
| `admin_approve_store_product` | `approve_store_product` (+ awaiting-moderation + store eligibility) |
| `admin_store_moderation_queue_counts` | — |
| `admin_list_seller_applications` | — |
| `admin_list_store_products_for_moderation` | — |

Guards updated so platform admins (in addition to `service_role`) may set
store verification and product moderation transitions.

## Supported actions

### Seller applications

- **Approve** — creates verified active store + owner membership; marks application approved
- **Reject** — requires reason (≥3 chars); stores `review_note`
- **Suspend** — pending or approved; suspends linked store when present

### Products

- **Approve** — only when all of the following hold:
  1. Product `status in ('in_review','pending_review')` and `moderation_status='pending'`
  2. Owning store `status = 'active'` and `verification_status = 'verified'`
- On success: product becomes `active` + `moderation_status='approved'`
- On ineligible store: raises `Store is not eligible for product approval` and
  **does not update** the product row

## Store eligibility and queue behavior

**Chosen approach (safer / simpler): exclude from the approvable queue.**

| Surface | Behavior |
| --- | --- |
| Pending product count | Only products whose store is `active` + `verified` |
| Pending / approvable list rows | Same eligibility filter — inactive, suspended, or unverified stores never appear as approvable |
| Approved / rejected history filters | Still list historical rows even if the store later becomes suspended |
| `admin_approve_store_product` | Re-checks eligibility under row locks; blocked approvals leave product state unchanged |

Restore a suspended store (ops) before its in-review products reappear in the
pending queue.

## Known limitations

1. **Product reject / return-for-revision** shipped in
   `STORE_HARDENING_V1.md` (`20260818_store_hardening_v1.sql`).
2. **Media preview / Storage upload** shipped in Store Hardening V1
   (`store-product-media` bucket).
3. Migration must be applied to the target database before the console can load
   queues (local/remote apply is an ops step — not done by this implementation).
4. **Store review audit events** (append-only reviewer log, Ads-style) remain a
   follow-up — V1 records `reviewed_at` / `review_note` on seller applications
   only; product approve has no dedicated audit table.
5. Checkout / payments / shipping remain unavailable.

## Rollback / manual recovery

If this migration must be rolled back after apply:

1. Drop the new admin RPCs:
   - `admin_approve_seller_application`
   - `admin_reject_seller_application`
   - `admin_suspend_seller_application`
   - `admin_approve_store_product`
   - `admin_store_moderation_queue_counts`
   - `admin_list_seller_applications`
   - `admin_list_store_products_for_moderation`
2. Restore prior trigger function bodies for
   `guard_store_verification_self_service` and `guard_product_seller_lifecycle`
   from `20260728_store_product_foundation_v1.sql` (service_role-only bypass).
3. Do **not** drop legacy service_role RPCs
   (`approve_seller_application`, `approve_store_product`, …).

Manual recovery examples (service_role / SQL Editor only):

- Mistaken product approve → set product back to `in_review` / `pending` (and
  clear `published_at` if appropriate) via trusted ops SQL.
- Suspended store with stuck in-review products → restore store to
  `active` + `verified`, then approve via `/admin/store/products`.

## Manual QA checklist

1. Non-admin signed-in user visiting `/admin/store` is redirected away.
2. Signed-out user is sent to login with `next=/admin/store`.
3. Platform admin sees pending seller + product counts on overview.
4. Approve pending seller → store appears under `/seller/store` for that user.
5. Reject pending seller with empty reason → error; with reason → rejected + note.
6. Suspend approved seller → application suspended; linked store status suspended.
7. Approve in-review product on an active verified store → product becomes public.
8. Product on a suspended/unverified store does **not** appear in the pending
   queue; direct approve RPC would return a clear eligibility error and leave
   product state unchanged.
9. Double-submit Approve is disabled while pending (`aria-busy`).
10. Cart, wishlist, and public catalog still behave as before for non-admin users.

## Files

- `app/admin/store/**`
- `app/actions/storeAdmin.ts`
- `lib/store/adminAuth.ts`, `adminReview.ts`, `adminQueries.ts`
- `supabase/migrations/20260809_store_admin_moderation_foundation_v1.sql`
- `lib/store/storeAdminModerationFoundation.test.ts`
