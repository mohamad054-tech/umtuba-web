# PC2_A1_IOS_BUILD5_FINAL_V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_A1_IOS_BUILD5_FINAL_V1
DATE = 2026-08-16
MODE = EXECUTION
CENTRAL_AUTHORITATIVE_MOBILE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
REUPLOAD_BUILD_4 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_MODIFIED = NO
DEVICE_PASS_INVENTED = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
BUILD_NUMBER = 5
EAS_BUILD_ID = 4c341dcb-b4a8-4549-b50e-5eeb79293b36
BUILD_RESULT = FINISHED
BUILD_SOURCE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
IOS_ARTIFACT = https://expo.dev/artifacts/eas/C51zrL-DCo0P8T5GEadUqtKWjpZY5iLcUz2T6CC0eBA.ipa
BLOCKERS = TESTFLIGHT_UPLOAD_NOT_STARTED; APP_STORE_REVIEW_NOT_SUBMITTED; DEVICE_QA_NOT_RUN; NO_PRODUCT_PASS
```

```text
APP_VERSION = 1.0.0
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 4_TO_5
ANDROID_VERSIONCODE_BEFORE = 7
ANDROID_VERSIONCODE_AFTER = 7
TESTFLIGHT_UPLOAD = NO
APP_STORE_SUBMITTED = NO
IPHONE_QA = NOT_RUN
```

Do **not** treat this as a product PASS. EAS `FINISHED` is a cloud-build status only.

---

## Phase 1 — Source lock

Preferred new worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a1-ios-build5-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
LOCAL_SOURCE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
WORKTREE = detached HEAD at 017be09
CLEAN_WORKTREE = YES
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not** reset, merged, or used as SoT (`77e9e28` / `pc2/eas-preview-config-v1` untouched).

Stale PC2 branches were **not** used as SoT:

- `pc2/a2-open-watch-published-post-v1` (`88caf13` local / historical `edc898f` Build 4)
- `pc2/eas-preview-config-v1` (`77e9e28`)
- `e3457fc` (Global Back ancestor only)

No source files were committed. `npm ci` was local-only in the new worktree so Expo plugins resolve. `node_modules` is untracked.

---

## Phase 2 — Required shared fixes (read/prove, not re-implemented)

All required ancestors are in `017be09`. Source files were read in the Build 5 worktree. Missing-fix STOP was **not** triggered.

| Required fix | Ancestor | Proof in `017be09` |
| --- | --- | --- |
| Open Watch after publish | `e87668e` | `src/lib/video/createJourney.ts` `openWatchAfterPublishHref` → `/(tabs)/watch?post=${id}` |
| Messages realtime | `73e4723` / `edc898f` | `src/lib/messenger/realtimeSubscribe.ts` rejects `.on()` after `joined` / `joining` / `subscribed` |
| Login → Profile | `42bbd28` | `src/lib/auth/postAuthDestination.ts` `POST_AUTH_HREF = "/(tabs)/profile"` |
| Other-user Profile `?id=` + `?u=` fallback | `9202978` / `88caf13` | `src/lib/profile/resolveTarget.ts` prefers `?id=`; `watchAvatarHref.ts` emits `/profile?u=&id=` |
| Follow / Following | `9202978` | `src/lib/social/follows.ts` `followButtonLabel` → Follow / Following, never Unfollow |
| Saved direct RLS | `831936c` | `src/lib/social/interactions.ts` `togglePostSave` writes `post_saves` via RLS; does not call `toggle_post_save` |
| Global Back | `e3457fc` | `src/lib/nav/globalBack.ts` + tests |
| UGC report/block | `eb0267a` / `09e94f8` / `017be09` | `src/lib/social/ugcModeration.ts` binds `report_ugc_content` / `report_ugc_user` / `block_ugc_user` |
| Account deletion | `6fd5852` | `src/lib/settings/supportLinks.ts` + Settings opens `https://umtuba.com/account-deletion` |
| CAMERA/MIC cleanup | `652ef7f` | `app.config.ts` `android.blockedPermissions` CAMERA + RECORD_AUDIO |
| iOS location purpose string | `6733cd5` | `app.config.ts` `ios.infoPlist.NSLocationWhenInUseUsageDescription` |

No replacements were invented. No silent product fixes were added on top of `017be09`.

---

## Phase 3 — Build number

`eas.json` uses `cli.appVersionSource = remote` and `build.production.autoIncrement = true`. Local `app.config.ts` `ios.buildNumber = "1"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
APP_VERSION = 1.0.0
EAS_REMOTE_BUILD_NUMBER_BEFORE = 4
EXPECTED_BUILD_NUMBER = 5
BUNDLE_ID = com.umtuba.app
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 4 to 5.` It did **not** reuse 3/4 and did **not** jump past 5.

Android remote `versionCode` stayed **7** before and after. Android release was not rebuilt.

---

## Phase 4 — One iOS production build

Exactly one authorized production/store build this turn:

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a1-ios-build5-v1
EAS_BUILD_ID = 4c341dcb-b4a8-4549-b50e-5eeb79293b36
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 5
gitCommitHash = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
isForIosSimulator = false
createdAt = 2026-08-16T08:37:18.475Z
completedAt = 2026-08-16T08:42:19.001Z
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/4c341dcb-b4a8-4549-b50e-5eeb79293b36
```

Built source matches the authorized SHA. No other source change. Build 4 (`0257773b-562e-4fb6-8237-206a8b4dd237` / `edc898f`) was not re-uploaded.

---

## Phase 5 — Submit

```text
EAS_SUBMIT = NOT_STARTED
TESTFLIGHT_UPLOAD = NO
APP_STORE_REVIEW_SUBMIT = NO
EXTERNAL_BETA = NO
REUPLOAD_BUILD_4 = NO
```

Task forbids App Store Production / App Review submit. `eas submit --profile production` was **not** run. The store IPA exists on EAS. Internal TestFlight will not show Build 5 until Central/operator uploads this artifact.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `017be09` only.
- Build number 5, not 3, not 4.
- No App Store Review submit.
- No Production submit.
- No force push / reset / merge of `77e9e28`.
- `docs/ai/CURSOR_REPORT.md` not overwritten.
- Store / Learning files in this web repo not touched.
- No tokens / `.p8` / ASC key material printed.
- No new product fixes.

---

## What happens next

1. Central/operator: upload EAS IPA `4c341dcb-b4a8-4549-b50e-5eeb79293b36` to TestFlight if a device install is required. Do not re-upload Build 4. Do not Submit for Review from this report.
2. Physical iPhone QA on **1.0.0 (5)** only. Do not copy Build 4 device verdicts forward as Build 5 PASS.
3. Saved / Follow / other-user Profile / Open Watch after publish / UGC / account-deletion entry remain **NOT_TESTED** on this binary.
