# UMTUBA Full Product Surface Inventory V1

**Document ID:** `UMTUBA_FULL_PRODUCT_SURFACE_INVENTORY_V1`  
**Audit date:** 2026-08-07  
**Mode:** READ-ONLY discovery (no product UI mutation in this commit)  
**Shared project:** `tgucwnjwoyeqoxqaxmew`

## Baseline selection

| Candidate | Tip | Pages | Notes |
|-----------|-----|------:|-------|
| **SELECTED broad UI baseline** | `origin/office/platform-commerce-learning-chrome-wiring-v1` @ `3b7315667ab6824062e89126b1f94bd729376082` | **163** | Descendant of `alpha-0.2` (+5 commits). Broadest accepted chrome+commerce+learning wiring. |
| Alpha lineage | `origin/alpha-0.2` @ `62c6c5d…` | 162 | Ancestor of chrome wiring |
| Learning SoT | `office/learning-resume-accessible-target-hardening-v1` @ `da676abd…` | 138 | More Learning pages (saved/notes); fewer total than chrome tip |
| Commerce tip | `…provider-money-execution-v1` @ `8c6a53e…` | 138 | Deeper Store/admin refund ops |
| Collaboration SoT | `…workspace-settings-lifecycle-ui-v1` @ `1d05d92…` (post-FF) | workspaces present | Settings migration `20260917` Git-landed pending remote |

**Rule applied:** newest domain tip ≠ UI SoT. Chrome-wiring is the broadest accepted shell+surfaces tip for inventory.

---

## Route inventory summary

**Total user-facing `app/**/page.tsx` routes on baseline: 163**

| Class | Approx count | Examples |
|-------|-------------:|----------|
| PUBLIC / HOME / DISCOVERY | ~8 | `/`, `/discover`, `/welcome`, `/watch`, `/feed`, `/search` |
| MAP / LOCATION (World) | 4 | `/world`, `/world/search`, `/world/city/:slug`, `/world/place/:slug` (+ `/city/:slug`) |
| LEARNING | ~51 | `/learning/**` learner + instructor |
| COMMERCE / STORE | ~27 | `/store/**`, `/seller/**` |
| COLLABORATION | present on Collab tip; chrome baseline has live-collab panels | `/workspaces/**` on Collab lineage |
| CREATOR | ~4 | `/create/video`, `/create/article`, `/creator/insights` |
| SOCIAL / COMMUNITY | mixed | feed/discover, learning course community |
| MESSAGING | 1+ | `/messages`, live rooms |
| PROFILE / IDENTITY | 2+ | `/profile`, `/profile/:username` |
| SETTINGS | 1 | `/settings` |
| ADMINISTRATION | many | `/admin/store`, `/admin/ads`, `/admin/ai*`, `/admin/knowledge*`, `/admin/private-ai*` |
| TRANSLATION | Studio not a primary app route on this tip | Computer-2 trunk (separate) |
| AI | `/ai-hub`, `/ai-hub/assistant`, admin AI | |
| NOTIFICATIONS | `/notifications` | |
| FINANCIAL / MONEY | wallet indicator; store checkout/orders; seller payouts | **do not execute** |
| ADS / PROMOTE | `/advertise/**` | |
| INTERNAL / OPS | media-lab, diagnostics | |
| AUTH / LEGAL | login/signup/terms/privacy | |

### Status notes (baseline)

| Surface | Status | Reachable UI | Home-linked | Nav-linked |
|---------|--------|--------------|-------------|------------|
| `/` Home feed | WORKING (video-first) | YES | — | Desktop Home + Mobile Home |
| `/discover` | WORKING alias of Home | YES | alias | not primary label |
| `/learning` | WORKING hub | YES | via contract circles / menu | Desktop primary |
| `/store` | WORKING hub | YES | via menu / circles contract | **not** desktop primary |
| `/world` | FUNCTIONAL_BUT_PARTIAL | YES | via World nav | Desktop primary; **not** mobile primary |
| `/workspaces` | PARTIAL vs chrome tip | Collab tip YES | weak | not primary chrome |
| `/messages` `/live` | WORKING | YES | YES | YES |
| Circular arc portals | FOUNDATION_ONLY (flag-gated) | optional | experimental | console.info press only |

Full route list captured during audit from `git ls-tree` on baseline (163 paths). Domain tips may add routes (e.g. Learning `/learning/saved`).

---

## Home forensic audit

**Current Home (`app/page.tsx`):** Suspense → `HomeFeedLoader` → `DiscoverExperience` (video-first feed).  
**Intentional lock:** `homeReadinessGuardrails` / Home lock contracts treat Home as Discover feed; circular arc is **not** default-mounted.

| Element | Destination | Exists? | Functional? | Notes |
|---------|-------------|---------|-------------|-------|
| Video Home feed | in-page | YES | YES | Canonical Home |
| `/discover` alias | `/` behavior | YES | YES | Forever alias |
| Desktop primary | Home/World/Learning/Live/Messages | YES | YES | Store absent from primary |
| Mobile bottom | Home/Live/Messages/Profile | YES | YES | No Learning/Store/World |
| User menu | Profile/Create/Saved/Learning/Store/… | YES | YES | Store/Learning entry ramp |
| Search (top) | `/search` | YES | YES | |
| Notifications | bell → notifications | YES | YES | |
| Wallet / tiers | indicators | YES | PARTIAL | money-adjacent |
| Circular arc portals | Store/Learning/Messages/World/Games/Live/Profile | components YES | **foundation** — press logs only; flag-gated |
| HOME_CIRCLE_ENTRY_HREFS contract | learning/store/games/live/world/search/messages/create | documented | may not equal live Home UI | **do not redesign; reconcile** |
| Collaboration | not on Home primary | workspaces on Collab tip | gap | |
| Footer | not dominant on Home feed | — | — | video chrome style |

**Preserve:** video-first Home + Discover alias + nav contracts.  
**Do not replace** with a marketing landing unless explicitly GO’d.

---

## Map / World audit

| Item | Finding |
|------|---------|
| Canonical routes | `/world`, `/world/search`, `/world/city/:citySlug`, `/world/place/:placeSlug`; also `/city/:citySlug` |
| Classification | **FUNCTIONAL_BUT_PARTIAL** |
| Implementation | World Discovery client + bootstrap (`lib/world/discovery`); AppTopNav shell |
| Geolocation | Optional device GPS; docs say no precise storage |
| Data | Approved public places bootstrap — not pure placeholder |
| Store integration | Places can relate to stores/services (copy); not full commerce checkout on map |
| Duplicates | City experience under `/city` and `/world/city` — review for supersession |
| Mobile | World **desktop primary only** (frozen affordance decision) |

---

## Platform entry graph (actual)

```
HOME (/)  [video-first DiscoverExperience]
├── Desktop primary: World | Learning | Live | Messages
├── Mobile primary: Live | Messages | Profile
├── User menu: Profile, Create, Saved, Learning, Store, Wishlist, Advertise, Settings, …
├── Search
├── Notifications / Wallet / Tiers
├── Learning → /learning → courses/lessons/instructor…
├── Store → /store → product/cart/checkout/orders (+ /seller/**)
├── World/Map → /world → city/place/search
├── Live → /live → rooms
├── Messages → /messages
├── Profile → /profile(/:username)
├── AI → /ai-hub (secondary)
├── Games → /games (circle contract)
├── Create → /create/video|article
└── Collaboration → /workspaces (stronger on Collab SoT; weak on Home chrome)
```

### Journey checks (static)

| Journey | Status |
|---------|--------|
| Home → Learning → Course → Lesson → (Saved on Learning SoT) → Hub → Home | WORKING / PARTIAL (Saved on Learning tip, not necessarily chrome tip) |
| Home → Store → Product → Cart → Checkout → Orders → Home | WORKING paths exist; **no money execution in audit** |
| Home → World → place/city → Home | WORKING / PARTIAL |
| Home → Collaboration workspaces | INCOMPLETE on Home primary; pages on Collab tip |
| Home → circular arc portal → domain | FOUNDATION_ONLY |

---

## Prior accepted UI work (recover, don’t rebuild)

| Branch tip | Milestone theme | In chrome baseline? | Integration candidate |
|------------|-----------------|---------------------|------------------------|
| `home-circular-arc-*` / assembly / polish | Home arc navigation | Components YES; default mount NO | Wire destinations carefully under flags |
| `platform-unified-navigation-*` / page-registry / main-user-nav | Unified nav contracts | Wired via `lib/platform/navigation` | Already foundational |
| `nav-chrome-hygiene-v1` | Chrome hygiene | Likely absorbed | verify |
| `perf-home-javascript-optimization-v1` | Home perf | check ancestry | polish |
| Commerce premium storefront/cart/orders/seller* | Buyer/seller UX | Much on chrome/commerce tips | HOLD Commerce money files |
| Learning UI contract suites / notes hubs / bookmarks | Learning UX | Domain SoT ahead | HOLD Learning boundary |
| Collaboration workspace UI | Workspaces | Collab SoT | HOLD apply 20260917 |
| Translation app-shell ingestion | i18n catalogs | separate trunk | FROZEN |

---

## Shared design / component inventory

| Primitive | Classification |
|-----------|----------------|
| `AppTopNav` / `AppChrome` / `AppMobileBottomNav` | CANONICAL |
| `LearningShell` / `StoreShell` / `SellerOpsShell` / `AiHubShell` / `AuthShell` | PLATFORM_SPECIFIC (intentional) |
| `ProductLoadingState` / `ProductEmptyState` / `ProductErrorState` | GOOD_REUSE |
| DiscoverShell / DiscoverFeed | PLATFORM_SPECIFIC (Home/Discover) |
| HomeCircularArc | FOUNDATION / experimental |
| Living video navigation | PROTOTYPE / secondary |
| Cards/buttons | mixed Tailwind — NEEDS_UNIFICATION (tokens) |
| Geist fonts in root layout | CANONICAL for current tip |

---

## Consistency / responsive / a11y (high level)

**Consistency:** Dark `#050510` chrome shared; platform shells diverge intentionally; Store not in desktop primary while Learning is — IA tension.  
**Responsive P0:** none proven broken in static audit.  
**Responsive P1:** World missing on mobile primary (by policy); Learning/Store mobile entry via menu only.  
**Responsive P2:** table-heavy seller/admin pages likely.  
**A11y:** Top nav has aria labels/current; Home feed complexity; forms/dialogs need deeper pass in U9.

---

## Duplicates / orphans (candidates only — DO NOT DELETE)

- `/discover` vs `/` (intentional alias)
- `/city/:slug` vs `/world/city/:slug`
- `/watch` vs Home feed overlap
- Circular arc vs Home circle contract vs live Home UI mismatch
- Divergent Collab `office/collaboration-settings-lifecycle-ui-v1` @ `f5ab724`
- Smoke/keepalive Collab ops tips

---

## Product completeness matrix (ESTIMATED)

| Platform | Home entry | Hub | Core pages | Nav | Mobile | State UX | Connectivity | Est. % |
|----------|------------|-----|------------|-----|--------|----------|--------------|-------:|
| Home/App Shell | — | feed | YES | YES | YES | GOOD | GOOD | 75 |
| Learning | menu+desktop | YES | rich | desktop | menu | GOOD | GOOD | 80 |
| Commerce/Store | menu | YES | rich | weak primary | menu | GOOD | GOOD* | 70 |
| World/Map | desktop | YES | partial | desktop | weak | PARTIAL | PARTIAL | 55 |
| Collaboration | weak | workspaces | partial | weak | weak | PARTIAL | PARTIAL | 45 |
| Profile/Identity | mobile+menu | YES | YES | YES | YES | GOOD | GOOD | 70 |
| Settings | menu | YES | YES | YES | via profile | GOOD | GOOD | 65 |
| Translation | no | Studio trunk | separate | no | n/a | n/a | FROZEN | 40 |
| AI | secondary | ai-hub | YES | weak | weak | PARTIAL | PARTIAL | 50 |
| Social/Community | Home feed | discover | YES | YES | YES | GOOD | GOOD | 70 |
| Messaging/Live | primary | YES | YES | YES | YES | GOOD | GOOD | 65 |
| Creator | menu | create/* | YES | weak | weak | PARTIAL | PARTIAL | 55 |

\*Checkout paths exist; live money ops gated.  
**Overall estimated UI/product completion: ~62%** (ESTIMATED PRODUCT/UI COMPLETENESS — not automated).

---

## Active-owner holds

| Owner | HOLD paths |
|-------|------------|
| Commerce provider-money | Store refund/provider-money execution modules on Commerce tip |
| Translation trunk | Translation Studio / i18n runtime on Computer-2 tip |
| Collaboration | `20260917` migration apply; workspace settings corrective just FF’d |
| Learning | Bookmarks COMPLETE history-aligned — avoid new Learning milestone files until assigned |
