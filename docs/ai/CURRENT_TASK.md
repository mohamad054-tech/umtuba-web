# Current Task

## Task title

DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1

## Status

COMPLETE — catalog-only productization of the existing 26 DEMO fixtures. Uncommitted. Not pushed. Not deployed.

```
TASK_ID = DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1
DEVICE = DESKTOP
MODE = CATALOG_BUILD_ONLY
BASE_SHA = 4b8dcb6ddb1d67b8e665def22440b527bc176f46
WORKTREE = worktrees/DESKTOP-STORE-DEMO-CATALOG-V1
```

## Allowed scope

- Refine the existing 26 DEMO products in `lib/store/demo` in place
- Additive catalog types, search/filter metadata, related mapping, shipping/returns DEMO fields
- Synthetic inventory/price state fixtures
- Fixture-consumer honesty for digital `onHand` and UMTUBA_OWNED actor ownership
- Targeted fixture tests + `tsc --noEmit` + `git diff --check`
- `docs/ai/CURSOR_REPORT.md` and `docs/ops` if needed

## Forbidden scope

- Store UX rebuild, checkout, seller/admin, deployment
- Replacing the 26 products with a new set
- Real partner products or fake partnerships
- Copying Amazon/Temu/SHEIN/etc.
- Ratings, reviews, real discounts, supplier promises
- SQL `20260929`
- Mobile
- Git commit / push
- Writing artifacts to the Windows Desktop
