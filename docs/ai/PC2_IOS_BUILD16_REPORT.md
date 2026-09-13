# PC2_IOS_BUILD16_WATCH_LOAD_RETRY_FINAL_GATE_V1 — PHASE 1 / P0 PROVENANCE

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD16_WATCH_LOAD_RETRY_FINAL_GATE_V1
PHASE = P0 COMPLETE (TestFlight 16 internal; no device QA)
DATE = 2026-08-18
MODE = EXECUTION
DEVICE = PC2
AUTHORIZED_SOURCE_SHA = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
BUILD15_SHA_NOT_REUSED = abf8af9e8db7453d8bcb0e4d34346f182249243b
BUILD14_SHA_NOT_REUSED = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
BUILD13_SHA_NOT_REUSED = 700dddae332067d2182b143d4328492a22219a66
BUILD12_SHA_NOT_REUSED = 7638487d1412f070e19285fc434362b47a359ea5
BUILD11_HISTORICAL_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
BUILD10_BURNED_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
WAVE2_SHA = 31db97d (not present on remotes; not merged)
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 16
ANDROID_VERSION_CODE_REMOTE_BEFORE = 16
ANDROID_VERSION_CODE_REMOTE_AFTER = 16
ANDROID_VERSION_CODE_IN_SHA = 17
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
REUPLOAD_BUILD_15 = NO
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
BUILD15_WORKTREE_USED_AS_SOT = NO
UNCOMMITTED_PC2_PATCH_USED = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
DEVICE_PASS_INVENTED = NO
DEVICE_QA_RUN = NO
PLAINTEXT_PASSWORD = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
BUILD_NUMBER = 16
EAS_BUILD_ID = ccd20bd3-d2dc-4943-a7aa-2da2c2fd713e
BUILD_SOURCE_SHA = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
EXPO_MEDIA_LIBRARY = 57.0.3
BUILD_RESULT = FINISHED
BUILD16_TESTFLIGHT_AVAILABLE = YES_INTERNAL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
TESTS = PASS (targeted 81/81); full suite not rerun
TYPECHECK = PASS
LINT = PASS
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 15_TO_16
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 17
ANDROID_VERSIONCODE_REMOTE_BEFORE = 16
ANDROID_VERSIONCODE_REMOTE_AFTER = 16
TESTFLIGHT_UPLOAD = YES
EAS_SUBMIT_ID = d0c709e5-c844-41e1-8ca9-3406becf2c09
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

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build16-watch-load-retry-final-gate-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
LOCAL_SOURCE_SHA = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
COMMIT_SUBJECT = fix(mobile): remount Watch Retry above play-pause and stamp iOS 16 / Android 17.
WORKTREE = detached HEAD at 7cf3960
CLEAN_WORKTREE = YES
BUILD15_IS_ANCESTOR = YES (Build 15 source/binary not used as SoT)
BUILD14_IS_ANCESTOR = YES (Build 14 source/binary not used as SoT)
BUILD13_IS_ANCESTOR = YES (Build 13 source/binary not used as SoT)
BUILD12_IS_ANCESTOR = YES (Build 12 source not used as SoT)
WAVE2_31db97d_PRESENT = NO
WAVE2_MERGED = NO
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not**
reset, merged, rebased, stashed, or used as SoT (`77e9e28` /
`pc2/eas-preview-config-v1` untouched).

Build 10 / 11 / 12 / 13 / 14 / 15 worktrees were **not** used as SoT:

- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build10-final-share-create-qa-v1` @ `4d329e1`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build11-launch-surgical-qa-v1` @ `4b9fa56`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build12-session-qa-v1` @ `7638487`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build13-watch-audio-qa-v1` @ `700ddda`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build14-cold-launch-watch-audio-qa-v1` @ `0ddd423`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build15-watch-load-audio-final-gate-v1` @ `abf8af9`

Stale / superseded sources were **not** used:

- `pc2/a2-open-watch-published-post-v1`
- `pc2/eas-preview-config-v1` (`77e9e28`)
- Build 5–15 SHAs listed above
- Localization Wave 2 `31db97d` (object missing on remotes)

No source files were committed. `npm ci` was local-only in the new worktree.

---

## SOURCE_DIFF vs Build 15 `abf8af9e8db7453d8bcb0e4d34346f182249243b`

One commit on `origin/central/mobile-reconcile-ios-android-v1`:

| SHA | Subject / intent |
| --- | --- |
| `7cf3960` | `fix(mobile): remount Watch Retry above play-pause and stamp iOS 16 / Android 17.` |

5 files, +388 / −94:

- `app.config.ts`: `ios.buildNumber` 15 → 16; `android.versionCode` 16 → 17 (in SHA only)
- `components/WatchVideoCard.tsx`: Retry remounts a new player generation (`playerEpoch` / `nextPlayerInstanceGeneration`); retry overlay is a sibling above the play-pause tap layer (`zIndex`/`elevation` 30; tap layer `pointerEvents` none while error); iOS transport waits until item ready
- `src/lib/watch/playerLifecycle.ts` + test: `nextPlayerInstanceGeneration`, `resolveRetryTargetPostId`, `isRetryHitTargetClear`, `shouldRecreateWatchPlayer`, `shouldApplyWatchTransport` (iOS play/pause/seek blocked until ready)
- `src/lib/ios/appStoreConfig.test.ts`: expected buildNumber `"16"`, Android versionCode `17`

Read-only note (not a device PASS): Build 15 detached JS bindings on
unmount without method calls. This SHA additionally **remounts Retry**
as a new player instance (`key=watch-player-${id}-${playerEpoch}`)
above the play-pause layer, and **does not** issue iOS play/pause/seek
until `itemReady`. Adjacent preload (`shouldLoadPlayer` current +
adjacent) and exclusive audio ownership are unchanged in source:
`ONLY_ACTIVE_WATCH_POST_CAN_PRODUCE_AUDIO`. This is **source presence
only**. It is not a device PASS. No local patch was applied.

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and
`build.production.autoIncrement = true`. Local `app.config.ts`
`ios.buildNumber = "16"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 16
EAS_REMOTE_BUILD_NUMBER_BEFORE = 15
EXPECTED_BUILD_NUMBER = 16
EAS_REMOTE_BUILD_NUMBER_AFTER = 16
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 17
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 16
EAS_REMOTE_ANDROID_VERSIONCODE_AFTER = 16
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 15 to 16.` It did **not**
reuse 3/4/5/6/7/8/9/10/11/12/13/14/15 and did **not** jump past 16.

No Android EAS job and no `eas build:version:set` ran this turn.
Remote Android `versionCode` was already **16** before this iOS job
and stayed **16**. PC2 did not bump and did not revert. SHA local
`android.versionCode = 17` was not applied remotely.

---

## Phase 3 — expo-media-library pin (Build 10 crash class)

Build 11/12/13/14/15 pin is still present on this SHA.

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

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build16-watch-load-retry-final-gate-v1`

```text
COMMAND = npm ci
RESULT = PASS (exit 0)
```

Targeted (Watch ownership + session + lifecycle + policy + appStoreConfig):

```text
COMMAND = npx vitest run src/lib/watch/activePlayerOwnership.test.ts src/lib/watch/playerSession.test.ts src/lib/watch/playerLifecycle.test.ts src/lib/watch/playbackPolicy.test.ts src/lib/ios/appStoreConfig.test.ts src/lib/auth/sessionHydration.test.ts src/lib/supabase/authStorage.test.ts
RESULT = PASS (exit 0)
VITEST = 81 passed (81)
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

Pre-check: no existing iOS EAS job for SHA `7cf3960` or build 16
(in-progress / in-queue / new empty; latest finished iOS was Build 15
`97fe339a` @ `abf8af9`). Started exactly one authorized
production/store build (same path as Builds 7–15). **Not** App Store
Production submit.

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build16-watch-load-retry-final-gate-v1
EAS_BUILD_ID = ccd20bd3-d2dc-4943-a7aa-2da2c2fd713e
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 16
gitCommitHash = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
gitCommitMessage = fix(mobile): remount Watch Retry above play-pause and stamp iOS 16 / Android 17.
isForIosSimulator = false
createdAt = 2026-08-17T21:57:10.211Z
completedAt = 2026-08-17T22:01:52.355Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/1iO5LpLKuI60NsC1QwQhymF7GsUDitE3liV0pHJIf-Q.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/ccd20bd3-d2dc-4943-a7aa-2da2c2fd713e
FINGERPRINT = b4437797a9f8a558583b6f763b595d13f151327f
```

Built source matches the authorized SHA. No other source change.
Builds 3/4/5/6/7/8/9/10/11/12/13/14/15 were not re-uploaded or reused.

```text
PREVIOUS_BUILD15_EAS_ID = 97fe339a-f338-4fb7-b0dc-62b5212b3e64
PREVIOUS_BUILD15_SOURCE = abf8af9e8db7453d8bcb0e4d34346f182249243b
PREVIOUS_BUILD14_EAS_ID = 3e6244da-1d84-4aec-93e4-29805258452d
PREVIOUS_BUILD14_SOURCE = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
PREVIOUS_BUILD13_EAS_ID = db467f4d-5fce-430b-98f7-60c74d8c1ed8
PREVIOUS_BUILD13_SOURCE = 700dddae332067d2182b143d4328492a22219a66
PREVIOUS_BUILD12_EAS_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
PREVIOUS_BUILD12_SOURCE = 7638487d1412f070e19285fc434362b47a359ea5
```

---

## Phase 6 — Internal TestFlight upload (Build 16 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530`
(same ASC app as Builds 3–15). Submit ran, then `eas.json` was restored.
Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id ccd20bd3-d2dc-4943-a7aa-2da2c2fd713e --profile production --non-interactive --wait
EAS_SUBMIT_ID = d0c709e5-c844-41e1-8ca9-3406becf2c09
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
REUPLOAD_BUILD_15 = NO
```

`eas submit:status` after Apple processing:

```text
App Store Live: none (JSON listed only testFlightBuilds)
In review: none
Pending release: none
1.0.0 (16) — internal: in beta testing, external: ready for beta submission
EAS Build ID ccd20bd3-d2dc-4943-a7aa-2da2c2fd713e
EAS Submission d0c709e5-c844-41e1-8ca9-3406becf2c09
processingState = VALID
internalState = IN_BETA_TESTING
externalState = READY_FOR_BETA_SUBMISSION
```

Builds 3–15 remain listed. They were not re-uploaded. App Store live /
in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof. P1 device QA was
not started. Operator was not asked to install this turn.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `7cf3960` only.
- Build number 16, not 3–15.
- No App Store Review submit.
- No Production submit.
- No local product patch.
- No P1 device QA this turn.
- No Android EAS job / version:set.
- `CURSOR_REPORT.md` not overwritten.
