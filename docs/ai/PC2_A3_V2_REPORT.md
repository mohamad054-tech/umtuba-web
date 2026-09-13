# PC2-A3 — Mobile Parity Blockers Resolution V2

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = MOBILE RELEASE SOURCE INTEGRITY
TASK_ID = PC2_A3_MOBILE_PARITY_BLOCKERS_RESOLUTION_V2
DATE = 2026-08-15
MODE = EXECUTION / CLOSE_BLOCKERS
COMMIT_CREATED = NO
PUSHED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
DESKTOP_ANDROID_DEVICE_QA = NOT_DONE
EAS_REBUILD = NOT_RUN
SECRET_VALUES_PRINTED = NO
WEB_WORKSPACE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1
WEB_BRANCH = office/platform-translation-trunk-port-v1
WEB_HEAD_AT_START = 2a146bb089e0ca94da0b793197edc448da462dea
WEB_HEAD_NOW = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
MOBILE_SOT = C:\Users\Giga store\Desktop\umtuba\umtuba-mobile
MOBILE_DIVERGED_CHECKOUT = pc2/eas-preview-config-v1 @ 77e9e287e117fc9a19f9a5df1596f69b0b8bf07f
MOBILE_ORIGIN_MASTER = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
APP_STORE_ACCEPTED_SHA = 4eede0b4786a77a9cd9d642b792a5642341542c2
PERMISSION_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-mobile-pc2-a3-permissions-v2
PERMISSION_BRANCH = pc2/a3-android-unused-permissions-v2
```

## Required final fields

```text
ASSETLINKS_REQUIRED = YES
ASSETLINKS_ROOT_CAUSE = NO_WELL_KNOWN_ROUTE_AND_NO_AUTHORITATIVE_FINGERPRINT
ASSETLINKS_FIXED = SOURCE_ONLY
ASSETLINKS_PRODUCTION_VERIFIED = NO
CAMERA_REQUIRED = NO
RECORD_AUDIO_REQUIRED = NO
PERMISSION_FIX = SOURCE_PATCH_ON_NEW_BRANCH_UNCOMMITTED
PERMISSION_CHANGE_REQUIRES_REBUILD = YES
CHECKOUT_DIVERGENCE = CONFIRMED_HISTORY_ONLY_NO_UNIQUE_PRODUCT_DELTA
AUTHORITATIVE_CHECKOUT_STATE = origin/master 09e94f8 product SoT; 4eede0b descendant already contains Team ID lock + extra UGC tests
MISSING_DELTA_TRANSPORTED = NO
SAVED_STATE = SOURCE_PRESENT_AUTH_GATED
FOLLOW_LABEL_STATE = WEB_ALREADY_FOLLOWING; MOBILE_NO_FOLLOW_CONTROL
LOGIN_REDIRECT_STATE = MOBILE_DEFAULT_WATCH; WEB_DEFAULT_DISCOVER; NOT_FLIPPED_TO_PROFILE
DELETE_MENU_STATE = MOBILE_RAIL_PLUS_SYSTEM_ALERT; WEB_MORE_MENU_CENTRAL_OWNED
CREATE_PARITY_STATE = MOBILE_VIDEO_LIBRARY_ONLY; WEB_VIDEO_AND_ARTICLE
TESTS = WEB_6_PASS; MOBILE_VITEST_NOT_RUN_NO_NODE_MODULES; SOURCE_ASSERT_PASS
COMMIT_SHA = NONE
NEW_MOBILE_BUILD_REQUIRED = YES
BLOCKERS = [ASSETLINKS_FINGERPRINT_AND_PRODUCTION_DEPLOY, ANDROID_PERMISSION_PATCH_UNCOMMITTED_NO_GIT_IDENTITY, NEW_ANDROID_BINARY_NOT_AUTHORIZED]
```

---

## Summary

Wave 1 blockers were investigated against `origin/master` `09e94f8` (not the diverged PC2 checkout). Android App Links **do** require `/.well-known/assetlinks.json` because mobile `intentFilters` set `autoVerify: true` for `umtuba.com` / `www.umtuba.com`. Production still returns **404**. No Play/EAS SHA-256 is documented in either repo, so this task implemented the AASA-style serving path and **keeps 404 until an operator sets a real fingerprint**. It does not invent one.

`CAMERA` and `RECORD_AUDIO` are unused by current shipping features (Live fail-closed; Create uses `ImagePicker.launchImageLibraryAsync` videos only; no `expo-camera`). The smallest source fix was applied on a **new branch from `origin/master`**, leaving `77e9e28` untouched. Commit failed: this machine has no Git author identity, and Git config must not be set here.

PC2 checkout divergence is **history-only**. `77e9e28` and `4eede0b` parent `6f05636` have the same Team ID lock content. `origin/master` is behind that lock but already has the UGC finish commit that local PC2 lacks. No unique product delta was transported.

User-reported UX items were inspected in shared mobile source. Follow label is a **web** control that already shows `Following`. Login default is Watch on mobile and Discover on web; this task did **not** invent a global Profile redirect. Save is present and auth-gated. Delete on mobile is a rail button plus system `Alert`, not the web More menu. Create on mobile is video-from-library only.

`docs/ai/CURSOR_REPORT.md` and `docs/ai/CURRENT_TASK.md` were not overwritten. Store product files from A1 were not modified. No EAS rebuild. No Desktop Android device QA.

---

## Git sync (mandatory)

### Web workspace

```text
AT_START:
  BRANCH = office/platform-translation-trunk-port-v1
  HEAD = 2a146bb089e0ca94da0b793197edc448da462dea
  STATE = ahead 2, behind 0
  FF_PULL = NOT_NEEDED
  DIVERGENCE_VS_ORIGIN = NO (ahead only)
  STORE_WIP = PRESENT (left untouched; no checkout/reset/stash/clean)

NOW (this task did not commit, pull, checkout, or reset):
  HEAD = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
  STATE = even with origin (0 / 0)
```

`git fetch --prune` ran at start. Fast-forward was not required then. HEAD later moved under a sibling/coordinator; this task did not mutate the branch pointer. Store paths from `PC2_A1_REPORT.md` were not edited. Store WIP files were still on disk when checked mid-task (`sandboxCatalog.ts`, `ProductCard.tsx`, `app/store/search/page.tsx`).

### Mobile SoT

```text
LOCAL_BRANCH = pc2/eas-preview-config-v1
LOCAL_HEAD = 77e9e287e117fc9a19f9a5df1596f69b0b8bf07f  (STILL PRESENT)
TRACKING = origin/master
STATE = ahead 1, behind 1
ORIGIN_MASTER = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
APP_STORE_SHA = 4eede0b4786a77a9cd9d642b792a5642341542c2 (descendant of 09e94f8)
GIT_MUTATION_ON_DIVERGED_CHECKOUT = NONE
NEW_WORKTREE = umtuba-mobile-pc2-a3-permissions-v2 @ 09e94f8 + uncommitted permission patch
NEW_BRANCH = pc2/a3-android-unused-permissions-v2 (tracks origin/master)
```

---

## A — Android assetlinks.json

### Does Android App Links require it?

**Yes**, for *verified* HTTPS App Links. `app.config.ts` declares:

- `android.package` = `com.umtuba.app`
- `intentFilters.autoVerify` = `true`
- hosts `umtuba.com` and `www.umtuba.com` (https, `pathPrefix: /`)
- custom scheme `umtuba` (does **not** need assetlinks)

Without a valid Digital Asset Links file on **each** HTTPS host, Android cannot verify App Links. Custom-scheme `umtuba://` still works.

### Production domain / package / fingerprint

| Item | Evidence |
| --- | --- |
| Production hosts | `https://umtuba.com`, `https://www.umtuba.com` (Expo associated domains + intentFilters) |
| Package | `com.umtuba.app` |
| Fingerprint | **Unknown**. No SHA-256 in repo, EAS metadata files, or docs. Must come from Play Console (App signing + upload cert) and/or EAS credentials. **Not invented.** |

Expected JSON (when fingerprint is known):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.umtuba.app",
    "sha256_cert_fingerprints": ["AB:CD:…"]
  }
}]
```

If Play App Signing is on, **both** upload and Google app-signing SHA-256 values should be listed.

### Serving location in this Next.js repo

Mirrors live AASA:

- Builder: `lib/android/assetLinks.ts` — returns `null` without a well-formed SHA-256
- Route: `app/.well-known/assetlinks.json/route.ts` — **404 until** `ANDROID_APP_LINKS_SHA256` is set
- Proxy already excludes `/.well-known/` (`proxy.ts`)
- `.env.example` documents the env var (empty; do not invent)

### Production probe (2026-08-15, this session)

```text
https://umtuba.com/.well-known/assetlinks.json        HEAD 404 (nginx, text/html)
https://www.umtuba.com/.well-known/assetlinks.json    HEAD 404
https://umtuba.com/.well-known/apple-app-site-association  HEAD 200 application/json
```

No production deploy is available on this PC2 session.

```text
ASSETLINKS_FIXED = SOURCE_ONLY
ASSETLINKS_PRODUCTION_VERIFIED = NO
```

---

## B — CAMERA / RECORD_AUDIO

### Why they remain

They are **explicitly listed** in `android.permissions` on `origin/master` `09e94f8`. iOS does **not** declare `NSCameraUsageDescription` / `NSMicrophoneUsageDescription`. There is no `expo-camera` plugin. Prior iOS readiness left the Android array unchanged on purpose.

### Current shipping feature need

| Feature | Uses device camera/mic? |
| --- | --- |
| Live | No. `isLiveJoinContractConfigured() = false`; lobby unavailable |
| Create | No. `pickVideoFromLibrary()` → `ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"] })` |
| Watch | Playback via `expo-video` only |
| Permissions foundation | `mediaLibrary` + `notifications` only |

MapLibre “camera” is map viewpoint, not the device camera.

**CAMERA_REQUIRED = NO. RECORD_AUDIO_REQUIRED = NO.**

### Source fix (not a binary edit)

Applied on worktree `umtuba-mobile-pc2-a3-permissions-v2` from `origin/master` (branch `pc2/a3-android-unused-permissions-v2`):

1. Remove `CAMERA` and `RECORD_AUDIO` from `android.permissions`
2. Add `android.blockedPermissions` so plugins cannot re-inject them
3. Extend `src/lib/ios/appStoreConfig.test.ts`

Diverged checkout `77e9e28` was **not** edited or reset.

Commit attempted; **failed** (`Author identity unknown`). Git config was not changed. Patch remains uncommitted on the new branch.

### Rebuild

```text
PERMISSION_CHANGE_REQUIRES_REBUILD = YES
```

A Play / store Android binary must be cut from this source (or a descendant) for the manifest change to ship. iOS Info.plist already omitted camera/mic; this patch does not obsolete uploaded iOS build 3 by itself. **EAS rebuild was not run.** Central authorizes builds.

`NEW_MOBILE_BUILD_REQUIRED = YES` (Android permission manifest).

---

## C — Mobile checkout divergence

```text
LOCAL  77e9e28  feat(ios): lock EAS preview profile Team ID…
REMOTE 09e94f8  feat(ios): finish UGC bind to 20260928 contracts
AHEAD/BEHIND = 1 / 1
```

`git diff 6f05636 77e9e28 -- eas.json src/lib/ios/appStoreConfig.test.ts` is **empty**. The Team ID lock on PC2 is the same content already present on the uploaded iOS lineage (`6f05636` → `4eede0b`).

`origin/master` `09e94f8` **lacks** `eas.submit.production.ios.appleTeamId` and has the UGC finish commit that `77e9e28` lacks.

```text
CHECKOUT_DIVERGENCE = CONFIRMED_HISTORY_ONLY_NO_UNIQUE_PRODUCT_DELTA
AUTHORITATIVE_CHECKOUT_STATE = origin/master 09e94f8 (product); 4eede0b (uploaded iOS descendant)
MISSING_DELTA_TRANSPORTED = NO
```

Do not merge `77e9e28` wholesale. Do not ship that checkout. No unique missing product delta exists to transport.

---

## D — User-reported mobile / parity risks

Inspected on authoritative mobile source (`09e94f8` / shared files identical on the diverged checkout for these screens). Web-only surfaces were not re-fixed.

### Saved video

`togglePostSave` → RPC `toggle_post_save`. Auth failure returns `requiresAuth` + “Please sign in to save posts.” Watch rail Save/Unsave updates `savedByMe` when the RPC succeeds. Guests fail silently in `watch.tsx` (`if (!result.ok) return`). Authenticated save is implemented at source. No saved-list screen on mobile Profile.

```text
SAVED_STATE = SOURCE_PRESENT_AUTH_GATED
```

Not claimed as device PASS.

### Follow label

Web `FollowButton` already renders `following ? "Following" : "Follow"` (not `Unfollow`). Mobile Watch/Profile have **no** Follow control. World user-sheet types include `follow` but `actions: []`.

```text
FOLLOW_LABEL_STATE = WEB_ALREADY_FOLLOWING; MOBILE_NO_FOLLOW_CONTROL
```

Web-owned; not duplicated.

### Login success navigation

Mobile login/signup/`index` authenticated landing = `/(tabs)/watch`. Email-confirm deep link also replaces to Watch. Web contract `AUTH_DEFAULT_NEXT_PATH` = Discover/Home, **not** Profile. Profile is only a `?next=/profile` return path on web.

This task did **not** flip mobile login to Profile (would invent a product default that contradicts the web contract).

```text
LOGIN_REDIRECT_STATE = MOBILE_DEFAULT_WATCH; WEB_DEFAULT_DISCOVER; NOT_FLIPPED_TO_PROFILE
```

Known gap: Profile’s “Sign in” uses `router.replace("/(auth)/login")` with no `next=profile` return path.

### Video delete menu clipping

Web uses `OwnerContentDeleteControl` (“More” menu, opens upward). That is Central web-owned. Mobile has no dropdown menu: owner Delete is an inline rail action; confirm is system `Alert.alert`. Report/block are mutually exclusive with owner delete. Rail overflow on short viewports is a residual UX risk, not patched here (avoid duplicating the web menu and avoid extra Watch churn on a diverged-checkout machine).

```text
DELETE_MENU_STATE = MOBILE_RAIL_PLUS_SYSTEM_ALERT; WEB_MORE_MENU_CENTRAL_OWNED
```

### Create routing / content types

Mobile Create tab: signed-in gallery video → caption → UGC ack → publish to Watch. No camera capture. No article/photo create. Web has `/create/video` and `/create/article`. Intentional native subset, not a both-platforms source defect to close in this wave.

```text
CREATE_PARITY_STATE = MOBILE_VIDEO_LIBRARY_ONLY; WEB_VIDEO_AND_ARTICLE
```

---

## Exact files changed

### Web (this task; uncommitted)

| Path | Action |
| --- | --- |
| `lib/android/assetLinks.ts` | New builder (404 without fingerprint) |
| `lib/android/assetLinks.test.ts` | New (4 tests) |
| `app/.well-known/assetlinks.json/route.ts` | New GET route |
| `.env.example` | Document `ANDROID_APP_LINKS_SHA256` |
| `vitest.config.ts` | Include `lib/android/**/*.test.ts` |
| `docs/ai/PC2_A3_V2_REPORT.md` | This report |

Store product files from `PC2_A1_REPORT.md` were **not** modified. `CURSOR_REPORT.md` / `CURRENT_TASK.md` were **not** overwritten.

### Mobile (worktree only; uncommitted; `77e9e28` untouched)

| Path | Action |
| --- | --- |
| `app.config.ts` | Remove CAMERA/RECORD_AUDIO; add blockedPermissions |
| `src/lib/ios/appStoreConfig.test.ts` | Assert Android leftovers are gone |

---

## Migrations created

None.

---

## Security review

- No secrets, `.env` values, service-role keys, or keystore material read or printed.
- Asset Links builder rejects non-SHA-256 input and serves 404 until an operator supplies a real Play/EAS fingerprint.
- Proxy continues to exclude `/.well-known/` from session gating.
- Camera/mic removal matches fail-closed Live and gallery-only Create. `blockedPermissions` prevents plugin re-injection.
- No invented signing fingerprints.
- Diverged mobile checkout was not merged or reset.

---

## Tests

```text
WEB:
  npx vitest run lib/android/assetLinks.test.ts lib/ios/appleAppSiteAssociation.test.ts
  = 6/6 PASS (4 assetLinks + 2 AASA)
  npx tsc --noEmit = PASS (exit 0)
  git diff --check (owned files) = PASS (exit 0)

MOBILE:
  npx vitest in permission worktree = NOT_RUN (worktree has no node_modules; junction/install not performed)
  node source assertion on worktree app.config.ts = PASS (CAMERA/RECORD_AUDIO absent from permissions; blockedPermissions present)
```

---

## TypeScript

```text
WEB npx tsc --noEmit = PASS
MOBILE tsc = NOT_RUN (worktree has no node_modules)
```

---

## Build

```text
WEB npm run build = NOT_RUN (route added; no UI entry change required by this task; no production deploy available)
EAS / IPA / AAB = NOT_RUN
NEW_MOBILE_BUILD_REQUIRED = YES
```

A future Android binary must be authorized by Central from `09e94f8` + this permission patch (or a descendant). Do **not** ship `77e9e28`. Do not rebuild iOS solely for this Android manifest change.

---

## git diff --check

```text
WEB owned files = PASS (exit 0)
MOBILE worktree = PASS (exit 0)
```

---

## git status --short

### Web (owned by this task)

```text
 M .env.example
 M vitest.config.ts
?? app/.well-known/assetlinks.json/
?? lib/android/
?? docs/ai/PC2_A3_V2_REPORT.md
```

Other dirty/untracked paths (Store/docs/logs/worktrees, `CURRENT_TASK.md`, `CURSOR_REPORT.md`, sibling A1/A2 V2 files) were **not** owned or modified by this task.

### Mobile diverged checkout (untouched by this task)

```text
pc2/eas-preview-config-v1 @ 77e9e28 (ahead 1, behind 1)
```

### Mobile permission worktree

```text
pc2/a3-android-unused-permissions-v2 @ 09e94f8
 M app.config.ts
 M src/lib/ios/appStoreConfig.test.ts
```

---

## Open issues

1. **Production assetlinks still 404** until `ANDROID_APP_LINKS_SHA256` is set from Play Console / EAS and the web route is deployed to `umtuba.com` and `www.umtuba.com`.
2. **Permission patch uncommitted** — Git author identity missing on this machine; do not set git config here. Operator should commit on `pc2/a3-android-unused-permissions-v2`.
3. **New Android binary not authorized** — manifest change cannot ship without a Central-authorized EAS/Play build.
4. **PC2 diverged checkout remains** — do not merge or ship `77e9e28`.
5. Mobile login-from-Profile has no return path; default destinations differ (Watch vs web Discover). Not flipped this task.
6. Guest save/like fails silently (no login prompt). Authenticated save exists at source.

---

## What this task did / did not do

| Action | Status |
| --- | --- |
| Read PROJECT_STATE / CURRENT_TASK / DEVELOPMENT_WORKFLOW / PC2_A3_REPORT | DONE |
| `git fetch --prune` on web + mobile | DONE |
| Implement assetlinks serving path without inventing fingerprint | DONE |
| Probe production assetlinks / AASA | DONE (404 / 200) |
| Remove unused Android CAMERA/RECORD_AUDIO on new master-based branch | SOURCE PATCH |
| Commit mobile patch | FAILED (no git identity) |
| Transport unique checkout delta | NONE (none exists) |
| Overwrite CURSOR_REPORT / CURRENT_TASK | NO |
| Modify Store A1 files | NO |
| Merge/rebase/reset `77e9e28` | NO |
| EAS rebuild / binary edit | NO |
| Desktop Android device QA | NO |
| Duplicate Central web Follow/delete-menu fixes | NO |

---

## Machine-readable close

```text
TASK_ID = PC2_A3_MOBILE_PARITY_BLOCKERS_RESOLUTION_V2
ASSETLINKS_REQUIRED = YES
ASSETLINKS_ROOT_CAUSE = NO_WELL_KNOWN_ROUTE_AND_NO_AUTHORITATIVE_FINGERPRINT
ASSETLINKS_FIXED = SOURCE_ONLY
ASSETLINKS_PRODUCTION_VERIFIED = NO
CAMERA_REQUIRED = NO
RECORD_AUDIO_REQUIRED = NO
PERMISSION_FIX = SOURCE_PATCH_ON_NEW_BRANCH_UNCOMMITTED
PERMISSION_CHANGE_REQUIRES_REBUILD = YES
CHECKOUT_DIVERGENCE = CONFIRMED_HISTORY_ONLY_NO_UNIQUE_PRODUCT_DELTA
AUTHORITATIVE_CHECKOUT_STATE = origin/master 09e94f8 product SoT; 4eede0b descendant already contains Team ID lock + extra UGC tests
MISSING_DELTA_TRANSPORTED = NO
SAVED_STATE = SOURCE_PRESENT_AUTH_GATED
FOLLOW_LABEL_STATE = WEB_ALREADY_FOLLOWING; MOBILE_NO_FOLLOW_CONTROL
LOGIN_REDIRECT_STATE = MOBILE_DEFAULT_WATCH; WEB_DEFAULT_DISCOVER; NOT_FLIPPED_TO_PROFILE
DELETE_MENU_STATE = MOBILE_RAIL_PLUS_SYSTEM_ALERT; WEB_MORE_MENU_CENTRAL_OWNED
CREATE_PARITY_STATE = MOBILE_VIDEO_LIBRARY_ONLY; WEB_VIDEO_AND_ARTICLE
TESTS = WEB_6_PASS; MOBILE_VITEST_NOT_RUN_NO_NODE_MODULES; SOURCE_ASSERT_PASS
COMMIT_SHA = NONE
NEW_MOBILE_BUILD_REQUIRED = YES
BLOCKERS = [ASSETLINKS_FINGERPRINT_AND_PRODUCTION_DEPLOY, ANDROID_PERMISSION_PATCH_UNCOMMITTED_NO_GIT_IDENTITY, NEW_ANDROID_BINARY_NOT_AUTHORIZED]
COMMIT = NO
PUSH = NO
STATUS = COMPLETE_WITH_BLOCKERS
```

END PC2_A3_MOBILE_PARITY_BLOCKERS_RESOLUTION_V2
