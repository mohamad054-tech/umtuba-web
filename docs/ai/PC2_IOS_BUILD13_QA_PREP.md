# PC2 iOS BUILD 13 — Watch audio ownership QA prep (P0 only)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD13_WATCH_AUDIO_OWNERSHIP_QA_V1
DATE = 2026-08-17
PHASE = P0 PREP ONLY — DO NOT START DEVICE QA
MODE = WAITING_FOR_LATER_DEVICE_QA_GO
DEVICE = physical iPhone 13 (later; not this turn)
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 13
AUTHORIZED_SOURCE_SHA = 700dddae332067d2182b143d4328492a22219a66
SOURCE_SHA = 700dddae332067d2182b143d4328492a22219a66
EAS_BUILD_ID = db467f4d-5fce-430b-98f7-60c74d8c1ed8
EAS_SUBMIT_ID = 0b58c218-95d1-49c3-b377-e50145f7c703
TESTFLIGHT_BUILD = 13
BUILD13_TESTFLIGHT_AVAILABLE = YES_INTERNAL
IPHONE13_INSTALL = NOT_STARTED
BUILD13_INSTALLED = NO
DEVICE_QA_EXECUTED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD12_RETESTED_AS_BUILD13 = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
EXPO_MEDIA_LIBRARY = 57.0.3
PLAINTEXT_PASSWORD = NO
```

This prep is **Build 13 only**. Do **not** test Build 12 as Build 13.
Do **not** fall back to Build 12 / 11 / 10 (REJECTED_BURNED) / 9 / 8 / 7.
Do **not** invent PASS. Do **not** rerun the full Build 12 session gate.

Phase 1 built TestFlight **1.0.0 (13)** from Central SHA
`700dddae332067d2182b143d4328492a22219a66`. EAS build is
`FINISHED`. ASC now lists **1.0.0 (13)** internal `in beta testing`.
That is **not** an iPhone install PASS.

This prep turn does **not** start P1 device QA and does **not** ask the
operator to install. Parent must GO device QA in a later turn.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD13_AVAILABLE = YES_INTERNAL
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

All authorized fields (untested — Build 13 not installed):

```text
LAUNCH_SMOKE = NOT_TESTED
WATCH = NOT_TESTED
WATCH_PLAYBACK = NOT_TESTED
WATCH_AUDIO_OWNERSHIP = NOT_TESTED
PREVIOUS_VIDEO_AUDIO_STOPS_ON_NEXT_VIDEO = NOT_TESTED
AUDIO_OVERLAP = NOT_TESTED
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

1. Phase 1 report has `EAS_BUILD_ID = db467f4d-5fce-430b-98f7-60c74d8c1ed8`
   built from `700dddae332067d2182b143d4328492a22219a66`.
2. TestFlight shows **UMTUBA 1.0.0 (13)** as installable (internal).
3. The physical iPhone 13 has **Build 13** installed — not Build 12,
   not Build 11, not Build 10, not Build 9, not Build 8, not Build 7.
4. The operator confirms the TestFlight / App Information build
   number is **13**, not **12** or older.

Until then:

```text
BUILD13_AVAILABLE = YES_INTERNAL
BUILD13_INSTALLED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from EAS `FINISHED`, or from ASC
  “in beta testing”.
- Test Build 12 / 11 / 10 / 9 / 8 / 7 and label it Build 13.
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

## Why Build 13 exists

Build 12 Watch playback FAIL: video B appears while audio from video A
continues. Build 13 source adds exclusive Watch audio ownership
(generation bump on active-index change, mute+pause+disable-loop
teardown, ignore stale play / playToEnd) and stamps iOS build **13**.

First later-turn device action is **install + confirm 1.0.0 (13)**,
then Watch audio ownership — not a full retest of Build 12 session
gates.

---

## Operator install steps (PREPARED — do not run this turn)

Windows cannot push the IPA. Install is iPhone-only via TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for later device-QA GO

```text
WAIT_FOR = later device-QA GO (TestFlight 1.0.0 (13) is now installable)
EAS_BUILD_ID = db467f4d-5fce-430b-98f7-60c74d8c1ed8
EAS_SUBMIT_ID = 0b58c218-95d1-49c3-b377-e50145f7c703
SOURCE_SHA_REQUIRED = 700dddae332067d2182b143d4328492a22219a66
TESTFLIGHT_1.0.0_13 = YES_INTERNAL
DO_NOT_INSTALL_THIS_TURN = YES
DO_NOT_INSTALL_BUILD_12 = YES
DO_NOT_INSTALL_BUILD_11 = YES
DO_NOT_INSTALL_BUILD_10 = YES
```

### 1. Open TestFlight on the iPhone 13

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`.

### 2. Confirm it is Build 13, not 12 / 11 / 10 / 9 / 8 / 7

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 13 |
| --- | --- |
| **1.0.0 (13)** | **1.0.0 (12)** |
| Build **13** | **1.0.0 (11)** / **(10)** (REJECTED_BURNED) / **(9)** / **(8)** / **(7)** |

If the page still shows **(12)** (or older):

- Do **not** install or “update”.
- Do **not** start Watch audio ownership QA.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_12` (or `_11` / `_10`).

### 3. Install or update to 1.0.0 (13)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0 (13)**.
- Only then open the app for Watch audio-ownership QA.

### 4. First later-turn gate: Watch audio ownership

Do not start Watch QA until Build 13 is confirmed installed.
Primary check: swipe / open next video — previous video audio must
stop. Never ask for or record plaintext passwords.

---

## Safety

- Operator install asked this turn = **NO**.
- App Store Production submitted = **NO**.
- Android versionCode command run = **NO**.
- `CURSOR_REPORT.md` overwritten = **NO**.
