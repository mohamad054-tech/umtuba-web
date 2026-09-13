# PC2-A3 — iOS / Android Parity Release Check V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = MOBILE PARITY / RELEASE REGRESSION
TASK_ID = PC2_A3_IOS_ANDROID_PARITY_RELEASE_CHECK_V1
DATE = 2026-08-15
MODE = EXECUTION_FIRST / TOKEN_CONSERVATIVE
COMMIT_CREATED = NO
PUSHED = NO
PRODUCT_CODE_CHANGED = NO
CURSOR_REPORT_OVERWRITTEN = NO
APP_STORE_PAPERWORK_DUPLICATED = NO
DESKTOP_ANDROID_DEVICE_QA = NOT_DONE
LAPTOP_WORK_REDONE = NO
SECRET_VALUES_PRINTED = NO
WEB_WORKSPACE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1
WEB_BRANCH = office/platform-translation-trunk-port-v1
WEB_HEAD = 2a146bb089e0ca94da0b793197edc448da462dea
MOBILE_SOT = C:\Users\Giga store\Desktop\umtuba\umtuba-mobile
MOBILE_COMPARED_SHA = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
```

## Required final fields

```text
MOBILE_SOURCE_SHA = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
ANDROID_IOS_PARITY = PARTIAL
AUTH = SHARED_SOURCE_ALIGNED
DEEP_LINKS = SHARED_SCHEME_ALIGNED; HTTPS_APP_LINKS_ANDROID_BLOCKED
CREATE_UPLOAD = SHARED_SOURCE_ALIGNED
ACCOUNT_DELETION = SHARED_LINK_LIVE_200
UGC_SAFETY = SHARED_SOURCE_BOUND_ON_MASTER
PRODUCTION_ENV = SHARED_FAIL_CLOSED_PUBLIC_ONLY
LIVE_FAIL_CLOSED = SOURCE_FAIL_CLOSED_BOTH
FIXES = NONE
TESTS = NOT_RUN_NO_CODE_CHANGE
NEW_MOBILE_BUILD_REQUIRED = NO
BLOCKERS = [PC2_MOBILE_CHECKOUT_DIVERGED, ANDROID_ASSETLINKS_404, ANDROID_UNUSED_CAMERA_MIC_PERMISSIONS]
```

---

## Summary

iOS and Android are **one Expo/React Native product** (`umtuba-mobile`, package/bundle `com.umtuba.app`). Release-critical screens and clients are shared TypeScript. There is no second native Android tree in this web workspace.

Compared product SoT is **`origin/master` `09e94f8`**. That SHA already contains the 20260928 UGC RPC bind. App Store accepted SHA `4eede0b` is a **descendant** of `09e94f8` (EAS Team ID lock + extra UGC tests only). Product behavior at those two SHAs is the same.

No both-platforms source defect was found that justified a code change. Android-only leftovers (unused `CAMERA`/`RECORD_AUDIO`, missing `assetlinks.json`) are reported, not “fixed” by inventing Play fingerprints or reversing a prior “leave Android permissions unchanged” decision.

PC2’s local mobile checkout `pc2/eas-preview-config-v1` @ `77e9e28` is **diverged** from `origin/master` (ahead 1 / behind 1). Git mutation was **stopped**. Do not merge/rebase/reset.

Live production probes (2026-08-15, curl HEAD): account-deletion/support/privacy/terms **200**; `/auth/callback` **307 → https://umtuba.com/login** (not localhost); AASA **200** with `M6HDH86Z55.com.umtuba.app`; `assetlinks.json` **404**.

---

## Git sync (mandatory)

### Web workspace (assigned)

```text
BRANCH = office/platform-translation-trunk-port-v1
HEAD = 2a146bb089e0ca94da0b793197edc448da462dea
REMOTE = origin/office/platform-translation-trunk-port-v1
STATE_AT_START = ahead 2, not behind
FF_PULL = NOT_NEEDED
DIVERGENCE_VS_ORIGIN = NO (ahead only)
```

`git fetch --prune` ran. Fast-forward was not required (local ahead, not behind). Pre-existing dirty docs/logs/worktrees were left untouched.

### Mobile SoT (sibling; read-only)

```text
LOCAL_BRANCH = pc2/eas-preview-config-v1
LOCAL_HEAD = 77e9e287e117fc9a19f9a5df1596f69b0b8bf07f
TRACKING = origin/master
STATE = ahead 1, behind 1  → DIVERGENCE
ORIGIN_MASTER = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
APP_STORE_ACCEPTED_SHA = 4eede0b4786a77a9cd9d642b792a5642341542c2
APP_STORE_SHA_PARENTAGE = descendant of 09e94f8 (tests + eas.json Team ID only)
GIT_MUTATION = STOPPED (no merge / rebase / reset / stash / checkout)
```

Local-only commit: `77e9e28 feat(ios): lock EAS preview profile Team ID…`  
Remote-only commit: `09e94f8 feat(ios): finish UGC bind to 20260928 contracts`

Comparison used `git show origin/master:…` plus the shared files that did not differ. Local checkout must **not** be used as a release binary SoT (it lacks the UGC finish commit).

---

## How iOS vs Android are built

| Item | iOS | Android | Parity |
| --- | --- | --- | --- |
| Repo | `umtuba-mobile` `master` | same | shared |
| Framework | Expo / expo-router | same | shared |
| Identity | `com.umtuba.app` | `com.umtuba.app` | shared |
| Version | `1.0.0` / `ios.buildNumber` `"1"` (EAS production `autoIncrement`) | `1.0.0` / `android.versionCode` `1` (EAS production `autoIncrement`) | source stamps aligned; remote EAS may increment |
| Scheme | `umtuba` | `umtuba` + https intentFilters `autoVerify` | scheme shared |
| Universal / App Links server | AASA **200** live | `assetlinks.json` **404** | **not equal** |
| EAS profiles | development simulator; preview internal device; production autoIncrement | development/preview APK; production autoIncrement | shared eas.json |

This task did **not** redo App Store paperwork, EAS submit, or Desktop Android device QA.

---

## Surface comparison (source)

### Auth

Shared `AuthContext`: email/password sign-in, sign-up with `emailRedirectTo = umtuba://auth/callback`, password recovery via `umtuba://auth/update-password`. Recovery tokens require `type=recovery` so they do not steal email-confirm links. Email-confirm types are a closed set (`signup` / `email` / `magiclink` / `email_change`). Session storage is SecureStore on both native platforms (web-only AsyncStorage branch unused in store binaries).

No Sign in with Apple / Google / Facebook in mobile source. Keyboard offset differs by platform (cosmetic).

**AUTH = SHARED_SOURCE_ALIGNED** — not a device E2E PASS.

### Deep links / callbacks

Shared parser (`src/lib/linking/deepLinks.ts`) handles `umtuba://`, `https://umtuba.com`, `https://www.umtuba.com`, and Expo `exp://`. Auth callbacks are handled in `app/_layout.tsx` before generic routing.

| Path | iOS | Android |
| --- | --- | --- |
| Custom scheme `umtuba://` | configured | configured (intent filter includes `umtuba`) |
| HTTPS Universal Links | associatedDomains + live AASA `M6HDH86Z55.com.umtuba.app` | intentFilters `autoVerify` **cannot verify** — live `assetlinks.json` 404 |
| Web `/auth/callback` (no code) | 307 → `https://umtuba.com/login?error=…` | same host (not localhost) |

`live` https/scheme links map to `/(tabs)/live`. On iOS that screen immediately redirects to Watch. On Android it shows the fail-closed lobby. Join still cannot start (see Live).

**DEEP_LINKS = SHARED_SCHEME_ALIGNED; HTTPS_APP_LINKS_ANDROID_BLOCKED**

Do not invent Android signing-cert fingerprints to author `assetlinks.json`.

### Navigation

Shared tab set: Watch, Discover, Create, Live, Messages. Auth gate and password-recovery redirect are shared.

**Intentional split:** Live tab `href` is `null` on iOS; Android keeps the tab. Android-only hardware back: Watch steps to previous video; Messages thread returns to inbox. Not a product-logic defect.

### Watch / Discover / Messages / Profile / Settings

| Surface | Evidence | Split? |
| --- | --- | --- |
| Watch | Shared feed + UGC report/block/hide | Android back + `removeClippedSubviews` only |
| Discover | Shared `loadDiscoverHome` | none product-critical |
| Messages | Shared messenger API / realtime | Android back + keyboard offset |
| Profile | Shared `buildProfilePresentation` | none |
| Settings | Shared rows: sign out, delete account, blocked users, change password, support allowlist | `resolveAppInfo(Constants, Platform.OS)` display only |

In-app “Edit profile” / “Privacy settings” are explicitly **unavailable** on both platforms.

`origin/master` support allowlist uses live `/support` (probed **200**). Diverged local checkout still points help/contact/support at `/privacy`.

### Create / upload

Shared gallery picker (`expo-image-picker` videos only), MIME/size/duration validation, Terms UGC ack gate (`canPublishWithUgcAck`). Publish is blocked until ack is true.

Android 13+ may open the system picker without a broad media grant (`Platform.OS !== "android"` hard-stop). That is documented Android platform behavior, not an iOS/Android product split.

**CREATE_UPLOAD = SHARED_SOURCE_ALIGNED**

### Account deletion

Both platforms open allowlisted `https://umtuba.com/account-deletion` from Settings. No second mobile deletion backend.

Live HEAD **200**. This web git tree has **no** `account-deletion` files (`git ls-files` empty) — page is live from another deploy lineage. Mobile must not recreate it.

**ACCOUNT_DELETION = SHARED_LINK_LIVE_200**

### UGC report / block

On `origin/master` / `4eede0b` product code:

- Watch binds `report_ugc_content`, `report_ugc_user`, `block_ugc_user`, `unblock_ugc_user`, `list_my_blocked_users`
- Closed reason set includes `illegal` + `impersonation` (20260928)
- Own-content report/block rejected
- Local hide/block remains UX fallback; server is authority when RPC succeeds
- Create Terms ack + own-content delete (UAF-12 / posts RLS) are shared

Diverged local `77e9e28` is **behind** this bind. Do not ship that checkout.

**UGC_SAFETY = SHARED_SOURCE_BOUND_ON_MASTER** — source bind only; RPC live success was not re-executed here.

### Privacy / permissions

| Permission | iOS | Android |
| --- | --- | --- |
| Photo library / media | purpose string for Create picker | `READ_MEDIA_IMAGES/VIDEO`, `READ/WRITE_EXTERNAL_STORAGE` |
| Notifications | purpose string + iOS provisional grant | `POST_NOTIFICATIONS` + Android channel in push service |
| Camera / mic | **not** declared (`NSCamera*` / `NSMicrophone*` absent; no `expo-camera`) | **`CAMERA` + `RECORD_AUDIO` still in `android.permissions`** |
| Live camera/mic usage | none (Live hidden + join false) | none (lobby unavailable + join false) |

Android leftover camera/mic is an **Android-only** Play-policy risk. Prior iOS readiness left the Android array unchanged on purpose. Not treated as a both-platforms defect; **not fixed** this task.

### Production env / version

`getEnv()` requires public Supabase URL + publishable/anon key; **rejects service-role-looking keys**; never reads service-role env. `EXPO_PUBLIC_LIVEKIT_URL` is optional and is **not** a Live join contract.

`.env.example` documents `umtuba://` redirect allowlist. Values were not printed.

Source version `1.0.0`, iOS `buildNumber` `"1"`, Android `versionCode` `1`. EAS `appVersionSource: "remote"` + production `autoIncrement` means store binaries may already be higher (historical iOS build **3** is App Store paperwork, not re-claimed here).

**PRODUCTION_ENV = SHARED_FAIL_CLOSED_PUBLIC_ONLY**

### Live fail-closed

```text
isLiveLobbySourceConfigured() = false
isLiveJoinContractConfigured() = false
resolveLiveJoin(...).canJoin = false   // even for status=live + join_eligible
loadLiveLobby() → ok:false, unavailable:true
```

iOS: tab hidden + `<Redirect href="/(tabs)/watch" />`.  
Android: lobby renders “Live unavailable”; tap still alerts and does not navigate to a stream.  
LiveKit URL env alone is explicitly insufficient.

Covered by existing `src/lib/live/live.test.ts`.

**LIVE_FAIL_CLOSED = SOURCE_FAIL_CLOSED_BOTH**

---

## Fixes

```text
FIXES = NONE
REASON = no both-platforms mobile source defect found that is safe to patch without inventing Android signing material or mutating a diverged checkout
```

Considered and **not** applied:

1. Remove Android `CAMERA`/`RECORD_AUDIO` — Android-only; prior wave locked the array.
2. Add `assetlinks.json` — needs real Play/upload cert SHA-256; must not invent.
3. Merge local `77e9e28` with `origin/master` — forbidden on divergence.
4. Recreate account-deletion in this web tree — live page already 200; competing backend forbidden.

---

## Exact files changed

| Path | Action |
| --- | --- |
| `docs/ai/PC2_A3_REPORT.md` | Created (this report) |

No mobile or web product files changed. `docs/ai/CURSOR_REPORT.md` and `docs/ai/CURRENT_TASK.md` were **not** overwritten.

---

## Migrations created

None.

---

## Security review

- No secrets, `.env`, or service-role keys read or printed.
- Mobile client env rejects service-role-shaped keys.
- Auth redirects stay on the `umtuba` scheme; web callback failure host is public `umtuba.com` (probed).
- UGC reasons are a closed allowlist; own-content actions rejected; RPCs run as the signed-in user.
- Live listing/join remain hard-off; destinations reject off-origin URLs.
- Support URLs are exact-allowlist fail-closed.
- AASA Team ID in live JSON matches committed `appleTeamId` / bundle; not invented this task.
- Android App Links are **not** attested (assetlinks 404).
- Unused Android camera/mic permissions remain a Play-declaration risk, not a runtime Live enablement.

---

## Tests

```text
TESTS = NOT_RUN_NO_CODE_CHANGE
MOBILE_VITEST = NOT_RUN
WEB_VITEST = NOT_RUN
REASON = no product code changed; existing live.test.ts / redirectUrls / deepLinks / env / ugcModeration tests were read as source evidence only
```

Existing source tests that support the verdict (not re-executed):

- `src/lib/live/live.test.ts` — join + lobby fail-closed
- `src/lib/auth/redirectUrls.test.ts` — `umtuba://auth/*`
- `src/lib/linking/deepLinks.test.ts` — scheme + https parse
- `src/lib/env.test.ts` — service-role rejected
- `origin/master` `src/lib/social/ugcModeration.test.ts` — RPC bind coverage (local checkout is behind)

---

## TypeScript

```text
TYPECHECK = NOT_RUN_NO_TS_CHANGE
npx tsc --noEmit = NOT_RUN
```

---

## Build

```text
npm run build = NOT_RUN
EAS / IPA / AAB = NOT_RUN
NEW_MOBILE_BUILD_REQUIRED = NO
```

A new binary is **not** required by this check. If a binary is cut later, use `09e94f8` or descendant `4eede0b` — **not** diverged `77e9e28`.

---

## git diff --check

```text
git diff --check = PASS (exit 0)
```

Ran on the web workspace after this report was written. No whitespace errors.

---

## git status --short

This task added only `docs/ai/PC2_A3_REPORT.md`. Other dirty paths were already present (sibling Store/docs work) and were not modified by this check.

```text
 M app/components/store/CartIconButton.tsx
 M app/components/store/HeroCarousel.tsx
 M app/components/store/ProductCard.tsx
 M app/components/store/SearchFilters.tsx
 M app/components/store/StoreCard.tsx
 M app/components/store/WishlistButton.tsx
 M app/components/store/storefront.css
 M app/lib/storefront/deriveSections.ts
 M app/store/[storeSlug]/page.tsx
 M app/store/[storeSlug]/product/[productSlug]/ProductDetailClient.tsx
 M app/store/search/page.tsx
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
 M lib/store/catalogQueries.ts
 M lib/store/storeHardeningFoundation.test.ts
 M lib/store/storefrontDeriveSections.test.ts
 M lib/store/storefrontFlags.ts
?? _a2_inventory_vitest.log
?? _d1_money_locale_vitest.log
?? _pc2_a1_d1_money_locale_v2.log
?? _pc2_a1_d2_media_foundation_v2.log
?? docs/ai/PC2_A3_REPORT.md
?? lib/store/sandboxCatalog.test.ts
?? lib/store/sandboxCatalog.ts
?? worktrees/_pc2_wp_qa_user_findings/
?? worktrees/_store_visual_qa/
?? worktrees/_store_visual_qa_pdp.cjs
?? worktrees/_store_visual_qa_recheck.cjs
?? worktrees/_store_visual_qa_run.cjs
?? worktrees/_store_visual_qa_run.mjs
```

---

## Open issues

1. **PC2 mobile checkout diverged** — `pc2/eas-preview-config-v1` `77e9e28` vs `origin/master` `09e94f8`. Stop. Do not merge/rebase. Use `09e94f8` / `4eede0b` for product SoT.
2. **Android App Links** — live `/.well-known/assetlinks.json` 404. Custom scheme still works. Operator/Desktop must publish real fingerprints when a Play/internal binary exists. Do not invent.
3. **Android unused `CAMERA` + `RECORD_AUDIO`** — leftover vs fail-closed Live. Play declaration risk. Desktop/Central decision; not patched here.
4. **This web git tree lacks `/account-deletion` source** — production page is 200 from another lineage. Do not fork a second deletion backend on this trunk.
5. **In-app profile edit / privacy controls** — unavailable on both platforms (explicit).
6. **Live product** — still unfinished; fail-closed. Do not enable to “close” iOS/Android tab difference.
7. **Device QA** — this task is source/prod-URL evidence only. No iPhone/Android install pass claimed. Desktop owns Android device QA; App Store paperwork is A2/closed-session and was not repeated.

---

## What this task did / did not do

| Action | Status |
| --- | --- |
| Read PROJECT_STATE / CURRENT_TASK / DEVELOPMENT_WORKFLOW | DONE |
| `git fetch --prune` on web + mobile | DONE |
| Compare iOS vs Android source at `09e94f8` | DONE |
| Probe production auth/AASA/assetlinks/deletion/support | DONE |
| Smallest both-platforms source fix | **NONE** (none justified) |
| Overwrite `CURSOR_REPORT.md` | **NO** |
| Duplicate A2 App Store paperwork | **NO** |
| Desktop Android device QA | **NO** |
| Redo Laptop closed work | **NO** |
| Commit / push / remote migration | **NO** |

---

## Machine-readable close

```text
TASK_ID = PC2_A3_IOS_ANDROID_PARITY_RELEASE_CHECK_V1
MOBILE_SOURCE_SHA = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
APP_STORE_ACCEPTED_SHA_NOTED = 4eede0b4786a77a9cd9d642b792a5642341542c2
ANDROID_IOS_PARITY = PARTIAL
AUTH = SHARED_SOURCE_ALIGNED
DEEP_LINKS = SHARED_SCHEME_ALIGNED; HTTPS_APP_LINKS_ANDROID_BLOCKED
CREATE_UPLOAD = SHARED_SOURCE_ALIGNED
ACCOUNT_DELETION = SHARED_LINK_LIVE_200
UGC_SAFETY = SHARED_SOURCE_BOUND_ON_MASTER
PRODUCTION_ENV = SHARED_FAIL_CLOSED_PUBLIC_ONLY
LIVE_FAIL_CLOSED = SOURCE_FAIL_CLOSED_BOTH
FIXES = NONE
TESTS = NOT_RUN_NO_CODE_CHANGE
TYPECHECK = NOT_RUN_NO_TS_CHANGE
NEW_MOBILE_BUILD_REQUIRED = NO
BLOCKERS = [PC2_MOBILE_CHECKOUT_DIVERGED, ANDROID_ASSETLINKS_404, ANDROID_UNUSED_CAMERA_MIC_PERMISSIONS]
COMMIT = NO
PUSH = NO
STATUS = COMPLETE_SOURCE_CHECK
```

END PC2_A3_IOS_ANDROID_PARITY_RELEASE_CHECK_V1
