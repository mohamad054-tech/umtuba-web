# PC2_IOS_BUILD11_LAUNCH_SURGICAL_QA_V1 — PHASE 1 / P0 PROVENANCE

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD11_LAUNCH_SURGICAL_QA_V1
PHASE = P0 COMPLETE (TestFlight 11 internal; no device QA)
DATE = 2026-08-17
MODE = EXECUTION
DEVICE = PC2
AUTHORIZED_SOURCE_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
BUILD10_BURNED_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
WAVE2_SHA = 31db97d (not present on remotes; not merged)
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 11
ANDROID_VERSION_CODE_REMOTE_BEFORE = 12
ANDROID_VERSION_CODE_IN_SHA = 12
BUNDLE_ID = com.umtuba.app
EXPO_MEDIA_LIBRARY = 57.0.3
EXPO_MODULES_CORE = 57.0.6
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
REUPLOAD_BUILD_5 = NO
REUPLOAD_BUILD_6 = NO
REUPLOAD_BUILD_7 = NO
REUPLOAD_BUILD_8 = NO
REUPLOAD_BUILD_9 = NO
REUPLOAD_BUILD_10 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
LEARNING_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
BUILD10_WORKTREE_USED = NO
UNCOMMITTED_PC2_PATCH_USED = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_MODIFIED = NO
DEVICE_PASS_INVENTED = NO
DEVICE_QA_RUN = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
BUILD_NUMBER = 11
EAS_BUILD_ID = 96aca0f9-47f9-4c32-b443-c2301a97ecba
BUILD_SOURCE_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
EXPO_MEDIA_LIBRARY = 57.0.3
BUILD_RESULT = FINISHED
BUILD11_TESTFLIGHT_AVAILABLE = YES_INTERNAL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
TESTS = FAIL (1 failed / 567 passed / 67 files) — Windows locale wallet only
TYPECHECK = PASS
LINT = PASS
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 10_TO_11
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 12
ANDROID_VERSIONCODE_REMOTE_BEFORE = 12
ANDROID_VERSIONCODE_REMOTE_AFTER = 12
TESTFLIGHT_UPLOAD = YES
EAS_SUBMIT_ID = 3bb775e9-7614-45e2-aaf3-b95a5182a067
ASC_APP_ID = 6801665530
APP_STORE_SUBMITTED = NO
IPHONE_QA = NOT_RUN
LONG_VIDEO_GATE = NO_MAX_DURATION_IN_SOURCE
```

Do **not** treat this as a product PASS. EAS `FINISHED` and ASC
`IN_BETA_TESTING` are build/upload status only. Device QA was not run.
Operator install is a later turn.

---

## Phase 1 — Source lock

Preferred new worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build11-launch-surgical-qa-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
LOCAL_SOURCE_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
COMMIT_SUBJECT = fix(mobile): pin expo-media-library to SDK 57 ABI and stamp iOS build 11.
WORKTREE = detached HEAD at 4b9fa56
CLEAN_WORKTREE = YES
BUILD10_IS_ANCESTOR = YES (burned source not used as SoT)
WAVE2_31db97d_PRESENT = NO
WAVE2_MERGED = NO
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not**
reset, merged, rebased, stashed, or used as SoT (`77e9e28` /
`pc2/eas-preview-config-v1` untouched).

Build 10 worktree was **not** used as SoT:

- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build10-final-share-create-qa-v1` @ `4d329e1`

Stale / superseded sources were **not** used:

- `pc2/a2-open-watch-published-post-v1`
- `pc2/eas-preview-config-v1` (`77e9e28`)
- Build 5 SHA `017be09f4dff2e7c39f8f4363a79cef46cd52d48`
- Build 6 SHA `c48b4b2898b116a39e90b85221ae1856f446d0a0`
- Build 7 SHA `74188bea5a23269c3d19448894c6ad5381e3b3a9`
- Build 8 SHA `658936e18718606a3b3d30753e717d7fe9e86a18`
- Build 9 SHA `7b33bae707a0eecb4107f4373698630eaea7a1c5`
- Rejected Build 10 SHA `4d329e1bed2e1bc1a90902a1781f1821c0009392`
- Localization Wave 2 `31db97d` (object missing on remotes)

No source files were committed. `npm ci` was local-only in the new worktree.

---

## SOURCE_DIFF vs burned Build 10 `4d329e1bed2e1bc1a90902a1781f1821c0009392`

One commit on `origin/central/mobile-reconcile-ios-android-v1`:

| SHA | Subject / intent |
| --- | --- |
| `4b9fa56` | `fix(mobile): pin expo-media-library to SDK 57 ABI and stamp iOS build 11.` |

4 files, +7 / −7:

- `package.json` / `package-lock.json`: `expo-media-library` `~57.0.3` (resolved **57.0.4**) → exact **57.0.3**
- `app.config.ts`: `ios.buildNumber` 10 → 11
- `src/lib/ios/appStoreConfig.test.ts`: expected buildNumber `"7"` → `"11"`

Android `versionCode` in this SHA remains **12** (same as Build 10 stamp). Not bumped this turn.

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and
`build.production.autoIncrement = true`. Local `app.config.ts`
`ios.buildNumber = "11"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 11
EAS_REMOTE_BUILD_NUMBER_BEFORE = 10
EXPECTED_BUILD_NUMBER = 11
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 12
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 12
EAS_REMOTE_ANDROID_VERSIONCODE_AFTER = 12
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 10 to 11.` It did **not**
reuse 3/4/5/6/7/8/9/10 and did **not** jump past 11.

Android remote `versionCode` was already **12** before this iOS build
(Build 10 report had remote 11 after that iOS-only job). This track did
**not** bump Android. Observed before and after = **12**.

---

## Phase 3 — expo-media-library pin (Build 10 crash class)

Build 10 failed at dyld because ExpoMediaLibrary 57.0.4 referenced
`BaseModule.willDestroy`, which expo-modules-core 57.0.6 does not export.

```text
EXPO_MEDIA_LIBRARY_PACKAGE_JSON = 57.0.3
EXPO_MEDIA_LIBRARY_LOCKFILE = 57.0.3
EXPO_MEDIA_LIBRARY_INSTALLED = 57.0.3
EXPO_MEDIA_LIBRARY_57_0_4_PRESENT = NO
EXPO_MODULES_CORE_LOCKFILE = 57.0.6
EXPO_MODULES_CORE_INSTALLED = 57.0.6
WILLDESTROY_IN_EXPO_MEDIA_LIBRARY = NO
WILLDESTROY_IN_EXPO_MODULES_CORE = NO
MEDIA_LIBRARY_PIN_BLOCK = NO
```

Lockfile resolved URL:
`https://registry.npmjs.org/expo-media-library/-/expo-media-library-57.0.3.tgz`

`willDestroy` does not appear in installed `expo-media-library` or
`expo-modules-core` sources. Native binary pairing is still proven only
after a later iPhone launch (not this P0 turn).

---

## Phase 4 — Required quality commands

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build11-launch-surgical-qa-v1`

```text
COMMAND = npm ci
RESULT = PASS (exit 0; 680 packages)
```

Targeted (share + create/library + watch/create + appStoreConfig):

```text
COMMAND = npx vitest run src/lib/social/shareEntry.test.ts src/lib/social/sharePost.test.ts src/lib/video/pickVideo.test.ts src/lib/video/createUploadState.test.ts src/lib/video/createJourney.test.ts src/lib/permissions/foundation.test.ts src/lib/i18n/i18n.test.ts src/lib/linking/deepLinks.test.ts src/lib/ios/appStoreConfig.test.ts
RESULT = PASS (exit 0)
VITEST = 110 passed (110)
FILES = 9 passed (9)
```

Historical `appStoreConfig` fail is **gone** on this SHA (expects `"11"`).

```text
COMMAND = npm test
RESULT = FAIL (exit 1)
VITEST = 1 failed | 567 passed (568)
FILES = 1 failed | 66 passed (67)
```

Failure recorded as-is. **Not patched**:

1. `src/lib/wallet/format.test.ts` — `formatWalletAmountExact(1234)`
   expected `/1/`; host Windows locale produced `١٬٢٣٤`. Same
   environment/locale assertion as Builds 9–10. Not a new product change.

```text
COMMAND = npm run typecheck
RESULT = PASS (exit 0; tsc --noEmit)
```

```text
COMMAND = npm run lint
RESULT = PASS (exit 0; package lint script is tsc --noEmit)
```

---

## Phase 5 — One iOS production/TestFlight build

Exactly one authorized production/store build this turn (same path as
Builds 7–10). **Not** App Store Production submit.

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build11-launch-surgical-qa-v1
EAS_BUILD_ID = 96aca0f9-47f9-4c32-b443-c2301a97ecba
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 11
gitCommitHash = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
gitCommitMessage = fix(mobile): pin expo-media-library to SDK 57 ABI and stamp iOS build 11.
isForIosSimulator = false
createdAt = 2026-08-17T15:56:37.067Z
completedAt = 2026-08-17T16:01:13.855Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/rSYtY6BDhh1HGqos0hQdFT-IYJwThsBVyZGvcitKUFM.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/96aca0f9-47f9-4c32-b443-c2301a97ecba
FINGERPRINT = 2fff42cf5b3750f9ce2c02ea0d5a0e2feb4e6594
```

Built source matches the authorized SHA. No other source change.
Builds 3/4/5/6/7/8/9/10 were not re-uploaded or reused.

```text
PREVIOUS_BUILD10_EAS_ID = 9472a064-9e80-41b3-a61a-3473bc639c86
PREVIOUS_BUILD10_SOURCE = 4d329e1bed2e1bc1a90902a1781f1821c0009392
PREVIOUS_BUILD9_EAS_ID = 72a73a7e-8c7c-45de-8f4e-7d159f7054e2
PREVIOUS_BUILD9_SOURCE = 7b33bae707a0eecb4107f4373698630eaea7a1c5
```

---

## Phase 6 — Internal TestFlight upload (Build 11 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530`
(same ASC app as Builds 3–10). Submit ran, then `eas.json` was restored.
Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id 96aca0f9-47f9-4c32-b443-c2301a97ecba --profile production --non-interactive --wait
EAS_SUBMIT_ID = 3bb775e9-7614-45e2-aaf3-b95a5182a067
SUBMIT_STATUS = FINISHED
ASC_APP_ID = 6801665530
TESTFLIGHT_UPLOAD = YES
EXTERNAL_BETA = NO
APP_STORE_REVIEW_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
REUPLOAD_BUILD_5 = NO
REUPLOAD_BUILD_6 = NO
REUPLOAD_BUILD_7 = NO
REUPLOAD_BUILD_8 = NO
REUPLOAD_BUILD_9 = NO
REUPLOAD_BUILD_10 = NO
```

`eas submit:status` after Apple processing:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (11) — internal: in beta testing, external: ready for beta submission
EAS Build ID 96aca0f9-47f9-4c32-b443-c2301a97ecba
EAS Submission 3bb775e9-7614-45e2-aaf3-b95a5182a067
processingState = VALID
internalState = IN_BETA_TESTING
externalState = READY_FOR_BETA_SUBMISSION
```

Builds 3–10 remain listed. They were not re-uploaded. App Store live /
in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof. P1/P2 was not started.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `4b9fa56` only.
- Build number 11, not 3–10.
- No App Store Review submit.
- No Production submit.
- No local product patch.
- No P1/P2 device QA this turn.
- Android remote versionCode left at 12 (not bumped by this track).
- `CURSOR_REPORT.md` not overwritten.
