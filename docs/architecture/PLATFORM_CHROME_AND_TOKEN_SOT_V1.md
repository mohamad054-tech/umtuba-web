# Platform Chrome & Token SoT V1

**Status:** Coordination foundation (SERVER_PREMIUM_EXPERIENCE_COORDINATION_V1)  
**Base tip (audit):** `origin/alpha-0.2` @ `0f0fb0a1242ad597eb37f25100af38b75ce4753c`  
**Authority:** Central Coordinator — shared platform only  
**Not a redesign GO** for Store or Learning.

## Purpose

Document the authoritative shared chrome / token surfaces so PC2 (Store Premium), Laptop (Learning Premium), and Desktop (Android) can land without colliding on platform files.

## Hard ownership

| Owner | Owns | Must not rewrite without Central ACK |
| --- | --- | --- |
| **Central** | Platform chrome tokens, nav contracts, shared product states, motion root APIs | — |
| **PC2** | `app/components/store/**`, storefront CSS `--sf-*`, Store routes | `AppTopNav` / `AppMobileBottomNav` / `globals.css` token block / `app/components/motion/**` |
| **Laptop** | `app/components/learning/**`, Learning routes / Learning DS | Same shared surfaces; prefetch packet owns +4 lines on three nav files only |
| **Desktop** | Android + Google Play | Web Store/Learning chrome |

## Shared SoT paths

| Role | Path |
| --- | --- |
| Global CSS / platform tokens | `app/globals.css` (`--platform-*`, focus, motion CSS, mobile bottom inset) |
| Root fonts + providers | `app/layout.tsx` |
| Chrome mount | `app/components/AppChrome.tsx` |
| Desktop nav | `app/components/AppTopNav.tsx` |
| Mobile nav | `app/components/AppMobileBottomNav.tsx` |
| Account menu | `app/components/UserMenu.tsx` |
| Nav contracts | `app/lib/nav/*` |
| Nav architecture | `docs/architecture/PLATFORM_NAVIGATION_ARCHITECTURE_V1.md` |
| Empty / error / loading | `app/components/product/ProductEmptyState.tsx`, `ProductErrorState.tsx`, `ProductLoadingState.tsx`, `RouteErrorFallback.tsx` |
| Dialog a11y helper | `app/lib/product/useDialogA11y.ts` |
| Motion root | `app/components/motion/*` |
| Content card grammar | `app/components/content-cards/ContentCard.tsx` + `CONTENT_CARD_SYSTEM_V1.md` |

## Platform tokens (additive)

Defined in `:root` inside `app/globals.css`:

| Token | Intent |
| --- | --- |
| `--platform-void` | App chrome background (`#050510`) |
| `--platform-focus-ring` | Shared focus outline color |
| `--platform-eyebrow-tracking` | Eyebrow letter-spacing baseline |
| `--platform-radius-card` | Card radius baseline |
| `--platform-radius-panel` | Large panel radius baseline |
| `--app-mobile-bottom-nav-offset` | Mobile bottom-nav content inset |

**Domain forks allowed:** Store `--sf-*` in `app/components/store/storefront.css`. Do not “unify away” Store warm tokens during Premium waves without dual-owner GO.

## Explicit non-goals

- No shared `components/ui` library birth in this document (future Central wave).
- No Store/Learning visual overhaul.
- No invent of Laptop `prefetch={false}` packet (P1 — deposit required).
- No reopen of UM Core / Translation / Learning release gates / PRODUCTION_READY declare.

## Integration rule

If a device Premium packet touches any Shared SoT path above, Central must review before merge. Prefer domain-local shells consuming tokens over editing nav/globals.
