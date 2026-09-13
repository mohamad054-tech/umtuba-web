# PC2_IOS_GLOBAL_BACK_ARROW_V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_GLOBAL_BACK_ARROW_V1
DATE = 2026-08-15
MODE = EXECUTION
APP_STORE_REVIEW_SUBMIT = NO
REUPLOAD_BUILD_4 = NO
BUILD_5_STARTED = NO
PR_CREATED = NO
ALPHA_0_2_TOUCHED = NO
ANDROID_ASSETLINKS_MERGED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
SECRET_VALUES_PRINTED = NO
```

## FINAL FIELDS

```text
GLOBAL_BACK_ARROW_IMPLEMENTED = YES
PRIMARY_SCREENS = Watch, Discover, Create, Messages, Profile, Live(Android), Login
SECONDARY_SCREENS = Conversation, Settings, Other-user Profile, Notifications, Rewards, World, Blocked users, Change password, Signup, Forgot password, Update password, Not found
ROOT_BACK_BEHAVIOR = Visible no-op on tab/login roots. Never router.back() off root. Never exit the app. Profile tab with ?u= replaces to own Profile tab.
INTERNAL_ROUTE_LABELS_REMOVED = YES
NAVIGATION_LOOPS = PREVENTED
DEEP_LINKS_PRESERVED = YES
BOTTOM_TABS_PRESERVED = YES
TESTS = TARGETED_NAV 21 PASS; FULL_VITEST 447 PASS / 1 FAIL PREEXISTING wallet locale grouping (unrelated)
TYPECHECK = PASS
LINT = PASS (npm run lint = tsc --noEmit)
COMMIT_SHA = e3457fc3cf3ea5eac034eb55f8a8b7a33845d23b
BUILD5_SOURCE_UPDATED = YES
DEVICE_QA = NOT_RUN
BUILD4_BINARY_CONTAINS_THIS = NO
BLOCKERS = Build 4 TestFlight binary does not include this. Build 5 not started. No physical iPhone QA. Do not declare device PASS.
```

## Summary

Every user-facing mobile screen now shows a single shared Back arrow. The control is centralized: one policy module plus one `GlobalBackButton`, wired through the root Stack header, the tabs header, the Watch overlay (`IdentityHeader`), and the auth shell (`AuthScreen`). Screens were not redesigned.

Back follows real in-app history on secondary/detail screens. On root/tab surfaces the arrow stays visible and is a deterministic no-op, so it cannot exit the app or `router.back()` into `index` (which redirects and would loop). Internal Expo group names such as `(tabs)` are never used as back labels.

This is source-only on `pc2/a2-open-watch-published-post-v1` (Build 5 source candidate). Build 5 was not started. Build 4 was not re-uploaded. App Review was not submitted.

## Architecture

Shared policy: `src/lib/nav/globalBack.ts`

- `classifySurface` — root / auth-root / secondary / redirect
- `resolveGlobalBack` — `history-back` | `replace` | `noop`
- `sanitizeBackLabel` / `GLOBAL_STACK_HEADER_OPTIONS` — arrow-only (`headerBackTitle: ""`, `headerBackButtonDisplayMode: "minimal"`)
- Root/tab (Watch, Discover, Create, Messages, Profile, Live) → **noop** (visible)
- Login → **noop** (visible)
- Profile tab with `?u=` → **replace** `/(tabs)/profile` (stay on tab, clear other-user)
- Secondary with valid previous (including `(tabs)` container, never `index`) → **history-back**
- Secondary with no / unsafe history → **replace** to a stable parent (Conversation→Messages, Settings/Rewards/Notifications→Profile, World→Discover, stack Profile→Watch, auth secondary→Login)
- Same-route previous rejected (loop prevention)
- `index` / `/` / invite redirects are never valid history targets

Shared UI: `components/GlobalBackButton.tsx`

- 44×44 tap target, `hitSlop={12}`, `accessibilityLabel="Back"`
- Safe-area inherited from Stack/Tabs headers, Watch overlay `paddingTop: insets.top`, Auth `SafeAreaView` edges `top`
- Does not call `router.back()` unless the policy says `history-back`

Wiring:

- Root `app/_layout.tsx` Stack `headerLeft` + arrow-only options; `(tabs)` title cleared so it cannot leak as a back label
- Tabs `app/(tabs)/_layout.tsx` `headerLeft` on Discover / Create / Messages / Profile / Live
- Watch keeps `headerShown: false` (fullscreen feed). Arrow is in `IdentityHeader` overlay
- Auth screens get the arrow from `AuthScreen`
- Forgot-password Cancel uses the same `useGlobalBack()` hook instead of raw `router.back()`

## Screens covered

| Surface | How Back is shown | Press behavior |
| --- | --- | --- |
| Watch | Overlay in `IdentityHeader` | no-op (keeps `?post=`) |
| Discover / Create / Messages / Profile | Tabs headerLeft | no-op; Profile `?u=` clears other-user |
| Live | Tabs headerLeft (Android; iOS tab hidden) | no-op |
| Login | AuthScreen top bar | no-op |
| Conversation / Settings / Notifications / Rewards / World / Blocked users / Change password / stack Profile | Root Stack headerLeft | history-back or parent replace |
| Signup / Forgot password / Update password | AuthScreen top bar | history-back or replace Login |
| Not found | Inherited Stack header | parent replace / history |

Redirect-only routes (`index`, invite code) are not user-facing and stay header-hidden.

## Preserved ancestors

No changes to Open Watch publish routing, Messages realtime, login→Profile (`POST_AUTH_HREF`), Follow, location `6733cd5`, save RLS `831936c`, or camera/mic removal. Deep-link mapper and `?post=` focus are untouched. Bottom tabs unchanged. Android hardware-back handlers on Watch (previous video) and Conversation (`resolveAndroidBack`) are unchanged.

## Exact files changed (mobile)

- `src/lib/nav/globalBack.ts` (new)
- `src/lib/nav/globalBack.test.ts` (new)
- `components/GlobalBackButton.tsx` (new)
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(auth)/forgot-password.tsx`
- `components/AuthScreen.tsx`
- `components/IdentityHeader.tsx`

Web (this report only):

- `docs/ai/PC2_IOS_GLOBAL_BACK_ARROW_REPORT.md`

## Migrations created

None.

## Security review

No auth, RLS, secrets, or deep-link scheme changes. Back never leaves the app from a root surface. Internal route names are not shown to users.

## Tests

```text
npx vitest run src/lib/nav/globalBack.test.ts
  Test Files  1 passed
  Tests       21 passed

Coverage in that file:
  - history-back from Settings / World / Notifications / Conversation when previous is (tabs)
  - root tab no-exit even when canGoBack + previous is index
  - Watch ?post= stays on Watch (noop)
  - no "(tabs)" back label
  - same-route loop rejected
  - conversation without history replaces to Messages
  - login never exits
  - stack other-user Profile history-back or Watch fallback
  - Profile tab ?u= stays on Profile tab

npx vitest run
  Test Files  1 failed | 55 passed (56)
  Tests       1 failed | 447 passed (448)
  FAIL src/lib/wallet/format.test.ts > formatWalletAmountExact > uses locale grouping
       expected '١٬٢٣٤' to match /1/
  Pre-existing locale/environment failure. Not introduced by this change. Not declared PASS.
```

Device / iPhone / TestFlight: **NOT_RUN**. Do not treat this as device PASS.

## TypeScript

```text
npx tsc --noEmit
PASS
```

## Lint

```text
npm run lint  (= tsc --noEmit)
PASS
```

## git diff --check

PASS (no whitespace errors on the committed files).

## git status --short

After commit + push of `e3457fc`:

```text
## pc2/a2-open-watch-published-post-v1...origin/pc2/a2-open-watch-published-post-v1
```

Clean working tree for this change. Pushed `1317f8b..e3457fc` to `origin/pc2/a2-open-watch-published-post-v1` (also included two already-local ancestor commits `9c1744a` and `1ad43fe` that were ahead of origin before this commit).

## Open issues

- Build 4 binary (`1.0.0 (4)`) does **not** contain this Back arrow. Users on TestFlight Build 4 will not see it until a future Build 5.
- Build 5 was **not** started, not uploaded, not submitted.
- No physical iPhone navigation QA.
- Full vitest has one pre-existing locale failure in `formatWalletAmountExact`.
- Diverged checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` @ `77e9e28` was not used, reset, or merged.

## Git

```text
REPO = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a2-open-watch-v1
BRANCH = pc2/a2-open-watch-published-post-v1
COMMIT = e3457fc3cf3ea5eac034eb55f8a8b7a33845d23b
MESSAGE = fix(ios): show a global Back arrow on every user-facing screen
PUSH = YES (ff-only, no force)
IDENTITY = reused local Admin / mohamad054@gmail.com
WEB_BRANCH = office/platform-translation-trunk-port-v1 (report only; CURSOR_REPORT.md not overwritten)
```
