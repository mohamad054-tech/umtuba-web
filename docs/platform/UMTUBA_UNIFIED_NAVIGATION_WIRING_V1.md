# UMTUBA Unified Navigation Wiring V1

Incremental wiring of existing surfaces onto the Unified Navigation Foundation.

- **Branch:** `office/platform-unified-navigation-wiring-v1`
- **Base:** `a2159cbcbb536f2f8e8fc1809c981e6c6716f0be` (navigation foundation)
- **Module helpers:** `lib/platform/navigation/wiring.ts`

## Audit mapping

| Existing source | Unified builder / group | Decision |
| --- | --- | --- |
| `AdminStoreShell` `LINKS` via `APP_ROUTES.adminStore*` | `admin` → `listAdminStoreNavLinks()` | **Wired** — hrefs from registry; labels preserved |
| `AdminAdsShell` `LINKS` via `APP_ROUTES.adminAds*` | `admin` → `listAdminAdsNavLinks()` | **Wired** |
| `PrivateAiShell` `NAV` hardcoded `/admin/private-ai/*` | `aiAdmin` → `listPrivateAiNavLinks()` | **Wired** |
| `AiDataPlatformShell` `NAV` | `aiAdmin` → `listAiDataNavLinks()` | **Wired** |
| `KnowledgeAcquisitionShell` `NAV` | `aiAdmin` → `listKnowledgeNavLinks()` | **Wired** |
| Knowledge cross-link `/admin/translation-studio` | n/a (not in registry on alpha) | **Kept** as presentation cross-link |
| Settings account shortcuts (`saved`/`rewards`/…) | `user` group | **Deferred** (do not replace User Navigation yet) |
| `SettingsShell` hub | `settings` → `listSettingsNavLinks()` + breadcrumbs | **Wired** |
| `lib/site/indexing.ts` `SITEMAP_STATIC_ROUTES` | `buildSitemapEntries()` | **Wired** |
| `lib/site/indexing.ts` `ROBOTS_DISALLOW_PATHS` | `collectRobotsDisallowPaths()` | **Wired** |
| `app/sitemap.ts` / `app/robots.ts` | foundation builders | **Wired** |
| `app/lib/nav` Main / User chrome | `main` / `user` | **Deferred** |
| Shared product breadcrumbs (store PDP) | `buildBreadcrumbs()` | **Deferred** — helper used on Admin Platform Pages + Settings |

## Surfaces wired

1. Admin store + ads shells  
2. AI admin shells (private AI, AI data, knowledge)  
3. Settings shell (settings group + breadcrumbs)  
4. Sitemap + robots generation  
5. Admin Page Registry viewer (breadcrumbs + wired counts)

## Duplicated route definitions removed

- Hardcoded `LINKS` / `NAV` path arrays in the five admin shells above  
- Hardcoded `SITEMAP_STATIC_ROUTES` / `ROBOTS_DISALLOW_PATHS` arrays in `indexing.ts`

Retained: `APP_ROUTES` constants (deeplink helpers elsewhere), UI labels, auth checks, cross-hub presentation links.

## Deferred navigation surfaces

- Desktop / mobile **Main Navigation**
- **User menu** navigation
- Commerce / Learning chrome groups in production shells
- Product PDP breadcrumb redesign
- Concrete public profile sitemap expansion

## Policy notes

- Sitemap now follows registry eligibility (more public hubs; excludes `/discover` alias and legacy labs).
- Robots disallow is registry-derived and always includes `/admin/`.
- No permission weakening; admin shells still use existing require/assert helpers.
