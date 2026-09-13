# PC2 iOS BUILD 11 — launch surgical QA prep (P0 only)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD11_LAUNCH_SURGICAL_QA_V1
DATE = 2026-08-17
PHASE = P0 PREP ONLY — DO NOT START DEVICE QA
MODE = WAITING_FOR_LATER_DEVICE_QA_GO
DEVICE = physical iPhone 13 (later; not this turn)
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 11
AUTHORIZED_SOURCE_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
SOURCE_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
EAS_BUILD_ID = 96aca0f9-47f9-4c32-b443-c2301a97ecba
EAS_SUBMIT_ID = 3bb775e9-7614-45e2-aaf3-b95a5182a067
TESTFLIGHT_BUILD = 11
BUILD11_TESTFLIGHT_AVAILABLE = YES_INTERNAL
IPHONE13_INSTALL = NOT_STARTED
BUILD11_INSTALLED = NO
DEVICE_QA_EXECUTED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD10_RETESTED_AS_BUILD11 = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
EXPO_MEDIA_LIBRARY = 57.0.3
```

This prep is **Build 11 only**. Do **not** test Build 10 (REJECTED_BURNED).
Do **not** fall back to Build 9 / 8 / 7 / 6 / 5 / 4. Do **not** invent PASS.

Phase 1 built TestFlight **1.0.0 (11)** from Central SHA
`4b9fa5667e1db59c1854d61d23fdf12862a81a31`. EAS build is
`FINISHED`. ASC now lists **1.0.0 (11)** internal `in beta testing`.
That is **not** an iPhone install PASS.

This prep turn does **not** start P1/P2 and does **not** ask the
operator to install. Parent must GO device QA in a later turn.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD11_AVAILABLE = YES_INTERNAL
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

All authorized fields (untested — Build 11 not installed):

```text
LAUNCH_SMOKE = NOT_TESTED
SHARE_TWO_CHOICE = NOT_TESTED
SHARE_LINK = NOT_TESTED
SHARE_FILE = NOT_TESTED
SHARE_IDENTITY_FROZEN = NOT_TESTED
CREATE_RESET = NOT_TESTED
CREATE_CANCEL = NOT_TESTED
CREATE_REPLACE = NOT_TESTED
CREATE_FULL_LIBRARY = NOT_TESTED
LONG_VIDEO_PUBLISH_GATE = NOT_APPLICABLE_NO_MAX_IN_SOURCE
DIRECT_PUBLISH_BOUNDARY = NOT_TESTED
RETRY_CURRENT_ASSET = NOT_TESTED
LATE_CALLBACK_GUARD = NOT_TESTED
LIKE_STATE = NOT_TESTED
OWN_PROFILE = NOT_TESTED
COMMENT = NOT_TESTED
LANGUAGE_SELECTOR = NOT_TESTED
LOCALE_OVERRIDE_PERSISTENCE = NOT_TESTED
RTL_BACK = NOT_TESTED
NEW_REGRESSION = NOT_TESTED
```

Do **not** upgrade any of these fields this turn. Do **not** convert
Build 10 Phase 2 `NOT_TESTED` leftovers into FAIL.

---

## Gate: what must be true before any device result

All of the following must be true before any field above may leave
`NOT_TESTED`:

1. Phase 1 report has `EAS_BUILD_ID = 96aca0f9-47f9-4c32-b443-c2301a97ecba`
   built from `4b9fa5667e1db59c1854d61d23fdf12862a81a31`.
2. TestFlight shows **UMTUBA 1.0.0 (11)** as installable (internal).
3. The physical iPhone 13 has **Build 11** installed — not Build 10,
   not Build 9, not Build 8, not Build 7, not Build 6, not Build 5,
   not Build 4.
4. The operator confirms the TestFlight / App Information build
   number is **11**, not **10** or older.

Until then:

```text
BUILD11_AVAILABLE = YES_INTERNAL
BUILD11_INSTALLED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from EAS `FINISHED`, or from ASC
  “in beta testing”.
- Test Build 10 / 9 / 8 / 7 / 6 / 5 / 4 and label it Build 11.
- Reopen rejected Build 10 (`4d329e1`).
- Ask the operator to install Build 11 before TestFlight 11 is
  actually available.
- Independently patch shared defects.
- Build, rebuild, re-upload, or Submit for Review / App Store
  Production.
- Modify Android `versionCode`.
- Merge localization Wave 2 / `31db97d`.
- Reopen Store / Learning.
- Overwrite `docs/ai/CURSOR_REPORT.md`.

---

## Why Build 11 exists

Build 10 launched into `EXC_CRASH (SIGABRT) / DYLD 4 Symbol missing`:
`ExpoMediaLibrary.framework` referenced
`_$s15ExpoModulesCore10BaseModuleC11willDestroyyyFTj`, which
`ExpoModulesCore.framework` 57.0.6 does not export.

Build 11 source pins `expo-media-library` to exact **57.0.3** (lockfile
no longer resolves `~57.0.3` → 57.0.4) and stamps iOS build **11**.

First later-turn device action is **cold launch smoke**, not Share/Create.

---

## Operator install steps (PREPARED — do not run this turn)

Windows cannot push the IPA. Install is iPhone-only via TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for TestFlight 11

```text
WAIT_FOR = later device-QA GO (TestFlight 1.0.0 (11) is now installable)
EAS_BUILD_ID = 96aca0f9-47f9-4c32-b443-c2301a97ecba
EAS_SUBMIT_ID = 3bb775e9-7614-45e2-aaf3-b95a5182a067
SOURCE_SHA_REQUIRED = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
TESTFLIGHT_1.0.0_11 = YES_INTERNAL
DO_NOT_INSTALL_THIS_TURN = YES
DO_NOT_INSTALL_BUILD_10 = YES
DO_NOT_INSTALL_BUILD_9 = YES
DO_NOT_INSTALL_BUILD_8 = YES
DO_NOT_INSTALL_BUILD_7 = YES
```

### 1. Open TestFlight on the iPhone 13

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`.

### 2. Confirm it is Build 11, not 10 / 9 / 8 / 7

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 11 |
| --- | --- |
| **1.0.0 (11)** | **1.0.0 (10)** (REJECTED_BURNED) |
| Build **11** | **1.0.0 (9)** / **(8)** / **(7)** / **(6)** / **(5)** / **(4)** |

If the page still shows **(10)** (or older):

- Do **not** install or “update”.
- Do **not** start launch smoke or surgical list.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_10` (or `_9` / `_8` / `_7`).

### 3. Install or update to 1.0.0 (11)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0 (11)**.
- Only then open the app for cold-launch smoke.

### 4. First later-turn gate: cold launch

Build 10 never reached JS. Build 11 first proof is: app process stays
up after Open. Do not start Share/Create until launch smoke is recorded.

---

## Safety

- Operator install asked this turn = **NO**.
- App Store Production submitted = **NO**.
- Android versionCode touched = **NO**.
- `CURSOR_REPORT.md` overwritten = **NO**.
