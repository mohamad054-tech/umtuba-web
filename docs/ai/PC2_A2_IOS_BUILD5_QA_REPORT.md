# PC2-A2 iOS BUILD 5 — real device QA report

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_A2_IOS_BUILD5_REAL_DEVICE_QA_V1
DATE = 2026-08-16
MODE = TESTFLIGHT_UPLOAD_DONE / WAITING_OPERATOR_INSTALL
DEVICE = PC2 + physical iPhone 13
AUTHORIZED_CENTRAL_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
EAS_BUILD_ID = 4c341dcb-b4a8-4549-b50e-5eeb79293b36
EAS_SUBMIT_ID = 004dd5f9-b37f-4c37-a9e3-e5a11a356cc4
APP_VERSION = 1.0.0
BUILD_NUMBER = 5
BUNDLE_ID = com.umtuba.app
ASC_APP_ID = 6801665530
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD4_RETESTED_AS_BUILD5 = NO
```

## Return fields (this turn)

```text
BUILD5_DEVICE_QA = WAITING_OPERATOR_INSTALL
SAVED = NOT_TESTED
OTHER_USER_PROFILE = NOT_TESTED
FOLLOW = NOT_TESTED
MESSAGES = NOT_TESTED
LOGIN_PROFILE = NOT_TESTED
BACK = NOT_TESTED
CREATE_UPLOAD = NOT_TESTED
OPEN_AFTER_UPLOAD = NOT_TESTED
UGC = NOT_TESTED
WATCH_PLAYBACK = NOT_TESTED
PLAYBACK_STABILITY = NOT_TESTED
IOS_RELEASE_BLOCKERS = WAITING_FOR_BUILD5_INSTALL
IPHONE13_INSTALL = NOT_STARTED
BUILD5_INSTALLED = NO
```

No device PASS/FAIL. Build 4 results were not copied forward.

---

## Phase 1 — A1 binary confirmed

```text
SOURCE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
BUILD_SOURCE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
BUILD_RESULT = FINISHED
APP_VERSION = 1.0.0
APP_BUILD_VERSION = 5
DISTRIBUTION = STORE
IS_FOR_IOS_SIMULATOR = false
IOS_ARTIFACT = https://expo.dev/artifacts/eas/C51zrL-DCo0P8T5GEadUqtKWjpZY5iLcUz2T6CC0eBA.ipa
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a1-ios-build5-v1
```

`eas build:view` matches A1. This track did not rebuild.

---

## Phase 2 — Internal TestFlight upload (this session)

A1 did not start submit. This track uploaded **this exact** Build 5 only.

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530` (same as Build 4). Submit ran, then `eas.json` was restored. Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id 4c341dcb-b4a8-4549-b50e-5eeb79293b36 --profile production --non-interactive --wait
EAS_SUBMIT_ID = 004dd5f9-b37f-4c37-a9e3-e5a11a356cc4
SUBMIT_STATUS = FINISHED
ASC_APP_ID = 6801665530
TESTFLIGHT_UPLOAD = YES
EXTERNAL_BETA = NO
APP_STORE_REVIEW_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
```

`eas submit:status` after Apple processing:

```text
1.0.0 (5) — internal: in beta testing, external: ready for beta submission
EAS Build ID 4c341dcb-b4a8-4549-b50e-5eeb79293b36
EAS Submission 004dd5f9-b37f-4c37-a9e3-e5a11a356cc4
```

Build 3 and Build 4 remain listed. They were not re-uploaded. App Store live / in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof.

---

## Phase 3 — iPhone 13 install

Windows cannot tap TestFlight. Physical operator action is required.

```text
OPERATOR_DEVICE = iPhone 13 — تطبيق TestFlight
OPERATOR_ACTION = افتح TestFlight، تأكد أن UMTUBA مكتوب 1.0.0 (5) مو (4)، ثم اضغط تثبيت أو تحديث. بعد ما يخلص اكتب: تم تثبيت 5
WHY_REQUIRED = لازم البناء 5 على الآيفون قبل أي اختبار
```

Do **not** start Saved / Profile / Follow / Messages / Login / Back / Create / UGC / deletion / Watch playback until the operator confirms **1.0.0 (5)**.

If TestFlight still shows **(4)**: do not install. Reply `TESTFLIGHT_STILL_SHOWS_BUILD_4`.

---

## Mandatory regression (blocked until install)

All remain `NOT_TESTED`. Watch playback stays a special open gate after install: multiple real videos; one later success is not PASS if intermittent failure returns; preserve exact expo-video / AVPlayer error; do not invent a backend fix.

Build 4 context only (not Build 5 results): Saved FAIL; other-user Profile “Profile not found”; Watch playback intermittent `Failed to load the player item: resource unavailable`; Messages open/send PASS on Build 4.

---

## Safety

- No App Store Review / Production submit.
- No Android `versionCode` change.
- No Store / Learning reopen.
- `docs/ai/CURSOR_REPORT.md` not overwritten.
- No secrets / `.p8` / key material printed.
- No device PASS invented.
