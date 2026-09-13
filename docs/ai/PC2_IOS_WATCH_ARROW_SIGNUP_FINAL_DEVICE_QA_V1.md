# PC2_IOS_WATCH_ARROW_SIGNUP_FINAL_DEVICE_QA_V1

QA only. No shared/product fix. No commit / push / reset. No App Store Review. No production release. Do not reuse Build 20.

```text
TASK_ID = PC2_IOS_WATCH_ARROW_SIGNUP_FINAL_DEVICE_QA_V1
STATUS = BUILD21_TESTFLIGHT_READY_DEVICE_QA_BLOCKED_STILL_ON_BUILD20
SOURCE_SHA_VERIFIED = YES
IOS_BUILD_RESULT = FINISHED
IOS_BUILD_NUMBER = 21
TESTFLIGHT_UPLOAD = YES
TESTFLIGHT_STATUS = INTERNAL_IN_BETA_TESTING
INSTALLED_ON_IPHONE13 = NO
WATCH_HEADER_ARROW = NOT_EXECUTED
WATCH_HEADER_ARROW_ONE_TAP_EXIT = NOT_EXECUTED
PREVIOUS_P1_CLOSED = NOT_EXECUTED
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
PLAYBACK_REGRESSION = NOT_EXECUTED
CREATE_REGRESSION = NOT_EXECUTED
SAVED_REGRESSION = NOT_EXECUTED
SESSION_REGRESSION = NOT_EXECUTED
GLOBAL_BACK_REGRESSION = NOT_EXECUTED
NEW_DEFECTS = NONE_OBSERVED_DEVICE_QA_NOT_EXECUTED
IOS_ONLY_DEFECTS = NONE_OBSERVED
LIKELY_SHARED_DEFECTS = NONE_OBSERVED
SOURCE_CHANGED_BY_PC2 = NO
APP_STORE_REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMISSION = NO
IOS_DEVICE_GATE = BLOCKED
READY_FOR_CENTRAL_REVIEW = YES
BLOCKERS = BUILD21_NOT_INSTALLED_ON_IPHONE13; TESTFLIGHT_UI_CANNOT_BE_DRIVEN_FROM_WINDOWS; SUITES_A_E_NOT_EXECUTED
```

---

## 1 — Source integrity

Primary mobile checkout was **not** reset (left dirty at `77e9e287` / `pc2/eas-preview-config-v1`).

The candidate SHA was **absent** until `git fetch --prune origin`. After fetch:

```text
SHA = 15d9aec5a219ba0200e5d6e562d4f92242c69f4b
OBJECT = commit
SUBJECT = fix(mobile): hide referral from normal signup and localize validation.
DATE = 2026-08-21 20:54:05 +0300
AUTHOR = UMTUBA Central
PARENT = 1834ea46cc4cb0fc1854012fb1ba9d1db84c45d6
REMOTE_REF = origin/central/signup-remove-referral-code-v1
BUILD20_IS_ANCESTOR = YES (1e708f93555e68ac39826ec57bbd18239e9a5615)
```

Delta after Build 20 (do not validate on 20):

```text
4f51c6c fix(mobile): exit Watch with double Back instead of one Back per video.
1834ea4 fix(mobile): make the Watch header arrow exit Watch on tap.
15d9aec fix(mobile): hide referral from normal signup and localize validation.
```

Related tips (not used as SoT / not built alone):

- `origin/central/watch-double-back-to-exit-v1` @ `4f51c6c`
- `origin/central/watch-header-arrow-p1-v1` @ `1834ea4`

Non-destructive worktree (detached, clean after submit restore):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-watch-arrow-signup-qa-v1`

```text
HEAD = 15d9aec5a219ba0200e5d6e562d4f92242c69f4b
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

Build 20 social-profile worktree left at `1e708f9`. Not reused as SoT.

---

## 3 — Build-number inspection (before upload)

```text
EAS_REMOTE_IOS_BUILD_NUMBER_BEFORE = 20
TESTFLIGHT_LATEST_BEFORE = 1.0.0 (20) gitCommitHash 1e708f9
LOCAL_APP_CONFIG_AT_SHA = still stamped 20 (ignored; appVersionSource = remote)
NEXT_VALID_QA_NUMBER = 21
BUILD21_ALREADY_ON_EAS_BEFORE = NO
MARKETING_VERSION_CHANGED = NO
```

Did **not** reuse 20. Did **not** jump to 22.

---

## 4 — Approved iOS / EAS / TestFlight path

Same path as Builds 16–20. One iOS production/store job. Temporary `eas.json` `ascAppId = 6801665530` for submit only, then restored.

```text
COMMAND_BUILD = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-watch-arrow-signup-qa-v1
EAS_BUILD_ID = 824bd57d-4966-44c9-993c-aeae23a62160
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 21
gitCommitHash = 15d9aec5a219ba0200e5d6e562d4f92242c69f4b
gitCommitMessage = fix(mobile): hide referral from normal signup and localize validation.
isForIosSimulator = false
createdAt = 2026-08-21T18:18:26.782Z
completedAt = 2026-08-21T18:23:55.908Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/lLkjpmsqAiP0co7_UXDYG8scc6X64N_ufPcrYiO4aY8.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/824bd57d-4966-44c9-993c-aeae23a62160
EAS_REMOTE_IOS_BUILD_NUMBER_AFTER = 21
ANDROID_EAS_JOB_STARTED = NO
```

```text
COMMAND_SUBMIT = npx eas-cli submit --platform ios --id 824bd57d-4966-44c9-993c-aeae23a62160 --profile production --non-interactive --wait
EAS_SUBMIT_ID = 547e431c-34de-4324-966f-9079b085746b
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
1.0.0 (21) — internal: in beta testing, external: ready for beta submission
EAS Build ID 824bd57d-4966-44c9-993c-aeae23a62160
EAS Submission 547e431c-34de-4324-966f-9079b085746b
```

ASC “in beta testing” is **not** iPhone install proof.

---

## 5 — Physical iPhone 13 this turn

USB **is live** (unlike the previous Profile QA turn).

```text
IPHONE13_USB_CONNECTED = YES
LIVE_USB_DEVICE = iPhone14,5 / iPhone 13 / 00008110-000A10123AF9801E
USBMUX_DEVICEID = 1
PNP_PRESENT = Apple iPhone WPD OK + composite VID_05AC PID_12A8
INSTALLED_CFBundleShortVersionString = 1.0.0
INSTALLED_CFBundleVersion = 20
SignerIdentity = TestFlight Beta Distribution
BUILD21_INSTALLED = NO
idevice* / pymobiledevice3 / tidevice = ABSENT
screenshotr = historically InvalidService
TAP / XCUITest / WDA = ABSENT
```

`installation_proxy` Lookup after TestFlight 21 upload still reports **CFBundleVersion 20**. Windows cannot tap TestFlight Install/Update.

---

## 6 — Suites A–E (device)

**All NOT_EXECUTED.** Must not run on Build 20. No screenshots. No fabricated PASS/FAIL.

### A — Watch header arrow (required P1 retest)

```text
RESULT = NOT_EXECUTED
WATCH_HEADER_ARROW = NOT_EXECUTED
WATCH_HEADER_ARROW_ONE_TAP_EXIT = NOT_EXECUTED
PREVIOUS_P1_CLOSED = NOT_EXECUTED
```

Source-review only (not a device finding): `resolveWatchHeaderArrowNavigation` exits Watch on **one tap**. Does not arm double-back. Does not finish an Android activity. Session-root fallback is in-app Discover so the control is never dead. Arabic/English labels not observed on device.

### B — Watch history

```text
WATCH_10_PLUS_VIDEO_SWIPE = NOT_EXECUTED
VIDEO_HISTORY_STACK_GROWTH = NOT_EXECUTED
IOS_WATCH_EXIT_BEHAVIOR = NOT_EXECUTED
```

Source-review only: `VIDEO_HISTORY_STACK_GROWTH = 0`; swipe changes local feed index only. `shouldInterceptWatchRootBack` is **Android-only**. PC2 did **not** invent iOS hardware double-back.

### C — Nested navigation

```text
NESTED_PROFILE_BACK = NOT_EXECUTED
WATCH_CONTEXT_PRESERVED = NOT_EXECUTED
```

Not opened. Watch → other-user Profile → header Back → Watch not tapped.

### D — Signup

```text
REFERRAL_FIELD_VISIBLE = NOT_EXECUTED
REFERRAL_REQUIRED = NOT_EXECUTED
SIGNUP_WITHOUT_REFERRAL = NOT_EXECUTED
ARABIC_USERNAME_VALIDATION = NOT_EXECUTED
ENGLISH_VALIDATION_LEAK = NOT_EXECUTED
```

Source-review only: `signup.tsx` visible inputs are fullName, username, email, password. `SIGNUP_VISIBLE_FIELDS` excludes `referralCode`. Invalid username maps to `auth.signup.usernameHint`. Arabic string is localized (not English “lowercase letters”). Not observed on device. No dummy 1234 invented.

### E — Regression spot-check

```text
PROFILE_REGRESSION = NOT_EXECUTED
FOLLOW_REGRESSION = NOT_EXECUTED
PLAYBACK_REGRESSION = NOT_EXECUTED
CREATE_REGRESSION = NOT_EXECUTED
SAVED_REGRESSION = NOT_EXECUTED
SESSION_REGRESSION = NOT_EXECUTED
GLOBAL_BACK_REGRESSION = NOT_EXECUTED
```

Central stated Build 20 already passed full Profile QA. This turn did **not** re-run Profile on 20 and did **not** spot-check 21.

---

## 7 — Defects

No device defect recorded. No screenshot paths.

```text
NEW_DEFECTS = NONE_OBSERVED_DEVICE_QA_NOT_EXECUTED
IOS_ONLY_DEFECTS = NONE_OBSERVED
LIKELY_SHARED_DEFECTS = NONE_OBSERVED
```

---

## 8 — Operator steps remaining

Unlock the USB-connected iPhone 13. Then:

1. Open **TestFlight** (not App Store, not Expo Go).
2. Open **UMTUBA**. Confirm available/installed line is **1.0.0 (21)**.
3. Install / Update. Wait until TestFlight shows **Open** and **1.0.0 (21)**.
4. Do **not** start A–E while the phone still shows **(20)**.
5. Cold-launch UMTUBA from TestFlight Open.
6. **A** Watch: tap header arrow beside شاهد/Watch once in Arabic and English. Must exit / navigate. Dead control = P1 still open.
7. **B** Swipe ≥10 videos (prefer 20+). Leave Watch via normal iOS navigation. Must not require one Back per video. Do not invent Android hardware double-back.
8. **C** Watch → other-user Profile → header Back → Watch. Context preserved if practical.
9. **D** Normal signup: no referral/invite field; not required; no dummy 1234; Arabic username helper localized; no English leak.
10. **E** Spot-check own Profile, other-user, Follow, playback, Create, Saved, session, Global Back.
11. Return observed fields to Central. Do **not** Add for Review. Do **not** create Build 22.

---

## 9 — Safety

- No mobile / web product source edit.
- No commit, push, reset, stash, discard, merge.
- Primary mobile checkout not reset.
- `eas.json` submit `ascAppId` was temporary and restored.
- No App Store Review / production submit.
- No secrets / `.env` / pairing material printed.
- No iOS hardware double-back invented.
- Logo / approved background not invented.
- Build 20 not reused as the QA binary.
