# PC2_IOS_BUILD12_SESSION_QA_V1 — PHASE 1 / P0 PROVENANCE

## Resume verification (this turn)

A prior P0 agent was ABORTED after EAS/TestFlight already completed.
This resume **did not start a second EAS iOS build**. Independent
re-check on 2026-08-17:

```text
REUSED_EXISTING_EAS = YES
DUPLICATE_EAS_STARTED = NO
LOCAL_SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 12
EAS_BUILD_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
EAS_STATUS = FINISHED
BUILD_SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
EAS_SUBMIT_ID = d87be758-6e5c-4c92-98e3-44f394db440f
SUBMIT_STATUS = FINISHED
ASC_1.0.0_12_INTERNAL = IN_BETA_TESTING
BUILD12_TESTFLIGHT_AVAILABLE = YES_INTERNAL
APP_STORE_PRODUCTION_SUBMITTED = NO
```

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD12_SESSION_QA_V1
PHASE = P0 COMPLETE (TestFlight 12 internal; no device QA)
DATE = 2026-08-17
MODE = EXECUTION
DEVICE = PC2
AUTHORIZED_SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
BUILD11_HISTORICAL_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
BUILD10_BURNED_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
WAVE2_SHA = 31db97d (not present on remotes; not merged)
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 12
ANDROID_VERSION_CODE_REMOTE_BEFORE = 12
ANDROID_VERSION_CODE_REMOTE_AFTER = 12
ANDROID_VERSION_CODE_IN_SHA = 13
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
REUPLOAD_BUILD_11 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
LEARNING_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
BUILD10_WORKTREE_USED = NO
BUILD11_WORKTREE_USED = NO
UNCOMMITTED_PC2_PATCH_USED = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_MODIFIED = NO
DEVICE_PASS_INVENTED = NO
DEVICE_QA_RUN = NO
PLAINTEXT_PASSWORD = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
BUILD_NUMBER = 12
EAS_BUILD_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
BUILD_SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
EXPO_MEDIA_LIBRARY = 57.0.3
BUILD_RESULT = FINISHED
BUILD12_TESTFLIGHT_AVAILABLE = YES_INTERNAL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
TESTS = FAIL (1 failed / 579 passed / 69 files) — Windows locale wallet only
TYPECHECK = PASS
LINT = PASS
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 11_TO_12
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 13
ANDROID_VERSIONCODE_REMOTE_BEFORE = 12
ANDROID_VERSIONCODE_REMOTE_AFTER = 12
TESTFLIGHT_UPLOAD = YES
EAS_SUBMIT_ID = d87be758-6e5c-4c92-98e3-44f394db440f
ASC_APP_ID = 6801665530
APP_STORE_SUBMITTED = NO
IPHONE_QA = NOT_RUN
```

Do **not** treat this as a product PASS. EAS `FINISHED` and ASC
`IN_BETA_TESTING` are build/upload status only. Device QA was not run.
Operator install is a later turn.

---

## Phase 1 — Source lock

Preferred new worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build12-session-qa-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
LOCAL_SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
COMMIT_SUBJECT = fix(mobile): persist session across SecureStore desync and stamp iOS 12 / Android 13.
WORKTREE = detached HEAD at 7638487
CLEAN_WORKTREE = YES
BUILD10_IS_ANCESTOR = YES (burned source not used as SoT)
BUILD11_IS_ANCESTOR = YES (historical source not used as SoT)
WAVE2_31db97d_PRESENT = NO
WAVE2_MERGED = NO
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not**
reset, merged, rebased, stashed, or used as SoT (`77e9e28` /
`pc2/eas-preview-config-v1` untouched).

Build 10 / Build 11 worktrees were **not** used as SoT:

- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build10-final-share-create-qa-v1` @ `4d329e1`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build11-launch-surgical-qa-v1` @ `4b9fa56`

Stale / superseded sources were **not** used:

- `pc2/a2-open-watch-published-post-v1`
- `pc2/eas-preview-config-v1` (`77e9e28`)
- Build 5 SHA `017be09f4dff2e7c39f8f4363a79cef46cd52d48`
- Build 6 SHA `c48b4b2898b116a39e90b85221ae1856f446d0a0`
- Build 7 SHA `74188bea5a23269c3d19448894c6ad5381e3b3a9`
- Build 8 SHA `658936e18718606a3b3d30753e717d7fe9e86a18`
- Build 9 SHA `7b33bae707a0eecb4107f4373698630eaea7a1c5`
- Rejected Build 10 SHA `4d329e1bed2e1bc1a90902a1781f1821c0009392`
- Build 11 SHA `4b9fa5667e1db59c1854d61d23fdf12862a81a31`
- Localization Wave 2 `31db97d` (object missing on remotes)

No source files were committed. `npm ci` was local-only in the new worktree.

---

## SOURCE_DIFF vs Build 11 `4b9fa5667e1db59c1854d61d23fdf12862a81a31`

One commit on `origin/central/mobile-reconcile-ios-android-v1`:

| SHA | Subject / intent |
| --- | --- |
| `7638487` | `fix(mobile): persist session across SecureStore desync and stamp iOS 12 / Android 13.` |

8 files, +345 / −55:

- `app.config.ts`: `ios.buildNumber` 11 → 12; `android.versionCode` 12 → 13 (in SHA only)
- `src/lib/auth/AuthContext.tsx`: skip `INITIAL_SESSION(null)` clobber while hydrating
- `src/lib/auth/sessionHydration.ts` + test: bootstrap clobber guard
- `src/lib/ios/appStoreConfig.test.ts`: expected buildNumber `"12"`, Android versionCode `13`
- `src/lib/supabase/authStorage.ts` + test: durable AsyncStorage session copy + SecureStore
- `src/lib/supabase/client.ts`: uses shared auth storage adapter

Android remote `versionCode` remains **12**. This iOS-only track did **not**
bump remote Android. Local SHA stamp 13 was not applied remotely.

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and
`build.production.autoIncrement = true`. Local `app.config.ts`
`ios.buildNumber = "12"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 12
EAS_REMOTE_BUILD_NUMBER_BEFORE = 11
EXPECTED_BUILD_NUMBER = 12
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 13
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 12
EAS_REMOTE_ANDROID_VERSIONCODE_AFTER = 12
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 11 to 12.` It did **not**
reuse 3/4/5/6/7/8/9/10/11 and did **not** jump past 12.

Android remote `versionCode` was already **12** before this iOS build.
This track did **not** bump Android. Observed before and after = **12**.

---

## SOURCE_AUTH_NOTE (read-only; later P3)

```text
PLAINTEXT_PASSWORD = NO
PASSWORD_WRITTEN_TO_ASYNCSTORAGE = NO
SESSION_PERSISTENCE = src/lib/supabase/authStorage.ts + src/lib/supabase/client.ts
HYDRATION_GUARD = src/lib/auth/sessionHydration.ts + AuthContext.tsx
```

Source contract: persist session/refresh-token JSON only — never
email/password. Password is passed only to
`supabase.auth.signInWithPassword` / `signUp` and is not written to
AsyncStorage or SecureStore by app code.

Durable copy: `setItem` always writes session JSON to AsyncStorage
first, then SecureStore when the payload is under ~1800 bytes. Read
tries SecureStore first and falls back to AsyncStorage on miss/empty/
error. Logout clears both.

`AuthContext` skips `INITIAL_SESSION(null)` while `restore()` is still
hydrating so a SecureStore miss cannot wipe a session already applied
from the durable copy.

No secrets, tokens, or passwords were printed or stored in this report.

---

## Phase 3 — expo-media-library pin (Build 10 crash class)

Build 11 pin is still present on this SHA.

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

---

## Phase 4 — Required quality commands

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build12-session-qa-v1`

```text
COMMAND = npm ci
RESULT = PASS (exit 0; 680 packages)
```

Targeted (share + create/library + watch/create + appStoreConfig + session):

```text
COMMAND = npx vitest run src/lib/social/shareEntry.test.ts src/lib/social/sharePost.test.ts src/lib/video/pickVideo.test.ts src/lib/video/createUploadState.test.ts src/lib/video/createJourney.test.ts src/lib/permissions/foundation.test.ts src/lib/i18n/i18n.test.ts src/lib/linking/deepLinks.test.ts src/lib/ios/appStoreConfig.test.ts src/lib/auth/sessionHydration.test.ts src/lib/supabase/authStorage.test.ts
RESULT = PASS (exit 0)
VITEST = 122 passed (122)
FILES = 11 passed (11)
```

```text
COMMAND = npm test
RESULT = FAIL (exit 1)
VITEST = 1 failed | 579 passed (580)
FILES = 1 failed | 68 passed (69)
```

Failure recorded as-is. **Not patched**:

1. `src/lib/wallet/format.test.ts` — `formatWalletAmountExact(1234)`
   expected `/1/`; host Windows locale produced `١٬٢٣٤`. Same
   environment/locale assertion as Builds 9–11. Not a new product change.

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
Builds 7–11). **Not** App Store Production submit.

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build12-session-qa-v1
EAS_BUILD_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 12
gitCommitHash = 7638487d1412f070e19285fc434362b47a359ea5
gitCommitMessage = fix(mobile): persist session across SecureStore desync and stamp iOS 12 / Android 13.
isForIosSimulator = false
createdAt = 2026-08-17T17:16:06.401Z
completedAt = 2026-08-17T17:20:50.962Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/9474d6wSqBCpBRXgzkZr38bHe9qtLIJ92KrjTX7IUv0.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/5e3337c4-37dd-455c-bc8d-c24d6062ecb6
FINGERPRINT = a2eb9ca0380de547f4d81194399907d3c84db6e4
```

Built source matches the authorized SHA. No other source change.
Builds 3/4/5/6/7/8/9/10/11 were not re-uploaded or reused.

```text
PREVIOUS_BUILD11_EAS_ID = 96aca0f9-47f9-4c32-b443-c2301a97ecba
PREVIOUS_BUILD11_SOURCE = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
PREVIOUS_BUILD10_EAS_ID = 9472a064-9e80-41b3-a61a-3473bc639c86
PREVIOUS_BUILD10_SOURCE = 4d329e1bed2e1bc1a90902a1781f1821c0009392
```

---

## Phase 6 — Internal TestFlight upload (Build 12 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530`
(same ASC app as Builds 3–11). Submit ran, then `eas.json` was restored.
Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id 5e3337c4-37dd-455c-bc8d-c24d6062ecb6 --profile production --non-interactive --wait
EAS_SUBMIT_ID = d87be758-6e5c-4c92-98e3-44f394db440f
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
REUPLOAD_BUILD_11 = NO
```

`eas submit:status` after Apple processing:

```text
App Store Live: none (JSON listed only testFlightBuilds)
In review: none
Pending release: none
1.0.0 (12) — internal: in beta testing, external: ready for beta submission
EAS Build ID 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
EAS Submission d87be758-6e5c-4c92-98e3-44f394db440f
processingState = VALID
internalState = IN_BETA_TESTING
externalState = READY_FOR_BETA_SUBMISSION
```

Builds 3–11 remain listed. They were not re-uploaded. App Store live /
in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof. P1–P4 was not started.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `7638487` only.
- Build number 12, not 3–11.
- No App Store Review submit.
- No Production submit.
- No local product patch.
- No P1–P4 device QA this turn.
- Android remote versionCode left at 12 (not bumped by this track).
- `CURSOR_REPORT.md` not overwritten.
