# PC2-A1 Store Finalize and Runtime Close V2

```text
TASK_ID = PC2_A1_STORE_FINALIZE_AND_RUNTIME_CLOSE_V2
OWNER = STORE FINAL RELEASE
DATE = 2026-08-15
DEVICE = PC2
MODE = EXECUTION / CLOSE_BLOCKERS
CENTRAL_COORDINATOR = SERVER
BRANCH = office/platform-translation-trunk-port-v1
```

## Final fields

```text
STORE_PREVIOUS_HEAD = 2a146bb089e0ca94da0b793197edc448da462dea
STORE_FINAL_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
STORE_DELTA_PRESERVED = YES — docs/ai/PC2_A1_V2_STORE_DELTA.patch (30,744 bytes, 17 Store files) written before commit; working tree left intact; commit then push succeeded
COMMIT_CREATED = YES — b3c05d8 feat(store): contain sandbox catalog and close storefront release gaps
PUSHED_FOR_CENTRAL = YES — origin/office/platform-translation-trunk-port-v1 72190b6..b3c05d8 (includes two pre-existing local SAVE_ALL ancestors 8185778 and 2a146bb plus the Store commit)
TESTS = TARGETED_PASS 74/74 (sandboxCatalog, storefrontDeriveSections, storeHardeningFoundation, wishlist, cartFoundation, cartCheckoutExperience, buyerOrdersExperience, shellCoherence)
TYPESCRIPT = PASS — npx tsc --noEmit exit 0
BUILD = PASS — npm run build (Next.js 16.2.10 Turbopack). Pre-existing Translation Studio NFT warning unrelated
AUTH_CART = NOT_EXECUTED — no signed-in credentials in repo/docs; guest /store/cart → /login?next=/store/cart on both production and local source
AUTH_CHECKOUT = NOT_EXECUTED — same blocker; guest /store/checkout → /login?next=/store/checkout
AUTH_ORDERS = NOT_EXECUTED — same blocker; guest /store/orders → /login?next=/store/orders
1024_VISUAL = EXECUTED_UNAUTH — Playwright (system Chrome) at 1024×768. overflowX=0 on production and local source for /store, /store/search, sandbox URLs, and forced RTL. Gold store chrome present. Not an authenticated purchase-surface pass
RTL_LTR = SOURCE_IMPROVED + UNAUTH_VISUAL — logical insets / dir=auto / RTL hero gradient in committed source. Playwright dir=rtl overflowX=0 at 360/1024/1440. Arabic site chrome observed. English punctuation can lead in RTL (".Try another…", 404 period flip). Not a full bilingual audit
SANDBOX_SOURCE_STATE = CONTAINED — local `next start` @ :3011 on SHA b3c05d8: /store and /store/search have no UMTUBA_E2E merchandising; /store/umtuba-e2e-20260721 and /product/e2e-simple-mug render Next 404 UI
SANDBOX_PRODUCTION_STATE = PARTIAL_LEAK — https://umtuba.com still merchandises "UMTUBA_E2E_20260721 Category" on home HTML and search filters (1024/1440). Direct sandbox store/PDP URLs currently show 404 UI. Production is not running b3c05d8
STORE_RELEASE_READY = NO
CENTRAL_DEPLOY_REQUIRED = YES — Store SHA is on origin; live umtuba.com is an older deploy. Containment cannot be PRODUCTION_FIXED until Central deploys this SHA
BLOCKERS = [AUTH_SESSION_ABSENT, PRODUCTION_SANDBOX_CATEGORY_STILL_MERCHANDISED, CENTRAL_DEPLOY_REQUIRED, AUTH_CART_CHECKOUT_ORDERS_FAVORITES_NOT_EXECUTED]
```

## Summary

Wave 1 Store Premium chrome (`dad5eb5`) was not redone. This V2 task preserved the uncommitted Store delta, committed it, pushed it for Central, then distinguished **SOURCE_FIXED** vs **PRODUCTION_FIXED**.

Preserve path (done first, before QA):

1. `git fetch --prune` — branch was ahead 2, behind 0. No pull. No divergence.
2. Recovery patch written to `docs/ai/PC2_A1_V2_STORE_DELTA.patch` listing all 17 intended Store files.
3. Unrelated dirty files (handoff docs, vitest logs, visual-QA worktrees, later sibling A2/A3 V2 reports, `.env.example`, `lib/android/`) were left out of the Store commit.
4. Smallest Store commit created and pushed.

Runtime close:

- Local production build of `b3c05d8` hides sandbox merchandising and 404s direct sandbox URLs.
- Live `https://umtuba.com` still shows the sandbox category on search (and in home HTML). Direct sandbox PDP/store URLs already 404 on production, but category leakage remains.
- Authenticated cart / checkout / orders / favorites were **not** executed. No test account exists in docs. Guest routes correctly send the buyer to login.

`docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md` were not overwritten.

## Exact files changed

Committed in `b3c05d8` (Store only):

- `lib/store/sandboxCatalog.ts` (new)
- `lib/store/sandboxCatalog.test.ts` (new)
- `lib/store/catalogQueries.ts`
- `lib/store/storefrontFlags.ts`
- `lib/store/storeHardeningFoundation.test.ts`
- `lib/store/storefrontDeriveSections.test.ts`
- `app/lib/storefront/deriveSections.ts`
- `app/store/search/page.tsx`
- `app/store/[storeSlug]/page.tsx`
- `app/store/[storeSlug]/product/[productSlug]/ProductDetailClient.tsx`
- `app/components/store/SearchFilters.tsx`
- `app/components/store/ProductCard.tsx`
- `app/components/store/WishlistButton.tsx`
- `app/components/store/HeroCarousel.tsx`
- `app/components/store/StoreCard.tsx`
- `app/components/store/CartIconButton.tsx`
- `app/components/store/storefront.css`

This V2 session also wrote (uncommitted, not part of the Store SHA):

- `docs/ai/PC2_A1_V2_REPORT.md` (this file)
- `docs/ai/PC2_A1_V2_STORE_DELTA.patch` (recovery)

Intentionally not committed: vitest logs, `worktrees/_store_visual_qa*`, `worktrees/_pc2_a1_v2_qa*`, sibling `PC2_A2_V2_REPORT.md` / `PC2_A3_V2_REPORT.md`, `CURRENT_TASK.md`, `CURSOR_REPORT.md`.

## Migrations created

None.

## Security review

- No secrets, `.env`, or service-role keys read or printed.
- No remote Supabase migrations applied.
- Sandbox containment is query/presentation filtering only. Remote E2E rows were not deleted. RLS unchanged.
- Default hide; opt-in `NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG=1`.
- Direct sandbox slugs 404 in the new source build via `getPublicStoreBySlug` / `getPublicProductDetail` returning null → `notFound()`.
- Commerce confirm gate, payments, and checkout contracts untouched.
- Wishlist/cart/order adapters untouched.
- Guest purchase surfaces redirect to login (`next=` preserved). No auth bypass observed.
- Store commit secret scan of staged diff: no matches.

## Tests

Pre-commit targeted Store suites:

```text
npx vitest run lib/store/sandboxCatalog.test.ts lib/store/storefrontDeriveSections.test.ts lib/store/storeHardeningFoundation.test.ts lib/store/wishlist.test.ts lib/store/cartFoundation.test.ts lib/store/cartCheckoutExperience.test.ts lib/store/buyerOrdersExperience.test.ts app/lib/nav/shellCoherence.test.ts
→ 8 files, 74 tests PASS
```

No post-commit product edits, so suites were not re-run after push.

Pre-existing `storeFoundation` Arabic-locale money flake was not re-claimed and money helpers were not touched.

## TypeScript

```text
npx tsc --noEmit
→ PASS (exit 0)
```

## Build

```text
npm run build
→ PASS (Next.js 16.2.10 Turbopack)
```

Pre-existing warning: Translation Studio NFT / `next.config.ts` import trace. Unrelated to Store.

Local runtime used for source probe: `npx next start -p 3011` against that build.

## git diff --check

```text
PASS on the Store commit (git diff --cached --check before commit: exit 0)
```

Working-tree `git diff --check` after push reports trailing whitespace in sibling-owned `docs/ai/CURRENT_TASK.md` (not this task; not committed).

## git status --short

At report time (HEAD `b3c05d8`, origin in sync 0/0):

```text
 M .env.example
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
 M vitest.config.ts
?? docs/ai/PC2_A1_REPORT.md
?? docs/ai/PC2_A1_V2_REPORT.md
?? docs/ai/PC2_A1_V2_STORE_DELTA.patch
?? docs/ai/PC2_A2_REPORT.md
?? docs/ai/PC2_A2_V2_REPORT.md
?? docs/ai/PC2_A3_REPORT.md
?? docs/ai/PC2_A3_V2_REPORT.md
?? lib/android/
?? app/.well-known/assetlinks.json/
?? worktrees/_pc2_a1_v2_qa/
?? worktrees/_pc2_a1_v2_qa_probe.cjs
?? worktrees/_store_visual_qa*
```

Plus leftover vitest logs. None of those are Store product files from this commit.

## Runtime QA (do not treat source PASS as production PASS)

### Production (`https://umtuba.com`) — current live deploy

| Surface | Result |
| --- | --- |
| `/store` | 200. HTML still includes visible `UMTUBA_E2E_20260721 Category` / `umtuba-e2e-20260721`. Playwright `sandboxVisibleText=true` at 360/1024/1440. overflowX=0 |
| `/store/search` | 200. 1024 screenshot shows filter chip **UMTUBA_E2E_20260721 Category**. No in-stock availability fieldset (old deploy) |
| Direct `/store/umtuba-e2e-20260721` and `/product/e2e-simple-mug` | HTTP 200 + generateMetadata title uses the slug; **visible UI is Next 404** (`h1=404`) |
| `/store/cart`, `/checkout`, `/orders`, `/wishlist` | Redirect to `/login?next=…` |

### Local source (`http://127.0.0.1:3011`, build of `b3c05d8`)

| Surface | Result |
| --- | --- |
| `/store` | 200. Playwright `sandboxVisibleText=false` at 360/1024/1440. Hero is “Shop UMTUBA”, not the E2E mug. overflowX=0 |
| `/store/search` | 200. Categories are real catalog names only (Digital Products, Education, …). **No** `UMTUBA_E2E_*` chip. Empty state “No matches” |
| `/store/search?availability=in_stock` | 200. Source HTML includes the In stock control. Playwright visible-text count of the English string was 0 (Arabic chrome / below-fold sidebar). Control is in `SearchFilters.tsx` |
| Direct sandbox store/PDP | Visible Next 404. Source containment works |
| Guest cart/checkout/orders/wishlist | Login gate, same as production |

Prior Wave 1 localhost screenshots (`worktrees/_store_visual_qa/final_*`) still show the E2E mug in the hero — that is **pre-containment local evidence**, not current source.

### Authenticated surfaces

Not executed. Blocker: no buyer credentials supplied in repo or task docs. Fabricating a session was refused.

Guest favorites: `/store/wishlist` → login. `WishlistButton` uses an SVG heart and redirects to login when `requiresAuth` is true (source). Signed-in save/unsave was not clicked.

### 1024 / other viewports

Playwright 360 / 1024 / 1440 on both targets: `overflowX=0`. CSS already hides `.sf-sticky-actions` at `min-width: 1024px`. 768/1280/1440 prior Premium screenshots remain historical (and show the old sandbox hero).

### RTL/LTR

- Source: `dir="auto"` on marketplace titles/descriptions; logical skip-link inset; RTL hero gradient; cart badge logical inset.
- Visual: site already served Arabic chrome on this PC; forced `dir=rtl` kept overflowX=0.
- Residual: English sentences under RTL get leading punctuation (`.Try another…`, `.Sign in…`). Default Next 404 on the Arabic-locale local session also flipped `404 | This page…`. Not claimed fixed.

### Empty / loading / error

- Empty: production home “Catalog is quiet right now”; search “No matches” + Clear search (local and production).
- Loading: `SearchFilters` “Updating…” pending copy in source; not captured mid-request.
- Error: `StoreErrorState` / `StoreEmptyState` remain wired on search, store profile, cart, checkout, orders. Sandbox URLs show framework 404.

## Open issues

1. **STORE_RELEASE_READY = NO.** Source is contained and pushed; production still merchandises the sandbox category. Central must deploy `b3c05d8` (or a descendant that includes it).
2. **AUTH_* = NOT_EXECUTED.** Cart, checkout, orders, and signed-in favorites still need a real buyer session.
3. Remote E2E rows remain in the linked catalog by design. Ops cleanup is `scripts/store-e2e/cleanup-store-sandbox.sql` — not done here.
4. `generateMetadata` still titles 404 sandbox URLs with the raw slug (`e2e-simple-mug | UMTUBA Store`). Body is 404; HTTP status from `Invoke-WebRequest` was 200 (App Router notFound streaming). Minor SEO leak, not a merchandising leak on source.
5. Pre-existing PC2 Arabic-locale money vitest flake.
6. English punctuation under RTL site locale is a platform i18n residue, not a Store-chrome redo.

## What was not done

- No force push, reset, stash, or clean of Store files
- No overwrite of `CURSOR_REPORT.md` / `CURRENT_TASK.md`
- No redo of `dad5eb5` Premium chrome
- No iOS/Android rebuild
- No remote migrations
- No clone of Amazon / Apple / Nike / Etsy / Shopify
- No fabricated authenticated PASS
