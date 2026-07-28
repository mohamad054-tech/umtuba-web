# Current Task

## Task title

Nav Chrome Hygiene V1

## Status

`implemented` — Discover retired from desktop + mobile primary nav. Verification PASS. **No commit / push.**

## Branch / sync

- Branch: `office/nav-chrome-hygiene-v1`
- Parent / base: `b7ef93e` (`feat(web): add creator space content cards v1` on `alpha-0.2`)
- Sync: checked out; HEAD = `b7ef93e`; no ahead/behind vs base tip; working tree has implementation + handoff docs only

## Why this is next

Closed spine (do not re-open):

1. Unified Content Foundation V1
2. Unified Content Services V2
3. Media Processing Foundation V1
4. Architecture docs (Unified Experience + Creator Space + Content Cards)
5. Creator Space + Content Cards V1 — **merged into `alpha-0.2`**

Per `docs/architecture/UNIFIED_EXPERIENCE_PAGE_CONSOLIDATION_V1.md` §12 execution order, step 2 is **Nav chrome hygiene** (Discover label retirement; keep `/discover` redirect; **zero Home feed changes**).

Deferred after this (not now): Creator Space tab visibility / Courses / Products / Photos / Pinned / Content Card Search variants / alias hygiene.

## Done in this GO

- Removed Discover from `APP_NAV_ITEMS` (desktop / AppTopNav / LandingHero via shared array)
- Removed Discover from `MOBILE_PRIMARY_NAV_ITEMS`; dropped `discover` from `MobilePrimaryNavId` + NavIcon / active-state switch
- Kept `APP_ROUTES.discover`, `/discover` redirect, `buildDiscoverCityHref`, `buildPostNotificationHref`, and Home≡Discover active highlight on Home
- Updated `mobileNav.test`, `shellCoherence`, `pageAssembly` contracts

## Forbidden (still)

- Home feed / DiscoverExperience player / swipe / ranking / engagement changes
- Watch player redesign
- Creator Space Courses / Products / Photos / Pinned implementation
- Migrations
- Commit / Push without explicit GO

## Hard lock

Home remains official Discovery Layer — do not touch feed/player behavior.

## Out-of-scope notes (documented only)

- Architecture §15 inventory still lists Discover in primary nav — doc refresh deferred
- Alias hygiene (`/seller/products*`, etc.) deferred per §12 step 5
- No further nav chrome labels beyond Discover retirement
