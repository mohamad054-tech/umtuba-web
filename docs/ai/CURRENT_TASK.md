# Current Task

## Task title

Commerce Marketplace Listing Provenance Hardening V1

## Status

`implementation-complete-local` — tests + tsc green; awaiting manual review / trailer-free commit / push / migration apply GO

## Worktree (USE THIS TOMORROW)

`C:\Users\Admin\Desktop\umtuba\umtuba-web-commerce-listing-provenance-v1`

## Branch

`office/commerce-marketplace-listing-provenance-hardening-v1`

## Base / HEAD

`6cbe0f68f418141ac887c99bf40e21eb1d0d27de`  
(`office/commerce-end-to-end-beta-readiness-v1` tip — not advanced; all work is uncommitted)

## Machine policy

- **This laptop = Commerce only**
- Desktop = sole AI source of truth
- Do **not** continue AI / Tutor / Gemini / Provider work on this laptop
- Do **not** checkout inside the dirty AI worktree

## Delivered (uncommitted)

- Migration (local only): `20260875_store_marketplace_listing_provenance_hardening_v1.sql`
- Wishlist `seller_listing_id` persist + fail-closed reload enrichment
- Id-PDP `?listing=` resolve to seller storefront (no silent owned fallback)
- UI passes `sellerListingId` (ProductCard / PDP / wishlist)
- Docs: `docs/store/implementation/LISTING_PROVENANCE_HARDENING_V1.md`
- Tests: focused Commerce suites **71 passed**; `tsc --noEmit` **pass**
- `node_modules` = **junction** → `C:\Users\Admin\Desktop\umtuba\umtuba-web\node_modules`  
  (do not `npm install` / `npm ci` blindly while shared)

## Forbidden / deferred

- Commit / push / remote migration apply without GO
- `npm run build` (skipped; optional later)
- Payment / shipping carrier / commission / affiliate / supplier portal / AI

## Next GO options (tomorrow)

1. Manual review + trailer-free commit
2. Push branch
3. Apply migration `20260875` only (targeted SQL + repair) — separate GO

## Do NOT open for Commerce work

`C:\Users\Admin\Desktop\umtuba\umtuba-web`  
→ AI branch `office/learning-ai-tutor-thread-lesson-binding-v1` @ `9e90448` with dirty AI files — leave untouched
