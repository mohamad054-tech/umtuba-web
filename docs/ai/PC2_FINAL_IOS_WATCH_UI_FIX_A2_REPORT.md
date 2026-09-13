# PC2 FINAL iOS WATCH UI FIX — A2 iOS BUILD (REPLACEMENT FOR BUILD 7)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_FINAL_IOS_WATCH_UI_FIX_A2_V1
DATE = 2026-08-17
WAVE = PC2_FINAL_IOS_WATCH_UI_FIX_WAVE
MODE = EXECUTION
DEVICE = PC2
PRIORITY = MAXIMUM
AUTHORIZED_SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
REMOTE_REF = origin/fix/watch-ui-overlap-progress-duration-v1
BASE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 8
ANDROID_VERSION_CODE_IN_SHA = 9
BUNDLE_ID = com.umtuba.app
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
REUPLOAD_BUILD_5 = NO
REUPLOAD_BUILD_6 = NO
REUPLOAD_BUILD_7 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
LEARNING_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
A1_WORKTREE_REUSED_AS_SOT = NO
BUILD7_WORKTREE_USED = NO
UNCOMMITTED_PC2_PATCH_USED = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_MODIFIED = NO
DEVICE_PASS_INVENTED = NO
DEVICE_QA_CLAIMED = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
IOS_BUILD_NUMBER = 8
EAS_BUILD_ID = 64047c6d-3042-4e80-b6f5-386c288b8fe2
BUILD_RESULT = FINISHED
BUILD_SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
TESTFLIGHT_AVAILABLE = YES_INTERNAL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = TESTS_FAIL_ON_AUTHORIZED_SHA; DEVICE_QA_NOT_RUN; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 7_TO_8
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 9
ANDROID_VERSIONCODE_REMOTE_BEFORE = 10
ANDROID_VERSIONCODE_REMOTE_AFTER = 10
WATCH_UI_FIX_IN_SHA = YES
TESTFLIGHT_UPLOAD = YES
APP_STORE_SUBMITTED = NO
IPHONE_QA = NOT_RUN
```

Do **not** treat this as a product PASS. EAS `FINISHED` and TestFlight `in beta testing` are upload/processing statuses only. Device QA was not run.

---

## Phase 1 — Source lock

Preferred new worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-final-ios-watch-ui-fix-a2-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/fix/watch-ui-overlap-progress-duration-v1
LOCAL_SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
COMMIT_SUBJECT = fix(mobile): keep Watch chrome and Create duration on physical layout units
WORKTREE = detached HEAD at 658936e
CLEAN_WORKTREE = YES
SOURCE_DIFF = EMPTY
BASE_IS_ANCESTOR = YES (74188be → 658936e, one commit)
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not** reset, merged, rebased, stashed, or used as SoT (`77e9e28` / `pc2/eas-preview-config-v1` untouched).

A1 worktree was **not** reused as SoT:

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-watch-ui-fix-v1`

Build 7 worktree was **not** used as SoT:

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build7-rtl-back-v1`

Stale / superseded sources were **not** used:

- `pc2/a2-open-watch-published-post-v1`
- `pc2/eas-preview-config-v1` (`77e9e28`)
- Build 5 SHA `017be09f4dff2e7c39f8f4363a79cef46cd52d48`
- Build 6 SHA `c48b4b2898b116a39e90b85221ae1856f446d0a0`
- Build 7 SHA `74188bea5a23269c3d19448894c6ad5381e3b3a9` (BASE only; not the binary source)
- Build 7 EAS `67147f93-9c70-4631-8257-ff80628a49f6`

No source files were committed. `npm ci` was local-only in the new worktree so Expo plugins resolve. `node_modules` is untracked.

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and `build.production.autoIncrement = true`. Local `app.config.ts` `ios.buildNumber = "7"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 7
EAS_REMOTE_BUILD_NUMBER_BEFORE = 7
EXPECTED_BUILD_NUMBER = 8
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 9
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 10
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 7 to 8.` It did **not** reuse 3/4/5/6/7.

Android remote `versionCode` was already **10** before this iOS-only build (pre-existing drift after Build 7, which recorded remote 9). This track did **not** bump it. Remote stayed **10** after. Local SHA `app.config.ts` still has `versionCode: 9`. Android release was not rebuilt.

---

## Phase 3 — A1 Watch UI fix (in SHA, not patched)

The authorized A1 commit already contains the three Watch/Create fixes. No local PC2 patch was applied.

```text
WATCH_UI_FIX_IN_SHA = YES
RAIL_LIFT_84 = YES
SCRUB_LTR_LOCK = YES
PICKER_DURATION_MS = YES
LOCAL_PC2_PATCH_APPLIED = NO
```

Proof on `658936e`:

| Proof | Path |
| --- | --- |
| Rail lift | `src/lib/watch/railLayout.ts` `WATCH_RAIL_BOTTOM_EXTRA = 84` |
| Duration unit | `src/lib/video/pickVideo.ts` `pickerDurationToMs` |
| Create label | `app/(tabs)/create.tsx` uses duration label helper |
| Scrub / rail apply | `components/WatchVideoCard.tsx` |

Commit subject: `fix(mobile): keep Watch chrome and Create duration on physical layout units`

---

## Phase 4 — Required quality commands

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-final-ios-watch-ui-fix-a2-v1`

```text
COMMAND = npm ci
RESULT = PASS (exit 0; 678 packages)
```

```text
COMMAND = npm test
RESULT = FAIL (exit 1)
VITEST = 1 failed | 483 passed (484)
FILES = 1 failed | 58 passed (59)
```

Failure recorded as-is. **Not patched** (task forbids silent product fixes / invented patches):

1. `src/lib/wallet/format.test.ts` — `formatWalletAmountExact(1234)` expected `/1/`; host Windows locale produced `١٬٢٣٤`. Environment/locale assertion, not a new product change.

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
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-final-ios-watch-ui-fix-a2-v1
EAS_BUILD_ID = 64047c6d-3042-4e80-b6f5-386c288b8fe2
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 8
gitCommitHash = 658936e18718606a3b3d30753e717d7fe9e86a18
isForIosSimulator = false
createdAt = 2026-08-17T08:19:09.411Z
completedAt = 2026-08-17T08:24:07.495Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/7LBZxNcUNEYqaY7GJ0brfNbuWoCenZEIc5cbX5RGhIs.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/64047c6d-3042-4e80-b6f5-386c288b8fe2
```

Built source matches the authorized A1 SHA. No other source change. Builds 3/4/5/6/7 were not re-uploaded or reused.

Superseded Build 7 was **not** reused:

```text
PREVIOUS_BUILD7_EAS_ID = 67147f93-9c70-4631-8257-ff80628a49f6
PREVIOUS_BUILD7_SOURCE = 74188bea5a23269c3d19448894c6ad5381e3b3a9
```

---

## Phase 6 — Internal TestFlight upload (Build 8 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530` (same ASC app as Builds 3/4/5/6/7). Submit ran, then `eas.json` was restored. Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id 64047c6d-3042-4e80-b6f5-386c288b8fe2 --profile production --non-interactive --wait
EAS_SUBMIT_ID = 4050961b-5934-4e19-8e66-51c7958630e2
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
```

`eas submit:status` after Apple processing:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (8) — internal: in beta testing, external: ready for beta submission
EAS Build ID 64047c6d-3042-4e80-b6f5-386c288b8fe2
EAS Submission 4050961b-5934-4e19-8e66-51c7958630e2
```

Builds 3, 4, 5, 6, and 7 remain listed. They were not re-uploaded. App Store live / in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `658936e` only.
- Build number 8, not 3, not 4, not 5, not 6, not 7.
- Watch UI fix came from the authorized A1 SHA. No local PC2 patch.
- No App Store Review submit.
- No Production submit.
- No force push / reset / merge of `77e9e28`.
- `docs/ai/CURSOR_REPORT.md` not overwritten.
- Store / Learning files in this web repo not touched.
- No tokens / `.p8` / ASC key material printed.
- No new product fixes.
- Android remote versionCode left at 10 (not bumped). Local SHA still 9.

---

## What happens next

1. Physical iPhone QA on **1.0.0 (8)** only. Do not copy Build 7 device verdicts forward as Build 8 PASS.
2. If TestFlight still shows **(7)** or earlier: do not install. Reply `TESTFLIGHT_STILL_SHOWS_BUILD_7`.
3. Do not Submit for Review from this report.
