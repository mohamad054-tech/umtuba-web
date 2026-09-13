# UMTUBA_STORE_CJ_59_PRODUCTION_READINESS_V1

Unpublished production-ready Store **candidate** for the owner-approved 59 CJ products. Not live. Checkout off. CJ fulfillment off. Previous CJ API key treated as compromised — no live CJ calls this task.

## Status

```text
TASK_ID = UMTUBA_STORE_CJ_59_PRODUCTION_READINESS_V1
STATUS = COMPLETE
OWNER_VISUAL_APPROVAL = YES
APPROVED_PRODUCTS = 59
PRODUCTS_CURRENTLY_HEALTHY = 59 (last-known, NOT live-verified)
PRODUCTS_PRICE_REVIEW = 0 (last-known, NOT live-verified)
PRODUCTS_OUT_OF_STOCK = 0 (last-known, NOT live-verified)
PRODUCTS_PROVIDER_UNAVAILABLE = 0 (last-known, NOT live-verified)
PRODUCTS_SYNC_ERROR = 0 (last-known, NOT live-verified)
HERO_PRODUCTS = 15
STANDARD_PRODUCTS = 44
CATEGORY_MIX = Home 11 / Pet 16 / Car 9 / Travel 11 / Beauty / Personal 12
CJ_READ_SYNC = PENDING_KEY_ROTATION
CJ_ORDER_FULFILLMENT_ENABLED = false
LIVE_AUDIT = PENDING_KEY_ROTATION
PRODUCTION_DB_CHANGED = NO
PRODUCTION_CHANGED = NO
CJ_ORDER_CREATED = NO
PAYMENT_ACTION = NO
DEPLOYED = NO
PUSHED = NO
```

Authoritative catalog: `data/cj-store-launch-approved-59.json`  
Candidate file: `data/cj-store-launch-candidate-v1.json`  
Preview (isolated, not `/store`): `http://localhost:3000/sandbox/store/cj-launch`

## What this candidate is

Exactly the 59 owner-approved products (15 `LAUNCH_HERO` + 44 `LAUNCH_STANDARD`). No substitutions. No padding. Each row keeps provider identity (`cj`, `cj_product_id`, variant/SKU), launch classification, category, retail, stock, delivery estimate, provider availability, and `last_synced_at`.

Publication remains `draft` / `active=false` / `published_at=null` / `marketplace_eligible=false`. Hero products are featured-**eligible** only — still unpublished.

Customer UI shows only: title, description, images, retail price, availability, estimated delivery, category. Landed cost, margin, profit, CPA, and CJ internal IDs stay off customer HTML.

## Last-known sync statuses (NOT live-verified)

Classified from approved-59 economics with the 40% / $8 price-safety floor. Approved file had no pre-existing product flags.

Live CJ pre-deploy audit is **forbidden** until a **new rotated** server `CJ_API_KEY` is installed and `CJ_API_KEY_ROTATED=true`. Do not reuse the previous key.

## SERVER_ENV_REQUIRED (names only — no secrets)

Install on the server after key rotation. Never `NEXT_PUBLIC_` for CJ secrets.

- `CJ_API_KEY` — **NEW rotated** CJ API key only. Empty in `.env.example`.
- `CJ_API_KEY_ROTATED` — must be the literal `true` before any live read-sync. Default / current: `false`.
- `CJ_ORDER_FULFILLMENT_ENABLED` — must stay `false` (missing / empty / any non-`true` is false).
- `NEXT_PUBLIC_SITE_URL` — public site origin (already required by the app).
- `NEXT_PUBLIC_SUPABASE_URL` — existing Store/auth public URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — existing Store/auth publishable key.

Token cache path (gitignored, not an env var): `.local/cj/`

## First server-side CJ read-sync command

Manual, fail-closed, does **not** load `.env.local`:

```bash
npx tsx scripts/sandbox/run-cj-read-sync-candidate.ts
```

This task: `STATUS=PENDING_KEY_ROTATION`, `LIVE_CALLS=0`, `WRITE_CALLS=0`, exit 2.

After a rotated key is installed **and** `CJ_API_KEY_ROTATED=true`, the same command still does not hit CJ in this candidate (`AUTHORIZED_NOT_EXECUTED_IN_THIS_TASK` until a later explicit live-sync task). Fulfillment remaining true would still be read-only.

Scheduled entry (not activated, no cron):

```bash
npx tsx scripts/sandbox/run-cj-scheduled-read-sync.ts
```

Rebuild last-known candidate JSON from approved-59 (no CJ network):

```bash
npx tsx scripts/sandbox/run-cj-production-candidate.ts
```

## Price safety

If supplier/landed cost rises so projected gross margin is under 40% or gross profit is under $8 (800 minor): flag `PRICE_REVIEW`. Keep current retail. Do not auto-lower profit. Do not auto-publish.

Admin/internal sync enum: `HEALTHY | PRICE_REVIEW | OUT_OF_STOCK | PROVIDER_UNAVAILABLE | SYNC_ERROR`.

Unavailable CJ item → UMTUBA item unavailable. Known zero stock must not be sold.

## Fulfillment / payments

`attemptCjFulfillmentWrite()` always throws (even if the flag is mistakenly `true` in this candidate). Tests prove no write while the flag is false, and no write if it is true. CJ order paths stay disabled. Real payment capture was not enabled or changed.

## Schema

Existing live `store_products` has no provider/sync columns. Candidate SQL only:

`supabase/candidates/20260909_store_cj_provider_identity_v1.sql`

Kept **outside** `supabase/migrations/` so it cannot be applied by a normal migrate. **Do not apply to production.**

## Preview

- Listing: `http://localhost:3000/sandbox/store/cj-launch`
- Detail: `http://localhost:3000/sandbox/store/cj-launch/pet-stainless-steel-water-bowl-large-capacity-fl-2ff2f30e`
- Category: `?category=Pet`
- RTL: `?dir=rtl`
- Admin overlay: `?admin=1` (economics + last-known `sync_status`)

Uses existing StoreShell / ProductCard. No live `/store` mix-in. Wishlist/checkout off on the sandbox cards.

## Deployment checklist (owner GO later — not this task)

1. Rotate the compromised CJ API key at the provider. Discard the old key.
2. Install the **new** key as server-only `CJ_API_KEY`. Set `CJ_API_KEY_ROTATED=true` only after that install.
3. Confirm `CJ_ORDER_FULFILLMENT_ENABLED=false` on every environment.
4. Confirm no `NEXT_PUBLIC_` CJ secrets.
5. Re-run `npx tsx scripts/sandbox/run-cj-read-sync-candidate.ts` (still read-only; live fetch is a later explicit task).
6. After rotation, run a **new** live read-only audit task and replace last-known statuses with live-verified counts.
7. Review any `PRICE_REVIEW` / `OUT_OF_STOCK` / `PROVIDER_UNAVAILABLE` / `SYNC_ERROR` before publish.
8. Apply `supabase/candidates/20260909_store_cj_provider_identity_v1.sql` only after owner GO, locally first, then production via the normal migration process — not this task.
9. Load the 59 rows as **draft/inactive** Store products. Do not overwrite unrelated UMTUBA products. Do not substitute.
10. Keep checkout and CJ fulfillment disabled for the first Store publish unless a later task explicitly enables them.
11. Do not commit `.env.local` or `.local/cj/*`.
12. Owner visual re-check of `/sandbox/store/cj-launch` (listing, detail, mobile, RTL) before any live `/store` publish.
13. Only then: explicit owner deployment GO.

## Post-deploy Store smoke checklist (after a future GO)

- Live `/store` listing count and mix match the approved 59 (or the then-current published subset).
- Product detail: title, images, retail, availability, delivery, category only.
- Customer HTML has no landed/margin/profit/CPA/CJ ids.
- Hero featured placement only for the 15 `LAUNCH_HERO` SKUs if featured is turned on.
- Arabic/RTL and mobile/desktop layout on listing + detail.
- Category filters: Home / Pet / Car / Travel / Beauty.
- Zero-stock and provider-unavailable items cannot be purchased.
- No CJ order created. Fulfillment flag still false.
- Payments unchanged / not capturing for these drafts unless a later payments task says so.

## Rollback plan

- Candidate is unpublished: leave `/store` as-is (this task never published).
- Do not apply the candidate SQL. If it were applied later, drop the new nullable columns/index/checks only after confirming no live rows depend on them.
- Keep `CJ_ORDER_FULFILLMENT_ENABLED=false`.
- Unset `CJ_API_KEY_ROTATED` and remove the server key to fail-close read-sync.
- Sandbox preview can fall back to `data/cj-store-launch-approved-59.json` if the candidate JSON is removed.
- Do not delete existing non-CJ UMTUBA products.

## Gates (this task)

- Exactly 59 — PASS
- `npx tsc --noEmit` — PASS
- `npx vitest run lib/services/cj` — PASS (43)
- `npm run build` — PASS (routes include `/sandbox/store/cj-launch`)
- Store listing / detail / RTL HTTP 200; live `/store` has no sandbox mix-in — PASS
- Mobile: existing responsive StoreShell + `sm:grid-cols-2` / `lg:grid-cols-4` — PASS
- CJ read-sync fail-closed without rotated key — PASS
- Secret scan — PASS (test placeholders only; no real key in git-tracked source/history)
- CJ order-write gate disabled — PASS
- `git diff --check` — PASS
- Production DB / deploy / push / commit — not done
