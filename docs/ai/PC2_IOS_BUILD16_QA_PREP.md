# PC2 iOS BUILD 16 — Watch load / retry final gate QA prep (P0 only)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD16_WATCH_LOAD_RETRY_FINAL_GATE_V1
DATE = 2026-08-18
PHASE = P0 PREP ONLY — DO NOT START DEVICE QA
MODE = WAITING_FOR_LATER_DEVICE_QA_GO
DEVICE = physical iPhone 13 (later; not this turn)
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 16
AUTHORIZED_SOURCE_SHA = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
SOURCE_SHA = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
EAS_BUILD_ID = ccd20bd3-d2dc-4943-a7aa-2da2c2fd713e
EAS_SUBMIT_ID = d0c709e5-c844-41e1-8ca9-3406becf2c09
TESTFLIGHT_BUILD = 16
BUILD16_TESTFLIGHT_AVAILABLE = YES_INTERNAL
IPHONE13_INSTALL = NOT_STARTED
BUILD16_INSTALLED = NO
DEVICE_QA_EXECUTED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD15_RETESTED_AS_BUILD16 = NO
BUILD14_RETESTED_AS_BUILD16 = NO
BUILD13_RETESTED_AS_BUILD16 = NO
BUILD12_SESSION_RETESTED = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
EXPO_MEDIA_LIBRARY = 57.0.3
PLAINTEXT_PASSWORD = NO
```

This prep is **Build 16 only**. Do **not** test Build 15 as Build 16.
Do **not** fall back to Build 15 / 14 / 13 / 12 / 11 / 10 (REJECTED_BURNED) / 9 / 8 / 7.
Do **not** invent PASS. Do **not** rerun the full Build 12 session gate.
Do **not** reopen Build 15 (`abf8af9`) or reuse its binary.

Phase 1 built TestFlight **1.0.0 (16)** from Central SHA
`7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7`. EAS build is
`FINISHED`. ASC now lists **1.0.0 (16)** internal `in beta testing`.
That is **not** an iPhone install PASS.

This prep turn does **not** start P1 device QA and does **not** ask the
operator to install. Parent must GO device QA in a later turn.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD16_AVAILABLE = YES_INTERNAL
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

All authorized fields (untested — Build 16 not installed):

```text
LAUNCH_SMOKE = NOT_TESTED
COLD_LAUNCH = NOT_TESTED
WATCH = NOT_TESTED
WATCH_LOAD = NOT_TESTED
WATCH_INITIALIZATION = NOT_TESTED
RESOURCE_UNAVAILABLE = NOT_TESTED
EXPO_SHARED_OBJECT_ERROR = NOT_TESTED
WATCH_PLAYER_ITEM_LOAD = NOT_TESTED
RETRY_RECOVERY = NOT_TESTED
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

1. Phase 1 report has `EAS_BUILD_ID = ccd20bd3-d2dc-4943-a7aa-2da2c2fd713e`
   built from `7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7`.
2. TestFlight shows **UMTUBA 1.0.0 (16)** as installable (internal).
3. The physical iPhone 13 has **Build 16** installed — not Build 15,
   not Build 14, not Build 13, not Build 12, not Build 11, not Build 10, not Build 9,
   not Build 8, not Build 7.
4. The operator confirms the TestFlight / App Information build
   number is **16**, not **15** or older.

Until then:

```text
BUILD16_AVAILABLE = YES_INTERNAL
BUILD16_INSTALLED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from EAS `FINISHED`, or from ASC
  “in beta testing”.
- Test Build 15 / 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7 and label it Build 16.
- Reopen Build 15 (`abf8af9`) or reuse its binary.
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

## Why Build 16 exists

Build 15 P1 load stability FAIL on device: early cards PASS, then
intermittent `WATCH_PLAYER_ITEM_LOAD` / “resource unavailable” after
multiple successful transitions. Retry was not a clean reload
(`RETRY_RECOVERY = UNRELIABLE`). Build 16 source remounts Watch Retry
as a new player generation above the play-pause tap layer, waits for
iOS item-ready before play/pause/seek, and stamps iOS build **16**.
Adjacent preload and exclusive audio ownership are unchanged in source.

First later-turn device action is **install + confirm 1.0.0 (16)**,
then Watch load / resource-unavailable / retry recovery / audio
ownership — not a retest of Build 15 as 16, and not a full retest of
Build 12 session gates. Do not retest seek.

---

## Operator install steps (PREPARED — do not run this turn)

Windows cannot push the IPA. Install is iPhone-only via TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for later device-QA GO

```text
WAIT_FOR = later device-QA GO (TestFlight 1.0.0 (16) is now installable)
EAS_BUILD_ID = ccd20bd3-d2dc-4943-a7aa-2da2c2fd713e
EAS_SUBMIT_ID = d0c709e5-c844-41e1-8ca9-3406becf2c09
SOURCE_SHA_REQUIRED = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
TESTFLIGHT_1.0.0_16 = YES_INTERNAL
DO_NOT_INSTALL_THIS_TURN = YES
DO_NOT_INSTALL_BUILD_15 = YES
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

### 2. Confirm it is Build 16, not 15 / 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 16 |
| --- | --- |
| **1.0.0 (16)** | **1.0.0 (15)** |
| Build **16** | **1.0.0 (14)** / **(13)** / **(12)** / **(11)** / **(10)** (REJECTED_BURNED) / **(9)** / **(8)** / **(7)** |

If the page still shows **(15)** (or older):

- Do **not** install or “update”.
- Do **not** start Watch load / retry / audio QA.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_15` (or `_14` / `_13` / `_12` / `_11` / `_10`).

### 3. Install or update to 1.0.0 (16)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0 (16)**.
- Only then open the app for Watch load / retry / audio QA.

### 4. First later-turn gates

Do not start Watch swipe QA until Build 16 is confirmed installed
and Watch load / init succeed without a SharedObject or
resource-unavailable error. Primary later checks: Watch load, then
Retry remount recovery, then exclusive audio ownership — previous
video audio must stop. Never ask for or record plaintext passwords.
Do not retest seek.

---

## Safety

- Operator install asked this turn = **NO**.
- App Store Production submitted = **NO**.
- Android versionCode command run = **NO**.
- `CURSOR_REPORT.md` overwritten = **NO**.
