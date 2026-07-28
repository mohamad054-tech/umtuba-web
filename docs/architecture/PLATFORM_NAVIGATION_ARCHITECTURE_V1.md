# Platform Navigation Architecture V1

**Status:** Contract Sync V1 — official navigation contracts frozen to match production code.  
**Base:** `alpha-0.2` @ `c28f8d8` (Motion / A11y Pass merged).  
**Hard constraints:**

- **Home (`/`)** remains the Video-First **Discovery Layer**. Do not change feed, swipe, ranking, player, or circles **layout**.
- Do **not** convert Home into a Store or Learning Hub.
- **Store Domain** (`/store/**`, `/seller/**`, `/admin/store/**`, cart/checkout/catalog internals) is owned separately — Platform Nav may **link** to Store hubs; it must not edit Store Domain code from laptop Store-parallel work without explicit coordination.
- This V1 sync does **not** add role gating, UserMenu capability links, content-flow policy changes, or primary-nav destination add/remove.

**Code sources of truth:**

- `app/lib/nav/routes.ts` — desktop primary + route builders
- `app/lib/nav/mobileNav.ts` — mobile primary
- `app/lib/nav/userMenuItems.ts` — account menu
- `app/lib/nav/platformNavContract.ts` — frozen contract constants for tests/docs
- `app/discover/page.tsx` — `/discover` → `/` alias
- `app/profile/page.tsx` — bare `/profile` resolver
- `lib/supabase/redirect.ts` — auth `?next=` safe path (default `/discover`)

---

## 1. Classification model

| Class | Meaning | Examples |
| --- | --- | --- |
| **Discovery** | Find content/creators; video-first | `/`, `/discover`→`/`, `/search`, `/watch` |
| **Destination** | Concrete content surface | `/articles/[id]`, `/watch?post=`, `/live/[roomId]`, PDP, lessons |
| **Creator Hub** | Creator Space + create tools | `/profile/[username]`, `/create/*`, `/creator/insights` |
| **Domain Hub** | Domain entry (not a second Home) | `/store`, `/learning`, `/live`, `/world`, `/games`, `/advertise` |
| **Workspace** | Role/capability tools | `/seller/**`, `/learning/instructor/**`, advertise dashboard |
| **Internal** | Account utilities | `/messages`, `/notifications`, `/settings`, `/saved`, `/rewards`, buyer cart/orders |
| **Admin / Auth / Legal** | Ops + identity + legal | `/admin/**`, `/login`, `/terms`, `/privacy`, `/welcome` |
| **Legacy / Experimental** | Not primary chrome | `/feed`, `/journey-pro`, `/post-journey`, `/live/media-lab`, `/city/*`, Living Navigation overlays |

---

## 2. Official chrome contracts (frozen)

### 2.1 Desktop primary (`APP_NAV_ITEMS` via `AppTopNav`)

| Order | Label | Href | Class |
| --- | --- | --- | --- |
| 1 | Home | `/` | Discovery |
| 2 | World | `/world` | Domain Hub |
| 3 | Learning | `/learning` | Domain Hub |
| 4 | Live | `/live` | Domain Hub |
| 5 | Messages | `/messages` | Internal |

Always alongside (not in `APP_NAV_ITEMS`): brand → `/`, Search → `/search`, Wallet, NotificationBell, UserMenu.

**Discover is not a desktop primary label.** `/discover` remains a forever redirect alias to `/`.

### 2.2 Mobile primary (`MOBILE_PRIMARY_NAV_ITEMS`)

| Order | Id | Label | Href |
| --- | --- | --- | --- |
| 1 | home | Home | `/` |
| 2 | live | Live | `/live` |
| 3 | messages | Messages | `/messages` |
| 4 | profile | Profile | `/profile` (resolved at render) |

- Visible below `sm` (`sm:hidden`); desktop top nav from `sm` upward — no duplicate bars.
- Hidden on auth paths, `/live/media-lab`, and live rooms `/live/[roomId]` (lobby `/live` keeps nav).
- Home active includes `/discover`.
- Profile active includes `/settings` and `/profile/**`.

### 2.3 Home circles (entry ramps only)

Source: `HomeSectionCircles` — **layout locked** this phase; contract is the destination list/order:

Learning → Store → Games → Live → World → Search → Messages → Create

Circles are Domain Hub / Internal / Creator entry ramps from Discovery. They are **not** primary tabs and must not become a Store-inside-Home redesign.

### 2.4 User menu (`buildUserMenuGroups`)

| Group | Items |
| --- | --- |
| You | Profile, Saved, Learning, Rewards, Notifications |
| Account | Settings, Store, Seller hub, Wishlist, Advertise |

Signed-out: Sign in only. Actions: Switch account, Sign out → Home.  
**V1:** no capability gating (Seller/Advertise always listed; Admin/Instructor not in menu).

### 2.5 Aliases and resolvers (keep)

| Alias / behavior | Contract |
| --- | --- |
| `/discover` (+ `post|city|comment|country`) | Redirect to `/` with query preserved |
| Nav active for `/discover` | Highlights **Home** (desktop + mobile) |
| `/profile` | Signed-out → `/login?next=/profile`; signed-in → `/profile/{username}` or `/settings` |
| Auth `?next=` | `getSafeRedirectPath(candidate, "/discover")` — default `/discover` equals Home via alias; open-redirect safe |
| Post notification href | `buildPostNotificationHref` → `/discover?post=` (then alias to Home) |

**Deep-link & Alias Clarity V1 — Auth default decision:** Keep fallback `/discover` (do **not** flip to `/`). Same Discovery destination after the forever redirect; avoids churn to callers, notification deep links, and redirect contract tests. Code: `app/lib/nav/deepLinkAliasContract.ts`, `lib/supabase/redirect.ts`.

### 2.6 Secondary / Legacy / Experimental (non-primary)

Secondary Surface Cleanup V1 freezes these as **not official chrome** (routes remain; not deleted or disabled):

| Surface | Kind | Official chrome? |
| --- | --- | --- |
| Living Navigation overlays | prototype-overlay | No — Watch prototype only |
| `/feed` | experimental | No |
| `/journey-pro` | experimental | No |
| `/post-journey` | legacy | No (deep-link / AppTopNav page shell OK; not a primary tab) |
| `/live/media-lab` | lab | No (bottom nav already hidden) |
| `/city/*` | experimental | No |

Contract: `app/lib/nav/secondarySurfaceContract.ts` — forbidden in desktop primary, mobile primary, and UserMenu baseline.

---

## 3. Role journeys (chrome reality)

Chrome labels are **the same** for visitor and signed-in users. Capabilities unlock via middleware/page gates, not morphing primary tabs.

| Role / capability | Start | Primary paths | Notes |
| --- | --- | --- | --- |
| Visitor | `/` or `/welcome` | Home → Creator Space → public content; browse Store/Learning/Live/World | Sign in for protected prefixes |
| Registered | `/` (post-login via discover alias) | + Messages, Profile, Saved, Create, Settings | |
| Creator | Profile + `/create/*` | Creator Hub | Not a chrome role enum |
| Seller | UserMenu → `/seller` | Workspace under Store Domain | Laptop must not edit Store Domain in parallel |
| Instructor | `/learning` → instructor link when authorable | Workspace | Not in UserMenu (future) |
| Admin | URL `/admin/ads` or `/admin/store` | Admin shells | No public nav (intentional) |

---

## 4. Platform Nav vs Store Domain boundary

| Platform Navigation (this contract) | Store Domain (out of scope here) |
| --- | --- |
| `app/lib/nav/**`, AppTopNav, MobileBottomNav, UserMenu | `/store/**` page UX, `/seller/**`, `/admin/store/**` |
| Circles/menu **links** to `/store`, Seller hub, Wishlist | Cart/checkout/catalog/product management internals |
| Docs + contract tests | Commerce permissions, verification, PDP flows |

---

## 5. Doc drift corrected in Contract Sync V1

| Prior claim | Correct contract |
| --- | --- |
| UNIFIED §14 listed Discover in desktop/mobile primary | Discover is **not** a primary label; only a redirect alias |
| Discover "quirk" of dual primary highlight | Obsolete — Home is the sole Discovery primary label |

---

## 6. Explicit non-goals (later phases)

1. UserMenu capability gating (Instructor / Admin / hide Seller)
2. Content-flow policy (Home → Profile preferred article path)
3. Adding Store/World/Watch to mobile primary
4. Home feed / circles layout / player changes
5. Store Domain implementation on laptop while desktop owns Store

---

## 7. Verification

Contract Sync V1 + Capability Links V1 + Deep-link & Alias Clarity V1 + Secondary Surface Cleanup V1 verified by:

- `app/lib/nav/platformNavContract.test.ts`
- `app/lib/nav/deepLinkAliasContract.test.ts`
- `app/lib/nav/secondarySurfaceContract.test.ts`
- Existing `shellCoherence`, `mobileNav`, `userMenuItems`, `pageAssembly` tests
- `lib/supabase/redirect.test.ts` for `?next=` safety + Discover default
