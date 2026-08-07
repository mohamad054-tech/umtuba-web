# UMTUBA UI / Product Unification Master Plan V1

**Program:** `UMTUBA_UI_PRODUCT_UNIFICATION`  
**Owner:** Central Server  
**Status:** U1 INTEGRATED · U2 IMPLEMENTED_PENDING_REVIEW  
**Baseline tip for first wave:** `origin/office/platform-commerce-learning-chrome-wiring-v1` @ `3b7315667ab6824062e89126b1f94bd729376082`  
**Inventory:** `docs/ai/UMTUBA_FULL_PRODUCT_SURFACE_INVENTORY_V1.md`  
**Migration required:** NO  
**Remote DB required:** NO  

## Canonical experience (from what already exists)

1. **Home role:** Video-first social/discovery feed (`DiscoverExperience`), not a marketing landing.  
2. **Platform entry:** Desktop primary = Home / World / Learning / Store / Live / Messages; mobile primary unchanged (Home/Live/Messages/Profile); Store+World also in user-menu You group for mobile discovery; Collaboration entry DEFERRED (no `/workspaces` on chrome baseline).  
3. **Global nav:** `AppTopNav` + `AppMobileBottomNav` + `AppChrome`.  
4. **Platform-local nav:** LearningShell / StoreShell / SellerOpsShell / AiHubShell.  
5. **Account:** UserMenu + `/profile` + `/settings`.  
6. **Search:** Top-nav Search Ã¢â€ â€™ `/search`.  
7. **Map:** World Discovery `/world` (desktop-primary; mobile policy excludes World from bottom nav).  
8. **Notifications:** NotificationBell Ã¢â€ â€™ `/notifications`.  
9. **Return Home:** UMTUBA mark Ã¢â€ â€™ `/`.  

Do **not** invent a greenfield IA. Reconcile circular-arc foundation with live feed Home without replacing either blindly.

---

## Priority backlog

### P0
- None proven as hard navigation breakages in static audit.

### P1
| ID | Platform | Problem | Correction | Conflict | Size | Parallel |
|----|----------|---------|------------|----------|------|----------|
| P1-1 | Home / Nav | Store & Collaboration weak vs Learning on primary chrome | Shell/nav coherence wave Ã¢â‚¬â€ expose Store (and Collab when gate on) without removing Home feed | avoid Commerce money files | M | YES vs Commerce WAITING |
| P1-2 | Home | Circular arc / HOME_CIRCLE contracts Ã¢â€°Â  live Home UI | Document + flag-gated wiring to real hrefs; keep Discover feed | Home lock paths | M | after U1 |
| P1-3 | World | City route duplication `/city` vs `/world/city` | Classify canonical; alias or redirect plan | none | S | YES |
| P1-4 | Collaboration | Home/global entry weak | Entry from menu/chrome after platform gate | Collab apply HOLD | S | after 20260917 apply GO |
| P1-5 | Learning tip drift | `/learning/saved` on Learning SoT not on chrome tip | Later FF/port Learning UI onto UI baseline | Learning IDLE ok for inventory | M | after assign |

### P2
- Token/spacing unification across shells  
- Seller/admin table mobile layouts  
- AI hub discoverability  

### P3
- Home perf follow-through (`perf-home-javascript-optimization-v1`)  
- Living-nav prototype containment  

### P4
- Divergent Collab branch cleanup (docs only until GO)  
- Dead secondary surface catalog enforcement  

---

## Implementation waves

| Wave | Name | Scope | Migration | DB | Owner |
|------|------|-------|-----------|----|-------|
| **U0** | Recover/classify accepted UI | inventory (this doc) | NO | NO | Server DONE |
| **U1** | Global shell/navigation consistency | AppTopNav/UserMenu/mobile contracts; Store (+ Collab entry when allowed); no Home feed rewrite | NO | NO | Server Ã¢â‚¬â€ **SELECTED FIRST** |
| U2 | Home organization | Reconcile circle/arc entries with Discover Home under flags | NO | NO | Server |
| U3 | Map/World consolidation | Canonical city routes; mobile affordance docs | NO | NO | Server |
| U4 | Platform hubs | Learning/Store/Workspaces hub chrome | NO | NO | per platform holds |
| U5 | Read/list pages | consistency | NO | NO | |
| U6 | Forms/settings | | NO | NO | |
| U7 | Responsive/mobile | | NO | NO | |
| U8 | Transactional pages | source-only until Commerce GO | NO* | NO* | HOLD Commerce |
| U9 | A11y/polish/cleanup | | NO | NO | |

\*No money ops without Commerce assignment.

---

## Selected first implementation wave: **U1**

| Field | Value |
|-------|-------|
| Name | Global shell / navigation consistency |
| Branch (when GO) | `office/central-ui-shell-navigation-coherence-v1` |
| Worktree (when GO) | `D:\umtuba-central\repos\umtuba-web-central-ui-shell-navigation-coherence-v1` |
| Base SHA | `3b7315667ab6824062e89126b1f94bd729376082` |
| Preserves Home | YES Ã¢â‚¬â€ no DiscoverExperience replacement |
| Preserves Map | YES Ã¢â‚¬â€ no World rewrite |
| Avoids holds | YES Ã¢â‚¬â€ no Commerce money, Translation, Collab migration SQL, Learning bookmarks SQL |
| Tests | nav contract tests under `app/lib/nav/**` |
| Migration | NO |
| Remote DB | NO |

**U1 implementation landed on this branch (pending review).**

### U1 outcomes (this wave)
- Desktop primary: Home / World / Learning / **Store** / Live / Messages
- Mobile primary preserved: Home / Live / Messages / Profile
- Mobile discovery: Store + World in user-menu You group (no bottom-nav overload)
- Canonical labels: Home, World, Store (not Discover/Map/Commerce in chrome)
- Collaboration/Workspaces entry: **DEFERRED_TO_LATER_WAVE** (route absent on baseline)
- Migration: NONE Â· Remote DB: NONE

---

## Central assignment ledger update

| Workstream | Owner | Status |
|------------|-------|--------|
| UMTUBA_UI_PRODUCT_UNIFICATION | Central Server | **U1 INTEGRATED** · **U2 IMPLEMENTED_PENDING_REVIEW** |
| Learning Bookmarks | Ã¢â‚¬â€ | COMPLETE (HISTORY_ALIGNED) |
| Collaboration 20260917 | Agent4 lineage | GIT_LANDED_PENDING_REMOTE (SoT FF done) |
| Commerce P6R2 | Desktop | WAITING_DEPENDENCY |
| Translation | Computer 2 | FROZEN |

---

## U2 Home Organization (this wave)

| Field | Value |
|-------|-------|
| State | **IMPLEMENTED_PENDING_REVIEW** |
| Branch | `office/central-ui-home-organization-v1` |
| Base | Central UI integration `office/central-ui-product-integration-v1` @ `5acb0a0…` |
| Preserves | video-first DiscoverExperience; U1 chrome; World internals untouched |
| Platform entries | Section circles + arc portals wire real hrefs via `homePlatformEntryContract` |
| Flags | `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED=false`; preview gate unchanged |
| Collaboration entry | DEFERRED (no `/workspaces` on baseline) |
| Migration | NONE |
| U3 Map | **NOT STARTED** |
