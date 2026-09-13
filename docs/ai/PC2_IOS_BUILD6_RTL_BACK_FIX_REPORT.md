# PC2 BUILD 6 RTL BACK NAVIGATION — INVESTIGATE + SMALLEST SHARED FIX

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD6_RTL_BACK_FIX_V1
DATE = 2026-08-16
MODE = EXECUTION
DEVICE = PC2
AUTHORITATIVE_MOBILE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-localization-build6-v1
DIVERGED_CHECKOUT_USED = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED = NO
BUILD5_FALLBACK = NO
IOS_ONLY_LOCALIZATION_FORK = NO
PLAYBACK_FIX_INVENTED = NO
STORE_LEARNING_TOUCHED = NO
ANDROID_VERSIONCODE_TOUCHED = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
EAS_BUILD_7_STARTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
```

## FINAL FIELDS

```text
RTL_BACK_ROOT_CAUSE = Native stack headerLeft stays physically leading while I18nManager RTL + header direction visually move the chevron to the trailing/right edge. Pressable hitbox does not follow the visible glyph. Policy already returns history-back or Profile replace for Settings; the tap never reached onPress.
WATCH_ROOT_BEHAVIOR = INTENDED_NOOP — Watch is a root tab (headerShown false; IdentityHeader overlay). resolveGlobalBack returns noop even when canGoBack. Visible right-side arrow that does not leave Watch is not the Settings defect.
SECONDARY_SCREEN_BACK_STATE = POLICY_OK_HITBOX_BROKEN_ON_BUILD6 — Settings is secondary. Valid previous → history-back. No/unsafe history → replace /(tabs)/profile. Never noop. Device tap on the visible right-side control did not fire.
FIX_REQUIRED = YES
FIX_APPLIED = YES
FIX_COMMIT = UNCOMMITTED
TESTS = PASS (src/lib/nav/globalBack.test.ts — 24 passed)
TYPECHECK = PASS
LINT = PASS (npm run lint = tsc --noEmit)
NEW_IOS_BUILD_REQUIRED = YES
BUILD6_RTL_NAVIGATION = FAIL_ON_DEVICE
CENTRAL_ACTION_REQUIRED = Commit this shared source fix, then authorize EAS iOS Build 7. Build 6 on device remains FAIL for RTL navigation until a new binary is QA'd. Do not claim device PASS from this source change.
```

Do **not** treat this as a device PASS. Build 6 (`1.0.0 (6)`, SHA `c48b4b2`) still fails RTL back on the physical iPhone 13 until a new binary includes this fix.

---

## Source lock

```text
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-localization-build6-v1
HEAD = c48b4b2898b116a39e90b85221ae1856f446d0a0
SUBJECT = chore(mobile): stamp iOS buildNumber 6 and Android versionCode 8
STATE = detached HEAD + uncommitted fix
MAIN_CHECKOUT_77e9e28 = NOT_USED_NOT_RESET
```

Existing Build 6 worktree matched the authorized SHA. No new worktree. Diverged `umtuba-mobile` @ `77e9e28` was not used, merged, rebased, or reset. Stale PC2 branches were not used. Build 5 was not reused.

---

## Physical device evidence (Build 6, not re-scored)

Authorized classification from iPhone 13 / Arabic / device language Arabic:

```text
ARABIC = PARTIAL_PASS
AR_RTL_VISUAL = PASS
BACK_ARROW_RTL_POSITION = PASS
RTL_NAVIGATION = FAIL
BACK_ARROW_TAP_BEHAVIOR = FAIL
BUILD6_RELEASE_BLOCKER = YES
BUILD6_RTL_NAVIGATION = FAIL_ON_DEVICE
```

Confirmed:

1. Profile → Settings: right-side Back did not perform expected back navigation.
2. Watch: right-side Back visible; tap does not respond.
3. Visual RTL (arrow on the right) is correct. Tap/navigation is not.

---

## Investigation

### Policy (`src/lib/nav/globalBack.ts`) — not the Settings failure

`classifySurface("/settings")` is `secondary`.

- `canGoBack` + valid previous (including `(tabs)`) → `{ action: "history-back" }`
- no / unsafe history (including `index`) → `{ action: "replace", href: "/(tabs)/profile" }`
- Settings **never** no-ops

Watch (`/(tabs)/watch`, segments `["(tabs)","watch"]`) is `root` → `{ action: "noop" }`. The overlay arrow is supposed to stay visible and not leave the app / not `router.back()` into `index`. Do not treat Watch root no-op as the Settings defect.

`router.canGoBack()` / `router.back()` are only used after `resolveGlobalBack` says `history-back`. A dead Settings tap is therefore not a `canGoBack` false-negative: even then the policy replaces to Profile.

### RTL mirroring vs hitbox — the Settings failure

Wiring on `c48b4b2` before this fix:

- Root Stack (`app/_layout.tsx`) always set `headerLeft: () => <GlobalBackButton />`
- Tabs header did the same
- `I18nProvider` wraps the tree in `direction: rtl` and `applyRtl()` calls `I18nManager.forceRTL(true)` for Arabic
- Expo Router native stack copies `useLocale().direction` onto `ScreenStackHeaderConfig.direction`
- iOS then sets `UINavigationBar.semanticContentAttribute` to RTL, which **draws** `headerLeft` on the trailing/right edge

`react-native-screens` hosts the custom `headerLeft` Pressable in a leading-side native view. After the visual RTL swap, the **glyph is on the right** and the **touchable frame stays on the left**. Tapping the visible chevron misses `onPress`. That matches “visual mirror without working tap.”

This is not an icon-direction-only bug (`backGlyph` already returns `›` in RTL). The Pressable never moved with the glyph.

Watch uses `IdentityHeader` (JS flex row inside the RTL root), not the native stack header. Flex moves both the glyph and the Pressable. Watch tap reaching `onPress` and no-oping is intended.

### What was ruled out

- Settings policy returning `noop` — it does not
- Missing parent fallback — `/settings` → `/(tabs)/profile`
- Internal route labels — already sanitized; `(tabs)` is never a user-facing back title
- iOS-only localization fork — not present, not created
- Playback — not involved, not touched

---

## Fix (smallest shared iOS/Android path)

Keep one Back control and one policy. Do not fork iOS.

1. Lock native header layout to physical LTR slots (`GLOBAL_HEADER_LAYOUT_DIRECTION = "ltr"` via `unstable_nativeProps.headerConfig.direction`) so iOS/Android do not visually swap `headerLeft` while leaving the RN hitbox behind.
2. Place the Back control in the **logical leading** slot: `headerLeft` in LTR, `headerRight` in RTL (`assignHeaderSlots` / `leadingHeaderBarSlot`).
3. Hide the platform default back (`headerBackVisible: false`) so an empty `headerLeft` in RTL does not resurrect a second native back.
4. Tabs use the same slot helper (Back ↔ wallet swap in RTL). Same module, both platforms.

Watch overlay and Auth JS chrome are unchanged. Policy is unchanged.

```text
LTR secondary: headerLeft = Back, headerRight = trailing (wallet on tabs)
RTL secondary: headerRight = Back, headerLeft = trailing
Native header direction lock: ltr (physical slots = hit targets)
Settings press: history-back or replace Profile (never noop)
Watch root press: still noop
```

---

## Exact files changed (mobile worktree)

- `src/lib/nav/globalBack.ts` — slot helpers, LTR header lock constant, `headerBackVisible: false`
- `src/lib/nav/globalBack.test.ts` — LTR/RTL slot + touch-target, Settings must-leave, labels, root safety
- `components/GlobalBackButton.tsx` — shared header-slot hooks; balanced 44×44 hit padding
- `app/_layout.tsx` — Stack uses `useGlobalBackStackHeaderOptions()`
- `app/(tabs)/_layout.tsx` — Tabs use `useGlobalBackHeaderSlots(() => <WalletTierBadge />)`

Web (this report only):

- `docs/ai/PC2_IOS_BUILD6_RTL_BACK_FIX_REPORT.md`

Not modified: Store, Learning, Android `versionCode`, EAS, App Store, `docs/ai/CURSOR_REPORT.md`, `docs/ai/CURRENT_TASK.md`.

---

## Migrations created

None.

---

## Security review

No auth, RLS, secrets, deep-link, or session changes. Root/tab Back remains a visible no-op and cannot exit the app. Settings still cannot history-back onto `index`. Internal Expo group names are still never shown as back labels.

---

## Tests

```text
npx vitest run src/lib/nav/globalBack.test.ts
  Test Files  1 passed
  Tests       24 passed
```

Coverage added/kept:

- LTR secondary Back → left slot (touch target matches)
- RTL secondary Back → right slot (touch target matches visible chevron)
- RTL header layout direction stays `ltr` so slots are physical
- Profile → Settings → Back never no-ops (`history-back` or replace `/(tabs)/profile`)
- Internal route labels still empty (`(tabs)` / `(auth)` never user-facing)
- Root Watch / tab no-exit still noop

---

## TypeScript

```text
npx tsc --noEmit
PASS
```

---

## Lint

```text
npm run lint  (= tsc --noEmit)
PASS
```

---

## git diff --check

PASS (no whitespace errors on the changed files).

---

## git status --short

Mobile worktree (detached `c48b4b2`, uncommitted):

```text
 M app/(tabs)/_layout.tsx
 M app/_layout.tsx
 M components/GlobalBackButton.tsx
 M src/lib/nav/globalBack.test.ts
 M src/lib/nav/globalBack.ts
```

```text
FIX_COMMIT = UNCOMMITTED
```

No commit created (workspace hard prohibition).

---

## Open issues

- Build 6 TestFlight binary does **not** contain this fix. Physical iPhone 13 RTL back remains **FAIL_ON_DEVICE**.
- Device PASS cannot be claimed until a new iOS binary is installed and QA'd.
- EAS Build 7 was **not** started. Parent/Central must authorize it.
- Watch root Back remains a visible no-op by policy. Re-test Settings (and another secondary such as Language / Notifications), not Watch-as-proof-of-back.
- Full vitest suite was not re-run; authorized SHA still has pre-existing unrelated failures (`appStoreConfig` buildNumber, wallet locale grouping on Windows). Those were not patched.

---

## Next

```text
CENTRAL_ACTION_REQUIRED = COMMIT_THEN_AUTHORIZE_IOS_BUILD_7
NEW_IOS_BUILD_REQUIRED = YES
BUILD6_RTL_NAVIGATION = FAIL_ON_DEVICE
APP_STORE_PRODUCTION_SUBMITTED = NO
```

Commit when the operator asks. Then authorize Build 7. Re-QA Arabic RTL on iPhone 13: Profile → Settings → Back must return to Profile; Watch Back may stay put. Do not submit App Store Production from Build 6.
