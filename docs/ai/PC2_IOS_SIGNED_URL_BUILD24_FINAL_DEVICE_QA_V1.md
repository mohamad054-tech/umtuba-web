# PC2_IOS_SIGNED_URL_BUILD24_FINAL_DEVICE_QA_V1

QA + evidence only. No shared/product fix. No commit / push / reset. No App Store Review. No production release. Do not treat Build 23 as the `0d5680a` binary.

**Later the same day:** Build 24 installed. PC2 syslog measured **11 / 12 / 20 s** (not erased). Fresh operator **20-video** retest = **PASS**. Current verdict `PASS_ON_FRESH_RETEST` pending Central acceptance. See `docs/ai/PC2_BUILD24_PLAYBACK_P1_FAILURE_EVIDENCE_V1.md` section G.

```text
TASK_ID = PC2_IOS_SIGNED_URL_BUILD24_FINAL_DEVICE_QA_V1
STATUS = BUILD24_UPLOADED_STAGED_NOT_SWAPPED_STILL_ON_23
DATE = 2026-08-22
DEVICE = PC2
DEVICE_ROLE = IOS_TESTFLIGHT_IPHONE13_VALIDATOR
CENTRAL_COORDINATOR = SERVER
AUTHORITATIVE_MOBILE_SHA = 0d5680ad05fbbb988a59de86c2ee2e87f733f970
AUTHORITATIVE_REF = origin/central/ios-watch-signed-url-fanout-p1-v1
PREVIOUS_BAD_BUILD = UMTUBA 1.0.0 (23)
PREVIOUS_BAD_MEASURED_STARTUP = 57_SECONDS
SOURCE_SHA_VERIFIED = YES
IOS_BUILD_RESULT = FINISHED
IOS_BUILD_NUMBER = 24
TESTFLIGHT_UPLOAD = YES
TESTFLIGHT_STATUS = INTERNAL_IN_BETA_TESTING
INSTALLED_ON_IPHONE13 = NO
PLAYBACK_P1_RETEST = NOT_RUN
VIDEO1_START_TIME = NOT_RUN
VIDEO2_START_TIME = NOT_RUN
VIDEO5_START_TIME = NOT_RUN
VIDEO10_START_TIME = NOT_RUN
PROLONGED_LOADING_REPRODUCED = NOT_RUN
WATCH_10_PLUS_VIDEO_PLAYBACK = NOT_RUN
WATCH_20_PLUS_VIDEO_STRESS = NOT_RUN
NEXT10_PREPARATION = NOT_RUN
ACTIVE_PLAYER_COUNT = NOT_RUN
PROGRESSIVE_SLOWDOWN = NOT_RUN
SIGNED_URL_SERIAL_BLOCKING = NOT_RUN
HTTP_403_FEED_BLOCKING = NOT_RUN
WATCH_REENTRY_PLAYBACK = NOT_RUN
WATCH_HEADER_ARROW = NOT_RUN
VIDEO_HISTORY_STACK_GROWTH = NOT_RUN
NESTED_PROFILE_BACK = NOT_RUN
WATCH_CONTEXT_PRESERVED = NOT_RUN
PROFILE_SANITY = NOT_RUN
SAVED_SANITY = NOT_RUN
CREATE_SANITY = NOT_RUN
SESSION_SANITY = NOT_RUN
PASSWORD_EYE_SANITY = NOT_RUN
AUTOFILL_SANITY = NOT_RUN
NEW_DEFECTS = NONE_THIS_TURN_QA_NOT_STARTED
IOS_ONLY_DEFECTS = NOT_RUN
LIKELY_SHARED_DEFECTS = NOT_RUN
SOURCE_CHANGED_BY_PC2 = NO
LOCAL_FIX_ATTEMPTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMISSION = NO
IOS_PLAYBACK_P1_CLOSED = NOT_RUN
IOS_FINAL_DEVICE_GATE = NOT_RUN
READY_FOR_CENTRAL_FINAL_DECISION = NO
BLOCKERS = OPERATOR_TESTFLIGHT_INSTALL_BUILD24_STAGED_NOT_SWAPPED
```

---

## Official return fields

```text
TASK_ID = PC2_IOS_SIGNED_URL_BUILD24_FINAL_DEVICE_QA_V1
STATUS = BUILD24_UPLOADED_STAGED_NOT_SWAPPED_STILL_ON_23
SOURCE_SHA_VERIFIED = YES
IOS_BUILD_RESULT = FINISHED
IOS_BUILD_NUMBER = 24
TESTFLIGHT_UPLOAD = YES
INSTALLED_ON_IPHONE13 = NO
PLAYBACK_P1_RETEST = NOT_RUN
VIDEO1_START_TIME = NOT_RUN
VIDEO2_START_TIME = NOT_RUN
VIDEO5_START_TIME = NOT_RUN
VIDEO10_START_TIME = NOT_RUN
PROLONGED_LOADING_REPRODUCED = NOT_RUN
WATCH_10_PLUS_VIDEO_PLAYBACK = NOT_RUN
WATCH_20_PLUS_VIDEO_STRESS = NOT_RUN
NEXT10_PREPARATION = NOT_RUN
ACTIVE_PLAYER_COUNT = NOT_RUN
PROGRESSIVE_SLOWDOWN = NOT_RUN
SIGNED_URL_SERIAL_BLOCKING = NOT_RUN
HTTP_403_FEED_BLOCKING = NOT_RUN
WATCH_REENTRY_PLAYBACK = NOT_RUN
WATCH_HEADER_ARROW = NOT_RUN
VIDEO_HISTORY_STACK_GROWTH = NOT_RUN
NESTED_PROFILE_BACK = NOT_RUN
WATCH_CONTEXT_PRESERVED = NOT_RUN
PROFILE_SANITY = NOT_RUN
SAVED_SANITY = NOT_RUN
CREATE_SANITY = NOT_RUN
SESSION_SANITY = NOT_RUN
PASSWORD_EYE_SANITY = NOT_RUN
AUTOFILL_SANITY = NOT_RUN
NEW_DEFECTS = NONE_THIS_TURN_QA_NOT_STARTED
IOS_ONLY_DEFECTS = NOT_RUN
LIKELY_SHARED_DEFECTS = NOT_RUN
SOURCE_CHANGED_BY_PC2 = NO
LOCAL_FIX_ATTEMPTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMISSION = NO
IOS_PLAYBACK_P1_CLOSED = NOT_RUN
IOS_FINAL_DEVICE_GATE = NOT_RUN
READY_FOR_CENTRAL_FINAL_DECISION = NO
BLOCKERS = OPERATOR_TESTFLIGHT_INSTALL_BUILD24_STAGED_NOT_SWAPPED
```

Do **not** treat this as a playback PASS. Suites A–E were not run. Build 23 remains the installed binary.

---

## A — Source / SHA

Primary mobile checkout was **not** reset (left dirty at `77e9e287` / `pc2/eas-preview-config-v1`).

`git fetch --prune origin` created `origin/central/ios-watch-signed-url-fanout-p1-v1`.

```text
SHA = 0d5680ad05fbbb988a59de86c2ee2e87f733f970
OBJECT = commit
SUBJECT = fix(mobile): sign the active Watch URL before the rest of the feed page.
DATE = 2026-08-22 12:30:28 +0300
AUTHOR = UMTUBA Central
PARENT = dd86a3e45a80a43dfc0006c400200b48708394a9
REMOTE_REF = origin/central/ios-watch-signed-url-fanout-p1-v1
SOURCE_SHA_VERIFIED = YES
d989e66_IS_ANCESTOR = YES
STALE_LOCAL_AUDIO_FIX_USED = NO
HEAD_BEFORE_ARCHIVE = 0d5680ad05fbbb988a59de86c2ee2e87f733f970
```

Non-destructive worktree (detached, product source not edited):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-signed-url-build24-v1`

Previous Build 23 worktree left at detached `d989e66`.

---

## B — EAS archive (Build 24)

Authorized because no `0d5680a` binary existed. Latest EAS iOS before this job was **1.0.0 (23)** / `d989e66`. Remote `autoIncrement` only (not a local plist/project edit).

```text
COMMAND_BUILD = eas-cli@22.0.0 build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-signed-url-build24-v1
EAS_BUILD_ID = d8570e12-f095-4395-ba4f-8eb4f13929c8
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 24
gitCommitHash = 0d5680ad05fbbb988a59de86c2ee2e87f733f970
isForIosSimulator = false
createdAt = 2026-08-22T10:01:13Z
completedAt = 2026-08-22T10:06:27Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/XEmm3UhOl1lvvRoaGfn_siNSAJtNZtUy11y4p3uWflg.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/d8570e12-f095-4395-ba4f-8eb4f13929c8
ANDROID_EAS_JOB_STARTED = NO
GOOGLE_PLAY_TOUCHED = NO
REUSED_EXISTING_NUMBER = NO
SKIPPED_NUMBER = NO
```

---

## C — TestFlight upload

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530` (same ASC app as Builds 16–23). Submit ran, then `eas.json` was restored. Worktree left clean. Not committed.

```text
COMMAND_SUBMIT = eas-cli@22.0.0 submit --platform ios --id d8570e12-f095-4395-ba4f-8eb4f13929c8 --profile production --non-interactive --wait
EAS_SUBMIT_ID = c7d62f23-6d58-4b4d-87e8-4888aee7ac55
SUBMIT_STATUS = FINISHED
ASC_APP_ID = 6801665530
TESTFLIGHT_UPLOAD = YES
EXTERNAL_BETA = NO
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
```

`eas submit:status` after Apple processing:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (24) — internal: in beta testing, external: ready for beta submission
EAS Build ID d8570e12-f095-4395-ba4f-8eb4f13929c8
EAS Submission c7d62f23-6d58-4b4d-87e8-4888aee7ac55
```

ASC “in beta testing” is **not** iPhone install proof.

---

## D — Installed binary (gate) — FAIL to start QA

Phone is **still** 1.0.0 (23). Suites A–E were **not** started.

```text
IPHONE13_USB_CONNECTED = YES
LIVE_USB_DEVICE = iPhone14,5 / iPhone 13 / 00008110-000A10123AF9801E
USBMUX_DEVICEID = 1
INSTALL_PROXY_AT = 2026-08-22T10:27:30Z_PLUS
CFBundleDisplayName = UMTUBA
CFBundleShortVersionString = 1.0.0
CFBundleVersion = 23
SignerIdentity = TestFlight Beta Distribution
ApplicationType = User
ITSDRMScheme = v2
MinimumOSVersion = 18.0
BUILD24_INSTALLED = NO
PHONE_ON_PREVIOUS_BUILD = YES
```

USB syslog (hosts / tokens / signed query not copied):

```text
13:20:44  appstored  com.umtuba.app download started (fractionCompleted ~0.075)
13:22:41  appstored  download complete; phase = Pending Install (fractionCompleted 0.600)
13:22:42  installd   Success (End) : Stage (New Update)
13:22:42  installd   Staging update successful  Distributor: com.apple.TestFlight
13:22:42  installcoordinationd  Scheduling opportunistic install
AFTER        installation_proxy still CFBundleVersion 23
             same bundle path as Build 23
```

Windows cannot tap TestFlight. The update is **staged** and waiting for an opportunistic swap (typically after the running app is force-quit / TestFlight Update is confirmed). PC2 did not sideload a non-TestFlight IPA.

---

## E — Suites A–E

**NOT_RUN.** Do not QA Build 23 as the new candidate. No fabricated PASS vs the old 57 s P1.

| Suite | Result |
| --- | --- |
| A Primary playback gate | NOT_RUN |
| B Next-10 preparation | NOT_RUN |
| C 403 / recovery | NOT_RUN |
| D Watch regression | NOT_RUN |
| E Minimal product sanity | NOT_RUN |

```text
TAP / XCUITest / WDA = ABSENT
PC2_VISUAL_REPRODUCE = NO
```

---

## Safety

- No product source edit. Temporary `eas.json` `ascAppId` restored.
- No commit, push, reset, stash.
- No Add for Review. No production submit.
- No secrets / `.env` / pairing material / signed query printed.
- Dirty web + primary mobile trees preserved.
- SOURCE_CHANGED_BY_PC2 = NO
- LOCAL_FIX_ATTEMPTED = NO

---

## Operator (required) — historical (install wait)

Superseded. Install completed. See addendum below.

---

## H — Fresh operator 20-video retest (later 2026-08-22)

Keep **both** records:

| Record | Result |
| --- | --- |
| Build 23 syslog | 57 s pre-`VideoAsset` / 403 |
| Build 24 PC2 syslog (pid 5816) | **11 s / 12 s / 20 s** — not erased |
| Fresh operator retest | **20** consecutive videos, immediate startup, **no** stall |

```text
FRESH_OPERATOR_RETEST = PASS
WATCH_20_PLUS_VIDEO_STRESS = PASS
VIDEOS_TESTED = 20
OBSERVED_STARTUP_DELAY = NONE
PROLONGED_LOADING_REPRODUCED = NO
PROGRESSIVE_SLOWDOWN = NO
PREVIOUS_INSTRUMENTED_TIMES = 11s / 12s / 20s
BUILD24_CURRENT_VERDICT = PASS_ON_FRESH_RETEST
IOS_PLAYBACK_P1_CLOSED = YES_ON_CURRENT_RETEST
IOS_FINAL_DEVICE_GATE = PASS_PENDING_CENTRAL_ACCEPTANCE
READY_FOR_CENTRAL_FINAL_DECISION = YES
BUILD24_DEVICE_VERSION_VERIFIED = YES
SOURCE_CHANGED_BY_PC2 = NO
LOCAL_FIX_ATTEMPTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMISSION = NO
BLOCKERS = NONE_PENDING_CENTRAL_ACCEPTANCE
```

`installation_proxy` recheck: still **CFBundleVersion 24**.

---

## Next (Central)

1. Do **not** Add for Review until Central accepts.
2. Accept or reject `PASS_ON_FRESH_RETEST` with the prior 11 / 12 / 20 s syslog still on file.
3. PC2 must not implement a fix.
