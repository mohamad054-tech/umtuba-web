# PC2_IOS17_BUILD_TESTFLIGHT_DEVICE_QA_V1 — PHASE 1 / P0

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS17_BUILD_TESTFLIGHT_DEVICE_QA_V1
PHASE = P0 COMPLETE; DEVICE QA EDITOR EXIT FAIL
DATE = 2026-08-20
MODE = EXECUTION
DEVICE = PC2
AUTHORIZED_SOURCE_SHA = f66f15c81772e671da85f04333b1fbb26b9e54a5
BUILD16_SHA_NOT_REUSED = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
BUILD15_SHA_NOT_REUSED = abf8af9e8db7453d8bcb0e4d34346f182249243b
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 17
ANDROID_VERSION_CODE_REMOTE_BEFORE = 17
ANDROID_VERSION_CODE_REMOTE_AFTER = 17
ANDROID_VERSION_CODE_IN_SHA = 18
ANDROID_EAS_JOB_STARTED = NO
BUNDLE_ID = com.umtuba.app
EXPO_MEDIA_LIBRARY = 57.0.3
EXPO_MODULES_CORE = 57.0.6
IPAD_SUPPORT_SOURCE = DISABLED
SUPPORTS_TABLET = false
IPHONE_ONLY_SOURCE = YES
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
REUPLOAD_BUILD_16 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
LEARNING_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
BUILD16_WORKTREE_USED_AS_SOT = NO
UNCOMMITTED_PC2_PATCH_USED = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
DEVICE_PASS_INVENTED = NO
DEVICE_QA_RUN = NO
PLAINTEXT_PASSWORD = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = f66f15c81772e671da85f04333b1fbb26b9e54a5
BUILD = 17
BUILD_ID = b65d2d81-13f2-43b5-b6c6-fc515344f03c
TESTFLIGHT_STATUS = YES_INTERNAL
IPHONE_ONLY = YES_SOURCE_AND_EXPO_CONFIG
IPAD_SCREENSHOT_REQUIRED = NOT_SEEN_IN_EAS_METADATA
EDITOR = FAIL_EXIT
VIDEO_EDITOR_OPEN = PASS
VIDEO_EDITOR_EXIT_TO_PUBLISH = FAIL
CREATE_PUBLISH = BLOCKED_BY_EDITOR_UI
SEVERITY = P0
SOUND_LIBRARY = NOT_STARTED
CHECKBOX = NOT_STARTED
NAV_ICONS = NOT_STARTED
PUBLISHED_TIMESTAMP = NOT_STARTED
WATCH_COMPOSITE = NOT_STARTED
SHARE_EXPORT_BEHAVIOR = NOT_STARTED
P0 = COMPLETE
P1 = FAIL_EDITOR_EXIT
IOS17_READY = NO
APP_STORE_READY = NO
REVIEW_SUBMITTED = NO
SOURCE_CHANGED = NO
BUILD_CHANGED = NO
NEXT_ACTION = CENTRAL_EDITOR_EXIT_CTA_THEN_NEW_SHA_AND_IOS_BINARY
IPHONE_QA = FAIL_EDITOR_EXIT
FINDING = docs/ai/PC2_IOS_BUILD17_EDITOR_EXIT_FAIL.md
QA_REPORT = docs/ai/PC2_IOS_BUILD17_QA_REPORT.md
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 16_TO_17
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 18
ANDROID_VERSIONCODE_REMOTE_BEFORE = 17
ANDROID_VERSIONCODE_REMOTE_AFTER = 17
TESTFLIGHT_UPLOAD = YES
EAS_SUBMIT_ID = bb5802a2-509e-4bf8-93e4-af3b678e185f
ASC_APP_ID = 6801665530
APP_STORE_SUBMITTED = NO
IPHONE_QA = FAIL_EDITOR_EXIT
```

Do **not** treat this as a product PASS. TestFlight **1.0.0 (17)**
was installed. Official device QA recorded `VIDEO_EDITOR_OPEN = PASS`
and `VIDEO_EDITOR_EXIT_TO_PUBLISH = FAIL`. Create publish is
`BLOCKED_BY_EDITOR_UI`. Finding:
`docs/ai/PC2_IOS_BUILD17_EDITOR_EXIT_FAIL.md`. Do not Add for Review.

---

## Phase 1 — Source lock

Preferred new worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build17-testflight-device-qa-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
ALSO_ON = origin/central/publish-confirm-nav-ux-v1
LOCAL_SOURCE_SHA = f66f15c81772e671da85f04333b1fbb26b9e54a5
COMMIT_SUBJECT = feat(mobile): combine Create editor, sound library, iPhone-only iOS, and server publish timestamps.
WORKTREE = detached HEAD at f66f15c
CLEAN_WORKTREE = YES (after temporary eas.json / metadata pull restored)
BUILD16_IS_ANCESTOR = YES (Build 16 source/binary not used as SoT)
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not**
reset, merged, rebased, stashed, or used as SoT (`77e9e28` /
`pc2/eas-preview-config-v1` untouched).

Build 16 worktree was used only to list existing EAS jobs before this
SHA’s deps were installed. It was **not** used as SoT:

- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build16-watch-load-retry-final-gate-v1` @ `7cf3960`

No source files were committed. `npm ci` was local-only in the new worktree.

---

## SOURCE_DIFF vs Build 16 `7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7`

One commit on `origin/central/mobile-reconcile-ios-android-v1`:

| SHA | Subject / intent |
| --- | --- |
| `f66f15c` | `feat(mobile): combine Create editor, sound library, iPhone-only iOS, and server publish timestamps.` |

41 files, +2995 / −56. Product/source presence only (not a device PASS):

- `app.config.ts`: `ios.supportsTablet` true → **false**; `ios.buildNumber` 16 → **17**; `android.versionCode` 17 → **18** (in SHA only)
- Create editor (`VideoEditorScreen`, overlays, sound library, publish timestamp)
- Tab bar icon glyphs / metrics
- Watch composite overlay playback helpers
- `docs/app-store/SCREENSHOT_MATRIX.md`: iPad shots must not be captured from Build 17
- `src/lib/ios/appStoreConfig.test.ts`: expects `supportsTablet === false`, buildNumber `"17"`

No local patch was applied.

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and
`build.production.autoIncrement = true`. Local `app.config.ts`
`ios.buildNumber = "17"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = f66f15c81772e671da85f04333b1fbb26b9e54a5
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 17
EAS_REMOTE_BUILD_NUMBER_BEFORE = 16
EXPECTED_BUILD_NUMBER = 17
EAS_REMOTE_BUILD_NUMBER_AFTER = 17
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 18
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 17
EAS_REMOTE_ANDROID_VERSIONCODE_AFTER = 17
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 16 to 17.` It did **not**
reuse 3–16 and did **not** jump past 17.

No Android EAS job and no `eas build:version:set` ran this turn.
Remote Android `versionCode` was already **17** before this iOS job
and stayed **17**. SHA local `android.versionCode = 18` was not applied remotely.

`npx expo config --type public`:

```text
version = 1.0.0
bundleIdentifier = com.umtuba.app
buildNumber = 17
supportsTablet = false
appleTeamId = M6HDH86Z55
```

---

## Phase 3 — iPhone-only / iPad disabled (report only; not changed)

No committed `ios/` tree or `Info.plist` (Expo managed).

| Evidence | Result |
| --- | --- |
| `app.config.ts` `ios.supportsTablet` | **false** (comment: Expo emits `UIDeviceFamily = [1]`) |
| `npx expo config --type public` `ios.supportsTablet` | **false** |
| `ios.infoPlist.UIDeviceFamily` in public config JSON | **ABSENT** (not written into the JS config object) |
| Expo `@expo/config-plugins` `DeviceFamily.js` | `supportsTablet` false and not tablet-only → `getDeviceFamilies()` returns **`[1]`** → Xcode `TARGETED_DEVICE_FAMILY = "1"` |
| Committed `Info.plist` / `UIDeviceFamily` | **NONE** |
| EAS Xcode log `TARGETED_DEVICE_FAMILY=1,2` | **Pods only** (`hermes-engine`, `ReactNativeDependencies`). UMTUBA app-target family line was **not** present in the fetched Xcode log excerpt |
| `SCREENSHOT_MATRIX.md` | iPad screenshots must not be captured/uploaded from Build 17 |

```text
IPHONE_ONLY = YES_SOURCE_AND_EXPO_CONFIG
IPAD_SUPPORT = DISABLED
UIDEVICEFAMILY_IN_COMMITTED_PLIST = ABSENT
TARGETED_DEVICE_FAMILY_APP_TARGET_IN_XCODE_LOG = NOT_SEEN
DO_NOT_TREAT_POD_FAMILY_1_2_AS_APP_IPAD_SUPPORT = YES
SOURCE_CHANGED_TO_VERIFY = NO
```

This is **source + Expo prebuild-plugin** evidence. It is not a
device-install PASS and not an ASC-console screenshot-slot PASS.

---

## Phase 4 — expo-media-library pin (Build 10 crash class)

```text
EXPO_MEDIA_LIBRARY_PACKAGE_JSON = 57.0.3
EXPO_MEDIA_LIBRARY_INSTALLED = 57.0.3
EXPO_MODULES_CORE_INSTALLED = 57.0.6
MEDIA_LIBRARY_PIN_BLOCK = NO
```

---

## Phase 5 — One iOS production/TestFlight build

Pre-check: no existing iOS EAS job for SHA `f66f15c` or build 17
(latest finished iOS was Build 16 `ccd20bd3` @ `7cf3960`). Started
exactly one authorized production/store build. **Not** App Store
Review / Production submit.

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build17-testflight-device-qa-v1
EAS_BUILD_ID = b65d2d81-13f2-43b5-b6c6-fc515344f03c
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 17
gitCommitHash = f66f15c81772e671da85f04333b1fbb26b9e54a5
gitCommitMessage = feat(mobile): combine Create editor, sound library, iPhone-only iOS, and server publish timestamps.
isForIosSimulator = false
createdAt = 2026-08-19T21:33:55.394Z
completedAt = 2026-08-19T21:38:58.475Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/YoHqXXYZc_UsSjy-bUryfaMFn_W3ZPqnSY5U0JsKBcM.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/b65d2d81-13f2-43b5-b6c6-fc515344f03c
FINGERPRINT = fda0920776b01c17a768dc463eb3ee6971912ed9
```

Built source matches the authorized SHA. Builds 3–16 were not
re-uploaded or reused as this candidate.

```text
PREVIOUS_BUILD16_EAS_ID = ccd20bd3-d2dc-4943-a7aa-2da2c2fd713e
PREVIOUS_BUILD16_SOURCE = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
```

---

## Phase 6 — Internal TestFlight upload (Build 17 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530`
(same ASC app as Builds 3–16). Submit ran, then `eas.json` was restored.
Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id b65d2d81-13f2-43b5-b6c6-fc515344f03c --profile production --non-interactive --wait
EAS_SUBMIT_ID = bb5802a2-509e-4bf8-93e4-af3b678e185f
SUBMIT_STATUS = FINISHED
ASC_APP_ID = 6801665530
TESTFLIGHT_UPLOAD = YES
EXTERNAL_BETA = NO
APP_STORE_REVIEW_SUBMIT = NO
REUPLOAD_BUILD_16 = NO
```

`eas submit:status` after Apple processing:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (17) — internal: in beta testing, external: ready for beta submission
EAS Build ID b65d2d81-13f2-43b5-b6c6-fc515344f03c
EAS Submission bb5802a2-509e-4bf8-93e4-af3b678e185f
processingState = VALID
internalState = IN_BETA_TESTING
externalState = READY_FOR_BETA_SUBMISSION
uploadedDate = 2026-08-19T14:43:30-07:00
expired = false
```

Builds 13–16 remain listed. They were not re-uploaded. App Store live /
in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof. P1 device QA was
not started. Operator install is the next action.

---

## Phase 7 — ASC inspect (Build 17 processing / iPad slot / listing)

`eas metadata:pull` (read-only; generated `store.config.json` and
`store/` were deleted; worktree left clean). Demo-account secret from
ASC was **not** copied into this report.

### Build 17 processing

```text
BUILD_17_PROCESSING = VALID
INTERNAL = IN_BETA_TESTING
EXTERNAL = READY_FOR_BETA_SUBMISSION
APP_STORE_LIVE = none
IN_REVIEW = none
PENDING_RELEASE = none
ADD_FOR_REVIEW = NO
```

### 13-inch iPad screenshot requirement

EAS metadata returned **only** `APP_IPHONE_65` (three existing 1242×2688
shots). No `APP_IPAD_*` / 13-inch screenshot set key was present in the
pulled config. No 6.9" iPhone set was pulled either.

```text
IPAD_SCREENSHOT_SET_IN_EAS_METADATA = ABSENT
IPHONE_65_SET_IN_EAS_METADATA = PRESENT (3 files)
IPHONE_69_SET_IN_EAS_METADATA = ABSENT
ASC_WEB_CONSOLE_OPENED = NO
IPAD_SCREENSHOT_REQUIRED = NOT_SEEN_IN_EAS_METADATA
```

This is **not** proof that Apple’s 13-inch iPad slot disappeared in the
ASC web console. PC2 did not open that console. Do not manufacture
iPad screenshots. Do not Add for Review.

### App Privacy / Age Rating / Review Information

| Item | This session (EAS metadata) | Invented? |
| --- | --- | --- |
| Listing title / subtitle / description / URLs | PRESENT | NO |
| Copyright | PRESENT (`2026 UMTUBA`) | NO |
| Categories | SOCIAL_NETWORKING, ENTERTAINMENT | NO |
| Age advisory block | PRESENT (`userGeneratedContent=true`, `messagingAndChat=true`; several intensity answers `INFREQUENT`; override `NONE`) | NO |
| Computed 4+ / 12+ / 17+ | **NOT_RETURNED** | NO |
| App Privacy nutrition labels | **NOT_IN_EAS_METADATA** | NO |
| Review contact / demo-required / notes | **PRESENT** | NO |
| Reviewer password value | **NOT_PRINTED** | — |

```text
APP_PRIVACY_NUTRITION = NOT_VISIBLE_VIA_EAS
AGE_RATING = PRESENT_ADVISORY_COMPUTED_NOT_SEEN
REVIEW_INFORMATION = PRESENT
REVIEW_SUBMITTED = NO
```

Do not call Age Rating or Privacy PASS. Do not treat listing presence
as App Store readiness.

---

## Tests / TypeScript / Build (app)

No product TypeScript was edited this turn. Targeted vitest / `tsc` /
`npm run build` were **not** rerun (P0 was EAS/TestFlight/ASC).

```text
TESTS = NOT_RERUN_THIS_TURN
TYPECHECK = NOT_RERUN_THIS_TURN
NPM_BUILD = NOT_RERUN_THIS_TURN
NPM_CI = PASS (worktree local only)
```

---

## Safety / scope

- One production iOS build only.
- Built SHA = `f66f15c` only. Not Build 16 `7cf3960`.
- Build number 17, not 3–16.
- No App Store Review submit / Add for Review.
- No Production submit.
- No local product patch.
- No P1 device QA this turn.
- No Android EAS job / version:set.
- `CURSOR_REPORT.md` not overwritten.
- Main mobile checkout `77e9e28` not reset.
