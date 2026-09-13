# PC2_IOS_WATCH_PLAYBACK_P1_BUILD22_DEVICE_RETEST_V1

QA only. No shared/product fix. No commit / push / reset. No App Store Review. No production release. Do not reuse Build 21 or Build 20.

```text
TASK_ID = PC2_IOS_WATCH_PLAYBACK_P1_BUILD22_DEVICE_RETEST_V1
STATUS = BUILD22_TESTFLIGHT_READY_DEVICE_QA_BLOCKED_STILL_ON_BAD_BUILD21
SOURCE_SHA_VERIFIED = YES
IOS_BUILD_RESULT = FINISHED
IOS_BUILD_NUMBER = 22
TESTFLIGHT_UPLOAD = YES
TESTFLIGHT_STATUS = INTERNAL_IN_BETA_TESTING
INSTALLED_ON_IPHONE13 = NO
PLAYBACK_P1_RETEST = NOT_EXECUTED
MULTIPLE_VIDEO_PLAYBACK = NOT_EXECUTED
PLAYBACK_START_TIME = NOT_EXECUTED
PROLONGED_LOADING_REPRODUCED = NOT_EXECUTED
WATCH_HEADER_ARROW = NOT_EXECUTED
WATCH_HEADER_ARROW_ONE_TAP_EXIT = NOT_EXECUTED
PREVIOUS_ARROW_P1_CLOSED = NOT_EXECUTED
WATCH_10_PLUS_VIDEO_SWIPE = NOT_EXECUTED
VIDEO_HISTORY_STACK_GROWTH = NOT_EXECUTED
IOS_WATCH_EXIT_BEHAVIOR = NOT_EXECUTED
NESTED_PROFILE_BACK = NOT_EXECUTED
WATCH_CONTEXT_PRESERVED = NOT_EXECUTED
REFERRAL_FIELD_VISIBLE = NOT_EXECUTED
REFERRAL_REQUIRED = NOT_EXECUTED
SIGNUP_WITHOUT_REFERRAL = NOT_EXECUTED
ARABIC_USERNAME_VALIDATION = NOT_EXECUTED
ENGLISH_VALIDATION_LEAK = NOT_EXECUTED
PROFILE_REGRESSION = NOT_EXECUTED
FOLLOW_REGRESSION = NOT_EXECUTED
CREATE_REGRESSION = NOT_EXECUTED
SAVED_REGRESSION = NOT_EXECUTED
SESSION_REGRESSION = NOT_EXECUTED
GLOBAL_BACK_REGRESSION = NOT_EXECUTED
OPEN_AFTER_PUBLISH_REGRESSION = NOT_EXECUTED
NEW_DEFECTS = NONE_OBSERVED_DEVICE_QA_NOT_EXECUTED
IOS_ONLY_DEFECTS = NONE_OBSERVED
LIKELY_SHARED_DEFECTS = NONE_OBSERVED
SOURCE_CHANGED_BY_PC2 = NO
APP_STORE_REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMISSION = NO
IOS_DEVICE_GATE = BLOCKED
READY_FOR_CENTRAL_FINAL_DECISION = NO
BLOCKERS = BUILD22_NOT_INSTALLED_ON_IPHONE13; PHONE_STILL_ON_BAD_BUILD21; TESTFLIGHT_UI_CANNOT_BE_DRIVEN_FROM_WINDOWS; PLAYBACK_P1_AND_A_E_NOT_EXECUTED
```

---

## 1 — Source integrity

Primary mobile checkout was **not** reset (left dirty at `77e9e287` / `pc2/eas-preview-config-v1`).

The candidate SHA was **absent** until `git fetch --prune origin`. After fetch:

```text
SHA = 48c510fa31557f645c292388b37195bc88a852a6
OBJECT = commit
SUBJECT = fix(mobile): stop iOS Watch header zIndex from stalling AVPlayer.
DATE = 2026-08-21 21:58:44 +0300
AUTHOR = UMTUBA Central
PARENT = 15d9aec5a219ba0200e5d6e562d4f92242c69f4b
REMOTE_REF = origin/central/ios-watch-playback-p1-v1
BUILD21_IS_PARENT = YES
```

Delta after bad Build 21 (do not validate on 21):

```text
48c510f fix(mobile): stop iOS Watch header zIndex from stalling AVPlayer.
```

Source-review only (not a device finding): `watchHeaderOverlayLayerStyle("ios")` returns `{}` — no `zIndex` / `elevation` on iOS. Android still uses zIndex 20. Document order (header after FlatList) is the tap path. PC2 did **not** re-implement this.

Non-destructive worktree (detached, clean after submit restore):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-watch-playback-p1-build22-v1`

```text
HEAD = 48c510fa31557f645c292388b37195bc88a852a6
WORKTREE = CLEAN
PRIMARY_CHECKOUT_UNCHANGED = YES
WEB_HEAD = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
WEB_DIRTY = YES (prior uncommitted PC2 work preserved)
```

---

## 2 — Dirty / uncommitted state (preserved)

### Web

HEAD `b3c05d8` / `office/platform-translation-trunk-port-v1`. Dirty before this turn. Not reset.

This turn updated `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`, and added this file.

### Mobile primary

```text
HEAD = 77e9e287e117fc9a19f9a5df1596f69b0b8bf07f
BRANCH = pc2/eas-preview-config-v1
DIRTY = docs/ai/CURSOR_REPORT.md + untracked app-store zip/folder + worktrees/
RESET = NO
```

Build 21 worktree left at `15d9aec5`. Not reused as SoT.

---

## 3 — Build-number inspection (before upload)

```text
EAS_REMOTE_IOS_BUILD_NUMBER_BEFORE = 21
TESTFLIGHT_LATEST_BEFORE = 1.0.0 (21) gitCommitHash 15d9aec5 (BAD)
LOCAL_APP_CONFIG_AT_SHA = still stamped 20 (ignored; appVersionSource = remote)
NEXT_VALID_QA_NUMBER = 22
BUILD22_ALREADY_ON_EAS_BEFORE = NO
MARKETING_VERSION_CHANGED = NO
```

Did **not** reuse 21. Did **not** jump to 23.

---

## 4 — Approved iOS / EAS / TestFlight path

Same path as Builds 16–21. One iOS production/store job. Temporary `eas.json` `ascAppId = 6801665530` for submit only, then restored.

```text
COMMAND_BUILD = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-watch-playback-p1-build22-v1
EAS_BUILD_ID = b4d29b6f-7210-405f-ad33-a84f85d46053
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 22
gitCommitHash = 48c510fa31557f645c292388b37195bc88a852a6
gitCommitMessage = fix(mobile): stop iOS Watch header zIndex from stalling AVPlayer.
isForIosSimulator = false
createdAt = 2026-08-21T19:14:26.236Z
completedAt = 2026-08-21T19:19:51.473Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/l-Ydwv32Eo3Yme0OSdH7VAWPLINK_bCQiuKgIa-DkYs.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/b4d29b6f-7210-405f-ad33-a84f85d46053
EAS_REMOTE_IOS_BUILD_NUMBER_AFTER = 22
ANDROID_EAS_JOB_STARTED = NO
GOOGLE_PLAY_TOUCHED = NO
```

```text
COMMAND_SUBMIT = npx eas-cli submit --platform ios --id b4d29b6f-7210-405f-ad33-a84f85d46053 --profile production --non-interactive --wait
EAS_SUBMIT_ID = 3cc9e703-6c78-49e8-8488-57af1a44b675
SUBMIT_STATUS = FINISHED (uploaded to App Store Connect)
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
1.0.0 (22) — internal: in beta testing, external: ready for beta submission
EAS Build ID b4d29b6f-7210-405f-ad33-a84f85d46053
EAS Submission 3cc9e703-6c78-49e8-8488-57af1a44b675
```

ASC “in beta testing” is **not** iPhone install proof.

---

## 5 — Physical iPhone 13 this turn

USB **is live**.

```text
IPHONE13_USB_CONNECTED = YES
LIVE_USB_DEVICE = iPhone14,5 / iPhone 13 / 00008110-000A10123AF9801E
USBMUX_DEVICEID = 1
INSTALLED_CFBundleShortVersionString = 1.0.0
INSTALLED_CFBundleVersion = 21
SignerIdentity = TestFlight Beta Distribution
BUILD22_INSTALLED = NO
PHONE_ON_PREVIOUS_BAD_BUILD = YES
idevice* / pymobiledevice3 / tidevice = ABSENT
screenshotr = historically InvalidService
TAP / XCUITest / WDA = ABSENT
```

`installation_proxy` Lookup after TestFlight 22 upload still reports **CFBundleVersion 21**. Windows cannot tap TestFlight Install/Update. Previous turn the phone was on 20; an operator later installed 21. That binary is the **BAD** overlay-zIndex build and must not be used for this retest.

---

## 6 — Playback P1 (device)

**NOT_EXECUTED.** Must not run on Build 21.

```text
PLAYBACK_P1_RETEST = NOT_EXECUTED
MULTIPLE_VIDEO_PLAYBACK = NOT_EXECUTED
PLAYBACK_START_TIME = NOT_EXECUTED
PROLONGED_LOADING_REPRODUCED = NOT_EXECUTED
```

No 5-video or 10+ swipe sequence. No spinner timing. No fabricated PASS/FAIL.

---

## 7 — Suites A–E (device)

**All NOT_EXECUTED.** Broader QA is gated on playback P1 PASS on **22**. Previous blocked Build 21 A–E was **not** continued on 21.

### A — Watch header arrow

```text
WATCH_HEADER_ARROW = NOT_EXECUTED
WATCH_HEADER_ARROW_ONE_TAP_EXIT = NOT_EXECUTED
PREVIOUS_ARROW_P1_CLOSED = NOT_EXECUTED
```

### B — Watch history

```text
WATCH_10_PLUS_VIDEO_SWIPE = NOT_EXECUTED
VIDEO_HISTORY_STACK_GROWTH = NOT_EXECUTED
IOS_WATCH_EXIT_BEHAVIOR = NOT_EXECUTED
```

PC2 did not invent iOS hardware double-back.

### C — Nested Profile

```text
NESTED_PROFILE_BACK = NOT_EXECUTED
WATCH_CONTEXT_PRESERVED = NOT_EXECUTED
```

### D — Signup

```text
REFERRAL_FIELD_VISIBLE = NOT_EXECUTED
REFERRAL_REQUIRED = NOT_EXECUTED
SIGNUP_WITHOUT_REFERRAL = NOT_EXECUTED
ARABIC_USERNAME_VALIDATION = NOT_EXECUTED
ENGLISH_VALIDATION_LEAK = NOT_EXECUTED
```

### E — Regression spot-check

```text
PROFILE_REGRESSION = NOT_EXECUTED
FOLLOW_REGRESSION = NOT_EXECUTED
CREATE_REGRESSION = NOT_EXECUTED
SAVED_REGRESSION = NOT_EXECUTED
SESSION_REGRESSION = NOT_EXECUTED
GLOBAL_BACK_REGRESSION = NOT_EXECUTED
OPEN_AFTER_PUBLISH_REGRESSION = NOT_EXECUTED
```

---

## 8 — Defects

No device defect recorded on Build 22 (not installed). No screenshot paths.

```text
NEW_DEFECTS = NONE_OBSERVED_DEVICE_QA_NOT_EXECUTED
IOS_ONLY_DEFECTS = NONE_OBSERVED
LIKELY_SHARED_DEFECTS = NONE_OBSERVED
```

Do not treat the known Build 21 playback stall as a new Build 22 finding.

---

## 9 — Operator steps remaining

Unlock the USB-connected iPhone 13. Then:

1. Open **TestFlight** (not App Store, not Expo Go).
2. Open **UMTUBA**. Confirm available/installed line is **1.0.0 (22)**.
3. Install / Update. Wait until TestFlight shows **Open** and **1.0.0 (22)**.
4. Do **not** start Watch QA while the phone still shows **(21)** or **(20)**.
5. Cold-launch UMTUBA from TestFlight Open.
6. **PRIMARY P1:** Watch, ≥5 different videos. Poster may appear. Playback must start promptly. No prolonged spinner / 30–60s load. If healthy, swipe 10+.
7. **STOP** if playback still stalls. Return FAIL evidence. Do not continue A–E.
8. **If playback PASSES:** run A–E (header arrow AR+EN, history, nested Profile, signup, regression spot-check).
9. Return observed fields to Central. Do **not** Add for Review. Do **not** create Build 23.

---

## 10 — Safety

- No mobile / web product source edit.
- No commit, push, reset, stash, discard, merge.
- Primary mobile checkout not reset.
- `eas.json` submit `ascAppId` was temporary and restored.
- No App Store Review / production submit.
- Google Play not touched.
- No secrets / `.env` / pairing material printed.
- No iOS hardware double-back invented.
- Build 21 / 20 not reused as the QA binary.
- Central zIndex fix not re-implemented.
