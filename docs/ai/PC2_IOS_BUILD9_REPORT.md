# PC2_IOS_BUILD9_SURGICAL_QA_V1 — PHASE 1 BUILD

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD9_SURGICAL_QA_V1
PHASE = 1 BUILD
DATE = 2026-08-17
MODE = EXECUTION
DEVICE = PC2
AUTHORIZED_SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 9
ANDROID_VERSION_CODE_REMOTE = 10
ANDROID_VERSION_CODE_IN_SHA = 11
BUNDLE_ID = com.umtuba.app
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
REUPLOAD_BUILD_5 = NO
REUPLOAD_BUILD_6 = NO
REUPLOAD_BUILD_7 = NO
REUPLOAD_BUILD_8 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
LEARNING_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
BUILD8_WORKTREE_USED = NO
UNCOMMITTED_PC2_PATCH_USED = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_MODIFIED = NO
DEVICE_PASS_INVENTED = NO
DEVICE_QA_RUN = NO
```

## FINAL FIELDS

```text
BUILD9_SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
IOS_BUILD_NUMBER = 9
SOURCE_DIFF = EMPTY
TESTS = FAIL (2 failed / 533 passed / 65 files: 2 failed, 63 passed)
TYPECHECK = PASS
LINT = PASS
EAS_BUILD_ID = 72a73a7e-8c7c-45de-8f4e-7d159f7054e2
BUILD_RESULT = FINISHED
BUILD_SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
BUILD9_AVAILABLE = YES_INTERNAL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = TESTS_FAIL_ON_AUTHORIZED_SHA; DEVICE_QA_NOT_RUN; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 8_TO_9
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 11
ANDROID_VERSIONCODE_REMOTE_BEFORE = 10
ANDROID_VERSIONCODE_REMOTE_AFTER = 10
TESTFLIGHT_UPLOAD = YES
APP_STORE_SUBMITTED = NO
IPHONE_QA = NOT_RUN
```

Do **not** treat this as a product PASS. EAS `FINISHED` and TestFlight `in beta testing` are upload/processing statuses only. Device QA was not run.

---

## Phase 1 — Source lock

Preferred new worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build9-surgical-qa-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
LOCAL_SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
COMMIT_SUBJECT = fix(mobile): keep Create retry and late upload callbacks on the current asset only.
WORKTREE = detached HEAD at 7b33bae
CLEAN_WORKTREE = YES
SOURCE_DIFF = EMPTY
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not** reset, merged, rebased, stashed, or used as SoT (`77e9e28` / `pc2/eas-preview-config-v1` untouched).

Build 8 worktrees were **not** used as SoT:

- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-final-ios-watch-ui-fix-a2-v1` @ `658936e`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-watch-ui-fix-v1` @ `658936e`

Stale / superseded sources were **not** used:

- `pc2/a2-open-watch-published-post-v1`
- `pc2/eas-preview-config-v1` (`77e9e28`)
- Build 5 SHA `017be09f4dff2e7c39f8f4363a79cef46cd52d48`
- Build 6 SHA `c48b4b2898b116a39e90b85221ae1856f446d0a0`
- Build 7 SHA `74188bea5a23269c3d19448894c6ad5381e3b3a9`
- Build 8 SHA `658936e18718606a3b3d30753e717d7fe9e86a18`
- Build 8 EAS `64047c6d-3042-4e80-b6f5-386c288b8fe2`

No source files were committed. `npm ci` was local-only in the new worktree so Expo plugins resolve. `node_modules` is gitignored.

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and `build.production.autoIncrement = true`. Local `app.config.ts` `ios.buildNumber = "9"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 9
EAS_REMOTE_BUILD_NUMBER_BEFORE = 8
EXPECTED_BUILD_NUMBER = 9
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 11
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 10
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 8 to 9.` It did **not** reuse 3/4/5/6/7/8 and did **not** jump past 9.

Android remote `versionCode` stayed **10** before and after. Android release was not rebuilt. This track did **not** bump it.

---

## Phase 3 — Authorized SHA only (no local patch)

The authorized commit already contains Central's Create retry / late-upload callback fix. No local PC2 patch was applied.

```text
CREATE_RETRY_FIX_IN_SHA = YES
LOCAL_PC2_PATCH_APPLIED = NO
BUILD8_SHA_USED = NO
```

Commit subject: `fix(mobile): keep Create retry and late upload callbacks on the current asset only.`

---

## Phase 4 — Required quality commands

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build9-surgical-qa-v1`

```text
COMMAND = npm ci
RESULT = PASS (exit 0; 678 packages)
```

```text
COMMAND = npm test
RESULT = FAIL (exit 1)
VITEST = 2 failed | 533 passed (535)
FILES = 2 failed | 63 passed (65)
```

Failures recorded as-is. **Not patched** (task forbids silent product fixes / invented patches):

1. `src/lib/ios/appStoreConfig.test.ts` — expects `ios.buildNumber === "7"`; this SHA has `"9"`. Stale assertion on the authorized SHA.
2. `src/lib/wallet/format.test.ts` — `formatWalletAmountExact(1234)` expected `/1/`; host Windows locale produced `١٬٢٣٤`. Environment/locale assertion, not a new product change.

```text
COMMAND = npm run typecheck
RESULT = PASS (exit 0; tsc --noEmit)
```

```text
COMMAND = npm run lint
RESULT = PASS (exit 0; package lint script is tsc --noEmit)
```

---

## Phase 5 — One iOS production build

Exactly one authorized production/store build this turn:

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build9-surgical-qa-v1
EAS_BUILD_ID = 72a73a7e-8c7c-45de-8f4e-7d159f7054e2
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 9
gitCommitHash = 7b33bae707a0eecb4107f4373698630eaea7a1c5
isForIosSimulator = false
createdAt = 2026-08-17T10:40:51.951Z
completedAt = 2026-08-17T10:45:24.554Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/E0UWmsWBlNX4DQY6n7T6ylDqgGAq_ZOPbBAcqYV0JH0.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/72a73a7e-8c7c-45de-8f4e-7d159f7054e2
```

Built source matches the authorized SHA. No other source change. Builds 3/4/5/6/7/8 were not re-uploaded or reused.

Superseded Build 8 was **not** reused:

```text
PREVIOUS_BUILD8_EAS_ID = 64047c6d-3042-4e80-b6f5-386c288b8fe2
PREVIOUS_BUILD8_SOURCE = 658936e18718606a3b3d30753e717d7fe9e86a18
```

---

## Phase 6 — Internal TestFlight upload (Build 9 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530` (same ASC app as Builds 3–8). Submit ran, then `eas.json` was restored. Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id 72a73a7e-8c7c-45de-8f4e-7d159f7054e2 --profile production --non-interactive --wait
EAS_SUBMIT_ID = f7963ff0-26f3-4e9f-a875-fd429bd6ed52
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
```

`eas submit:status` after Apple processing:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (9) — internal: in beta testing, external: ready for beta submission
EAS Build ID 72a73a7e-8c7c-45de-8f4e-7d159f7054e2
EAS Submission f7963ff0-26f3-4e9f-a875-fd429bd6ed52
```

Builds 3, 4, 5, 6, 7, and 8 remain listed. They were not re-uploaded. App Store live / in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `7b33bae` only.
- Build number 9, not 3, not 4, not 5, not 6, not 7, not 8.
- Create retry / late-upload fix came from the authorized SHA. No local PC2 patch.
- No App Store Review submit.
- No Production submit.
- No force push / reset / merge of `77e9e28`.
- `docs/ai/CURSOR_REPORT.md` not overwritten.
- Store / Learning files in this web repo not touched.
- No tokens / `.p8` / ASC key material printed.
- No new product fixes.
- No failing tests patched.
- Android remote versionCode left at 10.

---

## What happens next

1. Physical iPhone QA on **1.0.0 (9)** only. Do not copy Build 4/5/6/7/8 device verdicts forward as Build 9 PASS.
2. If TestFlight still shows **(8)** or earlier: do not install. Reply `TESTFLIGHT_STILL_SHOWS_BUILD_8`.
3. Do not Submit for Review from this report.
