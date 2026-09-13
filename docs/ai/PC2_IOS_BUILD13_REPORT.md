# PC2_IOS_BUILD13_WATCH_AUDIO_OWNERSHIP_QA_V1 — PHASE 1 / P0 PROVENANCE

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD13_WATCH_AUDIO_OWNERSHIP_QA_V1
PHASE = P0 COMPLETE (TestFlight 13 internal; no device QA)
DATE = 2026-08-17
MODE = EXECUTION
DEVICE = PC2
AUTHORIZED_SOURCE_SHA = 700dddae332067d2182b143d4328492a22219a66
BUILD12_SHA_NOT_REUSED = 7638487d1412f070e19285fc434362b47a359ea5
BUILD11_HISTORICAL_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
BUILD10_BURNED_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
WAVE2_SHA = 31db97d (not present on remotes; not merged)
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 13
ANDROID_VERSION_CODE_REMOTE_BEFORE = 12
ANDROID_VERSION_CODE_REMOTE_AFTER = 14
ANDROID_VERSION_CODE_IN_SHA = 14
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
UNCOMMITTED_PC2_PATCH_USED = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
DEVICE_PASS_INVENTED = NO
DEVICE_QA_RUN = NO
PLAINTEXT_PASSWORD = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = 700dddae332067d2182b143d4328492a22219a66
BUILD_NUMBER = 13
EAS_BUILD_ID = db467f4d-5fce-430b-98f7-60c74d8c1ed8
BUILD_SOURCE_SHA = 700dddae332067d2182b143d4328492a22219a66
EXPO_MEDIA_LIBRARY = 57.0.3
BUILD_RESULT = FINISHED
BUILD13_TESTFLIGHT_AVAILABLE = YES_INTERNAL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS; ANDROID_REMOTE_VERSIONCODE_NOW_14
TESTS = PASS (targeted 35/35); full suite not rerun
TYPECHECK = PASS
LINT = PASS
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 12_TO_13
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 14
ANDROID_VERSIONCODE_REMOTE_BEFORE = 12
ANDROID_VERSIONCODE_REMOTE_AFTER = 14
TESTFLIGHT_UPLOAD = YES
EAS_SUBMIT_ID = 0b58c218-95d1-49c3-b377-e50145f7c703
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

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build13-watch-audio-qa-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
LOCAL_SOURCE_SHA = 700dddae332067d2182b143d4328492a22219a66
COMMIT_SUBJECT = fix(mobile): tear down previous Watch audio on active change and stamp iOS 13 / Android 14.
WORKTREE = detached HEAD at 700ddda
CLEAN_WORKTREE = YES
BUILD12_IS_ANCESTOR = YES (Build 12 source not used as SoT)
BUILD11_IS_ANCESTOR = YES (historical source not used as SoT)
WAVE2_31db97d_PRESENT = NO
WAVE2_MERGED = NO
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not**
reset, merged, rebased, stashed, or used as SoT (`77e9e28` /
`pc2/eas-preview-config-v1` untouched).

Build 10 / 11 / 12 worktrees were **not** used as SoT:

- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build10-final-share-create-qa-v1` @ `4d329e1`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build11-launch-surgical-qa-v1` @ `4b9fa56`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build12-session-qa-v1` @ `7638487`

Stale / superseded sources were **not** used:

- `pc2/a2-open-watch-published-post-v1`
- `pc2/eas-preview-config-v1` (`77e9e28`)
- Build 5–12 SHAs listed above
- Localization Wave 2 `31db97d` (object missing on remotes)

No source files were committed. `npm ci` was local-only in the new worktree.

---

## SOURCE_DIFF vs Build 12 `7638487d1412f070e19285fc434362b47a359ea5`

One commit on `origin/central/mobile-reconcile-ios-android-v1`:

| SHA | Subject / intent |
| --- | --- |
| `700ddda` | `fix(mobile): tear down previous Watch audio on active change and stamp iOS 13 / Android 14.` |

8 files, +591 / −41:

- `app.config.ts`: `ios.buildNumber` 12 → 13; `android.versionCode` 13 → 14 (in SHA only)
- `app/(tabs)/watch.tsx`: bumps exclusive owner generation when the active index changes
- `components/WatchVideoCard.tsx`: mute+pause+disable-loop teardown; ignore stale-generation play / playToEnd
- `src/lib/watch/activePlayerOwnership.ts` + test: exclusive audio owner + generation gate (new)
- `src/lib/watch/playerSession.ts` + test: `applyInactiveAudioTeardown` (mute, volume 0, loop false, pause; optional seek then pause again)
- `src/lib/ios/appStoreConfig.test.ts`: expected buildNumber `"13"`, Android versionCode `14`

Read-only note: this is the Watch audio-ownership fix for Build 12
`PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO`. Adjacent expo-video
players stay mounted for preload; only the active post may emit audio.
Inactive / stale-generation commands must mute+pause and disable native
loop so iOS `onPlayedToEnd` / Android `REPEAT_MODE` cannot restart the
previous clip. Seek-to-0 is avoided on unexpected play because seek can
re-trigger AVPlayer.

This is **source presence only**. It is not a device PASS.

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and
`build.production.autoIncrement = true`. Local `app.config.ts`
`ios.buildNumber = "13"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = 700dddae332067d2182b143d4328492a22219a66
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 13
EAS_REMOTE_BUILD_NUMBER_BEFORE = 12
EXPECTED_BUILD_NUMBER = 13
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 14
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 12
EAS_REMOTE_ANDROID_VERSIONCODE_AFTER = 14
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 12 to 13.` It did **not**
reuse 3/4/5/6/7/8/9/10/11/12 and did **not** jump past 13.

No Android EAS job and no `eas build:version:set` ran this turn.
Latest Android EAS artifact remains the earlier preview APK
`7fb664b9-1d09-442b-b191-b2298419e403` (versionCode 12). After the
iOS production job, `eas build:version:get --platform android` reads
**14**. That matches the SHA stamp. PC2 did not revert it.

---

## Phase 3 — expo-media-library pin (Build 10 crash class)

Build 11/12 pin is still present on this SHA.

```text
EXPO_MEDIA_LIBRARY_PACKAGE_JSON = 57.0.3
EXPO_MEDIA_LIBRARY_LOCKFILE = 57.0.3
EXPO_MEDIA_LIBRARY_INSTALLED = 57.0.3
EXPO_MEDIA_LIBRARY_57_0_4_PRESENT = NO
EXPO_MODULES_CORE_LOCKFILE = 57.0.6
MEDIA_LIBRARY_PIN_BLOCK = NO
```

Lockfile resolved URL:
`https://registry.npmjs.org/expo-media-library/-/expo-media-library-57.0.3.tgz`

---

## Phase 4 — Required quality commands

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build13-watch-audio-qa-v1`

```text
COMMAND = npm ci
RESULT = PASS (exit 0)
```

Targeted (Watch ownership + session + appStoreConfig):

```text
COMMAND = npx vitest run src/lib/watch/activePlayerOwnership.test.ts src/lib/watch/playerSession.test.ts src/lib/ios/appStoreConfig.test.ts src/lib/auth/sessionHydration.test.ts src/lib/supabase/authStorage.test.ts
RESULT = PASS (exit 0)
VITEST = 35 passed (35)
FILES = 5 passed (5)
```

Full `npm test` was **not** rerun (optional; Build 12 Windows locale
wallet failure is known and was not patched).

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

Pre-check: no existing iOS EAS job for SHA `700ddda` or build 13
(latest finished iOS was Build 12 `5e3337c4` @ `7638487`). Started
exactly one authorized production/store build (same path as Builds
7–12). **Not** App Store Production submit.

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build13-watch-audio-qa-v1
EAS_BUILD_ID = db467f4d-5fce-430b-98f7-60c74d8c1ed8
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 13
gitCommitHash = 700dddae332067d2182b143d4328492a22219a66
gitCommitMessage = fix(mobile): tear down previous Watch audio on active change and stamp iOS 13 / Android 14.
isForIosSimulator = false
createdAt = 2026-08-17T18:25:10.185Z
completedAt = 2026-08-17T18:30:07.944Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/jvV-1qCpzoGreHYivfqDDT5GoJSLnEnUb16UFmwCvJo.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/db467f4d-5fce-430b-98f7-60c74d8c1ed8
FINGERPRINT = 9b6c573e26722e597ab59d1d942710915f2d5184
```

Built source matches the authorized SHA. No other source change.
Builds 3/4/5/6/7/8/9/10/11/12 were not re-uploaded or reused.

```text
PREVIOUS_BUILD12_EAS_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
PREVIOUS_BUILD12_SOURCE = 7638487d1412f070e19285fc434362b47a359ea5
PREVIOUS_BUILD11_EAS_ID = 96aca0f9-47f9-4c32-b443-c2301a97ecba
PREVIOUS_BUILD11_SOURCE = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
```

---

## Phase 6 — Internal TestFlight upload (Build 13 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530`
(same ASC app as Builds 3–12). Submit ran, then `eas.json` was restored.
Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id db467f4d-5fce-430b-98f7-60c74d8c1ed8 --profile production --non-interactive --wait
EAS_SUBMIT_ID = 0b58c218-95d1-49c3-b377-e50145f7c703
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
```

`eas submit:status` after Apple processing:

```text
App Store Live: none (JSON listed only testFlightBuilds)
In review: none
Pending release: none
1.0.0 (13) — internal: in beta testing, external: ready for beta submission
EAS Build ID db467f4d-5fce-430b-98f7-60c74d8c1ed8
EAS Submission 0b58c218-95d1-49c3-b377-e50145f7c703
processingState = VALID
internalState = IN_BETA_TESTING
externalState = READY_FOR_BETA_SUBMISSION
```

Builds 3–12 remain listed. They were not re-uploaded. App Store live /
in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof. P1 device QA was
not started. Operator was not asked to install this turn.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `700ddda` only.
- Build number 13, not 3–12.
- No App Store Review submit.
- No Production submit.
- No local product patch.
- No P1 device QA this turn.
- No Android EAS job / version:set.
- `CURSOR_REPORT.md` not overwritten.
