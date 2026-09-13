# PC2_IOS18_EDITOR_TARGETED_RETEST_V1 — PHASE 1 COMPLETE / STOP FOR INSTALL

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS18_EDITOR_TARGETED_RETEST_V1
PHASE = PHASE_1_COMPLETE_STOP_FOR_OPERATOR_INSTALL
DATE = 2026-08-20
MODE = PHASE_1_THEN_STOP_FOR_INSTALL
DEVICE = PC2
AUTHORIZED_SOURCE_SHA = a70a399d3e68780688094615d95b248a91a6120f
BUILD17_SUPERSEDED_SHA = f66f15c81772e671da85f04333b1fbb26b9e54a5
BUILD17_SUPERSEDED_BINARY = 1.0.0 (17)
REMOTE_REF = origin/central/ios17-editor-exit-p0-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 18
ANDROID_VERSION_CODE_REMOTE_BEFORE = 18
ANDROID_VERSION_CODE_REMOTE_AFTER = 18
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
REUPLOAD_BUILD_17 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
LEARNING_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
UNCOMMITTED_PC2_PATCH_USED = NO
NEW_PRODUCT_FIXES_ADDED = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
DEVICE_PASS_INVENTED = NO
DEVICE_QA_RUN = NO
PLAINTEXT_PASSWORD = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = a70a399d3e68780688094615d95b248a91a6120f
BUILD = 18
BUILD_ID = 30fb2519-2677-470b-a62f-6b9653d22ef3
TESTFLIGHT = YES_INTERNAL
TESTFLIGHT_STATUS = YES_INTERNAL
IPHONE_ONLY = YES_SOURCE_AND_EXPO_CONFIG
IPAD_SCREENSHOT_REQUIRED = NOT_SEEN_IN_EAS_METADATA
EDITOR_OPEN = NOT_STARTED
VIDEO_EDITOR_OPEN = NOT_STARTED
VIDEO_EDITOR_EXIT_TO_PUBLISH = NOT_STARTED
CREATE_PUBLISH = NOT_STARTED
EDITOR = NOT_STARTED
SOUND_LIBRARY = NOT_STARTED
CHECKBOX = NOT_STARTED
NAV_ICONS = NOT_STARTED
PUBLISHED_TIMESTAMP = NOT_STARTED
WATCH_COMPOSITE = NOT_STARTED
SHARE_EXPORT_BEHAVIOR = NOT_STARTED
LAUNCH_SMOKE = NOT_STARTED
WATCH = NOT_STARTED
CREATE = NOT_STARTED
SHARE = NOT_STARTED
CRASH_SANITY = NOT_STARTED
SOURCE_CHANGED = NO
REVIEW_SUBMITTED = NO
IOS18_READY = NO
APP_STORE_READY = NO
NEXT_ACTION = OPERATOR_INSTALL_TESTFLIGHT_18
IPHONE_QA = NOT_STARTED
QA_PREP = docs/ai/PC2_IOS_BUILD18_QA_PREP.md
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 17_TO_18
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 18
ANDROID_VERSIONCODE_REMOTE_BEFORE = 18
ANDROID_VERSIONCODE_REMOTE_AFTER = 18
TESTFLIGHT_UPLOAD = YES
EAS_SUBMIT_ID = 6a4ef121-1141-43ef-a14a-35d3e68fc8ce
ASC_APP_ID = 6801665530
APP_STORE_SUBMITTED = NO
IPHONE_QA = NOT_STARTED
```

Do **not** treat this as a product PASS. TestFlight **1.0.0 (18)** is
internal `in beta testing`. Device QA has not started. Operator must
install **1.0.0 (18)** on a physical iPhone 13 and confirm the build
number before any editor / Watch / Create field may leave
`NOT_STARTED`. Do not Add for Review.

---

## Phase 1 — Source lock

Preferred new worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build18-editor-targeted-retest-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/ios17-editor-exit-p0-v1
LOCAL_SOURCE_SHA = a70a399d3e68780688094615d95b248a91a6120f
COMMIT_SUBJECT = fix(mobile): keep editor Continue visible and allow overlay drag.
WORKTREE = detached HEAD at a70a399
CLEAN_WORKTREE = YES (after temporary eas.json / metadata pull restored)
BUILD17_IS_ANCESTOR = YES (Build 17 source/binary not used as SoT)
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not**
reset, merged, rebased, stashed, or used as SoT (`77e9e28` /
`pc2/eas-preview-config-v1` untouched). Pre-existing dirty files in
that checkout were left as-is.

Build 17 worktree was used only to list existing EAS jobs before this
SHA’s deps were installed. It was **not** used as SoT:

- `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build17-testflight-device-qa-v1` @ `f66f15c`

No source files were committed. `npm ci` was local-only in the new worktree.

---

## SOURCE_DIFF vs superseded Build 17 `f66f15c81772e671da85f04333b1fbb26b9e54a5`

One commit on `origin/central/ios17-editor-exit-p0-v1`:

| SHA | Subject / intent |
| --- | --- |
| `a70a399` | `fix(mobile): keep editor Continue visible and allow overlay drag.` |

15 files, +782 / −252. Product/source presence only (not a device PASS):

- `app.config.ts`: `ios.buildNumber` 17 → **18**; `supportsTablet` stays **false**
- `VideoEditorScreen`: sticky footer Continue CTA + header Done still present
- Overlay drag helpers; editor-exit guard / footer padding contract
- i18n `create.editorContinue` / `create.editorContinueHint` in ar/de/en/es/fr/pt
- `src/lib/ios/appStoreConfig.test.ts`: expects `supportsTablet === false`, buildNumber `"18"`

No local patch was applied.

---

## Phase 2 — Version lock

`eas.json` uses `cli.appVersionSource = remote` and
`build.production.autoIncrement = true`. Local `app.config.ts`
`ios.buildNumber = "18"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = a70a399d3e68780688094615d95b248a91a6120f
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 18
EAS_REMOTE_BUILD_NUMBER_BEFORE = 17
EXPECTED_BUILD_NUMBER = 18
EAS_REMOTE_BUILD_NUMBER_AFTER = 18
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 18
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 18
EAS_REMOTE_ANDROID_VERSIONCODE_AFTER = 18
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 17 to 18.` It did **not**
reuse 3–17 and did **not** jump past 18.

No Android EAS job and no `eas build:version:set` ran this turn.
Remote Android `versionCode` was already **18** before this iOS job
and stayed **18**.

`npx expo config --type public` (local JS config; remote increment
happens on EAS):

```text
version = 1.0.0
bundleIdentifier = com.umtuba.app
buildNumber = 18
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
| Committed `Info.plist` / `UIDeviceFamily` | **NONE** |
| `SCREENSHOT_MATRIX.md` | iPad screenshots must not be captured/uploaded from iPhone-only builds |

```text
IPHONE_ONLY = YES_SOURCE_AND_EXPO_CONFIG
IPAD_SUPPORT = DISABLED
UIDEVICEFAMILY_IN_COMMITTED_PLIST = ABSENT
SOURCE_CHANGED_TO_VERIFY = NO
```

This is **source + Expo config** evidence. It is not a device-install
PASS and not an ASC-console screenshot-slot PASS.

---

## Phase 3b — Sticky footer Continue/Done (read-only; not patched)

`components/create/VideoEditorScreen.tsx` at SHA `a70a399` contains:

- Header `create.editorDone` Pressable calling `commitAndContinue`
- Sticky footer `View` with `styles.footer` + `editorFooterPaddingBottom`
- Footer CTA labeled `create.editorContinue` (EN: "Continue"), min height 48
- Shared contract in `src/lib/video/editorExit.ts`

This is **source presence only**. `EDITOR_OPEN` and
`VIDEO_EDITOR_EXIT_TO_PUBLISH` stay `NOT_STARTED` until the operator
installs **1.0.0 (18)** and exercises the editor on a physical iPhone.

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

Pre-check: no existing iOS EAS job for SHA `a70a399` or build 18
(latest finished iOS was Build 17 `b65d2d81` @ `f66f15c`). Started
exactly one authorized production/store build. **Not** App Store
Review / Production submit.

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build18-editor-targeted-retest-v1
EAS_BUILD_ID = 30fb2519-2677-470b-a62f-6b9653d22ef3
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 18
gitCommitHash = a70a399d3e68780688094615d95b248a91a6120f
gitCommitMessage = fix(mobile): keep editor Continue visible and allow overlay drag.
isForIosSimulator = false
createdAt = 2026-08-19T22:28:05.360Z
completedAt = 2026-08-19T22:33:49.195Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/GEHwYy8Uz84Qr7UXW-G3kDL8lnknJk9x0eDFyyzOdXs.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/30fb2519-2677-470b-a62f-6b9653d22ef3
FINGERPRINT = 42f2c9ab59b7d37f0857a3ead2699b877d720127
```

Built source matches the authorized SHA. Builds 3–17 were not
re-uploaded or reused as this candidate.

```text
PREVIOUS_BUILD17_EAS_ID = b65d2d81-13f2-43b5-b6c6-fc515344f03c
PREVIOUS_BUILD17_SOURCE = f66f15c81772e671da85f04333b1fbb26b9e54a5
```

---

## Phase 6 — Internal TestFlight upload (Build 18 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530`
(same ASC app as Builds 3–17). Submit ran, then `eas.json` was restored.
Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id 30fb2519-2677-470b-a62f-6b9653d22ef3 --profile production --non-interactive --wait
EAS_SUBMIT_ID = 6a4ef121-1141-43ef-a14a-35d3e68fc8ce
SUBMIT_STATUS = FINISHED
ASC_APP_ID = 6801665530
TESTFLIGHT_UPLOAD = YES
EXTERNAL_BETA = NO
APP_STORE_REVIEW_SUBMIT = NO
REUPLOAD_BUILD_17 = NO
```

`eas submit:status` after Apple processing:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (18) — internal: in beta testing, external: ready for beta submission
EAS Build ID 30fb2519-2677-470b-a62f-6b9653d22ef3
EAS Submission 6a4ef121-1141-43ef-a14a-35d3e68fc8ce
```

Builds 14–17 remain listed. They were not re-uploaded. App Store live /
in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof. Device QA was
not started. Operator install is the next action.

---

## Phase 7 — ASC inspect (Build 18 processing / iPad slot / listing)

`eas metadata:pull` (read-only; generated `store.config.json` and
screenshot files were deleted; worktree left clean). Demo-account secret
from ASC was **not** copied into this report.

### Build 18 processing

```text
BUILD_18_PROCESSING = INTERNAL_IN_BETA_TESTING
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
`npm run build` were **not** rerun (Phase 1 was EAS/TestFlight/ASC).

```text
TESTS = NOT_RERUN_THIS_TURN
TYPECHECK = NOT_RERUN_THIS_TURN
NPM_BUILD = NOT_RERUN_THIS_TURN
NPM_CI = PASS (worktree local only)
```

---

## Safety / scope

- One production iOS build only.
- Built SHA = `a70a399` only. Not Build 17 `f66f15c`.
- Build number 18, not 3–17.
- No App Store Review submit / Add for Review.
- No Production submit.
- No local product patch.
- No device QA this turn.
- No Android EAS job / version:set.
- `CURSOR_REPORT.md` not overwritten.
- Main mobile checkout `77e9e28` not reset.
