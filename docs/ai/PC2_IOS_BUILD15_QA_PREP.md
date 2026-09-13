# PC2 iOS BUILD 15 — Watch load / audio final gate QA prep (P0 only)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD15_WATCH_LOAD_AUDIO_FINAL_GATE_V1
DATE = 2026-08-17
PHASE = P0 PREP ONLY — DO NOT START DEVICE QA
MODE = WAITING_FOR_LATER_DEVICE_QA_GO
DEVICE = physical iPhone 13 (later; not this turn)
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 15
AUTHORIZED_SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
EAS_BUILD_ID = 97fe339a-f338-4fb7-b0dc-62b5212b3e64
EAS_SUBMIT_ID = 1bb47fd0-6507-44f5-ac52-3103f18706b7
TESTFLIGHT_BUILD = 15
BUILD15_TESTFLIGHT_AVAILABLE = YES_INTERNAL
IPHONE13_INSTALL = NOT_STARTED
BUILD15_INSTALLED = NO
DEVICE_QA_EXECUTED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD14_RETESTED_AS_BUILD15 = NO
BUILD13_RETESTED_AS_BUILD15 = NO
BUILD12_SESSION_RETESTED = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
EXPO_MEDIA_LIBRARY = 57.0.3
PLAINTEXT_PASSWORD = NO
```

This prep is **Build 15 only**. Do **not** test Build 14 as Build 15.
Do **not** fall back to Build 14 / 13 / 12 / 11 / 10 (REJECTED_BURNED) / 9 / 8 / 7.
Do **not** invent PASS. Do **not** rerun the full Build 12 session gate.
Do **not** reopen Build 14 (`0ddd423`) or reuse its binary.

Phase 1 built TestFlight **1.0.0 (15)** from Central SHA
`abf8af9e8db7453d8bcb0e4d34346f182249243b`. EAS build is
`FINISHED`. ASC now lists **1.0.0 (15)** internal `in beta testing`.
That is **not** an iPhone install PASS.

This prep turn does **not** start P1 device QA and does **not** ask the
operator to install. Parent must GO device QA in a later turn.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD15_AVAILABLE = YES_INTERNAL
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

All authorized fields (untested — Build 15 not installed):

```text
LAUNCH_SMOKE = NOT_TESTED
COLD_LAUNCH = NOT_TESTED
WATCH = NOT_TESTED
WATCH_LOAD = NOT_TESTED
WATCH_INITIALIZATION = NOT_TESTED
RESOURCE_UNAVAILABLE = NOT_TESTED
EXPO_SHARED_OBJECT_ERROR = NOT_TESTED
WATCH_PLAYBACK = NOT_TESTED
WATCH_AUDIO_OWNERSHIP = NOT_TESTED
PREVIOUS_VIDEO_AUDIO_STOPS_ON_NEXT_VIDEO = NOT_TESTED
AUDIO_OVERLAP = NOT_TESTED
SLOW_SWIPE_AUDIO = NOT_TESTED
FAST_SWIPE_AUDIO = NOT_TESTED
A_TO_B_TO_C = NOT_TESTED
BACK_SWIPE_AUDIO = NOT_TESTED
PARTIAL_SWIPE = NOT_TESTED
BACKGROUND_RESUME_AUDIO = NOT_TESTED
ONLY_ACTIVE_AUDIO = NOT_TESTED
PRELOADED_PLAYERS_SILENT = NOT_TESTED
SESSION_PERSIST_COLD = NOT_TESTED
SHARE = NOT_TESTED
CREATE = NOT_TESTED
RTL_BACK = NOT_TESTED
CRASH_SANITY = NOT_TESTED
PLAINTEXT_PASSWORD = NO
```

Do **not** upgrade any of these fields this turn.

---

## Gate: what must be true before any device result

All of the following must be true before any field above may leave
`NOT_TESTED` (except `PLAINTEXT_PASSWORD`, which is source-confirmed):

1. Phase 1 report has `EAS_BUILD_ID = 97fe339a-f338-4fb7-b0dc-62b5212b3e64`
   built from `abf8af9e8db7453d8bcb0e4d34346f182249243b`.
2. TestFlight shows **UMTUBA 1.0.0 (15)** as installable (internal).
3. The physical iPhone 13 has **Build 15** installed — not Build 14,
   not Build 13, not Build 12, not Build 11, not Build 10, not Build 9,
   not Build 8, not Build 7.
4. The operator confirms the TestFlight / App Information build
   number is **15**, not **14** or older.

Until then:

```text
BUILD15_AVAILABLE = YES_INTERNAL
BUILD15_INSTALLED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from EAS `FINISHED`, or from ASC
  “in beta testing”.
- Test Build 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7 and label it Build 15.
- Reopen Build 14 (`0ddd423`) or reuse its binary.
- Rerun the full Build 12 session-persistence gate as a substitute.
- Ask the operator to install before a later device-QA GO.
- Independently patch shared defects.
- Build, rebuild, re-upload, or Submit for Review / App Store
  Production.
- Modify Android `versionCode`.
- Merge localization Wave 2 / `31db97d`.
- Reopen Store / Learning.
- Overwrite `docs/ai/CURSOR_REPORT.md`.
- Ask for / log / store plaintext passwords or tokens.

---

## Why Build 15 exists

Build 14 P1 cold launch / Watch init PASS on device, with
`SLOW_SWIPE_AUDIO` still pending classification. Build 15 source
detaches Watch players on unmount without method calls (JS mark-dead
+ drop refs; native `useReleasingSharedObject` owns release) and
stamps iOS build **15**. Adjacent preload (`shouldLoadPlayer` current
+ adjacent) and exclusive audio ownership are unchanged in source.

First later-turn device action is **install + confirm 1.0.0 (15)**,
then Watch load / resource-unavailable / audio ownership — not a
retest of Build 14 as 15, and not a full retest of Build 12 session
gates.

---

## Operator install steps (PREPARED — do not run this turn)

Windows cannot push the IPA. Install is iPhone-only via TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for later device-QA GO

```text
WAIT_FOR = later device-QA GO (TestFlight 1.0.0 (15) is now installable)
EAS_BUILD_ID = 97fe339a-f338-4fb7-b0dc-62b5212b3e64
EAS_SUBMIT_ID = 1bb47fd0-6507-44f5-ac52-3103f18706b7
SOURCE_SHA_REQUIRED = abf8af9e8db7453d8bcb0e4d34346f182249243b
TESTFLIGHT_1.0.0_15 = YES_INTERNAL
DO_NOT_INSTALL_THIS_TURN = YES
DO_NOT_INSTALL_BUILD_14 = YES
DO_NOT_INSTALL_BUILD_13 = YES
DO_NOT_INSTALL_BUILD_12 = YES
DO_NOT_INSTALL_BUILD_11 = YES
DO_NOT_INSTALL_BUILD_10 = YES
```

### 1. Open TestFlight on the iPhone 13

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`.

### 2. Confirm it is Build 15, not 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 15 |
| --- | --- |
| **1.0.0 (15)** | **1.0.0 (14)** |
| Build **15** | **1.0.0 (13)** / **(12)** / **(11)** / **(10)** (REJECTED_BURNED) / **(9)** / **(8)** / **(7)** |

If the page still shows **(14)** (or older):

- Do **not** install or “update”.
- Do **not** start Watch load / audio QA.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_14` (or `_13` / `_12` / `_11` / `_10`).

### 3. Install or update to 1.0.0 (15)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0 (15)**.
- Only then open the app for Watch load / audio QA.

### 4. First later-turn gates

Do not start Watch swipe QA until Build 15 is confirmed installed
and Watch load / init succeed without a SharedObject or
resource-unavailable error. Primary later checks: Watch load, then
exclusive audio ownership — previous video audio must stop. Never
ask for or record plaintext passwords.

---

## Safety

- Operator install asked this turn = **NO**.
- App Store Production submitted = **NO**.
- Android versionCode command run = **NO**.
- `CURSOR_REPORT.md` overwritten = **NO**.
