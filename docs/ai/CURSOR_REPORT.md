# Cursor Report — Living Video Navigation Prototype V1

## Summary

Implemented the first visible Living Video Navigation prototype on Watch.
Capability circles open one reusable overlay above a persistently mounted feed.
No route change, no remount of `VerticalVideoFeed` / active `VideoPlayer`, no
exact-context departure writes from overlay open/close, and no backend /
migration / product-domain work.

Branch: `office/living-video-navigation-prototype-v1`
Base: `6c9d560f56a558755f28626f9f80f8e93bd90d96`

No commit. No push. No remote migration apply.

## Working plan (executed)

1. Own overlay state in `WatchExperience` and keep `VerticalVideoFeed` as a
   stable sibling of one Living Navigation controller.
2. Keep all six capability items in typed configuration; Hello City stays
   disabled behind `hello_city_enabled`.
3. Use one rail + one portal dialog/sheet with `useDialogA11y`, Escape,
   backdrop close, focus restore, and no route navigation.
4. Gate the prototype behind existing `allowWatchPrototypePanels()`.
5. Verify with focused Living tests, Watch/World/nav regressions, TypeScript,
   full suite, build, and `git diff --check`.

## Exact files changed

### New
- `app/components/video/living-navigation/livingNavigationConfig.ts`
- `app/components/video/living-navigation/livingNavigationModel.ts`
- `app/components/video/living-navigation/LivingNavigationIcon.tsx`
- `app/components/video/living-navigation/LivingNavigationAction.tsx`
- `app/components/video/living-navigation/LivingNavigationOverlay.tsx`
- `app/components/video/living-navigation/LivingVideoNavigation.tsx`
- `app/components/video/living-navigation/livingNavigation.test.ts`

### Modified
- `app/watch/WatchExperience.tsx`
- `vitest.config.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

### Present but excluded (still untracked, untouched)
- `docs/world/WORLD_OS_LIVING_VIDEO_NAVIGATION_PROTOTYPE_SPEC.md`
- `docs/world/WORLD_OS_UX_PHASE3_VIDEO_FIRST_NAVIGATION.md`

## Components and configuration introduced

- Typed config for World, Store, Journey, AI, Wallet, Hello City
- Pure reducer for open / switch / close / Escape / disabled rejection
- Circular action buttons with accessible labels and disabled state
- One reusable overlay (mobile bottom sheet / desktop side panel)
- Watch integration sibling to `VerticalVideoFeed`

## Where state is owned

`WatchExperience` owns `livingNavigation.selectedId` via
`reduceLivingNavigation`. Opening a Living item clears `activePanel`; opening
a Watch panel / Journey clears Living selection. The feed tree is never
conditionally replaced by the overlay.

## Proof that the video is not remounted

1. Source contract: `VerticalVideoFeed` remains mounted; Living Navigation is a
   sibling, not an alternate return path.
2. Overlay switching only changes `selectedId`; no route, no `key` change on
   feed/player, no `forcePause` for Living overlays.
3. Browser verification: active feed `<video>` DOM node identity remained the
   same across World open, Store switch, Escape, and backdrop close.
4. Second `<video>` observed on `/watch` is the pre-existing
   `WatchAmbientBackground` blur layer (`pointer-events-none fixed inset-0`),
   not a Living Navigation remount. That ambient player already existed before
   this prototype and is out of this sprint’s change set.

## Overlay accessibility behavior

- `role="dialog"` + `aria-modal="true"`
- Title / description ids
- `useDialogA11y`: Escape, Tab cycle, initial focus, restore focus
- Close button and backdrop dismissal
- Body scroll lock while open
- Disabled Hello City uses `aria-disabled` and never opens

## Mobile and desktop behavior

- Mobile: bottom sheet (`max-h-[76dvh]`, rounded top)
- Desktop/sm+: right side panel (`sm:max-w-md`)
- Capability rail: compact 2×3 grid at trailing edge of the Watch stage
- Prototype gated by `allowWatchPrototypePanels()` (never in production)

## Feature-flag / disabled behavior

Hello City is `featureStatus: "disabled"` with
`featureFlagKey: "hello_city_enabled"`. It remains visible but inaccessible for
this prototype and does not open an overlay.

## Exact-context compatibility

Living Navigation components do not call `saveWatchExactContextDeparture` and
do not use routers/links. Existing Watch World-link / pagehide producers remain
intact and covered by World tests.

## Tests

- Focused Living Navigation: **PASS** (10)
- Watch + video + World + nav cluster: **PASS** (12 files / 95)
- TypeScript `npx tsc --noEmit`: **PASS**
- Full `npm test`: **3 FAIL / 864 PASS**
  - Inherited upstream Store CRLF-sensitive failures only:
    - `lib/store/paymentOutcomeSync.test.ts`
    - `lib/store/storeRemoteE2eSandboxScripts.test.ts` (2)
  - Classification: **A — unrelated to Living Video**
- `npm run build`: **PASS**
- `git diff --check`: **PASS**
- Living Navigation ESLint: **PASS**

## Architecture / browser review notes

- Ownership map and dialog-reuse guidance matched the implemented approach.
- Browser pass confirmed open/switch/close, Escape, backdrop, focus return,
  Hello City disabled, no route change, and stable active video node.
- The ambient-background second `<video>` is pre-existing and not a prototype
  regression.
- Follow-up from architecture review: overlay is now **stage-scoped**
  (`absolute inset-0` inside the Watch stage) instead of a `document.body`
  portal, so fullscreen and desktop docking stay tied to the living video.
  Capability rail is a single trailing column; all targets remain 44×44.

## Remaining UX / architecture risks

1. Capability rail can still visually compete with mute / action-rail on dense
   layouts; future polish should refine placement without remounting video.
2. Hello City is shown disabled rather than omitted; Phase 3 blueprint prefers
   omission when gated — acceptable for this prototype sprint, revisit later.
3. No Attention Engine / nested place state / full-destination escalation yet
   (explicitly out of scope).
4. Ambient background still mounts a second blurred `<video>` for atmosphere;
   separate from Living Navigation and unchanged here.

## Recommended exact commit scope

Include:
- `app/components/video/living-navigation/**`
- `app/watch/WatchExperience.tsx`
- `vitest.config.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

Exclude:
- `docs/world/WORLD_OS_LIVING_VIDEO_NAVIGATION_PROTOTYPE_SPEC.md`
- `docs/world/WORLD_OS_UX_PHASE3_VIDEO_FIRST_NAVIGATION.md`

Suggested message:

`feat(watch): add Living Video Navigation prototype overlays`

Do not commit. Do not push. Do not apply migrations remotely. Wait for approval.
