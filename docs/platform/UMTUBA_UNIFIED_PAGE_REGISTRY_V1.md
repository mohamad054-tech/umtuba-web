# UMTUBA Unified Page Registry V1

Canonical inventory of user-facing and admin App Router pages.

- **Branch:** `office/platform-unified-page-registry-v1`
- **Base:** `origin/alpha-0.2` @ `62c6c5d04f962b9615c1fb8037bae6b76d7f8e36`
- **Registry module:** `lib/platform/pageRegistry/`
- **Read-only viewer:** `/admin/platform/pages`

This milestone does **not** delete, redirect, merge, or redesign pages.

## 1. Total discovered pages

**163** `app/**/page.tsx` routes (including the registry viewer itself).

API route handlers (`route.ts`) are out of scope for this page registry.

## 2. Pages grouped by domain

| Domain | Count |
| --- | ---: |
| learning | 51 |
| commerce | 37 |
| ai | 29 |
| platform | 16 |
| admin | 11 |
| content | 11 |
| identity | 5 |
| profile | 2 |
| settings | 1 |
| collaboration | 0 |
| operations | 0 |

Notes:

- Admin AI / Knowledge / Private AI / AI Data surfaces are classified under **ai** with `adminOnly: true` (not Learning).
- Store admin / Ads admin remain under **admin**.
- No dedicated Collaboration workspace App Router tree exists on this tip.
- **operations** is reserved for future ops consoles; ads admin currently sits under **admin**.

## 3. Public versus authenticated pages

| Access class | Count |
| --- | ---: |
| Public (`access: public`, not admin-only) | 36 |
| Authenticated / role-gated / admin | 127 |

Primary public hubs include Home, World, Learning hub, Live lobby, Store storefront, legal pages, and catalog entry points.

## 4. Admin pages

**37** entries with `adminOnly` or `domain: admin`, including:

- `/admin/store/**`
- `/admin/ads/**`
- `/admin/ai`, `/admin/ai-data/**`, `/admin/knowledge/**`, `/admin/private-ai/**`
- `/admin/platform/pages` (this inventory viewer)

## 5. Dynamic routes

**61** routes use bracket segments (`[param]`), represented consistently in the registry (`dynamic: true`).

Examples: `/profile/[username]`, `/store/[storeSlug]/product/[productSlug]`, `/learning/courses/[courseId]/**`, `/live/[roomId]`.

## 6. Legacy / deprecated routes

**7** legacy or deprecated entries (from secondary-surface contract + auth alias):

| Path | Status |
| --- | --- |
| `/discover` | legacy (forever Home alias) |
| `/register` | deprecated (signup overlap) |
| `/feed` | legacy / experimental |
| `/journey-pro` | legacy / experimental |
| `/post-journey` | legacy |
| `/live/media-lab` | legacy / lab |
| `/city/[citySlug]` | legacy / city prototype |

No routes were deleted or redirected in this milestone.

## 7. Duplicate or overlapping page purposes

Documented in `PAGE_OVERLAP_NOTES`:

1. `/signup` vs `/register`
2. `/` vs `/discover`
3. `/seller/products` vs `/seller/store/products`
4. `/city/[citySlug]` vs `/world/city/[citySlug]`
5. `/store/products/[productId]` vs `/store/[storeSlug]/product/[productSlug]`
6. `/store/shops/[shopId]` vs `/store/[storeSlug]`

## 8. Orphan pages not linked from known navigation

**5** pages flagged `orphan` relative to `APP_ROUTES` / primary chrome / user-menu hubs:

- `/city/[citySlug]`
- `/feed`
- `/invite/[code]`
- `/journey-pro`
- `/register`

Admin AI trees and deep Learning/Commerce children are **not** treated as orphans when reachable from domain hubs.

## 9. Navigation gaps

- Many AI admin surfaces (`/admin/ai-data`, `/admin/knowledge`, `/admin/private-ai`, `/ai-hub`) are absent from baseline UserMenu admin entry (which points at `/admin/ads` only).
- Collaboration domain has no App Router pages yet — messaging lives under platform `/messages`.
- Instructor / seller / advertise hubs are capability-gated; deep trees are large relative to chrome exposure.
- Invite (`/invite/[code]`) has no primary chrome entry.

## 10. Suggested later consolidation candidates

Do **not** apply these now — inventory only:

1. Collapse `/register` into `/signup` (after redirect GO).
2. Keep `/discover` as alias only; never promote as primary label.
3. Prefer World city over `/city/[citySlug]` prototype.
4. Prefer slug storefront/PDP; keep id-based routes as resolvers only.
5. Consolidate `/seller/products*` into `/seller/store/products*`.
6. Add official chrome or operator hub links for AI admin trees.
7. Decide feed / journey-pro / media-lab retirement or lab retention policy.

## Registry API

```ts
import {
  PAGE_REGISTRY,
  domainCounts,
  searchPages,
  listPagesByDomain,
} from "@/lib/platform/pageRegistry";
```

Validation: `lib/platform/pageRegistry/pageRegistry.test.ts`.
