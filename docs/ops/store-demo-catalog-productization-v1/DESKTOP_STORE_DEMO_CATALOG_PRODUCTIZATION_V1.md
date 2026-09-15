# DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1

DATE = 2026-08-18
DEVICE = DESKTOP
WORKTREE = worktrees/DESKTOP-STORE-DEMO-CATALOG-V1
SOURCE_SHA = 4b8dcb6ddb1d67b8e665def22440b527bc176f46
PRIOR_REVIEW_SHA = 8f39277bbe902dd202023379bff2fc25161d3168
SOURCE_CHANGED = YES
NO_DEPLOY = YES
REAL_PRODUCTS_USED = 0
REAL_PARTNERS_USED = 0

## What changed

In-place productization of the existing 26 DEMO fixtures. Same slugs and product ids. Additive catalog fields only. Fixture-consumer honesty for digital inventory and UMTUBA_OWNED ownership.

## 26 SKUs

1. DEMO-STUDIO-EARBUDS — electronics
2. DEMO-DESK-LAMP — electronics
3. DEMO-CANVAS-OVERSHIRT — fashion
4. DEMO-EVERYDAY-TEE — fashion
5. DEMO-CERAMIC-MUG — home
6. DEMO-SHELF-RISER — home
7. DEMO-LINEN-THROW — home
8. DEMO-LIP-BALM-TIN — beauty
9. DEMO-GROOMING-KIT — beauty
10. DEMO-RESISTANCE-BAND — sports
11. DEMO-STUDIO-MAT — sports
12. DEMO-FIELD-NOTES — books
13. DEMO-PLATFORM-HANDBOOK — books
14. DEMO-CANVAS-TOTE — accessories
15. DEMO-CARD-SLEEVE — accessories
16. DEMO-SOFT-BLOCK — kids
17. DEMO-STORY-CARDS — kids
18. DEMO-SEAT-HOOK — automotive-accessories
19. DEMO-TRUNK-ORGANIZER — automotive-accessories
20. DEMO-DESK-TRAY — office
21. DEMO-CABLE-CLIPS — office
22. DEMO-PRINT-PACK — digital-other
23. DEMO-ICON-SET — digital-other
24. DEMO-TRAVEL-POUCH — accessories
25. DEMO-WATER-BOTTLE — sports
26. DEMO-BOOKMARK-SET — books

## State fixtures

- IN_STOCK — DEMO-CERAMIC-MUG Clay (`onHand=10`)
- LOW_STOCK — DEMO-CANVAS-OVERSHIRT L (`onHand=2`)
- OUT_OF_STOCK — DEMO-SEAT-HOOK Chrome (`onHand=0`)
- INVENTORY_CHANGED — DEMO-STUDIO-EARBUDS Graphite (`12 → 6`)
- PRICE_CHANGED — DEMO-WATER-BOTTLE (`2499 → 2199`, not a promotion)

## Ownership

- `UMTUBA_OWNED_FUTURE` products → commerce mode `UMTUBA_OWNED` → actor `umtuba-demo-platform`
- `SYNTHETIC_DEMO` products rotate AFFILIATE / CATALOG_API / DROPSHIP / WHOLESALE / RESELLER / MARKETPLACE_SELLER
- `UMTUBA_OWNED` is never attributed to `demo-supplier-a`
