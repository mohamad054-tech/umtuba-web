# PC2_IOS_BUILD10_FINAL_SHARE_CREATE_QA_V1 — PHASE 1 PROVENANCE

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD10_FINAL_SHARE_CREATE_QA_V1
PHASE = 1 PROVENANCE
DATE = 2026-08-17
MODE = EXECUTION
DEVICE = PC2
AUTHORIZED_SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
PREVIOUS_AUTHORIZED_BUILD9_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 10
ANDROID_VERSION_CODE_REMOTE = 11
ANDROID_VERSION_CODE_IN_SHA = 12
BUNDLE_ID = com.umtuba.app
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
REUPLOAD_BUILD_5 = NO
REUPLOAD_BUILD_6 = NO
REUPLOAD_BUILD_7 = NO
REUPLOAD_BUILD_8 = NO
REUPLOAD_BUILD_9 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
LEARNING_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
BUILD8_WORKTREE_USED = NO
BUILD9_WORKTREE_USED = NO
UNCOMMITTED_PC2_PATCH_USED = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_MODIFIED = NO
DEVICE_PASS_INVENTED = NO
DEVICE_QA_RUN = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
SOURCE_DIFF = 4 commits / 23 files vs Build 9 SHA 7b33bae (share two-choice + Create full-library pick + version stamp). See Phase 1.
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 10
TESTS = FAIL (2 failed / 566 passed / 67 files: 2 failed, 65 passed)
TYPECHECK = PASS
LINT = PASS
EAS_BUILD_ID = 9472a064-9e80-41b3-a61a-3473bc639c86
BUILD_RESULT = FINISHED
BUILD_SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
TESTFLIGHT_BUILD = 10
TESTFLIGHT_AVAILABLE = YES_INTERNAL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = TESTS_FAIL_ON_AUTHORIZED_SHA; DEVICE_QA_NOT_RUN; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 9_TO_10
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 12
ANDROID_VERSIONCODE_REMOTE_BEFORE = 11
ANDROID_VERSIONCODE_REMOTE_AFTER = 11
TESTFLIGHT_UPLOAD = YES
EAS_SUBMIT_ID = ecfed685-6b09-4826-aea2-351ba489f32c
ASC_APP_ID = 6801665530
APP_STORE_SUBMITTED = NO
IPHONE_QA = NOT_RUN
LONG_VIDEO_GATE = NO_MAX_DURATION_IN_SOURCE
```

Do **not** treat this as a product PASS. EAS `FINISHED` is a build status only. TestFlight processing is **not** iPhone install proof. Device QA was not run.

---

## Phase 1 — Source lock

Preferred new worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build10-final-share-create-qa-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
LOCAL_SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
COMMIT_SUBJECT = chore(mobile): stamp iOS buildNumber 10 and Android versionCode 12.
WORKTREE = detached HEAD at 4d329e1
CLEAN_WORKTREE = YES
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not** reset, merged, rebased, stashed, or used as SoT (`77e9e28` / `pc2/eas-preview-config-v1` untouched).

Build 8 / Build 9 worktrees were **not** used as SoT:

- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-final-ios-watch-ui-fix-a2-v1` @ `658936e`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-watch-ui-fix-v1` @ `658936e`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build9-surgical-qa-v1` @ `7b33bae`

Stale / superseded sources were **not** used:

- `pc2/a2-open-watch-published-post-v1`
- `pc2/eas-preview-config-v1` (`77e9e28`)
- Build 5 SHA `017be09f4dff2e7c39f8f4363a79cef46cd52d48`
- Build 6 SHA `c48b4b2898b116a39e90b85221ae1856f446d0a0`
- Build 7 SHA `74188bea5a23269c3d19448894c6ad5381e3b3a9`
- Build 8 SHA `658936e18718606a3b3d30753e717d7fe9e86a18`
- Build 9 SHA `7b33bae707a0eecb4107f4373698630eaea7a1c5` (previous authorized only)
- Build 8 EAS `64047c6d-3042-4e80-b6f5-386c288b8fe2`
- Build 9 EAS `72a73a7e-8c7c-45de-8f4e-7d159f7054e2`

No source files were committed. `npm ci` was local-only in the new worktree so Expo plugins resolve. `node_modules` is gitignored.

Temporary local-only `eas.json` `submit.production.ios.ascAppId = 6801665530` was added for TestFlight submit (same ASC app as Builds 3–9), then restored. Not committed.

---

## SOURCE_DIFF vs Build 9 `7b33bae707a0eecb4107f4373698630eaea7a1c5`

Not empty. Four commits on `origin/central/mobile-reconcile-ios-android-v1`:

| SHA | Subject / intent |
| --- | --- |
| `9014957` | `feat(mobile): add shared Watch share link and file modes.` Build 9 could only hand a URL to the system sheet. One shared chooser now offers a permanent watch link or a downloaded temp video file, frozen to the post that was open when Share was tapped. |
| `5fe2869` | `feat(mobile): enable shared Watch Share entry on Android.` Same two-choice Share menu on both platforms. Do not gate the rail on expo-sharing. |
| `5c5ef0b` | `feat(mobile): open the full system video library for Create picks.` Stop requesting a media-library grant before PHPicker/Photo Picker so iOS LIMITED access cannot hide the rest of the library. |
| `4d329e1` | `chore(mobile): stamp iOS buildNumber 10 and Android versionCode 12.` Version stamp only. |

23 files, +1927 / −109:

- Share: `src/lib/social/sharePost.ts`, `sharePost.test.ts`, `shareEntry.ts`, `shareEntry.test.ts`; Watch UI `app/(tabs)/watch.tsx`, `components/WatchVideoCard.tsx`
- Create / library / identity: `src/lib/video/pickVideo.ts`, `pickVideo.test.ts`, `app/(tabs)/create.tsx`, `src/lib/permissions/foundation.ts`, `foundation.test.ts`
- i18n: `ar/en/de/es/fr/pt` + `types.ts` + `i18n.test.ts` (`watch.shareVideoLink`, `watch.shareVideoFile`, plus related share/media strings)
- Config: `app.config.ts` (`ios.buildNumber` 9→10, `android.versionCode` 11→12, `expo-media-library` plugin), `package.json` / `package-lock.json` (`expo-sharing`, `expo-media-library`)
- Linking: `src/lib/linking/deepLinks.test.ts`

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and `build.production.autoIncrement = true`. Local `app.config.ts` `ios.buildNumber = "10"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 10
EAS_REMOTE_BUILD_NUMBER_BEFORE = 9
EXPECTED_BUILD_NUMBER = 10
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 12
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 11
EAS_REMOTE_ANDROID_VERSIONCODE_AFTER = 11
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 9 to 10.` It did **not** reuse 3/4/5/6/7/8/9 and did **not** jump past 10.

Android remote `versionCode` stayed **11** before and after. Android release was not rebuilt. This track did **not** bump it. Local SHA stamp `12` is app.config only.

---

## Phase 3 — Authorized SHA only (no local patch)

Share two-choice + Create full-library pick already exist on the authorized SHA. No local PC2 product patch was applied.

```text
LOCAL_PC2_PATCH_APPLIED = NO
BUILD8_SHA_USED = NO
BUILD9_SHA_USED_AS_SOT = NO
```

---

## Phase 4 — Required quality commands

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build10-final-share-create-qa-v1`

```text
COMMAND = npm ci
RESULT = PASS (exit 0)
```

Targeted (share + create/library/asset identity + touched watch/create + known stale config test):

```text
COMMAND = npx vitest run src/lib/social/shareEntry.test.ts src/lib/social/sharePost.test.ts src/lib/video/pickVideo.test.ts src/lib/video/createUploadState.test.ts src/lib/video/createJourney.test.ts src/lib/permissions/foundation.test.ts src/lib/i18n/i18n.test.ts src/lib/linking/deepLinks.test.ts src/lib/ios/appStoreConfig.test.ts
RESULT = FAIL (exit 1)
VITEST = 1 failed | 109 passed (110)
FILES = 1 failed | 8 passed (9)
```

Share / create / pick / permissions / i18n / linking targeted files **passed**. The only targeted fail is the stale `appStoreConfig` assertion (see full suite).

```text
COMMAND = npm test
RESULT = FAIL (exit 1)
VITEST = 2 failed | 566 passed (568)
FILES = 2 failed | 65 passed (67)
```

Failures recorded as-is. **Not patched** (task forbids silent product fixes):

1. `src/lib/ios/appStoreConfig.test.ts` — expects `ios.buildNumber === "7"`; this SHA has `"10"`. Same stale assertion class as Build 9 (then expected `"7"`, SHA had `"9"`). Still not updated on the authorized SHA.
2. `src/lib/wallet/format.test.ts` — `formatWalletAmountExact(1234)` expected `/1/`; host Windows locale produced `١٬٢٣٤`. Same environment/locale assertion as Build 9. Not a new product change.

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

Exactly one authorized production/store build this turn (same path as Builds 7–9). **Not** App Store Production submit.

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build10-final-share-create-qa-v1
EAS_BUILD_ID = 9472a064-9e80-41b3-a61a-3473bc639c86
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 10
gitCommitHash = 4d329e1bed2e1bc1a90902a1781f1821c0009392
isForIosSimulator = false
createdAt = 2026-08-17T13:28:26.989Z
completedAt = 2026-08-17T13:33:21.340Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/Pv3z3honYIBEQXAKnVK2GIZX-AsEKfskZXxVvntl1Ec.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/9472a064-9e80-41b3-a61a-3473bc639c86
FINGERPRINT = bf03350ff122ac2de076d973ae35b3fe9dc5dddf
```

Built source matches the authorized SHA. No other source change. Builds 3/4/5/6/7/8/9 were not re-uploaded or reused.

```text
PREVIOUS_BUILD9_EAS_ID = 72a73a7e-8c7c-45de-8f4e-7d159f7054e2
PREVIOUS_BUILD9_SOURCE = 7b33bae707a0eecb4107f4373698630eaea7a1c5
PREVIOUS_BUILD8_EAS_ID = 64047c6d-3042-4e80-b6f5-386c288b8fe2
PREVIOUS_BUILD8_SOURCE = 658936e18718606a3b3d30753e717d7fe9e86a18
```

---

## Phase 6 — Internal TestFlight upload (Build 10 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530` (same ASC app as Builds 3–9). Submit ran, then `eas.json` was restored. Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id 9472a064-9e80-41b3-a61a-3473bc639c86 --profile production --non-interactive --wait
EAS_SUBMIT_ID = ecfed685-6b09-4826-aea2-351ba489f32c
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
```

`eas submit:status` after Apple processing:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (10) — internal: in beta testing, external: ready for beta submission
EAS Build ID 9472a064-9e80-41b3-a61a-3473bc639c86
EAS Submission ecfed685-6b09-4826-aea2-351ba489f32c
```

Builds 3–9 remain listed. They were not re-uploaded. App Store live / in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof. Phase 2 was not started.

---

## Phase 2 contracts (read-only inspect; no code change)

### Share two-choice

`WATCH_SHARE_CHOICES` = exactly two modes. Watch `onShare` opens `Alert.alert(t("watch.share"), …)` then those two + cancel. Identity is frozen with `createShareAttempt(postId)` at tap time; swipe must not retarget (`shareIdentitySwitched` / `resolveBoundSharePostId`).

| key | EN | AR |
| --- | --- | --- |
| `watch.share` (sheet title) | Share | مشاركة |
| `watch.shareVideoLink` | Share video link | مشاركة رابط الفيديو |
| `watch.shareVideoFile` | Share video | مشاركة الفيديو كفيديو |
| `actions.cancel` | Cancel | إلغاء |
| `watch.shareFailed` | Share failed | فشلت المشاركة |
| `watch.mediaUnavailable` | Media unavailable | الوسائط غير متاحة |
| `watch.preparingVideo` | Preparing video | جاري تجهيز الفيديو |

Link mode shares canonical `https://umtuba.com/watch?post={id}` only. File mode downloads a temp file from storage (optimized path preferred); Create/local leftovers are never a share source. Cancel of the native sheet is a non-share.

### LONG_VIDEO_GATE

```text
LONG_VIDEO_GATE = NO_MAX_DURATION_IN_SOURCE
```

`validateVideoDuration` rejects only missing-invalid (`<= 0` / non-finite) metadata. Comment in `src/contracts/video.ts`: “No hard max — matches web.” Size gate exists (`MAX_VIDEO_BYTES` = 50 MiB). Do **not** invent a duration ceiling for Phase 2.

### Create reset / picker cancel / replace identity

- **Reset after publish:** `resetCreateDraftAfterPublish()` clears asset, caption, ugcAck, activeAttemptId. `shouldResetCreateOnBlur` is true only when `phase === "success"`. Fresh Create after success must be empty.
- **Picker cancel:** `onPick` returns without mutating asset/caption/journey when `result.cancelled`. `applyPickerCancel` is identity (draft unchanged). Current valid asset must stay.
- **Replace:** accepted pick assigns a new `newUploadFileId()`, increments attempt nonce, clears `activeAttemptRef`, `setAsset(result.asset)`, `applyAcceptedPick`. Asset B must fully replace A. Rejected pick clears asset and records the rejected label; it must not inherit A’s URI/retry.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `4d329e1` only.
- Build number 10, not 3–9.
- No App Store Review submit.
- No Production submit.
- No force push / reset / merge of `77e9e28`.
- `docs/ai/CURSOR_REPORT.md` not overwritten.
- Store / Learning files in this web repo not touched.
- No tokens / `.p8` / ASC key material printed.
- No new product fixes.
- No failing tests patched.
- Android remote versionCode left at 11.

---

## What happens next

1. Physical iPhone 13 QA on **1.0.0 (10)** only, after a separate Phase 2 GO. Do not copy Build 8/9 device verdicts forward as Build 10 PASS.
2. If TestFlight still shows **(9)** or earlier on the phone: do not install. Reply `TESTFLIGHT_STILL_SHOWS_BUILD_9`.
3. Do not Submit for Review from this report.
4. This Phase 1 turn did **not** start device QA and did **not** ask the operator to install.
