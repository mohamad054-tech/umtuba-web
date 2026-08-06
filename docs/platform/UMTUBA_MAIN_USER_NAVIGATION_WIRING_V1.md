# UMTUBA Main & User Navigation Wiring V1

Wire production Main and User chrome to the Unified Navigation Foundation.

- **Branch:** `office/platform-main-user-navigation-wiring-v1`
- **Base:** `28df9d441b6fd4f21f8c60e02e4d615130269a5b`
- **Presentation adapter:** `lib/platform/navigation/presentation.ts`
- **Chrome builders:** `lib/platform/navigation/chromeNavigation.ts`

## Audit mapping

| Current route source | Registry / group | Decision |
| --- | --- | --- |
| `APP_NAV_ITEMS` in `app/lib/nav/routes.ts` | primary pages via `DESKTOP_MAIN_PRESENTATION` | **Wired** |
| `MOBILE_PRIMARY_NAV_ITEMS` in `mobileNav.ts` | mobile presentation subset | **Wired** |
| `buildUserMenuGroups` in `userMenuItems.ts` | presentation → `getPageById` | **Wired** |
| Guest `UserMenu` Sign in | action (login href), not a page | **Unchanged** |
| Sign out / Switch account | actions | **Unchanged** |
| `APP_ROUTES` deeplink map | helpers for builders elsewhere | **Retained** (not chrome source of truth) |
| `HOME_CIRCLE_ENTRY_HREFS` | entry ramps | **Deferred** |
| Living Navigation / arc prototypes | secondary surfaces | **Deferred / forbidden chrome** |

## Main surfaces wired

- Desktop primary: Home, World, Learning, Live, Messages
- Mobile primary: Home, Live, Messages, Profile (World omitted by product decision)

## User surfaces wired

- Authenticated You / Account menu items resolve hrefs from registry page IDs
- Capability gates preserved (`showCreate`, `showInstructor`, `showSeller`, `showAdvertise`, `showAdmin`)
- Admin ads only when `showAdmin`
- Profile uses runtime username href with registry `profile` pageId validation

## Presentation adapter

**Yes** — `presentation.ts` stores labels / chrome ids / capabilities / optional feature flags. **No paths.**

## Deferred

- Home section circles route map
- Living Navigation overlays
- Commerce/Learning shell chrome beyond UserMenu entries already listed
