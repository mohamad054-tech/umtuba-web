# CURSOR_REPORT — DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1

```text
TASK_ID = DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1
STATUS = COMPLETE
PRODUCTS_COMPLETE = 26/26
CATEGORY_MAPPING = COMPLETE
VARIANTS_COMPLETE = 26/26
SPECIFICATIONS_COMPLETE = 26/26
SEARCH_METADATA_COMPLETE = 26/26
FILTER_METADATA_COMPLETE = 26/26
RELATED_PRODUCTS_COMPLETE = 26/26
INVENTORY_STATE_FIXTURES = [IN_STOCK, LOW_STOCK, OUT_OF_STOCK, INVENTORY_CHANGED]
PRICE_CHANGE_FIXTURES = [PRICE_CHANGED]
FIXTURE_INCONSISTENCIES_FIXED = [DIGITAL_SKU_ONHAND, UMTUBA_OWNED_VS_DEMO_SUPPLIER_A, PROVIDER_OWNERSHIP, MISSING_VARIANTS, MISSING_SPECIFICATIONS]
REAL_PRODUCTS_USED = 0
REAL_PARTNERS_USED = 0
SOURCE_CHANGED = YES
SOURCE_SHA = 4b8dcb6ddb1d67b8e665def22440b527bc176f46
NO_DEPLOY = YES
CENTRAL_ACTION_REQUIRED = YES
SQL_20260929_APPLIED = NO
SECRET_VALUES_PRINTED = NO
```

## Summary

Refined the existing 26 DEMO Store products in place on detached worktree `worktrees/DESKTOP-STORE-DEMO-CATALOG-V1` at `4b8dcb6` (current `origin/alpha-0.2`; same catalog as sandbox review SHA `8f39277` plus the demo-preview access commit). No new product set. No real partners. No ratings, reviews, discounts, or supplier promises.

Each product now has a stable parent SKU, concise + full description, provider-neutral taxonomy path, variants, synthetic inventory, specifications, DEMO shipping/returns, related-product slugs, search keywords, and filter attributes. Digital SKUs no longer carry physical `onHand`. `UMTUBA_OWNED` listings now belong to `umtuba-demo-platform`, not `demo-supplier-a`.

Central owns further Store UX. Desktop did not rebuild checkout, seller/admin, or public Store chrome. Not committed. Not pushed. Not deployed.

### 26 SKUs + normalized categories

| SKU | Browse category | Taxonomy path |
| --- | --- | --- |
| DEMO-STUDIO-EARBUDS | electronics | electronics / audio / earbuds |
| DEMO-DESK-LAMP | electronics | electronics / lighting / desk-lamps |
| DEMO-CANVAS-OVERSHIRT | fashion | fashion / apparel / overshirts |
| DEMO-EVERYDAY-TEE | fashion | fashion / apparel / t-shirts |
| DEMO-CERAMIC-MUG | home | home-living / kitchen / drinkware |
| DEMO-SHELF-RISER | home | home-living / organization / shelf-accessories |
| DEMO-LINEN-THROW | home | home-living / textiles / throws |
| DEMO-LIP-BALM-TIN | beauty | beauty-personal-care / personal-care / lip-care |
| DEMO-GROOMING-KIT | beauty | beauty-personal-care / grooming / kits |
| DEMO-RESISTANCE-BAND | sports | sports-outdoors / fitness / resistance-training |
| DEMO-STUDIO-MAT | sports | sports-outdoors / fitness / mats |
| DEMO-FIELD-NOTES | books | books / stationery / notebooks |
| DEMO-PLATFORM-HANDBOOK | books | books / handbooks / platform-guides |
| DEMO-CANVAS-TOTE | accessories | accessories / bags / totes |
| DEMO-CARD-SLEEVE | accessories | accessories / small-goods / card-holders |
| DEMO-SOFT-BLOCK | kids | kids / play / blocks |
| DEMO-STORY-CARDS | kids | kids / activities / cards |
| DEMO-SEAT-HOOK | automotive-accessories | automotive / interior / hooks |
| DEMO-TRUNK-ORGANIZER | automotive-accessories | automotive / organization / trunk |
| DEMO-DESK-TRAY | office | office / desktop / trays |
| DEMO-CABLE-CLIPS | office | office / cable-management / clips |
| DEMO-PRINT-PACK | digital-other | digital-products / downloads / printables |
| DEMO-ICON-SET | digital-other | digital-products / downloads / icon-packs |
| DEMO-TRAVEL-POUCH | accessories | accessories / travel / pouches |
| DEMO-WATER-BOTTLE | sports | sports-outdoors / hydration / bottles |
| DEMO-BOOKMARK-SET | books | books / reading / bookmarks |

## Exact files changed

Worktree `worktrees/DESKTOP-STORE-DEMO-CATALOG-V1`:

- `lib/store/demo/types.ts`
- `lib/store/demo/catalog.ts`
- `lib/store/demo/catalogStates.ts` (new)
- `lib/store/demo/catalog.test.ts`
- `lib/store/demo/surface.ts`
- `lib/store/demo/index.ts`
- `lib/sandbox/fixtures/types.ts`
- `lib/sandbox/fixtures/store.ts`
- `lib/sandbox/fixtures/catalog.test.ts`
- `app/components/sandbox/SandboxView.tsx` (digital onHand honesty only)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ops/store-demo-catalog-productization-v1/DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1.md`

Parent handoff copies: `docs/ai/CURSOR_REPORT.md`, `docs/ai/CURRENT_TASK.md`.

## Migrations created

None. SQL `20260929` not applied.

## Security review

- All 26 products remain `SOURCE_TYPE=DEMO`, `RIGHTS_STATUS=DEMO_ONLY`, `purchasable=false`, `productionSellable=false`, `REAL_PROVIDER=NONE`.
- No real partner brands as product names. Forbidden marketplace tokens still denied by `assertDemoIsolation`.
- No secrets, API keys, or `.env` contents read or printed.
- Digital inventory is `onHand=null` / `DIGITAL_NOT_APPLICABLE` — not a fake physical warehouse count.
- Shipping/returns copy is labeled DEMO and explicitly not a promise or live policy.
- `UMTUBA_OWNED` is no longer attributed to `demo-supplier-a`.
- Sandbox PDP no longer prints physical `onHand` on digital SKUs.

## Tests

Targeted vitest from the catalog worktree:

- `lib/store/demo/catalog.test.ts` — 4/4 PASS
- `lib/sandbox/fixtures/catalog.test.ts` — 9/9 PASS
- `lib/store/demoPreviewGate.test.ts` — 5/5 PASS (picked up by the `lib/store/demo` path)

**18/18 PASS.** Broad QA not run.

## TypeScript

`npx tsc --noEmit` — **PASS** (exit 0).

## Build

Not run. Catalog fixtures only. Store UX not rebuilt.

## git diff --check

PASS (no whitespace errors).

## git status --short

Detached `4b8dcb6` worktree (uncommitted; no commit requested):

```
 M app/components/sandbox/SandboxView.tsx
 M docs/ai/CURRENT_TASK.md
 M lib/sandbox/fixtures/catalog.test.ts
 M lib/sandbox/fixtures/store.ts
 M lib/sandbox/fixtures/types.ts
 M lib/store/demo/catalog.test.ts
 M lib/store/demo/catalog.ts
 M lib/store/demo/index.ts
 M lib/store/demo/surface.ts
 M lib/store/demo/types.ts
?? lib/store/demo/catalogStates.ts
?? docs/ai/CURSOR_REPORT.md
?? docs/ops/store-demo-catalog-productization-v1/
```

Parent `office/profile-hero-completeness-v1` was not FF’d or merged. Prior dirty docs on parent were not used as the catalog source.

## Open issues

- Central owns composing these fixtures into public Store UX (search/filter/PDP/related rails).
- Android v17 Fold6 Retry QA remains a separate paused Desktop track.
- Catalog changes are uncommitted on the detached worktree. Central decides consume/commit.

## Deposit (2026-08-18)

```text
DEPOSIT_COMPLETE = YES_ON_FALLBACK_INTAKE
REQUESTED_PATH = D:\UMTUBA-SHARE\FROM-DESKTOP\DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1\
REQUESTED_PATH_WRITABLE = NO
ACTUAL_PATH = \\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1\
DIRTY_TREE_PRESERVED = YES
UNIFIED_DIFF_CREATED = YES
PATCH_BASE_SHA = 4b8dcb6ddb1d67b8e665def22440b527bc176f46
SOURCE_CHANGED_BY_DEPOSIT = NO
DEPLOYED = NO
```

Requested Central path `D:\UMTUBA-SHARE\FROM-DESKTOP\...` is not writable from this Desktop (`D:` mapped to `\\192.168.88.11\UMTUBA-SHARE` → Access is denied). Authorized product files, unified diff, and reports were deposited to the historical Desktop→Central intake share instead. Product source was not rewritten.
