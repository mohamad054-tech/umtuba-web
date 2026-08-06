# UMTUBA Unified Navigation Foundation V1

Navigation framework that **consumes** the Unified Page Registry.

- **Branch:** `office/platform-unified-navigation-foundation-v1`
- **Base alpha:** `62c6c5d04f962b9615c1fb8037bae6b76d7f8e36`
- **Dependency:** Page Registry V1 `35c61d2fba289d0f20157e336992a66480defb48`
- **Module:** `lib/platform/navigation/`

This milestone does **not** replace production chrome (`app/lib/nav`). It builds the foundation only.

## Navigation architecture

```
Page Registry (source of truth)
        │
        ▼
 navigationGroups  ── membership rules (registry fields)
        │
        ▼
 navigationBuilder ── NavigationItem[] / NavigationGroup[]
        │
        ├── navigationFilters (auth / admin / capability)
        ├── breadcrumbs (parentId chain)
        ├── sitemapBuilder (public static)
        └── robotsBuilder (disallow from access metadata)
```

**Invariant:** every navigation `href` and `pageId` comes from a Page Registry entry. No duplicated route tables.

## Group hierarchy

| Group id | Label | Membership (registry-driven) |
| --- | --- | --- |
| `main` | Main Navigation | `navigationVisibility: primary`, static, not admin/legacy |
| `user` | User Navigation | member/creator/profile, secondary/utility, auth-oriented |
| `admin` | Admin Navigation | `adminOnly` + `domain: admin`, static |
| `settings` | Settings Navigation | `domain: settings` |
| `aiAdmin` | AI Admin Navigation | `adminOnly` + `domain: ai`, static |
| `learning` | Learning Navigation | `domain: learning`, static, depth ≤ 2, hub sections |
| `commerce` | Commerce Navigation | `domain: commerce`, static, depth ≤ 3, commerce sections |

Deep dynamic trees stay in the registry for breadcrumbs/sitemap rules but are not promoted into chrome groups.

## Visibility rules

Build-time exclusions:

- `navigationVisibility` ∈ `{hidden, none}`
- `deprecated` / `status: deprecated`

Runtime filters (`navigationFilters`):

| Access | Visible when |
| --- | --- |
| `public` | always |
| `authenticated` | `context.authenticated` |
| `role_gated` | authenticated + optional instructor/seller/advertise capability |
| `admin` / `adminOnly` | `context.authenticated && context.isAdmin` |

## Authenticated / public logic

- `PUBLIC_NAV_CONTEXT` — anonymous; strips auth, role-gated, and admin items.
- `AUTHENTICATED_NAV_CONTEXT` — signed-in member baseline.
- `ADMIN_NAV_CONTEXT` — operator with admin + commerce/learning capability flags.

## Admin visibility

- Store/Ads/Platform admin pages → `admin` group.
- AI / Knowledge / Private AI / AI Data admin pages → `aiAdmin` group.
- Admin items never appear in public sitemap or public nav context.

## Breadcrumb rules

1. Resolve pathname → registry page (exact → dynamic template → longest static prefix → Home).
2. Walk `parentId` chain to root.
3. Ensure Home (`/`) is present as the first crumb when missing.
4. Every crumb `pageId` must exist in the registry.

## Sitemap generation rules

Include when **all** are true:

- `access === public`
- not `adminOnly`
- not `dynamic`
- not deprecated
- not `navigationVisibility: hidden`
- not legacy labs (discover alias excluded)

Output: structured `SitemapEntry[]` + optional XML render helper (no file I/O in this milestone).

## Robots generation rules

- `User-agent: *`
- `Allow: /`
- `Disallow:` derived from admin (`/admin/`), authenticated/role-gated static paths, and hidden/deprecated static paths
- `Sitemap: /sitemap.xml` (configurable)

No disk writes in this milestone.

## Safe integration

`/admin/platform/pages` (read-only inventory) consumes `buildAllNavigationGroups` to display foundation groups. Production `AppTopNav` / mobile nav are **unchanged**.

## Next milestones (not in scope)

1. Wire production chrome to the foundation behind a feature flag.
2. Emit real `sitemap.xml` / `robots.txt` routes.
3. Capability-aware UserMenu replacement using registry + filters.
