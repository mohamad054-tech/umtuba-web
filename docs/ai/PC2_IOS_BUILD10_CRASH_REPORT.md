# PC2 iOS BUILD 10 — launch crash (official final return)

Matches `docs/ai/PC2_IOS_BUILD10_FINAL_RETURN.md`. Build 10 is
**REJECTED**. Phase 2 gates stay **NOT_TESTED** (not FAIL). Do **not**
reopen this binary.

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD10_FINAL_SHARE_CREATE_QA_V1
DATE = 2026-08-17
PHASE = OFFICIAL_FINAL_RETURN
MODE = PAUSED / NO_PATCH / NO_REBUILD / NO_REOPEN
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
TESTFLIGHT_BUILD = 10
AUTHORIZED_SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
PREVIOUS_AUTHORIZED_BUILD9_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
EAS_BUILD_ID = 9472a064-9e80-41b3-a61a-3473bc639c86
EAS_SUBMIT_ID = ecfed685-6b09-4826-aea2-351ba489f32c
BUILD10_INSTALL = PASS
BUILD10_LAUNCH = FAIL_HARD
BUILD10_RELEASE_STATUS = REJECTED
BUILD10_DEVICE_QA_CAN_CONTINUE = NO
NEW_IOS_BINARY_REQUIRED = YES
NEW_AUTHORITATIVE_SHA_REQUIRED = YES
PC2_ACTION_REQUIRED = NONE_UNTIL_NEW_SHA
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
DEVICE_QA_EXECUTED = NO
PHASE2_SHARE = NOT_TESTED
PHASE2_CREATE = NOT_TESTED
PHASE2_LIKE = NOT_TESTED
PHASE2_PROFILE = NOT_TESTED
PHASE2_COMMENT = NOT_TESTED
PHASE2_LANGUAGE = NOT_TESTED
PHASE2_WATCH = NOT_TESTED
CURSOR_REPORT_OVERWRITTEN = NO
PRODUCT_PATCH_APPLIED = NO
NEW_EAS_BUILD_STARTED = NO
DIVERGED_CHECKOUT_RESET = NO
REOPEN_BUILD10 = NO
```

Official lock recorded in `docs/ai/PC2_IOS_BUILD10_FINAL_RETURN.md`.
Investigation below is provenance only. Do **not** patch, rebuild from
`4d329e1`, reopen Build 10, or convert `NOT_TESTED` gates to FAIL.

---

## Official final return

```text
BUILD10_RELEASE_STATUS = REJECTED
BUILD10_INSTALL = PASS
BUILD10_LAUNCH = FAIL_HARD
CRASH_LOG_FOUND = YES
CRASH_TIMESTAMP =
- 2026-08-17 17:08:33.2187 +0300
- 2026-08-17 17:11:22.0109 +0300
CRASH_SIGNATURE = EXC_CRASH (SIGABRT) / DYLD 4 Symbol missing
MISSING_SYMBOL = _$s15ExpoModulesCore10BaseModuleC11willDestroyyyFTj
REFERENCED_FROM = ExpoMediaLibrary.framework
EXPECTED_IN = ExpoModulesCore.framework
ROOT_CAUSE = Build 10 ships an incompatible ExpoMediaLibrary / ExpoModulesCore binary pair. expo-media-library 57.0.4 references BaseModule.willDestroy, while the shipped expo-modules-core 57.0.6 does not export that symbol. Process aborts during dyld launch before JS / Share / Create starts.
BUILD10_DEVICE_QA_CAN_CONTINUE = NO
PHASE2_RESULTS =
SHARE = NOT_TESTED
CREATE = NOT_TESTED
LIKE = NOT_TESTED
PROFILE = NOT_TESTED
COMMENT = NOT_TESTED
LANGUAGE = NOT_TESTED
WATCH = NOT_TESTED
NEW_IOS_BINARY_REQUIRED = YES
NEW_AUTHORITATIVE_SHA_REQUIRED = YES
PC2_ACTION_REQUIRED = NONE_UNTIL_NEW_SHA
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
REOPEN_BUILD10 = NO
```

Do **not** convert any Phase 2 gate to FAIL: the application never
reaches product runtime. No operator reopen is requested. Two ASC
crash reports already show the same launch abort ~3 minutes apart.

---

## Operator evidence (this turn)

```text
DEVICE = physical iPhone 13
TESTFLIGHT_BUILD = 10
SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
BUILD10_INSTALL = PASS
EAS_BUILD_ID = 9472a064-9e80-41b3-a61a-3473bc639c86
CRASH_ON_OPEN_FOR_PHASE_2 = YES (operator)
TESTFLIGHT_CRASH_REPORT = SUBMITTED
OPERATOR_FEEDBACK_SENT = YES
OPERATOR_COMMENT = UMTUBA Build 10 crashed immediately when I attempted to open the app for device QA after installation.
BUILD10_CRASH_REPRO = YES_ONCE (operator); ASC shows TWO matching launch crashes
CRASH_FREQUENCY = AT_LEAST_TWO_ASC_REPORTS
```

---

## 1. Source-side launch candidates (read-only)

Worktree (not the diverged `77e9e28` checkout):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build10-final-share-create-qa-v1`

```text
HEAD = 4d329e1bed2e1bc1a90902a1781f1821c0009392
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
```

Diff vs Build 9 `7b33bae707a0eecb4107f4373698630eaea7a1c5`:

```text
4 commits / 23 files / +1927 / −109
4d329e1 chore(mobile): stamp iOS buildNumber 10 and Android versionCode 12.
5c5ef0b feat(mobile): open the full system video library for Create picks.
5fe2869 feat(mobile): enable shared Watch Share entry on Android.
9014957 feat(mobile): add shared Watch share link and file modes.
```

Launch-path files **not** in that diff: `app/_layout.tsx`,
`app/(tabs)/_layout.tsx`, `src/lib/i18n/I18nProvider.tsx`,
`src/lib/i18n/rtl.ts` (`I18nManager.forceRTL` is existing, not new).
No `ios/` tree (CNG). Entry remains `expo-router/entry`.

Launch-relevant **new** native pieces in this SHA:

| Change | When it runs | Launch-crash candidate? |
| --- | --- | --- |
| `expo-media-library` dependency + `app.config.ts` plugin | Native framework registered at process start | **YES — matches crash log** |
| `expo-sharing` dependency | Native module; JS import is Watch Share after UI | Not named in the crash log |
| `sharePost.ts` / `shareEntry.ts` / Watch Share UI | After Watch renders and Share is tapped | No — dyld dies before JS |
| `pickVideo.ts` dynamic `import("expo-media-library")` | Create picker / limited-access sheet | No — JS never starts |
| `I18nManager.forceRTL` | I18nProvider after JS starts | Not in this diff; not in crash log |
| Version stamp only (`4d329e1`) | Config | No |

Lockfile on this SHA (facts, not a invented pin):

```text
package.json expo-media-library = ~57.0.3
lockfile expo-media-library = 57.0.4
lockfile expo-modules-core = 57.0.6
lockfile expo-sharing = 57.0.13
```

Local `expo-modules-core@57.0.6` `ios/Core/Modules/Module.swift`
defines `open class BaseModule` with `init` / `sendEvent` only.
**No `willDestroy` method** is present in that class. That matches
the dyld “Expected in ExpoModulesCore” miss.

Build 9 worktree `7b33bae` has **no** `expo-media-library` in
`package.json` or `app.config.ts`. Build 9 could not have shipped
`ExpoMediaLibrary.framework`.

Conclusion from source + crash log: this is a **first-open / every-open
native launch abort**, not a Share/Create-only crash.

---

## 2. Logs actually obtained

### 2a. App Store Connect / TestFlight (YES)

```text
COMMAND = npx eas-cli testflight:crashes --limit 20 --json --profile production
WORKTREE = umtuba-mobile-pc2-ios-build10-final-share-create-qa-v1
RESULT = 2 crashes, both buildVersion 10, device iPhone14_5 / iOS 18.6.2 / ar-IL
```

| ASC id | createdDate (UTC) | Incident | Process time (+0300) | Comment |
| --- | --- | --- | --- | --- |
| `AOr285Yj8VxfY6QjsjsI1Yw` | 2026-08-17T14:25:01.714Z | `967DAA00-8879-4DCE-8608-6BF75FEA052F` | Launch 17:08:33.1165 / crash 17:08:33.2187 / pid 5414 | none |
| `APQ4uX-BfPV7ZdYdX9s3qOs` | 2026-08-17T14:24:36.268Z | `FD12F28F-A9A9-42EC-A177-4376B109DD4F` | Launch 17:11:21.9384 / crash 17:11:22.0109 / pid 5426 | operator text above |

Both reports:

```text
Identifier = com.umtuba.app
Version = 1.0.0 (10)
Distributor ID = com.apple.TestFlight
Hardware Model = iPhone14,5
Beta = YES
Role = Foreground
Exception Type = EXC_CRASH (SIGABRT)
Termination Reason = DYLD 4 Symbol missing
Symbol not found = _$s15ExpoModulesCore10BaseModuleC11willDestroyyyFTj
Referenced from = UMTUBA.app/Frameworks/ExpoMediaLibrary.framework/ExpoMediaLibrary
Expected in = UMTUBA.app/Frameworks/ExpoModulesCore.framework/ExpoModulesCore
Note = (terminated at launch; ignore backtrace)
Triggered by Thread = 0 (dyld prepare / halt)
Time from Launch Time to Date/Time = ~100 ms and ~70 ms
```

```text
COMMAND = npx eas-cli testflight:feedback --limit 20 --json --profile production
RESULT = 0 screenshot-feedback rows
```

The operator comment arrived on the second crash record, not as a
separate screenshot-feedback item.

### 2b. EAS build `9472a064-9e80-41b3-a61a-3473bc639c86` (PARTIAL)

```text
COMMAND = npx eas-cli build:view 9472a064-9e80-41b3-a61a-3473bc639c86 --json
STATUS = FINISHED
gitCommitHash = 4d329e1bed2e1bc1a90902a1781f1821c0009392
appVersion = 1.0.0
appBuildVersion = 10
appIdentifier = com.umtuba.app
distribution = STORE
buildProfile = production
isForIosSimulator = false
sdkVersion = 57.0.0
```

Xcode + worker log blobs were downloaded from the view payload.
They are **not** plain text (binary/compressed; first bytes not gzip
`1f 8b`). No MediaLibrary / `willDestroy` / dSYM warning could be
read from them this turn.

```text
EAS_BUILD_LOG_TEXT = UNREADABLE_THIS_TURN
EAS_BUILD_LOG_USED_FOR_ROOT_CAUSE = NO
SIGNED_LOG_URLS_PRINTED = NO
```

The crash is already explained by the ASC dyld text. Missing readable
EAS compiler warnings does **not** weaken the launch signature.

### 2c. Local USB / crashreportcopymobile (NO this turn)

Historical method (Build 4 / Build 7): Node usbmux + lockdown pairing
`00008110-000A10123AF9801E.plist`, then `crashreportcopymobile` AFC.

This turn:

```text
usbmux :27015 = LISTEN (AppleMobileDeviceProcess)
COMMAND = node %LOCALAPPDATA%\Temp\pc2-ios-syslog\_pc2_usbmux_list.js
DeviceList = empty array
PnP PresentOnly Apple iPhone = NONE
xcrun / idevice* / pymobiledevice3 = MISSING (expected on Windows)
LIVE_SYSLOG = NO (last captures are 2026-08-16 Build 4 / Build 7)
```

iPhone 13 is **not** USB-present. Device crash pull was not possible.
ASC already has the two Build 10 reports. Pairing record was not
printed.

---

## 3. Classification

```text
SOURCE_RELATED = YES
```

Evidence: Build 9→10 added `expo-media-library` (plugin + lockfile
57.0.4). Both crash logs name `ExpoMediaLibrary.framework` as the
referencer of a missing `ExpoModulesCore.BaseModule.willDestroy`.
Build 9 source has no that module. Share/Create JS is not on the
stack (`terminated at launch`).

```text
BUILD10_DEVICE_QA_CAN_CONTINUE = NO
BUILD10_RELEASE_STATUS = REJECTED
```

Hard launch blocker. dyld aborts in ~100 ms. SHARE/CREATE and all
other Phase 2 gates stay **NOT_TESTED** — not FAIL. A home-screen
reopen would be expected to crash again; it is **not** requested
and Build 10 must **not** be reopened.

```text
NEW_IOS_BINARY_REQUIRED = YES
NEW_AUTHORITATIVE_SHA_REQUIRED = YES
PC2_ACTION_REQUIRED = NONE_UNTIL_NEW_SHA
```

The shipped TestFlight 1.0.0 (10) IPA cannot finish dyld. That is a
binary defect tied to the new native module on `4d329e1`. Device QA
on this binary cannot proceed. Central must supply ONE new
authoritative SHA and a new iOS binary. Do **not** rebuild from
`4d329e1`. This turn did **not** start Build 11.

```text
REPRO_REQUIRED = NO
```

Two launch crashes, same signature, same device, same build, ~3
minutes apart. No further operator tap is required to classify
frequency as “not a one-off.”

---

## 4. What this is not

- Not a Share two-choice JS crash.
- Not a Create / PHPicker crash.
- Not an `I18nManager` flip (existing code; not in the 9→10 diff;
  JS never starts).
- Not jetsam / OOM (DYLD missing symbol, Role Foreground, ~100 ms).
- Not App Store Production (none submitted).
- Not a SHARE/CREATE PASS or FAIL. Phase 2 remains **NOT_TESTED**.
- Not a reopen of Build 10.

---

## 5. Commands run (no secrets printed)

```text
git rev-parse HEAD
git log --oneline 7b33bae..4d329e1
git diff --stat / --name-status 7b33bae..4d329e1
npx eas-cli whoami --non-interactive
npx eas-cli testflight:crashes --limit 20 --json --profile production
npx eas-cli testflight:crashes AOr285Yj8VxfY6QjsjsI1Yw --json --profile production
npx eas-cli testflight:crashes APQ4uX-BfPV7ZdYdX9s3qOs --json --profile production --type crash
npx eas-cli testflight:feedback --limit 20 --json --profile production
npx eas-cli build:view 9472a064-9e80-41b3-a61a-3473bc639c86 --json
node _pc2_usbmux_list.js
```

---

## Safety / scope

- No product patch.
- No commit / push / reset of `77e9e28`.
- No EAS rebuild from `4d329e1`.
- No App Store Review / Production submit.
- No Phase 2 SHARE/CREATE execution; gates remain NOT_TESTED (not FAIL).
- No reopen of Build 10.
- `docs/ai/CURSOR_REPORT.md` not overwritten.
- Tester email / pairing material / signed GCS URLs not copied here.
