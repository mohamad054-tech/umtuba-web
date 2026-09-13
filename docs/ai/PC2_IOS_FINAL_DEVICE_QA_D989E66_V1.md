# PC2_IOS_FINAL_DEVICE_QA_D989E66_V1

QA only. No shared/product fix. No commit / push / reset. No App Store Review. No production release. Do not reuse Build 22/21/20 as the d989e66 binary.

```text
TASK_ID = PC2_IOS_FINAL_DEVICE_QA_D989E66_V1
STATUS = BUILD23_INSTALLED_P1_VIDEO_STARTUP_FAIL
SOURCE_SHA_VERIFIED = YES
SOURCE_SHA = d989e66364af04bc11b6741914e54b480c1e64b5
SOURCE_REF = origin/central/mobile-auth-password-autofill-visibility-v1
IOS_BUILD_RESULT = FINISHED
IOS_BUILD_NUMBER = 23
SOURCE_SHA_FOR_BUILD = d989e66364af04bc11b6741914e54b480c1e64b5
TESTFLIGHT_UPLOAD = YES
TESTFLIGHT_STATUS = INTERNAL_IN_BETA_TESTING
INSTALLED_ON_IPHONE13 = YES
COLD_LAUNCH = NOT_SEPARATED_FROM_CLIP_END_SWAP
PLAYBACK_P1_RETEST = FAIL
MULTIPLE_VIDEO_PLAYBACK = FAIL_NEXT_ITEM_57S
PROLONGED_LOADING_REPRODUCED = YES_57S_SYSLOG
WATCH_HEADER_ARROW = NOT_EXECUTED
WATCH_HEADER_ARROW_ONE_TAP_EXIT = NOT_EXECUTED
PREVIOUS_ARROW_P1_CLOSED = NOT_EXECUTED
WATCH_10_PLUS_VIDEO_SWIPE = NOT_EXECUTED
WATCH_20_PLUS_VIDEO_STRESS = NOT_EXECUTED
VIDEO_HISTORY_STACK_GROWTH = NOT_EXECUTED
IOS_WATCH_EXIT_BEHAVIOR = NOT_EXECUTED
NESTED_PROFILE_BACK = NOT_EXECUTED
WATCH_CONTEXT_PRESERVED = NOT_EXECUTED
NESTED_COMMENTS_BACK = NOT_EXECUTED
LOGIN_PASSWORD_EYE = NOT_EXECUTED
LOGIN_MASKED_DEFAULT = NOT_EXECUTED
LOGIN_SHOW_PASSWORD = NOT_EXECUTED
LOGIN_REHIDE_PASSWORD = NOT_EXECUTED
LOGIN_PASSWORD_VALUE_PRESERVED = NOT_EXECUTED
SIGNUP_PASSWORD_EYE = NOT_EXECUTED
SIGNUP_MASKED_DEFAULT = NOT_EXECUTED
SIGNUP_SHOW_PASSWORD = NOT_EXECUTED
SIGNUP_REHIDE_PASSWORD = NOT_EXECUTED
SIGNUP_PASSWORD_VALUE_PRESERVED = NOT_EXECUTED
IOS_LOGIN_AUTOFILL = BLOCKED
IOS_PASSWORD_MANAGER_RECOGNITION = BLOCKED
IOS_SIGNUP_NEW_PASSWORD_SEMANTICS = BLOCKED
IOS_SAVE_PASSWORD_BEHAVIOR = BLOCKED
REFERRAL_FIELD_VISIBLE = NOT_EXECUTED
REFERRAL_REQUIRED = NOT_EXECUTED
SIGNUP_WITHOUT_REFERRAL = NOT_EXECUTED
ARABIC_USERNAME_VALIDATION = NOT_EXECUTED
ENGLISH_VALIDATION_LEAK = NOT_EXECUTED
PROFILE_SANITY = NOT_EXECUTED
OTHER_USER_PROFILE_SANITY = NOT_EXECUTED
FOLLOW_SANITY = NOT_EXECUTED
GLOBAL_BACK_SANITY = NOT_EXECUTED
CREATE_SANITY = NOT_EXECUTED
SAVED_SANITY = NOT_EXECUTED
SESSION_SANITY = NOT_EXECUTED
OPEN_AFTER_PUBLISH_SANITY = NOT_EXECUTED
IPHONE13_LAYOUT = NOT_EXECUTED
SAFE_AREA = NOT_EXECUTED
NEW_DEFECTS = P1_VIDEO_STARTUP_OVER_60S
IOS_ONLY_DEFECTS = UNCONFIRMED_IOS_LOG_ONLY
LIKELY_SHARED_DEFECTS = SIGNED_URL_AND_API_FANOUT_BEFORE_NEW_VIDEOASSET
SOURCE_CHANGED_BY_PC2 = NO
LOCAL_FIX_ATTEMPTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMISSION = NO
IOS_DEVICE_GATE = FAIL
READY_FOR_CENTRAL_FINAL_DECISION = NO
BLOCKERS = P1_VIDEO_STARTUP_OVER_60S_BUILD23
NEXT_ACTION = RETURN_REPORT_TO_CENTRAL_AND_WAIT
BUILD23_APP_STORE_GATE = FAIL_DO_NOT_ADD_FOR_REVIEW
VIDEO_P1_REPRODUCED = YES_OPERATOR_FAIL_AND_PC2_LOG_INSTRUMENTED
MEASURED_LOAD_TIME = 57_SECONDS
LIKELY_LAYER = SIGNED_URL_AND_API_FANOUT_BEFORE_NEW_VIDEOASSET
CENTRAL_ESCALATION = YES
CENTRAL_INSTRUCTION_FILE_READ = N/A_SUPERSEDED_BY_THIS_GO
APPROVED_NEW_LOGO_IMPLEMENTED = NO
APPROVED_NEW_BACKGROUND_IMPLEMENTED = NO
```

---

## A — Source / build reconciliation

Primary mobile checkout was **not** reset (left dirty at `77e9e287` / `pc2/eas-preview-config-v1`).

`git fetch --prune origin` created `origin/central/mobile-auth-password-autofill-visibility-v1`.

```text
SHA = d989e66364af04bc11b6741914e54b480c1e64b5
OBJECT = commit
SUBJECT = fix(mobile): add password visibility toggle and native autofill metadata.
DATE = 2026-08-21 23:12:39 +0300
AUTHOR = UMTUBA Central
PARENT = 48c510fa31557f645c292388b37195bc88a852a6
REMOTE_REF = origin/central/mobile-auth-password-autofill-visibility-v1
SOURCE_SHA_VERIFIED = YES
48c510fa_IS_ANCESTOR = YES
061e45ac_IS_ANCESTOR = NO
STALE_LOCAL_AUDIO_FIX_USED = NO
```

Lineage on the candidate (do not rebuild intermediates separately):

```text
d989e66 fix(mobile): add password visibility toggle and native autofill metadata.
48c510f fix(mobile): stop iOS Watch header zIndex from stalling AVPlayer.
15d9aec fix(mobile): hide referral from normal signup and localize validation.
1834ea4 fix(mobile): make the Watch header arrow exit Watch on tap.
4f51c6c fix(mobile): exit Watch with double Back instead of one Back per video.
1e708f9 feat(mobile): share Facebook-style social Profile chrome on Android and iOS.
```

Delta vs Build 22 parent only (auth/password/autofill). `package.json` unchanged.

Non-destructive worktree (detached, clean after submit restore):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-final-qa-d989e66-v1`

### EAS / TestFlight before this upload

```text
LATEST_EAS_IOS = 1.0.0 (22) gitCommitHash 48c510fa
D989E66_ALREADY_ON_TESTFLIGHT = NO
NEXT_VALID_QA_NUMBER = 23
REUSED_EXISTING_NUMBER = NO
SKIPPED_NUMBER = NO
```

### Build / submit (authorized because no exact-SHA binary existed)

```text
COMMAND_BUILD = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-final-qa-d989e66-v1
EAS_BUILD_ID = f898af6e-e0fe-44ac-9155-1be62301ec5d
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 23
gitCommitHash = d989e66364af04bc11b6741914e54b480c1e64b5
isForIosSimulator = false
createdAt = 2026-08-21T21:27:14.279Z
completedAt = 2026-08-21T21:32:35.492Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/Hg2UfyORjCjk_XPw8VeALr4img3QfzssLxH3tGbRinc.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/f898af6e-e0fe-44ac-9155-1be62301ec5d
ANDROID_EAS_JOB_STARTED = NO
GOOGLE_PLAY_TOUCHED = NO
```

```text
COMMAND_SUBMIT = npx eas-cli submit --platform ios --id f898af6e-e0fe-44ac-9155-1be62301ec5d --profile production --non-interactive --wait
EAS_SUBMIT_ID = b4d4149b-0a12-4361-a5c8-c7888d1c5f4f
SUBMIT_STATUS = FINISHED (uploaded to App Store Connect)
ASC_APP_ID = 6801665530
TESTFLIGHT_UPLOAD = YES
EXTERNAL_BETA = NO
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
```

`eas submit:status` after upload:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (23) — internal: in beta testing, external: ready for beta submission
EAS Build ID f898af6e-e0fe-44ac-9155-1be62301ec5d
EAS Submission b4d4149b-0a12-4361-a5c8-c7888d1c5f4f
```

Temporary `eas.json` `ascAppId` was applied for submit only, then restored. Worktree HEAD remains `d989e66` and is clean.

ASC “in beta testing” is **not** iPhone install proof.

---

## B — P1 playback first

**FAIL on Build 23.** See `docs/ai/PC2_IOS_WATCH_PLAYBACK_P1_BUILD23_DEVICE_RETEST_V1.md`.

```text
IPHONE13_USB_CONNECTED = YES
LIVE_USB_DEVICE = iPhone14,5 / iPhone 13 / 00008110-000A10123AF9801E
USBMUX_DEVICEID = 1
INSTALLED_CFBundleShortVersionString = 1.0.0
INSTALLED_CFBundleVersion = 23
SignerIdentity = TestFlight Beta Distribution
BUILD23_INSTALLED = YES
PHONE_ON_PREVIOUS_BUILD = NO
TAP / XCUITest / WDA = ABSENT
screenshotr = historically InvalidService
PLAYBACK_P1_RETEST = FAIL
MEASURED_LOAD_TIME = 57_SECONDS
```

Operator: OVER_60_SECONDS. PC2 syslog: clip-end 11:50:40 → preroll 11:50:41 → `ExpoVideo.VideoAsset` 11:51:35 → first positive media time 11:51:38. HTTP 403 then API fan-out before the new asset. Range 206 / H.264 start are fast after the asset exists.

---

## C — Watch final gate

Not executed (wrong/old binary).

WATCH_HEADER_ARROW / one-tap / previous P1 / 10+ swipe / 20+ stress / history stack / iOS exit / nested Profile / comments: **NOT_EXECUTED**.

---

## D — Login password eye

Not executed. No password values captured.

---

## E — Signup password eye + referral / Arabic validation

Not executed. No dummy 1234 used. No password values captured.

---

## F — iOS Password AutoFill

Physical observation only — **BLOCKED** (cannot operate TestFlight/app UI from Windows; 23 not installed).

```text
IOS_LOGIN_AUTOFILL = BLOCKED
IOS_PASSWORD_MANAGER_RECOGNITION = BLOCKED
IOS_SIGNUP_NEW_PASSWORD_SEMANTICS = BLOCKED
IOS_SAVE_PASSWORD_BEHAVIOR = BLOCKED
```

Not fabricated as PASS. No credentials changed or exposed.

---

## G — Profile spot-check

Not executed. Do not reuse Build 20 Profile certification as this turn’s evidence.

---

## H — Other minimal regression

Create / Saved / session / Open after publish / Arabic+English nav / iPhone 13 layout / safe area: **NOT_EXECUTED**.

---

## I — Visual assets

```text
APPROVED_NEW_LOGO_IMPLEMENTED = NO
APPROVED_NEW_BACKGROUND_IMPLEMENTED = NO
```

Not used as a fail reason. No replacements invented.

---

## J — Defect policy

P1 video startup FAIL on installed Build 23. Local fix not attempted. Windows cannot tap UI; reproduce is operator visual + PC2 syslog timestamps. No fabricated PASS.

---

## Next

Central: diagnose 54–57 s pre-`VideoAsset` gap (sequential signed URL / 403 remint / API). Do not Add for Review. Do not submit production. Do not implement a PC2 shared-source fix.
