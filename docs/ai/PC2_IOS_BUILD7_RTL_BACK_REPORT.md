# PC2_IOS_BUILD7_RTL_BACK_DEVICE_QA_V1 — PHASE 1 BUILD

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD7_RTL_BACK_DEVICE_QA_V1
PHASE = 1 BUILD
DATE = 2026-08-16
MODE = EXECUTION
DEVICE = PC2
AUTHORIZED_SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 7
ANDROID_VERSION_CODE = 9
BUNDLE_ID = com.umtuba.app
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
REUPLOAD_BUILD_5 = NO
REUPLOAD_BUILD_6 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
LEARNING_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
BUILD6_WORKTREE_USED = NO
UNCOMMITTED_PC2_RTL_PATCH_USED = NO
IOS_ONLY_LOCALIZATION_FORK = NO
NEW_PRODUCT_FIXES_ADDED = NO
PLAYBACK_FIXES_INVENTED = NO
ANDROID_VERSIONCODE_MODIFIED = NO
DEVICE_PASS_INVENTED = NO
```

## FINAL FIELDS

```text
LOCAL_SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
SOURCE_DIFF = EMPTY
SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 7
ANDROID_VERSION_CODE = 9
TESTS = FAIL (1 failed / 477 passed / 59 files: 1 failed, 58 passed)
TYPECHECK = PASS
LINT = PASS
EAS_BUILD_ID = 67147f93-9c70-4631-8257-ff80628a49f6
BUILD_RESULT = FINISHED
BUILD_SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
TESTFLIGHT_AVAILABLE = YES_INTERNAL
BLOCKERS = TESTS_FAIL_ON_AUTHORIZED_SHA; DEVICE_QA_NOT_RUN; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 6_TO_7
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 9
ANDROID_VERSIONCODE_REMOTE_BEFORE = 9
ANDROID_VERSIONCODE_REMOTE_AFTER = 9
RTL_BACK_FIX_IN_SHA = YES
TESTFLIGHT_UPLOAD = YES
APP_STORE_SUBMITTED = NO
IPHONE_QA = NOT_RUN
```

Do **not** treat this as a product PASS. EAS `FINISHED` and TestFlight `in beta testing` are upload/processing statuses only. Device QA was not run.

---

## Phase 1 — Source lock

Preferred new worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build7-rtl-back-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
LOCAL_SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
COMMIT_SUBJECT = fix(mobile): keep RTL Back hitbox aligned with the visible chevron.
WORKTREE = detached HEAD at 74188be
CLEAN_WORKTREE = YES
SOURCE_DIFF = EMPTY
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not** reset, merged, rebased, stashed, or used as SoT (`77e9e28` / `pc2/eas-preview-config-v1` untouched).

Build 6 worktree was **not** used as SoT. It still has uncommitted RTL patches on `c48b4b2`:

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-localization-build6-v1`

Those local edits were not copied onto this SHA.

Stale / superseded sources were **not** used:

- `pc2/a2-open-watch-published-post-v1`
- `pc2/eas-preview-config-v1` (`77e9e28`)
- Build 5 SHA `017be09f4dff2e7c39f8f4363a79cef46cd52d48`
- Build 6 SHA `c48b4b2898b116a39e90b85221ae1856f446d0a0`
- Build 6 EAS `7d0dd256-fdb0-42c3-8a4d-0833fcaae656`

No source files were committed. `npm ci` was local-only in the new worktree so Expo plugins resolve. `node_modules` is untracked.

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and `build.production.autoIncrement = true`. Local `app.config.ts` `ios.buildNumber = "7"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 7
EAS_REMOTE_BUILD_NUMBER_BEFORE = 6
EXPECTED_BUILD_NUMBER = 7
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 9
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 9
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 6 to 7.` It did **not** reuse 3/4/5/6 and did **not** jump past 7.

Android remote `versionCode` stayed **9** before and after. Android release was not rebuilt. This track did **not** bump it.

---

## Phase 3 — Central RTL Back hitbox fix (in SHA, not patched)

The authorized commit already contains the shared RTL Back hitbox fix. No local PC2 patch was applied.

```text
RTL_BACK_FIX_IN_SHA = YES
HEADER_SLOTS_LOCKED_LTR = YES
BACK_IN_HEADERRIGHT_FOR_RTL = YES
LOCAL_PC2_PATCH_APPLIED = NO
```

Proof on `74188be`:

| Proof | Path |
| --- | --- |
| Header layout lock | `src/lib/nav/globalBack.ts` `GLOBAL_HEADER_LAYOUT_DIRECTION = "ltr"` |
| Native slots stay physical | `GLOBAL_STACK_HEADER_OPTIONS.direction = "ltr"`; `headerBackVisible: false` |
| RTL Back slot | `globalHeaderBackSlot(true) === "right"` |
| Header wiring | `components/GlobalBackButton.tsx` `useGlobalHeaderSlots()` puts Back in `headerRight` when RTL |
| Root stack | `app/_layout.tsx` uses `useGlobalHeaderSlots()` + `GLOBAL_STACK_HEADER_OPTIONS` |
| Tabs | `app/(tabs)/_layout.tsx` uses the same slot helper |

Commit subject: `fix(mobile): keep RTL Back hitbox aligned with the visible chevron.`

---

## Phase 4 — Required quality commands

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build7-rtl-back-v1`

```text
COMMAND = npm ci
RESULT = PASS (exit 0; 678 packages)
```

```text
COMMAND = npm test
RESULT = FAIL (exit 1)
VITEST = 1 failed | 477 passed (478)
FILES = 1 failed | 58 passed (59)
```

Failure recorded as-is. **Not patched** (task forbids silent product fixes / invented patches):

1. `src/lib/wallet/format.test.ts` — `formatWalletAmountExact(1234)` expected `/1/`; host Windows locale produced `١٬٢٣٤`. Environment/locale assertion, not a new product change.

`src/lib/ios/appStoreConfig.test.ts` now expects `ios.buildNumber === "7"` on this SHA and passed.

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
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build7-rtl-back-v1
EAS_BUILD_ID = 67147f93-9c70-4631-8257-ff80628a49f6
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 7
gitCommitHash = 74188bea5a23269c3d19448894c6ad5381e3b3a9
isForIosSimulator = false
createdAt = 2026-08-16T18:13:32.320Z
completedAt = 2026-08-16T18:18:35.315Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/voZq4nuuYu58XWukZArBGxxgIZo2fmGEO71WI-SGQkY.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/67147f93-9c70-4631-8257-ff80628a49f6
```

Built source matches the authorized SHA. No other source change. Builds 3/4/5/6 were not re-uploaded or reused.

Superseded Build 6 was **not** reused:

```text
PREVIOUS_BUILD6_EAS_ID = 7d0dd256-fdb0-42c3-8a4d-0833fcaae656
PREVIOUS_BUILD6_SOURCE = c48b4b2898b116a39e90b85221ae1856f446d0a0
```

---

## Phase 6 — Internal TestFlight upload (Build 7 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530` (same ASC app as Builds 3/4/5/6). Submit ran, then `eas.json` was restored. Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id 67147f93-9c70-4631-8257-ff80628a49f6 --profile production --non-interactive --wait
EAS_SUBMIT_ID = eda08593-c2ac-4ece-aedf-24a5eef31088
SUBMIT_STATUS = FINISHED
ASC_APP_ID = 6801665530
TESTFLIGHT_UPLOAD = YES
EXTERNAL_BETA = NO
APP_STORE_REVIEW_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
REUPLOAD_BUILD_5 = NO
REUPLOAD_BUILD_6 = NO
```

`eas submit:status` after Apple processing:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (7) — internal: in beta testing, external: ready for beta submission
EAS Build ID 67147f93-9c70-4631-8257-ff80628a49f6
EAS Submission eda08593-c2ac-4ece-aedf-24a5eef31088
```

Builds 3, 4, 5, and 6 remain listed. They were not re-uploaded. App Store live / in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `74188be` only.
- Build number 7, not 3, not 4, not 5, not 6.
- RTL Back fix came from the authorized SHA. No local PC2 patch.
- No App Store Review submit.
- No Production submit.
- No force push / reset / merge of `77e9e28`.
- `docs/ai/CURSOR_REPORT.md` not overwritten.
- Store / Learning files in this web repo not touched.
- No tokens / `.p8` / ASC key material printed.
- No new product fixes.
- No playback fixes invented.
- No iOS-only localization fork.
- Android remote versionCode left at 9.

---

## What happens next

1. Physical iPhone QA on **1.0.0 (7)** only. Do not copy Build 4/5/6 device verdicts forward as Build 7 PASS.
2. If TestFlight still shows **(6)** or earlier: do not install. Reply `TESTFLIGHT_STILL_SHOWS_BUILD_6`.
3. Do not Submit for Review from this report.
