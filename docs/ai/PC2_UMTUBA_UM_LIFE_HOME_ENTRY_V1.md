# PC2 UM LIFE HOME ENTRY V1

Isolated implementation. Communications 1B-S `CURRENT_TASK.md` / `CURSOR_REPORT.md` in the comms worktree were not overwritten.

## Source-first audit

| Question | Finding |
| --- | --- |
| Authoritative UM Life / social experience | Video-first Home `/` → `HomeFeedLoader` → `DiscoverExperience`. Part 1B-A candidate `4d4953d8` is present on comms HEAD. |
| Does `/life` exist? | Absent before this task. Now a **forever alias** to `/` (same query preservation as `/discover`). Not a second feed. |
| Does `/` own social/video Home? | Yes. `/discover` already aliases `/`. `/feed` remains legacy/experimental, not primary. |
| Duplicate social home? | No. Primary UM Life href is `/`. `/life` only redirects to `/`. |

**Destination decision:** first-class chrome lands on `/`. `/life` is OTHER (compatible alias), not AUTHORITATIVE.

Web branched from comms HEAD `866749ed` (includes social Home `4d4953d8` plus later profile/comms commits) in an isolated worktree so 1B-S uncommitted `.env` / local Supabase files were not included.

Mobile used Central-authorized `origin/master` = `09e94f80775855d7e2036fa7d83d63b9202fb8a4` (unchanged after fetch). Isolated worktree. `77e9e287` was not checked out or patched. Comms mobile `a660e19` was inspected only.

## Product implementation

Primary chrome (desktop + mobile-web + native tabs): **Watch | UM Life | Create | Learning | Store**.

- UM Life is one tap, not in a secondary menu.
- Label is the brand **UM Life** (untranslated EN+AR). A11y/help follows locale.
- Icon is an original community / U-seat / life-pulse mark. Official logo untouched. No Facebook/Meta/WhatsApp copies.
- World, Live, Messages, Profile remain reachable (Home circles, UserMenu, existing routes). Messages added to UserMenu after leaving primary chrome.
- Home feed / circles layout / DiscoverExperience were not rewritten.

### Web

- Desktop `APP_NAV_ITEMS` and mobile-web bottom nav share the five destinations.
- `/life` → `/` alias (query preserved).
- Badge slot is wired; notification unread is **not** reused (global inbox ≠ UM Life activity).

### Mobile (Android + iOS, same Expo source)

- Discover tab is the authorized social screen; tab title is **UM Life**. No second feed.
- Learning and Store have no native product screens on `09e94f8`. Tabs open official `https://umtuba.com/learning` and `https://umtuba.com/store` via `expo-web-browser` (allowlisted). Not dead tabs.
- Live and Messages screens remain; they are hidden from the tab bar (`href: null`) so five first-class items fit without overflow.

## Gate block

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_HOME_ENTRY_V1
STATUS = IMPLEMENTED
WEB_AUTHORITATIVE_SOURCE = comms HEAD 866749ed (includes Part 1B-A social home 4d4953d8)
MOBILE_AUTHORITATIVE_SOURCE = origin/master 09e94f80775855d7e2036fa7d83d63b9202fb8a4
WEB_BASE_SHA = 866749ed76ac1975deeceeb73dfa42c333ed05bd
MOBILE_BASE_SHA = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
WEB_RESULT_SHA = see isolated branch tip after feat(nav): first-class um life home entry
MOBILE_RESULT_SHA = see isolated branch tip after feat(nav): first-class um life tab
WEB_BRANCH = pc2/umtuba-um-life-home-entry-v1
MOBILE_BRANCH = pc2/umtuba-um-life-home-entry-v1
CURRENT_HOME_NAVIGATION = / is video-first social Home (HomeFeedLoader → DiscoverExperience); /discover forever alias
CURRENT_UM_LIFE_ENTRY = first-class primary chrome labeled UM Life → /
AUTHORITATIVE_UM_LIFE_DESTINATION = /
LIFE_ROUTE_STATUS = OTHER
AUTHORITATIVE / LEGACY / ABSENT / OTHER
DUPLICATE_SOCIAL_HOME_CREATED = NO
UM_LIFE_FIRST_CLASS_ENTRY = PASS
UM_LIFE_DESTINATION = PASS
UM_LIFE_ICON = IMPLEMENTED
UM_LIFE_LABEL = UM Life
WEB_IMPLEMENTED = YES
ANDROID_IMPLEMENTED = YES
IOS_IMPLEMENTED = YES
BADGE_CAPABILITY = READY
BADGE_LIVE_DATA = NO
RTL = PASS
LTR = PASS
ACCESSIBILITY = PASS
BACK_NAVIGATION = PASS
HOME_STATE = PASS
WATCH_PRESERVED = YES
CREATE_PRESERVED = YES
LEARNING_PRESERVED = YES
STORE_PRESERVED = YES
PROFILE_PRESERVED = YES
MESSAGES_PRESERVED = YES
TESTS = web nav+i18n+surface 125 passed; mobile nav/platform/world 15 passed
TYPECHECK = PASS
BUILD = FAIL
FILES_CHANGED = web nav/i18n/life alias + mobile tabs/web-bridge
REGRESSIONS_FOUND = webpack build fails on pre-existing comms discoveryNotFoundMessage sync server action (unrelated to this nav change); Turbopack cannot build the isolated worktree because node_modules is a junction
READY_FOR_OWNER_REVIEW = YES
DEPLOYED = NO
PLAY_UPLOAD = NO
APP_STORE_UPLOAD = NO
DATABASE_CHANGED = NO
MIGRATIONS_CREATED = NO
```

## Exact files changed (web worktree)

- `app/lib/nav/routes.ts`
- `app/lib/nav/mobileNav.ts`
- `app/lib/nav/platformNavContract.ts`
- `app/lib/nav/mobileWorldAffordanceContract.ts`
- `app/lib/nav/deepLinkAliasContract.ts`
- `app/lib/nav/userMenuItems.ts`
- `app/lib/nav/umLifeHomeEntry.ts` (new)
- `app/lib/nav/index.ts`
- `app/life/page.tsx` (new alias)
- `app/components/AppTopNav.tsx`
- `app/components/AppMobileBottomNav.tsx`
- `app/components/nav/UmLifeIcon.tsx` (new)
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/shellLabels.ts`
- tests under `app/lib/nav/*` and `lib/i18n/appShellTranslation.test.ts`
- `docs/ai/PC2_UMTUBA_UM_LIFE_HOME_ENTRY_V1.md`

## Exact files changed (mobile worktree)

- `app/(tabs)/_layout.tsx`
- `app/(tabs)/learning.tsx` (new web-bridge tab)
- `app/(tabs)/store.tsx` (new web-bridge tab)
- `components/nav/UmLifeTabIcon.tsx` (new)
- `src/lib/nav/umLifeHomeEntry.ts` (new)
- `src/lib/nav/umLifeHomeEntry.test.ts` (new)
- `src/lib/platform/destination.ts`
- `src/lib/world/mapDestination.ts`

## Migrations created

None. `DATABASE_CHANGE=NO`.

## Security review

- No DB, RLS, payments, or secrets.
- `/life` is a same-origin redirect to `/` with allowlisted query keys only.
- Mobile Learning/Store open only `https://umtuba.com/learning` and `https://umtuba.com/store`.
- Destination mappers remain fail-closed for unknown hosts.

## Tests

- Web: `npx vitest run app/lib/nav lib/i18n/appShellTranslation.test.ts lib/i18n/i18nFoundation.test.ts app/lib/product/surfaceGates.test.ts app/lib/nav/homeReadinessGuardrails.test.ts app/lib/nav/contentFlowPolicyContract.test.ts` — **125 passed**
- Mobile: `npx vitest run src/lib/nav src/lib/platform/platform.test.ts src/lib/world/world.test.ts` — **15 passed**
- Physical device / browser E2E on the isolated branches: **not executed** (user `npm run dev` and comms local runtime left untouched)

## TypeScript

- Web `npx tsc --noEmit` — PASS
- Mobile `npx tsc --noEmit` — PASS

## Build

- Web `next build` (Turbopack) — FAIL: isolated worktree `node_modules` junction rejected by Turbopack
- Web `next build --webpack` — FAIL: pre-existing comms `app/actions/communications.ts` `discoveryNotFoundMessage` is a sync function in a `"use server"` module (present on base `866749ed`, not introduced here)
- Mobile store binaries — not built (no Play / App Store)

## git diff --check

PASS (web and mobile isolated worktrees)

## Open issues

- Owner should review five-item chrome vs previous Home/World/Live/Messages/Profile primary set. World/Live remain on Home circles; Messages is in UserMenu.
- Mobile Learning/Store are official-web bridges, not native Learning/Store products.
- Badge live data remains unwired until a UM Life-specific count exists.
- Web production build on this isolated worktree is blocked by the inherited comms server-action and the junction; tsc + targeted tests passed.
