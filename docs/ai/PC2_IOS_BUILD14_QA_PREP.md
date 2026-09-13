# PC2 iOS BUILD 14 — Cold launch / Watch audio QA prep (P0 only)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD14_COLD_LAUNCH_WATCH_AUDIO_QA_V1
DATE = 2026-08-17
PHASE = P0 PREP ONLY — DO NOT START DEVICE QA
MODE = WAITING_FOR_LATER_DEVICE_QA_GO
DEVICE = physical iPhone 13 (later; not this turn)
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 14
AUTHORIZED_SOURCE_SHA = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
SOURCE_SHA = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
EAS_BUILD_ID = 3e6244da-1d84-4aec-93e4-29805258452d
EAS_SUBMIT_ID = 06fb43e7-a620-4bb9-be2f-b211af5ba93a
TESTFLIGHT_BUILD = 14
BUILD14_TESTFLIGHT_AVAILABLE = YES_INTERNAL
IPHONE13_INSTALL = NOT_STARTED
BUILD14_INSTALLED = NO
DEVICE_QA_EXECUTED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD13_RETESTED_AS_BUILD14 = NO
BUILD12_SESSION_RETESTED = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
EXPO_MEDIA_LIBRARY = 57.0.3
PLAINTEXT_PASSWORD = NO
```

This prep is **Build 14 only**. Do **not** test Build 13 as Build 14.
Do **not** fall back to Build 13 / 12 / 11 / 10 (REJECTED_BURNED) / 9 / 8 / 7.
Do **not** invent PASS. Do **not** rerun the full Build 12 session gate.
Do **not** reopen Build 13 (`700dddae`) or reuse its binary.

Phase 1 built TestFlight **1.0.0 (14)** from Central SHA
`0ddd423f91fe238f5d211ed19a727f3180a9b48d`. EAS build is
`FINISHED`. ASC now lists **1.0.0 (14)** internal `in beta testing`.
That is **not** an iPhone install PASS.

This prep turn does **not** start P1 device QA and does **not** ask the
operator to install. Parent must GO device QA in a later turn.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD14_AVAILABLE = YES_INTERNAL
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

All authorized fields (untested — Build 14 not installed):

```text
LAUNCH_SMOKE = NOT_TESTED
COLD_LAUNCH = NOT_TESTED
WATCH = NOT_TESTED
WATCH_INITIALIZATION = NOT_TESTED
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

1. Phase 1 report has `EAS_BUILD_ID = 3e6244da-1d84-4aec-93e4-29805258452d`
   built from `0ddd423f91fe238f5d211ed19a727f3180a9b48d`.
2. TestFlight shows **UMTUBA 1.0.0 (14)** as installable (internal).
3. The physical iPhone 13 has **Build 14** installed — not Build 13,
   not Build 12, not Build 11, not Build 10, not Build 9, not Build 8,
   not Build 7.
4. The operator confirms the TestFlight / App Information build
   number is **14**, not **13** or older.

Until then:

```text
BUILD14_AVAILABLE = YES_INTERNAL
BUILD14_INSTALLED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from EAS `FINISHED`, or from ASC
  “in beta testing”.
- Test Build 13 / 12 / 11 / 10 / 9 / 8 / 7 and label it Build 14.
- Reopen Build 13 (`700dddae`) or reuse its binary.
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

## Why Build 14 exists

Build 13 cold launch / Watch init FAIL: Expo SharedObject
use-after-release error at Watch initialization; swipe audio-ownership
gates were never reached. Build 14 source ignores Watch player ops
after SharedObject release (alive-guard + mark-dead-before-teardown)
and stamps iOS build **14**.

First later-turn device action is **install + confirm 1.0.0 (14)**,
then cold launch / Watch init, then Watch audio ownership — not a
retest of Build 13 as 14, and not a full retest of Build 12 session
gates.

---

## Operator install steps (PREPARED — do not run this turn)

Windows cannot push the IPA. Install is iPhone-only via TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for later device-QA GO

```text
WAIT_FOR = later device-QA GO (TestFlight 1.0.0 (14) is now installable)
EAS_BUILD_ID = 3e6244da-1d84-4aec-93e4-29805258452d
EAS_SUBMIT_ID = 06fb43e7-a620-4bb9-be2f-b211af5ba93a
SOURCE_SHA_REQUIRED = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
TESTFLIGHT_1.0.0_14 = YES_INTERNAL
DO_NOT_INSTALL_THIS_TURN = YES
DO_NOT_INSTALL_BUILD_13 = YES
DO_NOT_INSTALL_BUILD_12 = YES
DO_NOT_INSTALL_BUILD_11 = YES
DO_NOT_INSTALL_BUILD_10 = YES
```

### 1. Open TestFlight on the iPhone 13

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`.

### 2. Confirm it is Build 14, not 13 / 12 / 11 / 10 / 9 / 8 / 7

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 14 |
| --- | --- |
| **1.0.0 (14)** | **1.0.0 (13)** |
| Build **14** | **1.0.0 (12)** / **(11)** / **(10)** (REJECTED_BURNED) / **(9)** / **(8)** / **(7)** |

If the page still shows **(13)** (or older):

- Do **not** install or “update”.
- Do **not** start cold-launch / Watch audio QA.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_13` (or `_12` / `_11` / `_10`).

### 3. Install or update to 1.0.0 (14)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0 (14)**.
- Only then open the app for cold-launch / Watch QA.

### 4. First later-turn gates

Do not start Watch swipe QA until Build 14 is confirmed installed
and cold launch / Watch init succeed without a SharedObject error.
Primary later checks: cold launch, Watch init, then swipe / open next
video — previous video audio must stop. Never ask for or record
plaintext passwords.

---

## Safety

- Operator install asked this turn = **NO**.
- App Store Production submitted = **NO**.
- Android versionCode command run = **NO**.
- `CURSOR_REPORT.md` overwritten = **NO**.
