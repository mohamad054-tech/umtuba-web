# PC2_IOS_BUILD15_WATCH_LOAD_AUDIO_FINAL_GATE_V1 — PHASE 1 / P0 PROVENANCE

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD15_WATCH_LOAD_AUDIO_FINAL_GATE_V1
PHASE = P0 COMPLETE (TestFlight 15 internal; no device QA)
DATE = 2026-08-17
MODE = EXECUTION
DEVICE = PC2
AUTHORIZED_SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
BUILD14_SHA_NOT_REUSED = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
BUILD13_SHA_NOT_REUSED = 700dddae332067d2182b143d4328492a22219a66
BUILD12_SHA_NOT_REUSED = 7638487d1412f070e19285fc434362b47a359ea5
BUILD11_HISTORICAL_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
BUILD10_BURNED_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
WAVE2_SHA = 31db97d (not present on remotes; not merged)
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 15
ANDROID_VERSION_CODE_REMOTE_BEFORE = 16
ANDROID_VERSION_CODE_REMOTE_AFTER = 16
ANDROID_VERSION_CODE_IN_SHA = 16
ANDROID_EAS_JOB_STARTED = NO
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
REUPLOAD_BUILD_12 = NO
REUPLOAD_BUILD_13 = NO
REUPLOAD_BUILD_14 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
LEARNING_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
BUILD10_WORKTREE_USED = NO
BUILD11_WORKTREE_USED = NO
BUILD12_WORKTREE_USED_AS_SOT = NO
BUILD13_WORKTREE_USED_AS_SOT = NO
BUILD14_WORKTREE_USED_AS_SOT = NO
UNCOMMITTED_PC2_PATCH_USED = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
DEVICE_PASS_INVENTED = NO
DEVICE_QA_RUN = NO
PLAINTEXT_PASSWORD = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
BUILD_NUMBER = 15
EAS_BUILD_ID = 97fe339a-f338-4fb7-b0dc-62b5212b3e64
BUILD_SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
EXPO_MEDIA_LIBRARY = 57.0.3
BUILD_RESULT = FINISHED
BUILD15_TESTFLIGHT_AVAILABLE = YES_INTERNAL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
TESTS = PASS (targeted 77/77); full suite not rerun
TYPECHECK = PASS
LINT = PASS
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 14_TO_15
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 16
ANDROID_VERSIONCODE_REMOTE_BEFORE = 16
ANDROID_VERSIONCODE_REMOTE_AFTER = 16
TESTFLIGHT_UPLOAD = YES
EAS_SUBMIT_ID = 1bb47fd0-6507-44f5-ac52-3103f18706b7
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

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build15-watch-load-audio-final-gate-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
LOCAL_SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
COMMIT_SUBJECT = fix(mobile): detach Watch players on unmount without method calls and stamp iOS 15 / Android 16.
WORKTREE = detached HEAD at abf8af9
CLEAN_WORKTREE = YES
BUILD14_IS_ANCESTOR = YES (Build 14 source/binary not used as SoT)
BUILD13_IS_ANCESTOR = YES (Build 13 source/binary not used as SoT)
BUILD12_IS_ANCESTOR = YES (Build 12 source not used as SoT)
WAVE2_31db97d_PRESENT = NO
WAVE2_MERGED = NO
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not**
reset, merged, rebased, stashed, or used as SoT (`77e9e28` /
`pc2/eas-preview-config-v1` untouched).

Build 10 / 11 / 12 / 13 / 14 worktrees were **not** used as SoT:

- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build10-final-share-create-qa-v1` @ `4d329e1`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build11-launch-surgical-qa-v1` @ `4b9fa56`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build12-session-qa-v1` @ `7638487`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build13-watch-audio-qa-v1` @ `700ddda`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build14-cold-launch-watch-audio-qa-v1` @ `0ddd423`

Stale / superseded sources were **not** used:

- `pc2/a2-open-watch-published-post-v1`
- `pc2/eas-preview-config-v1` (`77e9e28`)
- Build 5–14 SHAs listed above
- Localization Wave 2 `31db97d` (object missing on remotes)

No source files were committed. `npm ci` was local-only in the new worktree.

---

## SOURCE_DIFF vs Build 14 `0ddd423f91fe238f5d211ed19a727f3180a9b48d`

One commit on `origin/central/mobile-reconcile-ios-android-v1`:

| SHA | Subject / intent |
| --- | --- |
| `abf8af9` | `fix(mobile): detach Watch players on unmount without method calls and stamp iOS 15 / Android 16.` |

12 files, +430 / −33:

- `app.config.ts`: `ios.buildNumber` 14 → 15; `android.versionCode` 15 → 16 (in SHA only)
- `app/(tabs)/watch.tsx`: whole-pixel list height + `sanitizeWatchListIndex` on claim
- `components/WatchVideoCard.tsx`: unmount/swap detaches JS binding only; no play/pause/mute on teardown
- `src/lib/watch/playerLifecycle.ts` + test: `detachWatchPlayerBinding`; `shouldCallPlayerMethodsOnUnmount() === false`
- `src/lib/watch/activePlayerOwnership.ts` + test: comments/contract still require `playerAlive`; JS never calls methods after native release
- `src/lib/watch/playerSession.ts` + test: SharedObject no-op after release (both platforms)
- `src/lib/watch/playbackPolicy.ts` + test: `toWatchListPixels` / `sanitizeWatchListIndex`
- `src/lib/ios/appStoreConfig.test.ts`: expected buildNumber `"15"`, Android versionCode `16`

Read-only note (not a device PASS): Build 14 guarded late ops after
SharedObject release. This SHA additionally **detaches** the JS binding
on unmount/swap (`markDead` + drop refs) and **never** calls player
methods during teardown. Native `useReleasingSharedObject` still owns
`release()`. `shouldLoadPlayer` remains current + adjacent only.
Audio ownership contract is unchanged:
`ONLY_ACTIVE_WATCH_POST_CAN_PRODUCE_AUDIO`. This is **source presence
only**. It is not a device PASS. No local patch was applied.

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and
`build.production.autoIncrement = true`. Local `app.config.ts`
`ios.buildNumber = "15"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 15
EAS_REMOTE_BUILD_NUMBER_BEFORE = 14
EXPECTED_BUILD_NUMBER = 15
EAS_REMOTE_BUILD_NUMBER_AFTER = 15
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 16
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 16
EAS_REMOTE_ANDROID_VERSIONCODE_AFTER = 16
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 14 to 15.` It did **not**
reuse 3/4/5/6/7/8/9/10/11/12/13/14 and did **not** jump past 15.

No Android EAS job and no `eas build:version:set` ran this turn.
Remote Android `versionCode` was already **16** before this iOS job
(Build 14 left remote Android at 14; this turn observed 16 as
pre-existing remote state) and stayed **16**. PC2 did not bump and
did not revert.

---

## Phase 3 — expo-media-library pin (Build 10 crash class)

Build 11/12/13/14 pin is still present on this SHA.

```text
EXPO_MEDIA_LIBRARY_PACKAGE_JSON = 57.0.3
EXPO_MEDIA_LIBRARY_LOCKFILE = 57.0.3
EXPO_MEDIA_LIBRARY_INSTALLED = 57.0.3
EXPO_MEDIA_LIBRARY_57_0_4_PRESENT = NO
EXPO_MODULES_CORE_LOCKFILE = 57.0.6
EXPO_MODULES_CORE_INSTALLED = 57.0.6
MEDIA_LIBRARY_PIN_BLOCK = NO
```

---

## Phase 4 — Required quality commands

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build15-watch-load-audio-final-gate-v1`

```text
COMMAND = npm ci
RESULT = PASS (exit 0)
```

Targeted (Watch ownership + session + lifecycle + policy + appStoreConfig):

```text
COMMAND = npx vitest run src/lib/watch/activePlayerOwnership.test.ts src/lib/watch/playerSession.test.ts src/lib/watch/playerLifecycle.test.ts src/lib/watch/playbackPolicy.test.ts src/lib/ios/appStoreConfig.test.ts src/lib/auth/sessionHydration.test.ts src/lib/supabase/authStorage.test.ts
RESULT = PASS (exit 0)
VITEST = 77 passed (77)
FILES = 7 passed (7)
```

Full `npm test` was **not** rerun (optional; known Windows locale
wallet failure was not patched).

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

Pre-check: no existing iOS EAS job for SHA `abf8af9` or build 15
(in-progress / in-queue empty; latest finished iOS was Build 14
`3e6244da` @ `0ddd423`). Started exactly one authorized
production/store build (same path as Builds 7–14). **Not** App Store
Production submit.

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build15-watch-load-audio-final-gate-v1
EAS_BUILD_ID = 97fe339a-f338-4fb7-b0dc-62b5212b3e64
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 15
gitCommitHash = abf8af9e8db7453d8bcb0e4d34346f182249243b
gitCommitMessage = fix(mobile): detach Watch players on unmount without method calls and stamp iOS 15 / Android 16.
isForIosSimulator = false
createdAt = 2026-08-17T20:25:57.462Z
completedAt = 2026-08-17T20:31:11.347Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/rhCCU072-QsuEFaG1lEvlaZbxMgSeZde4vfCSPiA6Yk.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/97fe339a-f338-4fb7-b0dc-62b5212b3e64
FINGERPRINT = 840d95ec90e5fe28e869a71f9325844f875dfe7d
```

Built source matches the authorized SHA. No other source change.
Builds 3/4/5/6/7/8/9/10/11/12/13/14 were not re-uploaded or reused.

```text
PREVIOUS_BUILD14_EAS_ID = 3e6244da-1d84-4aec-93e4-29805258452d
PREVIOUS_BUILD14_SOURCE = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
PREVIOUS_BUILD13_EAS_ID = db467f4d-5fce-430b-98f7-60c74d8c1ed8
PREVIOUS_BUILD13_SOURCE = 700dddae332067d2182b143d4328492a22219a66
PREVIOUS_BUILD12_EAS_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
PREVIOUS_BUILD12_SOURCE = 7638487d1412f070e19285fc434362b47a359ea5
```

---

## Phase 6 — Internal TestFlight upload (Build 15 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530`
(same ASC app as Builds 3–14). Submit ran, then `eas.json` was restored.
Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id 97fe339a-f338-4fb7-b0dc-62b5212b3e64 --profile production --non-interactive --wait
EAS_SUBMIT_ID = 1bb47fd0-6507-44f5-ac52-3103f18706b7
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
REUPLOAD_BUILD_12 = NO
REUPLOAD_BUILD_13 = NO
REUPLOAD_BUILD_14 = NO
```

`eas submit:status` after Apple processing:

```text
App Store Live: none (JSON listed only testFlightBuilds)
In review: none
Pending release: none
1.0.0 (15) — internal: in beta testing, external: ready for beta submission
EAS Build ID 97fe339a-f338-4fb7-b0dc-62b5212b3e64
EAS Submission 1bb47fd0-6507-44f5-ac52-3103f18706b7
processingState = VALID
internalState = IN_BETA_TESTING
externalState = READY_FOR_BETA_SUBMISSION
```

Builds 3–14 remain listed. They were not re-uploaded. App Store live /
in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof. P1 device QA was
not started. Operator was not asked to install this turn.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `abf8af9` only.
- Build number 15, not 3–14.
- No App Store Review submit.
- No Production submit.
- No local product patch.
- No P1 device QA this turn.
- No Android EAS job / version:set.
- `CURSOR_REPORT.md` not overwritten.
